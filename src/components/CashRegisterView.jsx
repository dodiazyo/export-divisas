import React, { useState } from 'react';
import { ShoppingCart, Plus, Trash2, Receipt, Package } from 'lucide-react';

export default function CashRegisterView({ onSale, shift, settings }) {
  const [concept, setConcept] = useState('');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [cart, setCart] = useState([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const handleAddItem = () => {
    const price = parseFloat(unitPrice);
    const quantity = parseInt(qty) || 1;
    if (!concept.trim() || !price || price <= 0 || quantity <= 0) return;

    setCart(prev => [...prev, {
      id: Date.now(),
      concept: concept.trim(),
      qty: quantity,
      unitPrice: price,
      total: price * quantity,
    }]);

    setConcept('');
    setQty('1');
    setUnitPrice('');
  };

  const handleRemoveItem = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleRegisterSale = () => {
    if (cart.length === 0) return;

    onSale({ items: cart, total: cartTotal });

    // Print receipt
    const storeName = settings?.name || 'CASA DE CAMBIO';
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (printWindow) {
      const itemsHtml = cart.map(item => `
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span>${item.concept} (${item.qty}x)</span>
          <span>RD$${item.unitPrice.toLocaleString()}</span>
        </div>
        <div style="text-align:right;font-size:10px;color:#555;margin-bottom:6px">
          = RD$ ${item.total.toLocaleString()}
        </div>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Venta - ${storeName}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 64mm;
                margin: 0 auto;
                padding: 20px 0;
                color: #000;
                font-size: 13px;
                line-height: 1.4;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .total-row { display: flex; justify-content: space-between; font-size: 17px; font-weight: bold; margin-top: 8px; }
              .footer { margin-top: 30px; font-size: 11px; margin-bottom: 50px; }
            </style>
          </head>
          <body>
            <div class="center bold" style="font-size:18px;margin-bottom:4px">${storeName}</div>
            ${settings?.rnc ? `<div class="center" style="font-size:11px">RNC: ${settings.rnc}</div>` : ''}
            ${settings?.phone ? `<div class="center" style="font-size:11px">Tel: ${settings.phone}</div>` : ''}
            <div class="center" style="font-size:11px">${new Date().toLocaleString('es-DO')}</div>
            <div class="divider"></div>
            <div class="center bold">VENTA EXTERNA</div>
            <div class="divider"></div>
            <div style="margin-bottom:6px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-weight:bold;font-size:11px">
                <span>CONCEPTO</span><span>PRECIO</span>
              </div>
              <div style="border-top:1px dashed #000;margin-bottom:6px"></div>
              ${itemsHtml}
            </div>
            <div class="divider"></div>
            <div class="total-row">
              <span>TOTAL:</span>
              <span>RD$ ${cartTotal.toLocaleString()}</span>
            </div>
            <div class="footer center">
              <div class="bold">${settings?.receiptMessage || '¡Gracias por su preferencia!'}</div>
              <div style="margin-top:15px;border-top:1px solid #eee;padding-top:10px">*** COPIA DE CLIENTE ***</div>
              <div style="font-size:9px;color:#666;margin-top:5px">ID: ${Date.now()}</div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  window.onafterprint = function() { window.close(); };
                }, 300);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert('Ventana de impresión bloqueada. Por favor permita ventanas emergentes.');
    }

    setCart([]);
  };

  if (!shift) {
    return (
      <div className="h-full flex items-center justify-center flex-col gap-3">
        <Package size={52} className="text-slate-300" />
        <p className="text-slate-500 font-bold text-lg">Caja cerrada</p>
        <p className="text-slate-400 text-sm">Abra la caja para registrar ventas externas.</p>
      </div>
    );
  }

  const previewSubtotal = (parseFloat(unitPrice) || 0) * (parseInt(qty) || 1);

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 lg:p-6 overflow-hidden">
      <div className="max-w-4xl mx-auto w-full h-full flex flex-col">

        <div className="mb-6 shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-indigo-600" />
            Ventas Externas
          </h1>
          <p className="text-slate-500 text-sm mt-1">Registre ventas de productos o servicios adicionales</p>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">

          {/* Left: Entry form */}
          <div className="overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-black text-slate-700 uppercase text-sm tracking-wider mb-4">Nuevo Item</h3>
              <div className="space-y-3">

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Concepto / Descripción</label>
                  <input
                    type="text"
                    value={concept}
                    onChange={e => setConcept(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                    autoFocus
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-medium text-slate-800 placeholder:text-slate-300"
                    placeholder="Ej: Fotocopia, Servicio de notaría..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={e => setQty(e.target.value)}
                      className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-black text-slate-800 text-center text-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Precio Unit.</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">RD$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={unitPrice}
                        onChange={e => setUnitPrice(e.target.value)}
                        className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-800 text-right"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {concept && parseFloat(unitPrice) > 0 && (
                  <div className="bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-0.5">Subtotal</p>
                    <p className="text-2xl font-black text-indigo-800">
                      RD$ {previewSubtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!concept.trim() || !parseFloat(unitPrice) || parseFloat(unitPrice) <= 0}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Agregar al Carrito
                </button>

              </div>
            </div>
          </div>

          {/* Right: Cart */}
          <div className="flex flex-col min-h-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full">

              <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                <h3 className="font-black text-slate-700 uppercase text-sm tracking-wider">
                  Carrito{' '}
                  <span className="text-slate-400 font-normal">
                    ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                  </span>
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-300">
                    <ShoppingCart size={48} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-bold text-slate-400">Sin items en el carrito</p>
                    <p className="text-xs text-slate-300 mt-1">Agregue productos o servicios</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate text-sm">{item.concept}</p>
                        <p className="text-xs text-slate-400">{item.qty} × RD$ {item.unitPrice.toLocaleString()}</p>
                      </div>
                      <span className="font-black text-slate-900 shrink-0 text-sm">
                        RD$ {item.total.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-300 hover:text-red-500 transition-colors shrink-0 p-1 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="shrink-0 p-4 bg-slate-900 text-white">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-slate-300 text-sm uppercase tracking-wider">Total de la Venta:</span>
                    <span className="text-2xl font-black text-white">
                      RD$ {cartTotal.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={handleRegisterSale}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30"
                  >
                    <Receipt size={20} />
                    Registrar Venta e Imprimir
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
