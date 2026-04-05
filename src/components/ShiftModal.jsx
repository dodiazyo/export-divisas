import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Lock, Save, AlertTriangle, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { sumBills, subtract } from '../lib/money.js';

const DENOMS_DOP = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1];
const DENOMS_USD = [100, 50, 20, 10, 5, 1];

function BillBreakdown({ currency, breakdown, onChange, onKeyDown, refs, color = 'slate' }) {
  const denoms = currency === 'DOP' ? DENOMS_DOP : DENOMS_USD;
  const symbol = currency === 'DOP' ? 'RD$' : '$';
  const borderActive = color === 'green' ? 'border-green-500' : 'border-blue-500';
  const labelColor  = color === 'green' ? 'text-green-600' : 'text-slate-400';

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {denoms.map(d => (
        <div
          key={`${currency}-${d}`}
          className={`flex items-center gap-2 bg-white dark:bg-gray-800 px-2 py-1.5 rounded-lg border transition-all ${
            (parseInt(breakdown[d]) || 0) > 0
              ? `${borderActive} shadow-sm`
              : 'border-slate-200 dark:border-gray-700'
          }`}
        >
          <span className={`text-xs font-black w-14 shrink-0 ${labelColor} dark:text-gray-400`}>
            {symbol}{d.toLocaleString()}
          </span>
          <input
            ref={el => { if (refs) refs.current[`${currency}-${d}`] = el; }}
            type="text"
            inputMode="numeric"
            value={breakdown[d] || ''}
            onChange={e => onChange(currency, d, e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={e => onKeyDown && onKeyDown(e, currency, d)}
            onFocus={e => e.target.select()}
            className="w-full text-right font-black text-slate-800 dark:text-gray-100 outline-none bg-transparent text-sm"
            placeholder="0"
          />
          {(parseInt(breakdown[d]) || 0) > 0 && (
            <span className="text-[10px] text-slate-400 dark:text-gray-500 shrink-0 font-mono">
              ={symbol}{(d * parseInt(breakdown[d])).toLocaleString()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ShiftModal({
  isOpen, mode, onClose, onConfirm, onSkip,
  currentShift, showCurrencyInput, canSkip = true,
  userRole = 'currency_agent',
}) {
  const isAdmin = userRole === 'admin' || userRole === 'it';
  // ── Opening steps: 1 = admin assigns, 2 = cashier confirms ──
  const [openStep, setOpenStep] = useState(1);

  // Admin side (step 1)
  const [adminDopBreakdown, setAdminDopBreakdown] = useState({});
  const [adminUsdBreakdown, setAdminUsdBreakdown] = useState({});

  // Cashier side (step 2 / close)
  const [cashierDopBreakdown, setCashierDopBreakdown] = useState({});
  const [cashierUsdBreakdown, setCashierUsdBreakdown] = useState({});

  // For closing: plain text inputs (legacy compat)
  const [amount, setAmount]       = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [difference, setDifference]       = useState(null);
  const [usdDifference, setUsdDifference] = useState(null);

  const adminRefs   = useRef({});
  const cashierRefs = useRef({});

  const emptyDop = () => DENOMS_DOP.reduce((a, d) => ({ ...a, [d]: '' }), {});
  const emptyUsd = () => DENOMS_USD.reduce((a, d) => ({ ...a, [d]: '' }), {});

  useEffect(() => {
    if (isOpen) {
      setOpenStep(1);
      setAdminDopBreakdown(emptyDop());
      setAdminUsdBreakdown(emptyUsd());
      setCashierDopBreakdown(emptyDop());
      setCashierUsdBreakdown(emptyUsd());
      setAmount('');
      setUsdAmount('');
      setDifference(null);
      setUsdDifference(null);
    }
  }, [isOpen]);

  // Focus first input when step changes
  useEffect(() => {
    if (!isOpen || mode === 'close') return;
    const refs   = openStep === 1 ? adminRefs : cashierRefs;
    const target = refs.current[`DOP-${DENOMS_DOP[0]}`];
    if (target) setTimeout(() => { target.focus(); target.select(); }, 80);
  }, [openStep, isOpen, mode]);

  // ── Helpers ──────────────────────────────────────────────────
  const formatNumber = (val) => {
    if (!val) return '';
    const raw = val.replace(/,/g, '');
    if (isNaN(raw)) return val;
    const parts = raw.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const parseNumber = (val) => (val || '').replace(/,/g, '');

  const getExpectedDOP = (shift) => {
    if (!shift) return 0;
    const injected = (shift.injections || [])
      .filter(i => i.currency === 'DOP')
      .reduce((s, i) => s + i.amount, 0);
    return (shift.startAmount || 0) + injected
      + (shift.externalSalesTotal || 0)
      - (shift.currencyPayouts || 0);
  };

  // ── Opening: bill count change ────────────────────────────────
  const handleOpenBillChange = (side, currency, denom, qty) => {
    const isAdmin   = side === 'admin';
    const breakdown = isAdmin
      ? (currency === 'DOP' ? adminDopBreakdown  : adminUsdBreakdown)
      : (currency === 'DOP' ? cashierDopBreakdown : cashierUsdBreakdown);
    const setter = isAdmin
      ? (currency === 'DOP' ? setAdminDopBreakdown  : setAdminUsdBreakdown)
      : (currency === 'DOP' ? setCashierDopBreakdown : setCashierUsdBreakdown);

    setter({ ...breakdown, [denom]: qty });
  };

  const handleKeyDown = (e, currency, denom, side = 'cashier') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const denoms = currency === 'DOP' ? DENOMS_DOP : DENOMS_USD;
      const idx    = denoms.indexOf(denom);
      const refs   = side === 'admin' ? adminRefs : cashierRefs;
      if (idx < denoms.length - 1) {
        const next = denoms[idx + 1];
        refs.current[`${currency}-${next}`]?.focus();
      }
    }
  };

  // ── Closing: amount change ────────────────────────────────────
  const handleCountChange = (currency, denom, qtyRaw) => {
    const qty = qtyRaw.replace(/[^0-9]/g, '');
    const isDOP = currency === 'DOP';
    const setter = isDOP ? setCashierDopBreakdown : setCashierUsdBreakdown;
    const current = isDOP ? cashierDopBreakdown : cashierUsdBreakdown;
    const updated = { ...current, [denom]: qty };
    setter(updated);
    const total = sumBills(updated);
    if (isDOP) {
      setAmount(formatNumber(total.toString()));
      calcCloseDiff(total.toString(), parseNumber(usdAmount));
    } else {
      setUsdAmount(formatNumber(total.toString()));
      calcCloseDiff(parseNumber(amount), total.toString());
    }
  };

  const handleAmountChange = (valRaw) => {
    let val = valRaw.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) return;
    setAmount(formatNumber(val));
    calcCloseDiff(val, parseNumber(usdAmount));
  };

  const handleUsdAmountChange = (valRaw) => {
    let val = valRaw.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) return;
    setUsdAmount(formatNumber(val));
    calcCloseDiff(parseNumber(amount), val);
  };

  const calcCloseDiff = (dopVal, usdVal) => {
    if (mode === 'close' && currentShift) {
      setDifference(dopVal ? subtract(parseFloat(dopVal), getExpectedDOP(currentShift)) : null);
      if (showCurrencyInput)
        setUsdDifference(usdVal ? subtract(parseFloat(usdVal), currentShift.usdOnHand || 0) : null);
    }
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === 'open') {
      // Step 1 → 2: pre-llenar cajero con los valores del admin
      if (openStep === 1) {
        const adminTotal = sumBills(adminDopBreakdown);
        if (adminTotal <= 0) { alert('Ingrese al menos un billete para continuar.'); return; }
        // El cajero parte de los mismos montos — solo corrige si hay diferencia
        setCashierDopBreakdown({ ...adminDopBreakdown });
        setCashierUsdBreakdown({ ...adminUsdBreakdown });
        setOpenStep(2);
        return;
      }

      // Step 2 → confirm
      const adminDop     = sumBills(adminDopBreakdown);
      const cashierDop   = sumBills(cashierDopBreakdown);
      const adminUsd     = sumBills(adminUsdBreakdown);
      const cashierUsd   = sumBills(cashierUsdBreakdown);

      // Requerir confirmación solo de las monedas que el admin asignó
      const requiereDOP = adminDop > 0;
      const requiereUSD = adminUsd > 0;
      if (requiereDOP && cashierDop <= 0) { alert('Debes confirmar los billetes en pesos (DOP).'); return; }
      if (requiereUSD && cashierUsd <= 0) { alert('Debes confirmar los billetes en dólares (USD).'); return; }
      if (!requiereDOP && !requiereUSD)   { alert('El admin debe asignar fondos primero.'); return; }

      onConfirm(cashierDop, cashierUsd, cashierDopBreakdown, cashierUsdBreakdown, {
        adminDopBreakdown, adminUsdBreakdown,
        adminDopTotal: adminDop, adminUsdTotal: adminUsd,
        cashierDopTotal: cashierDop, cashierUsdTotal: cashierUsd,
        dopDifference: subtract(cashierDop, adminDop),
        usdDifference: subtract(cashierUsd, adminUsd),
      });
    } else {
      // Close
      if (!amount) return;
      const rawAmount = parseFloat(parseNumber(amount));
      const rawUsd    = usdAmount ? parseFloat(parseNumber(usdAmount)) : 0;
      if (rawAmount < 0 || rawUsd < 0) { alert('Los montos no pueden ser negativos.'); return; }

      // Si hay diferencia, pedir confirmación explícita
      const dopDiff = subtract(rawAmount, getExpectedDOP(currentShift));
      const usdDiff = showCurrencyInput ? subtract(rawUsd, currentShift?.usdOnHand || 0) : 0;
      const hasDiff = Math.abs(dopDiff) >= 0.01 || Math.abs(usdDiff) >= 0.01;

      if (hasDiff) {
        const lines = [];
        if (Math.abs(dopDiff) >= 0.01)
          lines.push(`DOP: ${dopDiff > 0 ? 'SOBRA' : 'FALTA'} RD$ ${Math.abs(dopDiff).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
        if (showCurrencyInput && Math.abs(usdDiff) >= 0.01)
          lines.push(`USD: ${usdDiff > 0 ? 'SOBRA' : 'FALTA'} $ ${Math.abs(usdDiff).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);

        const confirmed = window.confirm(
          `⚠️ HAY DIFERENCIAS EN EL CONTEO:\n\n${lines.join('\n')}\n\n¿Desea cerrar el turno con estas diferencias?`
        );
        if (!confirmed) return;
      }

      onConfirm(rawAmount, rawUsd, cashierDopBreakdown, cashierUsdBreakdown);
    }
  };

  if (!isOpen) return null;

  const isClose     = mode === 'close';
  const expectedDOP = isClose ? getExpectedDOP(currentShift) : 0;
  const expectedUSD = isClose && currentShift ? (currentShift.usdOnHand || 0) : 0;
  const totalDOPInjected = isClose && currentShift
    ? (currentShift.injections || []).filter(i => i.currency === 'DOP').reduce((s, i) => s + i.amount, 0)
    : 0;

  // Opening computed totals
  const adminDopTotal   = sumBills(adminDopBreakdown);
  const adminUsdTotal   = sumBills(adminUsdBreakdown);
  const cashierDopTotal = sumBills(cashierDopBreakdown);
  const cashierUsdTotal = sumBills(cashierUsdBreakdown);
  const openDopDiff     = subtract(cashierDopTotal, adminDopTotal);
  const openUsdDiff     = subtract(cashierUsdTotal, adminUsdTotal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 my-8">

        {/* ── HEADER ── */}
        <div className={`px-6 py-5 text-center ${
          isClose ? 'bg-slate-900' :
          openStep === 1 ? 'bg-blue-700' : 'bg-emerald-700'
        } text-white`}>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            {isClose ? <Lock size={28} /> : openStep === 1 ? <DollarSign size={28} /> : <ShieldCheck size={28} />}
          </div>
          <h2 className="text-xl font-bold">
            {isClose ? 'Cierre de Caja' :
             openStep === 1 ? 'Asignación de Fondos (Admin)' : 'Confirmación del Cajero'}
          </h2>
          <p className="text-white/75 text-sm mt-1">
            {isClose ? 'Ingrese los montos finales en caja' :
             openStep === 1
               ? 'El administrador registra los billetes que entrega al cajero'
               : 'Verifica el conteo — corrige si hay diferencia'}
          </p>

          {/* Step indicator (open only) */}
          {!isClose && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className={`w-2.5 h-2.5 rounded-full ${openStep === 1 ? 'bg-white' : 'bg-white/30'}`} />
              <div className={`w-8 h-0.5 ${openStep === 2 ? 'bg-white' : 'bg-white/30'}`} />
              <div className={`w-2.5 h-2.5 rounded-full ${openStep === 2 ? 'bg-white' : 'bg-white/30'}`} />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

          {/* ════════════════════════════════════════════════
              OPENING — STEP 1: ADMIN ASSIGNS
          ════════════════════════════════════════════════ */}
          {!isClose && openStep === 1 && (
            <>
              {/* DOP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">
                    Pesos (DOP) — Billetes que entrega
                  </h4>
                  <span className="text-lg font-black text-blue-800 dark:text-blue-300">
                    RD$ {adminDopTotal.toLocaleString()}
                  </span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
                  <BillBreakdown
                    currency="DOP"
                    breakdown={adminDopBreakdown}
                    onChange={(cur, denom, qty) => handleOpenBillChange('admin', cur, denom, qty)}
                    onKeyDown={(e, cur, denom) => handleKeyDown(e, cur, denom, 'admin')}
                    refs={adminRefs}
                    color="blue"
                  />
                </div>
              </div>

              {/* USD */}
              {showCurrencyInput && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-green-700 uppercase tracking-widest">
                      Dólares (USD) — Billetes que entrega
                    </h4>
                    <span className="text-lg font-black text-green-700 dark:text-green-400">
                      $ {adminUsdTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-800">
                    <BillBreakdown
                      currency="USD"
                      breakdown={adminUsdBreakdown}
                      onChange={(cur, denom, qty) => handleOpenBillChange('admin', cur, denom, qty)}
                      onKeyDown={(e, cur, denom) => handleKeyDown(e, cur, denom, 'admin')}
                      refs={adminRefs}
                      color="green"
                    />
                  </div>
                </div>
              )}

              {/* Total summary */}
              {adminDopTotal > 0 && (
                <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
                  <span className="text-slate-300 text-sm font-bold">Total a entregar:</span>
                  <div className="text-right">
                    <p className="text-xl font-black">RD$ {adminDopTotal.toLocaleString()}</p>
                    {showCurrencyInput && adminUsdTotal > 0 && (
                      <p className="text-green-400 text-sm font-bold">+ $ {adminUsdTotal.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                {canSkip && (
                  <button type="button" onClick={onSkip}
                    className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors text-sm">
                    Omitir
                  </button>
                )}
                <button type="submit"
                  className="flex-1 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                  Continuar
                  <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════
              OPENING — STEP 2: CASHIER CONFIRMS
          ════════════════════════════════════════════════ */}
          {!isClose && openStep === 2 && (
            <>
              {/* Reference from admin */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Monto asignado por el admin</p>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-gray-300 font-bold text-sm">DOP:</span>
                  <span className="text-xl font-black text-blue-800 dark:text-blue-300">
                    RD$ {adminDopTotal.toLocaleString()}
                  </span>
                </div>
                {showCurrencyInput && adminUsdTotal > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-slate-600 dark:text-gray-300 font-bold text-sm">USD:</span>
                    <span className="text-lg font-black text-green-700 dark:text-green-400">
                      $ {adminUsdTotal.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Cashier DOP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest">
                    Pesos (DOP) — Cajero confirma
                  </h4>
                  <span className={`text-lg font-black ${
                    cashierDopTotal === adminDopTotal ? 'text-emerald-600' : 'text-orange-600'
                  }`}>
                    RD$ {cashierDopTotal.toLocaleString()}
                  </span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800">
                  <BillBreakdown
                    currency="DOP"
                    breakdown={cashierDopBreakdown}
                    onChange={(cur, denom, qty) => handleOpenBillChange('cashier', cur, denom, qty)}
                    onKeyDown={(e, cur, denom) => handleKeyDown(e, cur, denom, 'cashier')}
                    refs={cashierRefs}
                    color="green"
                  />
                </div>
              </div>

              {/* Cashier USD */}
              {showCurrencyInput && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest">
                      Dólares (USD) — Cajero confirma
                    </h4>
                    <span className={`text-lg font-black ${
                      cashierUsdTotal === adminUsdTotal ? 'text-emerald-600' : 'text-orange-600'
                    }`}>
                      $ {cashierUsdTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800">
                    <BillBreakdown
                      currency="USD"
                      breakdown={cashierUsdBreakdown}
                      onChange={(cur, denom, qty) => handleOpenBillChange('cashier', cur, denom, qty)}
                      onKeyDown={(e, cur, denom) => handleKeyDown(e, cur, denom, 'cashier')}
                      refs={cashierRefs}
                      color="green"
                    />
                  </div>
                </div>
              )}

              {/* Difference panel */}
              {cashierDopTotal > 0 && (
                <div className="space-y-2">
                  <DiffBadge
                    label="DOP"
                    diff={openDopDiff}
                    expected={adminDopTotal}
                    actual={cashierDopTotal}
                  />
                  {showCurrencyInput && (cashierUsdTotal > 0 || adminUsdTotal > 0) && (
                    <DiffBadge
                      label="USD"
                      diff={openUsdDiff}
                      expected={adminUsdTotal}
                      actual={cashierUsdTotal}
                      symbol="$"
                    />
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpenStep(1)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors text-sm">
                  ← Volver
                </button>
                <button type="submit"
                  className="flex-1 py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Save size={18} />
                  Abrir Turno
                </button>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════
              CLOSE MODE
          ════════════════════════════════════════════════ */}
          {isClose && (
            <>
              {/* Summary box */}
              <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-4 border border-slate-200 dark:border-gray-600 space-y-2 text-sm">
                <Row label="Fondo Inicial (DOP)" value={`RD$ ${(currentShift?.startAmount || 0).toLocaleString()}`} />
                {totalDOPInjected > 0 && (
                  <Row label="Inyecciones DOP" value={`+ RD$ ${totalDOPInjected.toLocaleString()}`} valueClass="text-indigo-600" />
                )}
                {(currentShift?.externalSalesTotal || 0) > 0 && (
                  <Row label="Ventas Externas" value={`+ RD$ ${(currentShift.externalSalesTotal || 0).toLocaleString()}`} valueClass="text-green-600" />
                )}
                {(currentShift?.currencyPayouts || 0) > 0 && (
                  <Row label="Pagos Divisas" value={`- RD$ ${(currentShift.currencyPayouts || 0).toLocaleString()}`} valueClass="text-red-600" />
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-200 dark:border-gray-600">
                  <span className="text-slate-700 dark:text-gray-200">Esperado (DOP):</span>
                  <span className="text-slate-900 dark:text-white">RD$ {expectedDOP.toLocaleString()}</span>
                </div>
                {showCurrencyInput && <>
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-200 dark:border-gray-600">
                    <span className="text-slate-700 dark:text-gray-200">Esperado (USD):</span>
                    <span className="text-green-600">$ {expectedUSD.toLocaleString()}</span>
                  </div>
                  {/* Ganancia solo visible para admin/IT */}
                  {isAdmin && (
                    <div className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg border border-yellow-200 dark:border-yellow-700">
                      <span className="text-yellow-800 dark:text-yellow-300 text-sm font-bold uppercase">Ganancia Estimada:</span>
                      <span className="text-yellow-900 dark:text-yellow-200 font-black text-lg">
                        RD$ {(currentShift?.totalGain || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </>}
              </div>

              {/* DOP close input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-200 mb-2">Monto Pesos (DOP)</label>
                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">RD$</span>
                  <input
                    type="text" inputMode="decimal" required autoFocus
                    value={amount} onChange={e => handleAmountChange(e.target.value)}
                    className="w-full text-3xl font-bold text-center p-4 border-2 border-slate-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-slate-300"
                    placeholder="0.00"
                  />
                </div>
                <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-3 border border-slate-200 dark:border-gray-600">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Desglose (opcional)</p>
                  <BillBreakdown
                    currency="DOP"
                    breakdown={cashierDopBreakdown}
                    onChange={(cur, denom, qty) => handleCountChange(cur, denom, qty)}
                    onKeyDown={(e, cur, denom) => handleKeyDown(e, cur, denom, 'cashier')}
                    refs={cashierRefs}
                  />
                </div>
              </div>

              {/* USD close input */}
              {showCurrencyInput && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-gray-200 mb-2">Monto Dólares (USD)</label>
                  <div className="relative mb-3">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 font-bold">$</span>
                    <input
                      type="text" inputMode="decimal"
                      value={usdAmount} onChange={e => handleUsdAmountChange(e.target.value)}
                      className="w-full text-3xl font-bold text-center p-4 border-2 border-green-200 dark:border-green-900 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-slate-300"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="bg-green-50/50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-900">
                    <p className="text-[10px] font-black text-green-600/60 uppercase tracking-widest mb-2 text-center">Desglose USD (opcional)</p>
                    <BillBreakdown
                      currency="USD"
                      breakdown={cashierUsdBreakdown}
                      onChange={(cur, denom, qty) => handleCountChange(cur, denom, qty)}
                      onKeyDown={(e, cur, denom) => handleKeyDown(e, cur, denom, 'cashier')}
                      refs={cashierRefs}
                      color="green"
                    />
                  </div>
                </div>
              )}

              {/* Close differences */}
              <div className="space-y-2">
                {difference !== null && !isNaN(difference) && (
                  <DiffBadge label="DOP" diff={difference} expected={expectedDOP} actual={parseFloat(parseNumber(amount))} />
                )}
                {showCurrencyInput && usdDifference !== null && !isNaN(usdDifference) && (
                  <DiffBadge label="USD" diff={usdDifference} expected={expectedUSD} actual={parseFloat(parseNumber(usdAmount))} symbol="$" />
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-4 rounded-xl font-bold text-slate-700 dark:text-gray-200 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-4 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Save size={20} />
                  Cerrar Turno
                </button>
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────
function Row({ label, value, valueClass = 'text-slate-900 dark:text-white' }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600 dark:text-gray-300 font-bold">{label}:</span>
      <span className={`font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

function DiffBadge({ label, diff, expected, actual, symbol = 'RD$' }) {
  const perfect = Math.abs(diff) < 0.01;
  const over    = diff > 0.01;
  return (
    <div className={`p-3 rounded-lg flex items-center gap-3 ${
      perfect ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
      over    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
    }`}>
      {perfect ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
      <span className="font-bold text-sm">
        {label}:{' '}
        {perfect ? 'Cuadre perfecto ✓' :
         over    ? `Sobra ${symbol} ${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2 })}` :
                   `Falta ${symbol} ${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
      </span>
    </div>
  );
}
