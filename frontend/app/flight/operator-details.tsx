import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t, droneTypeLabel } from "../../src/theme";
import { useFlightDraft } from "../../src/flightDraft";
import { api, formatApiError } from "../../src/api";

export default function OperatorDetails() {
  const router = useRouter();
  const draft = useFlightDraft();
  const cl = draft.checklist;
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [airspaceStatus, setAirspaceStatus] = useState<"unknown"|"clear">("unknown");
  const [modal, setModal] = useState<string | null>(null);

  useEffect(() => {
    if (!cl) router.replace("/(tabs)/home");
    if (!draft.flight_id) {
      const today = new Date();
      const ymd = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}`;
      const rnd = String(Math.floor(Math.random()*999)+1).padStart(3,"0");
      draft.patch({ flight_id: `${ymd}-${rnd}` });
    }
  }, []);

  if (!cl) return null;

  const useMyLocation = async () => {
    setFetchingLocation(true);
    try {
      if (Platform.OS === "web") {
        if (!navigator.geolocation) { setModal("Geolocation not supported in this browser."); setFetchingLocation(false); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => { draft.patch({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setFetchingLocation(false); },
          (err) => { setModal("Could not get location: " + err.message); setFetchingLocation(false); }
        );
      } else {
        const Location = await import("expo-location");
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") { setModal("Location permission denied."); setFetchingLocation(false); return; }
        const loc = await Location.getCurrentPositionAsync({});
        draft.patch({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setFetchingLocation(false);
      }
    } catch (e: any) { setModal(e.message || "Could not get location"); setFetchingLocation(false); }
  };

  const fetchWeather = async () => {
    if (draft.latitude == null || draft.longitude == null) { setModal("Please set your GPS location first."); return; }
    setFetchingWeather(true);
    try {
      const { data } = await api.get("/weather", { params: { lat: draft.latitude, lon: draft.longitude } });
      draft.patch({ wind_speed: data.wind_speed, wind_direction: String(data.wind_direction || ""), temperature: data.temperature, weather_conditions: data.conditions, weather_source: "auto" });
    } catch (e: any) { setModal("Weather unavailable. Enter manually.\n\n" + formatApiError(e)); }
    finally { setFetchingWeather(false); }
  };

  const begin = () => {
    if (!draft.operator_name?.trim()) { setModal("Please enter the Pilot in Command name."); return; }
    if (!draft.flight_id?.trim()) { setModal("Please enter a Flight ID."); return; }
    router.push("/flight/execute");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="operator-details-screen">
      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Notice</Text>
            <Text style={styles.modalMsg}>{modal}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setModal(null)}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.h1}>Operator details</Text>
          <Text style={styles.sub}>Step 1 of 2 · {cl.name}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">

          <Text style={styles.section}>Operator</Text>
          <Field label="Pilot in Command *" testID="op-pilot" value={draft.operator_name || ""} onChangeText={(v: string) => draft.patch({ operator_name: v })} />
          <Field label="GCS Operator" testID="op-gcs" value={draft.gcs_operator || ""} onChangeText={(v: string) => draft.patch({ gcs_operator: v })} />
          <Field label="Flight ID *" testID="op-flightid" value={draft.flight_id || ""} onChangeText={(v: string) => draft.patch({ flight_id: v })} />

          <Text style={styles.section}>Aircraft</Text>
          <Field label="Aircraft type" value={droneTypeLabel(cl.drone_type)} onChangeText={() => {}} editable={false} />
          <Field label="Serial number" testID="op-serial" value={draft.serial_number_drone || ""} onChangeText={(v: string) => draft.patch({ serial_number_drone: v })} placeholder="e.g. MR-04" />
          <Field label="Battery used" testID="op-battery" value={draft.battery_used_label || ""} onChangeText={(v: string) => draft.patch({ battery_used_label: v })} placeholder="e.g. B-02" />

          <Text style={styles.section}>Location</Text>
          <Field label="Location name" testID="op-location" value={draft.location_name || ""} onChangeText={(v: string) => draft.patch({ location_name: v })} placeholder="e.g. Test field, Site A" />
          <View style={styles.gpsCard}>
            <View style={styles.gpsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput style={styles.input} value={draft.latitude != null ? String(draft.latitude) : ""} onChangeText={(v) => draft.patch({ latitude: v ? parseFloat(v) : null })} placeholder="e.g. 19.0760" placeholderTextColor={t.textSecondary} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput style={styles.input} value={draft.longitude != null ? String(draft.longitude) : ""} onChangeText={(v) => draft.patch({ longitude: v ? parseFloat(v) : null })} placeholder="e.g. 72.8777" placeholderTextColor={t.textSecondary} keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={styles.smallBtn} onPress={useMyLocation} disabled={fetchingLocation}>
                <Feather name="navigation" size={14} color={palette.primary} />
                <Text style={styles.smallBtnText}>{fetchingLocation ? "Getting…" : "Use GPS"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => { if (draft.latitude != null) setAirspaceStatus("clear"); else setModal("Set GPS location first."); }}>
                <MaterialCommunityIcons name="shield-check-outline" size={14} color={palette.primary} />
                <Text style={styles.smallBtnText}>Check airspace</Text>
              </TouchableOpacity>
            </View>
            {draft.latitude != null && <Text style={styles.coords}>📍 {draft.latitude?.toFixed(5)}, {draft.longitude?.toFixed(5)}</Text>}
            {airspaceStatus === "clear" && (
              <View style={styles.clearBadge}>
                <MaterialCommunityIcons name="shield-check" size={13} color={palette.success} />
                <Text style={{ color: palette.success, fontWeight: "700", fontSize: 12 }}>Airspace clear</Text>
              </View>
            )}
            {draft.latitude != null && Platform.OS === "web" && (
              <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }} onPress={() => window.open(`https://www.google.com/maps?q=${draft.latitude},${draft.longitude}`, "_blank")}>
                <Feather name="map" size={14} color={palette.primary} />
                <Text style={{ color: palette.primary, fontSize: 13, fontWeight: "600" }}>View on Google Maps</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.section}>Weather</Text>
          <TouchableOpacity style={[styles.smallBtn, { alignSelf: "flex-start", marginBottom: 10 }]} onPress={fetchWeather} disabled={fetchingWeather}>
            <Feather name="cloud" size={14} color={palette.primary} />
            <Text style={styles.smallBtnText}>{fetchingWeather ? "Fetching…" : "Auto-fetch weather"}</Text>
          </TouchableOpacity>
          <View style={styles.gpsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Wind speed (m/s)</Text>
              <TextInput style={styles.input} value={draft.wind_speed != null ? String(draft.wind_speed) : ""} onChangeText={(v) => draft.patch({ wind_speed: v ? parseFloat(v) : null })} placeholder="e.g. 5" placeholderTextColor={t.textSecondary} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Direction</Text>
              <TextInput style={styles.input} value={draft.wind_direction || ""} onChangeText={(v) => draft.patch({ wind_direction: v })} placeholder="e.g. NW" placeholderTextColor={t.textSecondary} />
            </View>
          </View>
          <View style={styles.gpsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Temperature (°C)</Text>
              <TextInput style={styles.input} value={draft.temperature != null ? String(draft.temperature) : ""} onChangeText={(v) => draft.patch({ temperature: v ? parseFloat(v) : null })} placeholder="e.g. 28" placeholderTextColor={t.textSecondary} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Conditions</Text>
              <TextInput style={styles.input} value={draft.weather_conditions || ""} onChangeText={(v) => draft.patch({ weather_conditions: v })} placeholder="Clear, cloudy…" placeholderTextColor={t.textSecondary} />
            </View>
          </View>

          <Text style={styles.section}>Mission</Text>
          <Field label="Test objective / mission" testID="op-objective" multiline value={draft.test_objective || ""} onChangeText={(v: string) => draft.patch({ test_objective: v })} placeholder="Describe the mission" />
          <Field label="Changes since last flight" testID="op-changes" multiline value={draft.changes_since_last || ""} onChangeText={(v: string) => draft.patch({ changes_since_last: v })} placeholder="Any changes since last flight" />
          <View style={styles.gpsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>All up weight (kg)</Text>
              <TextInput style={styles.input} value={draft.all_up_weight != null ? String(draft.all_up_weight) : ""} onChangeText={(v) => draft.patch({ all_up_weight: v ? parseFloat(v) : null })} placeholder="e.g. 4.5" placeholderTextColor={t.textSecondary} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Payload</Text>
              <TextInput style={styles.input} value={draft.payload_description || ""} onChangeText={(v) => draft.patch({ payload_description: v })} placeholder="Camera, sensor…" placeholderTextColor={t.textSecondary} />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity testID="op-begin-btn" style={styles.cta} onPress={begin}>
            <Text style={styles.ctaText}>Begin checklist</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, testID, multiline, editable = true, placeholder, value, onChangeText }: any) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput testID={testID} editable={editable} multiline={multiline} style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top", paddingVertical: 10 }, !editable && { color: t.textSecondary, backgroundColor: t.background }]} placeholderTextColor={t.textSecondary} placeholder={placeholder} value={value} onChangeText={onChangeText} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  sub: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  section: { fontSize: 16, fontWeight: "700", color: t.text, marginTop: 20, marginBottom: 10 },
  label: { fontSize: 11, color: t.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  input: { minHeight: 44, paddingHorizontal: 14, fontSize: 14, backgroundColor: t.surface, borderRadius: 8, borderWidth: 0.5, borderColor: t.border, color: t.text },
  gpsCard: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 0.5, borderColor: t.border, padding: 12, marginBottom: 8 },
  gpsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: palette.primary },
  smallBtnText: { color: palette.primary, fontWeight: "700", fontSize: 12 },
  coords: { fontSize: 12, color: t.textSecondary, marginTop: 6 },
  clearBadge: { marginTop: 8, alignSelf: "flex-start", flexDirection: "row", gap: 4, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: palette.success + "20" },
  footer: { padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface },
  cta: { height: 52, borderRadius: 12, backgroundColor: palette.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText: { color: "white", fontSize: 16, fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 24, width: 300 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: t.text, marginBottom: 8 },
  modalMsg: { fontSize: 14, color: t.textSecondary, lineHeight: 22, marginBottom: 20 },
  modalBtn: { height: 44, borderRadius: 10, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  modalBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
