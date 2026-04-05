import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import pool from '../database.js';
import { auditLog } from '../database.js';
import { JWT_SECRET, requireAuth } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../email.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

// Rate limiting: max 10 intentos por 15 minutos por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos fallidos. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /api/auth/login — login unificado con email + contraseña ─────────────
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'desconocida';

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos' });
  }

  try {
    // Buscar usuario por email (globally unique)
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );
    const user = rows[0];

    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      console.warn(`[SEGURIDAD] Login fallido — email: ${email} — IP: ${ip}`);
      await auditLog(null, email, 'LOGIN_FALLIDO', { ip });
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    // Actualizar ultimo login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    await auditLog(user.id, user.name, 'LOGIN_EXITOSO', { ip, role: user.role });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, tenant_id: user.tenant_id },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Obtener info del tenant y verificar que esté activo
    let tenant = null;
    if (user.tenant_id) {
      const { rows: tr } = await pool.query('SELECT id, business_name, active FROM tenants WHERE id = $1', [user.tenant_id]);
      if (tr[0]) {
        if (!tr[0].active) {
          return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación. Un administrador la activará pronto.' });
        }
        tenant = { id: tr[0].id, businessName: tr[0].business_name };
      }
    }

    res.json({
      token,
      tenant,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        mustChangePin: user.must_change_pin,
      },
    });
  } catch (err) {
    console.error('[auth] Error en login:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── POST /api/auth/register — crear nuevo tenant + usuario admin ──────────────
router.post('/register', async (req, res) => {
  const { businessName, ownerName, email, password } = req.body;

  if (!businessName || !ownerName || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
  }
  if (password.length > MAX_PASSWORD) {
    return res.status(400).json({ error: 'Contraseña demasiado larga' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar email único
    const existing = await client.query(
      'SELECT id FROM tenants WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este correo ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const pinPlaceholder = await bcrypt.hash('__no_pin__', 12);

    // Crear tenant — inactivo hasta aprobación del super admin
    const { rows: tenantRows } = await client.query(
      `INSERT INTO tenants (business_name, owner_name, email, password_hash, active)
       VALUES ($1, $2, $3, $4, false) RETURNING *`,
      [businessName.trim(), ownerName.trim(), email.toLowerCase().trim(), passwordHash]
    );
    const tenant = tenantRows[0];

    // Crear usuario admin con email + password
    const { rows: userRows } = await client.query(
      `INSERT INTO users (name, pin_hash, password_hash, email, role, tenant_id, must_change_pin)
       VALUES ($1, $2, $3, $4, 'admin', $5, false) RETURNING *`,
      [ownerName.trim(), pinPlaceholder, passwordHash, email.toLowerCase().trim(), tenant.id]
    );
    const adminUser = userRows[0];

    // Configuración por defecto
    const defaultSettings = {
      name: businessName.trim(),
      rnc: '', phone: '', address: '',
      receiptMessage: '¡Gracias por su preferencia!',
      exchangeRate: 58.50, salesRate: 60.00,
      exchangeRateEur: 64.00, salesRateEur: 66.00,
    };
    await client.query(
      `INSERT INTO settings (data, tenant_id) VALUES ($1, $2)`,
      [JSON.stringify(defaultSettings), tenant.id]
    );

    // Vault
    await client.query(
      `INSERT INTO vault (dop_balance, usd_balance, eur_balance, tenant_id) VALUES (0, 0, 0, $1)`,
      [tenant.id]
    );

    await client.query('COMMIT');

    // No token — account requires super admin approval
    res.status(201).json({
      pending: true,
      message: 'Cuenta creada. Un administrador revisará tu solicitud pronto.',
      businessName: tenant.business_name,
      email: tenant.email,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[auth] Error en registro:', err);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// ── POST /api/auth/change-password — cambiar contraseña propia ────────────────
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const ip = req.ip || 'desconocida';

  if (!newPassword || newPassword.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
  }
  if (newPassword.length > MAX_PASSWORD) {
    return res.status(400).json({ error: 'Contraseña demasiado larga' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Si no es cambio forzado, verificar contraseña actual
    if (!user.must_change_pin) {
      if (!currentPassword) return res.status(400).json({ error: 'Contraseña actual requerida' });
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_pin = FALSE WHERE id = $2',
      [hash, user.id]
    );
    await auditLog(user.id, user.name, 'CAMBIO_CONTRASENA', { ip });

    res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('[auth] Error cambiando contraseña:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', loginLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Correo requerido' });

  // Siempre responder OK para no revelar si el email existe
  res.json({ ok: true, message: 'Si el correo existe recibirás un enlace en los próximos minutos.' });

  // Procesar en background
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );
    const user = rows[0];
    if (!user) return; // No revelar que no existe

    // Invalidar tokens anteriores del usuario
    await pool.query(
      'UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [user.id]
    );

    // Crear token seguro (32 bytes hex = 64 chars)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    await sendPasswordResetEmail({
      toEmail: user.email,
      toName:  user.name,
      token,
    });

    await auditLog(user.id, user.name, 'PASSWORD_RESET_SOLICITADO', { email });
  } catch (err) {
    console.error('[auth] Error en forgot-password:', err.message);
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password', resetLimiter, async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });
  }
  if (newPassword.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
  }
  if (newPassword.length > MAX_PASSWORD) {
    return res.status(400).json({ error: 'Contraseña demasiado larga' });
  }

  try {
    // Verificar token válido y no expirado
    const { rows } = await pool.query(
      `SELECT pr.*, u.name, u.email FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1 AND pr.used = FALSE AND pr.expires_at > NOW()`,
      [token]
    );
    const reset = rows[0];

    if (!reset) {
      return res.status(400).json({
        error: 'El enlace es inválido o ha expirado. Solicita uno nuevo.'
      });
    }

    // Actualizar contraseña
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_pin = FALSE WHERE id = $2',
      [hash, reset.user_id]
    );

    // Marcar token como usado
    await pool.query(
      'UPDATE password_resets SET used = TRUE WHERE id = $1',
      [reset.id]
    );

    await auditLog(reset.user_id, reset.name, 'PASSWORD_RESET_EXITOSO', { email: reset.email });

    res.json({ ok: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error('[auth] Error en reset-password:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── GET /api/auth/verify-reset-token — validar token antes de mostrar form ───
router.get('/verify-reset-token/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT pr.expires_at, u.email FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1 AND pr.used = FALSE AND pr.expires_at > NOW()`,
      [token]
    );
    if (!rows[0]) return res.status(400).json({ valid: false, error: 'Enlace inválido o expirado' });
    res.json({ valid: true, email: rows[0].email });
  } catch (err) {
    res.status(500).json({ valid: false, error: 'Error del servidor' });
  }
});

// ── Mantener endpoint legacy de PIN por compatibilidad ───────────────────────
router.post('/change-pin', requireAuth, async (req, res) => {
  res.json({ ok: true, message: 'Use /change-password en su lugar' });
});

// ── Mantener login-email por compatibilidad (redirige al nuevo login) ─────────
router.post('/login-email', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  req.body = { email, password };
  // Reusar la misma lógica buscando en tenants para identificar el tenant admin
  const ip = req.ip || 'desconocida';
  try {
    const { rows } = await pool.query(
      'SELECT * FROM tenants WHERE LOWER(email) = LOWER($1)', [email?.trim()]
    );
    const tenant = rows[0];
    if (!tenant || !(await bcrypt.compare(password, tenant.password_hash))) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    // Buscar usuario admin de este tenant
    const { rows: userRows } = await pool.query(
      "SELECT * FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1", [tenant.id]
    );
    const adminUser = userRows[0];
    if (!adminUser) return res.status(404).json({ error: 'Usuario admin no encontrado' });

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [adminUser.id]);

    const token = jwt.sign(
      { id: adminUser.id, role: adminUser.role, name: adminUser.name, tenant_id: tenant.id },
      JWT_SECRET, { expiresIn: '12h' }
    );
    res.json({
      token,
      tenant: { id: tenant.id, businessName: tenant.business_name },
      user: { id: adminUser.id, name: adminUser.name, role: adminUser.role, email: adminUser.email, mustChangePin: adminUser.must_change_pin },
    });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
