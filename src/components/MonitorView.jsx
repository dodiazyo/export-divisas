import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Activity, AlertCircle, Loader2, PlusCircle, TrendingUp, Clock, Zap, Banknote } from 'lucide-react';
import { api } from '../lib/api';

// ── helpers ──────────────────────────────────────────────────────────────────
function calcDOP(sd) {
  const injDOP = (sd.injections || [])
    .filter(i => i.currency === 'DOP')
    .reduce((s, i) => s + (i.amount || 0), 0);
  const cashIns = sd.cashInsTotal || 0;
  return (sd.startAmount || 0) + injDOP + cashIns + (sd.externalSalesTotal || 0) - (sd.currencyPayouts || 0);
}

function elapsed(startTime) {
  const ms = Date.now() - new Date(startTime).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function pct(used, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

// ── bar component ─────────────────────────────────────────────────────────────
function BalanceBar({ used, total, colorUsed = 'var(--red)', colorFree = 'var(--green)' }) {
  const p = pct(used, total);
  return (
    <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden', margin: '4px 0 2px' }}>
      <div style={{ width: `${p}%`, height: '100%', background: colorUsed, borderRadius: 99, transition: 'width 0.5s ease' }} />
    </div>
  );
}

// ── stat pill ─────────────────────────────────────────────────────────────────
function Stat({ label, value, color = 'var(--text-primary)', sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, color: 'var(--text-subtle)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>{sub}</span>}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function MonitorView({ onOpenInjection, onOpenCashIn }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tick, setTick] = useState(0); // forces re-render for elapsed timers

  const fetchShifts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getActiveShifts();
      setShifts(data || []);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      setError('No se pudo cargar las cajas. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
    const dataInterval = setInterval(() => fetchShifts(true), 8_000);
    const tickInterval = setInterval(() => setTick(t => t + 1), 30_000); // refresh elapsed timers
    return () => { clearInterval(dataInterval); clearInterval(tickInterval); };
  }, [fetchShifts]);

  // ── totals across all open shifts ───────────────────────────────────────────
  const totals = shifts.reduce((acc, s) => {
    const sd = s.data || {};
    acc.dop  += calcDOP(sd);
    acc.usd  += sd.usdOnHand  || 0;
    acc.eur  += sd.eurOnHand  || 0;
    acc.gain += sd.totalGain  || 0;
    acc.ops  += sd.transactions || 0;
    return acc;
  }, { dop: 0, usd: 0, eur: 0, gain: 0, ops: 0 });

  // ── loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-subtle)' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Cargando monitor...</span>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── header ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <Activity size={22} color="var(--gold)" />
              Monitor de Cajas
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                background: shifts.length > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                color: shifts.length > 0 ? 'var(--green)' : 'var(--red)',
                border: `1px solid ${shifts.length > 0 ? '#16a34a40' : 'var(--red-border)'}`,
                borderRadius: 99, padding: '3px 10px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: shifts.length > 0 ? 'var(--green)' : 'var(--red)', boxShadow: shifts.length > 0 ? '0 0 6px var(--green)' : 'none', animation: shifts.length > 0 ? 'pulse 2s infinite' : 'none' }} />
                {shifts.length} {shifts.length === 1 ? 'caja activa' : 'cajas activas'}
              </span>
            </h1>
            {lastUpdate && (
              <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Zap size={10} color="var(--gold)" />
                Actualizado: {lastUpdate.toLocaleTimeString('es-DO')} · refresca cada 8s
              </p>
            )}
          </div>
          <button
            onClick={() => fetchShifts()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={14} /> Refrescar
          </button>
        </div>

        {/* ── error banner ─────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: 'var(--red-bg)', border: '1px solid var(--red-border)',
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red)', fontSize: 13, fontWeight: 600,
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* ── summary bar (only when shifts > 0) ───────────────────────────── */}
        {shifts.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {[
              { label: 'DOP Total', value: `RD$ ${totals.dop.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'var(--gold)', border: 'var(--gold-bg)' },
              { label: 'USD Total', value: `$ ${totals.usd.toLocaleString()}`, color: 'var(--green)', border: 'var(--green-bg)' },
              { label: 'EUR Total', value: `€ ${totals.eur.toLocaleString()}`, color: 'var(--blue)', border: '#0d1a35' },
              { label: 'Ganancia Est.', value: `RD$ ${totals.gain.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#f59e0b', border: 'var(--gold-bg)' },
              { label: 'Operaciones', value: totals.ops, color: 'var(--purple)', border: '#1e1040' },
            ].map(({ label, value, color, border }, i) => (
              <div key={label} style={{
                padding: '14px 16px', textAlign: 'center',
                borderRight: i < 4 ? '1px solid var(--border-light)' : 'none',
                background: border,
              }}>
                <div style={{ fontSize: 9, color: 'var(--text-subtle)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── empty state ───────────────────────────────────────────────────── */}
        {shifts.length === 0 && !error && (
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
            borderRadius: 16, padding: '60px 24px', textAlign: 'center',
          }}>
            <Activity size={48} color="var(--border-light)" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-faint)', margin: '0 0 8px' }}>No hay cajas abiertas</p>
            <p style={{ fontSize: 13, color: 'var(--border-light)' }}>Cuando un cajero abra su turno aparecerá aquí.</p>
          </div>
        )}

        {/* ── shift cards ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {shifts.map(shift => {
            const sd = shift.data || {};
            const dopAvail   = calcDOP(sd);
            const dopTotal   = (sd.startAmount || 0) + (sd.injections || []).filter(i => i.currency === 'DOP').reduce((s, i) => s + (i.amount || 0), 0);
            const dopUsedPct = pct(sd.currencyPayouts || 0, dopTotal);
            const usd = sd.usdOnHand || 0;
            const eur = sd.eurOnHand || 0;
            const gain = sd.totalGain || 0;
            const ops  = sd.transactions || 0;
            const injections = (sd.injections || []);

            return (
              <div key={shift.id} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                display: 'flex', flexDirection: 'column',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#d4a84350'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(212,168,67,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)'; }}
              >
                {/* Card header */}
                <div style={{
                  padding: '14px 16px',
                  background: 'linear-gradient(135deg, var(--gold-bg), var(--bg-surface))',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 18, color: 'var(--bg-base)',
                  }}>
                    {(shift.user_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {shift.user_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={9} /> {elapsed(shift.start_time)}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>·</span>
                      <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>Caja #{shift.id}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', letterSpacing: 1 }}>ACTIVA</span>
                  </div>
                </div>

                {/* Balances */}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* DOP with bar */}
                  <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-subtle)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>DOP Disponible</span>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{dopUsedPct}% usado</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>
                      RD$ {dopAvail.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <BalanceBar used={sd.currencyPayouts || 0} total={dopTotal} colorUsed="var(--gold)" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>Capital total: RD$ {dopTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>Pagado: RD$ {(sd.currencyPayouts || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>

                  {/* USD + EUR row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#021a0e', border: '1px solid var(--green-bg)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, color: 'var(--green-dark)', fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>USD en caja</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--green)' }}>
                        ${usd.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--green-bg)', marginTop: 2 }}>
                        inicio: ${(sd.usdStartAmount || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ background: '#020e1a', border: '1px solid #0d1a35', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, color: '#1d4ed8', fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>EUR en caja</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--blue)' }}>
                        €{eur.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 9, color: '#0d1a35', marginTop: 2 }}>
                        inicio: €{(sd.eurStartAmount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Gain + Ops */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-subtle)', fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TrendingUp size={9} /> Ganancia Est.
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#f59e0b' }}>
                        RD$ {gain.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-subtle)', fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>
                        Operaciones
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--purple)' }}>
                        {ops}
                      </div>
                    </div>
                  </div>

                  {/* Ingresos de Efectivo */}
                  {(sd.cashIns || []).length > 0 && (
                    <div style={{ background: '#021a0a', border: '1px solid #1a3a1a', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 9, color: 'var(--green-dark)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Banknote size={9} /> Ingresos Efectivo ({(sd.cashIns || []).length}) · RD$ {(sd.cashInsTotal || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 80, overflowY: 'auto' }}>
                        {(sd.cashIns || []).slice().reverse().map((ci, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                              {ci.adminName || 'Admin'} — {new Date(ci.date).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                              {ci.note ? ` · ${ci.note}` : ''}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)', flexShrink: 0, marginLeft: 8 }}>
                              +RD$ {(ci.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inyecciones USD/EUR */}
                  {injections.filter(i => i.currency !== 'DOP').length > 0 && (
                    <div style={{ background: 'var(--bg-base)', border: '1px solid #1e1040', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 9, color: '#6d28d9', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                        Inyecciones capital ({injections.filter(i => i.currency !== 'DOP').length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 80, overflowY: 'auto' }}>
                        {injections.filter(i => i.currency !== 'DOP').slice().reverse().map((inj, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                              {inj.adminName || 'Admin'} — {new Date(inj.date).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--purple)' }}>
                              {inj.currency === 'USD' ? '$' : '€'} {(inj.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ padding: '0 16px 16px' }}>
                  <button
                    onClick={() => onOpenInjection && onOpenInjection(shift.id)}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 10,
                      border: '1px solid rgba(212,168,67,0.3)',
                      background: 'var(--gold-bg)',
                      color: 'var(--gold)', fontWeight: 700, fontSize: 13,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      gap: 10, transition: 'opacity 0.15s', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <PlusCircle size={16} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>Enviar dinero a esta caja</div>
                      <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>RD$ · USD · EUR</div>
                    </div>
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
