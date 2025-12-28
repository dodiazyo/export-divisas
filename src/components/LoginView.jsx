import React, { useState } from 'react';
import { Lock, Delete, ArrowRight, DollarSign } from 'lucide-react';

export default function LoginView({ onLogin, settings, users = [] }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const storeName = settings?.name || 'CASA DE CAMBIO';

  const handleNumberClick = (num) => {
    setPin(prev => prev + num);
    setError('');
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Asynchronous verification
    let foundUser = null;
    // We iterate to find the matching user
    // Note: In a real backend we would send username/pass. Here we try to match the "pin/password" against all users
    // which effectively means the password acts as the identifier too unless we ask for username.
    // The current app design implies "PIN is the ID". 
    // If multiple users have same password, this finds the first one. 
    // Ideally we should ask for User selection first, but based on current UI (only PIN entry), this is the flow.
    
    // However, trying to match a password against ALL users is slow if many users (bcrypt).
    // But we likely have very few users (Local App).
    
    try {
      const { verifyPassword } = await import('../utils/auth');
      
      for (const u of users) {
        // u.pin is now storing either plain text or hash
        const isValid = await verifyPassword(pin, u.pin);
        if (isValid) {
          foundUser = u;
          break;
        }
      }

      if (foundUser) {
        onLogin(foundUser);
      } else {
        setError('Contraseña Incorrecta');
        setPin('');
      }
    } catch (err) {
      console.error(err);
      setError('Error de autenticación');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-green-600 p-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <DollarSign size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 uppercase">{storeName}</h1>
          <p className="text-green-100 text-sm">Sistema de Gestión de Divisas</p>
        </div>

        {/* PIN Input */}
        <div className="p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-8 relative">
              <p className="text-slate-500 mb-2 text-center">Ingrese su contraseña o PIN</p>
              
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-green-500 outline-none text-center text-2xl tracking-widest text-slate-800 bg-slate-50 transition-all shadow-inner mb-2"
                placeholder="****"
                autoFocus
              />
              
              {error && (
                <p className="text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-1 text-center absolute left-0 right-0 -bottom-6">
                  {error}
                </p>
              )}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumberClick(num.toString())}
                  className="w-full h-14 rounded-lg border border-slate-200 shadow-sm font-mono text-xl font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <div className="flex items-center justify-center">
                {pin.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPin('')}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider"
                  >
                    Borrar
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleNumberClick('0')}
                className="h-14 rounded-lg bg-white hover:bg-slate-50 text-xl font-medium text-slate-700 transition-all active:scale-95 shadow-sm border border-slate-200"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="h-14 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center shadow-sm border border-red-100"
              >
                <Delete size={20} />
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-200 disabled:shadow-none flex items-center justify-center gap-2"
            >
              Ingresar
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
