import React from 'react';
import { X, Printer, Lock } from 'lucide-react';

export default function ShiftReceipt({ isOpen, onClose, shift, settings }) {
  if (!isOpen || !shift) return null;
  
  const handlePrint = () => {
    window.print();
  };
  
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-DO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  
  // Default settings if not provided
  const storeName = settings?.name || 'COLMADO PRO';
  
  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        @page { size: A4; margin: 20mm; }
        body { 
          background: white !important; 
          color: black !important;
          margin: 0;
          padding: 0;
          width: 100%;
          font-family: 'Inter', sans-serif;
        }
        .print\\:hidden { display: none !important; }
        #shift-receipt-content { 
          width: 100% !important; 
          max-width: none !important;
          margin: 0 !important; 
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }
        .bg-slate-50, .bg-slate-100, .bg-slate-800, .bg-green-50, .bg-blue-50 { 
          background-color: transparent !important; 
          border: 1px solid #eee !important;
        }
        .text-slate-500, .text-slate-600, .text-slate-400 { color: #555 !important; }
        .shadow-lg, .shadow-2xl { box-shadow: none !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .rounded-xl, .rounded-lg { border-radius: 8px !important; }
      }
    `}} />
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 print:hidden sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <Lock size={28} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Cierre de Caja (Formato A4)</h2>
              <p className="text-sm text-slate-500">Turno #{shift.id} - Epson L3250</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors"
            >
              <Printer size={20} />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* Receipt Content */}
        <div className="p-10 print:p-0" id="shift-receipt-content">
          {/* Store Header */}
          <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-slate-100">
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{storeName}</h1>
              <p className="text-slate-500 font-medium">REPORTE CONSOLIDADO DE CIERRE DE CAJA</p>
              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                 <p><span className="text-slate-400 font-bold uppercase text-[10px]">Cajero:</span> <span className="text-slate-900 font-bold">{shift.userName}</span></p>
                 <p><span className="text-slate-400 font-bold uppercase text-[10px]">Turno:</span> <span className="text-slate-900 font-bold">#{shift.id}</span></p>
                 <p><span className="text-slate-400 font-bold uppercase text-[10px]">Apertura:</span> <span className="text-slate-900">{formatDate(shift.startTime)}</span></p>
                 <p><span className="text-slate-400 font-bold uppercase text-[10px]">Cierre:</span> <span className="text-slate-900">{formatDate(shift.endTime)}</span></p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm inline-block mb-2">
                ORIGINAL DE OFICINA
              </div>
              <p className="text-xs text-slate-400">Fecha Impresión: {new Date().toLocaleString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Left Column: Financials */}
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-600 pl-3 mb-4">Resumen Financiero (DOP)</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Fondo Inicial:</span>
                    <span className="font-mono font-bold">RD$ {shift.startAmount?.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-600 font-medium">
                    <span>Compra de Divisas (Egresos):</span>
                    <span className="font-mono">- RD$ {shift.currencyPayouts?.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-lg font-black text-slate-900">
                    <span>Efectivo Esperado:</span>
                    <span>RD$ {shift.expectedAmount?.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center text-blue-700 font-black italic">
                    <span>Efectivo Contado:</span>
                    <span>RD$ {shift.finalAmount?.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className={`pt-2 border-t border-slate-200 flex justify-between items-center font-bold ${shift.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Diferencia:</span>
                    <span>{shift.difference > 0 ? '+' : ''} RD$ {shift.difference?.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-green-600 pl-3 mb-4">Posición Divisas (USD)</h3>
                <div className="bg-green-50/50 border border-green-100 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-green-800">Dólares Comprados:</span>
                    <span className="font-black text-green-900 text-xl">${shift.usdOnHand?.toLocaleString()} USD</span>
                  </div>
                  <div className={`flex justify-between items-center text-sm font-bold ${shift.usdDifference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    <span>Diferencia en USD:</span>
                    <span>{shift.usdDifference > 0 ? '+' : ''}{shift.usdDifference}</span>
                  </div>
                  <div className="pt-2 border-t border-green-200 flex justify-between items-center">
                    <span className="text-green-800 text-xs font-bold uppercase">Ganancia Estimada del Turno:</span>
                    <span className="font-black text-green-900 font-mono text-lg">RD$ {shift.totalGain?.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Bill Breakdown */}
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-slate-900 pl-3 mb-4">Desglose de Efectivo Contado</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* DOP Breakdown Table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-900 text-white text-[10px] font-bold text-center py-1 uppercase tracking-tighter">Billetes DOP</div>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-100">
                        {shift.dopBreakdown && Object.entries(shift.dopBreakdown)
                          .filter(([_, q]) => q > 0)
                          .sort((a,b) => b[0] - a[0])
                          .map(([denom, qty]) => (
                          <tr key={denom} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-500">${denom}</td>
                            <td className="p-2 text-center text-slate-400">x</td>
                            <td className="p-2 font-black text-slate-900">{qty}</td>
                            <td className="p-2 text-right font-mono text-slate-400">RD$ {(denom * qty).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* USD Breakdown Table */}
                  <div className="bg-white border border-green-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-green-800 text-white text-[10px] font-bold text-center py-1 uppercase tracking-tighter">Billetes USD</div>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-green-50">
                        {shift.usdBreakdown && Object.entries(shift.usdBreakdown)
                          .filter(([_, q]) => q > 0)
                          .sort((a,b) => b[0] - a[0])
                          .map(([denom, qty]) => (
                          <tr key={denom} className="hover:bg-green-50">
                            <td className="p-2 font-bold text-green-700">${denom}</td>
                            <td className="p-2 text-center text-green-400">x</td>
                            <td className="p-2 font-black text-green-900">{qty}</td>
                            <td className="p-2 text-right font-mono text-green-700">${(denom * qty).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Cashier Activity */}
          {shift.cashierActivity && Object.keys(shift.cashierActivity).length > 0 && (
            <section className="mb-10">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-slate-300 pl-3 mb-4">Actividad Detallada por Usuario</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-left text-slate-500 uppercase text-xs font-bold font-mono">Cajero</th>
                      <th className="p-4 text-center text-slate-500 uppercase text-xs font-bold font-mono">Operaciones</th>
                      <th className="p-4 text-right text-slate-500 uppercase text-xs font-bold font-mono">Total Comprado (DOP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(shift.cashierActivity).map(([name, data]) => (
                      <tr key={name} className="hover:bg-slate-50">
                        <td className="p-4 font-black text-slate-800">{name}</td>
                        <td className="p-4 text-center font-bold text-slate-600">{data.transactions}</td>
                        <td className="p-4 text-right font-black text-slate-900">RD$ {data.totalDOP.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Detailed Transaction List */}
          {shift.transactionsList && shift.transactionsList.length > 0 && (
            <section className="mb-10">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-slate-300 pl-3 mb-4">Bitácora de Movimientos (Turno)</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-left text-slate-500 uppercase font-mono">Hora</th>
                      <th className="p-2 text-left text-slate-500 uppercase font-mono">Usuario</th>
                      <th className="p-2 text-center text-slate-500 uppercase font-mono">Divisa</th>
                      <th className="p-2 text-right text-slate-500 uppercase font-mono">Monto</th>
                      <th className="p-2 text-center text-slate-500 uppercase font-mono">Tasa</th>
                      <th className="p-2 text-right text-slate-500 uppercase font-mono">Total RD$</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {shift.transactionsList.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-400">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-2 text-slate-800 font-bold">{sale.cashier}</td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${sale.currency === 'USD' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {sale.currency}
                          </span>
                        </td>
                        <td className="p-2 text-right font-bold">{sale.currency === 'EUR' ? '€' : '$'}{sale.amount?.toLocaleString()}</td>
                        <td className="p-2 text-center text-slate-400">{sale.rate?.toFixed(2)}</td>
                        <td className="p-2 text-right font-black">RD$ {sale.dopAmount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          
          {/* Signatures */}
          <div className="mt-20 grid grid-cols-2 gap-20">
            <div className="text-center">
              <div className="border-t-2 border-slate-900 pt-3">
                <p className="text-sm font-black text-slate-900 uppercase">{shift.userName}</p>
                <p className="text-xs text-slate-500 font-bold">CAJERO/A SALIENTE</p>
                <p className="text-[10px] text-slate-400 mt-1">Declaro que los valores aquí expresados son correctos.</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-slate-900 pt-3">
                <p className="text-sm font-black text-slate-900 uppercase">SUPERVISOR / ADMINISTRACIÓN</p>
                <p className="text-xs text-slate-500 font-bold">REVISIÓN Y ARQUEO</p>
                <p className="text-[10px] text-slate-400 mt-1">Verificado físicamente con arqueo de caja.</p>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-center text-[10px] text-slate-300 mt-16 pb-10 border-t border-slate-50 pt-4">
             Sistema de Gestión de Divisas - Reporte de Auditoría Interna - Turno #{shift.id}
          </div>
        </div>
        
        {/* Actions (Floating on mobile screen, hidden on print) */}
        <div className="p-6 border-t border-slate-200 flex gap-3 print:hidden bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl transition-all hover:bg-slate-100"
          >
            Cerrar Vista
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
          >
            <Printer size={20} />
            Imprimir en A4 (Epson L3250)
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
