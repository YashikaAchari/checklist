import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t } from "../src/theme";
import { api, formatApiError } from "../src/api";
import { useFlightDraft } from "../src/flightDraft";

export default function Scan() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState("");

  const handleCode = async (data: string) => {
    if (scanned) return;
    setScanned(true);
    let id = data.trim();
    if (id.startsWith("flyready://checklist/")) id = id.replace("flyready://checklist/", "");
    try {
      const { data: cl } = await api.get(`/checklists/${id}`);
      useFlightDraft.getState().reset();
      useFlightDraft.getState().setChecklist(cl);
      router.replace("/flight/operator-details");
    } catch (e: any) {
      Alert.alert("Checklist not found", formatApiError(e), [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
    }
  };

  if (!permission) {
    return <SafeAreaView style={styles.center}><Text style={{ color: t.text }}>Loading…</Text></SafeAreaView>;
  }

  if (manual) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%", padding: 24 }}>
          <TouchableOpacity onPress={() => setManual(false)} style={{ marginBottom: 16 }}>
            <Ionicons name="chevron-back" size={28} color={t.text} />
          </TouchableOpacity>
          <Text style={styles.h1}>Enter checklist ID</Text>
          <Text style={styles.sub}>Paste or type the checklist ID from a damaged QR code</Text>
          <TextInput testID="scan-manual-input" style={styles.input} value={code} onChangeText={setCode} autoCapitalize="none" placeholder="e.g. 9c6e2a01-…" placeholderTextColor={t.textSecondary} />
          <TouchableOpacity testID="scan-manual-submit" style={styles.cta} onPress={() => handleCode(code)}>
            <Text style={styles.ctaText}>Continue</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "bottom"]}>
        <MaterialCommunityIcons name="camera-off-outline" size={64} color={t.textSecondary} />
        <Text style={styles.h1}>Camera permission needed</Text>
        <Text style={styles.sub}>FlyReady uses your camera to scan drone QR codes</Text>
        <TouchableOpacity testID="scan-grant-permission" style={styles.cta} onPress={requestPermission}>
          <Text style={styles.ctaText}>Grant access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setManual(true)} style={{ marginTop: 16 }}>
          <Text style={{ color: palette.primary, fontWeight: "600" }}>Enter checklist ID manually</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }} testID="scan-screen">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={(e) => handleCode(e.data)}
      />
      <SafeAreaView edges={["top"]} style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <View style={styles.topRow}>
          <TouchableOpacity testID="scan-back-btn" onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={28} color={palette.white} />
          </TouchableOpacity>
          <Text style={styles.scanHeader}>Scan drone QR code</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      {/* viewfinder frame */}
      <View pointerEvents="none" style={styles.viewfinder}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Align QR code within frame</Text>
      </View>

      <SafeAreaView edges={["bottom"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 24 }}>
        <TouchableOpacity testID="scan-manual-toggle" style={styles.manualBtn} onPress={() => setManual(true)}>
          <Feather name="edit-3" size={18} color={palette.white} />
          <Text style={{ color: palette.white, fontWeight: "600" }}>Enter checklist ID manually</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.background, padding: 24 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  scanHeader: { color: palette.white, fontSize: 16, fontWeight: "700" },
  viewfinder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame: { width: 260, height: 260, borderWidth: 3, borderColor: palette.success, borderRadius: 16 },
  hint: { color: palette.white, marginTop: 16, fontSize: 14, fontWeight: "600", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  manualBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  h1: { color: t.text, fontSize: 22, fontWeight: "700", marginTop: 16 },
  sub: { color: t.textSecondary, fontSize: 14, marginTop: 8, textAlign: "center" },
  input: { height: 48, marginTop: 16, backgroundColor: t.surface, borderRadius: 8, borderWidth: 0.5, borderColor: t.border, paddingHorizontal: 16, fontSize: 15, color: t.text },
  cta: { marginTop: 16, height: 50, borderRadius: 12, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  ctaText: { color: palette.white, fontWeight: "700", fontSize: 16 },
});
