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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <Lock size={28} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Cierre de Caja</h2>
              <p className="text-sm text-slate-500">Turno #{shift.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Receipt Content */}
        <div className="p-6 print:p-8" id="shift-receipt-content">
          {/* Store Header */}
          <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3 text-white font-bold text-2xl shadow-lg">
              {storeName.charAt(0)}
            </div>
            <h1 className="text-2xl font-bold text-slate-800 uppercase">{storeName}</h1>
            <p className="text-sm text-slate-600 mt-1">Reporte de Cierre de Turno</p>
            <p className="text-xs text-slate-500 mt-2">{formatDate(new Date())}</p>
          </div>
          
          {/* Shift Info */}
          <div className="mb-6 space-y-2 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-900 font-bold">ID Turno:</span>
              <span className="font-mono font-bold text-black">#{shift.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-900 font-bold">Cajero:</span>
              <span className="font-bold text-black">{shift.userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-900 font-bold">Apertura:</span>
              <span className="font-mono text-black">{formatDate(shift.startTime)}</span>
            </div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>+ Ventas Totales:</span>
              <span>${(shift.salesTotal || 0).toLocaleString()}</span>
            </div>
            
            {(shift.currencyPayouts || 0) > 0 && (
              <div className="flex justify-between text-red-500 mb-1">
                <span>- Compra Divisas:</span>
                <span>RD$ {(shift.currencyPayouts).toLocaleString()}</span>
              </div>
            )}

            <div className="border-t border-slate-300 my-2"></div>

            <div className="flex justify-between font-bold text-slate-800 text-lg mb-4">
              <span>Esperado en Caja:</span>
              <span>${(shift.expectedAmount || 0).toLocaleString()}</span>
            </div>

            {(shift.usdOnHand || 0) > 0 && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-2">
                <p className="text-xs text-green-600 font-bold uppercase">Dólares en Caja</p>
                <p className="text-xl font-bold text-slate-800">$ {(shift.usdOnHand).toLocaleString()} USD</p>
              </div>
            )}
            
            {(shift.eurOnHand || 0) > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                <p className="text-xs text-blue-600 font-bold uppercase">Euros en Caja</p>
                <p className="text-xl font-bold text-slate-800">€ {(shift.eurOnHand).toLocaleString()} EUR</p>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-900 font-bold">Cierre:</span>
              <span className="font-mono text-black">{formatDate(shift.endTime)}</span>
            </div>
          </div>
          
          {/* Financials */}
          <div className="mb-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1">Resumen Financiero</h3>
            
            <div className="flex justify-between text-sm">
              <span className="text-slate-900 font-medium">Fondo Inicial:</span>
              <span className="font-mono text-black font-bold">${shift.startAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-slate-900 font-medium">Ventas Totales:</span>
              <span className="font-mono text-green-700 font-bold">+${shift.salesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Separated Sales */}
            <div className="pl-4 space-y-1 border-l-2 border-slate-200 my-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Ventas Caja (POS):</span>
                <span className="font-mono text-slate-800">${(shift.posSalesTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Ventas Delivery:</span>
                <span className="font-mono text-slate-800">${(shift.deliverySalesTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            
            <div className="flex justify-between text-sm pt-2 border-t border-slate-300">
              <span className="text-slate-900 font-bold">Total Esperado:</span>
              <span className="font-mono font-bold text-black">${shift.expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-slate-900 font-bold">Total Real (Contado):</span>
              <span className="font-mono font-bold text-blue-700">${shift.finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className={`flex justify-between text-sm pt-2 border-t border-slate-300 font-bold ${
              Math.abs(shift.difference) < 1 ? 'text-green-700' : 'text-red-700'
            }`}>
              <span>Diferencia (DOP):</span>
              <span className="font-mono">
                {shift.difference > 0 ? '+' : ''}{shift.difference.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* USD Difference */}
            {shift.usdDifference !== 0 && (
              <div className={`flex justify-between text-sm font-bold ${
                Math.abs(shift.usdDifference) < 1 ? 'text-green-700' : 'text-red-700'
              }`}>
                <span>Diferencia (USD):</span>
                <span className="font-mono">
                  {shift.usdDifference > 0 ? '+' : ''}{shift.usdDifference}
                </span>
              </div>
            )}

            {/* EUR Difference */}
            {shift.eurDifference !== 0 && (
              <div className={`flex justify-between text-sm font-bold ${
                Math.abs(shift.eurDifference) < 1 ? 'text-green-700' : 'text-red-700'
              }`}>
                <span>Diferencia (EUR):</span>
                <span className="font-mono">
                  {shift.eurDifference > 0 ? '+' : ''}{shift.eurDifference}
                </span>
              </div>
            )}
          </div>
          
          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-200">
              <p className="text-xs text-slate-500">Transacciones</p>
              <p className="text-lg font-bold text-slate-800">{shift.transactions}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-200">
              <p className="text-xs text-slate-500">Promedio / Venta</p>
              <p className="text-lg font-bold text-slate-800">
                ${shift.transactions > 0 ? (shift.salesTotal / shift.transactions).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
          
          {/* Signatures */}
          <div className="mt-12 pt-8 border-t border-slate-300 flex justify-between gap-8">
            <div className="flex-1 text-center">
              <div className="border-t border-slate-400 w-full mb-2"></div>
              <p className="text-xs text-slate-500">Firma Cajero/a</p>
            </div>
            <div className="flex-1 text-center">
              <div className="border-t border-slate-400 w-full mb-2"></div>
              <p className="text-xs text-slate-500">Firma Supervisor</p>
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-center text-[10px] text-slate-400 mt-8">
            <p>Generado automáticamente por ColmadoPRO</p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-6 border-t border-slate-200 flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
          >
            <Printer size={20} />
            Imprimir Reporte
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-200"
          >
            Finalizar y Salir
          </button>
        </div>
      </div>
    </div>
  );
}
