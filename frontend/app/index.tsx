import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/auth";
import { palette } from "../src/theme";
import { FlyReadyLogo } from "../src/Logo";

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (user) router.replace("/(tabs)/home");
      else router.replace("/(auth)/onboarding");
    }, 1500);
    return () => clearTimeout(t);
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
