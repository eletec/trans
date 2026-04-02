const BASE = '/api';

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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export const api = {
  // Auth
  async login(username, password) {
    const data = await request('/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password })
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  async register(username, email, password) {
    const data = await request('/auth/register', {
      method: 'POST', body: JSON.stringify({ username, email, password })
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
  }
};
