const API_URL = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

export const api = {
  login: async (pin) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
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
  }
};
