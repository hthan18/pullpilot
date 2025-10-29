import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Auth API
export const authAPI = {
  getGitHubAuthUrl: async () => {
  const res = await api.get('/auth/github');
  return res.data.url;},
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Repository API
export const repoAPI = {
  getGitHubRepos: () => api.get('/repositories/github'),
  getConnectedRepos: () => api.get('/repositories'),
  connectRepo: (repo: any) => api.post('/repositories', repo),
  disconnectRepo: (id: number) => api.delete(`/repositories/${id}`),
};

// Review API
export const reviewAPI = {
  getReviewsByRepo: (repoId: number) => api.get(`/reviews/repository/${repoId}`),
  createReview: (data: { repositoryId: number; prNumber: number }) => 
    api.post('/reviews', data),
  getReview: (id: number) => api.get(`/reviews/${id}`),
};

export default api;