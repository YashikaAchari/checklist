import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t, droneTypeColor, droneTypeLabel } from "../../src/theme";
import { ConnectivityDot } from "../../src/ConnectivityDot";
import { useAuthStore } from "../../src/auth";
import { api, formatApiError } from "../../src/api";
import { useFlightDraft } from "../../src/flightDraft";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [stats, setStats] = useState<any>({ flights: 0, checklists: 0, aircraft: 0 });

  const load = async () => {
    try {
      const [a, b] = await Promise.all([api.get("/checklists"), api.get("/stats/overview")]);
      setChecklists(a.data || []);
      setStats(b.data);
    } catch (e: any) { /* silent fail */ }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  };

  const openChecklist = (cl: any) => {
    useFlightDraft.getState().reset();
    useFlightDraft.getState().setChecklist(cl);
    router.push("/flight/operator-details");
  };

  const openQR = (e: any, cl: any) => {
    e.stopPropagation();
    router.push(`/checklist/${cl.id}/qr`);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="home-screen">
      <View style={styles.topBar}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.brandBadge}>
            <MaterialCommunityIcons name="quadcopter" size={20} color={palette.white} />
          </View>
          <Text style={styles.brand}>FlyReady</Text>
          <ConnectivityDot />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <TouchableOpacity testID="home-notif-btn">
            <Feather name="bell" size={22} color={t.text} />
          </TouchableOpacity>
          <TouchableOpacity testID="home-avatar-btn" onPress={() => router.push("/(tabs)/profile")} style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "?").slice(0, 1).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} />}
      >
        {/* QR scan card */}
        <TouchableOpacity testID="home-scan-card" style={styles.scanCard} onPress={() => router.push("/scan")}>
          <View style={styles.scanIcon}>
            <MaterialCommunityIcons name="qrcode-scan" size={36} color={palette.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>Scan drone QR to begin</Text>
            <Text style={styles.scanSub}>Point camera at QR code on drone</Text>
          </View>
          <Feather name="chevron-right" size={24} color={palette.white} />
        </TouchableOpacity>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.flights || 0}</Text>
            <Text style={styles.statLabel}>flights</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.checklists || 0}</Text>
            <Text style={styles.statLabel}>checklists</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.aircraft || 0}</Text>
            <Text style={styles.statLabel}>aircraft</Text>
          </View>
        </View>

        {/* Checklists */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Your checklists</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {checklists.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="playlist-plus" size={40} color={t.textSecondary} />
            <Text style={styles.emptyText}>No checklists yet</Text>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>Tap + to create your first checklist</Text>
          </View>
        ) : (
          checklists.map((cl) => (
            <TouchableOpacity
              key={cl.id}
              testID={`checklist-card-${cl.id}`}
              style={styles.clCard}
              onPress={() => openChecklist(cl)}
            >
              {/* Drone photo or icon */}
              <View style={[styles.clImage, { backgroundColor: droneTypeColor(cl.drone_type) }]}>
                {cl.drone_photo_url ? (
                  <Image source={{ uri: cl.drone_photo_url }} style={styles.clImageImg} />
                ) : (
                  <MaterialCommunityIcons
                    name={cl.drone_type === "fixed_wing" ? "airplane" : cl.drone_type === "vtol" ? "airplane-takeoff" : "quadcopter"}
                    size={36}
                    color={palette.white}
                  />
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={styles.clName} numberOfLines={1}>{cl.name}</Text>
                <Text style={styles.clMeta}>
                  {droneTypeLabel(cl.drone_type)} · {(cl.phase || "preflight").replace("_", " ")}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: palette.success + "20" }]}>
                    <Text style={[styles.badgeText, { color: palette.success }]}>{cl.flight_count || 0} flights</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: palette.primary + "15" }]}>
                    <Text style={[styles.badgeText, { color: palette.primary }]}>{cl.phase || "preflight"}</Text>
                  </View>
                </View>
              </View>

              {/* QR button — tap to view QR code */}
              <TouchableOpacity
                testID={`qr-btn-${cl.id}`}
                style={styles.qrBtn}
                onPress={(e) => openQR(e, cl)}
              >
                <MaterialCommunityIcons name="qrcode" size={22} color={palette.primary} />
              </TouchableOpacity>

              <Feather name="chevron-right" size={20} color={t.textSecondary} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating + button */}
      <TouchableOpacity
        testID="home-add-checklist-fab"
        style={styles.fab}
        onPress={() => router.push("/checklist/new")}
      >
        <Ionicons name="add" size={32} color={palette.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  brandBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 18, fontWeight: "700", color: t.text, letterSpacing: -0.3 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: palette.white, fontWeight: "700", fontSize: 15 },
  scanCard: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: palette.secondary, padding: 20, borderRadius: 12 },
  scanIcon: { width: 56, height: 56, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  scanTitle: { color: palette.white, fontSize: 16, fontWeight: "700" },
  scanSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  statCard: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border },
  statValue: { fontSize: 22, fontWeight: "700", color: t.text },
  statLabel: { fontSize: 11, color: t.textSecondary, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: t.text },
  seeAll: { fontSize: 13, color: palette.primary, fontWeight: "600" },
  empty: { padding: 32, alignItems: "center", borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, borderStyle: "dashed", gap: 4 },
  emptyText: { color: t.textSecondary, fontSize: 15, fontWeight: "600", marginTop: 8 },
  clCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, marginBottom: 10 },
  clImage: { width: 72, height: 72, borderRadius: 10, alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  clImageImg: { width: "100%", height: "100%" },
  clName: { fontSize: 15, fontWeight: "700", color: t.text },
  clMeta: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  qrBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: palette.primary + "15", alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
});
