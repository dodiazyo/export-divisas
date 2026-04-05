import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, role, created_at FROM users ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, pin, role } = req.body;
  
  if (!name || !pin) return res.status(400).json({ error: 'Name and pin required' });
  
  try {
    const hash = await bcrypt.hash(pin, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, pin_hash, role) VALUES ($1, $2, $3) RETURNING id, name, role, created_at',
      [name, hash, role || 'currency_agent']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, pin, role } = req.body;
  
  try {
    if (pin) {
      const hash = await bcrypt.hash(pin, 10);
      await pool.query('UPDATE users SET name=$1, pin_hash=$2, role=$3 WHERE id=$4', [name, hash, role, id]);
    } else {
      await pool.query('UPDATE users SET name=$1, role=$2 WHERE id=$3', [name, role, id]);
    }
    const { rows } = await pool.query('SELECT id, name, role, created_at FROM users WHERE id=$1', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
