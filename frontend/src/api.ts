import axios from "axios";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

// Platform-aware token storage. SecureStore is iOS/Android only.
const useSecureStore = Platform.OS === "ios" || Platform.OS === "android";

export const saveToken = async (t: string) => {
  if (useSecureStore) await SecureStore.setItemAsync("access_token", t);
  else await AsyncStorage.setItem("access_token", t);
};
export const clearToken = async () => {
  if (useSecureStore) await SecureStore.deleteItemAsync("access_token");
  else await AsyncStorage.removeItem("access_token");
};
export const getToken = async () => {
  if (useSecureStore) return await SecureStore.getItemAsync("access_token");
  return await AsyncStorage.getItem("access_token");
};

export const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export const formatApiError = (e: any): string => {
  const detail = e?.response?.data?.detail;
  if (!detail) return e?.message || "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((x: any) => x?.msg || JSON.stringify(x)).join(" ");
  }
  return String(detail);
};
