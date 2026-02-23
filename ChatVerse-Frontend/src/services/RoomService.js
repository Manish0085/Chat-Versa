import { httpClient } from "../config/AxiosHelper";

export const createRoomApi = async (roomId, roomName) => {
  const response = await httpClient.post(`/api/v1/rooms`, { roomId, roomName });
  return response.data;
};

export const joinChatApi = async (roomId) => {
  const response = await httpClient.get(`/api/v1/rooms/${roomId}`);
  return response.data;
};

export const getRoomsApi = async () => {
  const response = await httpClient.get(`/api/v1/rooms`);
  return response.data;
};

export const getMessagess = async (roomId, limit = 100) => {
  const response = await httpClient.get(
    `/api/v1/rooms/${roomId}/messages?limit=${limit}`
  );
  return response.data;
};

export const uploadFileApi = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await httpClient.post(`/api/v1/files/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};