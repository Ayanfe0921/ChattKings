import axios from "axios";

export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.MODE === "development"
    ? "http://localhost:3001"
    : window.location.origin);

export const axiosInstance = axios.create({
  baseURL: `${SERVER_URL}/api`,
  withCredentials: true,
});
