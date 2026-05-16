const BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

function getToken() {
  return localStorage.getItem('adctrans_token');
}

function setToken(token) {
  if (token) localStorage.setItem('adctrans_token', token);
  else localStorage.removeItem('adctrans_token');
}

function getUser() {
  const u = localStorage.getItem('adctrans_user');
  return u ? JSON.parse(u) : null;
}

function setUser(user) {
  if (user) localStorage.setItem('adctrans_user', JSON.stringify(user));
  else localStorage.removeItem('adctrans_user');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (res.status === 401 && token) {
    // Token expired — auto-logout
    setToken(null);
    setUser(null);
    window.location.reload();
    throw new Error('Session expirée — veuillez vous reconnecter');
  }
  if (!res.ok) {
    const message = data && data.error ? data.error : `Erreur serveur (${res.status})`;
    throw new Error(message);
  }
  return data || {};
}

export const api = {
  // Auth
  async login(identifier, password) {
    const data = await request('/auth/login', {
      method: 'POST', body: JSON.stringify({ identifier, password })
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  async register(username, email, password, entityName) {
    const data = await request('/auth/register', {
      method: 'POST', body: JSON.stringify({ username, email, password, entityName })
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  async me() {
    return request('/auth/me');
  },

  logout() {
    setToken(null);
    setUser(null);
  },

  getUser,
  getToken,

  // Palettes
  async getPalettes() {
    return request('/palettes');
  },

  async createPalette(palette) {
    return request('/palettes', { method: 'POST', body: JSON.stringify(palette) });
  },

  async deletePalette(id) {
    return request(`/palettes/${id}`, { method: 'DELETE' });
  },

  // Trucks
  async getTrucks() {
    return request('/palettes/trucks');
  },

  async createTruck(truck) {
    return request('/palettes/trucks', { method: 'POST', body: JSON.stringify(truck) });
  },

  // Projects
  async getProjects() {
    return request('/projects');
  },

  async getProject(id) {
    return request(`/projects/${id}`);
  },

  async createProject(project) {
    return request('/projects', { method: 'POST', body: JSON.stringify(project) });
  },

  async updateProject(id, data) {
    return request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteProject(id) {
    return request(`/projects/${id}`, { method: 'DELETE' });
  },

  // Calculate
  async calculate(params) {
    return request('/calculate', { method: 'POST', body: JSON.stringify(params) });
  },

  async getHeuristics() {
    return request('/calculate/heuristics');
  },

  async getCacheStats() {
    return request('/calculate/cache');
  },

  async clearCache() {
    return request('/calculate/cache', { method: 'DELETE' });
  },

  // User preferences
  async getPreferences() {
    return request('/auth/preferences');
  },

  async savePreferences(preferences) {
    return request('/auth/preferences', { method: 'PUT', body: JSON.stringify({ preferences }) });
  },

  // Profile
  async updateProfile(data) {
    return request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });
  },

  async changePassword(currentPassword, newPassword) {
    return request('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
  },

  // Entity
  async getEntity() {
    return request('/auth/entity');
  },

  async updateEntitySettings(settings) {
    return request('/auth/entity/settings', { method: 'PUT', body: JSON.stringify({ settings }) });
  },

  // History
  async getHistory(limit = 50, offset = 0) {
    return request(`/history?limit=${limit}&offset=${offset}`);
  },

  async saveHistory(data) {
    return request('/history', { method: 'POST', body: JSON.stringify(data) });
  },

  async getHistoryEntry(id) {
    return request(`/history/${id}`);
  },

  async deleteHistoryEntry(id) {
    return request(`/history/${id}`, { method: 'DELETE' });
  },

  // Export / Import
  async exportProject(id) {
    return request(`/export/project/${id}`);
  },

  async exportAllProjects() {
    return request('/export/projects');
  },

  async exportConfig() {
    return request('/export/config');
  },

  async importData(data) {
    return request('/export/import', { method: 'POST', body: JSON.stringify(data) });
  }
};
