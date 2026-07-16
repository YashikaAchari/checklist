import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t, droneTypeLabel, droneTypeColor } from "../../../src/theme";
import { useAuthStore } from "../../../src/auth";
import { useFlightDraft } from "../../../src/flightDraft";
import { api, formatApiError } from "../../../src/api";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export default function ChecklistScanLanding() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [cl, setCl] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        // Use the public endpoint so unauthenticated scanners can see the drone info
        const res = await fetch(`${BASE}/api/public/checklist/${id}`);
        if (!res.ok) {
          setError("Checklist not found.");
        } else {
          const data = await res.json();
          setCl(data);
        }
      } catch (e: any) {
        setError("Could not connect. Check your internet and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const startPreflight = async () => {
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    try {
      const { data } = await api.get(`/checklists/${id}`);
      useFlightDraft.getState().reset();
      useFlightDraft.getState().setChecklist(data);
      router.replace("/flight/operator-details");
    } catch (e: any) {
      setError(formatApiError(e));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="scan-landing-screen">
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} size="large" />
          <Text style={{ color: t.textSecondary, marginTop: 12 }}>Loading checklist…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !cl) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="scan-landing-screen">
        <View style={styles.center}>
          <Feather name="alert-triangle" size={48} color={palette.danger} />
          <Text style={styles.errorTitle}>Checklist not found</Text>
          <Text style={styles.errorSub}>{error || "This QR code may be invalid or the checklist has been deleted."}</Text>
          <TouchableOpacity style={styles.secondary} onPress={() => router.replace("/")}>
            <Text style={styles.secondaryText}>Open FlyReady</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="scan-landing-screen">
      <View style={styles.topBar}>
        <View style={styles.brandBadge}>
          <MaterialCommunityIcons name="quadcopter" size={20} color={palette.white} />
        </View>
        <Text style={styles.brand}>FlyReady</Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.droneImage, { backgroundColor: droneTypeColor(cl.drone_type) }]}>
          {cl.drone_photo_url ? (
            <Image source={{ uri: cl.drone_photo_url }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <MaterialCommunityIcons
              name={cl.drone_type === "fixed_wing" ? "airplane" : cl.drone_type === "vtol" ? "airplane-takeoff" : "quadcopter"}
              size={72}
              color={palette.white}
            />
          )}
        </View>

        <Text style={styles.eyebrow}>Preflight checklist</Text>
        <Text testID="scan-checklist-name" style={styles.name}>{cl.name}</Text>
        <View style={styles.chipsRow}>
          <View style={[styles.chip, { backgroundColor: droneTypeColor(cl.drone_type) + "20" }]}>
            <Text style={[styles.chipText, { color: droneTypeColor(cl.drone_type) }]}>
              {droneTypeLabel(cl.drone_type)}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: palette.primary + "15" }]}>
            <Text style={[styles.chipText, { color: palette.primary }]}>{cl.item_count} items</Text>
          </View>
        </View>

        <Text style={styles.desc}>
          Complete this checklist before every flight. Tap the button below to begin.
        </Text>
      </View>

      <View style={styles.footer}>
        {!user && (
          <Text style={styles.loginHint}>
            You need to log in to begin a flight.
          </Text>
        )}
        <TouchableOpacity testID="scan-start-btn" style={styles.cta} onPress={startPreflight}>
          <Text style={styles.ctaText}>{user ? "Start preflight" : "Log in to begin"}</Text>
          <Ionicons name="arrow-forward" size={20} color={palette.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorTitle: { fontSize: 20, fontWeight: "700", color: t.text, marginTop: 16 },
  errorSub: { fontSize: 14, color: t.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 20 },
  secondary: { marginTop: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: palette.primary },
  secondaryText: { color: palette.primary, fontWeight: "700" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  brandBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 18, fontWeight: "700", color: t.text, letterSpacing: -0.3 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  droneImage: { width: 140, height: 140, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 24 },
  eyebrow: { fontSize: 12, color: t.textSecondary, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },
  name: { fontSize: 24, fontWeight: "700", color: t.text, textAlign: "center", marginTop: 6, letterSpacing: -0.3 },
  chipsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: "700" },
  desc: { fontSize: 14, color: t.textSecondary, textAlign: "center", marginTop: 20, lineHeight: 22, maxWidth: 340 },
  footer: { padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface },
  loginHint: { fontSize: 13, color: t.textSecondary, textAlign: "center", marginBottom: 10 },
  cta: { height: 54, borderRadius: 12, backgroundColor: palette.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText: { color: palette.white, fontSize: 16, fontWeight: "700" },
});
