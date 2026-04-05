const API_URL = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

export const api = {
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  register: async (businessName, ownerName, email, password) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, ownerName, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  getSettings: async () => {
    const res = await fetch(`${API_URL}/settings`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },
  updateSettings: async (settings) => {
    const res = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },
  createUser: async (user) => {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  },
  updateUser: async (id, user) => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },
  deleteUser: async (id) => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete user');
    return res.json();
  },

  getActiveShift: async () => {
    const res = await fetch(`${API_URL}/shifts/active`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch active shift');
    return res.json();
  },

  getActiveShifts: async () => {
    const res = await fetch(`${API_URL}/shifts/active-all`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch active shifts');
    return res.json();
  },
  openShift: async (data) => {
    const res = await fetch(`${API_URL}/shifts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ data })
    });
    if (!res.ok) throw new Error('Failed to open shift');
    return res.json();
  },
  closeShift: async (id, data) => {
    const res = await fetch(`${API_URL}/shifts/${id}/close`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ data })
    });
    if (!res.ok) throw new Error('Failed to close shift');
    return res.json();
  },
  registerTransaction: async (shiftId, type, data) => {
    const res = await fetch(`${API_URL}/shifts/${shiftId}/transactions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ type, data })
    });
    if (!res.ok) throw new Error('Failed to register transaction');
    return res.json();
  },
  injectCapital: async (shiftId, data) => {
    const res = await fetch(`${API_URL}/shifts/${shiftId}/injections`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ data })
    });
    if (!res.ok) throw new Error('Failed to inject capital');
    return res.json();
  },

  getShifts: async () => {
    const res = await fetch(`${API_URL}/shifts`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch shifts');
    return res.json();
  },
  getTransactions: async (from, to) => {
    let url = `${API_URL}/shifts/transactions`;
    if (from && to) url += `?from=${from}&to=${to}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  forgotPassword: async (email) => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  verifyResetToken: async (token) => {
    const res = await fetch(`${API_URL}/auth/verify-reset-token/${token}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  resetPassword: async (token, newPassword) => {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');
    return data;
  },

  addCashIn: async (shiftId, data) => {
    const res = await fetch(`${API_URL}/shifts/${shiftId}/cash-in`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al registrar ingreso');
    return json;
  },
  getCashIns: async (from, to) => {
    let url = `${API_URL}/shifts/cash-ins`;
    if (from && to) url += `?from=${from}&to=${to}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch cash ins');
    return res.json();
  },

  voidTransaction: async (txId, adminPin, reason) => {
    const res = await fetch(`${API_URL}/shifts/transactions/${txId}/void`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ adminPin, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al anular transaccion');
    return data;
  },

  // ── Vault (Bodega) ──────────────────────────────────────────────────────────
  getVault: async () => {
    const res = await fetch(`${API_URL}/vault`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error cargando bodega');
    return res.json();
  },
  getVaultLedger: async (limit = 200, from, to) => {
    let url = `${API_URL}/vault/ledger?limit=${limit}`;
    if (from) url += `&from=${from}`;
    if (to)   url += `&to=${to}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error cargando historial');
    return res.json();
  },
  initializeVault: async (dop, usd, eur, note) => {
    const res = await fetch(`${API_URL}/vault/initialize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dop, usd, eur, note }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al inicializar bodega');
    return data;
  },
  adjustVault: async (currency, amount, note, denominations, destination) => {
    const res = await fetch(`${API_URL}/vault/adjust`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currency, amount, note, denominations, destination }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al ajustar bodega');
    return data;
  },
  closeVault: async (dopCount, usdCount, eurCount, note, destination) => {
    const res = await fetch(`${API_URL}/vault/close`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dopCount, usdCount, eurCount, note, destination }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cerrar bodega');
    return data;
  },
};
