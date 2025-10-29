import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  getGitHubAuthUrl: () => api.get("/auth/github/url"),
  loginWithGitHub: (code: string) => api.post("/auth/github/login", { code }),
  getCurrentUser: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

export const repoAPI = {
  getConnectedRepos: () => api.get("/repositories"),
  connectRepo: (data: any) => api.post("/repositories/connect", data),
  disconnectRepo: (id: string) => api.delete(`/repositories/${id}`),
};

export const reviewAPI = {
  getByRepository: (repoId: string) => api.get(`/reviews/repository/${repoId}`),
  create: (data: any) => api.post("/reviews", data),
  getById: (id: string) => api.get(`/reviews/${id}`),
};

export default api;
