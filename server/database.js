import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        pin_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'currency_agent',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        user_name TEXT,
        status TEXT DEFAULT 'open',
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        closed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        type TEXT,
        date TIMESTAMPTZ DEFAULT NOW(),
        data JSONB NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS injections (
        id SERIAL PRIMARY KEY,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        date TIMESTAMPTZ DEFAULT NOW(),
        data JSONB NOT NULL DEFAULT '{}'
      );
    `);

    // Seed default admin if no users exist
    const { rows } = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) === 0) {
      const hash = await bcrypt.hash('1234', 10);
      await client.query(
        `INSERT INTO users (name, pin_hash, role) VALUES ($1, $2, $3)`,
        ['Admin General', hash, 'admin']
      );
      console.log('[startup] Default admin created — PIN: 1234');
    }

    // Seed default settings if missing
    const { rows: settingsRows } = await client.query('SELECT COUNT(*) FROM settings');
    if (parseInt(settingsRows[0].count) === 0) {
      const defaultSettings = {
        name: 'CASA DE CAMBIO',
        rnc: '000-0000000-0',
        phone: '(809) 000-0000',
        address: 'Calle Principal #123',
        receiptMessage: '¡Gracias por su preferencia!',
        exchangeRate: 58.50,
        salesRate: 60.00,
        exchangeRateEur: 64.00,
        salesRateEur: 66.00,
      };
      await client.query('INSERT INTO settings (id, data) VALUES (1, $1)', [JSON.stringify(defaultSettings)]);
      console.log('[startup] Default settings created');
    }

    console.log('[startup] Database initialized');
  } finally {
    client.release();
  }
}
