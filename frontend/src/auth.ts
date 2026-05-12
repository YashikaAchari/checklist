import { create } from "zustand";
import { api, saveToken, clearToken, getToken } from "./api";

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription_tier?: string;
  profile_photo_url?: string | null;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  bootstrap: async () => {
    set({ loading: true });
    const token = await getToken();
    if (!token) { set({ user: null, loading: false }); return; }
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, loading: false });
    } catch {
      await clearToken();
      set({ user: null, loading: false });
    }
  },
  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    await saveToken(data.access_token);
    set({ user: data.user });
  },
  register: async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    await saveToken(data.access_token);
    set({ user: data.user });
  },
  logout: async () => {
    await clearToken();
    set({ user: null });
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  },
}));
