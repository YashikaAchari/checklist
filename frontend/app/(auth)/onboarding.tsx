import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { palette, lightTheme as t } from "../../src/theme";
import { SafeAreaView } from "react-native-safe-area-context";

const SLIDES = [
  {
    icon: <MaterialCommunityIcons name="qrcode-scan" size={96} color={palette.primary} />,
    title: "Scan your drone QR to begin",
    body: "Every checklist starts with a quick QR scan. Locks operator details to the right aircraft, every time.",
  },
  {
    icon: <Feather name="check-circle" size={96} color={palette.success} />,
    title: "Preflight, inflight, post-flight",
    body: "Three-state checklists with pass, fail, or pending — capture every issue with a tap.",
  },
  {
    icon: <Feather name="archive" size={96} color={palette.primary} />,
    title: "Every flight saved automatically",
    body: "Operator details, weather, signatures, photos — all logged and exportable as PDF.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];

  const next = () => {
    if (i < SLIDES.length - 1) setI(i + 1);
    else router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <View />
        <TouchableOpacity testID="onboarding-skip" onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.illustration}>{slide.icon}</View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </ScrollView>
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, idx === i && styles.dotActive]}
            />
          ))}
        </View>
        <TouchableOpacity testID="onboarding-next-btn" style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>{i === SLIDES.length - 1 ? "Get started" : "Next"}</Text>
          <Ionicons name="arrow-forward" size={20} color={palette.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  skip: { color: t.textSecondary, fontSize: 14, fontWeight: "600" },
  content: { padding: 32, alignItems: "center", justifyContent: "center", flexGrow: 1 },
  illustration: { width: 180, height: 180, alignItems: "center", justifyContent: "center", backgroundColor: t.surface, borderRadius: 12, borderWidth: 0.5, borderColor: t.border, marginBottom: 32 },
  title: { fontSize: 24, fontWeight: "700", color: t.text, textAlign: "center", marginBottom: 12, letterSpacing: -0.3 },
  body: { fontSize: 15, color: t.textSecondary, textAlign: "center", lineHeight: 22, paddingHorizontal: 8 },
  bottom: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16 },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 24, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.border },
  dotActive: { backgroundColor: palette.primary, width: 24 },
  cta: { backgroundColor: palette.primary, height: 52, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText: { color: palette.white, fontSize: 16, fontWeight: "600" },
});
