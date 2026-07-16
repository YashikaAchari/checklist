import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../src/auth";
import { palette } from "../src/theme";
import { FlyReadyLogo } from "../src/Logo";

const ONBOARDING_KEY = "flyready_onboarding_done";

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    (async () => {
      let onboardingDone = false;
      try {
        const v = await AsyncStorage.getItem(ONBOARDING_KEY);
        onboardingDone = v === "true";
      } catch {}

      const nav = () => {
        if (user) {
          router.replace("/(tabs)/home");
        } else if (onboardingDone) {
          router.replace("/(auth)/login");
        } else {
          router.replace("/(auth)/onboarding");
        }
      };
      // Small splash pause
      setTimeout(nav, 800);
    })();
  }, [user, loading, router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <FlyReadyLogo size={140} />
      <Text style={styles.title}>FlyReady</Text>
      <Text style={styles.tagline}>Preflight · Inflight · Postflight</Text>
      <View style={{ height: 24 }} />
      <ActivityIndicator color={palette.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    color: palette.white,
    fontSize: 32,
    fontWeight: "700",
    marginTop: 16,
    letterSpacing: -0.5,
  },
  tagline: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    marginTop: 8,
  },
});
