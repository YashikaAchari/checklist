import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t } from "../../src/theme";
import { useFlightDraft } from "../../src/flightDraft";

export default function FlightSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams<{ flightId?: string; serial?: string; pass?: string; fail?: string; id?: string }>();
  const flightId = params.flightId || "—";
  const serial = params.serial || "—";
  const pass = params.pass || "0";
  const fail = params.fail || "0";
  const logId = params.id;

  const goHome = () => {
    router.replace("/(tabs)/home");
    setTimeout(() => useFlightDraft.getState().reset(), 50);
  };

  const viewRecord = () => {
    if (logId) {
      router.replace(`/history/flight/${logId}`);
      setTimeout(() => useFlightDraft.getState().reset(), 50);
    } else {
      goHome();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="flight-success-screen">
      <View style={styles.body}>
        <View style={styles.checkCircle}>
          <Feather name="check" size={72} color={palette.white} />
        </View>
        <Text testID="success-title" style={styles.title}>Flight saved!</Text>
        <Text style={styles.sub}>Your preflight record has been logged safely.</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Flight ID</Text>
            <Text testID="success-flight-id" style={styles.summaryValue}>{flightId}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Serial number</Text>
            <Text style={styles.summaryValue}>#{String(serial).padStart(3, "0")}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items passed</Text>
            <Text style={[styles.summaryValue, { color: palette.success }]}>{pass}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items failed</Text>
            <Text style={[styles.summaryValue, { color: Number(fail) > 0 ? palette.danger : t.textSecondary }]}>{fail}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity testID="success-view-btn" style={[styles.btn, styles.btnGhost]} onPress={viewRecord}>
          <Feather name="file-text" size={18} color={palette.primary} />
          <Text style={[styles.btnText, { color: palette.primary }]}>View record</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="success-home-btn" style={[styles.btn, styles.btnPrimary]} onPress={goHome}>
          <Ionicons name="home" size={18} color={palette.white} />
          <Text style={[styles.btnText, { color: palette.white }]}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  checkCircle: { width: 132, height: 132, borderRadius: 66, backgroundColor: palette.success, alignItems: "center", justifyContent: "center", shadowColor: palette.success, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6 },
  title: { fontSize: 28, fontWeight: "700", color: t.text, marginTop: 24, letterSpacing: -0.4 },
  sub: { fontSize: 15, color: t.textSecondary, marginTop: 8, textAlign: "center" },
  summaryCard: { width: "100%", maxWidth: 400, marginTop: 32, padding: 20, borderRadius: 14, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, gap: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: t.border },
  summaryLabel: { fontSize: 13, color: t.textSecondary },
  summaryValue: { fontSize: 14, color: t.text, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface },
  btn: { flex: 1, height: 52, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  btnGhost: { borderWidth: 1.5, borderColor: palette.primary, backgroundColor: t.surface },
  btnPrimary: { backgroundColor: palette.primary },
  btnText: { fontWeight: "700", fontSize: 15 },
});
