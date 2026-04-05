import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Printer, Trash2 } from 'lucide-react';
import DopConfirmModal from './DopConfirmModal';
import { multiply, sumBills } from '../lib/money.js';

export default function CurrencyView({ settings, onUpdateSettings, onTransaction }) {
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState(settings?.exchangeRate || 58.50);

  const [bills, setBills] = useState({});
  const [totalForeign, setTotalForeign] = useState(0);
  const [totalDOP, setTotalDOP] = useState(0);

  // DOP confirmation step
  const [showDopConfirm, setShowDopConfirm] = useState(false);
  const [pendingTx, setPendingTx] = useState(null);

  const denomsUSD = [1, 5, 10, 20, 50, 100];
  const denomsEUR = [5, 10, 20, 50, 100, 200, 500];
  const currentDenoms = currency === 'USD' ? denomsUSD : denomsEUR;

  const inputRefs = useRef({});

  useEffect(() => {
    const denoms = currency === 'USD' ? denomsUSD : denomsEUR;
    setBills(denoms.reduce((acc, d) => ({ ...acc, [d]: 0 }), {}));
  }, [currency]);

  useEffect(() => {
    const total = sumBills(bills);           // suma con precisión entera
    setTotalForeign(total);
    setTotalDOP(multiply(total, rate));      // multiplicación sin error de float
  }, [bills, rate]);

  useEffect(() => {
    const denoms = currency === 'USD' ? denomsUSD : denomsEUR;
    const lowestDenom = Math.min(...denoms);
    if (inputRefs.current[lowestDenom]) {
      inputRefs.current[lowestDenom].focus();
      inputRefs.current[lowestDenom].select();
    }
  }, [currency]);

  const handleBillCountChange = (denom, val) => {
    setBills(prev => ({ ...prev, [denom]: val === '' ? 0 : parseInt(val) }));
  };

  const handleKeyDown = (e, denom) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const denoms = (currency === 'USD' ? denomsUSD : denomsEUR).sort((a, b) => a - b);
      const currentIndex = denoms.indexOf(parseInt(denom));
      const nextDenom = denoms[currentIndex + 1];
      if (nextDenom && inputRefs.current[nextDenom]) {
        inputRefs.current[nextDenom].focus();
        inputRefs.current[nextDenom].select();
      } else {
        document.getElementById('process-transaction-btn')?.focus();
      }
    }
  };

  const handleClearBills = () => {
    if (window.confirm('¿Borrar todo?')) {
      const denoms = currency === 'USD' ? denomsUSD : denomsEUR;
      setBills(denoms.reduce((acc, d) => ({ ...acc, [d]: 0 }), {}));
      const lowestDenom = Math.min(...denoms);
      inputRefs.current[lowestDenom]?.focus();
    }
  };

  // Step 1: Validate and open DOP confirmation modal
  const handleProcessTransaction = () => {
    if (totalForeign === 0) {
      alert('No hay billetes registrados.');
      return;
    }
    setPendingTx({
      amount: totalForeign,
      dopAmount: totalDOP,
      rate,
      breakdown: { ...bills },
      currency,
    });
    setShowDopConfirm(true);
  };

  // Step 2: DOP confirmed — process and print
  const handleDopConfirmed = (dopBills) => {
    const txData = { ...pendingTx, dopBreakdown: dopBills };
    const success = onTransaction(txData);

    if (success) {
      printTransactionReceipt(pendingTx, dopBills);

      const denoms = currency === 'USD' ? denomsUSD : denomsEUR;
      setBills(denoms.reduce((acc, d) => ({ ...acc, [d]: 0 }), {}));
      setShowDopConfirm(false);
      setPendingTx(null);

      const lowestDenom = Math.min(...denoms);
      setTimeout(() => inputRefs.current[lowestDenom]?.focus(), 100);
    } else {
      // Alert already shown by onTransaction — just close modal
      setShowDopConfirm(false);
      setPendingTx(null);
    }
  };

  const printTransactionReceipt = (txData, dopBills) => {
    const { amount: totalForeignAmt, dopAmount: totalDOPAmt, rate: txRate, breakdown: foreignBills, currency: curr } = txData;
    const symbol = curr === 'USD' ? '$' : '€';
    const currencyName = curr === 'USD' ? 'USD' : 'EUR';
    const storeName = settings?.name || 'CASA DE CAMBIO';
    const storeRNC = settings?.rnc || '';
    const storePhone = settings?.phone || '';
    const storeAddress = settings?.address || '';
    const footerMsg = settings?.receiptMessage || '¡Gracias por su preferencia!';

    // Compute total DOP from bills entered
    const totalDOPBills = Object.entries(dopBills).reduce(
      (sum, [d, q]) => sum + parseInt(d) * (parseInt(q) || 0), 0
    );
    const change = totalDOPBills - totalDOPAmt;

    const foreignBillsHtml = Object.entries(foreignBills)
      .filter(([_, c]) => c > 0)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .map(([d, c]) => `
        <div class="item-row">
          <span>Billete ${symbol}${d} ${currencyName}</span>
          <span>${c}</span>
        </div>
      `).join('');

    const dopBillsHtml = Object.entries(dopBills)
      .filter(([_, c]) => parseInt(c) > 0)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .map(([d, c]) => `
        <div class="item-row">
          <span>Billete RD$${parseInt(d).toLocaleString()}</span>
          <span>${c}</span>
        </div>
      `).join('');

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) {
      alert('Ventana de impresión bloqueada. Por favor permita ventanas emergentes.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo - ${storeName}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 64mm;
              margin: 0 auto;
              padding: 20px 0;
              color: #000;
              font-size: 13px;
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .header { margin-bottom: 16px; border-bottom: 1px dashed #000; padding-bottom: 12px; }
            .store-name { font-size: 18px; margin-bottom: 4px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .section-title { font-weight: bold; font-size: 11px; margin: 6px 0 4px; text-transform: uppercase; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .total-section { margin-top: 10px; border-top: 2px solid #000; padding-top: 8px; }
            .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-bottom: 5px; }
            .change-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; color: #555; margin-top: 4px; }
            .footer { margin-top: 28px; font-size: 11px; margin-bottom: 50px; }
          </style>
        </head>
        <body>
          <div class="header text-center">
            <div class="store-name font-bold">${storeName}</div>
            ${storeRNC ? `<div>RNC: ${storeRNC}</div>` : ''}
            ${storePhone ? `<div>Tel: ${storePhone}</div>` : ''}
            ${storeAddress ? `<div style="font-size:11px">${storeAddress}</div>` : ''}
            <div class="divider"></div>
            <div class="font-bold">COMPRA DE DIVISAS</div>
            <div>${new Date().toLocaleString('es-DO')}</div>
          </div>

          <div class="section-title">Divisas Recibidas (${currencyName})</div>
          <div class="divider"></div>
          <div class="item-row font-bold">
            <span>BILLETE</span><span>CANT</span>
          </div>
          ${foreignBillsHtml}

          <div class="divider"></div>
          <div class="section-title">Pesos Entregados (DOP)</div>
          <div class="divider"></div>
          <div class="item-row font-bold">
            <span>BILLETE</span><span>CANT</span>
          </div>
          ${dopBillsHtml || '<div style="font-size:11px;color:#999">—</div>'}

          <div class="total-section">
            <div class="item-row">
              <span>TASA:</span>
              <span class="font-bold">RD$ ${txRate.toFixed(2)}</span>
            </div>
            <div class="divider"></div>
            <div class="total-row">
              <span>TOTAL ${currencyName}:</span>
              <span>${symbol}${totalForeignAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row">
              <span>A PAGAR:</span>
              <span>RD$ ${totalDOPAmt.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
            </div>
            ${change > 0.01 ? `
            <div class="change-row">
              <span>VUELTO:</span>
              <span>RD$ ${change.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
            </div>` : ''}
          </div>

          <div class="footer text-center">
            <div class="font-bold">${footerMsg}</div>
            <div style="margin-top:15px;border-top:1px solid #eee;padding-top:10px">*** COPIA DE CLIENTE ***</div>
            <div style="font-size:9px;color:#666;margin-top:5px">ID: ${Date.now()}</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const sortedDenoms = [...currentDenoms].sort((a, b) => a - b);

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 lg:p-6 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full h-full flex flex-col">

        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="text-green-600" />
              Compra de Divisas
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 p-1 rounded-xl">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  currency === 'USD'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('EUR')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  currency === 'EUR'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                EUR (€)
              </button>
            </div>

            <div className={`px-4 py-2 rounded-xl shadow-sm border flex items-center gap-4 ${
              currency === 'USD' ? 'bg-white border-green-200' : 'bg-white border-blue-200'
            }`}>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Tasa {currency}</p>
                <p className={`text-xl font-bold ${currency === 'USD' ? 'text-green-700' : 'text-blue-700'}`}>
                  RD$ {rate.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

          {/* LEFT: Bill entry */}
          <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full">
              <div className="p-3 border-b border-slate-300 bg-slate-200 flex justify-between items-center shrink-0">
                <h3 className="font-black text-black uppercase text-sm tracking-wider">Cantidades ({currency})</h3>
                <button
                  onClick={handleClearBills}
                  className="text-[10px] text-red-700 hover:text-red-800 font-black flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border-2 border-red-300 shadow-sm transition-all active:scale-95"
                >
                  <Trash2 size={14} /> REINICIAR
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-slate-100">
                {sortedDenoms.map((denom) => (
                  <div
                    key={denom}
                    className={`flex items-center gap-3 py-1.5 px-4 rounded-xl border-2 transition-all ${
                      bills[denom] > 0
                        ? (currency === 'USD' ? 'bg-white border-green-600 shadow-sm' : 'bg-white border-blue-600 shadow-sm')
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    <div className="w-20 shrink-0">
                      <span className={`text-3xl font-black ${
                        bills[denom] > 0
                          ? (currency === 'USD' ? 'text-green-800' : 'text-blue-800')
                          : 'text-black'
                      }`}>
                        {currency === 'USD' ? '$' : '€'}{denom}
                      </span>
                    </div>

                    <div className="flex-1">
                      <input
                        ref={el => inputRefs.current[denom] = el}
                        type="number"
                        min="0"
                        value={bills[denom] || ''}
                        onChange={e => handleBillCountChange(denom, e.target.value)}
                        onKeyDown={e => handleKeyDown(e, denom)}
                        onFocus={e => e.target.select()}
                        placeholder="0"
                        className={`w-full text-3xl font-black py-2 px-4 rounded-lg border-2 outline-none transition-all text-center ${
                          currency === 'USD'
                            ? 'focus:border-green-700 focus:ring-4 focus:ring-green-100 border-slate-300 text-black'
                            : 'focus:border-blue-700 focus:ring-4 focus:ring-blue-100 border-slate-400 text-black'
                        }`}
                      />
                    </div>

                    <div className="w-32 text-right hidden sm:block">
                      <p className="text-[10px] text-black uppercase font-black tracking-tighter leading-none mb-1">Subtotal</p>
                      <p className={`text-xl font-black leading-none ${bills[denom] > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                        {currency === 'USD' ? '$' : '€'}{((bills[denom] || 0) * denom).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-white border-t-2 border-slate-300 flex items-center justify-center gap-4 text-black shrink-0">
                <div className="bg-black text-white px-3 py-1 rounded-lg border border-black flex items-center gap-2">
                  <kbd className="font-black text-white text-base">ENTER</kbd>
                  <span className="text-[10px] font-bold uppercase">Siguiente</span>
                </div>
                <p className="uppercase tracking-widest text-[9px] font-black text-slate-600">Escribe y pulsa Enter</p>
              </div>
            </div>
          </div>

          {/* RIGHT: Totals & Action */}
          <div className="lg:col-span-5 flex flex-col gap-4 h-full min-h-0">
            <div className="bg-slate-900 rounded-3xl shadow-xl p-8 text-white flex flex-col h-full">
              <div className="flex-1 flex flex-col justify-center space-y-8">

                <div>
                  <span className="text-slate-400 text-sm font-bold uppercase tracking-widest block mb-2 text-center">Resumen de Compra</span>
                  <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 text-center">
                    <p className="text-slate-400 text-sm mb-1 font-medium">Total en {currency === 'USD' ? 'Dólares' : 'Euros'}</p>
                    <p className={`text-5xl font-black ${currency === 'USD' ? 'text-green-400' : 'text-blue-400'}`}>
                      {currency === 'USD' ? '$' : '€'}{totalForeign.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase font-bold">
                    <span className="px-2 bg-slate-900 text-slate-500 tracking-widest">
                      Equivalente a tasa: {rate.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-1 font-medium">Total a Pagar en Pesos</p>
                  <p className="text-6xl font-black text-white">
                    <span className="text-2xl font-bold opacity-50 mr-2">RD$</span>
                    {Math.floor(totalDOP).toLocaleString('es-DO')}
                  </p>
                  <p className="text-white/60 font-bold mt-1 text-xl">
                    .{((totalDOP % 1) * 100).toFixed(0).padStart(2, '0')}
                  </p>
                </div>

              </div>

              <div className="mt-8 space-y-4">
                <button
                  id="process-transaction-btn"
                  onClick={handleProcessTransaction}
                  disabled={totalForeign === 0}
                  className={`w-full py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
                    totalForeign > 0
                      ? (currency === 'USD'
                          ? 'bg-green-500 hover:bg-green-400 text-white shadow-green-500/20'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20')
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Printer size={28} />
                  PROCESAR E IMPRIMIR
                </button>

                <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-tighter">
                  Confirmará los billetes DOP antes de procesar
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <DopConfirmModal
        isOpen={showDopConfirm}
        onClose={() => { setShowDopConfirm(false); setPendingTx(null); }}
        onConfirm={handleDopConfirmed}
        requiredAmount={pendingTx?.dopAmount || 0}
      />
    </div>
  );
}
