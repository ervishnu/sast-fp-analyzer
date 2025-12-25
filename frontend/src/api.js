import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configuration API
export const configurationApi = {
  list: () => api.get('/configurations/'),
  get: (id) => api.get(`/configurations/${id}`),
  create: (data) => api.post('/configurations/', data),
  update: (id, data) => api.put(`/configurations/${id}`, data),
  delete: (id) => api.delete(`/configurations/${id}`),
  test: (id) => api.post(`/configurations/${id}/test`),
};

// Scans API
export const scansApi = {
  list: (configurationId = null) => {
    const params = configurationId ? { configuration_id: configurationId } : {};
    return api.get('/scans/', { params });
  },
  get: (id) => api.get(`/scans/${id}`),
  start: (configurationId) => api.post('/scans/', { configuration_id: configurationId }),
  status: (id) => api.get(`/scans/${id}/status`),
  delete: (id) => api.delete(`/scans/${id}`),
  pause: (id) => api.post(`/scans/${id}/pause`),
  resume: (id) => api.post(`/scans/${id}/resume`),
  stop: (id) => api.post(`/scans/${id}/stop`),
};

// Dashboard API
export const dashboardApi = {
  statistics: () => api.get('/dashboard/statistics'),
  vulnerabilitiesByTriage: () => api.get('/dashboard/vulnerabilities/by-triage'),
  vulnerabilitiesBySeverity: () => api.get('/dashboard/vulnerabilities/by-severity'),
  vulnerabilitiesByType: () => api.get('/dashboard/vulnerabilities/by-type'),
};

export default api;
