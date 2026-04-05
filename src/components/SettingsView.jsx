import React, { useState, useEffect } from 'react';
import { Save, Building2, Phone, MapPin, FileText, Hash, DollarSign } from 'lucide-react';
import { api } from '../lib/api';

export default function SettingsView({ settings, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    rnc: '',
    phone: '',
    address: '',
    receiptMessage: '',
    exchangeRate: 58.50,
    salesRate: 60.00,
    exchangeRateEur: 64.00,
    salesRateEur: 66.00
  });
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api.updateSettings(formData);
      onSave(updated);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert('Error guardando configuración: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
          <p className="text-slate-500">Información del negocio y tasa de cambio.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-6">
            
            {/* Exchange Rate - PRIORITY */}
            <div className="bg-green-50 p-6 rounded-xl border border-green-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* USD RATE */}
              <div className="space-y-4">
                <label className="block text-lg font-bold text-green-800 flex items-center gap-2 border-b border-green-200 pb-2">
                  <DollarSign size={24} className="text-green-600" />
                  Divisa USD
                </label>
                
                <div>
                  <label className="block text-xs font-bold text-green-700 mb-1 uppercase">Tasa Compra (Pagamos)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.exchangeRate || ''}
                      onChange={e => setFormData(prev => ({ ...prev, exchangeRate: parseFloat(e.target.value) }))}
                      className="w-full text-2xl font-bold px-3 py-2 rounded-lg border border-green-300 focus:border-green-500 outline-none text-green-900 bg-white"
                      placeholder="0.00"
                    />
                    <span className="text-green-600 font-bold text-xs">DOP</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-green-700 mb-1 uppercase">Tasa Venta (Referencia)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.salesRate || ''}
                      onChange={e => setFormData(prev => ({ ...prev, salesRate: parseFloat(e.target.value) }))}
                      className="w-full text-2xl font-bold px-3 py-2 rounded-lg border border-green-300 focus:border-green-500 outline-none text-green-900 bg-white/50"
                      placeholder="0.00"
                    />
                    <span className="text-green-600 font-bold text-xs">DOP</span>
                  </div>
                  <p className="text-[10px] text-green-600 mt-1">
                    Margen estimado: RD$ {((formData.salesRate || 0) - (formData.exchangeRate || 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* EUR RATE */}
              <div className="space-y-4">
                <label className="block text-lg font-bold text-blue-800 flex items-center gap-2 border-b border-blue-200 pb-2">
                  <span className="text-2xl">€</span>
                  Divisa EUR
                </label>
                
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1 uppercase">Tasa Compra (Pagamos)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.exchangeRateEur || ''}
                      onChange={e => setFormData(prev => ({ ...prev, exchangeRateEur: parseFloat(e.target.value) }))}
                      className="w-full text-2xl font-bold px-3 py-2 rounded-lg border border-blue-300 focus:border-blue-500 outline-none text-blue-900 bg-white"
                      placeholder="0.00"
                    />
                    <span className="text-blue-600 font-bold text-xs">DOP</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1 uppercase">Tasa Venta (Referencia)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.salesRateEur || ''}
                      onChange={e => setFormData(prev => ({ ...prev, salesRateEur: parseFloat(e.target.value) }))}
                      className="w-full text-2xl font-bold px-3 py-2 rounded-lg border border-blue-300 focus:border-blue-500 outline-none text-blue-900 bg-white/50"
                      placeholder="0.00"
                    />
                    <span className="text-blue-600 font-bold text-xs">DOP</span>
                  </div>
                  <p className="text-[10px] text-blue-600 mt-1">
                    Margen estimado: RD$ {((formData.salesRateEur || 0) - (formData.exchangeRateEur || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Datos del Negocio (Para Recibos)</h3>
              
              {/* Store Name */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Building2 size={18} className="text-blue-600" />
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 outline-none transition-all text-slate-900 bg-white"
                  placeholder="Ej: Casa de Cambio Express"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                {/* RNC */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Hash size={18} className="text-blue-600" />
                    RNC / Cédula
                  </label>
                  <input
                    type="text"
                    name="rnc"
                    value={formData.rnc}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-slate-900 bg-white"
                    placeholder="000-0000000-0"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Phone size={18} className="text-blue-600" />
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-slate-900 bg-white"
                    placeholder="(809) 000-0000"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin size={18} className="text-blue-600" />
                  Dirección
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-slate-900 bg-white"
                  placeholder="Dirección del local..."
                />
              </div>

              {/* Receipt Message */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  Mensaje en Recibo
                </label>
                <textarea
                  name="receiptMessage"
                  value={formData.receiptMessage}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 outline-none resize-none text-slate-900 bg-white"
                  placeholder="¡Gracias por su preferencia!"
                />
              </div>
            </div>

          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            {showSuccess ? (
              <span className="text-green-600 font-bold animate-in fade-in slide-in-from-left">
                ¡Guardado correctamente!
              </span>
            ) : (
              <span></span>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:shadow-none text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
