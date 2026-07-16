import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme, Theme } from "./theme";

type ThemeMode = "light" | "dark" | "system";

type Ctx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  theme: Theme;
  isDark: boolean;
  ready: boolean;
};

const ThemeCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "flyready_theme_mode";

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const sysScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (v === "light" || v === "dark" || v === "system") setModeState(v);
      } catch {}
      setReady(true);
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const isDark = mode === "dark" || (mode === "system" && sysScheme === "dark");
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeCtx.Provider value={{ mode, setMode, theme, isDark, ready }}>
      {children}
    </ThemeCtx.Provider>
  );
};

export const useAppTheme = (): Ctx => {
  const c = useContext(ThemeCtx);
  if (!c) {
    // Fallback for consumers used before provider — return light values, no-op setter
    return {
      mode: "light",
      setMode: () => {},
      theme: lightTheme,
      isDark: false,
      ready: true,
    };
  }
  return c;
};
