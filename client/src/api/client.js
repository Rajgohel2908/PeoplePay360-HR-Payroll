// client/src/api/client.js

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('peoplepay_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // If response is a binary blob (like PDF)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    if (!response.ok) throw new Error('Failed to download PDF file.');
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('peoplepay_token');
      localStorage.removeItem('peoplepay_user');
      // Only redirect if not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    error.errors = data.errors;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
  downloadPdf: (endpoint) => request(endpoint, { method: 'GET' })
};

// Convenience helpers
export const getAuditLogs = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/admin/audit-logs${query ? `?${query}` : ''}`).then(data => ({ data }));
};

export const getSystemSettings = () => {
  return api.get('/admin/settings').then(data => ({ data }));
};

export const updateSystemSetting = ({ key, value }) => {
  return api.put('/admin/settings', { key, value }).then(data => ({ data }));
};

export default api;
