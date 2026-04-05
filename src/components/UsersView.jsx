import React, { useState, useEffect } from 'react';
import { User, Plus, Edit, Trash2, Save, X, Shield, ShieldCheck, Truck, Package, Loader2, Terminal } from 'lucide-react';
import { api } from '../lib/api';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'currency_agent',
  });

  const roles = [
    { id: 'admin', label: 'Administrador', icon: ShieldCheck, color: 'text-red-600' },
    { id: 'currency_agent', label: 'Cajero/a', icon: User, color: 'text-blue-600' },
    { id: 'it', label: 'Soporte TI', icon: Terminal, color: 'text-purple-600' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      alert('Error cargando usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({ name: '', email: '', password: '', role: 'currency_agent' });
    setCurrentUser(null);
    setIsEditing(true);
  };

  const handleEdit = (user) => {
    setFormData({ name: user.name, email: user.email || '', password: '', role: user.role });
    setCurrentUser(user);
    setIsEditing(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await api.deleteUser(userId);
        fetchUsers();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser && !formData.password) {
      alert('La contraseña es requerida para nuevos usuarios');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      if (currentUser) {
        await api.updateUser(currentUser.id, formData);
      } else {
        await api.createUser(formData);
      }
      setIsEditing(false);
      fetchUsers();
    } catch (err) {
      alert('Error guardando usuario: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 dark:text-gray-400">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-gray-900 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100">Gestión de Usuarios</h1>
            <p className="text-slate-500 dark:text-gray-400">Administra el acceso y roles del personal.</p>
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
              <div key={user.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-gray-700 hover:shadow-md transition-shadow relative group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${roleInfo.color} bg-slate-50 dark:bg-gray-700`}>
                    <RoleIcon size={24} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-slate-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    {users.length > 1 && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-slate-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-slate-800 dark:text-gray-100">{user.name}</h3>
                <p className={`text-sm font-medium ${roleInfo.color} mb-2`}>{roleInfo.label}</p>
                
                <div className="text-xs text-slate-500 dark:text-gray-400 truncate">
                  {user.email || <span className="italic text-slate-300">Sin correo</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit/Create Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100">
                  {currentUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <button onClick={() => setIsEditing(false)} className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-gray-200 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-gray-600 focus:border-blue-500 outline-none text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-slate-400"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-gray-200 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-gray-600 focus:border-blue-500 outline-none text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-slate-400"
                    placeholder="cajero@negocio.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-gray-200 mb-1">
                    {currentUser ? 'Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}
                  </label>
                  <input
                    type="password"
                    required={!currentUser}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-gray-600 focus:border-blue-500 outline-none text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-slate-400"
                    placeholder={currentUser ? "Dejar vacío para mantener" : "Mínimo 6 caracteres"}
                    minLength={currentUser ? 0 : 6}
                  />
                  <p className="mt-1 text-xs text-slate-400">Mínimo 6 caracteres.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-gray-200 mb-1">Rol</label>
                  <div className="space-y-2">
                    {roles.map(role => (
                      <label 
                        key={role.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.role === role.id
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-slate-200 dark:border-gray-600 hover:border-slate-300 dark:hover:border-gray-500'
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
                        <span className="font-medium text-slate-700 dark:text-gray-200">{role.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-200 font-bold rounded-lg transition-colors"
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
