import axios from 'axios';
import { getStoredAuth, setStoredAuth, clearStoredAuth } from './authStorage';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

// Axios instance with JWT interceptor
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT
api.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.access_token) {
    config.headers.Authorization = `Bearer ${auth.access_token}`;
  }
  return config;
});

// Response interceptor - handle 401 refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const auth = getStoredAuth();
      if (!auth?.refresh_token) {
        clearStoredAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: auth.refresh_token,
        });
        const { access_token, refresh_token, user } = response.data;
        setStoredAuth({ access_token, refresh_token, user });
        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearStoredAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============ AUTH ============

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  refresh: (refresh_token) => api.post('/auth/refresh', { refresh_token }),
  telegramAuth: (formData) => api.post('/auth/telegram', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  vkAuth: (formData) => api.post('/auth/vk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ============ PROFILES ============

export const profilesApi = {
  getMe: () => api.get('/profiles/me'),
  updateMe: (data) => api.put('/profiles/me', data),
  getById: (userId) => api.get(`/profiles/${userId}`),
  getStats: (userId) => api.get(`/users/${userId}/stats`),
};

// ============ EVENTS ============

export const eventsApi = {
  list: (params = {}) => api.get('/events', { params }),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  join: (id) => api.post(`/events/${id}/join`),
  leave: (id) => api.post(`/events/${id}/leave`),
  getParticipants: (id) => api.get(`/events/${id}/participants`),
  invite: (id, userIds) => api.post(`/events/${id}/invite`, null, {
    params: { user_ids: userIds },
  }),
  getBoardGames: (id) => api.get(`/events/${id}/board-games`),
  checkParticipation: (eventId, userId) => api.get(`/events/${eventId}/participation/${userId}`),
};

// ============ CHAT ============

export const chatApi = {
  getRooms: () => api.get('/chat-rooms'),
  getMessages: (eventId) => api.get(`/events/${eventId}/chat`),
  sendMessage: (eventId, message) => api.post(`/events/${eventId}/chat`, message, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }),
};

// ============ REVIEWS ============

export const reviewsApi = {
  list: (eventId) => api.get(`/events/${eventId}/reviews`),
  create: (eventId, data) => api.post(`/events/${eventId}/reviews`, data),
};

// ============ NOTIFICATIONS ============

export const notificationsApi = {
  list: () => api.get('/notifications'),
  create: (data) => api.post('/notifications', data),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// ============ FRIENDS ============

export const friendsApi = {
  list: () => api.get('/friends'),
  request: (friendId) => api.post('/friends/request', { friend_id: friendId }),
  accept: (id) => api.put(`/friends/${id}/accept`),
  remove: (id) => api.delete(`/friends/${id}`),
};

// ============ INVITATIONS ============

export const invitationsApi = {
  list: () => api.get('/invitations'),
  accept: (id) => api.put(`/invitations/${id}/accept`),
  reject: (id) => api.put(`/invitations/${id}/reject`),
};

// ============ REPORTS ============

export const reportsApi = {
  create: (eventId, reason) => api.post('/reports', { event_id: eventId, reason }),
};

// ============ UPLOAD ============

export const uploadApi = {
  upload: (file, type = 'event') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ============ DICTIONARIES ============

export const dictionariesApi = {
  get: (tableName) => api.get(`/dictionaries/${tableName}`),
  getById: (tableName, id) => api.get(`/dictionaries/${tableName}/${id}`),
};

// ============ RPC ============

export const rpcApi = {
  updateLifecycleStatus: () => api.post('/rpc/update_event_lifecycle_status'),
};

// ============ PROMO CODES ============

export const promoCodesApi = {
  validate: (code, category) => api.get(`/promo-codes/validate/${code}`, { params: { category } }),
  adminList: () => api.get('/admin/promo-codes'),
  adminCreate: (formData) => api.post('/admin/promo-codes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  adminDelete: (id) => api.delete(`/admin/promo-codes/${id}`),
};

// ============ COMMISSION ============

export const commissionApi = {
  get: () => api.get('/admin/commission'),
  update: (formData) => api.put('/admin/commission', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  listDiscounts: () => api.get('/admin/commission-discounts'),
  createDiscount: (formData) => api.post('/admin/commission-discounts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteDiscount: (id) => api.delete(`/admin/commission-discounts/${id}`),
};

// ============ GAMIFICATION ============

export const gamificationApi = {
  get: (userId) => api.get(`/users/${userId}/gamification`),
};

// ============ ADMIN ============

export const adminApi = {
  listUsers: (params = {}) => api.get('/admin/users', { params }),
  blockUser: (userId, reason) => {
    const formData = new FormData();
    formData.append('reason', reason || '');
    return api.post(`/admin/users/${userId}/block`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  unblockUser: (userId) => api.post(`/admin/users/${userId}/unblock`),
  listBlockAppeals: () => api.get('/admin/block-appeals'),
  approveAppeal: (id) => api.post(`/admin/block-appeals/${id}/approve`),
  rejectAppeal: (id, comment) => api.post(`/admin/block-appeals/${id}/reject`, { comment }),
  listReports: (params = {}) => api.get('/admin/reports', { params }),
  updateReport: (id, status) => api.put(`/admin/reports/${id}`, { status }),
  blockEvent: (eventId) => api.post(`/admin/events/${eventId}/block`),
};

// ============ USERS ============

export const usersApi = {
  search: (query) => api.get('/users/search', { params: { q: query } }),
  getBlockStatus: (userId) => api.get(`/users/${userId}/block-status`),
};

// WebSocket helpers
export const wsHelpers = {
  getNotificationsUrl: (token) => {
    const wsBase = (import.meta.env.VITE_WS_URL || '').replace(/^http/, 'ws') || 
                   `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    return `${wsBase}/ws/notifications?token=${token}`;
  },
  getChatUrl: (roomId, token) => {
    const wsBase = (import.meta.env.VITE_WS_URL || '').replace(/^http/, 'ws') || 
                   `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    return `${wsBase}/ws/chat/${roomId}?token=${token}`;
  },
};

export default api;
