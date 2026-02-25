import express from 'express';
import pool from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// Get active shift for the logged in user
router.get('/active', async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM shifts WHERE user_id = $1 AND status = 'open' ORDER BY id DESC LIMIT 1",
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all currently open shifts
router.get('/active-all', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, user_id, user_name, start_time, data FROM shifts WHERE status = 'open' ORDER BY start_time DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all shifts history
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM shifts ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all transactions (for reports)
router.get('/transactions', requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  try {
    let query = "SELECT * FROM transactions";
    let params = [];
    if (from && to) {
      query += " WHERE date >= $1 AND date <= $2";
      params = [from, to];
    }
    query += " ORDER BY date DESC";
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Open a new shift
router.post('/', async (req, res) => {
  try {
    // Check if user already has an open shift
    const existing = await pool.query("SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'", [req.user.id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already has an open shift' });
    }

    const { data } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO shifts (user_id, user_name, data) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, req.user.name, JSON.stringify(data || {})]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Close a shift
router.put('/:id/close', async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;
  try {
    // Verify shift belongs to user (or is admin)
    if (req.user.role !== 'admin') {
      const shiftCheck = await pool.query("SELECT user_id FROM shifts WHERE id = $1", [id]);
      if (shiftCheck.rows.length === 0 || shiftCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    const { rows } = await pool.query(
      "UPDATE shifts SET status = 'closed', closed_at = NOW(), data = $1 WHERE id = $2 RETURNING *",
      [JSON.stringify(data || {}), id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Register a transaction
router.post('/:id/transactions', async (req, res) => {
  const { id } = req.params;
  const { type, data } = req.body;
  
  try {
    const { rows } = await pool.query(
      "INSERT INTO transactions (shift_id, type, data) VALUES ($1, $2, $3) RETURNING *",
      [id, type, JSON.stringify(data)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Inject capital (Admin only for a specific shift)
router.post('/:id/injections', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;
  
  try {
    const { rows } = await pool.query(
      "INSERT INTO injections (shift_id, data) VALUES ($1, $2) RETURNING *",
      [id, JSON.stringify(data)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
