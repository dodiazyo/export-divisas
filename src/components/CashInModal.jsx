import React, { useState, useEffect } from 'react';
import { Banknote, X } from 'lucide-react';
import { toCents, fromCents } from '../lib/money.js';

export default function CashInModal({ isOpen, onClose, onConfirm, adminName, targetShiftId, targetCashierName }) {
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) { setAmount(''); setNote(''); setLoading(false); }
  }, [isOpen]);

  const formatAmt = (val) => {
    const raw = val.replace(/[^0-9.]/g, '');
    if ((raw.match(/\./g) || []).length > 1) return amount;
    const [int, dec] = raw.split('.');
    const formatted = (int || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec !== undefined ? `${formatted}.${dec.slice(0, 2)}` : formatted;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cents = toCents((amount || '').replace(/,/g, ''));
    if (!cents || cents <= 0) { alert('Ingrese un monto válido mayor a cero.'); return; }
    setLoading(true);
    try {
      await onConfirm({
        shiftId: targetShiftId,
        amount: fromCents(cents),
        note: note.trim(),
        adminName,
        date: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid #1a3a1a',
        borderRadius: 18, width: '100%', maxWidth: 380,
        boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(34,197,94,0.1)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--green-bg), var(--bg-surface))',
          borderBottom: '1px solid #1a3a1a',
          padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--green-dark), var(--green))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
          }}>
            <Banknote size={22} color="var(--green-bg)" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>
              Ingreso de Efectivo
            </div>
            <div style={{ fontSize: 11, color: 'var(--green-border)', marginTop: 1 }}>
              DOP · Fondos desde bodega a caja
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Destination badge */}
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{
            background: 'var(--green-bg)', border: '1px solid var(--green-border)',
            borderRadius: 10, padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>📥</span>
            <div>
              <div style={{ fontSize: 9, color: 'var(--green-border)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Destino</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>
                Caja #{targetShiftId} — {targetCashierName || 'Cajero'}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Amount */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 7 }}>
              Monto a ingresar (DOP)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontWeight: 800, color: 'var(--green)', fontSize: 14,
              }}>RD$</span>
              <input
                type="text"
                inputMode="decimal"
                required
                autoFocus
                value={amount}
                onChange={e => setAmount(formatAmt(e.target.value))}
                style={{
                  width: '100%', paddingLeft: 52, paddingRight: 16,
                  paddingTop: 14, paddingBottom: 14,
                  background: 'var(--bg-base)', border: '2px solid #1a3a1a',
                  borderRadius: 10, color: 'var(--green)',
                  fontSize: 26, fontWeight: 900, textAlign: 'right',
                  outline: 'none', fontFamily: 'monospace',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--green)'}
                onBlur={e => e.target.style.borderColor = '#1a3a1a'}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 7 }}>
              Nota / Motivo <span style={{ color: 'var(--bg-elevated)', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px',
                background: 'var(--bg-base)', border: '1px solid #1a3a1a',
                borderRadius: 10, color: 'var(--text-primary)',
                fontSize: 13, fontWeight: 500, outline: 'none',
              }}
              placeholder="Ej: Cajero sin fondos, reposición bodega..."
              maxLength={120}
            />
          </div>

          {/* Admin info */}
          <div style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'right' }}>
            Autorizado por: <span style={{ color: 'var(--green)', fontWeight: 700 }}>{adminName}</span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || !amount}
              style={{
                flex: 2, padding: '12px 0', borderRadius: 10, border: 'none',
                background: amount && !loading ? 'linear-gradient(135deg, var(--green-dark), var(--green))' : 'var(--bg-elevated)',
                color: amount && !loading ? 'var(--green-bg)' : '#374151',
                fontWeight: 900, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: amount && !loading ? '0 4px 16px rgba(34,197,94,0.3)' : 'none',
                transition: 'all 0.2s',
              }}>
              {loading ? 'Registrando...' : '💵 Confirmar Ingreso'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
