import axios from "axios";

// Clean trailing slash from base URL if present
let rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
if (rawBase.endsWith("/")) {
  rawBase = rawBase.slice(0, -1);
}

const api = axios.create({
  baseURL: rawBase,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("voyager_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Don't auto-redirect if already on login/signup page
      if (!window.location.pathname.startsWith("/login")) {
        localStorage.removeItem("voyager_token");
        localStorage.removeItem("voyager_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
