import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../src/auth";
import { AppThemeProvider, useAppTheme } from "../src/themeContext";

function InnerLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const { isDark } = useAppTheme();
  useEffect(() => { bootstrap(); }, [bootstrap]);
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <InnerLayout />
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
