import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as t, palette } from "../../src/theme";
import { api } from "../../src/api";

type FilterKey = "week" | "month" | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

export default function History() {
  const router = useRouter();
  const [checklists, setChecklists] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = async () => {
    try {
      const { data: cls } = await api.get("/checklists");
      setChecklists(cls || []);
      // Fetch logs for all checklists in parallel
      const logs = await Promise.all(
        (cls || []).map((c: any) =>
          api.get(`/flight_logs/by_checklist/${c.id}`).then((r) => r.data).catch(() => [])
        )
      );
      const flat: any[] = [];
      logs.forEach((arr, idx) => {
        const cl = cls[idx];
        (arr || []).forEach((l: any) => {
          flat.push({ ...l, checklist_name: cl.name, drone_type: cl.drone_type });
        });
      });
      // Sort by created_at desc
      flat.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      setAllLogs(flat);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, []));

  const onRefresh = async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  };

  const filtered = useMemo(() => {
    if (filter === "all") return allLogs;
    const now = Date.now();
    const cutoff = filter === "week" ? now - 7 * 86400000 : now - 30 * 86400000;
    return allLogs.filter((l) => {
      const t = new Date(l.created_at || 0).getTime();
      return t >= cutoff;
    });
  }, [allLogs, filter]);

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const fmtDuration = (secs?: number) => {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="history-screen">
      <View style={styles.topBar}>
        <Text style={styles.h1}>History</Text>
        <Text testID="history-total" style={styles.totalCount}>
          {allLogs.length} total flight{allLogs.length === 1 ? "" : "s"}
        </Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            testID={`history-filter-${f.key}`}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
            <Text style={{ color: t.textSecondary, marginTop: 8, fontSize: 13 }}>Loading history…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="archive" size={32} color={t.textSecondary} />
            <Text style={{ color: t.textSecondary, marginTop: 8 }}>
              {allLogs.length === 0 ? "No flights logged yet" : "No flights in this range"}
            </Text>
          </View>
        ) : (
          filtered.map((l) => {
            const executions = l.executions || [];
            const passed = executions.filter((e: any) => e.state === "pass").length;
            const failed = executions.filter((e: any) => e.state === "fail").length;
            return (
              <TouchableOpacity
                key={l.id}
                testID={`history-row-${l.id}`}
                style={styles.card}
                onPress={() => router.push(`/history/flight/${l.id}`)}
              >
                <View style={styles.serial}>
                  <Text style={styles.serialText}>#{String(l.serial_number || 0).padStart(3, "0")}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checklistName} numberOfLines={1}>{l.checklist_name || "Flight"}</Text>
                  <Text style={styles.row1}>
                    {fmtDate(l.created_at)} · {l.operator_name || "—"}
                  </Text>
                  <Text style={styles.row2} numberOfLines={1}>
                    <Feather name="map-pin" size={11} color={t.textSecondary} /> {l.location_name || "No location"}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: palette.success + "20" }]}>
                      <Text style={[styles.badgeText, { color: palette.success }]}>{passed} pass</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: failed > 0 ? palette.danger + "20" : t.border }]}>
                      <Text style={[styles.badgeText, { color: failed > 0 ? palette.danger : t.textSecondary }]}>
                        {failed} fail
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: palette.primary + "15" }]}>
                      <Text style={[styles.badgeText, { color: palette.primary }]}>{fmtDuration(l.flight_duration_seconds)}</Text>
                    </View>
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
  topBar: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 24, fontWeight: "700", color: t.text },
  totalCount: { fontSize: 13, color: t.textSecondary, marginTop: 4, fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: t.surface, borderBottomWidth: 0.5, borderBottomColor: t.border },
  filterTab: { flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: t.border, alignItems: "center" },
  filterTabActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  filterText: { fontSize: 12, color: t.textSecondary, fontWeight: "600" },
  filterTextActive: { color: palette.white },
  center: { padding: 48, alignItems: "center" },
  empty: { padding: 48, alignItems: "center", borderWidth: 0.5, borderColor: t.border, borderStyle: "dashed", borderRadius: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, marginBottom: 10 },
  serial: { width: 56, height: 56, borderRadius: 10, backgroundColor: palette.primary + "10", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  serialText: { color: palette.primary, fontWeight: "700", fontSize: 12 },
  checklistName: { fontSize: 14, fontWeight: "700", color: t.text },
  row1: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  row2: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "700" },
});
