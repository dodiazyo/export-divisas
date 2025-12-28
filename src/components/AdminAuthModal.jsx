import React, { useState } from 'react';
import { X, Lock, ShieldAlert } from 'lucide-react';

// Mock Admin PIN for simplicity (In real app, check against user db)
const ADMIN_PIN = '1234'; 

export default function AdminAuthModal({ isOpen, onClose, onConfirm, actionTitle }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onConfirm();
      handleClose();
    } else {
      setError('PIN Incorrecto');
      setPin('');
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
            <ShieldAlert size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Autorización Requerida</h3>
          <p className="text-sm text-slate-500 mt-1">
            Para {actionTitle || 'realizar esta acción'} necesitas permiso de Administrador.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-center">
              Ingrese PIN de Administrador
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg tracking-widest text-slate-900 bg-white placeholder:text-slate-400"
                placeholder="••••"
                maxLength={4}
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold text-center mt-2">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
            >
              Autorizar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
