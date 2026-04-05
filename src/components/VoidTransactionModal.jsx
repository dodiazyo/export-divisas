import React, { useState } from 'react';
import { api } from '../lib/api';

export default function VoidTransactionModal({ transaction, onClose, onVoided }) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!transaction) return null;

  const tx = transaction;
  const isExchange = tx.type === 'exchange';

  async function handleVoid(e) {
    e.preventDefault();
    if (!pin || !reason.trim()) return;
    setLoading(true); setError('');
    try {
      await api.voidTransaction(tx.id, pin, reason);
      onVoided();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--red-border)',
        borderRadius: 16, width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.2)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--red-bg)', border: '1px solid var(--red-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🚫</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>Anular Transacción</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Acción irreversible — requiere PIN de administrador</div>
          </div>
        </div>

        {/* Detalle de la transacción */}
        <div style={{ padding: '16px 24px', background: 'var(--bg-card)', margin: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
            Transacción a anular
          </div>
          {isExchange ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                Cambio {tx.data?.currency} — {tx.data?.amount?.toLocaleString()} {tx.data?.currency}
              </div>
              <div style={{ fontSize: 13, color: 'var(--gold)' }}>
                RD$ {tx.data?.dopAmount?.toLocaleString()} a tasa {tx.data?.rate}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                Venta externa — RD$ {tx.data?.total?.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {tx.data?.items?.length || 0} artículo(s)
              </div>
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 6 }}>
            {new Date(tx.date).toLocaleString('es-DO')}
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleVoid} style={{ padding: '0 24px 24px' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
              Motivo de la anulación *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="Ej: Error en el monto, cliente se arrepintió..."
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, resize: 'none', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
              Tu PIN de administrador *
            </label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••••"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 18, letterSpacing: 6,
                textAlign: 'center', outline: 'none', fontFamily: 'monospace',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              borderRadius: 8, padding: '8px 12px', marginBottom: 12,
              color: 'var(--red)', fontSize: 13, fontWeight: 600,
            }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || !pin || !reason.trim()}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 8,
                background: pin && reason.trim() && !loading ? '#7f1d1d' : '#1a1a1a',
                border: '1px solid var(--red-border)',
                color: pin && reason.trim() && !loading ? 'var(--red)' : '#374151',
                fontWeight: 800, fontSize: 13, cursor: 'pointer',
              }}>
              {loading ? 'Anulando...' : '🚫 Confirmar Anulación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
