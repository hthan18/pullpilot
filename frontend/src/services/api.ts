import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Token middleware
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- EXISTING ENDPOINTS (keep yours) ---
// Example: export const repoAPI = {...}

export const reviewAPI = {
  getByRepository: (repoId: string) => api.get(`/reviews/repository/${repoId}`),
  create: (data: any) => api.post("/reviews", data),
  getById: (id: string) => api.get(`/reviews/${id}`),
};

export default api;
