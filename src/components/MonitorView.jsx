import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, AlertCircle, Loader2, DollarSign, Clock } from 'lucide-react';
import { api } from '../lib/api';

export default function MonitorView({ settings }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchShifts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const activeShifts = await api.getActiveShifts();
      setShifts(activeShifts || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin shifts monitor', err);
      setError('Error al cargar las cajas activas. Intente nuevamente.');
    } finally {
      if (isRefresh) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      fetchShifts(true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" size={28} />
              Monitor de Cajas
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Supervisa el balance y la actividad en tiempo real de todas las cajas abiertas de la sucursal.
            </p>
          </div>
          
          <button 
            onClick={() => fetchShifts(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin text-blue-500" : "text-slate-400"} />
            {refreshing ? 'Actualizando...' : 'Refrescar'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-800 flex items-center gap-3 border border-red-100 animate-in fade-in">
            <AlertCircle size={20} className="shrink-0" />
            <span className="font-semibold text-sm">{error}</span>
          </div>
        )}

        {/* SHIFTS GRID */}
        {shifts.length === 0 && !error ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Activity className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No hay cajas abiertas</h3>
            <p className="text-slate-500 mt-2 text-sm">Actualmente no hay ningún cajero con su turno abierto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shifts.map(shift => {
              const sd = shift.data || {};
              const startTime = new Date(shift.start_time);
              
              // Standard calculation mimicking backend closing
              const totalDOPInjected = (sd.injections || []).filter(i => i.currency === 'DOP').reduce((sum, i) => sum + i.amount, 0);
              const availableDOP = (sd.startAmount || 0) + totalDOPInjected + (sd.externalSalesTotal || 0) - (sd.currencyPayouts || 0);
              
              const usdOnHand = sd.usdOnHand || 0;
              const eurOnHand = sd.eurOnHand || 0;
              const totalGain = sd.totalGain || 0;
              const operations = sd.transactions || 0;

              return (
                <div key={shift.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 overflow-hidden transition-all group">
                  
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex flex-col items-center justify-center font-bold text-lg">
                        {shift.user_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 leading-tight truncate max-w-[140px]" title={shift.user_name}>
                          {shift.user_name}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 w-max shadow-sm tracking-wide">
                           <Clock size={10} className="text-blue-500" />
                           {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-col items-end">
                       <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Estado</span>
                       <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                         <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                         ABIERTO
                       </span>
                    </div>
                  </div>

                  {/* Card Body - Balances */}
                  <div className="p-5 space-y-4">
                    
                    <div className="flex items-end justify-between border-b border-slate-50 pb-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <DollarSign size={10}/> DOP Disponible
                        </p>
                        <h4 className="text-2xl font-black text-slate-800 mt-1">
                          RD$ {availableDOP.toLocaleString(undefined, {minimumFractionDigits:0})}
                        </h4>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inscrito</p>
                        <p className="text-sm font-bold text-slate-500 mt-0.5" title="Monto Inicial + Inyecciones">
                          + RD$ {((sd.startAmount || 0) + totalDOPInjected).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-50">
                      <div className="bg-green-50/50 p-3 rounded-xl border border-green-100/50">
                         <p className="text-[10px] font-bold text-green-700/60 uppercase tracking-widest">Caja USD</p>
                         <p className="text-lg font-black text-green-700 mt-1">
                           ${usdOnHand.toLocaleString()}
                         </p>
                      </div>
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                         <p className="text-[10px] font-bold text-blue-700/60 uppercase tracking-widest">Caja EUR</p>
                         <p className="text-lg font-black text-blue-700 mt-1">
                           €{eurOnHand.toLocaleString()}
                         </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-yellow-50/50 p-3 rounded-xl border border-yellow-100/50">
                       <div>
                         <p className="text-[10px] font-bold text-yellow-700/60 uppercase tracking-widest">Ganancia (Est.)</p>
                         <p className="text-sm font-black text-yellow-700 mt-0.5">
                           + RD$ {totalGain.toLocaleString(undefined, {minimumFractionDigits: 0})}
                         </p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-bold text-purple-700/60 uppercase tracking-widest">Op. Totales</p>
                         <p className="text-sm font-black text-purple-700 mt-0.5">
                           {operations}
                         </p>
                       </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
