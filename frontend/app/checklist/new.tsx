import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { palette, lightTheme as t, droneTypeLabel } from "../../src/theme";
import { api, formatApiError } from "../../src/api";

type Method = "built_in" | "pdf_upload" | "photo_upload" | "voice" | "manual";
type DroneType = "multirotor" | "fixed_wing" | "heavy_lift" | "vtol" | "custom";
type Phase = "preflight" | "inflight" | "postflight";

const TEMPLATES: Record<string, { name: string; type: DroneType; phase: Phase; items: string[] }> = {
  multirotor_pre: {
    name: "Multirotor — Preflight", type: "multirotor", phase: "preflight",
    items: [
      "Pilot licence and authorizations — valid",
      "Airframe — inspect for cracks or damage",
      "Arms — all locked and secured",
      "Propellers — inspect for chips or cracks",
      "Propellers — all secured and torqued",
      "Motors — no obstructions, spin freely",
      "Battery — fully charged and secured",
      "Battery voltage — within limits",
      "Flight controller — powered on, no errors",
      "GPS — minimum 8 satellites acquired",
      "Compass — calibrated, no interference",
      "Remote controller — charged and linked",
      "Return to home altitude — configured",
      "Failsafe — battery RTL configured",
      "Flight area — clear of bystanders",
      "Weather — wind within limits",
      "Airspace — authorization confirmed",
      "Pre-arm checks — all passed",
    ],
  },
  multirotor_post: {
    name: "Multirotor — Post-flight", type: "multirotor", phase: "postflight",
    items: [
      "Landing — confirmed safe and stable",
      "Motors disarmed — stopped before approach",
      "Battery removed — powered down safely",
      "Battery — inspect for swelling or damage",
      "Battery — log cycle count",
      "Airframe — post-flight inspection",
      "Propellers — inspect for damage",
      "Motors — check for heat or damage",
      "Footage — backed up",
      "Flight log — completed and saved",
    ],
  },
  fixed_wing_pre: {
    name: "Fixed Wing — Preflight", type: "fixed_wing", phase: "preflight",
    items: [
      "Pilot licence and authorizations — valid",
      "Fuselage — inspect for damage",
      "Wings — inspect skin and attachment",
      "Ailerons — correct direction, full travel",
      "Elevator — correct direction, full travel",
      "Rudder — correct direction, full travel",
      "Motor — secured, clear of debris",
      "Propeller — inspected and secured",
      "Battery — sufficient for mission",
      "GPS — 8 satellites acquired",
      "Pitot tube — clear and unobstructed",
      "Airspeed sensor — reading correctly",
      "Failsafe — RTL configured",
      "Launch area — clear of obstacles",
      "Wind speed — within fixed wing limits",
    ],
  },
  vtol_pre: {
    name: "VTOL — Preflight", type: "vtol", phase: "preflight",
    items: [
      "Pilot licence and VTOL endorsement — valid",
      "Fuselage — inspect for damage",
      "Wings — inspect attachment",
      "VTOL motor arms — all locked",
      "VTOL propellers — inspected and torqued",
      "VTOL motors — spin freely",
      "Forward propeller — inspected and secured",
      "Ailerons, elevator, rudder — full travel",
      "Battery — fully charged, secured",
      "GPS — 8 satellites, compass calibrated",
      "Airspeed sensor — reading correctly",
      "VTOL hover mode — tested and stable",
      "Transition airspeed — configured",
      "Failsafe — RTL with VTOL landing",
      "Airspace — clear for full mission",
      "Pre-arm checks — all passed",
    ],
  },
  heavy_lift_pre: {
    name: "Heavy Lift — Preflight", type: "heavy_lift", phase: "preflight",
    items: [
      "Pilot licence and authorizations — valid",
      "Airframe — inspect for cracks or damage",
      "Extended arm locks — all checked and locked",
      "Propellers — inspect and torque all",
      "Motors — no obstructions, spin freely",
      "Payload weight — within MTOW limits",
      "Payload CG — checked and balanced",
      "Payload quick release — tested and secured",
      "All batteries — charged and balanced",
      "Power distribution — connections secure",
      "GPS — minimum 8 satellites",
      "Telemetry — dual link confirmed",
      "Return to home — configured",
      "Flight area — clear of bystanders",
      "Pre-arm checks — all passed",
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
    if (Platform.OS === "web") {
      Alert.alert("Photo upload", "On web, photo upload uses a file picker. This feature works fully on the mobile app.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.5,
    });
    if (!r.canceled && r.assets?.[0]?.base64) {
      setPhoto(`data:image/jpeg;base64,${r.assets[0].base64}`);
    }
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
      setStep(15 as any);
    } else {
      if (m === "manual") setItems([""]);
      else setItems(["Edit this item", "Add more items below"]);
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

  const save = async () => {
    if (!name.trim()) { Alert.alert("Name required", "Please enter a checklist name."); return; }
    const validItems = items.filter((i) => i.trim());
    if (!validItems.length) { Alert.alert("Items required", "Add at least one checklist item."); return; }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        drone_type: droneType,
        phase,
        source: method || "manual",
        items: validItems.map((label, idx) => ({ label: label.trim(), order_index: idx, is_required: true })),
        drone_photo_url: photo || null,
      };
      const { data } = await api.post("/checklists", payload);
      router.replace(`/checklist/${data.id}/qr`);
    } catch (e: any) {
      Alert.alert("Error", formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  // Step 1: Choose method
  if (step === 1) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]} testID="new-checklist-screen">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.text} />
          </TouchableOpacity>
          <Text style={styles.h1}>Add checklist</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={styles.sectionLabel}>Choose method</Text>
          {[
            { key: "built_in", icon: "layers-outline", label: "Built-in template", sub: "Multirotor, Fixed wing, VTOL, Heavy lift" },
            { key: "manual", icon: "create-outline", label: "Type manually", sub: "Enter items one by one" },
            { key: "pdf_upload", icon: "document-outline", label: "Upload PDF", sub: "Import from existing PDF checklist" },
            { key: "photo_upload", icon: "camera-outline", label: "Upload photo", sub: "Photograph an existing checklist" },
            { key: "voice", icon: "mic-outline", label: "Voice dictation", sub: "Speak checklist items aloud" },
          ].map((opt) => (
            <TouchableOpacity key={opt.key} testID={`method-${opt.key}`} style={styles.methodCard} onPress={() => submitMethod(opt.key as Method)}>
              <View style={styles.methodIcon}>
                <Ionicons name={opt.icon as any} size={26} color={palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodLabel}>{opt.label}</Text>
                <Text style={styles.methodSub}>{opt.sub}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={t.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 1.5: Pick built-in template
  if ((step as any) === 15) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setStep(1)}>
            <Ionicons name="chevron-back" size={28} color={t.text} />
          </TouchableOpacity>
          <Text style={styles.h1}>Choose template</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <TouchableOpacity key={key} testID={`template-${key}`} style={styles.methodCard} onPress={() => chooseTemplate(key)}>
              <View style={[styles.methodIcon, { backgroundColor: palette.primary + "15" }]}>
                <MaterialCommunityIcons
                  name={tpl.type === "fixed_wing" ? "airplane" : tpl.type === "vtol" ? "airplane-takeoff" : "quadcopter"}
                  size={26} color={palette.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodLabel}>{tpl.name}</Text>
                <Text style={styles.methodSub}>{tpl.items.length} items · {tpl.phase}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={t.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 2: Details + edit items
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setStep(1)}>
          <Ionicons name="chevron-back" size={28} color={t.text} />
        </TouchableOpacity>
        <Text style={styles.h1}>Checklist details</Text>
        <View style={{ width: 28 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

          {/* Name */}
          <Text style={styles.label}>Checklist name *</Text>
          <TextInput testID="checklist-name-input" style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Multirotor Preflight" placeholderTextColor={t.textSecondary} />

          {/* Drone type */}
          <Text style={styles.label}>Drone type</Text>
          <View style={styles.segRow}>
            {(["multirotor", "fixed_wing", "heavy_lift", "vtol", "custom"] as DroneType[]).map((dt) => (
              <TouchableOpacity key={dt} style={[styles.seg, droneType === dt && styles.segActive]} onPress={() => setDroneType(dt)}>
                <Text style={[styles.segText, droneType === dt && styles.segTextActive]}>{droneTypeLabel(dt)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Phase */}
          <Text style={styles.label}>Phase</Text>
          <View style={styles.segRow}>
            {(["preflight", "inflight", "postflight"] as Phase[]).map((p) => (
              <TouchableOpacity key={p} style={[styles.seg, phase === p && styles.segActive]} onPress={() => setPhase(p)}>
                <Text style={[styles.segText, phase === p && styles.segTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Drone photo */}
          <Text style={styles.label}>Drone photo (optional)</Text>
          <TouchableOpacity testID="photo-pick-btn" style={styles.photoPick} onPress={pickPhoto}>
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: "100%", height: "100%", borderRadius: 10 }} />
            ) : (
              <View style={{ alignItems: "center", gap: 6 }}>
                <Feather name="camera" size={28} color={t.textSecondary} />
                <Text style={{ color: t.textSecondary, fontSize: 13 }}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Items */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 8 }}>
            <Text style={styles.label}>Checklist items *</Text>
            <Text style={{ fontSize: 12, color: t.textSecondary }}>{items.filter(i => i.trim()).length} items</Text>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemNum}><Text style={{ color: palette.primary, fontWeight: "700", fontSize: 12 }}>{idx + 1}</Text></View>
              <TextInput
                testID={`item-input-${idx}`}
                style={styles.itemInput}
                value={item}
                onChangeText={(v) => updateItem(idx, v)}
                placeholder={`Item ${idx + 1}`}
                placeholderTextColor={t.textSecondary}
                multiline
              />
              <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 8 }}>
                <Feather name="trash-2" size={18} color={palette.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity testID="add-item-btn" style={styles.addItemBtn} onPress={addItem}>
            <Ionicons name="add-circle-outline" size={20} color={palette.primary} />
            <Text style={{ color: palette.primary, fontWeight: "600", fontSize: 14 }}>Add item</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity testID="save-checklist-btn" style={[styles.saveBtn, busy && { opacity: 0.6 }]} onPress={save} disabled={busy}>
          <Ionicons name="qr-code-outline" size={20} color={palette.white} />
          <Text style={styles.saveBtnText}>{busy ? "Saving…" : "Save & Generate QR"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  sectionLabel: { fontSize: 12, color: t.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  methodCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border },
  methodIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: palette.primary + "15", alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 15, fontWeight: "700", color: t.text },
  methodSub: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  label: { fontSize: 12, color: t.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: t.surface, borderRadius: 10, borderWidth: 0.5, borderColor: t.border, padding: 12, fontSize: 15, color: t.text },
  segRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  seg: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  segActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  segText: { fontSize: 12, color: t.text, fontWeight: "600" },
  segTextActive: { color: palette.white },
  photoPick: { height: 100, borderRadius: 10, borderWidth: 1, borderColor: t.border, borderStyle: "dashed", backgroundColor: t.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  itemNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.primary + "15", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemInput: { flex: 1, backgroundColor: t.surface, borderRadius: 8, borderWidth: 0.5, borderColor: t.border, padding: 10, fontSize: 14, color: t.text },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: palette.primary, borderStyle: "dashed", justifyContent: "center", marginTop: 4 },
  footer: { padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 52, borderRadius: 12, backgroundColor: palette.primary },
  saveBtnText: { color: palette.white, fontWeight: "700", fontSize: 16 },
});
