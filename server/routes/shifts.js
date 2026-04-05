import express from "express";
import bcrypt from "bcryptjs";
import pool from "../database.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { auditLog } from "../database.js";
import { vaultMove } from "./vault.js";

const router = express.Router();

router.use(requireAuth);

// Get active shift for the logged in user
router.get("/active", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM shifts WHERE user_id = $1 AND status = 'open' AND tenant_id = $2 ORDER BY id DESC LIMIT 1",
      [req.user.id, req.user.tenant_id],
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Get all currently open shifts
router.get("/active-all", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, user_id, user_name, start_time, data FROM shifts WHERE status = 'open' AND tenant_id = $1 ORDER BY start_time DESC",
      [req.user.tenant_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Get all shifts history
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM shifts WHERE tenant_id = $1 ORDER BY created_at DESC",
      [req.user.tenant_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Get all transactions (for reports)
router.get("/transactions", requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  try {
    let query = "SELECT * FROM transactions WHERE tenant_id = $1";
    let params = [req.user.tenant_id];
    if (from && to) {
      query += " AND date >= $2 AND date <= $3";
      params = [req.user.tenant_id, from, to];
    }
    query += " ORDER BY date DESC";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Open a new shift
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    // Check if user already has an open shift
    const existing = await client.query(
      "SELECT id FROM shifts WHERE user_id = $1 AND status = 'open' AND tenant_id = $2",
      [req.user.id, req.user.tenant_id],
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "User already has an open shift" });
    }

    const { data } = req.body;

    await client.query("BEGIN");

    const { rows } = await client.query(
      "INSERT INTO shifts (user_id, user_name, data, tenant_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, req.user.name, JSON.stringify(data || {}), req.user.tenant_id],
    );
    const shift = rows[0];

    // Validate vault has sufficient balance before opening
    const dopStart = parseFloat(data?.startAmount || 0);
    const usdStart = parseFloat(data?.usdStartAmount || 0);
    const eurStart = parseFloat(data?.eurStartAmount || 0);
    const adminName = req.user.name;

    if (dopStart > 0 || usdStart > 0 || eurStart > 0) {
      const { rows: vr } = await client.query(
        'SELECT dop_balance, usd_balance, eur_balance FROM vault WHERE tenant_id = $1',
        [req.user.tenant_id]
      );
      const v = vr[0] || { dop_balance: 0, usd_balance: 0, eur_balance: 0 };
      const errors = [];
      if (dopStart > parseFloat(v.dop_balance)) errors.push(`DOP disponible: RD$ ${parseFloat(v.dop_balance).toLocaleString('es-DO', {minimumFractionDigits:2})}`);
      if (usdStart > parseFloat(v.usd_balance)) errors.push(`USD disponible: $ ${parseFloat(v.usd_balance).toLocaleString('es-DO', {minimumFractionDigits:2})}`);
      if (eurStart > parseFloat(v.eur_balance)) errors.push(`EUR disponible: € ${parseFloat(v.eur_balance).toLocaleString('es-DO', {minimumFractionDigits:2})}`);
      if (errors.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Fondos insuficientes en bodega. ${errors.join(' · ')}` });
      }
    }

    if (dopStart > 0)
      await vaultMove(client, 'shift_open_out', 'DOP', -dopStart,
        `Apertura Caja #${shift.id} — ${shift.user_name}`, adminName, shift.id, req.user.tenant_id);
    if (usdStart > 0)
      await vaultMove(client, 'shift_open_out', 'USD', -usdStart,
        `Apertura Caja #${shift.id} — ${shift.user_name}`, adminName, shift.id, req.user.tenant_id);
    if (eurStart > 0)
      await vaultMove(client, 'shift_open_out', 'EUR', -eurStart,
        `Apertura Caja #${shift.id} — ${shift.user_name}`, adminName, shift.id, req.user.tenant_id);

    await client.query("COMMIT");
    res.status(201).json(shift);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[shifts] Error abriendo turno:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// Close a shift
router.put("/:id/close", async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;
  const client = await pool.connect();
  try {
    // Verify shift belongs to user (or is admin) and to the same tenant
    if (req.user.role !== "admin") {
      const shiftCheck = await client.query(
        "SELECT user_id FROM shifts WHERE id = $1 AND tenant_id = $2",
        [id, req.user.tenant_id],
      );
      if (
        shiftCheck.rows.length === 0 ||
        shiftCheck.rows[0].user_id !== req.user.id
      ) {
        return res.status(403).json({ error: "Not authorized" });
      }
    } else {
      const shiftCheck = await client.query(
        "SELECT id FROM shifts WHERE id = $1 AND tenant_id = $2",
        [id, req.user.tenant_id],
      );
      if (shiftCheck.rows.length === 0) {
        return res.status(403).json({ error: "Not authorized" });
      }
    }

    await client.query("BEGIN");

    const { rows } = await client.query(
      "UPDATE shifts SET status = 'closed', closed_at = NOW(), data = $1 WHERE id = $2 RETURNING *",
      [JSON.stringify(data || {}), id],
    );
    const shift = rows[0];

    // Credit vault with final amounts (money returned from cashier to vault)
    const dopFinal = parseFloat(data?.finalAmount || 0);
    const usdFinal = parseFloat(data?.finalUsdAmount || 0);
    const eurFinal = parseFloat(data?.finalEurAmount || 0);
    const adminName = req.user.name;
    const label = `Cierre Caja #${id} — ${shift.user_name}`;

    if (dopFinal > 0)
      await vaultMove(client, 'shift_close_in', 'DOP', dopFinal, label, adminName, parseInt(id), req.user.tenant_id);
    if (usdFinal > 0)
      await vaultMove(client, 'shift_close_in', 'USD', usdFinal, label, adminName, parseInt(id), req.user.tenant_id);
    if (eurFinal > 0)
      await vaultMove(client, 'shift_close_in', 'EUR', eurFinal, label, adminName, parseInt(id), req.user.tenant_id);

    await client.query("COMMIT");
    res.json(shift);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[shifts] Error cerrando turno:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// Register a transaction
router.post("/:id/transactions", async (req, res) => {
  const { id } = req.params;
  const { type, data } = req.body;

  // Validate transaction type
  const VALID_TYPES = ['exchange', 'external_sale'];
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Tipo de transacción inválido' });
  }

  // Validate required fields per type
  if (type === 'exchange') {
    if (!data?.amount || isNaN(data.amount) || parseFloat(data.amount) <= 0) {
      return res.status(400).json({ error: 'Monto de divisa inválido' });
    }
    if (!data?.dopAmount || isNaN(data.dopAmount) || parseFloat(data.dopAmount) <= 0) {
      return res.status(400).json({ error: 'Monto DOP inválido' });
    }
    if (!data?.rate || isNaN(data.rate) || parseFloat(data.rate) <= 0) {
      return res.status(400).json({ error: 'Tasa de cambio inválida' });
    }
    if (!['USD', 'EUR'].includes(data?.currency)) {
      return res.status(400).json({ error: 'Moneda inválida' });
    }
  }
  if (type === 'external_sale') {
    if (!data?.total || isNaN(data.total) || parseFloat(data.total) <= 0) {
      return res.status(400).json({ error: 'Total de venta inválido' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock shift FIRST (prevents race condition), also verifies tenant ownership
    const shiftRes = await client.query(
      "SELECT data FROM shifts WHERE id = $1 AND tenant_id = $2 AND status = 'open' FOR UPDATE",
      [id, req.user.tenant_id],
    );
    if (shiftRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: 'Turno no encontrado o ya cerrado' });
    }

    const { rows } = await client.query(
      "INSERT INTO transactions (shift_id, type, data, tenant_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [id, type, JSON.stringify(data), req.user.tenant_id],
    );
    const newTx = rows[0];

    const shiftData = shiftRes.rows[0].data || {};

    if (type === "exchange") {
      shiftData.currencyPayouts =
        (shiftData.currencyPayouts || 0) + (data.dopAmount || 0);
      if (data.currency === "USD")
        shiftData.usdOnHand = (shiftData.usdOnHand || 0) + (data.amount || 0);
      if (data.currency === "EUR")
        shiftData.eurOnHand = (shiftData.eurOnHand || 0) + (data.amount || 0);
      shiftData.totalGain = (shiftData.totalGain || 0) + (data.gain || 0);
    } else if (type === "external_sale") {
      shiftData.externalSalesTotal =
        (shiftData.externalSalesTotal || 0) + (data.total || 0);
    }

    shiftData.transactions = (shiftData.transactions || 0) + 1;

    await client.query("UPDATE shifts SET data = $1 WHERE id = $2", [
      JSON.stringify(shiftData),
      id,
    ]);

    await client.query("COMMIT");
    res.status(201).json(newTx);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[shifts] Error registrando transacción:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// Inject capital (Admin only for a specific shift)
router.post("/:id/injections", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const shiftRes = await client.query(
      "SELECT data, user_name FROM shifts WHERE id = $1 AND tenant_id = $2 AND status = 'open' FOR UPDATE",
      [id, req.user.tenant_id],
    );
    // Verify shift belongs to this tenant and is open
    if (shiftRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: 'Turno no encontrado o ya cerrado' });
    }

    const { rows } = await client.query(
      "INSERT INTO injections (shift_id, data, tenant_id) VALUES ($1, $2, $3) RETURNING *",
      [id, JSON.stringify(data), req.user.tenant_id],
    );
    const newInj = rows[0];
    {
      const shiftData = shiftRes.rows[0].data || {};

      shiftData.injections = shiftData.injections || [];
      shiftData.injections.push(data);

      if (data.currency === "USD") {
        shiftData.usdOnHand = (shiftData.usdOnHand || 0) + (data.amount || 0);
      } else if (data.currency === "EUR") {
        shiftData.eurOnHand = (shiftData.eurOnHand || 0) + (data.amount || 0);
      }

      await client.query("UPDATE shifts SET data = $1 WHERE id = $2", [
        JSON.stringify(shiftData), id,
      ]);
    }

    // Validate vault has sufficient balance before deducting
    const currency = data.currency || 'DOP';
    const amount = parseFloat(data.amount || 0);
    if (amount > 0) {
      const { rows: vaultRows } = await client.query(
        'SELECT dop_balance, usd_balance, eur_balance FROM vault WHERE tenant_id = $1',
        [req.user.tenant_id]
      );
      const vault = vaultRows[0] || { dop_balance: 0, usd_balance: 0, eur_balance: 0 };
      const balanceField = currency === 'USD' ? 'usd_balance' : currency === 'EUR' ? 'eur_balance' : 'dop_balance';
      const available = parseFloat(vault[balanceField] || 0);
      if (amount > available) {
        await client.query("ROLLBACK");
        const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'RD$';
        return res.status(400).json({
          error: `Fondos insuficientes en bodega. Disponible: ${sym} ${available.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`,
          available,
          currency,
        });
      }
      await vaultMove(client, 'injection_out', currency, -amount,
        `Inyección ${currency} → Caja #${id} — ${shiftRes.rows[0]?.user_name || ''}`,
        req.user.name, parseInt(id), req.user.tenant_id,
        data.denominations || null);
    }

    await client.query("COMMIT");
    res.status(201).json(newInj);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ── Ingreso de Efectivo (DOP desde bodega/caja fuerte) — Admin only ───────────
router.post("/:id/cash-in", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data } = req.body; // { amount, note, adminName, date }

  if (!data?.amount || data.amount <= 0) {
    return res.status(400).json({ error: "Monto inválido" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "INSERT INTO cash_ins (shift_id, data, tenant_id) VALUES ($1, $2, $3) RETURNING *",
      [id, JSON.stringify(data), req.user.tenant_id]
    );
    const newCashIn = rows[0];

    const shiftRes = await client.query(
      "SELECT data, user_name FROM shifts WHERE id = $1 AND tenant_id = $2 AND status = 'open' FOR UPDATE",
      [id, req.user.tenant_id]
    );
    if (shiftRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: 'Turno no encontrado o ya cerrado' });
    }
    {
      const sd = shiftRes.rows[0].data || {};
      sd.cashIns      = [...(sd.cashIns || []), { ...data, id: newCashIn.id }];
      sd.cashInsTotal = (sd.cashInsTotal || 0) + (data.amount || 0);
      await client.query("UPDATE shifts SET data = $1 WHERE id = $2", [
        JSON.stringify(sd), id,
      ]);
    }

    // Validate vault DOP balance
    const { rows: vr } = await client.query(
      'SELECT dop_balance FROM vault WHERE tenant_id = $1', [req.user.tenant_id]
    );
    const dopAvailable = parseFloat(vr[0]?.dop_balance || 0);
    if (parseFloat(data.amount) > dopAvailable) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Fondos insuficientes en bodega. DOP disponible: RD$ ${dopAvailable.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`,
      });
    }

    // Deduct DOP from vault
    await vaultMove(client, 'cash_in_out', 'DOP', -parseFloat(data.amount),
      `Ingreso efectivo DOP → Caja #${id} — ${shiftRes.rows[0]?.user_name || ''}`,
      req.user.name, parseInt(id), req.user.tenant_id);

    await client.query("COMMIT");

    await auditLog(req.user.id, req.user.name, "INGRESO_EFECTIVO", {
      shiftId: id, amount: data.amount, note: data.note,
    });

    res.status(201).json(newCashIn);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[shifts] Error en ingreso de efectivo:", err);
    res.status(500).json({ error: "Error del servidor" });
  } finally {
    client.release();
  }
});

// ── Listar ingresos de efectivo (Admin — para reportes) ───────────────────────
router.get("/cash-ins", requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  try {
    let query = `
      SELECT ci.id, ci.shift_id, ci.date, ci.data, s.user_name
      FROM cash_ins ci
      JOIN shifts s ON ci.shift_id = s.id
      WHERE ci.tenant_id = $1
    `;
    let params = [req.user.tenant_id];
    if (from && to) {
      query += " AND ci.date >= $2 AND ci.date <= $3";
      params = [req.user.tenant_id, from, to];
    }
    query += " ORDER BY ci.date DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Anular transacción (Admin — requiere PIN) ─────────────────────────────────
router.delete("/transactions/:txId/void", requireAdmin, async (req, res) => {
  const { txId } = req.params;
  const { adminPin, reason } = req.body;
  const ip = req.ip || "desconocida";

  if (!adminPin || !reason?.trim()) {
    return res.status(400).json({ error: "PIN y motivo de anulación requeridos" });
  }

  try {
    // Verificar PIN del admin que hace la solicitud
    const { rows: adminRows } = await pool.query("SELECT * FROM users WHERE id = $1 AND tenant_id = $2", [req.user.id, req.user.tenant_id]);
    const admin = adminRows[0];
    if (!admin || !(await bcrypt.compare(adminPin, admin.pin_hash))) {
      await auditLog(req.user.id, req.user.name, "ANULACION_DENEGADA", { txId, ip });
      return res.status(401).json({ error: "PIN incorrecto" });
    }

    // Obtener la transacción (verificar que pertenece al tenant)
    const { rows: txRows } = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND tenant_id = $2",
      [txId, req.user.tenant_id]
    );
    if (!txRows.length) return res.status(404).json({ error: "Transacción no encontrada" });
    const tx = txRows[0];

    if (tx.data?.voided) {
      return res.status(400).json({ error: "Esta transacción ya fue anulada" });
    }

    await pool.query("BEGIN");

    // Marcar transacción como anulada
    const updatedData = {
      ...tx.data,
      voided: true,
      voidReason: reason.trim(),
      voidedBy: req.user.name,
      voidedAt: new Date().toISOString(),
    };
    await pool.query("UPDATE transactions SET data = $1 WHERE id = $2", [
      JSON.stringify(updatedData), txId,
    ]);

    // Revertir el efecto en el turno
    const { rows: shiftRows } = await pool.query(
      "SELECT data FROM shifts WHERE id = $1 FOR UPDATE", [tx.shift_id]
    );
    if (shiftRows.length) {
      const sd = shiftRows[0].data || {};
      if (tx.type === "exchange") {
        sd.currencyPayouts  = Math.max(0, (sd.currencyPayouts  || 0) - (tx.data.dopAmount || 0));
        if (tx.data.currency === "USD") sd.usdOnHand = Math.max(0, (sd.usdOnHand || 0) - (tx.data.amount || 0));
        if (tx.data.currency === "EUR") sd.eurOnHand = Math.max(0, (sd.eurOnHand || 0) - (tx.data.amount || 0));
        sd.totalGain = (sd.totalGain || 0) - (tx.data.gain || 0); // gain can be negative on void
      } else if (tx.type === "external_sale") {
        sd.externalSalesTotal = Math.max(0, (sd.externalSalesTotal || 0) - (tx.data.total || 0));
      }
      sd.transactions = Math.max(0, (sd.transactions || 1) - 1);
      await pool.query("UPDATE shifts SET data = $1 WHERE id = $2", [
        JSON.stringify(sd), tx.shift_id,
      ]);
    }

    await pool.query("COMMIT");

    await auditLog(req.user.id, req.user.name, "TRANSACCION_ANULADA", {
      txId, reason, shiftId: tx.shift_id, ip,
    });

    res.json({ ok: true, message: "Transacción anulada correctamente" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("[shifts] Error anulando transacción:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;
