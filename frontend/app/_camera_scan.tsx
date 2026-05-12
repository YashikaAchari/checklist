import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t } from "../src/theme";
import { api, formatApiError } from "../src/api";
import { useFlightDraft } from "../src/flightDraft";

export default function CameraScanner() {
  const router = useRouter();
  const [permission, setPermission] = useState<any>(null);
  const [scanned, setScanned] = useState(false);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState("");
  const [CameraView, setCameraView] = useState<any>(null);

  React.useEffect(() => {
    import("expo-camera").then((mod) => {
      mod.Camera.requestCameraPermissionsAsync().then((p: any) => {
        setPermission(p);
        if (p.status === "granted") setCameraView(() => mod.CameraView);
      });
    }).catch(() => setManual(true));
  }, []);

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
      setScanned(false);
    }
  };

  if (manual || !permission || permission.status !== "granted") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
          <Text style={styles.h1}>Enter Checklist ID</Text>
          <View style={{ width: 28 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.body}>
            <MaterialCommunityIcons name="qrcode-scan" size={60} color={palette.primary} />
            <Text style={styles.title}>Enter checklist ID manually</Text>
            <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Paste checklist ID..." placeholderTextColor={t.textSecondary} autoCapitalize="none" autoCorrect={false} />
            <TouchableOpacity style={styles.btn} onPress={() => handleCode(code)}>
              <Text style={styles.btnText}>Open checklist →</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (!CameraView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.body}><Text style={{ color: t.textSecondary }}>Loading camera…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={scanned ? undefined : (e: any) => handleCode(e.data)} />
      <SafeAreaView edges={["top"]} style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.camBack}><Ionicons name="chevron-back" size={28} color="white" /></TouchableOpacity>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>Scan drone QR</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>
      <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 260, height: 260, borderWidth: 3, borderColor: palette.success, borderRadius: 16 }} />
      </View>
      <SafeAreaView edges={["bottom"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16 }}>
        <TouchableOpacity style={styles.btn} onPress={() => { setManual(true); }}>
          <Text style={styles.btnText}>Enter ID manually</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  body: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 16 },
  title: { fontSize: 20, fontWeight: "700", color: t.text, textAlign: "center" },
  input: { width: "100%", backgroundColor: t.surface, borderRadius: 10, borderWidth: 0.5, borderColor: t.border, padding: 14, fontSize: 14, color: t.text },
  btn: { width: "100%", height: 52, borderRadius: 12, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  camBack: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
});
