import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "../../src/theme";
import { useAppTheme } from "../../src/themeContext";
import { useAuthStore } from "../../src/auth";

const APP_VERSION = "1.0.0";

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isDark, setMode, theme: t } = useAppTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace("/(auth)/login");
  };

  const toggleDark = (v: boolean) => {
    setMode(v ? "dark" : "light");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={["top"]} testID="profile-screen">

      {/* Logout confirmation modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: t.surface }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>Log out</Text>
            <Text style={[styles.modalMsg, { color: t.textSecondary }]}>Are you sure you want to log out of FlyReady?</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                testID="cancel-logout-btn"
                style={[styles.modalCancel, { borderColor: t.border }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: t.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="confirm-logout-btn"
                style={styles.modalConfirm}
                onPress={handleLogout}
              >
                <Text style={styles.modalConfirmText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About modal */}
      <Modal visible={showAboutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: t.surface }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>About FlyReady</Text>
            <Text style={[styles.modalMsg, { color: t.textSecondary }]}>
              FlyReady is a free & open source drone preflight checklist app for pilots.
              {"\n\n"}Version {APP_VERSION}
              {"\n\n"}All features are free — no subscriptions, no ads.
            </Text>
            <TouchableOpacity
              style={[styles.modalConfirm, { backgroundColor: palette.primary, flex: 0, width: "100%" }]}
              onPress={() => setShowAboutModal(false)}
              testID="about-close-btn"
            >
              <Text style={styles.modalConfirmText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.topBar, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <Text style={[styles.h1, { color: t.text }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "?").slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={[styles.name, { color: t.text }]}>{user?.name || "—"}</Text>
          <Text style={[styles.email, { color: t.textSecondary }]}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{(user?.role || "pilot").toUpperCase()}</Text>
          </View>
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Preferences</Text>
        <View style={[styles.menuCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={[styles.row, { borderBottomColor: t.border }]}>
            <View style={[styles.iconBox, { backgroundColor: palette.primary + "15" }]}>
              <Feather name="moon" size={18} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: t.text }]}>Dark mode</Text>
              <Text style={[styles.rowSub, { color: t.textSecondary }]}>Save your eyes at night</Text>
            </View>
            <Switch
              testID="dark-mode-switch"
              value={isDark}
              onValueChange={toggleDark}
              thumbColor={isDark ? palette.primary : "#fff"}
              trackColor={{ false: "#ccc", true: palette.primary + "80" }}
            />
          </View>
        </View>

        {/* Account menu */}
        <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Account</Text>
        <View style={[styles.menuCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <TouchableOpacity
            testID="profile-my-checklists"
            style={[styles.row, { borderBottomColor: t.border }]}
            onPress={() => router.push("/(tabs)/history")}
          >
            <View style={[styles.iconBox, { backgroundColor: palette.primary + "15" }]}>
              <Feather name="list" size={18} color={palette.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: t.text }]}>My flight history</Text>
            <Feather name="chevron-right" size={18} color={t.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="profile-about"
            style={[styles.row, { borderBottomColor: t.border }]}
            onPress={() => setShowAboutModal(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: palette.primary + "15" }]}>
              <Feather name="info" size={18} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: t.text }]}>About FlyReady</Text>
              <Text style={[styles.rowSub, { color: t.textSecondary }]}>v{APP_VERSION}</Text>
            </View>
            <View testID="profile-free-badge" style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>Free & open source</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            testID="profile-logout"
            style={styles.row}
            onPress={() => setShowLogoutModal(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: palette.danger + "15" }]}>
              <Feather name="log-out" size={18} color={palette.danger} />
            </View>
            <Text style={[styles.rowLabel, { color: palette.danger }]}>Log out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { padding: 16, borderBottomWidth: 0.5 },
  h1: { fontSize: 24, fontWeight: "700" },
  userCard: { alignItems: "center", padding: 24, borderRadius: 12, borderWidth: 0.5 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 28 },
  name: { fontSize: 20, fontWeight: "700", marginTop: 12 },
  email: { fontSize: 13, marginTop: 2 },
  roleBadge: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: palette.primary + "15" },
  roleText: { color: palette.primary, fontWeight: "700", fontSize: 11, letterSpacing: 0.5 },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 24, marginBottom: 8 },
  menuCard: { borderRadius: 12, borderWidth: 0.5, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  rowSub: { fontSize: 11, marginTop: 2 },
  freeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: palette.success + "20" },
  freeBadgeText: { color: palette.success, fontWeight: "700", fontSize: 10, letterSpacing: 0.3 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modalBox: { borderRadius: 16, padding: 24, width: 320, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalMsg: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
  modalConfirm: { flex: 1, height: 44, borderRadius: 10, backgroundColor: palette.danger, alignItems: "center", justifyContent: "center" },
  modalConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
