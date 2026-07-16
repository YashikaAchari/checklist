import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { palette, lightTheme as t, droneTypeLabel } from "../../../src/theme";
import { api } from "../../../src/api";

const PUBLIC_URL = "https://flyready-iota.vercel.app";

export default function ChecklistQR() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cl, setCl] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await api.get(`/checklists/${id}`);
      setCl(data);
    })();
  }, [id]);

  if (!cl) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="qr-screen">
        <View style={styles.loading}>
          <ActivityIndicator color={palette.primary} size="large" />
          <Text style={{ color: t.textSecondary, marginTop: 12 }}>Loading checklist…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const value = `${PUBLIC_URL}/checklist/${cl.id}/scan`;

  const onShare = async () => {
    try {
      await Share.share({ message: `Open this FlyReady checklist: ${value}` });
    } catch {
      /* ignore */
    }
  };

  const onCopy = async () => {
    try {
      await Clipboard.setStringAsync(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const onPrint = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="qr-screen">
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/home")} testID="qr-close-btn">
          <Ionicons name="close" size={28} color={t.text} />
        </TouchableOpacity>
        <Text style={styles.h1}>QR generated</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.body}>
        <Text testID="qr-checklist-name" style={styles.checklistName}>{cl.name}</Text>
        <Text testID="qr-drone-type" style={styles.meta}>
          {droneTypeLabel(cl.drone_type)} · {cl.phase}
        </Text>

        <View style={styles.qrBox}>
          <QRCode value={value} size={280} backgroundColor="#fff" color="#000" />
        </View>

        <Text style={styles.stickerText}>
          Stick this QR on your drone. Scan before every flight.
        </Text>

        <View style={styles.linkBox}>
          <Text testID="qr-link" style={styles.linkText} numberOfLines={1}>{value}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity testID="qr-copy-btn" style={[styles.btn, styles.btnGhost]} onPress={onCopy}>
          <Feather name={copied ? "check" : "copy"} size={18} color={palette.primary} />
          <Text style={[styles.btnText, { color: palette.primary }]}>{copied ? "Copied" : "Copy link"}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="qr-share-btn" style={[styles.btn, styles.btnGhost]} onPress={onShare}>
          <Feather name="share-2" size={18} color={palette.primary} />
          <Text style={[styles.btnText, { color: palette.primary }]}>Share</Text>
        </TouchableOpacity>
        {Platform.OS === "web" && (
          <TouchableOpacity testID="qr-print-btn" style={[styles.btn, styles.btnGhost]} onPress={onPrint}>
            <Feather name="printer" size={18} color={palette.primary} />
            <Text style={[styles.btnText, { color: palette.primary }]}>Print</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.doneBar}>
        <TouchableOpacity testID="qr-done-btn" style={styles.btnPrimary} onPress={() => router.replace("/(tabs)/home")}>
          <Text style={[styles.btnText, { color: palette.white }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  checklistName: { fontSize: 22, fontWeight: "700", color: t.text, textAlign: "center", marginBottom: 4 },
  meta: { fontSize: 14, color: t.textSecondary, marginBottom: 24, fontWeight: "600" },
  qrBox: { padding: 16, backgroundColor: "#fff", borderRadius: 16, borderWidth: 0.5, borderColor: t.border },
  stickerText: { fontSize: 13, color: t.textSecondary, marginTop: 20, textAlign: "center", paddingHorizontal: 16, lineHeight: 20 },
  linkBox: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: t.surface, borderRadius: 8, borderWidth: 0.5, borderColor: t.border, maxWidth: 320 },
  linkText: { fontSize: 11, color: t.textSecondary, fontFamily: "monospace" },
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  doneBar: { padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface, marginTop: 12 },
  btn: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  btnGhost: { borderWidth: 1, borderColor: palette.primary, backgroundColor: t.surface },
  btnPrimary: { backgroundColor: palette.primary, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnText: { fontWeight: "700", fontSize: 13 },
});
