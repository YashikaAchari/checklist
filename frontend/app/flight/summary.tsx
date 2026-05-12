import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t } from "../../src/theme";
import { useFlightDraft } from "../../src/flightDraft";
import { api, formatApiError } from "../../src/api";
import { PhotoSourceSheet } from "../../src/PhotoSourceSheet";

const SEVERITIES = [
  { id: "none", label: "None", color: t.textSecondary },
  { id: "minor", label: "Minor", color: palette.warning },
  { id: "moderate", label: "Moderate", color: "#E97A1A" },
  { id: "critical", label: "Critical", color: palette.danger },
];

export default function Summary() {
  const router = useRouter();
  const draft = useFlightDraft();
  const cl = draft.checklist;
  const [busy, setBusy] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [modal, setModal] = useState<{ title: string; msg: string } | null>(null);
  const [sigModal, setSigModal] = useState<"pilot" | "gcs" | null>(null);
  const [sigText, setSigText] = useState("");

  useEffect(() => { if (!cl) router.replace("/(tabs)/home"); }, [cl]);
  if (!cl) return null;

  const failedItems = (cl.items || []).filter((it: any) => draft.executions[it.id]?.state === "fail");
  const passedCount = (cl.items || []).filter((it: any) => draft.executions[it.id]?.state === "pass").length;

  const onPhotoPicked = ({ dataUrl }: { dataUrl: string }) => {
    draft.patch({ media: [...draft.media, { type: "photo", file_url: dataUrl }] });
  };

  const removeMedia = (idx: number) => {
    draft.patch({ media: draft.media.filter((_, i) => i !== idx) });
  };

  const captureSig = (which: "pilot" | "gcs") => {
    setSigText("");
    setSigModal(which);
  };

  const confirmSig = () => {
    if (!sigText.trim()) return;
    const sig = `signature://${sigModal}/${sigText.trim()}/${Date.now()}`;
    if (sigModal === "pilot") draft.patch({ pilot_signature_url: sig });
    else draft.patch({ gcs_signature_url: sig });
    setSigModal(null);
  };

  const save = async () => {
    setBusy(true);
    try {
      const executions = Object.entries(draft.executions).map(([item_id, v]) => ({
        item_id, state: v.state, notes: v.notes, photo_url: v.photo_url,
      }));
      const payload: any = {
        checklist_id: cl.id,
        aircraft_id: draft.aircraft_id || null,
        operator_name: draft.operator_name,
        gcs_operator: draft.gcs_operator,
        flight_id: draft.flight_id,
        location_name: draft.location_name,
        latitude: draft.latitude,
        longitude: draft.longitude,
        wind_speed: draft.wind_speed,
        wind_direction: draft.wind_direction,
        temperature: draft.temperature,
        weather_conditions: draft.weather_conditions,
        weather_source: draft.weather_source,
        airspace_status: draft.airspace_status,
        battery_used_label: draft.battery_used_label,
        flight_start_time: draft.flight_start_time,
        flight_end_time: draft.flight_end_time,
        flight_duration_seconds: draft.flight_duration_seconds,
        serial_number_drone: draft.serial_number_drone,
        test_objective: draft.test_objective,
        changes_since_last: draft.changes_since_last,
        all_up_weight: draft.all_up_weight,
        payload_description: draft.payload_description,
        remarks: draft.remarks,
        damage_report_description: draft.damage_report_description,
        damage_severity: draft.damage_severity,
        pilot_signature_url: draft.pilot_signature_url,
        gcs_signature_url: draft.gcs_signature_url,
        executions,
        media: draft.media,
      };
      const { data } = await api.post("/flight_logs", payload);
      const msg = `Flight saved: #${String(data.serial_number).padStart(3, "0")} (${data.flight_id})`;
      setModal({ title: "Flight saved! ✓", msg });
    } catch (e: any) {
      setModal({ title: "Error", msg: formatApiError(e) });
    } finally {
      setBusy(false);
    }
  };

  const goHome = () => {
    setModal(null);
    router.replace("/(tabs)/home");
    setTimeout(() => draft.reset(), 50);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="summary-screen">

      {/* Info/success modal */}
      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modal?.title}</Text>
            <Text style={styles.modalMsg}>{modal?.msg}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={modal?.title?.includes("saved") ? goHome : () => setModal(null)}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Signature modal */}
      <Modal visible={!!sigModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{sigModal === "pilot" ? "Pilot" : "GCS Operator"} signature</Text>
            <Text style={styles.modalMsg}>Type your full name to sign off on this flight record.</Text>
            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              value={sigText}
              onChangeText={setSigText}
              placeholder="Type your full name"
              placeholderTextColor={t.textSecondary}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSigModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn2} onPress={confirmSig}>
                <Text style={styles.modalBtnText}>Sign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.h1}>Post-flight summary</Text>
          <Text style={styles.sub}>{cl.name}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">

          <View style={styles.summaryCard}>
            <Row label="Flight ID" value={draft.flight_id} />
            <Row label="Pilot" value={draft.operator_name} />
            <Row label="Location" value={draft.location_name || "—"} />
            <Row label="Items passed" value={`${passedCount} / ${(cl.items || []).length}`} />
            <Row label="Items failed" value={`${failedItems.length}`} color={failedItems.length > 0 ? palette.danger : undefined} />
            <Row label="Duration" value={draft.flight_duration_seconds ? fmt(draft.flight_duration_seconds) : "—"} />
          </View>

          {failedItems.length > 0 && (
            <View style={styles.failedCard}>
              <Text style={styles.failedTitle}>Failed items ({failedItems.length})</Text>
              {failedItems.map((it: any) => <Text key={it.id} style={styles.failedItem}>• {it.label}</Text>)}
            </View>
          )}

          <Text style={styles.sectionTitle}>Damage report</Text>
          <View style={styles.chipsRow}>
            {SEVERITIES.map((s) => (
              <TouchableOpacity key={s.id} testID={`sum-severity-${s.id}`} style={[styles.chip, draft.damage_severity === s.id && { backgroundColor: s.color, borderColor: s.color }]} onPress={() => draft.patch({ damage_severity: s.id as any })}>
                <Text style={[styles.chipText, draft.damage_severity === s.id && { color: palette.white }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {draft.damage_severity !== "none" && (
            <TextInput testID="sum-damage-desc" style={[styles.input, { minHeight: 70, marginTop: 10, textAlignVertical: "top" }]} multiline placeholder="Describe damage observed…" placeholderTextColor={t.textSecondary} value={draft.damage_report_description} onChangeText={(v) => draft.patch({ damage_report_description: v })} />
          )}

          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.mediaGrid}>
            {draft.media.map((m, i) => (
              <View key={i} style={styles.thumb}>
                <Image source={{ uri: m.file_url }} style={{ width: "100%", height: "100%" }} />
                <TouchableOpacity onPress={() => removeMedia(i)} style={styles.thumbX}><Feather name="x" size={14} color={palette.white} /></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity testID="sum-add-photo" style={styles.thumbAdd} onPress={() => setPhotoSheetOpen(true)}>
              <Feather name="plus" size={28} color={palette.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Remarks</Text>
          <TextInput testID="sum-remarks" style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} multiline placeholder="Additional notes about this flight…" placeholderTextColor={t.textSecondary} value={draft.remarks} onChangeText={(v) => draft.patch({ remarks: v })} />

          <Text style={styles.sectionTitle}>Signatures</Text>
          <SignatureRow label="Pilot in Command" sig={draft.pilot_signature_url} onTap={() => captureSig("pilot")} />
          <SignatureRow label="GCS Operator" sig={draft.gcs_signature_url} onTap={() => captureSig("gcs")} />

        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity testID="sum-save-btn" style={[styles.cta, busy && { opacity: 0.6 }]} disabled={busy} onPress={save}>
            <Text style={styles.ctaText}>{busy ? "Saving…" : "Save flight record"}</Text>
            <Feather name="save" size={20} color={palette.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PhotoSourceSheet visible={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)} onPicked={onPhotoPicked} quality={0.4} title="Add photo to flight record" />
    </SafeAreaView>
  );
}

function Row({ label, value, color }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color && { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function SignatureRow({ label, sig, onTap }: { label: string; sig?: string; onTap: () => void }) {
  return (
    <TouchableOpacity onPress={onTap} style={styles.sigRow} testID={`sum-sig-${label.replace(/\s/g, "-").toLowerCase()}`}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sigLabel}>{label}</Text>
        <Text style={styles.sigValue}>{sig ? "✓ Signed — tap to re-sign" : "Tap to sign"}</Text>
      </View>
      <Feather name={sig ? "check-circle" : "edit-3"} size={20} color={sig ? palette.success : palette.primary} />
    </TouchableOpacity>
  );
}

function fmt(s: number) { const m = Math.floor(s / 60), sec = s % 60; return `${m}m ${sec}s`; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  sub: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  summaryCard: { padding: 16, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: t.textSecondary },
  rowValue: { fontSize: 13, color: t.text, fontWeight: "600", maxWidth: "60%" },
  failedCard: { marginTop: 12, padding: 16, borderRadius: 12, backgroundColor: palette.danger + "10", borderWidth: 1, borderColor: palette.danger + "40" },
  failedTitle: { color: palette.danger, fontWeight: "700", fontSize: 14, marginBottom: 8 },
  failedItem: { color: palette.danger, fontSize: 13, marginVertical: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: t.text, marginTop: 24, marginBottom: 8 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border },
  chipText: { fontSize: 13, color: t.text, fontWeight: "600" },
  input: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: t.surface, borderRadius: 8, borderWidth: 0.5, borderColor: t.border, color: t.text },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8, overflow: "hidden", backgroundColor: t.border },
  thumbX: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  thumbAdd: { width: 80, height: 80, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.primary, borderStyle: "dashed", backgroundColor: t.surface },
  sigRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, marginBottom: 8 },
  sigLabel: { color: t.text, fontSize: 14, fontWeight: "600" },
  sigValue: { color: t.textSecondary, fontSize: 12, marginTop: 2 },
  bottomBar: { padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface },
  cta: { backgroundColor: palette.secondary, height: 52, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText: { color: palette.white, fontSize: 16, fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 24, width: 300 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: t.text, marginBottom: 8 },
  modalMsg: { fontSize: 14, color: t.textSecondary, lineHeight: 22, marginBottom: 20 },
  modalBtn: { height: 44, borderRadius: 10, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: t.text },
  modalBtn2: { flex: 1, height: 44, borderRadius: 10, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
});
