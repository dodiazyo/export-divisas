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
  Loader2
} from 'lucide-react';
import { api } from './lib/api';

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

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [shift, setShift] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState('open');
  const [showInjectionModal, setShowInjectionModal] = useState(false);

  const [showShiftReceipt, setShowShiftReceipt] = useState(false);
  const [lastClosedShift, setLastClosedShift] = useState(null);

  // --- INIT DATA ---
  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const savedUser = localStorage.getItem('divisas-user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        const [settingsData, activeShiftData] = await Promise.all([
          api.getSettings(),
          api.getActiveShift()
        ]);
        
        setStoreSettings(settingsData);
        setShift(activeShiftData);
      } catch (err) {
        console.error('Failed to init app', err);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    if (user && !loading && !shift && !showShiftReceipt) {
      setShiftModalMode('open');
      setShowShiftModal(true);
    }
  }, [user, shift, loading, showShiftReceipt]);

  // --- HANDLERS ---
  const handleLogin = async (loggedInUser, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('divisas-user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    
    // Fetch initial data after login
    setLoading(true);
    try {
      const [settingsData, activeShiftData] = await Promise.all([
        api.getSettings(),
        api.getActiveShift()
      ]);
      setStoreSettings(settingsData);
      setShift(activeShiftData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setActiveTab('currency');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setShift(null);
    localStorage.removeItem('token');
    localStorage.removeItem('divisas-user');
    setActiveTab('currency');
  };

  const handleOpenShift = async (amount, usdAmount = 0) => {
    try {
      const newShiftData = {
        startTime: new Date().toISOString(),
        startAmount: amount,
        usdStartAmount: usdAmount,
        usdOnHand: usdAmount,
        eurStartAmount: 0,
        eurOnHand: 0,
        currencyPayouts: 0,
        salesTotal: 0,
        externalSalesTotal: 0,
        injections: [],
        transactions: 0,
        totalGain: 0,
      };
      
      const res = await api.openShift(newShiftData);
      setShift(res);
      setShowShiftModal(false);
    } catch (err) {
      alert('Error abriendo turno: ' + err.message);
    }
  };

  const handleCloseShift = async (finalAmount, finalUsdAmount = 0, dopBreakdown = {}, usdBreakdown = {}) => {
    if (!shift) return;

    try {
      const shiftData = shift.data || {};
      const totalDOPInjected = (shiftData.injections || [])
        .filter(i => i.currency === 'DOP')
        .reduce((sum, i) => sum + i.amount, 0);

      const expectedAmount =
        (shiftData.startAmount || 0) +
        totalDOPInjected +
        (shiftData.externalSalesTotal || 0) -
        (shiftData.currencyPayouts || 0);

      const expectedUsd = shiftData.usdOnHand || 0;
      const expectedEur = shiftData.eurOnHand || 0;

      const closedData = {
        ...shiftData,
        finalAmount,
        finalUsdAmount,
        finalEurAmount: expectedEur,
        dopBreakdown,
        usdBreakdown,
        expectedAmount,
        difference: finalAmount - expectedAmount,
        usdDifference: finalUsdAmount - expectedUsd,
        eurDifference: 0,
        totalGain: shiftData.totalGain || 0,
        totalDOPInjected,
      };

      const res = await api.closeShift(shift.id, closedData);
      setShift(null);
      setShowShiftModal(false);
      setLastClosedShift(res);
      setShowShiftReceipt(true);
    } catch (err) {
      alert('Error cerrando caja: ' + err.message);
    }
  };

  const handleShiftReceiptClose = () => {
    setShowShiftReceipt(false);
    setLastClosedShift(null);
    handleLogout();
  };

  // --- Capital injection (admin only) ---
  const handleCapitalInjection = async ({ shiftId, currency, amount, note, adminName }) => {
    try {
      const injection = { id: Date.now(), date: new Date().toISOString(), currency, amount, note, adminName };
      await api.injectCapital(shiftId, injection);

      // Optimistically update shift state ONLY IF the injection was for the admin's currently open shift
      if (shift && shift.id === shiftId) {
        setShift(prev => {
          const pd = prev.data || {};
          const updates = { injections: [...(pd.injections || []), injection] };
          if (currency === 'USD') {
            updates.usdOnHand = (pd.usdOnHand || 0) + amount;
          }
          return { ...prev, data: { ...pd, ...updates } };
        });
      }

      setShowInjectionModal(false);
      alert(`Inyección de ${currency === 'DOP' ? 'RD$' : '$'}${amount.toLocaleString()} registrada exitosamente.`);
    } catch (err) {
      alert('Error registrando inyección: ' + err.message);
    }
  };

  // --- Currency transaction ---
  const handleCurrencyTransaction = async (transactionData) => {
    if (!shift) {
      alert('Debe abrir la caja para realizar cambios de divisas.');
      return false;
    }

    const { amount, dopAmount, breakdown, currency = 'USD', dopBreakdown, rate } = transactionData;
    const sd = shift.data || {};

    const totalDOPInjected = (sd.injections || [])
      .filter(i => i.currency === 'DOP')
      .reduce((sum, i) => sum + i.amount, 0);

    const availableFunds =
      (sd.startAmount || 0) +
      totalDOPInjected +
      (sd.externalSalesTotal || 0) -
      (sd.currencyPayouts || 0);

    if (dopAmount > availableFunds) {
      alert(`⚠️ FONDOS INSUFICIENTES...`);
      return false;
    }

    const buyRate = rate;
    const sellRate = currency === 'USD'
      ? (storeSettings?.salesRate || buyRate + 1.5)
      : (storeSettings?.salesRateEur || buyRate + 2.0);
    const totalGain = (sellRate - buyRate) * amount;

    const record = {
      date: new Date().toISOString(),
      currency,
      amount,
      dopAmount,
      rate: buyRate,
      salesRate: sellRate,
      gain: totalGain,
      breakdown,
      dopBreakdown,
      cashier: user.name,
    };

    try {
      await api.registerTransaction(shift.id, 'exchange', record);

      // Fetch the updated shift to sync DB accurately
      const activeShift = await api.getActiveShift();
      setShift(activeShift);
      return true;
    } catch (err) {
      alert('Error procesando transacción: ' + err.message);
      return false;
    }
  };

  // --- External sale ---
  const handleExternalSale = async ({ items, total }) => {
    if (!shift) return;

    const record = {
      date: new Date().toISOString(),
      items,
      total,
      cashier: user.name,
    };

    try {
      await api.registerTransaction(shift.id, 'external_sale', record);
      
      const activeShift = await api.getActiveShift();
      setShift(activeShift);
    } catch (err) {
      alert('Error guardando venta: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="tracking-widest font-bold">CARGANDO SISTEMA...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  // --- Computed available DOP (for sidebar display) ---
  const sd = shift?.data || {};
  const totalDOPInjected = (sd.injections || []).filter(i => i.currency === 'DOP').reduce((sum, i) => sum + i.amount, 0);
  const availableDOP = shift
    ? (sd.startAmount || 0) + totalDOPInjected + (sd.externalSalesTotal || 0) - (sd.currencyPayouts || 0)
    : 0;

  // --- Menu ---
  const menuItems = [
    { id: 'currency', label: 'Divisas', icon: DollarSign, roles: ['admin', 'currency_agent'] },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'currency_agent'] },
    { id: 'reports', label: 'Informes', icon: BarChart3, roles: ['admin'] },
    { id: 'users', label: 'Usuarios', icon: UserCog, roles: ['admin'] },
    { id: 'settings', label: 'Configuración', icon: Settings, roles: ['admin'] },
  ].filter(item => user && item.roles.includes(user.role));

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
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">v3.0</p>
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
                  ${(sd.usdOnHand || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Operaciones</span>
                <span className="text-xs text-slate-500">{sd.transactions || 0}</span>
              </div>
            </div>
          )}

          {/* Injection button — admin only */}
          {user?.role === 'admin' && (
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
                settings={storeSettings || {}}
                onTransaction={handleCurrencyTransaction}
              />
            )}

            {activeTab === 'sales' && (
              <CashRegisterView
                onSale={handleExternalSale}
                shift={shift}
                settings={storeSettings || {}}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={storeSettings || {}}
                onSave={setStoreSettings}
              />
            )}

            {activeTab === 'users' && (
              <UsersView />
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
        currentShift={shift?.data || null}
        showCurrencyInput={true}
      />

      <ShiftReceipt
        isOpen={showShiftReceipt}
        onClose={handleShiftReceiptClose}
        shift={lastClosedShift}
        settings={storeSettings || {}}
      />

      <CapitalInjectionModal
        isOpen={showInjectionModal}
        onClose={() => setShowInjectionModal(false)}
        onConfirm={handleCapitalInjection}
        adminName={user?.name}
        myShiftId={shift?.id}
      />
    </div>
  );
}
