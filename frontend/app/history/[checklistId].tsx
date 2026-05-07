import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t, droneTypeLabel } from "../../src/theme";
import { api } from "../../src/api";

export default function HistoryGroup() {
  const { checklistId } = useLocalSearchParams<{ checklistId: string }>();
  const router = useRouter();
  const [cl, setCl] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    const [a, b] = await Promise.all([
      api.get(`/checklists/${checklistId}`),
      api.get(`/flight_logs/by_checklist/${checklistId}`),
    ]);
    setCl(a.data);
    setLogs(b.data || []);
  };

  useFocusEffect(useCallback(() => { if (checklistId) load(); }, [checklistId]));

  if (!cl) return <SafeAreaView style={styles.container}><Text style={{ padding: 16, color: t.text }}>Loading…</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="history-group-screen">
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.h1} numberOfLines={1}>{cl.name}</Text>
          <Text style={styles.sub}>{droneTypeLabel(cl.drone_type)} · created {(cl.created_at || "").slice(0, 10)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {logs.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="archive" size={32} color={t.textSecondary} />
            <Text style={{ color: t.textSecondary, marginTop: 8 }}>No flights yet for this checklist</Text>
          </View>
        ) : (
          logs.map((l) => {
            const failedCount = (l.executions || []).filter((e: any) => e.state === "fail").length;
            const status = failedCount > 0 ? { label: "Issues flagged", color: palette.warning } : { label: "Complete", color: palette.success };
            return (
              <TouchableOpacity
                key={l.id}
                testID={`flight-row-${l.id}`}
                style={styles.row}
                onPress={() => router.push(`/history/flight/${l.id}`)}
              >
                <View style={styles.serial}>
                  <Text style={styles.serialText}>#{String(l.serial_number).padStart(3, "0")}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flightId}>{l.flight_id}</Text>
                  <Text style={styles.flightMeta}>
                    {l.operator_name || "—"}
                    {l.location_name ? ` · ${l.location_name}` : ""}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color={t.textSecondary} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  sub: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  empty: { padding: 48, alignItems: "center", borderRadius: 12, borderWidth: 0.5, borderColor: t.border, borderStyle: "dashed" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, marginBottom: 8 },
  serial: { width: 56, height: 56, borderRadius: 10, backgroundColor: palette.primary + "10", alignItems: "center", justifyContent: "center" },
  serialText: { color: palette.primary, fontWeight: "700", fontSize: 13 },
  flightId: { fontSize: 14, fontWeight: "700", color: t.text },
  flightMeta: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  statusText: { fontSize: 11, fontWeight: "700" },
});
