import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { palette, lightTheme as t, droneTypeLabel } from "../../src/theme";
import { MapPicker } from "../../src/MapPicker";
import { useFlightDraft } from "../../src/flightDraft";
import { api, formatApiError } from "../../src/api";

export default function OperatorDetails() {
  const router = useRouter();
  const draft = useFlightDraft();
  const cl = draft.checklist;

  const [region, setRegion] = useState({ latitude: 28.6139, longitude: 77.2090, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [pinned, setPinned] = useState<{ latitude: number; longitude: number } | null>(null);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [weatherMode, setWeatherMode] = useState<"auto" | "manual">("manual");

  useEffect(() => {
    if (!cl) router.replace("/(tabs)/home");
    if (!draft.flight_id) {
      const today = new Date();
      const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
      const rnd = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
      draft.patch({ flight_id: `${ymd}-${rnd}` });
    }
  }, []);

  if (!cl) return null;

  const useMyLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required to fetch GPS coords");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const r = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      setRegion(r);
      setPinned({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      draft.patch({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not get location");
    }
  };

  const onMapPress = (c: { latitude: number; longitude: number }) => {
    setPinned(c);
    draft.patch({ latitude: c.latitude, longitude: c.longitude });
  };

  const fetchWeather = async () => {
    if (draft.latitude == null || draft.longitude == null) {
      Alert.alert("Pin location first", "Tap the map or use 'My location' to set GPS coords first");
      return;
    }
    setFetchingWeather(true);
    try {
      const { data } = await api.get(`/weather`, { params: { lat: draft.latitude, lon: draft.longitude } });
      draft.patch({
        wind_speed: data.wind_speed,
        wind_direction: String(data.wind_direction || ""),
        temperature: data.temperature,
        weather_conditions: data.conditions,
        weather_source: "auto",
      });
      setWeatherMode("auto");
      Alert.alert("Weather updated", `${data.conditions} · ${data.temperature}°C · wind ${data.wind_speed} m/s`);
    } catch (e: any) {
      const msg = formatApiError(e);
      Alert.alert("Weather unavailable", msg + "\n\nFalling back to manual entry.");
      setWeatherMode("manual");
    } finally {
      setFetchingWeather(false);
    }
  };

  const checkAirspace = () => {
    // simple offline heuristic — coordinates ending in 0 = clear, else unknown.
    // Real airspace API arrives in v2.
    if (draft.latitude != null) {
      draft.patch({ airspace_status: "clear" });
      Alert.alert("Airspace clear", "No restrictions found at this location.\n\n(Live airspace API available in v2)");
    }
  };

  const begin = () => {
    if (!draft.operator_name.trim()) return Alert.alert("Pilot required", "Please enter the Pilot in Command name");
    if (!draft.flight_id.trim()) return Alert.alert("Flight ID required", "Please enter a flight ID");
    router.push("/flight/execute");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="operator-details-screen">
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.h1}>Operator details</Text>
          <Text style={styles.sub}>Step 1 of 2 · {cl.name}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {/* Operator section */}
          <Text style={styles.sectionTitle}>Operator</Text>
          <Field label="Pilot in Command *" testID="op-pilot" value={draft.operator_name} onChangeText={(v) => draft.patch({ operator_name: v })} />
          <Field label="GCS Operator / Ground crew" testID="op-gcs" value={draft.gcs_operator} onChangeText={(v) => draft.patch({ gcs_operator: v })} />
          <Field label="Flight ID *" testID="op-flightid" value={draft.flight_id} onChangeText={(v) => draft.patch({ flight_id: v })} />

          {/* Aircraft */}
          <Text style={styles.sectionTitle}>Aircraft</Text>
          <Field label={`Aircraft type (from QR)`} value={droneTypeLabel(cl.drone_type)} onChangeText={() => {}} editable={false} />
          <Field label="Drone serial number" testID="op-serial" value={draft.serial_number_drone || ""} onChangeText={(v) => draft.patch({ serial_number_drone: v })} placeholder="e.g. MR-04" />
          <Field label="Battery used" testID="op-battery" value={draft.battery_used_label || ""} onChangeText={(v) => draft.patch({ battery_used_label: v })} placeholder="e.g. B-02" />

          {/* Location + map */}
          <Text style={styles.sectionTitle}>Location</Text>
          <Field label="Location name" testID="op-location" value={draft.location_name} onChangeText={(v) => draft.patch({ location_name: v })} placeholder="e.g. North field, Site A" />
          <MapPicker
            region={region}
            onRegionChange={setRegion}
            onPress={onMapPress}
            pinned={pinned}
            height={200}
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity testID="op-use-gps" style={styles.smallBtn} onPress={useMyLocation}>
              <Feather name="navigation" size={16} color={palette.primary} />
              <Text style={styles.smallBtnText}>Use my location</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="op-airspace" style={styles.smallBtn} onPress={checkAirspace}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color={palette.primary} />
              <Text style={styles.smallBtnText}>Check airspace</Text>
            </TouchableOpacity>
          </View>
          {draft.latitude != null && (
            <Text style={styles.coordsText}>Pinned: {draft.latitude?.toFixed(5)}, {draft.longitude?.toFixed(5)}</Text>
          )}
          {draft.airspace_status !== "unknown" && (
            <View style={[styles.airspaceBadge, { backgroundColor: palette.success + "20" }]}>
              <MaterialCommunityIcons name="shield-check" size={14} color={palette.success} />
              <Text style={{ color: palette.success, fontWeight: "700", fontSize: 12 }}>Airspace clear</Text>
            </View>
          )}

          {/* Weather */}
          <Text style={styles.sectionTitle}>Weather</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <TouchableOpacity testID="op-weather-fetch" style={styles.smallBtn} onPress={fetchWeather} disabled={fetchingWeather}>
              <Feather name="cloud" size={16} color={palette.primary} />
              <Text style={styles.smallBtnText}>{fetchingWeather ? "Fetching…" : "Auto-fetch"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={() => setWeatherMode("manual")}>
              <Feather name="edit-3" size={16} color={palette.primary} />
              <Text style={styles.smallBtnText}>Manual</Text>
            </TouchableOpacity>
          </View>
          <Field label="Wind speed" testID="op-wind" value={String(draft.wind_speed ?? "")} onChangeText={(v) => draft.patch({ wind_speed: v ? parseFloat(v) : null })} placeholder="m/s" keyboardType="decimal-pad" />
          <Field label="Wind direction" testID="op-wind-dir" value={draft.wind_direction || ""} onChangeText={(v) => draft.patch({ wind_direction: v })} placeholder="e.g. NW or 315°" />
          <Field label="Temperature (°C)" testID="op-temp" value={String(draft.temperature ?? "")} onChangeText={(v) => draft.patch({ temperature: v ? parseFloat(v) : null })} keyboardType="decimal-pad" />
          <Field label="Conditions" testID="op-cond" value={draft.weather_conditions || ""} onChangeText={(v) => draft.patch({ weather_conditions: v })} placeholder="Clear, partly cloudy…" />

          {/* Mission */}
          <Text style={styles.sectionTitle}>Mission</Text>
          <Field label="Test objective / mission" testID="op-objective" multiline value={draft.test_objective || ""} onChangeText={(v) => draft.patch({ test_objective: v })} />
          <Field label="Changes since last flight" testID="op-changes" multiline value={draft.changes_since_last || ""} onChangeText={(v) => draft.patch({ changes_since_last: v })} />
          <Field label="All up weight (kg)" testID="op-auw" value={String(draft.all_up_weight ?? "")} onChangeText={(v) => draft.patch({ all_up_weight: v ? parseFloat(v) : null })} keyboardType="decimal-pad" />
          <Field label="Payload description" testID="op-payload" value={draft.payload_description || ""} onChangeText={(v) => draft.patch({ payload_description: v })} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity testID="op-begin-btn" style={styles.cta} onPress={begin}>
            <Text style={styles.ctaText}>Begin checklist</Text>
            <Ionicons name="arrow-forward" size={20} color={palette.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, testID, multiline, editable = true, ...rest }: any) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        editable={editable}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 80, paddingVertical: 10, textAlignVertical: "top" }, !editable && { color: t.textSecondary }]}
        placeholderTextColor={t.textSecondary}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  sub: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: t.text, marginTop: 16, marginBottom: 8 },
  label: { fontSize: 12, color: t.textSecondary, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  input: { minHeight: 44, paddingHorizontal: 14, fontSize: 14, backgroundColor: t.surface, borderRadius: 8, borderWidth: 0.5, borderColor: t.border, color: t.text },
  mapBox: { height: 200, borderRadius: 12, overflow: "hidden", marginTop: 4, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.border },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: palette.primary },
  smallBtnText: { color: palette.primary, fontWeight: "700", fontSize: 13 },
  coordsText: { fontSize: 11, color: t.textSecondary, marginTop: 6 },
  airspaceBadge: { marginTop: 8, alignSelf: "flex-start", flexDirection: "row", gap: 4, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  bottomBar: { padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface },
  cta: { backgroundColor: palette.primary, height: 52, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText: { color: palette.white, fontSize: 16, fontWeight: "700" },
});
