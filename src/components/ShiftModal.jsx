import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Lock, Save, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ShiftModal({ isOpen, mode, onClose, onConfirm, onSkip, currentShift, showCurrencyInput, canSkip = true }) {
  const [amount, setAmount] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [difference, setDifference] = useState(null);
  const [usdDifference, setUsdDifference] = useState(null);

  const denomsDOP = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1];
  const denomsUSD = [100, 50, 20, 10, 5, 1];
  const [dopBreakdown, setDopBreakdown] = useState({});
  const [usdBreakdown, setUsdBreakdown] = useState({});
  const breakdownRefs = useRef({});

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setUsdAmount('');
      setDifference(null);
      setUsdDifference(null);
      setDopBreakdown(denomsDOP.reduce((acc, d) => ({ ...acc, [d]: '' }), {}));
      setUsdBreakdown(denomsUSD.reduce((acc, d) => ({ ...acc, [d]: '' }), {}));
    }
  }, [isOpen]);

  const formatNumber = (val) => {
    if (!val) return '';
    const raw = val.replace(/,/g, '');
    if (isNaN(raw)) return val;
    const parts = raw.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const parseNumber = (val) => {
    if (!val) return '';
    return val.replace(/,/g, '');
  };

  // Compute expected DOP including injections and external sales
  const getExpectedDOP = (shift) => {
    if (!shift) return 0;
    const totalDOPInjected = (shift.injections || [])
      .filter(i => i.currency === 'DOP')
      .reduce((sum, i) => sum + i.amount, 0);
    return (
      (shift.startAmount || 0) +
      totalDOPInjected +
      (shift.externalSalesTotal || 0) -
      (shift.currencyPayouts || 0)
    );
  };

  const handleAmountChange = (valRaw) => {
    let val = valRaw.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) return;
    if (val.includes('.')) {
      const [int, dec] = val.split('.');
      if (dec && dec.length > 2) val = `${int}.${dec.substring(0, 2)}`;
    }
    setAmount(formatNumber(val));
    calculateDifference(val, parseNumber(usdAmount));
  };

  const handleUsdAmountChange = (valRaw) => {
    let val = valRaw.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) return;
    if (val.includes('.')) {
      const [int, dec] = val.split('.');
      if (dec && dec.length > 2) val = `${int}.${dec.substring(0, 2)}`;
    }
    setUsdAmount(formatNumber(val));
    calculateDifference(parseNumber(amount), val);
  };

  const handleCountChange = (currency, denom, qtyRaw) => {
    const qty = qtyRaw.replace(/[^0-9]/g, '');
    const isDOP = currency === 'DOP';
    const setter = isDOP ? setDopBreakdown : setUsdBreakdown;
    const currentBreakdown = isDOP ? dopBreakdown : usdBreakdown;
    const newBreakdown = { ...currentBreakdown, [denom]: qty };
    setter(newBreakdown);

    const total = Object.entries(newBreakdown).reduce(
      (sum, [d, q]) => sum + (parseInt(d) * (parseInt(q) || 0)),
      0
    );

    if (isDOP) {
      setAmount(formatNumber(total.toString()));
      calculateDifference(total.toString(), parseNumber(usdAmount));
    } else {
      setUsdAmount(formatNumber(total.toString()));
      calculateDifference(parseNumber(amount), total.toString());
    }
  };

  const handleKeyDown = (e, currency, denom) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const denoms = currency === 'DOP' ? denomsDOP : denomsUSD;
      const idx = denoms.indexOf(denom);
      if (idx < denoms.length - 1) {
        const nextDenom = denoms[idx + 1];
        breakdownRefs.current[`${currency}-${nextDenom}`]?.focus();
      }
    }
  };

  const calculateDifference = (dopVal, usdVal) => {
    if (mode === 'close' && currentShift) {
      if (dopVal) {
        const expected = getExpectedDOP(currentShift);
        const actual = parseFloat(dopVal);
        setDifference(actual - expected);
      } else {
        setDifference(null);
      }

      if (usdVal && showCurrencyInput) {
        const expectedUsd = currentShift.usdOnHand || 0;
        setUsdDifference(parseFloat(usdVal) - expectedUsd);
      } else {
        setUsdDifference(null);
      }
    } else {
      setDifference(null);
      setUsdDifference(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount) return;
    const rawAmount = parseFloat(parseNumber(amount));
    const rawUsd = usdAmount ? parseFloat(parseNumber(usdAmount)) : 0;
    if (rawAmount < 0 || rawUsd < 0) {
      alert('Los montos no pueden ser negativos.');
      return;
    }
    onConfirm(rawAmount, rawUsd, dopBreakdown, usdBreakdown);
  };

  if (!isOpen) return null;

  const isClose = mode === 'close';
  const expectedTotal = isClose ? getExpectedDOP(currentShift) : 0;
  const expectedUsd = isClose && currentShift ? (currentShift.usdOnHand || 0) : 0;

  const totalDOPInjected = isClose && currentShift
    ? (currentShift.injections || []).filter(i => i.currency === 'DOP').reduce((sum, i) => sum + i.amount, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 my-8">

        {/* Header */}
        <div className={`px-6 py-6 text-center ${isClose ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'}`}>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {isClose ? <Lock size={32} /> : <DollarSign size={32} />}
          </div>
          <h2 className="text-2xl font-bold">
            {isClose ? 'Cierre de Caja' : 'Apertura de Caja'}
          </h2>
          <p className="text-white/80 text-sm mt-1">
            {isClose ? 'Ingrese los montos finales en caja' : 'Ingrese los montos iniciales (fondo de caja)'}
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-8">

          {isClose && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700 font-bold">Fondo Inicial (DOP):</span>
                <span className="font-bold text-slate-900">RD$ {(currentShift?.startAmount || 0).toLocaleString()}</span>
              </div>
              {totalDOPInjected > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 font-bold">Inyecciones de Capital:</span>
                  <span className="font-bold text-indigo-700">+ RD$ {totalDOPInjected.toLocaleString()}</span>
                </div>
              )}
              {(currentShift?.externalSalesTotal || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 font-bold">Ventas Externas:</span>
                  <span className="font-bold text-green-700">+ RD$ {(currentShift?.externalSalesTotal || 0).toLocaleString()}</span>
                </div>
              )}
              {showCurrencyInput && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 font-bold">Fondo Inicial (USD):</span>
                  <span className="font-bold text-green-700">$ {(currentShift?.usdStartAmount || 0).toLocaleString()}</span>
                </div>
              )}
              {(currentShift?.currencyPayouts || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 font-bold">Pagos Divisas:</span>
                  <span className="font-bold text-red-700">- RD$ {(currentShift?.currencyPayouts || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                <span className="text-slate-700">Esperado (DOP):</span>
                <span className="text-slate-900">RD$ {expectedTotal.toLocaleString()}</span>
              </div>

              {showCurrencyInput && (
                <>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200 mt-2">
                    <span className="text-slate-700">Esperado (USD):</span>
                    <span className="text-green-600">$ {expectedUsd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center bg-yellow-50 p-2 rounded-lg border border-yellow-200 mt-2">
                    <span className="text-yellow-800 text-sm font-bold uppercase">Ganancia Estimada:</span>
                    <span className="text-yellow-900 font-bold text-lg">
                      RD$ {(currentShift?.totalGain || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* DOP Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {isClose ? 'Monto Pesos (DOP)' : 'Fondo Inicial (DOP)'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">RD$</span>
              <input
                type="text"
                inputMode="decimal"
                required
                autoFocus
                value={amount}
                onChange={e => handleAmountChange(e.target.value)}
                className="w-full text-3xl font-bold text-center p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-slate-900 bg-white placeholder:text-slate-300"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* DOP Breakdown (close only) */}
          {isClose && (
            <div className="mb-6 grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Desglose Pesos (DOP)</h4>
              {denomsDOP.map(d => (
                <div key={`dop-${d}`} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 w-12 text-right">RD${d}</span>
                  <input
                    ref={el => breakdownRefs.current[`DOP-${d}`] = el}
                    type="text"
                    inputMode="numeric"
                    value={dopBreakdown[d] || ''}
                    onChange={e => handleCountChange('DOP', d, e.target.value)}
                    onKeyDown={e => handleKeyDown(e, 'DOP', d)}
                    className="w-full text-right font-bold text-slate-800 outline-none pr-1"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}

          {/* USD Input */}
          {showCurrencyInput && (
            <div className="mb-6 animate-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {isClose ? 'Monto Dólares (USD)' : 'Fondo Inicial (USD)'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 font-bold">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={usdAmount}
                  onChange={e => handleUsdAmountChange(e.target.value)}
                  className="w-full text-3xl font-bold text-center p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all text-slate-900 bg-white placeholder:text-slate-300"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* USD Breakdown (close only) */}
          {isClose && showCurrencyInput && (
            <div className="mb-6 grid grid-cols-2 gap-2 bg-green-50/50 p-4 rounded-xl border border-green-100">
              <h4 className="col-span-2 text-[10px] font-black text-green-700/50 uppercase tracking-widest mb-2 text-center">Desglose Dólares (USD)</h4>
              {denomsUSD.map(d => (
                <div key={`usd-${d}`} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-green-100 shadow-sm">
                  <span className="text-xs font-bold text-green-600 w-8 text-right">${d}</span>
                  <input
                    ref={el => breakdownRefs.current[`USD-${d}`] = el}
                    type="text"
                    inputMode="numeric"
                    value={usdBreakdown[d] || ''}
                    onChange={e => handleCountChange('USD', d, e.target.value)}
                    onKeyDown={e => handleKeyDown(e, 'USD', d)}
                    className="w-full text-right font-bold text-slate-800 outline-none pr-1"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Differences */}
          {isClose && (
            <div className="space-y-3 mb-6">
              {difference !== null && !isNaN(difference) && (
                <div className={`p-3 rounded-lg flex items-center gap-3 ${
                  Math.abs(difference) < 1 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {Math.abs(difference) < 1 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  <span className="font-bold text-sm">
                    DOP: {difference > 0 ? `Sobra RD$${difference.toFixed(2)}` : difference < 0 ? `Falta RD$${Math.abs(difference).toFixed(2)}` : 'Cuadre Perfecto'}
                  </span>
                </div>
              )}
              {showCurrencyInput && usdDifference !== null && !isNaN(usdDifference) && (
                <div className={`p-3 rounded-lg flex items-center gap-3 ${
                  Math.abs(usdDifference) < 1 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {Math.abs(usdDifference) < 1 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  <span className="font-bold text-sm">
                    USD: {usdDifference > 0 ? `Sobra $${usdDifference.toFixed(2)}` : usdDifference < 0 ? `Falta $${Math.abs(usdDifference).toFixed(2)}` : 'Cuadre Perfecto'}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {(!isClose && !canSkip) ? (
              <div className="flex-1"></div>
            ) : (
              <button
                type="button"
                onClick={isClose ? onClose : onSkip}
                className="flex-1 py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {isClose ? 'Cancelar' : 'Omitir'}
              </button>
            )}
            <button
              type="submit"
              className={`flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                isClose
                  ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'
              }`}
            >
              <Save size={20} />
              {isClose ? 'Cerrar Turno' : 'Abrir Turno'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
