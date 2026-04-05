import React, { useState, useEffect, useCallback } from 'react';
import { Vault, RefreshCw, Plus, Minus, Lock, ArrowUpRight, ArrowDownLeft, Loader2, BarChart2, X, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import VaultCloseModal from './VaultCloseModal';

const DENOMS = {
  DOP: [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1],
  USD: [100, 50, 20, 10, 5, 2, 1],
  EUR: [500, 200, 100, 50, 20, 10, 5, 2, 1],
};
const SYM  = { DOP: 'RD$', USD: '$', EUR: '€' };
const COL  = { DOP: 'var(--gold)', USD: 'var(--green)', EUR: 'var(--blue)' };

const fmt = (n, sym = '') =>
  `${sym}${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TYPE_META = {
  initial:        { label: 'Inicialización',   color: 'var(--gold)',       icon: '🏦', dir: 1  },
  shift_open_out: { label: 'Apertura de caja', color: 'var(--red)',        icon: '📤', dir: -1 },
  shift_close_in: { label: 'Cierre de caja',   color: 'var(--green)',      icon: '📥', dir: 1  },
  injection_out:  { label: 'Inyección a caja', color: 'var(--purple)',     icon: '💉', dir: -1 },
  cash_in_out:    { label: 'Ingreso a caja',   color: 'var(--gold)',       icon: '💵', dir: -1 },
  adjustment:     { label: 'Ajuste manual',     color: 'var(--blue)',       icon: '✏️', dir: 0  },
  close:          { label: 'Cierre de bodega', color: 'var(--text-muted)', icon: '🔒', dir: 0  },
};

// ── Denomination picker ───────────────────────────────────────────────────────
function DenomPicker({ currency, counts, onChange }) {
  const denoms = DENOMS[currency] || [];
  const sym   = SYM[currency];
  const color = COL[currency];
  const total = denoms.reduce((s, d) => s + d * (parseInt(counts[d] || 0)), 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '4px 8px', alignItems: 'center' }}>
        {denoms.map(d => {
          const qty = counts[d] || '';
          const sub = d * (parseInt(qty) || 0);
          return (
            <React.Fragment key={d}>
              <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {sym} {d >= 1000 ? (d / 1000) + 'K' : d}
              </div>
              <input
                type="number" min="0" step="1" value={qty}
                onChange={e => {
                  const v = Math.max(0, parseInt(e.target.value) || 0);
                  onChange({ ...counts, [d]: v || '' });
                }}
                style={{
                  width: '100%', padding: '5px 8px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 6, color: 'var(--text-primary)',
                  fontSize: 14, fontWeight: 700, fontFamily: 'monospace',
                  outline: 'none', textAlign: 'center',
                }}
                onFocus={e => e.target.style.borderColor = color}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                placeholder="0"
              />
              <div style={{ fontSize: 12, color: sub > 0 ? color : 'var(--text-faint)', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>
                = {sym} {sub.toLocaleString('es-DO')}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ borderTop: '2px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 1.5, textTransform: 'uppercase' }}>TOTAL</span>
        <span style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'monospace' }}>
          {sym} {total.toLocaleString('es-DO')}
        </span>
      </div>
    </div>
  );
}

// ── Adjust / Recharge modal ───────────────────────────────────────────────────
const DESTINATIONS = ['Banco', 'Propietario', 'Caja chica', 'Proveedor', 'Otro'];

function AdjustModal({ isOpen, onClose, onDone }) {
  const [currency, setCurrency] = useState('DOP');
  const [dir, setDir]           = useState('+');
  const [counts, setCounts]     = useState({});
  const [note, setNote]         = useState('');
  const [destination, setDestination] = useState('');
  const [customDest, setCustomDest]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [receipt, setReceipt]   = useState(null); // result for comprobante

  useEffect(() => { setCounts({}); setError(''); }, [currency]);
  useEffect(() => { if (!isOpen) { setReceipt(null); setCounts({}); setNote(''); setDestination(''); setCustomDest(''); setDir('+'); setError(''); } }, [isOpen]);

  if (!isOpen) return null;

  const denoms   = DENOMS[currency] || [];
  const total    = denoms.reduce((s, d) => s + d * (parseInt(counts[d] || 0)), 0);
  const denomData = Object.fromEntries(
    Object.entries(counts).filter(([, v]) => parseInt(v) > 0).map(([k, v]) => [k, parseInt(v)])
  );
  const isWithdrawal = dir === '-';
  const finalDest = destination === 'Otro' ? customDest.trim() : destination;
  const canSubmit = total > 0 && (!isWithdrawal || finalDest);

  const handleSubmit = async () => {
    if (!canSubmit) { setError(isWithdrawal && !finalDest ? 'Seleccione el destino del retiro' : 'Ingrese al menos una denominación'); return; }
    setLoading(true);
    try {
      const amt = isWithdrawal ? -total : total;
      const res = await api.adjustVault(currency, amt, note.trim() || undefined, denomData, isWithdrawal ? finalDest : undefined);
      setReceipt({
        dir, currency, total, denomData,
        destination: isWithdrawal ? finalDest : null,
        note: note.trim(),
        adminName: res.adminName || '',
        date: new Date(),
        newBalance: res.vault,
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Receipt screen ──
  if (receipt) {
    const sym = SYM[receipt.currency];
    const col = COL[receipt.currency];
    const isOut = receipt.dir === '-';
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
          {/* Header */}
          <div style={{ background: isOut ? 'var(--red-bg)' : 'var(--green-bg)', borderBottom: '1px solid var(--border)', borderRadius: '18px 18px 0 0', padding: '18px 22px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{isOut ? '📤' : '📥'}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: isOut ? 'var(--red)' : 'var(--green)' }}>
              {isOut ? 'Comprobante de Retiro' : 'Comprobante de Ingreso'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>Bodega</div>
          </div>

          <div style={{ padding: '20px 22px' }} id="adjust-receipt">
            {/* Amount */}
            <div style={{ textAlign: 'center', marginBottom: 18, padding: '14px', background: 'var(--bg-card)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Monto</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: col, fontFamily: 'monospace' }}>
                {isOut ? '-' : '+'}{sym} {receipt.total.toLocaleString('es-DO')}
              </div>
            </div>

            {/* Details */}
            {[
              receipt.destination && { label: 'Destino', value: receipt.destination, bold: true },
              { label: 'Moneda', value: receipt.currency },
              { label: 'Fecha', value: receipt.date.toLocaleDateString('es-DO', { dateStyle: 'full' }) },
              { label: 'Hora', value: receipt.date.toLocaleTimeString('es-DO') },
              receipt.note && { label: 'Nota', value: receipt.note },
              receipt.adminName && { label: 'Autorizado por', value: receipt.adminName },
            ].filter(Boolean).map(({ label, value, bold }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: 'var(--text-primary)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
              </div>
            ))}

            {/* Denominations */}
            {Object.keys(receipt.denomData).length > 0 && (
              <div style={{ marginTop: 12, background: 'var(--bg-card)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Denominaciones</div>
                {Object.entries(receipt.denomData).sort(([a],[b])=>parseInt(b)-parseInt(a)).map(([bill, qty]) => (
                  <div key={bill} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', fontFamily: 'monospace' }}>
                    <span style={{ color: col }}>{sym} {parseInt(bill) >= 1000 ? (parseInt(bill)/1000)+'K' : bill} × {qty}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{sym} {(parseInt(bill)*qty).toLocaleString('es-DO')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => window.print()} style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                🖨 Imprimir
              </button>
              <button onClick={onClose} style={{ flex: 2, height: 44, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,var(--gold),var(--gold-light))', color: 'var(--bg-base)', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                ✓ Listo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Entry form ──
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.7)', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', flexShrink: 0 }}>
          Ajuste de Bodega
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
          {/* Direction */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[
              { v: '+', label: 'Ingresar', color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green)' },
              { v: '-', label: 'Retirar',  color: 'var(--red)',   bg: 'var(--red-bg)',   border: 'var(--red-border)' },
            ].map(b => (
              <button key={b.v} onClick={() => { setDir(b.v); setError(''); }} style={{
                flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${dir === b.v ? b.border : 'var(--border)'}`,
                background: dir === b.v ? b.bg : 'var(--bg-card)',
                color: dir === b.v ? b.color : 'var(--text-muted)',
                fontWeight: 700, fontSize: 13,
              }}>
                {b.v === '+' ? <Plus size={12} style={{ display:'inline', marginRight:4 }} /> : <Minus size={12} style={{ display:'inline', marginRight:4 }} />}
                {b.label}
              </button>
            ))}
          </div>

          {/* Destination — only for withdrawals */}
          {isWithdrawal && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--red)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                Destino del retiro *
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: destination === 'Otro' ? 8 : 0 }}>
                {DESTINATIONS.map(d => (
                  <button key={d} onClick={() => setDestination(d)} style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: destination === d ? 'var(--red-bg)' : 'var(--bg-card)',
                    color: destination === d ? 'var(--red)' : 'var(--text-subtle)',
                    outline: destination === d ? '1px solid var(--red-border)' : 'none',
                  }}>{d}</button>
                ))}
              </div>
              {destination === 'Otro' && (
                <input type="text" value={customDest} onChange={e => setCustomDest(e.target.value)}
                  placeholder="Especifique el destino..."
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--red-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                  maxLength={80}
                />
              )}
            </div>
          )}

          {/* Currency */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['DOP', 'USD', 'EUR'].map(c => (
              <button key={c} onClick={() => setCurrency(c)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', border: 'none',
                background: currency === c ? 'var(--bg-elevated)' : 'var(--bg-card)',
                color: currency === c ? COL[c] : 'var(--text-subtle)',
                fontWeight: currency === c ? 800 : 500, fontSize: 13,
              }}>{c}</button>
            ))}
          </div>

          {/* Denomination picker */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
            <DenomPicker currency={currency} counts={counts} onChange={setCounts} />
          </div>

          {/* Note */}
          <input
            type="text" value={note} onChange={e => setNote(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', marginBottom: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
            placeholder={isWithdrawal ? 'Observaciones (opcional)...' : 'Origen del dinero (opcional)...'}
            maxLength={120}
          />

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>⚠ {error}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={loading || !canSubmit} style={{
              flex: 2, height: 44, borderRadius: 8, border: 'none',
              background: (!loading && canSubmit)
                ? (isWithdrawal ? 'linear-gradient(135deg,#7f1d1d,var(--red))' : 'linear-gradient(135deg,var(--green-dark),var(--green))')
                : 'var(--bg-elevated)',
              color: (!loading && canSubmit) ? 'white' : 'var(--text-subtle)',
              fontWeight: 900, fontSize: 14, cursor: (!loading && canSubmit) ? 'pointer' : 'not-allowed',
            }}>
              {loading ? 'Guardando...' : isWithdrawal ? `Retirar ${SYM[currency]} ${total.toLocaleString('es-DO')}` : `Ingresar ${SYM[currency]} ${total.toLocaleString('es-DO')}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Denomination detail display ───────────────────────────────────────────────
function DenomDetail({ denominations, currency }) {
  if (!denominations || Object.keys(denominations).length === 0) return null;
  const sym = SYM[currency] || 'RD$';
  const color = COL[currency] || 'var(--gold)';
  const entries = Object.entries(denominations)
    .filter(([, v]) => parseInt(v) > 0)
    .sort(([a], [b]) => parseInt(b) - parseInt(a));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 6px', marginTop: 4 }}>
      {entries.map(([bill, qty]) => (
        <span key={bill} style={{ fontSize: 10, background: `${color}18`, color, borderRadius: 4, padding: '1px 6px', fontFamily: 'monospace', fontWeight: 700 }}>
          {sym}{parseInt(bill) >= 1000 ? (parseInt(bill)/1000)+'K' : bill} ×{qty}
        </span>
      ))}
    </div>
  );
}

// ── Reports Modal ─────────────────────────────────────────────────────────────
function ReportsModal({ isOpen, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to,   setTo]   = useState(today);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getVaultLedger(500, from + 'T00:00:00', to + 'T23:59:59');
      setRows(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  if (!isOpen) return null;

  // Totals per currency
  const totals = { DOP: 0, USD: 0, EUR: 0 };
  rows.forEach(r => {
    const a = parseFloat(r.amount);
    if (r.currency === 'USD') totals.USD += a;
    else if (r.currency === 'EUR') totals.EUR += a;
    else totals.DOP += a;
  });

  const handlePrint = () => window.print();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, width: '100%', maxWidth: 720, maxHeight: '96vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Reporte de Bodega</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }}><X size={20} /></button>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 700 }}>DESDE</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 700 }}>HASTA</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
            />
          </div>
          <button onClick={load} disabled={loading} style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Filtrar
          </button>
          <button onClick={handlePrint} style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg,var(--gold),var(--gold-light))', border: 'none', color: 'var(--bg-base)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            🖨 Imprimir
          </button>
        </div>

        {/* Summary */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexShrink: 0 }}>
          {[['DOP', 'RD$', 'var(--gold)'], ['USD', '$', 'var(--green)'], ['EUR', '€', 'var(--blue)']].map(([cur, sym, color]) => (
            <div key={cur} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-subtle)', fontWeight: 700, letterSpacing: 1 }}>{cur}</span>
              <span style={{ fontSize: 14, fontWeight: 900, color, fontFamily: 'monospace' }}>
                {totals[cur] >= 0 ? '+' : ''}{sym} {Math.abs(totals[cur]).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-subtle)' }}>{rows.length} movimientos</span>
        </div>

        {/* Ledger */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando...
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-subtle)', fontSize: 13 }}>Sin movimientos en este período</div>
          ) : rows.map(row => {
            const meta = TYPE_META[row.type] || { label: row.type, color: 'var(--text-muted)', icon: '•' };
            const isOut = parseFloat(row.amount) < 0;
            const amtAbs = Math.abs(parseFloat(row.amount));
            const sym = SYM[row.currency] || 'RD$';
            const color = isOut ? 'var(--red)' : 'var(--green)';
            return (
              <div key={row.id} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: isOut ? 'var(--red-bg)' : 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {meta.label}
                      <span style={{ fontSize: 10, fontWeight: 600, color: meta.color, background: `${meta.color}18`, padding: '1px 6px', borderRadius: 4 }}>{row.currency}</span>
                    </div>
                    {row.note && <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>{row.note}</div>}
                    <DenomDetail denominations={row.denominations} currency={row.currency} />
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                      {new Date(row.created_at).toLocaleString('es-DO')}
                      {row.admin_name && ` · ${row.admin_name}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color, fontFamily: 'monospace' }}>
                      {isOut ? '−' : '+'}{sym} {fmt(amtAbs)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 1 }}>
                      Saldo: {sym} {fmt(row.currency === 'USD' ? row.usd_balance_after : row.currency === 'EUR' ? row.eur_balance_after : row.dop_balance_after)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main VaultView ────────────────────────────────────────────────────────────
export default function VaultView({ onVaultChange }) {
  const [vault, setVault]     = useState(null);
  const [ledger, setLedger]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust]   = useState(false);
  const [showClose, setShowClose]     = useState(false);
  const [showReports, setShowReports] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [v, l] = await Promise.all([api.getVault(), api.getVaultLedger(50)]);
      setVault(v);
      setLedger(l);
      if (onVaultChange) onVaultChange(v);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onVaultChange]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5s to catch shift closes from cashiers
  useEffect(() => {
    const interval = setInterval(() => load(true), 5000);
    return () => clearInterval(interval);
  }, [load]);

  const dop = parseFloat(vault?.dop_balance || 0);
  const usd = parseFloat(vault?.usd_balance || 0);
  const eur = parseFloat(vault?.eur_balance || 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-subtle)' }}>
      <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
      Cargando bodega...
    </div>
  );

  const hasNegative = dop < 0 || usd < 0 || eur < 0;
  const isZero = dop === 0 && usd === 0 && eur === 0;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Empty vault prompt */}
      {isZero && (
        <div style={{
          background: 'var(--gold-bg)', border: '1px solid rgba(212,168,67,0.4)',
          borderRadius: 14, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold-light)', marginBottom: 3 }}>
              🏦 Bodega vacía
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
              Ingresa el efectivo disponible antes de abrir cajas.
            </div>
          </div>
          <button onClick={() => setShowAdjust(true)} style={{
            flexShrink: 0, padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,var(--gold),var(--gold-light))',
            color: 'var(--bg-base)', fontWeight: 900, fontSize: 13,
          }}>
            Ingresar efectivo
          </button>
        </div>
      )}

      {/* Negative balance warning */}
      {hasNegative && !isZero && (
        <div style={{
          background: 'var(--red-bg)', border: '1px solid var(--red-border)',
          borderRadius: 14, padding: '12px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)', marginBottom: 2 }}>
              Saldo negativo detectado
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
              Esto ocurre cuando se abrieron cajas antes de inicializar la bodega. Usa "Ajuste / Recarga" para corregir el saldo a la cantidad real disponible.
            </div>
          </div>
        </div>
      )}

      {/* Balance cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'DOP — Pesos',    value: dop, sym: 'RD$', color: 'var(--gold)',  grad: 'linear-gradient(135deg,var(--gold-bg),var(--bg-surface))' },
          { label: 'USD — Dólares',  value: usd, sym: '$',   color: 'var(--green)', grad: 'linear-gradient(135deg,var(--green-bg),var(--bg-surface))' },
          { label: 'EUR — Euros',    value: eur, sym: '€',   color: 'var(--blue)',  grad: 'linear-gradient(135deg,var(--blue-bg),var(--bg-surface))' },
        ].map(({ label, value, sym, color, grad }) => {
          const isNeg = value < 0;
          return (
          <div key={label} style={{ background: isNeg ? 'var(--red-bg)' : grad, border: `1px solid ${isNeg ? 'var(--red-border)' : color+'30'}`, borderRadius: 16, padding: '20px', boxShadow: `0 4px 24px ${isNeg ? 'rgba(239,68,68,0.15)' : color+'18'}` }}>
            <div style={{ fontSize: 10, color: 'var(--text-subtle)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: isNeg ? 'var(--red)' : color, fontFamily: 'monospace', letterSpacing: -0.5 }}>
              {sym} {fmt(value)}
            </div>
            {isNeg && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4, opacity: 0.8 }}>⚠ Requiere ajuste</div>}
          </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setShowAdjust(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 10, cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--blue)', fontSize: 13, fontWeight: 700 }}>
          <Plus size={14} /> Ajuste / Recarga
        </button>
        <button onClick={() => setShowReports(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 10, cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--purple)', fontSize: 13, fontWeight: 700 }}>
          <BarChart2 size={14} /> Reportes
        </button>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-subtle)', fontSize: 13, fontWeight: 600 }}>
          <RefreshCw size={14} />
        </button>
        <button onClick={() => setShowClose(true)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg,var(--gold),var(--gold-light))', border: 'none', color: 'var(--bg-base)', fontSize: 13, fontWeight: 900, boxShadow: '0 4px 16px rgba(212,168,67,0.3)' }}>
          <Lock size={14} /> Cierre de Bodega
        </button>
      </div>

      {/* Ledger (recent) */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Últimos Movimientos</div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Recientes 50</div>
        </div>

        {ledger.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-subtle)', fontSize: 13 }}>Sin movimientos aún</div>
        ) : (
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {ledger.map(row => {
              const meta  = TYPE_META[row.type] || { label: row.type, color: 'var(--text-muted)', icon: '•', dir: 0 };
              const isOut = parseFloat(row.amount) < 0;
              const amtAbs = Math.abs(parseFloat(row.amount));
              const sym  = SYM[row.currency] || 'RD$';
              const color = isOut ? 'var(--red)' : 'var(--green)';
              return (
                <div key={row.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: isOut ? 'var(--red-bg)' : 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginTop: 1 }}>
                    {isOut ? <ArrowUpRight size={15} color="var(--red)" /> : <ArrowDownLeft size={15} color="var(--green)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: meta.color, background: `${meta.color}18`, padding: '1px 6px', borderRadius: 4 }}>{row.currency}</span>
                    </div>
                    {row.note && <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.note}</div>}
                    <DenomDetail denominations={row.denominations} currency={row.currency} />
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                      {new Date(row.created_at).toLocaleString('es-DO')}
                      {row.admin_name && ` · ${row.admin_name}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color, fontFamily: 'monospace' }}>
                      {isOut ? '−' : '+'}{sym} {fmt(amtAbs)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 2 }}>
                      {sym} {fmt(row.currency === 'USD' ? row.usd_balance_after : row.currency === 'EUR' ? row.eur_balance_after : row.dop_balance_after)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AdjustModal
        isOpen={showAdjust}
        onClose={() => setShowAdjust(false)}
        onDone={() => { setShowAdjust(false); load(); }}
      />
      <VaultCloseModal
        isOpen={showClose}
        onClose={() => setShowClose(false)}
        vault={vault}
        onClosed={(updated) => { setVault(updated); if (onVaultChange) onVaultChange(updated); load(true); }}
        onDone={() => setShowClose(false)}
      />
      <ReportsModal
        isOpen={showReports}
        onClose={() => setShowReports(false)}
      />

    </div>
  );
}
