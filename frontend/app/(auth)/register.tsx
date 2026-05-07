import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t } from "../../src/theme";
import { useAuthStore } from "../../src/auth";
import { formatApiError } from "../../src/api";

export default function Register() {
  const router = useRouter();
  const reg = useAuthStore((s) => s.register);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!email || !password || !name) {
      setErr("Please fill all fields");
      return;
    }
    setBusy(true);
    try {
      await reg(email.trim(), password, name.trim());
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={28} color={t.text} />
          </TouchableOpacity>
          <Text style={styles.h1}>Create account</Text>
          <Text style={styles.sub}>Get started with FlyReady — free</Text>

          <Text style={styles.label}>Full name</Text>
          <TextInput testID="register-name-input" style={styles.input} value={name} onChangeText={setName} placeholder="Jane Pilot" placeholderTextColor={t.textSecondary} />

          <Text style={styles.label}>Email</Text>
          <TextInput testID="register-email-input" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" placeholderTextColor={t.textSecondary} />

          <Text style={styles.label}>Password</Text>
          <TextInput testID="register-password-input" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" placeholderTextColor={t.textSecondary} />

          {err && <Text testID="register-error" style={styles.err}>{err}</Text>}

          <TouchableOpacity testID="register-submit-btn" disabled={busy} style={[styles.cta, busy && { opacity: 0.6 }]} onPress={submit}>
            <Text style={styles.ctaText}>{busy ? "Creating account…" : "Create account"}</Text>
            <Ionicons name="arrow-forward" size={20} color={palette.white} />
          </TouchableOpacity>

          <TouchableOpacity testID="register-go-login" onPress={() => router.replace("/(auth)/login")} style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? <Text style={{ color: palette.primary, fontWeight: "700" }}>Log in</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  content: { padding: 24 },
  back: { width: 36, height: 36, alignItems: "flex-start", justifyContent: "center", marginBottom: 8 },
  h1: { fontSize: 28, fontWeight: "700", color: t.text, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: t.textSecondary, marginTop: 4, marginBottom: 8 },
  label: { fontSize: 12, color: t.textSecondary, marginTop: 16, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "600" },
  input: { height: 48, backgroundColor: t.surface, borderRadius: 8, borderWidth: 0.5, borderColor: t.border, paddingHorizontal: 16, fontSize: 16, color: t.text },
  cta: { marginTop: 24, backgroundColor: palette.primary, height: 52, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText: { color: palette.white, fontSize: 16, fontWeight: "600" },
  err: { color: palette.danger, marginTop: 12, fontSize: 13 },
  linkRow: { alignItems: "center", marginTop: 24 },
  linkText: { color: t.textSecondary, fontSize: 14 },
});
