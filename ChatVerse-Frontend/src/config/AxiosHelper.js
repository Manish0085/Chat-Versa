import axios from "axios";
export const baseURL = "http://localhost:8081";
export const httpClient = axios.create({
  baseURL: baseURL,
});

httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);