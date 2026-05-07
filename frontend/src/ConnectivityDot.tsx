import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { palette } from "./theme";

export function ConnectivityDot() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => setOnline(!!s.isConnected));
    NetInfo.fetch().then((s) => setOnline(!!s.isConnected));
    return () => unsub();
  }, []);
  return (
    <View
      testID="connectivity-dot"
      style={[styles.dot, { backgroundColor: online ? palette.success : "#888" }]}
    />
  );
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
});
