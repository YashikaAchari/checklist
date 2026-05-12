// Expo Go-compatible MapPicker.
// react-native-maps requires a custom EAS dev build, so for Expo Go we render
// a tappable card with GPS coords + "Open in Maps" link. When the user does an
// EAS build later, swap this file back to the react-native-maps version.
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, lightTheme as t } from "./theme";

export type LatLng = { latitude: number; longitude: number };
export type MapPickerProps = {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  onRegionChange: (r: any) => void;
  onPress: (coordinate: LatLng) => void;
  pinned?: LatLng | null;
  height?: number;
};

export function MapPicker({ pinned, height = 200 }: MapPickerProps) {
  const openInMaps = () => {
    if (!pinned) return;
    const { latitude, longitude } = pinned;
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${latitude},${longitude}&q=Flight%20location`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(Flight%20location)`,
      default: `https://www.google.com/maps?q=${latitude},${longitude}`,
    })!;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.box, { height }]}>
      {pinned ? (
        <>
          <MaterialCommunityIcons name="map-marker-radius" size={48} color={palette.danger} />
          <Text style={styles.pinnedTitle}>Location pinned</Text>
          <Text style={styles.coords}>{pinned.latitude.toFixed(5)}, {pinned.longitude.toFixed(5)}</Text>
          <TouchableOpacity style={styles.openBtn} onPress={openInMaps} testID="map-open-external">
            <Feather name="external-link" size={14} color={palette.primary} />
            <Text style={styles.openBtnText}>Open in Maps</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Feather name="map-pin" size={36} color={palette.primary} />
          <Text style={styles.hint}>Tap "Use my location" below to drop a GPS pin</Text>
          <Text style={styles.hint2}>Interactive map preview is enabled in production builds</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 0.5,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  hint: { color: t.text, fontSize: 13, fontWeight: "600", marginTop: 8, textAlign: "center" },
  hint2: { color: t.textSecondary, fontSize: 11, marginTop: 4, textAlign: "center" },
  pinnedTitle: { color: t.text, fontSize: 14, fontWeight: "700", marginTop: 6 },
  coords: { color: palette.primary, fontSize: 13, marginTop: 4, fontWeight: "700" },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  openBtnText: { color: palette.primary, fontSize: 12, fontWeight: "700" },
});
