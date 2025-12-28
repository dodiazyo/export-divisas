import React, { useState, useEffect } from 'react';
import { Save, Building2, Phone, MapPin, FileText, Hash, DollarSign, Download, Upload, AlertTriangle } from 'lucide-react';

export default function SettingsView({ 
  settings, 
  onSave,
  users,
  setUsers,
  shiftHistory,
  setShiftHistory,
  salesHistory,
  setSalesHistory
}) {
  const [formData, setFormData] = useState({
    name: '',
    rnc: '',
    phone: '',
    address: '',
    receiptMessage: '',
    exchangeRate: 58.50,
    exchangeRateEur: 64.00
  });
  
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // --- BACKUP & RESTORE ---
  const handleExportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      settings: formData,
      users: users,
      shiftHistory: shiftHistory,
      salesHistory: salesHistory
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `respaldo_divisas_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm('ADVERTENCIA: Al restaurar se SOBRESCRIBIRÁN todos los datos actuales. ¿Estás seguro?')) {
      e.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Validate basic structure
        if (!data.settings || !data.users) {
          throw new Error('Formato de archivo inválido');
        }

        // Update State
        onSave(data.settings);
        setFormData(data.settings);
        
        if (setUsers && data.users) setUsers(data.users);
        if (setShiftHistory && data.shiftHistory) setShiftHistory(data.shiftHistory);
        if (setSalesHistory && data.salesHistory) setSalesHistory(data.salesHistory);

        alert('¡Datos restaurados correctamente!');
      } catch (error) {
        console.error(error);
        alert('Error al leer el archivo. Asegúrate de que sea un respaldo válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
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
              <div>
                <label className="block text-lg font-bold text-green-800 mb-2 flex items-center gap-2">
                  <DollarSign size={24} className="text-green-600" />
                  Tasa Dólar (USD)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.exchangeRate || ''}
                    onChange={e => setFormData(prev => ({ ...prev, exchangeRate: parseFloat(e.target.value) }))}
                    className="w-full text-3xl font-bold px-4 py-3 rounded-lg border border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none text-green-900 bg-white placeholder:text-green-300"
                    placeholder="0.00"
                  />
                  <span className="text-green-600 font-medium">DOP</span>
                </div>
              </div>

              {/* EUR RATE */}
              <div>
                <label className="block text-lg font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <span className="text-2xl">€</span>
                  Tasa Euro (EUR)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.exchangeRateEur || ''}
                    onChange={e => setFormData(prev => ({ ...prev, exchangeRateEur: parseFloat(e.target.value) }))}
                    className="w-full text-3xl font-bold px-4 py-3 rounded-lg border border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-blue-900 bg-white placeholder:text-blue-300"
                    placeholder="0.00"
                  />
                  <span className="text-blue-600 font-medium">DOP</span>
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
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <Save size={20} />
              Guardar
            </button>
          </div>
        </form>

        {/* DATA MANAGEMENT ZONE */}
        <div className="mt-8 border-t border-slate-200 pt-8">
          <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle size={16} />
            Zona de Peligro / Datos
          </h3>
          
          <div className="bg-red-50 rounded-xl p-6 border border-red-100">
            <p className="text-sm text-red-800 mb-4">
              Aquí puedes guardar una copia de seguridad de todo el sistema o restaurar datos anteriores.
              <br/>
              <span className="font-bold">Nota:</span> Al restaurar se SOBRESCRIBIRÁN los datos actuales.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleExportData}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-100 transition-colors shadow-sm"
              >
                <Download size={20} />
                Descargar Copia (Backup)
              </button>

              <div className="flex-1 relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  <Upload size={20} />
                  Restaurar Copia
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
