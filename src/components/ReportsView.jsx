import React, { useState, useMemo } from 'react';
import { Calendar, Download, DollarSign, TrendingUp } from 'lucide-react';

export default function ReportsView({ salesHistory = [] }) {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // --- FILTER DATA ---
  const filteredSales = useMemo(() => {
    return salesHistory.filter(sale => {
      const saleDate = sale.date.split('T')[0];
      return saleDate >= dateRange.start && saleDate <= dateRange.end && sale.type === 'exchange';
    });
  }, [salesHistory, dateRange]);

  // --- CALCULATE METRICS ---
  const metrics = useMemo(() => {
    const totalUSD = filteredSales.filter(s => s.currency === 'USD').reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const totalEUR = filteredSales.filter(s => s.currency === 'EUR').reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const totalDOP = filteredSales.reduce((sum, sale) => sum + (sale.dopAmount || 0), 0);
    const totalGain = filteredSales.reduce((sum, sale) => sum + (sale.gain || 0), 0);
    const transactions = filteredSales.length;
    
    return { totalUSD, totalEUR, totalDOP, totalGain, transactions };
  }, [filteredSales]);

  // --- EXPORT CSV ---
  const handleExport = () => {
    const headers = ['ID', 'Fecha', 'Moneda', 'Monto', 'Tasa', 'Total DOP', 'Ganancia (DOP)', 'Cajero'];
    const rows = filteredSales.map(sale => [
      sale.id,
      new Date(sale.date).toLocaleString(),
      sale.currency || 'USD',
      sale.amount,
      sale.rate,
      sale.dopAmount,
      sale.gain || 0,
      sale.cashier
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_divisas_${dateRange.start}_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Historial de Transacciones</h1>
            <p className="text-slate-500 text-sm">Registro detallado por usuario y moneda</p>
          </div>
        </div>

        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* FILTERS TOOLBAR */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-slate-400" />
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={e => setDateRange({...dateRange, start: e.target.value})}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
                  />
                  <span className="text-slate-400">-</span>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={e => setDateRange({...dateRange, end: e.target.value})}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-slate-200"
            >
              <Download size={16} />
              Exportar CSV
            </button>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-green-100 flex flex-col">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">USD Comprados</p>
              <h3 className="text-2xl font-black text-green-700 mt-1">${metrics.totalUSD.toLocaleString()}</h3>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex flex-col">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">EUR Comprados</p>
              <h3 className="text-2xl font-black text-blue-700 mt-1">€{metrics.totalEUR.toLocaleString()}</h3>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">DOP Egresado</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">RD$ {metrics.totalDOP.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-yellow-100 flex flex-col">
              <p className="text-yellow-600 text-[10px] font-bold uppercase tracking-wider">Ganancia Est.</p>
              <h3 className="text-2xl font-black text-yellow-700 mt-1">RD$ {metrics.totalGain.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 flex flex-col">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Operaciones</p>
              <h3 className="text-2xl font-black text-purple-700 mt-1">{metrics.transactions}</h3>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">Fecha y Hora</th>
                    <th className="p-4">Cajero</th>
                    <th className="p-4">Moneda</th>
                    <th className="p-4 text-right">Monto</th>
                    <th className="p-4 text-center">Tasa</th>
                    <th className="p-4 text-right">Pagado (DOP)</th>
                    <th className="p-4 text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400">
                        No hay transacciones en este rango
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-slate-700 font-medium">{new Date(sale.date).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{new Date(sale.date).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                               {sale.cashier?.charAt(0)}
                             </div>
                             <span className="text-sm font-bold text-slate-700">{sale.cashier}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sale.currency === 'EUR' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {sale.currency || 'USD'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-slate-800">
                          {sale.currency === 'EUR' ? '€' : '$'}{sale.amount?.toLocaleString()}
                        </td>
                        <td className="p-4 text-center text-slate-500 font-mono text-xs">{sale.rate?.toFixed(2)}</td>
                        <td className="p-4 text-right font-bold text-slate-900">RD$ {sale.dopAmount?.toLocaleString()}</td>
                        <td className="p-4 text-right font-bold text-yellow-600">RD$ {(sale.gain || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
