import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t } from "../src/theme";
import { api, formatApiError } from "../src/api";
import { useFlightDraft } from "../src/flightDraft";

export default function Scan() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      import("expo-camera").then((mod) => {
        mod.Camera.requestCameraPermissionsAsync().then((r) => {
          setPermission(r.status === "granted");
          setCameraReady(true);
        });
      }).catch(() => setCameraReady(false));
    }
  }, []);

  const handleCode = async (data: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    let id = data.trim();
    if (id.startsWith("flyready://checklist/")) id = id.replace("flyready://checklist/", "");
    if (!id) { setError("Please enter a valid checklist ID."); setBusy(false); return; }
    try {
      const { data: cl } = await api.get(`/checklists/${id}`);
      useFlightDraft.getState().reset();
      useFlightDraft.getState().setChecklist(cl);
      router.replace("/flight/operator-details");
    } catch (e: any) {
      setError("Checklist not found: " + formatApiError(e));
      setScanned(false);
    } finally {
      setBusy(false);
    }
  };

  // Web — manual entry only
  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.text} />
          </TouchableOpacity>
          <Text style={styles.h1}>Enter QR Code</Text>
          <View style={{ width: 28 }} />
        </View>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={styles.body}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="qrcode-scan" size={60} color={palette.primary} />
            </View>
            <Text style={styles.title}>Scan or enter checklist ID</Text>
            <Text style={styles.sub}>On mobile, point the camera at the QR code on your drone. On web, enter the checklist ID below.</Text>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="Paste checklist ID or flyready://checklist/..."
              placeholderTextColor={t.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={() => handleCode(code)} disabled={busy}>
              <Text style={styles.btnText}>{busy ? "Loading…" : "Open checklist →"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Mobile — camera scanner
  if (!cameraReady) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.text} />
          </TouchableOpacity>
          <Text style={styles.h1}>Scan QR</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.body}>
          <Text style={{ color: t.textSecondary }}>Loading camera…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.text} />
          </TouchableOpacity>
          <Text style={styles.h1}>Scan QR</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.body}>
          <MaterialCommunityIcons name="camera-off-outline" size={64} color={t.textSecondary} />
          <Text style={styles.title}>Camera permission needed</Text>
          <Text style={styles.sub}>Please allow camera access to scan QR codes, or enter the ID manually below.</Text>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Enter checklist ID manually" placeholderTextColor={t.textSecondary} autoCapitalize="none" />
          <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={() => handleCode(code)} disabled={busy}>
            <Text style={styles.btnText}>{busy ? "Loading…" : "Open checklist →"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Full camera scanner on mobile
  const CameraView = require("expo-camera").CameraView;
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : (e: any) => { setScanned(true); handleCode(e.data); }}
      />
      <SafeAreaView edges={["top"]} style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.camBackBtn}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>Scan drone QR</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>
      <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 260, height: 260, borderWidth: 3, borderColor: palette.success, borderRadius: 16 }} />
      </View>
      {scanned && (
        <SafeAreaView edges={["bottom"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16 }}>
          <TouchableOpacity style={styles.btn} onPress={() => setScanned(false)}>
            <Text style={styles.btnText}>Tap to scan again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  body: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 14 },
  iconBox: { width: 120, height: 120, borderRadius: 24, backgroundColor: palette.primary + "15", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", color: t.text, textAlign: "center" },
  sub: { fontSize: 14, color: t.textSecondary, textAlign: "center", lineHeight: 22 },
  errorText: { color: palette.danger, fontSize: 13, textAlign: "center" },
  input: { width: "100%", backgroundColor: t.surface, borderRadius: 10, borderWidth: 0.5, borderColor: t.border, padding: 14, fontSize: 14, color: t.text },
  btn: { width: "100%", height: 52, borderRadius: 12, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  camBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
});
