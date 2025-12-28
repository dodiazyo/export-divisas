import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Calculator, Printer, Trash2 } from 'lucide-react';

export default function CurrencyView({ settings, onUpdateSettings, onTransaction }) {
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState(settings?.exchangeRate || 58.50);
  
  // Transaction State
  const [bills, setBills] = useState({});

  const [totalForeign, setTotalForeign] = useState(0); // Renamed from totalUSD
  const [totalDOP, setTotalDOP] = useState(0);

  // Denominations
  const denomsUSD = [1, 5, 10, 20, 50, 100];
  const denomsEUR = [5, 10, 20, 50, 100, 200, 500];
  const currentDenoms = currency === 'USD' ? denomsUSD : denomsEUR;

  useEffect(() => {
    if (currency === 'USD') {
      setRate(settings?.exchangeRate || 58.50);
      // Reset bills when switching to avoid confusion
      setBills(denomsUSD.reduce((acc, d) => ({...acc, [d]: 0}), {}));
    } else {
      setRate(settings?.exchangeRateEur || 64.00);
      setBills(denomsEUR.reduce((acc, d) => ({...acc, [d]: 0}), {}));
    }
  }, [currency, settings]);

  // Calculate totals
  useEffect(() => {
    let total = 0;
    Object.entries(bills).forEach(([denom, count]) => {
      total += parseInt(denom) * (parseInt(count) || 0);
    });
    setTotalForeign(total);
    setTotalDOP(total * rate);
  }, [bills, rate]);

  const handleClearBills = () => {
    if (window.confirm('¿Borrar todo?')) {
      const zeroed = currentDenoms.reduce((acc, d) => ({...acc, [d]: 0}), {});
      setBills(zeroed);
    }
  };

  const handleRemoveDenom = (denom) => {
    setBills(prev => ({ ...prev, [denom]: 0 }));
  };



  const handleProcessTransaction = () => {
    if (totalForeign === 0) {
      alert("No hay billetes registrados.");
      return;
    }

    const success = onTransaction({
      amount: totalForeign,
      dopAmount: totalDOP,
      rate: rate,
      breakdown: bills,
      currency: currency
    });

    if (success) {
      const symbol = currency === 'USD' ? '$' : '€';
      const currencyName = currency === 'USD' ? 'USD' : 'EUR';

      // Generate Receipt Content
      const receiptContent = `
=== COMPRA DE DIVISAS (${currency}) ===
Fecha: ${new Date().toLocaleString()}
Tasa: RD$ ${rate.toFixed(2)}

DETALLE BILLETES:
${Object.entries(bills).filter(([_, c]) => c > 0).map(([d, c]) => `${c} x ${symbol}${d} ${currencyName}`).join('\n')}

-------------------------
TOTAL RECIBIDO: ${symbol}${totalForeign.toFixed(2)} ${currencyName}
A PAGAR: RD$ ${totalDOP.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
=========================
      `;
      
      // Print (Simulated)
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      printWindow.document.write(`
        <html>
          <head>
            <title>Recibo de Divisas</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 10px; font-size: 12px; }
              pre { white-space: pre-wrap; margin: 0; }
              .header { text-align: center; font-weight: bold; margin-bottom: 10px; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .total { font-size: 14px; font-weight: bold; }
            </style>
          </head>
          <body>
            <pre>${receiptContent}</pre>
            <script>
              window.onload = function() {
                window.print();
                // Close window after print dialog closes (supported in most modern browsers)
                window.onafterprint = function() {
                  window.close();
                };
                // Fallback for browsers that don't support onafterprint
                setTimeout(function() {
                  // window.close(); 
                }, 1000);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();

      // Reset
      const zeroed = currentDenoms.reduce((acc, d) => ({...acc, [d]: 0}), {});
      setBills(zeroed);
      alert("Transacción procesada correctamente.");
    }
  };

  // Filter bills to show only added ones in the list
  const addedBills = Object.entries(bills)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0])); // Sort by denom desc

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

        {/* Main Content Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* LEFT: Entry Panel */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Denomination Grid - Full Width now since Input Panel is gone */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-min content-start">
              {currentDenoms.map(denom => (
                <div
                  key={denom}
                  className={`
                    relative group border-2 rounded-2xl p-3 flex flex-col items-center justify-center transition-all duration-200 shadow-sm
                    ${currency === 'USD' 
                      ? 'bg-white border-slate-200 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-50' 
                      : 'bg-white border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50'}
                  `}
                  onClick={() => {
                    // Focus inner input on card click
                    const input = document.getElementById(`input-${currency}-${denom}`);
                    if (input) input.focus();
                  }}
                >
                  <label htmlFor={`input-${currency}-${denom}`} className="cursor-pointer flex flex-col items-center">
                    <span className={`text-2xl font-bold mb-2 ${currency === 'USD' ? 'text-slate-700' : 'text-slate-700'}`}>
                      {currency === 'USD' ? '$' : '€'}{denom}
                    </span>
                  </label>
                  
                  <input
                    id={`input-${currency}-${denom}`}
                    type="number"
                    min="0"
                    placeholder="0"
                    className={`
                      w-20 text-center text-xl font-bold bg-slate-50 border border-slate-200 rounded-lg py-1 px-1 outline-none transition-colors
                      placeholder:text-slate-300
                      ${currency === 'USD' ? 'focus:bg-green-50 focus:text-green-800' : 'focus:bg-blue-50 focus:text-blue-800'}
                    `}
                    value={bills[denom] || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        setBills(prev => ({ ...prev, [denom]: val }));
                      }
                    }}
                    onFocus={(e) => e.target.select()} // Auto-select all on focus
                  />
                  
                  <span className={`text-[10px] uppercase font-bold mt-2 ${currency === 'USD' ? 'text-slate-400' : 'text-slate-400'}`}>
                    {currency}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: List & Totals */}
          <div className="lg:col-span-5 flex flex-col gap-4 h-full min-h-0">
            
            {/* Transaction List */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Billetes Agregados</h3>
                {totalForeign > 0 && (
                  <button onClick={handleClearBills} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                    <Trash2 size={14} /> Borrar Todo
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {addedBills.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                    <Calculator size={48} className="mb-2" />
                    <p>Agrega billetes para comenzar</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-bold sticky top-0">
                      <tr>
                        <th className="p-3 rounded-tl-lg">Denominación</th>
                        <th className="p-3 text-center">Cantidad</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 rounded-tr-lg text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {addedBills.map(([denom, count]) => (
                        <tr key={denom} className="hover:bg-slate-50 transition-colors animate-in slide-in-from-left-2">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold px-2 py-1 rounded border text-sm ${
                                currency === 'USD' 
                                  ? 'bg-green-100 text-green-700 border-green-200' 
                                  : 'bg-blue-100 text-blue-700 border-blue-200'
                              }`}>
                                {currency === 'USD' ? '$' : '€'}{denom}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-slate-800 text-lg">{count}</span>
                          </td>
                          <td className="p-3 text-right font-medium text-slate-600">
                            {currency === 'USD' ? '$' : '€'}{(count * denom).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => handleRemoveDenom(denom)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Totals & Action */}
            <div className="bg-slate-900 rounded-2xl shadow-lg p-6 text-white shrink-0">
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 text-sm">Total Recibido</span>
                  <span className="text-xl font-bold text-white">
                    {currency === 'USD' ? '$ ' : '€ '}{totalForeign.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="w-full h-px bg-slate-700"></div>
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 text-sm">A Pagar</span>
                  <span className="text-3xl font-bold text-white">RD$ {totalDOP.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <button
                onClick={handleProcessTransaction}
                disabled={totalForeign === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                  totalForeign > 0 
                    ? (currency === 'USD' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Printer size={24} />
                Procesar e Imprimir
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
