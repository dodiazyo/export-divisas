import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../database.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM users');
    
    // Find a user matching the PIN
    let user = null;
    for (const row of rows) {
      if (await bcrypt.compare(pin, row.pin_hash)) {
        user = row;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error or database issue' });
  }
});

export default router;
