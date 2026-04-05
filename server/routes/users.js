import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const VALID_ROLES  = ['currency_agent', 'admin'];
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

router.use(requireAuth);
router.use(requireAdmin);

// GET — listar usuarios del tenant
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at, last_login FROM users WHERE tenant_id = $1 ORDER BY id ASC',
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST — crear usuario con email + contraseña
router.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' });
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
  }
  if (password.length > MAX_PASSWORD) {
    return res.status(400).json({ error: 'Contraseña demasiado larga' });
  }

  try {
    // Verificar email único
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Este correo ya está en uso' });
    }

    const pwHash  = await bcrypt.hash(password, 12);
    const pinHash = await bcrypt.hash('__no_pin__', 12);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, pin_hash, role, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), pwHash, pinHash, role || 'currency_agent', req.user.tenant_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[users] Error creando usuario:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT — actualizar usuario
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role } = req.body;

  try {
    // Verificar email único si se está cambiando
    if (email) {
      const existing = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
        [email.trim(), id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Este correo ya está en uso por otro usuario' });
      }
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (password && password.length >= MIN_PASSWORD && password.length <= MAX_PASSWORD) {
      const pwHash = await bcrypt.hash(password, 12);
      await pool.query(
        'UPDATE users SET name=$1, email=COALESCE($2, email), password_hash=$3, role=$4 WHERE id=$5 AND tenant_id=$6',
        [name, email?.toLowerCase().trim() || null, pwHash, role, id, req.user.tenant_id]
      );
    } else {
      await pool.query(
        'UPDATE users SET name=$1, email=COALESCE($2, email), role=$3 WHERE id=$4 AND tenant_id=$5',
        [name, email?.toLowerCase().trim() || null, role, id, req.user.tenant_id]
      );
    }

    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at, last_login FROM users WHERE id=$1 AND tenant_id=$2',
      [id, req.user.tenant_id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[users] Error actualizando usuario:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE — eliminar usuario
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // No permitir eliminar al propio usuario
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }
    await pool.query('DELETE FROM users WHERE id=$1 AND tenant_id=$2', [id, req.user.tenant_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
