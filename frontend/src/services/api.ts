import axios from 'axios';
import type { GitHubRepository, Repository } from '../types';

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

if (!API_URL) {
  throw new Error('VITE_API_URL is not configured');
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, //  allow sending cookies if backend uses them
});

// --- AUTH ENDPOINTS ---
export const authAPI = {
  getGitHubLoginUrl: () => `${API_URL}/api/auth/github`,

  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// --- REPOSITORIES ---
export const repoAPI = {
  getGitHubRepos: () => api.get('/repositories/github'),
  getConnectedRepos: () => api.get('/repositories'),
  connectRepo: (repo: GitHubRepository) => api.post('/repositories', repo),
  disconnectRepo: (id: number | string) => api.delete(`/repositories/${id}`),
  updateSettings: (id: number | string, settings: Pick<Repository, 'review_instructions' | 'minimum_confidence' | 'minimum_severity' | 'post_to_github'>) => api.patch(`/repositories/${id}/settings`, settings),
};

// --- REVIEWS ---
export const reviewAPI = {
  getReviewsByRepo: (repoId: number | string) => api.get(`/reviews/repository/${repoId}`),
  createReview: (data: { repositoryId: number; prNumber: number }) => api.post('/reviews', data),
  getReview: (id: number | string) => api.get(`/reviews/${id}`),
  getFeedback: (id: number | string) => api.get(`/reviews/${id}/feedback`),
  saveFeedback: (id: number | string, findingIndex: number, disposition: 'accepted' | 'dismissed', reason?: string) => api.post(`/reviews/${id}/findings/${findingIndex}/feedback`, { disposition, reason }),
  publish: (id: number | string) => api.post(`/reviews/${id}/publish`),
  getAnalytics: () => api.get('/reviews/analytics/summary'),
};

export const issueAPI = {
  getAll: () => api.get('/issues'),
  getByRepo: (repoId: number) => api.get(`/issues/repository/${repoId}`),
};

export default api;
