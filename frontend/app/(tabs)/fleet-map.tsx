import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t, droneTypeColor, droneTypeLabel } from "../../src/theme";
import { api } from "../../src/api";

export default function FleetMap() {
  const router = useRouter();
  const [drones, setDrones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = async () => {
    try {
      const { data: cls } = await api.get("/checklists");
      const results: any[] = [];
      // For each checklist, fetch the latest flight log to get its last location
      await Promise.all((cls || []).map(async (cl: any) => {
        try {
          const { data: logs } = await api.get(`/flight_logs/by_checklist/${cl.id}`);
          const withLoc = (logs || []).find((l: any) => l.latitude != null && l.longitude != null);
          results.push({
            id: cl.id,
            name: cl.name,
            drone_type: cl.drone_type,
            drone_photo_url: cl.drone_photo_url,
            last_flight: logs?.[0] || null,
            location: withLoc ? {
              lat: withLoc.latitude,
              lng: withLoc.longitude,
              name: withLoc.location_name,
              date: withLoc.created_at,
            } : null,
          });
        } catch { /* skip */ }
      }));
      setDrones(results);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, []));

  const onRefresh = async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  };

  const openMap = (lat: number, lng: number) => {
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(url, "_blank");
    }
    // On native, just open in browser via Linking
    import("expo-linking").then((L) => L.openURL(url)).catch(() => {});
  };

  const withLocation = drones.filter((d) => d.location);

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="fleet-map-screen">
      <View style={styles.topBar}>
        <Text style={styles.h1}>Fleet map</Text>
        <Text style={styles.sub}>
          {withLocation.length} of {drones.length} drones have logged flight locations
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
            <Text style={{ color: t.textSecondary, marginTop: 8 }}>Loading fleet…</Text>
          </View>
        ) : drones.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="map" size={40} color={t.textSecondary} />
            <Text style={styles.emptyTitle}>No drones yet</Text>
            <Text style={styles.emptySub}>Create a checklist and log a flight to see it here.</Text>
          </View>
        ) : (
          drones.map((d) => (
            <View key={d.id} style={styles.card} testID={`fleet-card-${d.id}`}>
              <View style={styles.cardTop}>
                <View style={[styles.droneIcon, { backgroundColor: droneTypeColor(d.drone_type) }]}>
                  {d.drone_photo_url ? (
                    <Image source={{ uri: d.drone_photo_url }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <MaterialCommunityIcons
                      name={d.drone_type === "fixed_wing" ? "airplane" : d.drone_type === "vtol" ? "airplane-takeoff" : "quadcopter"}
                      size={26}
                      color={palette.white}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName} numberOfLines={1}>{d.name}</Text>
                  <Text style={styles.cardMeta}>{droneTypeLabel(d.drone_type)}</Text>
                </View>
              </View>

              {d.location ? (
                <>
                  <View style={styles.locRow}>
                    <Feather name="map-pin" size={14} color={palette.primary} />
                    <Text style={styles.locName}>{d.location.name || `${d.location.lat.toFixed(4)}, ${d.location.lng.toFixed(4)}`}</Text>
                  </View>
                  <Text style={styles.dateText}>
                    Last flight: {new Date(d.location.date).toLocaleDateString()}
                  </Text>

                  {Platform.OS === "web" ? (
                    <View style={styles.mapEmbed}>
                      <iframe
                        title={`map-${d.id}`}
                        width="100%"
                        height="180"
                        style={{ border: 0, borderRadius: 8 }}
                        loading="lazy"
                        src={`https://www.google.com/maps?q=${d.location.lat},${d.location.lng}&z=13&output=embed`}
                      />
                    </View>
                  ) : null}

                  <TouchableOpacity
                    testID={`fleet-open-map-${d.id}`}
                    style={styles.openMapBtn}
                    onPress={() => openMap(d.location.lat, d.location.lng)}
                  >
                    <Feather name="external-link" size={14} color={palette.primary} />
                    <Text style={styles.openMapText}>Open in Google Maps</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.noLocBox}>
                  <Feather name="map-pin" size={14} color={t.textSecondary} />
                  <Text style={styles.noLocText}>No flight with GPS coordinates yet</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 24, fontWeight: "700", color: t.text },
  sub: { fontSize: 13, color: t.textSecondary, marginTop: 2 },
  center: { padding: 48, alignItems: "center" },
  empty: { padding: 48, alignItems: "center", borderRadius: 12, borderWidth: 0.5, borderColor: t.border, borderStyle: "dashed" },
  emptyTitle: { color: t.text, fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptySub: { color: t.textSecondary, fontSize: 13, marginTop: 4, textAlign: "center" },
  card: { padding: 14, borderRadius: 14, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  droneIcon: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardName: { fontSize: 15, fontWeight: "700", color: t.text },
  cardMeta: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  locName: { fontSize: 13, color: t.text, fontWeight: "600", flex: 1 },
  dateText: { fontSize: 11, color: t.textSecondary, marginTop: 4 },
  mapEmbed: { marginTop: 10, borderRadius: 8, overflow: "hidden", borderWidth: 0.5, borderColor: t.border },
  openMapBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: palette.primary },
  openMapText: { fontSize: 12, color: palette.primary, fontWeight: "700" },
  noLocBox: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  noLocText: { fontSize: 12, color: t.textSecondary },
});
