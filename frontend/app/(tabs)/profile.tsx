import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as t, palette } from "../../src/theme";
import { useAuthStore } from "../../src/auth";

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: async () => {
        await logout();
        router.replace("/(auth)/login");
      }},
    ]);
  };

  const Row = ({ icon, label, onPress, danger, testID }: any) => (
    <TouchableOpacity testID={testID} style={styles.row} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: danger ? palette.danger + "15" : palette.primary + "10" }]}>
        {icon}
      </View>
      <Text style={[styles.rowLabel, danger && { color: palette.danger }]}>{label}</Text>
      {!danger && <Feather name="chevron-right" size={18} color={t.textSecondary} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="profile-screen">
      <View style={styles.topBar}><Text style={styles.h1}>Profile</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={styles.userCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.name || "?").slice(0, 1).toUpperCase()}</Text></View>
          <Text style={styles.name}>{user?.name || "—"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{(user?.role || "pilot").toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Subscription</Text>
        <View style={styles.planCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTier}>{(user?.subscription_tier || "free").toUpperCase()}</Text>
            <Text style={styles.planSub}>Free plan · 2 custom checklists, unlimited history</Text>
          </View>
          <TouchableOpacity testID="profile-upgrade-btn" style={styles.upgradeBtn} onPress={() => Alert.alert("Subscriptions", "Subscriptions arrive in v2 with weekly/monthly/yearly tiers.")}>
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuCard}>
          <Row testID="profile-my-checklists" icon={<Feather name="list" size={18} color={palette.primary} />} label="My checklists" onPress={() => router.push("/(tabs)/history")} />
          <Row testID="profile-settings" icon={<Feather name="settings" size={18} color={palette.primary} />} label="Settings (units, language)" onPress={() => Alert.alert("Settings", "Customisable units, language and biometric login arrive in v2.")} />
          <Row testID="profile-logout" icon={<Feather name="log-out" size={18} color={palette.danger} />} label="Log out" danger onPress={confirmLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 24, fontWeight: "700", color: t.text },
  userCard: { alignItems: "center", padding: 24, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: palette.white, fontWeight: "700", fontSize: 28 },
  name: { fontSize: 20, fontWeight: "700", color: t.text, marginTop: 12 },
  email: { fontSize: 13, color: t.textSecondary, marginTop: 2 },
  roleBadge: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: palette.primary + "15" },
  roleText: { color: palette.primary, fontWeight: "700", fontSize: 11, letterSpacing: 0.5 },
  sectionLabel: { fontSize: 12, color: t.textSecondary, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 24, marginBottom: 8 },
  planCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border },
  planTier: { fontSize: 16, fontWeight: "700", color: t.text },
  planSub: { fontSize: 12, color: t.textSecondary, marginTop: 4 },
  upgradeBtn: { backgroundColor: palette.secondary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  upgradeText: { color: palette.white, fontWeight: "700", fontSize: 13 },
  menuCard: { borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: t.border },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 14, color: t.text, fontWeight: "500" },
});
