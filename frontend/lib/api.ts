import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  sendOTP: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

// Users
export const usersAPI = {
  getAll: (params?: any) => api.get('/users', { params }),
  getOne: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Courses
export const coursesAPI = {
  getAll: (params?: any) => api.get('/courses', { params }),
  getOne: (id: string) => api.get(`/courses/${id}`),
  create: (data: any) => api.post('/courses', data),
  update: (id: string, data: any) => api.put(`/courses/${id}`, data),
  delete: (id: string) => api.delete(`/courses/${id}`),
  enroll: (id: string) => api.post(`/courses/${id}/enroll`),
  updateProgress: (id: string, data: any) => api.post(`/courses/${id}/progress`, data),
};

// Quizzes
export const quizzesAPI = {
  getAll: (params?: any) => api.get('/quizzes', { params }),
  getOne: (id: string) => api.get(`/quizzes/${id}`),
  create: (data: any) => api.post('/quizzes', data),
  update: (id: string, data: any) => api.put(`/quizzes/${id}`, data),
  publish: (id: string) => api.patch(`/quizzes/${id}/publish`),
  submit: (id: string, data: any) => api.post(`/quizzes/${id}/submit`, data),
  getResults: (id: string) => api.get(`/quizzes/${id}/results`),
};

// Gamification
export const gamificationAPI = {
  getLeaderboard: () => api.get('/gamification/leaderboard'),
  getProfile: () => api.get('/gamification/profile'),
  getBadges: () => api.get('/gamification/badges'),
};

// SOPs
export const sopsAPI = {
  getAll: () => api.get('/sops'),
  getOne: (id: string) => api.get(`/sops/${id}`),
  create: (data: any) => api.post('/sops', data),
  update: (id: string, data: any) => api.put(`/sops/${id}`, data),
};

// KPI
export const kpiAPI = {
  getAll: () => api.get('/kpis'),
  create: (data: any) => api.post('/kpis', data),
  addEntry: (data: any) => api.post('/kpis/entries', data),
  getScorecard: (userId: string) => api.get(`/kpis/scorecard/${userId}`),
};

// Subscriptions
export const subscriptionAPI = {
  getPlans: () => api.get('/plans'),
  createOrder: (data: any) => api.post('/subscriptions/order', data),
  verifyPayment: (data: any) => api.post(`/subscriptions/verify`, data),
  getCurrent: () => api.get(`/subscriptions/current`),
  getHistory: () => api.get(`/payments/history`),
};

// CRM
export const crmAPI = {
  getLeads: (params?: any) => api.get('/crm/leads', { params }),
  createLead: (data: any) => api.post('/crm/leads', data),
  updateLead: (id: string, data: any) => api.put(`/crm/leads/${id}`, data),
};

// Admin
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getOrgs: () => api.get('/admin/orgs'),
  createOrg: (data: any) => api.post('/admin/orgs', data),
};

// Live Classes
export const liveClassesAPI = {
  getAll: (params?: any) => api.get('/live-classes', { params }),
  create: (data: any) => api.post('/live-classes', data),
  attend: (id: string) => api.post(`/live-classes/${id}/attend`),
};

// Modules
export const modulesAPI = {
  create: (data: any) => api.post('/modules', data),
  update: (id: string, data: any) => api.put(`/modules/${id}`, data),
  delete: (id: string) => api.delete(`/modules/${id}`),
};

// Lessons
export const lessonsAPI = {
  create: (data: any) => api.post('/lessons', data),
  update: (id: string, data: any) => api.put(`/lessons/${id}`, data),
  delete: (id: string) => api.delete(`/lessons/${id}`),
};

// Certificates
export const certificatesAPI = {
  getAll: () => api.get('/certificates'),
  issue: (data: any) => api.post('/certificates/issue', data),
  verify: (number: string) => api.get(`/certificates/verify/${number}`),
};

// AI
export const aiAPI = {
  getStatus:               () => api.get('/ai/status'),
  generateCourse:          (data: any) => api.post('/ai/generate-course', data),
  generateQuiz:            (data: any) => api.post('/ai/generate-quiz', data),
  generateCertificateText: (data: any) => api.post('/ai/generate-certificate-text', data),
  improveContent:          (data: any) => api.post('/ai/improve-content', data),
  chat:                    (data: any) => api.post('/ai/chat', data),
};

// CMS
export const cmsAPI = {
  getSettings:    ()           => api.get('/cms/settings'),
  updateSettings: (data: any)  => api.put('/cms/settings', data),
  getFields:      (params?: any) => api.get('/cms/fields', { params }),
  createField:    (data: any)  => api.post('/cms/fields', data),
  updateField:    (id: string, data: any) => api.put(`/cms/fields/${id}`, data),
  deleteField:    (id: string) => api.delete(`/cms/fields/${id}`),
  getFieldValues: (params: any) => api.get('/cms/field-values', { params }),
  saveFieldValues:(data: any)  => api.post('/cms/field-values', data),
  getMenu:        ()           => api.get('/cms/menu'),
  saveMenu:       (data: any)  => api.post('/cms/menu', data),
  createBadge:    (data: any)  => api.post('/cms/badges', data),
  createChallenge:(data: any)  => api.post('/cms/challenges', data),
  createReward:   (data: any)  => api.post('/cms/rewards', data),
};

// Enhanced Gamification
export const gamAPI = {
  getDashboard:   () => api.get('/gamification/dashboard'),
  getChallenges:  () => api.get('/gamification/challenges'),
  joinChallenge:  (id: string) => api.post(`/gamification/challenges/${id}/join`),
  getRewards:     () => api.get('/gamification/rewards'),
  redeemReward:   (id: string) => api.post(`/gamification/rewards/${id}/redeem`),
  awardPoints:    (data: any)  => api.post('/gamification/award-points', data),
};
