// Native map picker (iOS/Android) — uses react-native-maps.
import React from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { palette } from "./theme";

export type LatLng = { latitude: number; longitude: number };
export type MapPickerProps = {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  onRegionChange: (r: any) => void;
  onPress: (coordinate: LatLng) => void;
  pinned?: LatLng | null;
  height?: number;
};

export function MapPicker({ region, onRegionChange, onPress, pinned, height = 200 }: MapPickerProps) {
  return (
    <View style={[styles.box, { height }]}>
      <MapView
        style={{ flex: 1 }}
        region={region}
        onRegionChangeComplete={onRegionChange}
        onPress={(e) => onPress(e.nativeEvent.coordinate)}
      >
        {pinned && <Marker coordinate={pinned} pinColor={palette.danger} />}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, overflow: "hidden", marginTop: 4 },
});
