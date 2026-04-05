import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const DENOMS_DOP = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1];

export default function DopConfirmModal({ isOpen, onClose, onConfirm, requiredAmount }) {
  const [dopBills, setDopBills] = useState({});
  const inputRefs = useRef({});

  useEffect(() => {
    if (isOpen) {
      setDopBills(DENOMS_DOP.reduce((acc, d) => ({ ...acc, [d]: '' }), {}));
      setTimeout(() => {
        inputRefs.current[2000]?.focus();
        inputRefs.current[2000]?.select();
      }, 100);
    }
  }, [isOpen]);

  const totalEntered = DENOMS_DOP.reduce(
    (sum, d) => sum + d * (parseInt(dopBills[d]) || 0),
    0
  );

  const diff = totalEntered - (requiredAmount || 0);
  const hasEntries = totalEntered > 0;
  const isExact = hasEntries && Math.abs(diff) < 0.01;
  const isOver = diff > 0.01;
  const isUnder = !hasEntries || diff < -0.01;

  const handleChange = (denom, val) => {
    setDopBills(prev => ({ ...prev, [denom]: val.replace(/[^0-9]/g, '') }));
  };

  const handleKeyDown = (e, denom) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sorted = [...DENOMS_DOP].sort((a, b) => b - a);
      const idx = sorted.indexOf(denom);
      if (idx < sorted.length - 1) {
        const next = sorted[idx + 1];
        inputRefs.current[next]?.focus();
        inputRefs.current[next]?.select();
      } else {
        document.getElementById('dop-confirm-btn')?.focus();
      }
    }
  };

  if (!isOpen) return null;

  const sortedDenoms = [...DENOMS_DOP].sort((a, b) => b - a);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">

        <div className="bg-slate-900 text-white px-6 py-5 text-center shrink-0">
          <h2 className="text-xl font-bold">Confirmar Pesos a Entregar</h2>
          <p className="text-slate-400 dark:text-gray-400 text-sm mt-1">Ingrese los billetes DOP que entrega al cliente</p>
        </div>

        <div className="p-5 overflow-y-auto flex-1">

          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4 text-center">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Total a Entregar</p>
            <p className="text-4xl font-black text-blue-900">
              RD$ {(requiredAmount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {sortedDenoms.map(denom => (
              <div
                key={denom}
                className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                  parseInt(dopBills[denom]) > 0
                    ? 'bg-white dark:bg-gray-700 border-slate-700 dark:border-gray-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-gray-700 border-slate-200 dark:border-gray-600'
                }`}
              >
                <span className="text-xs font-black text-slate-600 dark:text-gray-300 w-14 text-right shrink-0 leading-tight">
                  RD$<br />{denom.toLocaleString()}
                </span>
                <input
                  ref={el => inputRefs.current[denom] = el}
                  type="number"
                  min="0"
                  value={dopBills[denom] || ''}
                  onChange={e => handleChange(denom, e.target.value)}
                  onKeyDown={e => handleKeyDown(e, denom)}
                  onFocus={e => e.target.select()}
                  placeholder="0"
                  className="flex-1 text-center font-black text-slate-900 dark:text-gray-100 text-xl outline-none bg-transparent min-w-0"
                />
                {parseInt(dopBills[denom]) > 0 && (
                  <span className="text-[10px] text-slate-400 dark:text-gray-500 font-bold shrink-0 hidden sm:block">
                    ={(denom * parseInt(dopBills[denom])).toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className={`rounded-xl p-4 mb-4 transition-all ${
            isExact ? 'bg-green-50 border-2 border-green-400' :
            isOver  ? 'bg-amber-50 border-2 border-amber-400' :
                      'bg-slate-100 dark:bg-gray-700 border-2 border-slate-200 dark:border-gray-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isExact
                  ? <CheckCircle className="text-green-600 shrink-0" size={22} />
                  : isOver
                    ? <AlertTriangle className="text-amber-600 shrink-0" size={22} />
                    : <div className="w-5 h-5 rounded-full bg-slate-300 shrink-0" />
                }
                <div>
                  <p className={`font-black text-lg ${isExact ? 'text-green-800' : isOver ? 'text-amber-800' : 'text-slate-500 dark:text-gray-400'}`}>
                    RD$ {totalEntered.toLocaleString('es-DO')}
                  </p>
                  <p className={`text-xs font-bold ${isExact ? 'text-green-600' : isOver ? 'text-amber-600' : 'text-slate-400 dark:text-gray-500'}`}>
                    {isExact
                      ? 'Monto exacto'
                      : isOver
                        ? `Excede por RD$ ${diff.toLocaleString()}`
                        : hasEntries
                          ? `Faltan RD$ ${Math.abs(diff).toLocaleString()}`
                          : 'Ingrese los billetes a entregar'}
                  </p>
                </div>
              </div>
              {isOver && (
                <div className="text-right">
                  <p className="text-xs text-amber-700 font-bold uppercase">Dar vuelto</p>
                  <p className="font-black text-amber-900 text-lg">RD$ {diff.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-slate-700 dark:text-gray-200 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors"
            >
              Volver
            </button>
            <button
              id="dop-confirm-btn"
              type="button"
              onClick={() => !isUnder && onConfirm(dopBills)}
              disabled={isUnder}
              className={`flex-[2] py-3 rounded-xl font-black text-white transition-all active:scale-95 ${
                !isUnder
                  ? 'bg-slate-900 dark:bg-gray-600 hover:bg-slate-800 dark:hover:bg-gray-500 shadow-lg'
                  : 'bg-slate-200 dark:bg-gray-700 cursor-not-allowed text-slate-400 dark:text-gray-500'
              }`}
            >
              Confirmar y Procesar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
