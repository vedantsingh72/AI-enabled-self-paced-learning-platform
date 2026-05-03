import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const id = localStorage.getItem("anonymousId");
  if (id) config.headers["x-anonymous-id"] = id;
  const userToken = localStorage.getItem("userToken");
  const adminToken = localStorage.getItem("adminToken");

  // If only admin session exists, use admin token for all protected calls.
  const isLearningAdmin = config.url?.startsWith("/learning/admin");

  if (adminToken && !userToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
    return config;
  }

  if (
    userToken &&
    !config.url?.startsWith("/admin") &&
    !isLearningAdmin
  ) {
    config.headers.Authorization = `Bearer ${userToken}`;
  } else if (
    (config.url?.startsWith("/admin") || isLearningAdmin) &&
    adminToken
  ) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  return config;
});

export default api;
