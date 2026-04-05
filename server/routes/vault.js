import express from 'express';
import pool from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { auditLog } from '../database.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

// ─── Helper: update vault balance and record in ledger ───────────────────────
// amount > 0 = inflow (money enters vault), amount < 0 = outflow (money leaves vault)
export async function vaultMove(client, type, currency, amount, note, adminName, shiftId = null, tenantId, denominations = null) {
  // Ensure vault row exists for this tenant
  await client.query(`
    INSERT INTO vault (dop_balance, usd_balance, eur_balance, tenant_id)
    VALUES (0, 0, 0, $1)
    ON CONFLICT (tenant_id) DO NOTHING
  `, [tenantId]);

  // Use parameterized CASE to avoid dynamic SQL (prevents SQL injection pattern)
  const { rows } = await client.query(
    `UPDATE vault
     SET dop_balance = CASE WHEN $3 = 'DOP' THEN dop_balance + $1 ELSE dop_balance END,
         usd_balance = CASE WHEN $3 = 'USD' THEN usd_balance + $1 ELSE usd_balance END,
         eur_balance = CASE WHEN $3 = 'EUR' THEN eur_balance + $1 ELSE eur_balance END,
         updated_at  = NOW()
     WHERE tenant_id = $2
     RETURNING dop_balance, usd_balance, eur_balance`,
    [amount, tenantId, currency]
  );

  const v = rows[0];

  // Guard: reject if any balance went negative (prevents overdraft)
  if (parseFloat(v.dop_balance) < 0 || parseFloat(v.usd_balance) < 0 || parseFloat(v.eur_balance) < 0) {
    throw new Error(`Balance negativo detectado tras movimiento ${type} (${currency} ${amount}). Operación revertida.`);
  }
  await client.query(
    `INSERT INTO vault_ledger
       (type, currency, amount, dop_balance_after, usd_balance_after, eur_balance_after,
        reference_shift_id, note, admin_name, tenant_id, denominations)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [type, currency, amount,
     v.dop_balance, v.usd_balance, v.eur_balance,
     shiftId, note, adminName, tenantId,
     denominations ? JSON.stringify(denominations) : null]
  );

  return v;
}

// ─── GET /api/vault — current balance ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Ensure vault row exists for this tenant
    await pool.query(`
      INSERT INTO vault (dop_balance, usd_balance, eur_balance, tenant_id)
      VALUES (0, 0, 0, $1) ON CONFLICT (tenant_id) DO NOTHING
    `, [req.user.tenant_id]);

    const { rows } = await pool.query('SELECT * FROM vault WHERE tenant_id = $1', [req.user.tenant_id]);
    res.json(rows[0] || { dop_balance: 0, usd_balance: 0, eur_balance: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/vault/ledger — transaction history ──────────────────────────────
router.get('/ledger', async (req, res) => {
  const { limit = 200, from, to } = req.query;
  try {
    const params = [req.user.tenant_id];
    let q = `SELECT * FROM vault_ledger WHERE tenant_id = $1`;
    if (from) { params.push(from); q += ` AND created_at >= $${params.length}`; }
    if (to)   { params.push(to);   q += ` AND created_at <= $${params.length}`; }
    params.push(parseInt(limit));
    q += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/vault/initialize — set initial vault amounts ──────────────────
router.post('/initialize', async (req, res) => {
  const { dop = 0, usd = 0, eur = 0, note } = req.body;
  if (parseFloat(dop) < 0 || parseFloat(usd) < 0 || parseFloat(eur) < 0) {
    return res.status(400).json({ error: 'Los montos no pueden ser negativos' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert vault with given amounts for this tenant
    const { rows } = await client.query(
      `INSERT INTO vault (dop_balance, usd_balance, eur_balance, tenant_id, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tenant_id) DO UPDATE
         SET dop_balance = $1, usd_balance = $2, eur_balance = $3, updated_at = NOW()
       RETURNING *`,
      [dop, usd, eur, req.user.tenant_id]
    );

    // Record all three in ledger
    const adminName = req.user.name;
    const n = note || 'Inicialización de bodega';
    for (const [cur, amt] of [['DOP', dop], ['USD', usd], ['EUR', eur]]) {
      if (amt !== 0) {
        await client.query(
          `INSERT INTO vault_ledger
             (type, currency, amount, dop_balance_after, usd_balance_after, eur_balance_after, note, admin_name, tenant_id)
           VALUES ('initial', $1, $2, $3, $4, $5, $6, $7, $8)`,
          [cur, amt, rows[0].dop_balance, rows[0].usd_balance, rows[0].eur_balance, n, adminName, req.user.tenant_id]
        );
      }
    }

    await client.query('COMMIT');

    await auditLog(req.user.id, req.user.name, 'BODEGA_INICIALIZADA', { dop, usd, eur, note: n });
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[vault] Error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// ─── POST /api/vault/adjust — manual adjustment (add/remove money) ────────────
router.post('/adjust', async (req, res) => {
  const { currency = 'DOP', amount, note, denominations, destination } = req.body;
  if (!amount || amount === 0) return res.status(400).json({ error: 'Monto inválido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const isWithdrawal = amount < 0;
    const fullNote = isWithdrawal && destination
      ? `Retiro → ${destination}${note ? ' · ' + note : ''}`
      : (note || 'Ajuste manual');

    const vault = await vaultMove(client, 'adjustment', currency, amount,
      fullNote, req.user.name, null, req.user.tenant_id,
      denominations || null);
    await client.query('COMMIT');

    await auditLog(req.user.id, req.user.name, 'BODEGA_AJUSTE', { currency, amount, note, denominations, destination });
    res.json({ vault, adminName: req.user.name, destination: destination || null, note: fullNote });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// ─── POST /api/vault/close — admin vault reconciliation ──────────────────────
router.post('/close', async (req, res) => {
  const { dopCount = 0, usdCount = 0, eurCount = 0, note, destination } = req.body;
  const VALID_DESTINATIONS = ['Banco', 'Caja fuerte', 'Propietario', 'Otro'];
  if (!destination || !VALID_DESTINATIONS.includes(destination)) {
    return res.status(400).json({ error: 'Destino del efectivo requerido' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current vault for this tenant
    await client.query(
      `INSERT INTO vault (dop_balance, usd_balance, eur_balance, tenant_id) VALUES (0, 0, 0, $1) ON CONFLICT (tenant_id) DO NOTHING`,
      [req.user.tenant_id]
    );
    const { rows: [vault] } = await client.query('SELECT * FROM vault WHERE tenant_id = $1 FOR UPDATE', [req.user.tenant_id]);

    const expDOP = parseFloat(vault.dop_balance);
    const expUSD = parseFloat(vault.usd_balance);
    const expEUR = parseFloat(vault.eur_balance);

    const dopDiff = dopCount - expDOP;
    const usdDiff = usdCount - expUSD;
    const eurDiff = eurCount - expEUR;

    // Record reconciliation in ledger (counted amounts vs expected)
    const closeNote = `Cierre de bodega → ${destination}${note ? ' · ' + note : ''} — ${new Date().toLocaleString('es-DO')}`;
    await client.query(
      `INSERT INTO vault_ledger
         (type, currency, amount, dop_balance_after, usd_balance_after, eur_balance_after, note, admin_name, tenant_id)
       VALUES ('close', 'DOP', $1, 0, 0, 0, $2, $3, $4)`,
      [dopDiff, closeNote, req.user.name, req.user.tenant_id]
    );

    // Reset vault to 0 after close — end of day, cash is secured
    const { rows } = await client.query(
      `UPDATE vault SET dop_balance = 0, usd_balance = 0, eur_balance = 0, updated_at = NOW()
       WHERE tenant_id = $1 RETURNING *`,
      [req.user.tenant_id]
    );

    await client.query('COMMIT');

    await auditLog(req.user.id, req.user.name, 'BODEGA_CIERRE', {
      expected:    { dop: expDOP, usd: expUSD, eur: expEUR },
      counted:     { dop: dopCount, usd: usdCount, eur: eurCount },
      diff:        { dop: dopDiff, usd: usdDiff, eur: eurDiff },
      destination,
    });

    res.json({
      vault:       rows[0],
      expected:    { dop: expDOP, usd: expUSD, eur: expEUR },
      counted:     { dop: dopCount, usd: usdCount, eur: eurCount },
      diff:        { dop: dopDiff, usd: usdDiff, eur: eurDiff },
      destination,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[vault] Error cerrando bodega:', err);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

export default router;
