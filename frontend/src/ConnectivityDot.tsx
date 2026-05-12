import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { palette } from "./theme";

export function ConnectivityDot() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (Platform.OS === "web") {
      setOnline(navigator.onLine);
      const up = () => setOnline(true);
      const dn = () => setOnline(false);
      window.addEventListener("online", up);
      window.addEventListener("offline", dn);
      return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
    } else {
      let unsub: (() => void) | undefined;
      import("@react-native-community/netinfo").then((N) => {
        unsub = N.default.addEventListener((s) => setOnline(!!s.isConnected));
        N.default.fetch().then((s) => setOnline(!!s.isConnected));
      });
      return () => unsub?.();
    }
  }, []);
  return <View testID="connectivity-dot" style={[styles.dot, { backgroundColor: online ? palette.success : "#888" }]} />;
}
const styles = StyleSheet.create({ dot: { width: 8, height: 8, borderRadius: 4 } });
