import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, FileText, Loader2, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../lib/api';
import VoidTransactionModal from './VoidTransactionModal';

const TYPE_META = {
  exchange:      { label: 'Cambio',       color: 'var(--green)',  bg: 'var(--green-bg)',  icon: '💱' },
  external_sale: { label: 'Venta',        color: 'var(--blue)',   bg: 'var(--blue-bg)',   icon: '🛒' },
  cash_in:       { label: 'Ingreso',      color: 'var(--gold)',   bg: 'var(--gold-bg)',   icon: '💵' },
  injection:     { label: 'Inyección',    color: 'var(--purple)', bg: '#160d2e',          icon: '💉' },
};
const getMeta = (type) => TYPE_META[type] || { label: type, color: 'var(--text-muted)', bg: 'var(--bg-card)', icon: '•' };

const fmt = (n) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReportsView() {
  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [to, setTo] = useState(today);
  const [typeFilter, setTypeFilter] = useState('all');

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voidingTx, setVoidingTx] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Send full day for `to`
      const data = await api.getTransactions(from, to + 'T23:59:59');
      const formatted = data.map(d => ({ id: d.id, shiftId: d.shift_id, type: d.type, date: d.date, data: d.data, ...d.data }));
      setTransactions(formatted);
    } catch (err) {
      alert('Error cargando transacciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [from, to]);

  // Type counts for filter pills
  const typeCounts = useMemo(() => {
    const counts = { all: transactions.length };
    transactions.forEach(t => { counts[t.type] = (counts[t.type] || 0) + 1; });
    return counts;
  }, [transactions]);

  const filtered = useMemo(() => {
    const list = typeFilter === 'all' ? transactions : transactions.filter(t => t.type === typeFilter);
    return list;
  }, [transactions, typeFilter]);

  // KPIs — only from non-voided exchange transactions
  const exchanges = useMemo(() => filtered.filter(t => t.type === 'exchange' && !t.voided), [filtered]);
  const sales = useMemo(() => filtered.filter(t => t.type === 'external_sale' && !t.voided), [filtered]);

  const kpis = [
    { label: 'Cambios USD', value: `$${exchanges.filter(t=>t.currency==='USD').reduce((s,t)=>s+(t.amount||0),0).toLocaleString('es-DO')}`, color: 'var(--green)', bg: 'var(--green-bg)', border: '#16a34a30' },
    { label: 'Cambios EUR', value: `€${exchanges.filter(t=>t.currency==='EUR').reduce((s,t)=>s+(t.amount||0),0).toLocaleString('es-DO')}`, color: 'var(--blue)', bg: 'var(--blue-bg)', border: '#1e40af30' },
    { label: 'Ventas DOP', value: `RD$ ${sales.reduce((s,t)=>s+(t.total||0),0).toLocaleString('es-DO',{maximumFractionDigits:0})}`, color: 'var(--text-primary)', bg: 'var(--bg-card)', border: 'var(--border)' },
    { label: 'Ganancia Est.', value: `RD$ ${exchanges.reduce((s,t)=>s+(t.gain||0),0).toLocaleString('es-DO',{maximumFractionDigits:0})}`, color: 'var(--gold)', bg: 'var(--gold-bg)', border: 'rgba(212,168,67,0.2)' },
    { label: 'Operaciones', value: filtered.filter(t=>!t.voided).length, color: 'var(--purple)', bg: '#160d2e', border: '#4c1d9530' },
  ];

  // --- CSV export ---
  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha', 'Tipo', 'Cajero/Usuario', 'Detalle', 'Monto DOP', 'Estado'];
    const rows = filtered.map(t => {
      let detalle = '';
      let montoDOP = '';
      if (t.type === 'exchange') {
        detalle = `${t.currency} ${t.amount} @ ${t.rate}`;
        montoDOP = t.dopAmount || 0;
      } else if (t.type === 'external_sale') {
        detalle = (t.items || []).map(i => `${i.concept} x${i.qty}`).join('; ');
        montoDOP = t.total || 0;
      }
      return [t.id, new Date(t.date).toLocaleString('es-DO'), getMeta(t.type).label, t.cashier || t.adminName || '', detalle, montoDOP, t.voided ? 'ANULADA' : 'Activa'];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `informe_${from}_${to}.csv`;
    a.click();
  };

  // --- PDF export ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Informe de Transacciones', 14, 16);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Período: ${from} al ${to}`, 14, 22);
    doc.text(`Generado: ${new Date().toLocaleString('es-DO')}`, 14, 27);

    const body = filtered.map(t => {
      let detalle = '';
      let monto = '';
      if (t.type === 'exchange') { detalle = `${t.currency} ${t.amount} @ ${t.rate?.toFixed(2)}`; monto = `RD$ ${fmt(t.dopAmount)}`; }
      else if (t.type === 'external_sale') { detalle = (t.items||[]).map(i=>`${i.concept} x${i.qty}`).join(', '); monto = `RD$ ${fmt(t.total)}`; }
      return [
        new Date(t.date).toLocaleDateString('es-DO'),
        getMeta(t.type).label,
        t.cashier || t.adminName || '—',
        detalle,
        monto,
        t.voided ? 'ANULADA' : '✓',
      ];
    });

    autoTable(doc, {
      startY: 33,
      head: [['Fecha', 'Tipo', 'Cajero', 'Detalle', 'Monto', 'Estado']],
      body,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'center' } },
    });

    doc.save(`informe_${from}_${to}.pdf`);
  };

  const inputStyle = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '6px 12px', color: 'var(--text-primary)',
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
  };

  const availableTypes = useMemo(() => Object.keys(typeCounts).filter(k => k !== 'all'), [typeCounts]);

  return (
    <>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Informe de Transacciones</h1>
        <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Cambios de divisa, ventas e ingresos del período</p>
      </div>

      {/* Toolbar */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Calendar size={16} color="var(--text-subtle)" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
          <span style={{ color: 'var(--text-subtle)', fontSize: 13 }}>—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
          <button onClick={fetchTransactions} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportCSV} disabled={filtered.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', color: filtered.length > 0 ? 'var(--text-muted)' : 'var(--text-faint)', fontSize: 13, fontWeight: 700 }}>
            <Download size={14} /> CSV
          </button>
          <button onClick={handleExportPDF} disabled={filtered.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', background: filtered.length > 0 ? 'var(--red-bg)' : 'var(--bg-card)', border: `1px solid ${filtered.length > 0 ? 'var(--red-border)' : 'var(--border)'}`, color: filtered.length > 0 ? 'var(--red)' : 'var(--text-faint)', fontSize: 13, fontWeight: 700 }}>
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', ...availableTypes].map(type => {
          const active = typeFilter === type;
          const meta = type === 'all' ? { label: 'Todos', color: 'var(--text-primary)', bg: 'var(--bg-elevated)' } : getMeta(type);
          return (
            <button key={type} onClick={() => setTypeFilter(type)} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: active ? meta.bg : 'var(--bg-card)',
              color: active ? meta.color : 'var(--text-subtle)',
              fontWeight: active ? 800 : 500, fontSize: 12,
              outline: active ? `1px solid ${meta.color}40` : 'none',
              transition: 'all 0.15s',
            }}>
              {type !== 'all' && <span style={{ marginRight: 4 }}>{getMeta(type).icon}</span>}
              {meta.label} <span style={{ opacity: 0.7 }}>({typeCounts[type] || 0})</span>
            </button>
          );
        })}
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-subtle)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--text-subtle)', gap: 10 }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Cargando...
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                  {['Fecha y Hora', 'Tipo', 'Cajero', 'Detalle', 'Monto', 'Acción'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: i >= 4 ? 'right' : i === 5 ? 'center' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: 50, textAlign: 'center', color: 'var(--text-subtle)', fontSize: 13 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                      No hay transacciones en este período
                    </td>
                  </tr>
                ) : filtered.map(t => {
                  const meta = getMeta(t.type);
                  let detalle = '—';
                  let monto = '—';
                  let montoColor = 'var(--text-primary)';

                  if (t.type === 'exchange') {
                    const sym = t.currency === 'EUR' ? '€' : '$';
                    detalle = `${sym}${(t.amount||0).toLocaleString('es-DO')} @ ${t.rate?.toFixed(2)} · RD$${(t.dopAmount||0).toLocaleString('es-DO')}`;
                    monto = `${sym}${(t.amount||0).toLocaleString('es-DO')}`;
                    montoColor = t.currency === 'EUR' ? 'var(--blue)' : 'var(--green)';
                  } else if (t.type === 'external_sale') {
                    detalle = (t.items || []).map(i => `${i.concept} ×${i.qty}`).join(', ') || '—';
                    monto = `RD$ ${(t.total||0).toLocaleString('es-DO')}`;
                    montoColor = 'var(--gold)';
                  } else if (t.type === 'cash_in') {
                    detalle = t.note || '—';
                    monto = `RD$ ${(t.amount||0).toLocaleString('es-DO')}`;
                    montoColor = 'var(--gold)';
                  }

                  return (
                    <tr key={t.id}
                      style={{ borderBottom: '1px solid var(--border)', background: t.voided ? 'var(--red-bg)' : 'transparent', opacity: t.voided ? 0.65 : 1, transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!t.voided) e.currentTarget.style.background = 'var(--bg-card)'; }}
                      onMouseLeave={e => { if (!t.voided) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(t.date).toLocaleDateString('es-DO')}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{new Date(t.date).toLocaleTimeString('es-DO')}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {t.cashier || t.adminName || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-subtle)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.voided ? <span style={{ color: 'var(--red)', fontWeight: 700 }}>🚫 ANULADA — {t.voidReason}</span> : detalle}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, fontFamily: 'monospace', fontSize: 14, color: t.voided ? 'var(--text-subtle)' : montoColor, textDecoration: t.voided ? 'line-through' : 'none', whiteSpace: 'nowrap' }}>
                        {monto}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {t.voided ? null : (
                          <button
                            onClick={() => setVoidingTx({ id: t.id, type: t.type, date: t.date, data: t.data })}
                            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)', cursor: 'pointer' }}
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
              <span>{filtered.filter(t => t.voided).length} anulada{filtered.filter(t=>t.voided).length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>

    <VoidTransactionModal
      transaction={voidingTx}
      onClose={() => setVoidingTx(null)}
      onVoided={() => { setVoidingTx(null); fetchTransactions(); }}
    />
    </>
  );
}
