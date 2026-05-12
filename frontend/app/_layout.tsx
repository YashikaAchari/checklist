import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { useAuthStore } from "../src/auth";

export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const scheme = useColorScheme();
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
