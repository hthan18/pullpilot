import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL; // e.g. https://pullpilot-backend.up.railway.app

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth API
export const authAPI = {
  getGitHubAuthUrl: () => api.get('/auth/github'),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Repositories
export const repoAPI = {
  getGitHubRepos: () => api.get('/repositories/github'),
  getConnectedRepos: () => api.get('/repositories'),
  connectRepo: (repo: any) => api.post('/repositories', repo),
  disconnectRepo: (id: number) => api.delete(`/repositories/${id}`),
};

// Reviews
export const reviewAPI = {
  getReviewsByRepo: (repoId: number) => api.get(`/reviews/repository/${repoId}`),
  createReview: (data: { repositoryId: number; prNumber: number }) => api.post('/reviews', data),
  getReview: (id: number) => api.get(`/reviews/${id}`),
};

export default api;
