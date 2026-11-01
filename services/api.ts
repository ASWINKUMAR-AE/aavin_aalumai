import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Set EXPO_PUBLIC_API_BASE_URL for a physical device or deployed backend, e.g.
// EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000/api/v1
// Android emulator uses 10.0.2.2; web and iOS simulator use localhost by default.
const defaultBaseUrl = Platform.select({
  android: "http://10.0.2.2:8000/api/v1",
  ios: "http://localhost:8000/api/v1",
  default: "http://localhost:8000/api/v1",
});
const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || defaultBaseUrl).replace(/\/$/, "");

export const API_BASE_URL = BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const stored = await AsyncStorage.getItem("@aavin_user_session");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    }
  } catch (e) {
    // Ignore error
  }
  return config;
});

export default apiClient;

