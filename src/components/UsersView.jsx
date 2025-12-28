import React, { useState } from 'react';
import { hashPassword } from '../utils/auth';
import { User, Plus, Edit, Trash2, Save, X, Shield, ShieldCheck, Truck, Package } from 'lucide-react';

export default function UsersView({ users, onAddUser, onUpdateUser, onDeleteUser }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    pin: '',
    role: 'cashier',
    permissions: []
  });

  const roles = [
    { id: 'admin', label: 'Administrador', icon: ShieldCheck, color: 'text-red-600' },
    { id: 'cashier', label: 'Cajero/a', icon: User, color: 'text-blue-600' },
    { id: 'warehouse', label: 'Almacén', icon: Package, color: 'text-orange-600' },
  ];

  const handleAddNew = () => {
    setFormData({ name: '', pin: '', role: 'cashier' });
    setCurrentUser(null);
    setIsEditing(true);
  };

  const handleEdit = (user) => {
    setFormData({ name: user.name, pin: '', role: user.role });
    setCurrentUser(user);
    setIsEditing(true);
  };

  const handleDelete = (userId) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      onDeleteUser(userId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation for new user
    if (!currentUser && !formData.pin) {
      alert('La contraseña es requerida');
      return;
    }

    let finalPin = currentUser?.pin;
    if (formData.pin) {
      finalPin = await hashPassword(formData.pin);
    }

    const userToSave = {
      ...formData,
      pin: finalPin
    };

    if (currentUser) {
      onUpdateUser({ ...currentUser, ...userToSave });
    } else {
      onAddUser(userToSave);
    }
    setIsEditing(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
            <p className="text-slate-500">Administra el acceso y roles del personal.</p>
          </div>
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Usuario
          </button>
        </div>

        {/* Users List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => {
            const roleInfo = roles.find(r => r.id === user.role) || roles[1];
            const RoleIcon = roleInfo.icon;

            return (
              <div key={user.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${roleInfo.color} bg-slate-50`}>
                    <RoleIcon size={24} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(user)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    {users.length > 1 && (
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-slate-800">{user.name}</h3>
                <p className={`text-sm font-medium ${roleInfo.color} mb-2`}>{roleInfo.label}</p>
                
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg inline-flex">
                  <Shield size={14} />
                  PIN: <span className="font-mono font-bold tracking-widest">****</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit/Create Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">
                  {currentUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-slate-900 bg-white placeholder:text-slate-400"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {currentUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                  </label>
                  <input
                    type="text"
                    required={!currentUser}
                    value={formData.pin}
                    onChange={e => {
                      setFormData({...formData, pin: e.target.value});
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-slate-900 bg-white placeholder:text-slate-400"
                    placeholder={currentUser ? "Dejar en blanco para mantener" : "Ingrese una contraseña segura"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Rol</label>
                  <div className="space-y-2">
                    {roles.map(role => (
                      <label 
                        key={role.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.role === role.id 
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.id}
                          checked={formData.role === role.id}
                          onChange={e => setFormData({...formData, role: e.target.value})}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                          formData.role === role.id ? 'border-blue-600' : 'border-slate-300'
                        }`}>
                          {formData.role === role.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                        </div>
                        <span className="font-medium text-slate-700">{role.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
