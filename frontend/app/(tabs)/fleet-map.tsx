import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as t, palette } from "../../src/theme";

export default function FleetMap() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="fleet-map-screen">
      <View style={styles.topBar}>
        <Text style={styles.h1}>Fleet map</Text>
      </View>
      <View style={styles.body}>
        <Feather name="map" size={64} color={palette.primary} />
        <Text style={styles.h2}>Coming soon</Text>
        <Text style={styles.sub}>
          Live fleet map with drone pins, airspace overlays and drone status will land in v2. The map widget for selecting flight location is already available inside the operator details form.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 24, fontWeight: "700", color: t.text },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  h2: { fontSize: 20, fontWeight: "700", color: t.text, marginTop: 16 },
  sub: { fontSize: 14, color: t.textSecondary, marginTop: 8, textAlign: "center", lineHeight: 22 },
});
