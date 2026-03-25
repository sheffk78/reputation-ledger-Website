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
        // Don't redirect if already on login/signup page (auth errors are expected there)
        const isAuthPage = window.location.pathname === "/login" || window.location.pathname === "/signup";
        if (!isAuthPage) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
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

  createDemo: async () => {
    const response = await apiClientV1.post("/agents/demo");
    return response.data;
  },

  getScore: async (agentId) => {
    const response = await apiClientV1.get(`/agents/${agentId}/score`);
    return response.data;
  },

  togglePublic: async (agentId, isPublic) => {
    const response = await apiClientV1.patch(`/agents/${agentId}/public`, { is_public: isPublic });
    return response.data;
  },

  getPublicProfile: async (agentId) => {
    const response = await apiClient.get(`/public/agents/${agentId}`);
    return response.data;
  },
};

// Outcomes API (v1)
export const outcomesAPI = {
  list: async (agentId, page = 1, limit = 20) => {
    const response = await apiClientV1.get(`/agents/${agentId}/outcomes`, {
      params: { page, limit }
    });
    return response.data;
  },

  create: async (agentId, data) => {
    const response = await apiClientV1.post(`/agents/${agentId}/outcomes`, data);
    return response.data;
  },
};

// Webhooks API (v1)
export const webhooksAPI = {
  list: async () => {
    const response = await apiClientV1.get("/webhooks");
    return response.data;
  },

  get: async (webhookId) => {
    const response = await apiClientV1.get(`/webhooks/${webhookId}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClientV1.post("/webhooks", data);
    return response.data;
  },

  delete: async (webhookId) => {
    const response = await apiClientV1.delete(`/webhooks/${webhookId}`);
    return response.data;
  },
};

// Flags API (v1)
export const flagsAPI = {
  list: async (agentId) => {
    const response = await apiClientV1.get(`/agents/${agentId}/flags`);
    return response.data;
  },

  create: async (agentId, data) => {
    const response = await apiClientV1.post(`/agents/${agentId}/flags`, data);
    return response.data;
  },
};

// Password Reset API
export const passwordResetAPI = {
  request: async (email) => {
    const response = await apiClient.post("/auth/password-reset/request", { email });
    return response.data;
  },

  confirm: async (token, newPassword) => {
    const response = await apiClient.post("/auth/password-reset/confirm", {
      token,
      new_password: newPassword,
    });
    return response.data;
  },
};

export default apiClient;
