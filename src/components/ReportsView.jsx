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
    const totalUSD = filteredSales.reduce((sum, sale) => sum + (sale.usdAmount || 0), 0);
    const totalDOP = filteredSales.reduce((sum, sale) => sum + (sale.dopAmount || 0), 0);
    const totalGain = filteredSales.reduce((sum, sale) => sum + (sale.gain || 0), 0);
    const transactions = filteredSales.length;
    const avgRate = totalUSD > 0 ? totalDOP / totalUSD : 0;
    
    return { totalUSD, totalDOP, totalGain, transactions, avgRate };
  }, [filteredSales]);

  // --- EXPORT CSV ---
  const handleExport = () => {
    const headers = ['ID', 'Fecha', 'USD Comprado', 'Tasa', 'DOP Pagado', 'Ganancia (DOP)', 'Cajero'];
    const rows = filteredSales.map(sale => [
      sale.id,
      new Date(sale.date).toLocaleString(),
      sale.usdAmount,
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
      <div className="max-w-5xl mx-auto w-full">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reporte de Divisas</h1>
            <p className="text-slate-500">Historial de transacciones y movimientos</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-green-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
              <div className="relative z-10">
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">USD Comprados</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-2">${metrics.totalUSD.toLocaleString()}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
              <div className="relative z-10">
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">DOP Pagados</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-2">RD$ {metrics.totalDOP.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-yellow-200 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-yellow-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
              <div className="relative z-10">
                <p className="text-yellow-600 text-sm font-bold uppercase tracking-wider">Ganancia Total</p>
                <h3 className="text-3xl font-bold text-yellow-700 mt-2">RD$ {metrics.totalGain.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-purple-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
              <div className="relative z-10">
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Tasa Promedio</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-2">{metrics.avgRate.toFixed(2)}</h3>
                <div className="mt-4 flex items-center gap-1 text-sm text-purple-600 font-medium bg-purple-50 w-fit px-2 py-1 rounded-full">
                  <TrendingUp size={14} />
                  <span>{metrics.transactions} transacciones</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">USD Comprado</th>
                    <th className="p-4">Tasa</th>
                    <th className="p-4">DOP Pagado</th>
                    <th className="p-4">Ganancia (DOP)</th>
                    <th className="p-4">Cajero</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400">
                        No hay transacciones en este rango
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-600">{new Date(sale.date).toLocaleString()}</td>
                        <td className="p-4 font-bold text-green-600">${sale.usdAmount}</td>
                        <td className="p-4 text-slate-600">{sale.rate}</td>
                        <td className="p-4 font-bold text-slate-800">RD$ {sale.dopAmount.toLocaleString()}</td>
                        <td className="p-4 font-bold text-yellow-600">RD$ {(sale.gain || 0).toLocaleString()}</td>
                        <td className="p-4 text-slate-500 text-sm">{sale.cashier}</td>
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
