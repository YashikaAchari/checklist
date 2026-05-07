import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { palette, lightTheme as t, droneTypeLabel } from "../../../src/theme";
import { api } from "../../../src/api";

export default function FlightRecord() {
  const { flightId } = useLocalSearchParams<{ flightId: string }>();
  const router = useRouter();
  const [log, setLog] = useState<any>(null);
  const [cl, setCl] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/flight_logs/${flightId}`);
      setLog(data);
      const { data: c } = await api.get(`/checklists/${data.checklist_id}`);
      setCl(c);
    })();
  }, [flightId]);

  if (!log || !cl) return <SafeAreaView style={styles.container}><Text style={{ padding: 16, color: t.text }}>Loading…</Text></SafeAreaView>;

  const itemsById: Record<string, any> = {};
  (cl.items || []).forEach((it: any) => { itemsById[it.id] = it; });

  const failedItems = (log.executions || []).filter((e: any) => e.state === "fail").map((e: any) => itemsById[e.item_id]).filter(Boolean);
  const passed = (log.executions || []).filter((e: any) => e.state === "pass").length;
  const failed = (log.executions || []).filter((e: any) => e.state === "fail").length;

  const generateHTML = () => {
    const itemsHTML = (cl.items || []).map((it: any) => {
      const ex = (log.executions || []).find((e: any) => e.item_id === it.id);
      const state = ex?.state || "empty";
      const symbol = state === "pass" ? "✓" : state === "fail" ? "✗" : "—";
      const color = state === "pass" ? "#1D9E75" : state === "fail" ? "#E24B4A" : "#888";
      const heading = it.section_heading ? `<div style="font-weight:bold;margin-top:14px;color:#0C447C;font-size:11pt">${it.section_heading}</div>` : "";
      return `${heading}<div style="display:flex;padding:6px 0;border-bottom:1px solid #eee"><span style="color:${color};font-weight:bold;width:20px">${symbol}</span><span style="flex:1">${it.label}</span></div>`;
    }).join("");

    const failedHTML = failedItems.length
      ? `<div style="background:#fdecec;border:1px solid #E24B4A;border-radius:8px;padding:12px;margin:12px 0">
          <div style="color:#E24B4A;font-weight:bold;margin-bottom:8px">Failed items (${failedItems.length})</div>
          ${failedItems.map((it: any) => `<div style="color:#E24B4A">• ${it.label}</div>`).join("")}
        </div>` : "";

    const photosHTML = (log.media || []).filter((m: any) => m.type === "photo").map((m: any) => `<img src="${m.file_url}" style="width:200px;margin:6px;border-radius:6px" />`).join("");

    return `
<!doctype html><html><head><meta charset="utf-8" />
<style>
body { font-family: -apple-system, Roboto, sans-serif; padding: 24px; color: #212121; }
h1 { color: #0C447C; margin: 0; }
.tag { color: #888; font-size: 10pt; }
.row { display:flex; padding: 4px 0; }
.row .l { width: 160px; color: #888; }
.row .v { flex: 1; font-weight: 600; }
.section { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; }
.section h3 { color: #0C447C; margin: 0 0 8px 0; }
</style></head><body>
<div style="display:flex;align-items:center;justify-content:space-between">
  <div><h1>FlyReady</h1><div class="tag">Flight record · generated ${new Date().toLocaleString()}</div></div>
  <div style="text-align:right"><div style="color:#0C447C;font-weight:bold">Flight #${String(log.serial_number || "").padStart(3, "0")}</div><div class="tag">${log.flight_id || ""}</div></div>
</div>

<div class="section"><h3>Flight summary</h3>
  <div class="row"><div class="l">Checklist</div><div class="v">${cl.name}</div></div>
  <div class="row"><div class="l">Drone type</div><div class="v">${droneTypeLabel(cl.drone_type)}</div></div>
  <div class="row"><div class="l">Phase</div><div class="v">${cl.phase}</div></div>
  <div class="row"><div class="l">Drone serial</div><div class="v">${log.serial_number_drone || "—"}</div></div>
</div>

<div class="section"><h3>Operator</h3>
  <div class="row"><div class="l">Pilot in Command</div><div class="v">${log.operator_name || "—"}</div></div>
  <div class="row"><div class="l">GCS Operator</div><div class="v">${log.gcs_operator || "—"}</div></div>
  <div class="row"><div class="l">Date</div><div class="v">${(log.created_at || "").slice(0, 16).replace("T", " ")}</div></div>
  <div class="row"><div class="l">Duration</div><div class="v">${log.flight_duration_seconds ? Math.round(log.flight_duration_seconds / 60) + " min" : "—"}</div></div>
</div>

<div class="section"><h3>Location & weather</h3>
  <div class="row"><div class="l">Location</div><div class="v">${log.location_name || "—"}</div></div>
  <div class="row"><div class="l">GPS</div><div class="v">${log.latitude != null ? `${log.latitude.toFixed(5)}, ${log.longitude.toFixed(5)}` : "—"}</div></div>
  <div class="row"><div class="l">Wind</div><div class="v">${log.wind_speed ?? "—"} m/s · ${log.wind_direction || "—"}</div></div>
  <div class="row"><div class="l">Temperature</div><div class="v">${log.temperature ?? "—"} °C</div></div>
  <div class="row"><div class="l">Conditions</div><div class="v">${log.weather_conditions || "—"}</div></div>
  <div class="row"><div class="l">Airspace</div><div class="v">${log.airspace_status || "—"}</div></div>
</div>

<div class="section"><h3>Mission</h3>
  <div class="row"><div class="l">Objective</div><div class="v">${log.test_objective || "—"}</div></div>
  <div class="row"><div class="l">Changes since last</div><div class="v">${log.changes_since_last || "—"}</div></div>
  <div class="row"><div class="l">All up weight</div><div class="v">${log.all_up_weight ?? "—"} kg</div></div>
  <div class="row"><div class="l">Payload</div><div class="v">${log.payload_description || "—"}</div></div>
</div>

${failedHTML}

<div class="section"><h3>Checklist results · ${passed} pass · ${failed} fail</h3>
  ${itemsHTML}
</div>

${(log.damage_severity && log.damage_severity !== "none")
  ? `<div class="section"><h3>Damage report</h3><div>Severity: <strong>${log.damage_severity}</strong></div><div>${log.damage_report_description || ""}</div></div>` : ""}

${(log.remarks) ? `<div class="section"><h3>Remarks</h3><div>${log.remarks}</div></div>` : ""}

${photosHTML ? `<div class="section"><h3>Photos</h3>${photosHTML}</div>` : ""}

<div class="section"><h3>Signatures</h3>
  <div class="row"><div class="l">Pilot</div><div class="v">${log.pilot_signature_url ? "✓ Signed" : "Not signed"}</div></div>
  <div class="row"><div class="l">GCS Operator</div><div class="v">${log.gcs_signature_url ? "✓ Signed" : "Not signed"}</div></div>
</div>

<div style="margin-top:32px;color:#888;font-size:9pt;text-align:center">Generated by FlyReady · ${new Date().toLocaleString()}</div>
</body></html>`;
  };

  const sharePDF = async () => {
    setBusy(true);
    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const can = await Sharing.isAvailableAsync();
      if (can) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Flight #${log.serial_number} — FlyReady` });
      else Alert.alert("PDF saved", uri);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not generate PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="flight-record-screen">
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.h1}>Flight #{String(log.serial_number).padStart(3, "0")}</Text>
          <Text style={styles.sub}>{log.flight_id}</Text>
        </View>
        <TouchableOpacity testID="flight-pdf-btn" disabled={busy} onPress={sharePDF}>
          <Feather name="share" size={22} color={palette.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Section title="Operator">
          <Row label="Pilot in Command" value={log.operator_name} />
          <Row label="GCS Operator" value={log.gcs_operator} />
          <Row label="Date" value={(log.created_at || "").slice(0, 16).replace("T", " ")} />
          <Row label="Duration" value={log.flight_duration_seconds ? `${Math.round(log.flight_duration_seconds / 60)} min` : "—"} />
        </Section>

        <Section title="Location & weather">
          <Row label="Location" value={log.location_name} />
          <Row label="GPS" value={log.latitude != null ? `${log.latitude?.toFixed(5)}, ${log.longitude?.toFixed(5)}` : "—"} />
          <Row label="Wind" value={`${log.wind_speed ?? "—"} m/s · ${log.wind_direction || "—"}`} />
          <Row label="Temperature" value={log.temperature != null ? `${log.temperature}°C` : "—"} />
          <Row label="Conditions" value={log.weather_conditions} />
          <Row label="Airspace" value={log.airspace_status} />
        </Section>

        {failedItems.length > 0 && (
          <View style={styles.failedCard}>
            <Text style={styles.failedTitle}>Failed items ({failedItems.length})</Text>
            {failedItems.map((it: any) => <Text key={it.id} style={styles.failedItem}>• {it.label}</Text>)}
          </View>
        )}

        <Section title={`Checklist results · ${passed} pass · ${failed} fail`}>
          {(cl.items || []).map((it: any) => {
            const ex = (log.executions || []).find((e: any) => e.item_id === it.id);
            const state = ex?.state || "empty";
            const color = state === "pass" ? palette.success : state === "fail" ? palette.danger : t.textSecondary;
            const symbol = state === "pass" ? "✓" : state === "fail" ? "✗" : "•";
            return (
              <View key={it.id} style={styles.itemRow}>
                <Text style={[styles.itemSymbol, { color }]}>{symbol}</Text>
                <Text style={[styles.itemLabel, state === "fail" && { color: palette.danger }]}>{it.label}</Text>
              </View>
            );
          })}
        </Section>

        {(log.media || []).length > 0 && (
          <Section title="Photos">
            <View style={styles.mediaGrid}>
              {(log.media || []).map((m: any, i: number) => (
                <Image key={i} source={{ uri: m.file_url }} style={styles.thumb} />
              ))}
            </View>
          </Section>
        )}

        {log.damage_severity && log.damage_severity !== "none" && (
          <Section title="Damage report">
            <Row label="Severity" value={log.damage_severity} />
            {log.damage_report_description && <Text style={{ color: t.text, fontSize: 13, marginTop: 4 }}>{log.damage_report_description}</Text>}
          </Section>
        )}

        {log.remarks ? <Section title="Remarks"><Text style={{ color: t.text, fontSize: 13 }}>{log.remarks}</Text></Section> : null}

        <Section title="Signatures">
          <Row label="Pilot" value={log.pilot_signature_url ? "✓ Signed" : "Not signed"} />
          <Row label="GCS Operator" value={log.gcs_signature_url ? "✓ Signed" : "Not signed"} />
        </Section>

        <TouchableOpacity testID="flight-pdf-btn-bottom" disabled={busy} style={styles.pdfBtn} onPress={sharePDF}>
          <Feather name="share-2" size={20} color={palette.white} />
          <Text style={styles.pdfBtnText}>{busy ? "Generating PDF…" : "Generate & share PDF"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: any) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}
function Row({ label, value }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  sub: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 12, color: t.textSecondary, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 },
  card: { padding: 14, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border },
  row: { flexDirection: "row", paddingVertical: 4 },
  rowLabel: { width: 130, fontSize: 12, color: t.textSecondary },
  rowValue: { flex: 1, fontSize: 13, color: t.text, fontWeight: "600" },
  failedCard: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: palette.danger + "10", borderWidth: 1, borderColor: palette.danger + "40" },
  failedTitle: { color: palette.danger, fontWeight: "700", fontSize: 14, marginBottom: 6 },
  failedItem: { color: palette.danger, fontSize: 13, marginVertical: 2 },
  itemRow: { flexDirection: "row", paddingVertical: 6, gap: 8, alignItems: "flex-start" },
  itemSymbol: { fontSize: 16, fontWeight: "700", width: 20 },
  itemLabel: { flex: 1, fontSize: 13, color: t.text, lineHeight: 18 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: t.border },
  pdfBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, height: 52, borderRadius: 12, backgroundColor: palette.primary },
  pdfBtnText: { color: palette.white, fontWeight: "700", fontSize: 15 },
});
