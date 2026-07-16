import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Modal } from "react-native";
import { useFocusEffect } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t, droneTypeColor, droneTypeLabel } from "../../src/theme";
import { api, formatApiError } from "../../src/api";

const THRESHOLD = 50;
const DUE_SOON = 40;

export default function Maintenance() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [modal, setModal] = useState<{ title: string; msg: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const { data } = await api.get("/maintenance/overview");
      setItems(data || []);
    } catch (e: any) {
      setModal({ title: "Error", msg: formatApiError(e) });
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

  const logMaintenance = async (checklistId: string, name: string) => {
    setBusy(checklistId);
    try {
      await api.post("/maintenance/log", { checklist_id: checklistId, notes: "Reset via app" });
      await load();
      setModal({ title: "Maintenance logged", msg: `${name} — flight counter reset. Fly safe!` });
    } catch (e: any) {
      setModal({ title: "Could not log", msg: formatApiError(e) });
    } finally {
      setBusy(null);
    }
  };

  const overdueCount = items.filter((i) => i.maintenance_due).length;

  const fmtDate = (iso: string | null) => {
    if (!iso) return "Never";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch { return "—"; }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="maintenance-screen">
      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modal?.title}</Text>
            <Text style={styles.modalMsg}>{modal?.msg}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setModal(null)}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.topBar}>
        <Text style={styles.h1}>Maintenance</Text>
        <Text style={styles.sub}>Track flights per drone and stay on top of servicing</Text>
      </View>

      {overdueCount > 0 && (
        <View style={styles.overdueBanner} testID="maintenance-overdue-banner">
          <Feather name="alert-triangle" size={18} color={palette.white} />
          <Text style={styles.overdueText}>
            {overdueCount} drone{overdueCount === 1 ? "" : "s"} overdue for maintenance
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
            <Text style={{ color: t.textSecondary, marginTop: 8 }}>Loading maintenance overview…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="wrench-outline" size={40} color={t.textSecondary} />
            <Text style={{ color: t.textSecondary, marginTop: 8 }}>No drones yet. Create a checklist to start tracking.</Text>
          </View>
        ) : (
          items.map((it) => {
            const pct = Math.min(100, Math.round((it.flight_count / THRESHOLD) * 100));
            const status = it.maintenance_due ? "overdue" : it.due_soon ? "soon" : "ok";
            const statusColor = status === "overdue" ? palette.danger : status === "soon" ? palette.warning : palette.success;
            const statusLabel = status === "overdue" ? "Overdue" : status === "soon" ? "Due soon" : "OK";
            const iconName = it.drone_type === "fixed_wing" ? "airplane" : it.drone_type === "vtol" ? "airplane-takeoff" : "quadcopter";
            return (
              <View key={it.checklist_id} style={styles.card} testID={`maintenance-card-${it.checklist_id}`}>
                <View style={styles.cardTop}>
                  <View style={[styles.droneIcon, { backgroundColor: droneTypeColor(it.drone_type) }]}>
                    {it.drone_photo_url ? (
                      <Image source={{ uri: it.drone_photo_url }} style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <MaterialCommunityIcons name={iconName as any} size={28} color={palette.white} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName} numberOfLines={1}>{it.name}</Text>
                    <Text style={styles.cardMeta}>{droneTypeLabel(it.drone_type)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={styles.counterRow}>
                  <Text style={styles.counterValue}>{it.flight_count}</Text>
                  <Text style={styles.counterLabel}>flights since last maintenance</Text>
                </View>

                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: statusColor }]} />
                  </View>
                  <Text style={styles.progressText}>{it.flight_count} / {THRESHOLD}</Text>
                </View>

                <View style={styles.footRow}>
                  <View>
                    <Text style={styles.lastLabel}>Last serviced</Text>
                    <Text style={styles.lastValue}>{fmtDate(it.last_maintenance_at)}</Text>
                  </View>
                  <TouchableOpacity
                    testID={`log-maintenance-${it.checklist_id}`}
                    style={[styles.logBtn, busy === it.checklist_id && { opacity: 0.6 }]}
                    onPress={() => logMaintenance(it.checklist_id, it.name)}
                    disabled={busy === it.checklist_id}
                  >
                    {busy === it.checklist_id ? (
                      <ActivityIndicator size="small" color={palette.white} />
                    ) : (
                      <Feather name="tool" size={16} color={palette.white} />
                    )}
                    <Text style={styles.logBtnText}>{busy === it.checklist_id ? "Saving…" : "Log maintenance"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
  sub: { fontSize: 13, color: t.textSecondary, marginTop: 2 },
  overdueBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: palette.danger },
  overdueText: { color: palette.white, fontWeight: "700", fontSize: 14, flex: 1 },
  center: { padding: 48, alignItems: "center" },
  empty: { padding: 48, alignItems: "center", borderRadius: 12, borderWidth: 0.5, borderColor: t.border, borderStyle: "dashed" },
  card: { padding: 16, borderRadius: 14, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  droneIcon: { width: 52, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardName: { fontSize: 15, fontWeight: "700", color: t.text },
  cardMeta: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "700" },
  counterRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 12 },
  counterValue: { fontSize: 28, fontWeight: "800", color: t.text },
  counterLabel: { fontSize: 12, color: t.textSecondary },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  progressTrack: { flex: 1, height: 8, backgroundColor: t.border, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 11, color: t.textSecondary, minWidth: 44, textAlign: "right" },
  footRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 },
  lastLabel: { fontSize: 10, color: t.textSecondary, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: "600" },
  lastValue: { fontSize: 13, color: t.text, fontWeight: "600", marginTop: 2 },
  logBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: palette.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  logBtnText: { color: palette.white, fontWeight: "700", fontSize: 13 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 24, width: 300 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: t.text, marginBottom: 8 },
  modalMsg: { fontSize: 14, color: t.textSecondary, lineHeight: 22, marginBottom: 20 },
  modalBtn: { height: 44, borderRadius: 10, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
