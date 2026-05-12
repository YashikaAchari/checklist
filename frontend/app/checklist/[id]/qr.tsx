import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { palette, lightTheme as t, droneTypeLabel } from "../../../src/theme";
import { api } from "../../../src/api";

export default function ChecklistQR() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cl, setCl] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await api.get(`/checklists/${id}`);
      setCl(data);
    })();
  }, [id]);

  if (!cl) {
    return <SafeAreaView style={styles.container}><Text style={{ color: t.text, padding: 16 }}>Loading…</Text></SafeAreaView>;
  }

  const value = cl.qr_code_url || `flyready://checklist/${cl.id}`;

  const onShare = async () => {
    try {
      await Share.share({ message: `Open this FlyReady checklist: ${value}` });
    } catch (e) { /* ignore */ }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="qr-screen">
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/home")} testID="qr-close-btn"><Ionicons name="close" size={28} color={t.text} /></TouchableOpacity>
        <Text style={styles.h1}>QR generated</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.checklistName}>{cl.name}</Text>
        <Text style={styles.meta}>{droneTypeLabel(cl.drone_type)} · {cl.phase}</Text>
        <View style={styles.qrBox}>
          <QRCode value={value} size={240} backgroundColor="#fff" color="#000" />
        </View>
        <Text style={styles.idText}>{cl.id}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity testID="qr-share-btn" style={[styles.btn, styles.btnGhost]} onPress={onShare}>
          <Feather name="share-2" size={20} color={palette.primary} />
          <Text style={[styles.btnText, { color: palette.primary }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="qr-done-btn" style={[styles.btn, styles.btnPrimary]} onPress={() => router.replace("/(tabs)/home")}>
          <Text style={[styles.btnText, { color: palette.white }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  checklistName: { fontSize: 22, fontWeight: "700", color: t.text, textAlign: "center" },
  meta: { fontSize: 13, color: t.textSecondary, marginTop: 4, marginBottom: 32 },
  qrBox: { padding: 16, backgroundColor: "#fff", borderRadius: 16, borderWidth: 0.5, borderColor: t.border },
  idText: { fontSize: 11, color: t.textSecondary, marginTop: 16, fontFamily: "monospace" },
  actions: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface },
  btn: { flex: 1, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnGhost: { borderWidth: 1, borderColor: palette.primary, backgroundColor: t.surface },
  btnPrimary: { backgroundColor: palette.primary },
  btnText: { fontWeight: "700", fontSize: 15 },
});
