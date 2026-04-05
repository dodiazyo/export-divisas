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
  Loader2,
  Activity,
  Vault,
  Sun,
  Moon,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { api } from './lib/api';

import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import ForgotPasswordView from './components/ForgotPasswordView';
import ResetPasswordView from './components/ResetPasswordView';
import ShiftModal from './components/ShiftModal';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import UsersView from './components/UsersView';
import ShiftReceipt from './components/ShiftReceipt';
import CurrencyView from './components/CurrencyView';
import CapitalInjectionModal from './components/CapitalInjectionModal';
import CashInModal from './components/CashInModal';
import ChangePinModal from './components/ChangePinModal';
import CashRegisterView from './components/CashRegisterView';
import MonitorView from './components/MonitorView';
import VaultView from './components/VaultView';

export default function App() {
  const [activeTab, setActiveTab] = useState('currency');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // Detectar token de reset en la URL (?token=xxx o /reset-password?token=xxx)
  const resetToken = new URLSearchParams(window.location.search).get('token');

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [shift, setShift] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState('open');
  const [showInjectionModal, setShowInjectionModal] = useState(false);

  const [showShiftReceipt, setShowShiftReceipt] = useState(false);
  const [lastClosedShift, setLastClosedShift] = useState(null);
  const [injectionTargetShiftId, setInjectionTargetShiftId] = useState(null);
  const [showCashInModal, setShowCashInModal] = useState(false);
  const [cashInTarget, setCashInTarget] = useState({ shiftId: null, cashierName: '' });
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [vault, setVault] = useState(null);
  const [checkingShift, setCheckingShift] = useState(false);
  const [showRateAlert, setShowRateAlert] = useState(false);

  // --- THEME PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

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

        // Load vault + rate alert for admins
        if (savedUser) {
          const u = JSON.parse(savedUser);
          if (u.role === 'admin') {
            api.getVault().then(setVault).catch(() => {});
            const rateUpdatedAt = settingsData?.rateUpdatedAt;
            const isToday = rateUpdatedAt && new Date(rateUpdatedAt).toDateString() === new Date().toDateString();
            if (!isToday) setShowRateAlert(true);
          }
        }
      } catch (err) {
        console.error('Failed to init app', err);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  // Cajeros no ven modal automático — ven pantalla de espera con botón manual

  // --- AUTO-REFRESH ACTIVE SHIFT + VAULT ---
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const freshShift = await api.getActiveShift();
        setShift(freshShift);
        if (user.role === 'admin' || user.role === 'it') {
          api.getVault().then(setVault).catch(() => {});
        }
      } catch {}
    }, 5000); // cada 5 segundos
    return () => clearInterval(interval);
  }, [user]);

  // --- HANDLERS ---
  const handleLogin = async (loggedInUser, token, tenant = null) => {
    localStorage.setItem('token', token);
    localStorage.setItem('divisas-user', JSON.stringify(loggedInUser));
    if (tenant) {
      localStorage.setItem('divisas-tenant-id', tenant.id);
      localStorage.setItem('divisas-tenant-name', tenant.businessName);
    }
    setShowRegister(false);
    setUser(loggedInUser);
    if (loggedInUser.mustChangePin && loggedInUser.role !== 'admin') setShowChangePinModal(true);

    // Fetch initial data after login
    setLoading(true);
    try {
      const [settingsData, activeShiftData] = await Promise.all([
        api.getSettings(),
        api.getActiveShift()
      ]);
      setStoreSettings(settingsData);
      setShift(activeShiftData);
      if (loggedInUser.role === 'admin') {
        api.getVault().then(setVault).catch(() => {});
        // Check if exchange rate was updated today
        const rateUpdatedAt = settingsData?.rateUpdatedAt;
        const isToday = rateUpdatedAt && new Date(rateUpdatedAt).toDateString() === new Date().toDateString();
        if (!isToday) setShowRateAlert(true);
      }
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
    // Keep tenant context so PIN login still works on same device
  };

  const handleOpenShift = async (amount, usdAmount = 0, dopBreakdown = {}, usdBreakdown = {}, openingMeta = {}) => {
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
        cashIns: [],
        cashInsTotal: 0,
        transactions: 0,
        totalGain: 0,
        // Denomination tracking
        startDopBreakdown: dopBreakdown,
        startUsdBreakdown: usdBreakdown,
        openingMeta,  // { adminDopBreakdown, cashierDopBreakdown, dopDifference, ... }
      };

      const res = await api.openShift(newShiftData);
      setShift(res);
      setShowShiftModal(false);
      // Refrescar vault: se descontó el dinero entregado a la caja
      api.getVault().then(setVault).catch(() => {});
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
        (shiftData.cashInsTotal || 0) +
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

      // Fetch transactions for this shift to include in receipt
      let transactionsList = [];
      try {
        const allTx = await api.getTransactions();
        transactionsList = allTx
          .filter(t => t.shift_id === shift.id)
          .map(t => ({ id: t.id, type: t.type, date: t.date, ...t.data }));
      } catch {}

      // Normalize shape for ShiftReceipt (server returns snake_case + nested data)
      const d = res.data || closedData;
      const normalizedShift = {
        id: res.id,
        userName: res.user_name,
        startTime: res.start_time,
        endTime: res.closed_at,
        startAmount: d.startAmount,
        currencyPayouts: d.currencyPayouts,
        expectedAmount: d.expectedAmount,
        finalAmount: d.finalAmount,
        difference: d.difference,
        usdOnHand: d.usdOnHand,
        usdDifference: d.usdDifference,
        totalGain: d.totalGain,
        dopBreakdown: d.dopBreakdown,
        usdBreakdown: d.usdBreakdown,
        externalSalesTotal: d.externalSalesTotal,
        totalDOPInjected: d.totalDOPInjected,
        injections: d.injections || [],
        cashInsTotal: d.cashInsTotal,
        transactionsList,
      };

      setShift(null);
      setShowShiftModal(false);
      setLastClosedShift(normalizedShift);
      setShowShiftReceipt(true);
      // Refrescar vault: el dinero regresó a la bodega
      api.getVault().then(setVault).catch(() => {});

      // WhatsApp summary notification (if store phone configured)
      const waPhone = storeSettings?.phone?.replace(/\D/g, '');
      if (waPhone) {
        const duration = Math.round((Date.now() - new Date(shiftData.startTime || shift.start_time).getTime()) / 60000);
        const storeName = storeSettings?.name || 'Casa de Cambio';
        const msg = [
          `📊 *Cierre de Turno — ${storeName}*`,
          `👤 Cajero: ${user.name}`,
          `⏱ Duración: ${duration} min`,
          ``,
          `💵 USD recibidos: $${(shiftData.usdOnHand || 0).toLocaleString()}`,
          `💶 EUR recibidos: €${(shiftData.eurOnHand || 0).toLocaleString()}`,
          `💰 DOP pagado: RD$ ${(shiftData.currencyPayouts || 0).toLocaleString()}`,
          `📈 Ganancia est.: RD$ ${(shiftData.totalGain || 0).toLocaleString()}`,
          `🔢 Operaciones: ${shiftData.transactions || 0}`,
          ``,
          `✅ Cierre registrado — ${new Date().toLocaleString('es-DO')}`,
        ].join('\n');
        window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (err) {
      alert('Error cerrando caja: ' + err.message);
    }
  };

  const handleCheckShift = async () => {
    setCheckingShift(true);
    try {
      const freshShift = await api.getActiveShift();
      setShift(freshShift);
    } catch {}
    setCheckingShift(false);
  };

  const handleShiftReceiptClose = () => {
    setShowShiftReceipt(false);
    setLastClosedShift(null);
    // No logout — user stays in the system and can open a new shift or wait
  };

  // --- Capital injection (admin only) ---
  const handleCapitalInjection = async ({ shiftId, currency, amount, note, adminName, denominations }) => {
    try {
      const injection = { id: Date.now(), date: new Date().toISOString(), currency, amount, note, adminName, denominations: denominations || null };
      await api.injectCapital(shiftId, injection);

      // Optimistically update shift state ONLY IF the injection was for the admin's currently open shift
      if (shift && shift.id === shiftId) {
        setShift(prev => {
          const pd = prev.data || {};
          const updates = { injections: [...(pd.injections || []), injection] };
          if (currency === 'USD') {
            updates.usdOnHand = (pd.usdOnHand || 0) + amount;
          } else if (currency === 'EUR') {
            updates.eurOnHand = (pd.eurOnHand || 0) + amount;
          }
          return { ...prev, data: { ...pd, ...updates } };
        });
      }

      setShowInjectionModal(false);
      setInjectionTargetShiftId(null);
      // Refrescar vault y turno tras inyección
      api.getVault().then(setVault).catch(() => {});
      const freshShift = await api.getActiveShift().catch(() => null);
      if (freshShift) setShift(freshShift);
      alert(`Inyección de ${currency === 'DOP' ? 'RD$' : currency === 'EUR' ? '€' : '$'}${amount.toLocaleString()} registrada en Caja #${shiftId}.`);
    } catch (err) {
      alert('Error registrando inyección: ' + err.message);
    }
  };

  // --- Cash In (DOP desde bodega) ---
  const handleCashIn = async ({ shiftId, amount, note, adminName, date }) => {
    try {
      await api.addCashIn(shiftId, { amount, note, adminName, date });

      // Actualizar shift local si es el turno del admin
      if (shift && String(shift.id) === String(shiftId)) {
        setShift(prev => {
          const pd = prev.data || {};
          return {
            ...prev,
            data: {
              ...pd,
              cashIns: [...(pd.cashIns || []), { amount, note, adminName, date }],
              cashInsTotal: (pd.cashInsTotal || 0) + amount,
            },
          };
        });
      }

      setShowCashInModal(false);
      // Refrescar vault y turno tras cash-in
      api.getVault().then(setVault).catch(() => {});
      const freshShift = await api.getActiveShift().catch(() => null);
      if (freshShift) setShift(freshShift);
      alert(`✅ Ingreso de RD$ ${amount.toLocaleString()} registrado en Caja #${shiftId} — ${adminName || 'Admin'}.`);
    } catch (err) {
      alert('Error registrando ingreso: ' + err.message);
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
      (sd.cashInsTotal || 0) +
      (sd.externalSalesTotal || 0) -
      (sd.currencyPayouts || 0);

    if (dopAmount > availableFunds) {
      const fmt = (n) => n.toLocaleString('es-DO', { minimumFractionDigits: 2 });
      alert(`⚠️ FONDOS INSUFICIENTES\n\nNecesitas: RD$ ${fmt(dopAmount)}\nDisponible en caja: RD$ ${fmt(availableFunds)}\n\nDesglose caja:\n• Inicio: RD$ ${fmt(sd.startAmount || 0)}\n• Inyecciones DOP: RD$ ${fmt(totalDOPInjected)}\n• Cash-ins: RD$ ${fmt(sd.cashInsTotal || 0)}\n• Pagado (cambios): RD$ ${fmt(sd.currencyPayouts || 0)}`);
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

      // Refrescar turno desde el servidor para tener los totales exactos
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
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>💱</div>
        <div style={{
          width: 40, height: 40, border: '3px solid var(--border)',
          borderTop: '3px solid var(--gold)', borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ letterSpacing: 4, fontWeight: 700, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>
          Cargando sistema...
        </p>
      </div>
    );
  }

  if (!user) {
    // Link de reset de contraseña (?token=xxx)
    if (resetToken) {
      return (
        <ResetPasswordView
          token={resetToken}
          onSuccess={() => {
            // Limpiar token de la URL y mostrar login
            window.history.replaceState({}, '', window.location.pathname);
            window.location.reload();
          }}
        />
      );
    }
    if (showRegister) {
      return (
        <RegisterView
          onRegistered={(token, user, tenant) => handleLogin(user, token, tenant)}
          onGoLogin={() => setShowRegister(false)}
        />
      );
    }
    if (showForgotPassword) {
      return <ForgotPasswordView onBack={() => setShowForgotPassword(false)} />;
    }
    return (
      <LoginView
        onLogin={handleLogin}
        onGoRegister={() => setShowRegister(true)}
        onForgotPassword={() => setShowForgotPassword(true)}
      />
    );
  }

  // --- Pantalla de espera para cajero sin turno asignado ---
  if (user?.role === 'currency_agent' && !shift && !showShiftReceipt) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-base)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 0,
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          {/* Header */}
          <div style={{
            background: 'var(--gradient-card-header)',
            borderBottom: '1px solid var(--border)',
            padding: '28px 24px 22px', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--bg-elevated)',
              border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <Clock size={30} color="var(--text-subtle)" />
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              Turno no iniciado
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-subtle)', lineHeight: 1.5 }}>
              Espera que el administrador te asigne el capital de apertura
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Info box */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'rgba(212,168,67,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <DollarSign size={16} color="var(--gold)" />
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  ¿Qué sigue?
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.6 }}>
                  El administrador debe abrir la caja y asignarte el monto. Una vez que lo haga, podrás confirmar los billetes y comenzar.
                </p>
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={handleCheckShift}
              disabled={checkingShift}
              style={{
                width: '100%', height: 48, borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                color: 'var(--bg-base)', fontSize: 14, fontWeight: 800,
                cursor: checkingShift ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: checkingShift ? 0.7 : 1,
              }}
            >
              {checkingShift
                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
                : <><RefreshCw size={16} /> Ya me asignaron — Verificar</>
              }
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                width: '100%', height: 40, borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-subtle)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>

          {/* Footer — usuario */}
          <div style={{
            padding: '12px 24px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13, color: 'var(--bg-base)',
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 1 }}>Cajero</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Computed available DOP (for sidebar display) ---
  const sd = shift?.data || {};
  const totalDOPInjected = (sd.injections || []).filter(i => i.currency === 'DOP').reduce((sum, i) => sum + i.amount, 0);
  const availableDOP = shift
    ? (sd.startAmount || 0) + totalDOPInjected + (sd.cashInsTotal || 0) + (sd.externalSalesTotal || 0) - (sd.currencyPayouts || 0)
    : 0;

  // --- Menu ---
  const menuItems = [
    { id: 'currency', label: 'Divisas', icon: DollarSign, roles: ['admin', 'currency_agent'] },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'currency_agent'] },
    { id: 'vault', label: 'Bodega', icon: Vault, roles: ['admin'] },
    { id: 'monitor', label: 'Monitor de Cajas', icon: Activity, roles: ['admin', 'it'] },
    { id: 'reports', label: 'Informes', icon: BarChart3, roles: ['admin', 'it'] },
    { id: 'users', label: 'Usuarios', icon: UserCog, roles: ['admin', 'it'] },
    { id: 'settings', label: 'Configuración', icon: Settings, roles: ['admin', 'it'] },
  ].filter(item => user && item.roles.includes(user.role));

  const menuIcons = { currency:'💱', sales:'🛒', vault:'🏦', monitor:'📺', reports:'📊', users:'👥', settings:'⚙️' };

  return (
    <div data-theme={theme} style={{ display:'flex', height:'100vh', background:'var(--bg-base)', color:'var(--text-primary)', overflow:'hidden' }}>

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top:0, left:0, bottom:0, zIndex:50,
        width: 240,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transform: isMobileMenuOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.3s ease',
      }} className={`${isMobileMenuOpen ? '' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(212,168,67,0.3)',
          }}>💱</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>
              DIVISAS <span style={{ color: 'var(--gold)' }}>PRO</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-subtle)', letterSpacing: 2 }}>
              {storeSettings?.name || 'SISTEMA'}
            </div>
          </div>
        </div>

        {/* Vault badge — admin only */}
        {user?.role === 'admin' && vault && (() => {
          const vDOP = Number(vault.dop_balance||0);
          const vUSD = Number(vault.usd_balance||0);
          const vEUR = Number(vault.eur_balance||0);
          const anyNeg = vDOP < 0 || vUSD < 0 || vEUR < 0;
          return (
          <div style={{
            margin: '12px 12px 0',
            background: anyNeg ? 'var(--red-bg)' : 'var(--gradient-vault-badge)',
            border: anyNeg ? '1px solid var(--red-border)' : '1px solid rgba(212,168,67,0.25)',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <span style={{ fontSize:12 }}>{anyNeg ? '⚠️' : '🏦'}</span>
              <span style={{ fontSize:10, fontWeight:700, color: anyNeg ? 'var(--red)' : 'var(--gold)', letterSpacing:1 }}>{anyNeg ? 'BODEGA ⚠' : 'BODEGA'}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontSize:11, color:'var(--text-subtle)' }}>DOP</span>
              <span style={{ fontSize:11, fontWeight:700, color: vDOP < 0 ? 'var(--red)' : 'var(--gold)' }}>RD$ {vDOP.toLocaleString()}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontSize:11, color:'var(--text-subtle)' }}>USD</span>
              <span style={{ fontSize:11, fontWeight:700, color: vUSD < 0 ? 'var(--red)' : 'var(--green)' }}>$ {vUSD.toLocaleString()}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'var(--text-subtle)' }}>EUR</span>
              <span style={{ fontSize:11, fontWeight:700, color: vEUR < 0 ? 'var(--red)' : 'var(--blue)' }}>€ {vEUR.toLocaleString()}</span>
            </div>
          </div>
          );
        })()}

        {/* Turno activo badge */}
        {shift && (
          <div style={{
            margin: '8px 12px 0',
            background: 'var(--gradient-shift-badge)',
            border: '1px solid #16a34a40',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)' }} />
              <span style={{ fontSize:10, fontWeight:700, color:'var(--green)', letterSpacing:1 }}>TURNO ACTIVO</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontSize:11, color:'var(--text-subtle)' }}>DOP disponible</span>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--gold)' }}>RD$ {availableDOP.toLocaleString()}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontSize:11, color:'var(--text-subtle)' }}>USD en caja</span>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>${(sd.usdOnHand||0).toLocaleString()}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'var(--text-subtle)' }}>Operaciones</span>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)' }}>{sd.transactions||0}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 10px', overflowY:'auto' }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button key={item.id}
                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:10,
                  padding:'10px 14px', borderRadius:10, marginBottom:4,
                  border:'none', cursor:'pointer', textAlign:'left',
                  background: active ? 'linear-gradient(135deg, var(--gold-bg), var(--bg-elevated))' : 'transparent',
                  color: active ? 'var(--gold)' : 'var(--text-muted)',
                  borderLeft: active ? '3px solid var(--gold)' : '3px solid transparent',
                  fontWeight: active ? 700 : 400,
                  fontSize: 14,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize:18 }}>{menuIcons[item.id]}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:'12px 10px', borderTop:'1px solid var(--border)' }}>


          {/* User */}
          <div style={{
            background:'var(--bg-card)', borderRadius:10, padding:'10px 12px',
            display:'flex', alignItems:'center', gap:10, marginBottom:8,
            border:'1px solid var(--border)',
          }}>
            <div style={{
              width:34, height:34, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg, var(--gold), var(--gold-light))',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:800, fontSize:14, color:'var(--bg-base)',
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow:'hidden', flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize:10, color:'var(--gold)', textTransform:'uppercase', letterSpacing:1 }}>{user.role}</div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {shift ? (
              <button onClick={() => { setShiftModalMode('close'); setShowShiftModal(true); }}
                style={{
                  padding:'8px 0', borderRadius:8, border:'1px solid var(--border)',
                  background:'var(--bg-card)', color:'var(--text-secondary)', fontSize:12, fontWeight:600,
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                }}>
                <DollarSign size={13} /> Cerrar caja
              </button>
            ) : (
              <button onClick={() => { setShiftModalMode('open'); setShowShiftModal(true); }}
                style={{
                  padding:'8px 0', borderRadius:8, border:'1px solid #16a34a40',
                  background:'var(--green-bg)', color:'var(--green)', fontSize:12, fontWeight:600,
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                }}>
                <PlusCircle size={13} /> Abrir caja
              </button>
            )}
            <button onClick={handleLogout}
              style={{
                padding:'8px 0', borderRadius:8, border:'1px solid var(--red-border)',
                background:'var(--red-bg)', color:'var(--red)', fontSize:12, fontWeight:600,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4,
              }}>
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{
        flex:1, display:'flex', flexDirection:'column',
        height:'100vh', overflow:'hidden',
        marginLeft: 240, background:'var(--bg-base)',
      }} className="lg:ml-60">

        {/* Header top bar */}
        <header style={{
          height: 56, background:'var(--bg-surface)', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 20px', flexShrink:0,
        }}>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', display:'none' }}
            className="lg:hidden">
            <Menu size={22} />
          </button>

          {/* Título de sección activa */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>{menuIcons[activeTab]}</span>
            <span style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>
              {menuItems.find(m=>m.id===activeTab)?.label}
            </span>
          </div>

          {/* Stats rápidos en el header + toggle */}
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            {shift && (
              <>
                {[
                  { label:'DOP', value:`RD$ ${availableDOP.toLocaleString()}`, color:'var(--gold)' },
                  { label:'USD', value:`$ ${(sd.usdOnHand||0).toLocaleString()}`, color:'var(--green)' },
                  { label:'Ops', value:sd.transactions||0, color:'var(--purple)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'var(--text-subtle)', letterSpacing:1 }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:800, color }}>{value}</div>
                  </div>
                ))}
              </>
            )}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 700,
              }}
            >
              {theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}
              {theme === 'dark' ? 'Claro' : 'Oscuro'}
            </button>
          </div>
        </header>

        {/* Contenido */}
        <div style={{ flex:1, overflow:'auto', padding:'20px' }}>
          <div style={{ animation:'fadeIn 0.25s ease' }}>
            {activeTab === 'currency' && <CurrencyView settings={storeSettings||{}} onTransaction={handleCurrencyTransaction} />}
            {activeTab === 'sales'    && <CashRegisterView onSale={handleExternalSale} shift={shift} settings={storeSettings||{}} />}
            {activeTab === 'vault'    && <VaultView onVaultChange={setVault} />}
            {activeTab === 'reports'  && <ReportsView />}
            {activeTab === 'settings' && <SettingsView settings={storeSettings||{}} onSave={setStoreSettings} />}
            {activeTab === 'users'    && <UsersView />}
            {activeTab === 'monitor'  && (
              <MonitorView
                onOpenInjection={(shiftId) => {
                  setInjectionTargetShiftId(shiftId);
                  setShowInjectionModal(true);
                }}
                onOpenCashIn={(shiftId, cashierName) => {
                  setCashInTarget({ shiftId, cashierName });
                  setShowCashInModal(true);
                }}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:40 }}
        />
      )}

      <ShiftModal
        isOpen={showShiftModal}
        mode={shiftModalMode}
        onClose={() => setShowShiftModal(false)}
        onConfirm={shiftModalMode === 'open' ? handleOpenShift : handleCloseShift}
        onSkip={() => handleOpenShift(0, 0)}
        canSkip={user?.role === 'admin' || user?.role === 'it'}
        currentShift={shift?.data || null}
        showCurrencyInput={true}
        userRole={user?.role}
      />

      <ShiftReceipt
        isOpen={showShiftReceipt}
        onClose={handleShiftReceiptClose}
        shift={lastClosedShift}
        settings={storeSettings || {}}
      />

      <ChangePinModal
        isOpen={showChangePinModal}
        forced={true}
        onChanged={() => {
          setShowChangePinModal(false);
          setUser(prev => prev ? { ...prev, mustChangePin: false } : prev);
        }}
      />

      <CashInModal
        isOpen={showCashInModal}
        onClose={() => setShowCashInModal(false)}
        onConfirm={handleCashIn}
        adminName={user?.name}
        targetShiftId={cashInTarget.shiftId}
        targetCashierName={cashInTarget.cashierName}
      />

      <CapitalInjectionModal
        isOpen={showInjectionModal}
        onClose={() => { setShowInjectionModal(false); setInjectionTargetShiftId(null); }}
        onConfirm={handleCapitalInjection}
        adminName={user?.name}
        myShiftId={injectionTargetShiftId ?? shift?.id}
      />

      {/* Rate verification alert */}
      {showRateAlert && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid rgba(212,168,67,0.4)',
            borderRadius: 20, width: '100%', maxWidth: 380,
            boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,168,67,0.15)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, var(--gold-bg), var(--bg-elevated))',
              borderBottom: '1px solid rgba(212,168,67,0.2)',
              padding: '22px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💱</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold-light)', marginBottom: 4 }}>
                Verificar Tasa de Cambio
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
                La tasa no ha sido actualizada hoy
              </div>
            </div>

            {/* Current rates */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Compra USD', value: storeSettings?.exchangeRate, sym: 'RD$', color: 'var(--green)' },
                  { label: 'Venta USD',  value: storeSettings?.salesRate,    sym: 'RD$', color: 'var(--green)' },
                  { label: 'Compra EUR', value: storeSettings?.exchangeRateEur, sym: 'RD$', color: 'var(--blue)' },
                  { label: 'Venta EUR',  value: storeSettings?.salesRateEur,    sym: 'RD$', color: 'var(--blue)' },
                ].map(({ label, value, sym, color }) => (
                  <div key={label} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-subtle)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'monospace' }}>{sym} {Number(value || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => { setShowRateAlert(false); setActiveTab('settings'); }}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                  color: 'var(--bg-base)', fontWeight: 900, fontSize: 14,
                  boxShadow: '0 4px 16px rgba(212,168,67,0.35)',
                }}
              >
                ✏️ Actualizar tasa ahora
              </button>
              <button
                onClick={() => setShowRateAlert(false)}
                style={{
                  width: '100%', padding: '11px 0', borderRadius: 12, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-subtle)', fontWeight: 600, fontSize: 13,
                }}
              >
                La tasa está bien, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
