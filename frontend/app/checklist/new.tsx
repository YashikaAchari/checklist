import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t, droneTypeLabel } from "../../src/theme";
import { api, formatApiError } from "../../src/api";
import { PhotoSourceSheet } from "../../src/PhotoSourceSheet";

type Method = "built_in" | "pdf_upload" | "photo_upload" | "voice" | "manual";
type DroneType = "multirotor" | "fixed_wing" | "heavy_lift" | "vtol" | "custom";
type Phase = "preflight" | "inflight" | "postflight";

const TEMPLATES: Record<string, { name: string; type: DroneType; phase: Phase; items: string[] }> = {
  multirotor_pre: {
    name: "Multirotor — Preflight (custom)", type: "multirotor", phase: "preflight",
    items: [
      "Airframe — inspect for cracks or damage",
      "Propellers — secured and torqued",
      "Battery — fully charged and secured",
      "GPS — minimum 8 satellites",
      "Remote controller — linked",
      "Flight modes — verified",
      "Pre-arm checks — passed",
    ],
  },
  fixed_wing_pre: {
    name: "Fixed Wing — Preflight (custom)", type: "fixed_wing", phase: "preflight",
    items: [
      "Fuselage — inspect for damage",
      "Wings — inspect attachment points",
      "Control surfaces — full travel",
      "Pitot tube — clear",
      "GPS — 8 satellites acquired",
      "Launch area — clear",
    ],
  },
  vtol_pre: {
    name: "VTOL — Preflight (custom)", type: "vtol", phase: "preflight",
    items: [
      "VTOL motors — spin freely",
      "Forward propeller — secured",
      "Transition mechanism — inspected",
      "Battery — within limits",
      "VTOL hover mode — tested",
      "Failsafe — RTL configured",
    ],
  },
};

export default function NewChecklist() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<Method | null>(null);

  const [name, setName] = useState("");
  const [droneType, setDroneType] = useState<DroneType>("multirotor");
  const [phase, setPhase] = useState<Phase>("preflight");
  const [photo, setPhoto] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.5 });
    if (!r.canceled && r.assets?.[0]?.base64) setPhoto(`data:image/jpeg;base64,${r.assets[0].base64}`);
  };

  const chooseTemplate = (key: keyof typeof TEMPLATES) => {
    const tpl = TEMPLATES[key];
    setName(tpl.name);
    setDroneType(tpl.type);
    setPhase(tpl.phase);
    setItems(tpl.items);
    setStep(2);
  };

  const submitMethod = (m: Method) => {
    setMethod(m);
    if (m === "built_in") {
      // step 1.5: pick template
      setStep(15 as any); // sentinel
    } else {
      if (m === "manual") setItems([""]);
      else if (m === "pdf_upload") setItems(["(Sample) Imported item — edit me"]);
      else if (m === "photo_upload") setItems(["(Sample) Imported item — edit me"]);
      else if (m === "voice") setItems(["(Sample) Imported item — edit me"]);
      setStep(2);
    }
  };

  const updateItem = (idx: number, v: string) => {
    const next = [...items];
    next[idx] = v;
    setItems(next);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const addItem = () => setItems([...items, ""]);
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert("Missing name", "Please enter a checklist name");
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) return Alert.alert("No items", "Please add at least one item");
    setBusy(true);
    try {
      const { data } = await api.post("/checklists", {
        name: name.trim(),
        drone_type: droneType,
        phase,
        source: method || "manual",
        drone_photo_url: photo,
        items: cleaned.map((label, i) => ({ label, is_required: true, order_index: i, section_heading: null })),
      });
      router.replace(`/checklist/${data.id}/qr`);
    } catch (e: any) {
      Alert.alert("Error", formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  // ---------- Renderers ----------
  const renderHeader = () => (
    <View style={styles.topBar}>
      <TouchableOpacity testID="new-back-btn" onPress={() => (step === 1 ? router.back() : setStep((step === (15 as any) ? 1 : step - 1) as any))}>
        <Ionicons name="chevron-back" size={28} color={t.text} />
      </TouchableOpacity>
      <Text style={styles.h1}>New checklist</Text>
      <View style={{ width: 28 }} />
    </View>
  );

  // STEP 1 — choose method
  if (step === 1) {
    const Tile = ({ id, label, icon, testID }: any) => (
      <TouchableOpacity testID={testID} style={styles.tile} onPress={() => submitMethod(id)}>
        <View style={styles.tileIcon}>{icon}</View>
        <Text style={styles.tileLabel}>{label}</Text>
      </TouchableOpacity>
    );
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {renderHeader()}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.stepLabel}>Step 1 of 3 · Choose input method</Text>
          <View style={styles.grid}>
            <Tile testID="new-method-built-in" id="built_in" label="Built-in template" icon={<MaterialCommunityIcons name="quadcopter" size={36} color={palette.primary} />} />
            <Tile testID="new-method-pdf" id="pdf_upload" label="Upload PDF" icon={<Feather name="file-text" size={36} color={palette.primary} />} />
            <Tile testID="new-method-photo" id="photo_upload" label="Upload photo" icon={<Feather name="camera" size={36} color={palette.primary} />} />
            <Tile testID="new-method-voice" id="voice" label="Voice dictation" icon={<Feather name="mic" size={36} color={palette.primary} />} />
          </View>
          <TouchableOpacity testID="new-method-manual" style={styles.manualLink} onPress={() => submitMethod("manual")}>
            <Feather name="edit-3" size={18} color={palette.primary} />
            <Text style={{ color: palette.primary, fontWeight: "700" }}>Build from scratch (manual)</Text>
          </TouchableOpacity>
          <Text style={styles.note}>
            PDF, photo and voice import deliver pre-filled placeholder items in v1 — full OCR & speech-to-text arrive in v2.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // STEP 1.5 — pick built-in template
  if ((step as any) === 15) {
    const Tile = ({ id, label, type }: any) => (
      <TouchableOpacity testID={`new-tpl-${id}`} style={styles.templateTile} onPress={() => chooseTemplate(id)}>
        <MaterialCommunityIcons name={type === "fixed_wing" ? "airplane" : type === "vtol" ? "airplane-takeoff" : "quadcopter"} size={32} color={palette.primary} />
        <Text style={styles.tileLabel}>{label}</Text>
        <Feather name="chevron-right" size={20} color={t.textSecondary} />
      </TouchableOpacity>
    );
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {renderHeader()}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.stepLabel}>Pick a starting template</Text>
          <Tile id="multirotor_pre" label="Multirotor — Preflight" type="multirotor" />
          <Tile id="fixed_wing_pre" label="Fixed Wing — Preflight" type="fixed_wing" />
          <Tile id="vtol_pre" label="VTOL — Preflight" type="vtol" />
          <Text style={styles.note}>
            Note: the 7 official built-in checklists are also automatically loaded into your account on signup — find them on the home screen.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // STEP 2 — details
  if (step === 2) {
    const TypeChip = ({ id, label }: any) => (
      <TouchableOpacity testID={`new-type-${id}`} style={[styles.chip, droneType === id && styles.chipActive]} onPress={() => setDroneType(id)}>
        <Text style={[styles.chipText, droneType === id && { color: palette.white }]}>{label}</Text>
      </TouchableOpacity>
    );
    const PhaseChip = ({ id, label }: any) => (
      <TouchableOpacity testID={`new-phase-${id}`} style={[styles.chip, phase === id && styles.chipActive]} onPress={() => setPhase(id)}>
        <Text style={[styles.chipText, phase === id && { color: palette.white }]}>{label}</Text>
      </TouchableOpacity>
    );
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {renderHeader()}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.stepLabel}>Step 2 of 3 · Checklist details</Text>

            <Text style={styles.label}>Checklist name</Text>
            <TextInput testID="new-name-input" style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Site survey preflight" placeholderTextColor={t.textSecondary} />

            <Text style={styles.label}>Drone type</Text>
            <View style={styles.chipsRow}>
              <TypeChip id="multirotor" label="Multirotor" />
              <TypeChip id="heavy_lift" label="Heavy Lift" />
              <TypeChip id="fixed_wing" label="Fixed Wing" />
              <TypeChip id="vtol" label="VTOL" />
              <TypeChip id="custom" label="Custom" />
            </View>

            <Text style={styles.label}>Phase</Text>
            <View style={styles.chipsRow}>
              <PhaseChip id="preflight" label="Preflight" />
              <PhaseChip id="inflight" label="Inflight" />
              <PhaseChip id="postflight" label="Postflight" />
            </View>

            <Text style={styles.label}>Drone photo (optional)</Text>
            <TouchableOpacity testID="new-photo-btn" style={styles.photoBtn} onPress={pickPhoto}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <>
                  <Feather name="camera" size={28} color={palette.primary} />
                  <Text style={{ color: palette.primary, fontWeight: "600", marginTop: 6 }}>Take photo or choose from gallery</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
          <View style={styles.bottomBar}>
            <TouchableOpacity testID="new-step2-next" style={styles.cta} onPress={() => setStep(3)}>
              <Text style={styles.ctaText}>Next: review items</Text>
              <Ionicons name="arrow-forward" size={20} color={palette.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        <PhotoSourceSheet
          visible={photoSheetOpen}
          onClose={() => setPhotoSheetOpen(false)}
          onPicked={({ dataUrl }) => setPhoto(dataUrl)}
          quality={0.5}
          title="Add drone photo"
        />
      </SafeAreaView>
    );
  }

  // STEP 3 — review/edit items
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {renderHeader()}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepLabel}>Step 3 of 3 · Review and edit ({droneTypeLabel(droneType)} · {phase})</Text>
          {items.map((it, idx) => (
            <View key={idx} testID={`new-item-row-${idx}`} style={styles.itemRow}>
              <Text style={styles.itemIdx}>{idx + 1}.</Text>
              <TextInput
                testID={`new-item-input-${idx}`}
                style={styles.itemInput}
                value={it}
                onChangeText={(v) => updateItem(idx, v)}
                placeholder="Type item label…"
                placeholderTextColor={t.textSecondary}
                multiline
              />
              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => move(idx, -1)}><Feather name="chevron-up" size={20} color={t.textSecondary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => move(idx, 1)}><Feather name="chevron-down" size={20} color={t.textSecondary} /></TouchableOpacity>
                <TouchableOpacity testID={`new-item-delete-${idx}`} onPress={() => removeItem(idx)}><Feather name="trash-2" size={18} color={palette.danger} /></TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity testID="new-item-add" style={styles.addItem} onPress={addItem}>
            <Feather name="plus" size={20} color={palette.primary} />
            <Text style={{ color: palette.primary, fontWeight: "700" }}>Add item</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.bottomBar}>
          <TouchableOpacity testID="new-save-btn" disabled={busy} style={[styles.cta, busy && { opacity: 0.6 }]} onPress={save}>
            <Text style={styles.ctaText}>{busy ? "Saving…" : "Save & generate QR"}</Text>
            <MaterialCommunityIcons name="qrcode" size={22} color={palette.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  stepLabel: { fontSize: 12, color: t.textSecondary, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "48%", aspectRatio: 1, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, alignItems: "center", justifyContent: "center", padding: 16 },
  tileIcon: { marginBottom: 8 },
  tileLabel: { color: t.text, fontWeight: "600", textAlign: "center", flex: 1 },
  templateTile: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, marginBottom: 10 },
  manualLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: palette.primary, borderStyle: "dashed" },
  note: { fontSize: 12, color: t.textSecondary, marginTop: 12, lineHeight: 18 },
  label: { fontSize: 12, color: t.textSecondary, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 16, marginBottom: 6 },
  input: { height: 48, backgroundColor: t.surface, borderRadius: 8, borderWidth: 0.5, borderColor: t.border, paddingHorizontal: 16, fontSize: 15, color: t.text },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border },
  chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  chipText: { fontSize: 13, color: t.text, fontWeight: "600" },
  photoBtn: { height: 120, borderRadius: 12, borderWidth: 0.5, borderColor: t.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: t.surface, overflow: "hidden" },
  photoPreview: { width: "100%", height: "100%" },
  bottomBar: { padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface },
  cta: { backgroundColor: palette.primary, height: 52, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText: { color: palette.white, fontSize: 16, fontWeight: "700" },
  itemRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 10, borderRadius: 10, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, marginBottom: 8 },
  itemIdx: { color: t.textSecondary, fontSize: 14, fontWeight: "700", marginTop: 12 },
  itemInput: { flex: 1, minHeight: 44, color: t.text, fontSize: 14, paddingVertical: 8 },
  itemActions: { flexDirection: "column", gap: 8, alignItems: "center", padding: 4 },
  addItem: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: palette.primary, borderStyle: "dashed" },
});
