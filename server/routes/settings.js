import express from 'express';
import pool from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT data FROM settings WHERE tenant_id = $1', [req.user.tenant_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Settings not found' });
    res.json(rows[0].data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE settings SET data = $1 WHERE tenant_id = $2', [JSON.stringify(req.body), req.user.tenant_id]);
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
