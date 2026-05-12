import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";

interface Props {
  onLocationSelected: (lat: number, lng: number, name: string) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function MapPicker({ onLocationSelected, initialLat, initialLng }: Props) {
  const [lat, setLat] = useState(initialLat?.toString() || "");
  const [lng, setLng] = useState(initialLng?.toString() || "");
  const [name, setName] = useState("");

  const handleUseGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude.toString());
        setLng(pos.coords.longitude.toString());
        onLocationSelected(pos.coords.latitude, pos.coords.longitude, name || "Current location");
      });
    }
  };

  const handleConfirm = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      onLocationSelected(latNum, lngNum, name || `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Location name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Test field, Mumbai" placeholderTextColor="#888" />
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput style={styles.input} value={lat} onChangeText={setLat} keyboardType="decimal-pad" placeholder="e.g. 19.0760" placeholderTextColor="#888" />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput style={styles.input} value={lng} onChangeText={setLng} keyboardType="decimal-pad" placeholder="e.g. 72.8777" placeholderTextColor="#888" />
        </View>
      </View>
      <TouchableOpacity style={styles.gpsBtn} onPress={handleUseGPS}>
        <Text style={styles.gpsBtnText}>Use my current GPS location</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
        <Text style={styles.confirmBtnText}>Confirm location</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#F5F5F5", borderRadius: 12 },
  label: { fontSize: 12, color: "#888", marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: "#fff", borderRadius: 8, padding: 10, fontSize: 14, color: "#212121", borderWidth: 0.5, borderColor: "#E0E0E0" },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  gpsBtn: { backgroundColor: "#E6F1FB", borderRadius: 8, padding: 10, marginTop: 12, alignItems: "center" },
  gpsBtnText: { color: "#0C447C", fontWeight: "500", fontSize: 13 },
  confirmBtn: { backgroundColor: "#1D9E75", borderRadius: 8, padding: 12, marginTop: 8, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontWeight: "500", fontSize: 14 },
});
