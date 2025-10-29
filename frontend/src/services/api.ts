import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Attach token before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- AUTH ENDPOINTS ---
export const authAPI = {
  loginWithGitHub: () => api.get("/auth/github"),
  getCurrentUser: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// --- REPOSITORIES ENDPOINTS ---
export const repoAPI = {
  getConnectedRepos: () => api.get("/repositories"),
  getGitHubRepos: () => api.get("/repositories/github"),
  connectRepo: (data: any) => api.post("/repositories", data),
  disconnectRepo: (id: number) => api.delete(`/repositories/${id}`),
};

// --- REVIEWS ENDPOINTS ---
export const reviewAPI = {
  getByRepository: (repoId: string) => api.get(`/reviews/repository/${repoId}`),
  create: (data: any) => api.post("/reviews", data),
  getById: (id: string) => api.get(`/reviews/${id}`),
};

// Default export (for base axios usage if needed)
export default api;
