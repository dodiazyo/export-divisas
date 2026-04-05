import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../database.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();
if (!process.env.SUPERADMIN_SECRET) {
  console.error('[FATAL] SUPERADMIN_SECRET no está definido en las variables de entorno.');
  process.exit(1);
}
const SA_SECRET = process.env.SUPERADMIN_SECRET;

// ── Middleware: verificar token de super-admin ────────────────────────────────
function requireSuperAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });
  try {
    const payload = jwt.verify(auth.slice(7), SA_SECRET);
    if (payload.role !== 'superadmin') return res.status(403).json({ error: 'Acceso denegado' });
    req.superadmin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ── POST /api/superadmin/login ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña requeridos' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM superadmins WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );
    const sa = rows[0];
    if (!sa || !(await bcrypt.compare(password, sa.password_hash))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    await pool.query('UPDATE superadmins SET last_login = NOW() WHERE id = $1', [sa.id]);

    const token = jwt.sign(
      { id: sa.id, email: sa.email, name: sa.name, role: 'superadmin' },
      SA_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, superadmin: { id: sa.id, name: sa.name, email: sa.email } });
  } catch (err) {
    console.error('[superadmin] login error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── GET /api/superadmin/tenants ───────────────────────────────────────────────
router.get('/tenants', requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id, t.business_name, t.owner_name, t.email, t.plan, t.active, t.created_at,
        COUNT(DISTINCT u.id)  FILTER (WHERE u.role != 'admin') AS cashier_count,
        COUNT(DISTINCT s.id)  FILTER (WHERE s.status = 'open')  AS active_shifts,
        COUNT(DISTINCT s.id)  AS total_shifts,
        COUNT(DISTINCT tx.id) AS total_transactions
      FROM tenants t
      LEFT JOIN users u        ON u.tenant_id = t.id
      LEFT JOIN shifts s       ON s.tenant_id = t.id
      LEFT JOIN transactions tx ON tx.tenant_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── PUT /api/superadmin/tenants/:id/toggle ────────────────────────────────────
router.put('/tenants/:id/toggle', requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE tenants SET active = NOT active WHERE id = $1 RETURNING id, business_name, active',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── POST /api/superadmin/tenants/:id/reset-password ──────────────────────────
router.post('/tenants/:id/reset-password', requireSuperAdmin, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const hash = await bcrypt.hash(newPassword, 12);
    // Reset password en tenants y en el usuario admin del tenant
    await pool.query('UPDATE tenants SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    await pool.query(
      "UPDATE users SET password_hash = $1, must_change_pin = TRUE WHERE tenant_id = $2 AND role = 'admin'",
      [hash, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── GET /api/superadmin/stats ─────────────────────────────────────────────────
router.get('/stats', requireSuperAdmin, async (req, res) => {
  try {
    const [tenants, shifts, txs, users] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM tenants'),
      pool.query("SELECT COUNT(*) FROM shifts WHERE status = 'open'"),
      pool.query('SELECT COUNT(*) FROM transactions'),
      pool.query("SELECT COUNT(*) FROM users WHERE role != 'admin'"),
    ]);
    res.json({
      totalTenants:      parseInt(tenants.rows[0].count),
      activeShifts:      parseInt(shifts.rows[0].count),
      totalTransactions: parseInt(txs.rows[0].count),
      totalCashiers:     parseInt(users.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── GET /api/superadmin/plans ─────────────────────────────────────────────────
router.get('/plans', requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, COUNT(t.id) AS tenant_count
      FROM plans p
      LEFT JOIN tenants t ON t.plan_id = p.id
      GROUP BY p.id
      ORDER BY p.price ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── POST /api/superadmin/plans ────────────────────────────────────────────────
router.post('/plans', requireSuperAdmin, async (req, res) => {
  const { name, price, description, max_cashiers, features } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'Nombre y precio requeridos' });
  if (parseFloat(price) < 1) return res.status(400).json({ error: 'El precio mínimo es $1' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO plans (name, price, description, max_cashiers, features)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name.trim(), parseFloat(price), description || null, max_cashiers || 5, JSON.stringify(features || [])]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── PUT /api/superadmin/plans/:id ─────────────────────────────────────────────
router.put('/plans/:id', requireSuperAdmin, async (req, res) => {
  const { name, price, description, max_cashiers, features, active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE plans SET
         name         = COALESCE($1, name),
         price        = COALESCE($2, price),
         description  = COALESCE($3, description),
         max_cashiers = COALESCE($4, max_cashiers),
         features     = COALESCE($5, features),
         active       = COALESCE($6, active)
       WHERE id = $7 RETURNING *`,
      [
        name?.trim() || null,
        price != null ? parseFloat(price) : null,
        description ?? null,
        max_cashiers || null,
        features != null ? JSON.stringify(features) : null,
        active ?? null,
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── DELETE /api/superadmin/plans/:id ─────────────────────────────────────────
router.delete('/plans/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { rows: tenants } = await pool.query(
      'SELECT COUNT(*) FROM tenants WHERE plan_id = $1', [req.params.id]
    );
    if (parseInt(tenants[0].count) > 0) {
      return res.status(400).json({ error: 'No se puede eliminar un plan asignado a tenants activos' });
    }
    await pool.query('DELETE FROM plans WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── PUT /api/superadmin/tenants/:id/plan ──────────────────────────────────────
router.put('/tenants/:id/plan', requireSuperAdmin, async (req, res) => {
  const { plan_id } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE tenants SET plan_id = $1, plan = (SELECT name FROM plans WHERE id = $1)
       WHERE id = $2 RETURNING id, business_name, plan, plan_id`,
      [plan_id || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Tenant no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
