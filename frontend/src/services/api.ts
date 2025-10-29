import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL; // e.g. https://pullpilot-backend.up.railway.app

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, //  allow sending cookies if backend uses them
});

// ✅ Automatically attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ Handle 401 (unauthorized) globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired, redirecting to login...');
      localStorage.removeItem('token');
      window.location.href = '/'; //auto-redirect to login
    }
    return Promise.reject(error);
  }
);

// --- AUTH ENDPOINTS ---
export const authAPI = {
  getGitHubAuthUrl: async () => {
    const res = await api.get('/auth/github');
    return res.data.url; // return just the URL string
  },
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// --- REPOSITORIES ---
export const repoAPI = {
  getGitHubRepos: () => api.get('/repositories/github'),
  getConnectedRepos: () => api.get('/repositories'),
  connectRepo: (repo: any) => api.post('/repositories', repo),
  disconnectRepo: (id: number) => api.delete(`/repositories/${id}`),
};

// --- REVIEWS ---
export const reviewAPI = {
  getReviewsByRepo: (repoId: number) => api.get(`/reviews/repository/${repoId}`),
  createReview: (data: { repositoryId: number; prNumber: number }) => api.post('/reviews', data),
  getReview: (id: number) => api.get(`/reviews/${id}`),
};

export default api;
