import React, { useState } from 'react';
import { Vault, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { toCents, fromCents } from '../lib/money.js';

const fmt = (n) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function AmountInput({ symbol, value, onChange, color }) {
  const format = (val) => {
    const raw = val.replace(/[^0-9.]/g, '');
    if ((raw.match(/\./g) || []).length > 1) return value;
    const [int, dec] = raw.split('.');
    const formatted = (int || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec !== undefined ? `${formatted}.${dec.slice(0, 2)}` : formatted;
  };

  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
        fontWeight: 800, color, fontSize: 13,
      }}>{symbol}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(format(e.target.value))}
        style={{
          width: '100%', paddingLeft: 42, paddingRight: 12, paddingTop: 12, paddingBottom: 12,
          background: 'var(--bg-card)', border: `2px solid var(--border)`,
          borderRadius: 10, color: 'var(--text-primary)',
          fontSize: 22, fontWeight: 900, textAlign: 'right',
          outline: 'none', fontFamily: 'monospace',
        }}
        onFocus={e => e.target.style.borderColor = color}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
        placeholder="0.00"
      />
    </div>
  );
}

const DESTINATIONS = ['Banco', 'Caja fuerte', 'Propietario', 'Otro'];

export default function VaultCloseModal({ isOpen, onClose, vault, onClosed, onDone }) {
  const [dopStr, setDopStr]       = useState('');
  const [usdStr, setUsdStr]       = useState('');
  const [eurStr, setEurStr]       = useState('');
  const [note, setNote]           = useState('');
  const [destination, setDest]    = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  if (!isOpen) return null;

  const parse = (s) => parseFloat((s || '0').replace(/,/g, '')) || 0;

  const dopCount = parse(dopStr);
  const usdCount = parse(usdStr);
  const eurCount = parse(eurStr);

  const expDOP = parseFloat(vault?.dop_balance || 0);
  const expUSD = parseFloat(vault?.usd_balance || 0);
  const expEUR = parseFloat(vault?.eur_balance || 0);

  const diffDOP = dopCount - expDOP;
  const diffUSD = usdCount - expUSD;
  const diffEUR = eurCount - expEUR;

  const hasDiff = diffDOP !== 0 || diffUSD !== 0 || diffEUR !== 0;

  const diffColor = (d) => d === 0 ? 'var(--text-muted)' : d > 0 ? 'var(--green)' : 'var(--red)';
  const diffLabel = (d) => d === 0 ? '✓ Cuadrado' : d > 0 ? `+${fmt(d)} sobrante` : `${fmt(d)} faltante`;

  const handleClose = async () => {
    if (!destination) { setError('Selecciona el destino del efectivo'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.closeVault(dopCount, usdCount, eurCount, note.trim() || undefined, destination);
      setResult(res);
      onClosed(res.vault);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleDone = () => {
    setResult(null);
    setDopStr(''); setUsdStr(''); setEurStr('');
    setNote(''); setError(''); setDest('');
    if (onDone) onDone(); else onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 20, width: '100%', maxWidth: 440,
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--gold-bg), var(--bg-elevated))',
          borderBottom: '1px solid var(--border)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(212,168,67,0.35)',
            }}>
              <Vault size={22} color="var(--bg-base)" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold-light)' }}>Cierre de Bodega</div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>Cuadre físico del efectivo</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}>
            <X size={18} />
          </button>
        </div>

        {result ? (
          // ── Result screen ──
          <div style={{ padding: 24 }} id="vault-close-receipt">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <CheckCircle size={48} color="var(--green)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Cierre de Bodega</div>
              <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>
                {new Date().toLocaleString('es-DO', { dateStyle: 'full', timeStyle: 'short' })}
              </div>
              {result.destination && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                  background: 'var(--gold-bg)', border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'var(--gold)',
                }}>
                  🏦 Destino: {result.destination}
                </div>
              )}
            </div>

            {[
              { label: 'DOP', exp: result.expected.dop, cnt: result.counted.dop, diff: result.diff.dop, sym: 'RD$', color: 'var(--gold)' },
              { label: 'USD', exp: result.expected.usd, cnt: result.counted.usd, diff: result.diff.usd, sym: '$',   color: 'var(--green)' },
              { label: 'EUR', exp: result.expected.eur, cnt: result.counted.eur, diff: result.diff.eur, sym: '€',   color: 'var(--blue)' },
            ].map(({ label, exp, cnt, diff, sym, color }) => (
              <div key={label} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    background: diff === 0 ? 'var(--green-bg)' : diff > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: diff === 0 ? 'var(--green)' : diff > 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {diff === 0 ? '✓ CUADRADO' : diff > 0 ? `+${fmt(Math.abs(diff))} SOBRANTE` : `${fmt(Math.abs(diff))} FALTANTE`}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'var(--text-subtle)' }}>
                  <div>Esperado: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{sym} {fmt(exp)}</span></div>
                  <div>Contado: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{sym} {fmt(cnt)}</span></div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={handlePrint} style={{
                flex: 1, height: 46, borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--text-muted)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                🖨 Imprimir
              </button>
              <button onClick={handleDone} style={{
                flex: 2, height: 46, borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                color: 'var(--bg-base)', fontWeight: 900, fontSize: 14, cursor: 'pointer',
              }}>
                ✓ Listo
              </button>
            </div>
          </div>
        ) : (
          // ── Entry screen ──
          <div style={{ padding: 24 }}>
            {/* Current system balance */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-subtle)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                Saldo sistema (bodega)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'DOP', value: expDOP, sym: 'RD$', color: 'var(--gold)' },
                  { label: 'USD', value: expUSD, sym: '$',   color: 'var(--green)' },
                  { label: 'EUR', value: expEUR, sym: '€',   color: 'var(--blue)' },
                ].map(({ label, value, sym, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-subtle)', letterSpacing: 1 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color, marginTop: 2 }}>{sym} {fmt(value)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* DOP */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                DOP — Conteo físico
              </label>
              <AmountInput symbol="RD$" value={dopStr} onChange={setDopStr} color="var(--gold)" />
              {dopStr && (
                <div style={{ fontSize: 11, color: diffColor(diffDOP), marginTop: 4, textAlign: 'right', fontWeight: 700 }}>
                  {diffLabel(diffDOP)}
                </div>
              )}
            </div>

            {/* USD */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--green)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                USD — Conteo físico
              </label>
              <AmountInput symbol="$" value={usdStr} onChange={setUsdStr} color="var(--green)" />
              {usdStr && (
                <div style={{ fontSize: 11, color: diffColor(diffUSD), marginTop: 4, textAlign: 'right', fontWeight: 700 }}>
                  {diffLabel(diffUSD)}
                </div>
              )}
            </div>

            {/* EUR */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--blue)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                EUR — Conteo físico
              </label>
              <AmountInput symbol="€" value={eurStr} onChange={setEurStr} color="var(--blue)" />
              {eurStr && (
                <div style={{ fontSize: 11, color: diffColor(diffEUR), marginTop: 4, textAlign: 'right', fontWeight: 700 }}>
                  {diffLabel(diffEUR)}
                </div>
              )}
            </div>

            {/* Warning if discrepancy */}
            {hasDiff && (dopStr || usdStr || eurStr) && (
              <div style={{
                background: 'var(--red-bg)', border: '1px solid var(--red-border)',
                borderRadius: 8, padding: '8px 12px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--red)',
              }}>
                <AlertTriangle size={14} />
                Hay diferencia. El sistema ajustará el saldo al conteo físico.
              </div>
            )}

            {/* Destination */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                Destino del efectivo <span style={{ color: 'var(--red)', letterSpacing: 0 }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DESTINATIONS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDest(d)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      border: `2px solid ${destination === d ? 'var(--gold)' : 'var(--border)'}`,
                      background: destination === d ? 'var(--gold-bg)' : 'var(--bg-card)',
                      color: destination === d ? 'var(--gold)' : 'var(--text-subtle)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {d === 'Banco' ? '🏦' : d === 'Caja fuerte' ? '🔐' : d === 'Propietario' ? '👤' : '📦'} {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                Nota <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--border)' }}>(opcional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                }}
                placeholder="Observaciones del cierre..."
                maxLength={200}
              />
            </div>

            {error && (
              <div style={{ color: 'var(--red)', fontSize: 12, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{
                flex: 1, height: 46, borderRadius: 10,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={loading || (!dopStr && !usdStr && !eurStr) || !destination}
                style={{
                  flex: 2, height: 46, borderRadius: 10, border: 'none',
                  background: (!loading && (dopStr || usdStr || eurStr) && destination)
                    ? 'linear-gradient(135deg, var(--gold), var(--gold-light))'
                    : 'var(--bg-elevated)',
                  color: (!loading && (dopStr || usdStr || eurStr) && destination) ? 'var(--bg-base)' : '#374151',
                  fontWeight: 900, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {loading ? 'Cerrando...' : '🔒 Cerrar Bodega'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
