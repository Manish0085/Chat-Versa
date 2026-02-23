import { httpClient } from "../config/AxiosHelper";

export const loginApi = async (credentials) => {
  const response = await httpClient.post("/api/auth/login", credentials);
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await httpClient.post("/api/auth/register", userData);
  return response.data;
};

export const getAllUsersApi = async () => {
  const response = await httpClient.get("/api/auth/users");
  return response.data;
};
