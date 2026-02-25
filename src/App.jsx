import React, { useState, useEffect } from 'react';
import {
  Menu,
  LogOut,
  DollarSign,
  BarChart3,
  Settings,
  UserCog,
  ShoppingCart,
  PlusCircle,
} from 'lucide-react';
import LoginView from './components/LoginView';
import ShiftModal from './components/ShiftModal';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import UsersView from './components/UsersView';
import ShiftReceipt from './components/ShiftReceipt';
import CurrencyView from './components/CurrencyView';
import CapitalInjectionModal from './components/CapitalInjectionModal';
import CashRegisterView from './components/CashRegisterView';

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

  const [showInjectionModal, setShowInjectionModal] = useState(false);

  // Persistencia
  useEffect(() => {
    if (user) localStorage.setItem('divisas-user', JSON.stringify(user));
    else localStorage.removeItem('divisas-user');
  }, [user]);

  useEffect(() => {
    if (shift) localStorage.setItem('divisas-shift', JSON.stringify(shift));
    else localStorage.removeItem('divisas-shift');
  }, [shift]);

  useEffect(() => {
    if (user && !shift) {
      setShiftModalMode('open');
      setShowShiftModal(true);
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
      salesTotal: 0,
      externalSalesTotal: 0,  // External sales DOP total
      injections: [],          // Capital injections log
      transactions: 0,
      totalGain: 0,
    };
    setShift(newShift);
    setShowShiftModal(false);
  };

  const [showShiftReceipt, setShowShiftReceipt] = useState(false);
  const [lastClosedShift, setLastClosedShift] = useState(null);

  const handleCloseShift = (finalAmount, finalUsdAmount = 0, dopBreakdown = {}, usdBreakdown = {}) => {
    const totalDOPInjected = (shift.injections || [])
      .filter(i => i.currency === 'DOP')
      .reduce((sum, i) => sum + i.amount, 0);

    const expectedAmount =
      (shift.startAmount || 0) +
      totalDOPInjected +
      (shift.externalSalesTotal || 0) -
      (shift.currencyPayouts || 0);

    const expectedUsd = shift.usdOnHand || 0;
    const expectedEur = shift.eurOnHand || 0;

    const closedShift = {
      ...shift,
      endTime: new Date().toISOString(),
      finalAmount,
      finalUsdAmount,
      finalEurAmount: expectedEur,
      dopBreakdown,
      usdBreakdown,
      expectedAmount,
      difference: finalAmount - expectedAmount,
      usdDifference: finalUsdAmount - expectedUsd,
      eurDifference: 0,
      totalGain: shift.totalGain || 0,
      totalDOPInjected,
      cashierActivity: salesHistory
        .filter(s => s.shiftId === shift.id)
        .reduce((acc, sale) => {
          const name = sale.cashier || 'Sistema';
          if (!acc[name]) acc[name] = { totalDOP: 0, transactions: 0 };
          acc[name].totalDOP += (sale.dopAmount || sale.total || 0);
          acc[name].transactions += 1;
          return acc;
        }, {}),
      transactionsList: salesHistory.filter(s => s.shiftId === shift.id),
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

  // --- Capital injection (admin only) ---
  const handleCapitalInjection = ({ currency, amount, note, adminName }) => {
    const injection = {
      id: Date.now(),
      date: new Date().toISOString(),
      currency,
      amount,
      note,
      adminName,
    };

    setShift(prev => {
      const updates = { injections: [...(prev.injections || []), injection] };
      if (currency === 'USD') {
        updates.usdOnHand = (prev.usdOnHand || 0) + amount;
      }
      return { ...prev, ...updates };
    });

    setShowInjectionModal(false);
    alert(`Inyección de ${currency === 'DOP' ? 'RD$' : '$'}${amount.toLocaleString()} registrada exitosamente.`);
  };

  // --- SETTINGS ---
  const [storeSettings, setStoreSettings] = useState(() => {
    const saved = localStorage.getItem('divisas-settings');
    const defaultSettings = {
      name: 'CASA DE CAMBIO',
      rnc: '000-0000000-0',
      phone: '(809) 000-0000',
      address: 'Calle Principal #123',
      receiptMessage: '¡Gracias por su preferencia!',
      exchangeRate: 58.50,
      salesRate: 60.00,
      exchangeRateEur: 64.00,
      salesRateEur: 66.00,
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('divisas-settings', JSON.stringify(storeSettings));
  }, [storeSettings]);

  const handleUpdateSettings = (newSettings) => {
    setStoreSettings(newSettings);
  };

  // --- USERS ---
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('divisas-users');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error('Error loading users:', e);
    }
    return [
      { id: 1, name: 'Admin General', pin: '1234', role: 'admin' },
      { id: 2, name: 'Agente Divisas', pin: '0000', role: 'currency_agent' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('divisas-users', JSON.stringify(users));
  }, [users]);

  const handleAddUser = (newUser) => setUsers(prev => [...prev, { ...newUser, id: Date.now() }]);
  const handleUpdateUser = (updatedUser) => setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  const handleDeleteUser = (userId) => setUsers(prev => prev.filter(u => u.id !== userId));

  // --- HISTORY ---
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

  // --- Currency transaction ---
  const handleCurrencyTransaction = (transactionData) => {
    if (!shift) {
      alert('Debe abrir la caja para realizar cambios de divisas.');
      return false;
    }

    const { amount, dopAmount, breakdown, currency = 'USD', dopBreakdown, rate } = transactionData;

    // Available DOP = Start + DOP injections + External sales - Currency payouts
    const totalDOPInjected = (shift.injections || [])
      .filter(i => i.currency === 'DOP')
      .reduce((sum, i) => sum + i.amount, 0);

    const availableFunds =
      (shift.startAmount || 0) +
      totalDOPInjected +
      (shift.externalSalesTotal || 0) -
      (shift.currencyPayouts || 0);

    if (dopAmount > availableFunds) {
      alert(
        `⚠️ FONDOS INSUFICIENTES\n\n` +
        `No tiene suficientes pesos en caja para esta operación.\n\n` +
        `Disponible: RD$ ${availableFunds.toLocaleString()}\n` +
        `Requerido:  RD$ ${dopAmount.toLocaleString()}\n` +
        `Faltante:   RD$ ${(dopAmount - availableFunds).toLocaleString()}`
      );
      return false;
    }

    const buyRate = rate;
    const sellRate = currency === 'USD'
      ? (storeSettings.salesRate || buyRate + 1.5)
      : (storeSettings.salesRateEur || buyRate + 2.0);
    const totalGain = (sellRate - buyRate) * amount;

    setShift(prev => {
      const updates = {
        currencyPayouts: (prev.currencyPayouts || 0) + dopAmount,
        transactions: prev.transactions + 1,
        totalGain: (prev.totalGain || 0) + totalGain,
      };
      if (currency === 'EUR') {
        updates.eurOnHand = (prev.eurOnHand || 0) + amount;
      } else {
        updates.usdOnHand = (prev.usdOnHand || 0) + amount;
      }
      return { ...prev, ...updates };
    });

    const record = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: 'exchange',
      currency,
      amount,
      dopAmount,
      rate: buyRate,
      salesRate: sellRate,
      gain: totalGain,
      breakdown,
      dopBreakdown,
      shiftId: shift.id,
      cashier: user.name,
    };

    setSalesHistory(prev => [record, ...prev]);
    return true;
  };

  // --- External sale ---
  const handleExternalSale = ({ items, total }) => {
    if (!shift) return;

    setShift(prev => ({
      ...prev,
      externalSalesTotal: (prev.externalSalesTotal || 0) + total,
      transactions: prev.transactions + 1,
    }));

    const record = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: 'external_sale',
      items,
      total,
      shiftId: shift.id,
      cashier: user.name,
    };

    setSalesHistory(prev => [record, ...prev]);
  };

  // --- Computed available DOP (for sidebar display) ---
  const totalDOPInjected = shift
    ? (shift.injections || []).filter(i => i.currency === 'DOP').reduce((sum, i) => sum + i.amount, 0)
    : 0;
  const availableDOP = shift
    ? (shift.startAmount || 0) + totalDOPInjected + (shift.externalSalesTotal || 0) - (shift.currencyPayouts || 0)
    : 0;

  // --- Menu ---
  const menuItems = [
    { id: 'currency', label: 'Divisas', icon: DollarSign, roles: ['admin', 'currency_agent'] },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'currency_agent'] },
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
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">v2.0</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
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

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900 space-y-2">

          {/* Shift info */}
          {shift && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Disponible DOP</span>
                <span className="font-bold text-green-400 text-sm">
                  RD$ {availableDOP.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">USD en caja</span>
                <span className="font-bold text-green-400 text-sm">
                  ${(shift.usdOnHand || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Operaciones</span>
                <span className="text-xs text-slate-500">{shift.transactions}</span>
              </div>
            </div>
          )}

          {/* Injection button — admin only */}
          {user?.role === 'admin' && shift && (
            <button
              onClick={() => setShowInjectionModal(true)}
              className="w-full py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-black rounded-lg transition-colors flex items-center justify-center gap-1.5 active:scale-95"
            >
              <PlusCircle size={14} />
              Inyectar Capital
            </button>
          )}

          {/* User card */}
          <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-xs text-green-400 capitalize">{user.role}</p>
            </div>
          </div>

          {/* Shift controls */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setShiftModalMode('close'); setShowShiftModal(true); }}
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

      {/* Main area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full bg-slate-50 lg:ml-64 transition-all duration-300">

        {/* Mobile header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
          <span className="font-bold text-slate-800 tracking-wide">DIVISAS APP</span>
          <div className="w-8"></div>
        </header>

        {/* Dynamic content */}
        <div className="flex-1 overflow-hidden p-4 lg:p-6 relative">
          <div className="h-full flex flex-col">

            {activeTab === 'currency' && (
              <CurrencyView
                settings={storeSettings}
                onUpdateSettings={handleUpdateSettings}
                onTransaction={handleCurrencyTransaction}
              />
            )}

            {activeTab === 'sales' && (
              <CashRegisterView
                onSale={handleExternalSale}
                shift={shift}
                settings={storeSettings}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                shiftHistory={shiftHistory}
                salesHistory={salesHistory}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={storeSettings}
                onSave={handleUpdateSettings}
                users={users}
                setUsers={setUsers}
                shiftHistory={shiftHistory}
                setShiftHistory={setShiftHistory}
                salesHistory={salesHistory}
                setSalesHistory={setSalesHistory}
              />
            )}

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

      {/* Mobile overlay */}
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

      <ShiftReceipt
        isOpen={showShiftReceipt}
        onClose={handleShiftReceiptClose}
        shift={lastClosedShift}
        settings={storeSettings}
      />

      <CapitalInjectionModal
        isOpen={showInjectionModal}
        onClose={() => setShowInjectionModal(false)}
        onConfirm={handleCapitalInjection}
        adminName={user?.name}
      />
    </div>
  );
}
