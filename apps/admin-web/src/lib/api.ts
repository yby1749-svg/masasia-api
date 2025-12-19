import axios from 'axios';

// Use relative URL to go through Next.js proxy (avoids CORS issues)
const API_URL = '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

// Admin endpoints
export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),

  // Providers
  getProviders: (status?: string) =>
    api.get('/admin/providers', { params: { status } }),
  getProvider: (id: string) => api.get(`/admin/providers/${id}`),
  approveProvider: (id: string) => api.post(`/admin/providers/${id}/approve`),
  rejectProvider: (id: string, reason: string) =>
    api.post(`/admin/providers/${id}/reject`, { reason }),
  suspendProvider: (id: string, reason: string) =>
    api.post(`/admin/providers/${id}/suspend`, { reason }),
  unsuspendProvider: (id: string) =>
    api.post(`/admin/providers/${id}/unsuspend`),

  // Bookings
  getBookings: (status?: string) =>
    api.get('/admin/bookings', { params: { status } }),
  getBooking: (id: string) => api.get(`/admin/bookings/${id}`),

  // Payouts
  getPayouts: (status?: string) =>
    api.get('/admin/payouts', { params: { status } }),
  processPayout: (id: string, referenceNumber: string) =>
    api.post(`/admin/payouts/${id}/process`, { referenceNumber }),
  rejectPayout: (id: string, reason: string) =>
    api.post(`/admin/payouts/${id}/reject`, { reason }),

  // Shops
  getShops: (status?: string) =>
    api.get('/admin/shops', { params: { status } }),
  getShop: (id: string) => api.get(`/admin/shops/${id}`),
  approveShop: (id: string) => api.post(`/admin/shops/${id}/approve`),
  rejectShop: (id: string, reason: string) =>
    api.post(`/admin/shops/${id}/reject`, { reason }),
  suspendShop: (id: string, reason: string) =>
    api.post(`/admin/shops/${id}/suspend`, { reason }),

  // Shop Payouts
  getShopPayouts: (status?: string) =>
    api.get('/admin/shop-payouts', { params: { status } }),
  processShopPayout: (id: string, referenceNumber: string) =>
    api.post(`/admin/shop-payouts/${id}/process`, { referenceNumber }),
  rejectShopPayout: (id: string, reason: string) =>
    api.post(`/admin/shop-payouts/${id}/reject`, { reason }),

  // Users
  getUsers: () => api.get('/admin/users'),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  suspendUser: (id: string) => api.post(`/admin/users/${id}/suspend`),

  // Services
  getServices: () => api.get('/admin/services'),
  createService: (data: any) => api.post('/admin/services', data),
  updateService: (id: string, data: any) =>
    api.patch(`/admin/services/${id}`, data),
  deleteService: (id: string) => api.delete(`/admin/services/${id}`),

  // Reports
  getReports: (status?: string) =>
    api.get('/admin/reports', { params: { status } }),
  getReport: (id: string) => api.get(`/admin/reports/${id}`),
  resolveReport: (id: string, resolution: string, actionTaken: string) =>
    api.post(`/admin/reports/${id}/resolve`, { resolution, actionTaken }),
  dismissReport: (id: string, reason: string) =>
    api.post(`/admin/reports/${id}/dismiss`, { reason }),
};
