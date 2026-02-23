import axios from "axios";
export const baseURL = "http://13.203.93.149:8082";
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