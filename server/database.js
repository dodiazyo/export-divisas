import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Pool } = pg;

// Validar variables de entorno criticas al arrancar
if (!process.env.DATABASE_URL) {
  console.error('[FATAL] DATABASE_URL no esta definido en .env');
  process.exit(1);
}

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
        must_change_pin BOOLEAN DEFAULT FALSE,
        last_login TIMESTAMPTZ,
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

      CREATE TABLE IF NOT EXISTS cash_ins (
        id SERIAL PRIMARY KEY,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        date TIMESTAMPTZ DEFAULT NOW(),
        data JSONB NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_name TEXT,
        action TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        ip TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        business_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plan VARCHAR(20) DEFAULT 'free',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vault (
        id INTEGER PRIMARY KEY DEFAULT 1,
        dop_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
        usd_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
        eur_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS superadmins (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL DEFAULT 40.00,
        description TEXT,
        max_cashiers INTEGER DEFAULT 5,
        features JSONB DEFAULT '[]',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vault_ledger (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'DOP',
        amount NUMERIC(12,2) NOT NULL,
        dop_balance_after NUMERIC(12,2),
        usd_balance_after NUMERIC(12,2),
        eur_balance_after NUMERIC(12,2),
        reference_shift_id INTEGER,
        note TEXT,
        admin_name VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Agregar columnas nuevas si no existen (para bases de datos existentes)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_pin BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE vault_ledger ADD COLUMN IF NOT EXISTS denominations JSONB;
    `).catch(() => {});

    // Índice único: solo un turno abierto por usuario por tenant (protege a nivel de DB)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS shifts_user_tenant_open
      ON shifts(user_id, tenant_id)
      WHERE status = 'open';
    `).catch(() => {});

    // Migración: agregar email + password_hash a users (login con correo)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `).catch(() => {});

    // Tabla para tokens de reset de contraseña
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    // Agregar soporte multi-tenant a todas las tablas
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
      ALTER TABLE injections ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
      ALTER TABLE cash_ins ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
      ALTER TABLE vault ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
      ALTER TABLE vault_ledger ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
      ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
      CREATE UNIQUE INDEX IF NOT EXISTS vault_tenant_id_key ON vault(tenant_id);
      CREATE UNIQUE INDEX IF NOT EXISTS settings_tenant_id_key ON settings(tenant_id);
    `).catch(() => {});

    // Convertir settings y vault a auto-increment para soportar múltiples tenants
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS settings_id_seq;
      SELECT setval('settings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM settings));
      ALTER TABLE settings ALTER COLUMN id SET DEFAULT nextval('settings_id_seq');
      CREATE SEQUENCE IF NOT EXISTS vault_id_seq;
      SELECT setval('vault_id_seq', (SELECT COALESCE(MAX(id), 1) FROM vault));
      ALTER TABLE vault ALTER COLUMN id SET DEFAULT nextval('vault_id_seq');
    `).catch(() => {});

    // Crear admin inicial solo si no hay usuarios
    const { rows } = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) === 0) {
      const defaultPassword = 'admin1234';
      const pinHash = await bcrypt.hash('__no_pin__', 12);
      const pwHash  = await bcrypt.hash(defaultPassword, 12);
      await client.query(
        `INSERT INTO users (name, pin_hash, password_hash, email, role, must_change_pin)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Admin General', pinHash, pwHash, 'admin@divisas.local', 'admin', true]
      );
      console.log('');
      console.log('╔══════════════════════════════════════════════╗');
      console.log('║   CREDENCIALES INICIALES DEL SISTEMA         ║');
      console.log('╠══════════════════════════════════════════════╣');
      console.log('║  Email:       admin@divisas.local            ║');
      console.log('║  Contraseña:  admin1234                      ║');
      console.log('║  ⚠️  Cambia la contraseña en el primer login  ║');
      console.log('╚══════════════════════════════════════════════╝');
      console.log('');
    }

    // Migración: si admin existe pero no tiene email/password_hash, asignar credenciales
    await client.query(`
      UPDATE users
      SET email = 'admin@divisas.local',
          must_change_pin = TRUE
      WHERE role = 'admin' AND email IS NULL
    `);
    // Para admins sin password_hash, copiar desde tenant si aplica
    const { rows: adminsNoPw } = await client.query(
      `SELECT u.id, t.password_hash as tenant_pw, t.email as tenant_email
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.password_hash IS NULL`
    );
    for (const row of adminsNoPw) {
      if (row.tenant_pw) {
        await client.query(
          `UPDATE users SET password_hash = $1, email = COALESCE(email, $2) WHERE id = $3`,
          [row.tenant_pw, row.tenant_email, row.id]
        );
      } else {
        const fallback = await bcrypt.hash('admin1234', 12);
        await client.query(
          `UPDATE users SET password_hash = $1 WHERE id = $2`,
          [fallback, row.id]
        );
      }
    }

    // Settings por defecto
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
    }
    await client.query('UPDATE settings SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE id = 1').catch(() => {});

    // Seed tenant inicial si no existe ninguno
    const { rows: tenantRows } = await client.query('SELECT COUNT(*) FROM tenants');
    if (parseInt(tenantRows[0].count) === 0) {
      // Crear tenant por defecto para datos existentes
      const { rows: adminRows } = await client.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
      const admin = adminRows[0];
      const dummyHash = await bcrypt.hash('changeme_saas', 12);
      const { rows: newTenant } = await client.query(
        `INSERT INTO tenants (business_name, owner_name, email, password_hash)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Casa de Cambio', admin?.name || 'Admin', 'admin@local.app', dummyHash]
      );
      const tid = newTenant[0].id;
      // Asignar todas las filas existentes a este tenant
      await client.query(`UPDATE users SET tenant_id = $1 WHERE tenant_id IS NULL`, [tid]);
      await client.query(`UPDATE shifts SET tenant_id = $1 WHERE tenant_id IS NULL`, [tid]);
      await client.query(`UPDATE transactions SET tenant_id = $1 WHERE tenant_id IS NULL`, [tid]);
      await client.query(`UPDATE injections SET tenant_id = $1 WHERE tenant_id IS NULL`, [tid]);
      await client.query(`UPDATE cash_ins SET tenant_id = $1 WHERE tenant_id IS NULL`, [tid]);
      await client.query(`UPDATE settings SET tenant_id = $1 WHERE tenant_id IS NULL`, [tid]);
      await client.query(`UPDATE vault SET tenant_id = $1 WHERE tenant_id IS NULL`, [tid]);
      await client.query(`UPDATE vault_ledger SET tenant_id = $1 WHERE tenant_id IS NULL`, [tid]);
      console.log(`[startup] Tenant inicial creado (id=${tid})`);
    }

    // Agregar plan_id a tenants si no existe
    await client.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES plans(id);
    `).catch(() => {});

    // Seed planes iniciales si no existen
    const { rows: planRows } = await client.query('SELECT COUNT(*) FROM plans');
    if (parseInt(planRows[0].count) === 0) {
      await client.query(`
        INSERT INTO plans (name, price, description, max_cashiers, features) VALUES
        ($1,$2,$3,$4,$5),
        ($6,$7,$8,$9,$10),
        ($11,$12,$13,$14,$15)
      `, [
        'Básico',    40.00, 'Para negocios pequeños',    2, JSON.stringify(['1 sucursal','2 cajeros','Soporte por email']),
        'Pro',       75.00, 'Para negocios en crecimiento', 5, JSON.stringify(['1 sucursal','5 cajeros','Bodega','Soporte prioritario']),
        'Empresarial',120.00,'Para negocios establecidos', 20, JSON.stringify(['Multi-sucursal','20 cajeros','Bodega','Reportes avanzados','Soporte 24/7']),
      ]);
      console.log('[startup] Planes iniciales creados');
    }

    // Seed superadmin inicial si no existe
    const { rows: saRows } = await client.query('SELECT COUNT(*) FROM superadmins');
    if (parseInt(saRows[0].count) === 0) {
      const saPassword = process.env.SUPERADMIN_INITIAL_PASSWORD || 'superadmin1234';
      const saHash = await bcrypt.hash(saPassword, 12);
      await client.query(
        `INSERT INTO superadmins (name, email, password_hash) VALUES ($1, $2, $3)`,
        ['Super Admin', 'superadmin@divisaspro.com', saHash]
      );
      console.log('');
      console.log('╔══════════════════════════════════════════════╗');
      console.log('║   CREDENCIALES SUPER-ADMIN                   ║');
      console.log('╠══════════════════════════════════════════════╣');
      console.log('║  Email:       superadmin@divisaspro.com      ║');
      console.log('║  Contraseña:  superadmin1234                 ║');
      console.log('║  ⚠️  CAMBIA EN PRODUCCIÓN                    ║');
      console.log('╚══════════════════════════════════════════════╝');
      console.log('');
    }

    console.log('[startup] Base de datos inicializada correctamente');
  } finally {
    client.release();
  }
}

// Funcion para registrar acciones en el audit log
export async function auditLog(userId, userName, action, details = {}, ip = null) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, user_name, action, details, ip) VALUES ($1, $2, $3, $4, $5)`,
      [userId, userName, action, JSON.stringify(details), ip]
    );
  } catch (err) {
    console.error('[audit] Error registrando accion:', err.message);
  }
}
