import React, { useState, useEffect } from 'react';
import { PlusCircle, Loader2, RefreshCw, AlertTriangle, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';

const DENOMS = {
  DOP: [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1],
  USD: [100, 50, 20, 10, 5, 1],
  EUR: [500, 200, 100, 50, 20, 10, 5, 2, 1],
};

const SYM = { DOP: 'RD$', USD: '$', EUR: '€' };
const COLOR = { DOP: 'var(--gold)', USD: 'var(--green)', EUR: 'var(--blue)' };

function DenomPicker({ currency, counts, onChange }) {
  const denoms = DENOMS[currency] || [];
  const sym = SYM[currency];
  const color = COLOR[currency];
  const total = denoms.reduce((s, d) => s + d * (parseInt(counts[d] || 0)), 0);

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto',
        gap: '4px 8px', alignItems: 'center',
      }}>
        {denoms.map(d => {
          const qty = counts[d] || '';
          const sub = d * (parseInt(qty) || 0);
          return (
            <React.Fragment key={d}>
              <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {sym} {d >= 1000 ? (d/1000)+'K' : d}
              </div>
              <input
                type="number" min="0" step="1"
                value={qty}
                onChange={e => {
                  const v = Math.max(0, parseInt(e.target.value) || 0);
                  onChange({ ...counts, [d]: v || '' });
                }}
                style={{
                  width: '100%', padding: '5px 8px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
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
      {/* Total row */}
      <div style={{
        borderTop: '2px solid var(--border)', marginTop: 8, paddingTop: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 1.5, textTransform: 'uppercase' }}>TOTAL</span>
        <span style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'monospace' }}>
          {sym} {total.toLocaleString('es-DO')}
        </span>
      </div>
    </div>
  );
}

export default function CapitalInjectionModal({ isOpen, onClose, onConfirm, adminName, myShiftId }) {
  const [currency, setCurrency] = useState('DOP');
  const [counts, setCounts] = useState({});
  const [note, setNote] = useState('');

  const [activeShifts, setActiveShifts] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCounts({});
      setNote('');
      setCurrency('DOP');
      setSelectedShiftId(myShiftId ? String(myShiftId) : '');
      setFetchError(null);
      fetchActiveShifts();
    }
  }, [isOpen, myShiftId]);

  // Reset counts when currency changes
  useEffect(() => { setCounts({}); }, [currency]);

  const fetchActiveShifts = async () => {
    setLoadingShifts(true);
    setFetchError(null);
    try {
      const shifts = await api.getActiveShifts();
      setActiveShifts(shifts || []);
      if (!myShiftId && shifts && shifts.length > 0) {
        setSelectedShiftId(String(shifts[0].id));
      }
    } catch (err) {
      setFetchError(err.message || 'Error al cargar las cajas');
    } finally {
      setLoadingShifts(false);
    }
  };

  const selectedShift = activeShifts.find(s => String(s.id) === String(selectedShiftId));
  const sd = selectedShift?.data || {};

  const denoms = DENOMS[currency] || [];
  const total = denoms.reduce((s, d) => s + d * (parseInt(counts[d] || 0)), 0);
  const denomData = Object.fromEntries(
    Object.entries(counts).filter(([, v]) => parseInt(v) > 0).map(([k, v]) => [k, parseInt(v)])
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedShiftId) { alert('Debe seleccionar la caja destino.'); return; }
    if (!total || total <= 0) { alert('Ingrese al menos una denominación.'); return; }
    onConfirm({ shiftId: selectedShiftId, currency, amount: total, note: note.trim(), adminName, denominations: denomData });
    setCounts({});
    setNote('');
    setCurrency('DOP');
  };

  if (!isOpen) return null;

  const canSubmit = activeShifts.length > 0 && selectedShiftId && !loadingShifts && total > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 18, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,168,67,0.1)',
        overflow: 'hidden', maxHeight: '95vh', display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--gold-bg), var(--bg-elevated))',
          borderBottom: '1px solid var(--border)',
          padding: '18px 22px',
          display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PlusCircle size={20} color="var(--bg-base)" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold-light)', letterSpacing: 0.5 }}>
              Enviar dinero a la caja
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>
              {adminName}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

          {/* Shift selector */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              Caja Destino
            </label>
            {loadingShifts ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-subtle)', fontSize: 13 }}>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                Cargando cajas activas...
              </div>
            ) : fetchError ? (
              <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
                  <AlertTriangle size={14} />{fetchError}
                </div>
                <button type="button" onClick={fetchActiveShifts} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: 'var(--red-bg)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <RefreshCw size={10} /> Reintentar
                </button>
              </div>
            ) : activeShifts.length === 0 ? (
              <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '10px 14px', color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
                No hay cajas abiertas en este momento
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <select
                  required
                  value={selectedShiftId}
                  onChange={e => setSelectedShiftId(e.target.value)}
                  style={{
                    width: '100%', appearance: 'none',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 38px 10px 14px',
                    color: 'var(--text-primary)', fontSize: 14, fontWeight: 700,
                    outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="" disabled>-- Seleccione una caja --</option>
                  {activeShifts.map(s => (
                    <option key={s.id} value={String(s.id)}>
                      Caja #{s.id} — {s.user_name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
              </div>
            )}
          </div>

          {/* Currency selector */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              Moneda
            </label>
            <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: 10, padding: 3, gap: 3, border: '1px solid var(--border)' }}>
              {[
                { id: 'DOP', label: 'Pesos', flag: '🇩🇴' },
                { id: 'USD', label: 'Dólares', flag: '🇺🇸' },
                { id: 'EUR', label: 'Euros', flag: '🇪🇺' },
              ].map(c => (
                <button key={c.id} type="button" onClick={() => setCurrency(c.id)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: currency === c.id ? 'var(--bg-elevated)' : 'transparent',
                  color: currency === c.id ? COLOR[c.id] : 'var(--text-subtle)',
                  fontWeight: currency === c.id ? 800 : 500, fontSize: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 15 }}>{c.flag}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Denomination picker */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
              Denominaciones
            </label>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
              <DenomPicker currency={currency} counts={counts} onChange={setCounts} />
            </div>
          </div>

          {/* Note */}
          <input
            type="text" value={note} onChange={e => setNote(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, outline: 'none',
            }}
            placeholder="Nota / Motivo (opcional)"
            maxLength={120}
          />

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px 0', borderRadius: 10,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={!canSubmit} style={{
              flex: 2, padding: '12px 0', borderRadius: 10, border: 'none',
              background: canSubmit ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'var(--bg-elevated)',
              color: canSubmit ? 'var(--bg-base)' : 'var(--text-subtle)',
              fontWeight: 900, fontSize: 14, cursor: canSubmit ? 'pointer' : 'not-allowed',
              boxShadow: canSubmit ? '0 4px 16px rgba(212,168,67,0.3)' : 'none',
              transition: 'all 0.2s',
            }}>
              ✓ Enviar a la caja
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
