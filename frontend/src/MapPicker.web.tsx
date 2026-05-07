// Web fallback for MapPicker — react-native-maps does not support web.
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { palette, lightTheme as t } from "./theme";

export type LatLng = { latitude: number; longitude: number };
export type MapPickerProps = {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  onRegionChange: (r: any) => void;
  onPress: (coordinate: LatLng) => void;
  pinned?: LatLng | null;
  height?: number;
};

export function MapPicker({ pinned, onPress, region, height = 200 }: MapPickerProps) {
  return (
    <TouchableOpacity
      style={[styles.box, { height }]}
      onPress={() => onPress({ latitude: region.latitude, longitude: region.longitude })}
    >
      <Feather name="map-pin" size={32} color={palette.primary} />
      <Text style={styles.hint}>Map preview is available on the iOS / Android app.</Text>
      <Text style={styles.hint2}>Use "My location" or enter coords manually.</Text>
      {pinned && (
        <Text style={styles.coords}>📍 {pinned.latitude.toFixed(5)}, {pinned.longitude.toFixed(5)}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, marginTop: 4, alignItems: "center", justifyContent: "center", padding: 16, borderWidth: 0.5, borderColor: t.border, borderStyle: "dashed", backgroundColor: t.surface },
  hint: { color: t.text, fontSize: 13, fontWeight: "600", marginTop: 8, textAlign: "center" },
  hint2: { color: t.textSecondary, fontSize: 12, marginTop: 4, textAlign: "center" },
  coords: { color: palette.primary, fontSize: 12, marginTop: 8, fontWeight: "700" },
});
