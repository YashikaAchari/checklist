import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette } from "./theme";

// FlyReady logo: drone silhouette + bold green tick.
// Drone arms drawn as a simple cross, with rotor circles at each end,
// and a centred check mark layered on top.
type Props = { size?: number; tickColor?: string; droneColor?: string };

export function FlyReadyLogo({ size = 96, tickColor = palette.success, droneColor = palette.white }: Props) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <MaterialCommunityIcons
        name="quadcopter"
        size={size}
        color={droneColor}
        style={{ position: "absolute" }}
      />
      <Ionicons
        name="checkmark"
        size={size * 0.55}
        color={tickColor}
        style={{ position: "absolute", fontWeight: "900" }}
      />
    </View>
  );
}

export function FlyReadyWordmark({ color = palette.white }: { color?: string }) {
  return (
    <View style={styles.wordmark}>
      <Text style={[styles.wordmarkText, { color }]}>FlyReady</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
  wordmark: { flexDirection: "row", alignItems: "center" },
  wordmarkText: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
});
