import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  LogOut,
  DollarSign,
  BarChart3,
  Settings,
  UserCog
} from 'lucide-react';
import LoginView from './components/LoginView';
import ShiftModal from './components/ShiftModal';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import UsersView from './components/UsersView';
import ShiftReceipt from './components/ShiftReceipt';
import CurrencyView from './components/CurrencyView';

export default function App() {
  const [activeTab, setActiveTab] = useState('currency');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- ESTADO GLOBAL ---
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('divisas-user');
    return saved ? JSON.parse(saved) : null;
  });

  const [shift, setShift] = useState(() => {
    const saved = localStorage.getItem('divisas-shift');
    return saved ? JSON.parse(saved) : null;
  });

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState('open'); 

  // Persistencia
  useEffect(() => {
    if (user) localStorage.setItem('divisas-user', JSON.stringify(user));
    else localStorage.removeItem('divisas-user');
  }, [user]);

  useEffect(() => {
    if (shift) localStorage.setItem('divisas-shift', JSON.stringify(shift));
    else localStorage.removeItem('divisas-shift');
  }, [shift]);

  // Check for open shift on login
  useEffect(() => {
    if (user) {
      // Si hay un turno abierto pero pertenece a otro usuario
      if (shift && shift.userId !== user.id) {
        // Si el turno no tiene transacciones, lo cerramos/limpiamos automáticamente para dar paso al nuevo usuario
        if (shift.transactions === 0) {
          setShift(null);
          // El siguiente ciclo del efecto detectará !shift y abrirá el modal
          return;
        } else {
          // TODO: Si el turno tiene transacciones, quizás deberíamos advertir o forzar cierre. 
          // Por ahora, para evitar pérdida de datos, mantenemos el comportamiento pero idealmente se debería cerrar.
          // Para este caso específico solicitado (Admin omite -> Cajero entra), transactions será 0.
        }
      }

      if (!shift) {
        setShiftModalMode('open');
        setShowShiftModal(true);
      }
    }
  }, [user, shift]);

  // --- HANDLERS ---
  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setActiveTab('currency');
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('currency');
  };

  const handleOpenShift = (amount, usdAmount = 0) => {
    const newShift = {
      id: Date.now(),
      userId: user.id,
      userName: user.name,
      startTime: new Date().toISOString(),
      startAmount: amount,
      usdStartAmount: usdAmount,
      usdOnHand: usdAmount,
      eurStartAmount: 0,
      eurOnHand: 0,
      currencyPayouts: 0,
      salesTotal: 0, // Not used but kept for compatibility
      transactions: 0
    };
    setShift(newShift);
    setShowShiftModal(false);
  };

  const [showShiftReceipt, setShowShiftReceipt] = useState(false);
  const [lastClosedShift, setLastClosedShift] = useState(null);

  const handleCloseShift = (finalAmount, finalUsdAmount = 0, finalEurAmount = 0) => {
    // Expected = Start - Payouts (DOP logic)
    // Note: Payouts are in DOP, so Start Amount (DOP) - Payouts (DOP) = Expected Cash (DOP)
    const expectedAmount = (shift.startAmount || 0) - (shift.currencyPayouts || 0);
    const expectedUsd = (shift.usdOnHand || 0);
    const expectedEur = (shift.eurOnHand || 0);

    const closedShift = {
      ...shift,
      endTime: new Date().toISOString(),
      finalAmount,
      finalUsdAmount,
      finalEurAmount,
      expectedAmount: expectedAmount,
      difference: finalAmount - expectedAmount,
      usdDifference: finalUsdAmount - expectedUsd,
      eurDifference: finalEurAmount - expectedEur
    };
    
    setShiftHistory(prev => [closedShift, ...prev]);
    setShift(null);
    setShowShiftModal(false);
    
    setLastClosedShift(closedShift);
    setShowShiftReceipt(true);
  };

  const handleShiftReceiptClose = () => {
    setShowShiftReceipt(false);
    setLastClosedShift(null);
    handleLogout();
  };

  const [storeSettings, setStoreSettings] = useState(() => {
    const saved = localStorage.getItem('divisas-settings');
    const defaultSettings = {
      name: 'CASA DE CAMBIO',
      rnc: '000-0000000-0',
      phone: '(809) 000-0000',
      address: 'Calle Principal #123',
      receiptMessage: '¡Gracias por su preferencia!',
      exchangeRate: 58.50,
      exchangeRateEur: 64.00
    };
    
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('divisas-settings', JSON.stringify(storeSettings));
  }, [storeSettings]);

  const handleUpdateSettings = (newSettings) => {
    setStoreSettings(newSettings);
  };

  // --- USERS STATE ---
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('divisas-users');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error("Error loading users:", e);
    }
    
    return [
      { id: 1, name: 'Admin General', pin: '1234', role: 'admin' },
      { id: 2, name: 'Agente Divisas', pin: '0000', role: 'currency_agent' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('divisas-users', JSON.stringify(users));
  }, [users]);

  const handleAddUser = (newUser) => {
    setUsers(prev => [...prev, { ...newUser, id: Date.now() }]);
  };

  const handleUpdateUser = (updatedUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleDeleteUser = (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const [shiftHistory, setShiftHistory] = useState(() => {
    const saved = localStorage.getItem('divisas-shift-history');
    return saved ? JSON.parse(saved) : [];
  });

  const [salesHistory, setSalesHistory] = useState(() => {
    const saved = localStorage.getItem('divisas-sales-history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('divisas-shift-history', JSON.stringify(shiftHistory));
  }, [shiftHistory]);

  useEffect(() => {
    localStorage.setItem('divisas-sales-history', JSON.stringify(salesHistory));
  }, [salesHistory]);

  const handleCurrencyTransaction = (transactionData) => {
    if (!shift) {
      alert("Debe abrir la caja para realizar cambios de divisas.");
      return false;
    }

    const { amount, dopAmount, breakdown, currency = 'USD' } = transactionData;

    setShift(prev => {
      const updates = {
        currencyPayouts: (prev.currencyPayouts || 0) + dopAmount, // Total DOP paid out
        transactions: prev.transactions + 1
      };

      if (currency === 'EUR') {
        updates.eurOnHand = (prev.eurOnHand || 0) + amount;
      } else {
        updates.usdOnHand = (prev.usdOnHand || 0) + amount; // Fallback to USD logic or explicit USD
      }

      return { ...prev, ...updates };
    });

    const record = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: 'exchange',
      currency: currency,
      amount,
      dopAmount,
      rate: transactionData.rate,
      breakdown,
      shiftId: shift.id,
      cashier: user.name
    };
    
    setSalesHistory(prev => [record, ...prev]);
    return true;
  };

  const menuItems = [
    { id: 'currency', label: 'Divisas', icon: DollarSign, roles: ['admin', 'currency_agent'] },
    { id: 'reports', label: 'Informes', icon: BarChart3, roles: ['admin'] },
    { id: 'users', label: 'Usuarios', icon: UserCog, roles: ['admin'] },
    { id: 'settings', label: 'Configuración', icon: Settings, roles: ['admin'] },
  ].filter(item => user && item.roles.includes(user.role));

  if (!user) {
    return <LoginView onLogin={handleLogin} settings={storeSettings} users={users} />;
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-900/20">
            <DollarSign className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">DIVISAS<span className="text-green-500">APP</span></h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">v1.0</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-green-600 text-white shadow-lg shadow-green-900/40 translate-x-1' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={22} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900 space-y-2">
          
          {/* Shift Info */}
          {shift && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Caja (USD)</p>
              <div className="flex justify-between items-end">
                <span className="font-bold text-green-400">${shift.usdOnHand?.toLocaleString() || 0}</span>
                <span className="text-xs text-slate-500">{shift.transactions} ops</span>
              </div>
            </div>
          )}

          <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-xs text-white">
               {user.name.charAt(0)}
             </div>
             <div className="overflow-hidden flex-1">
               <p className="text-sm font-bold truncate">{user.name}</p>
               <p className="text-xs text-green-400 capitalize">{user.role}</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => {
                setShiftModalMode('close');
                setShowShiftModal(true);
              }}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2 rounded-lg text-xs font-medium transition-colors"
              title="Cerrar Caja"
            >
              <DollarSign size={16} />
              Cerrar
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-400 py-2 rounded-lg text-xs font-medium transition-colors"
              title="Salir"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* 2. ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full bg-slate-50 lg:ml-64 transition-all duration-300">
        
        {/* Header Superior (Móvil) */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
          <span className="font-bold text-slate-800 tracking-wide">DIVISAS APP</span>
          <div className="w-8"></div>
        </header>

        {/* Contenido Dinámico */}
        <div className="flex-1 overflow-hidden p-4 lg:p-6 relative">
          <div className="h-full flex flex-col">
            
            {/* VISTA: DIVISAS */}
            {activeTab === 'currency' && (
              <CurrencyView 
                settings={storeSettings}
                onUpdateSettings={handleUpdateSettings}
                onTransaction={handleCurrencyTransaction}
              />
            )}

            {/* VISTA: INFORMES */}
            {activeTab === 'reports' && (
              <ReportsView 
                shiftHistory={shiftHistory}
                salesHistory={salesHistory}
              />
            )}

            {/* VISTA: CONFIGURACIÓN */}
            {activeTab === 'settings' && (
              <SettingsView 
                settings={storeSettings}
                onSave={handleUpdateSettings}
                // Data Management Props
                users={users}
                setUsers={setUsers}
                shiftHistory={shiftHistory}
                setShiftHistory={setShiftHistory}
                salesHistory={salesHistory}
                setSalesHistory={setSalesHistory}
              />
            )}

            {/* VISTA: USUARIOS */}
            {activeTab === 'users' && (
              <UsersView 
                users={users}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}

          </div>
        </div>
      </main>

      {/* Overlay Oscuro (Móvil) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <ShiftModal 
        isOpen={showShiftModal}
        mode={shiftModalMode}
        onClose={() => setShowShiftModal(false)}
        onConfirm={shiftModalMode === 'open' ? handleOpenShift : handleCloseShift}
        onSkip={() => handleOpenShift(0, 0)}
        canSkip={user?.role === 'admin'} 
        currentShift={shift}
        showCurrencyInput={true}
      />

      {/* Shift Receipt */}
      <ShiftReceipt
        isOpen={showShiftReceipt}
        onClose={handleShiftReceiptClose}
        shift={lastClosedShift}
        settings={storeSettings}
      />
    </div>
  );
}
