import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';

export default function CapitalInjectionModal({ isOpen, onClose, onConfirm, adminName }) {
  const [currency, setCurrency] = useState('DOP');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setCurrency('DOP');
    }
  }, [isOpen]);

  const formatAmt = (val) => {
    const raw = val.replace(/[^0-9.]/g, '');
    if ((raw.match(/\./g) || []).length > 1) return amount;
    const [int, dec] = raw.split('.');
    const formatted = (int || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec !== undefined ? `${formatted}.${dec.slice(0, 2)}` : formatted;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const raw = parseFloat((amount || '').replace(/,/g, ''));
    if (!raw || raw <= 0) {
      alert('Ingrese un monto válido mayor a cero.');
      return;
    }
    onConfirm({ currency, amount: raw, note: note.trim(), adminName });
    setAmount('');
    setNote('');
    setCurrency('DOP');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        <div className="bg-indigo-700 text-white px-6 py-5 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <PlusCircle size={28} />
          </div>
          <h2 className="text-xl font-bold">Inyección de Capital</h2>
          <p className="text-indigo-200 text-sm mt-1">Asignación de fondos a caja · Solo Administrador</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Moneda</label>
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {['DOP', 'USD'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    currency === c
                      ? 'bg-white shadow text-indigo-700'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {c === 'DOP' ? 'Pesos (DOP)' : 'Dólares (USD)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                {currency === 'DOP' ? 'RD$' : '$'}
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                autoFocus
                value={amount}
                onChange={e => setAmount(formatAmt(e.target.value))}
                className="w-full text-2xl font-bold text-center p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none text-slate-900 placeholder:text-slate-300"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Nota / Motivo <span className="text-slate-300 font-normal normal-case">(opcional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-slate-800 font-medium"
              placeholder="Ej: Reposición de fondo, Cambio de turno..."
              maxLength={120}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 rounded-xl font-black text-white bg-indigo-700 hover:bg-indigo-600 shadow-lg transition-all active:scale-95"
            >
              Confirmar Inyección
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
