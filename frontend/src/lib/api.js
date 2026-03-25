import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const API_V1 = `${BACKEND_URL}/api/v1`;

// Create axios instance with interceptors
const apiClient = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json",
  },
});

const apiClientV1 = axios.create({
  baseURL: API_V1,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
const addAuthInterceptor = (client) => {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(apiClient);
addAuthInterceptor(apiClientV1);

// Auth API
export const authAPI = {
  signup: async (email, password) => {
    const response = await apiClient.post("/auth/signup", { email, password });
    return response.data;
  },

  login: async (email, password) => {
    const response = await apiClient.post("/auth/login", { email, password });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },
};

// API Key API
export const apiKeyAPI = {
  get: async () => {
    const response = await apiClient.get("/api-key");
    return response.data;
  },

  regenerate: async () => {
    const response = await apiClient.post("/api-key/regenerate");
    return response.data;
  },
};

// Agents API (v1)
export const agentsAPI = {
  list: async () => {
    const response = await apiClientV1.get("/agents");
    return response.data;
  },

  get: async (agentId) => {
    const response = await apiClientV1.get(`/agents/${agentId}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClientV1.post("/agents", data);
    return response.data;
  },

  getScore: async (agentId) => {
    const response = await apiClientV1.get(`/agents/${agentId}/score`);
    return response.data;
  },
};

// Outcomes API (v1)
export const outcomesAPI = {
  list: async (agentId, page = 1, limit = 20) => {
    const response = await apiClientV1.get(
      `/agents/${agentId}/outcomes?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  create: async (agentId, data) => {
    const response = await apiClientV1.post(`/agents/${agentId}/outcomes`, data);
    return response.data;
  },
};

// Get badge URL (public, no auth needed)
export const getBadgeUrl = (agentId) => {
  return `${API_V1}/agents/${agentId}/badge.svg`;
};

export default apiClient;
