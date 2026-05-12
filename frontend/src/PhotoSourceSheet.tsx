import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { palette, lightTheme as t } from "./theme";

export type PickedImage = { dataUrl: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  onPicked: (img: PickedImage) => void;
  quality?: number;
  title?: string;
};

export function PhotoSourceSheet({ visible, onClose, onPicked, quality = 0.5, title = "Add photo" }: Props) {
  const [busy, setBusy] = useState(false);

  const fromCamera = async () => {
    if (Platform.OS === "web") {
      onClose();
      return;
    }
    setBusy(true);
    try {
      const ImagePicker = await import("expo-image-picker");
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") { onClose(); return; }
      const r = await ImagePicker.launchCameraAsync({ base64: true, quality, allowsEditing: false });
      if (!r.canceled && r.assets?.[0]?.base64) {
        onPicked({ dataUrl: `data:image/jpeg;base64,${r.assets[0].base64}` });
      }
    } catch {}
    finally { setBusy(false); onClose(); }
  };

  const fromGallery = async () => {
    setBusy(true);
    try {
      if (Platform.OS === "web") {
        // Web file picker
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (!file) { setBusy(false); onClose(); return; }
          const reader = new FileReader();
          reader.onload = (ev) => {
            onPicked({ dataUrl: ev.target?.result as string });
            setBusy(false);
            onClose();
          };
          reader.readAsDataURL(file);
        };
        input.click();
        return;
      }
      const ImagePicker = await import("expo-image-picker");
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") { onClose(); return; }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true, quality, allowsEditing: false,
      });
      if (!r.canceled && r.assets?.[0]?.base64) {
        onPicked({ dataUrl: `data:image/jpeg;base64,${r.assets[0].base64}` });
      }
    } catch {}
    finally { setBusy(false); onClose(); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {Platform.OS !== "web" && (
            <TouchableOpacity testID="photo-source-camera" disabled={busy} style={styles.row} onPress={fromCamera}>
              <View style={styles.iconBox}><Feather name="camera" size={22} color={palette.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Take a photo</Text>
                <Text style={styles.rowSub}>Use the camera</Text>
              </View>
              <Feather name="chevron-right" size={20} color={t.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity testID="photo-source-gallery" disabled={busy} style={styles.row} onPress={fromGallery}>
            <View style={styles.iconBox}><Feather name="image" size={22} color={palette.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{Platform.OS === "web" ? "Choose file" : "Choose from gallery"}</Text>
              <Text style={styles.rowSub}>Pick an existing photo</Text>
            </View>
            <Feather name="chevron-right" size={20} color={t.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity testID="photo-source-cancel" style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: Platform.OS === "ios" ? 32 : 24 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "700", color: t.text, marginBottom: 12, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary + "15" },
  rowTitle: { color: t.text, fontSize: 15, fontWeight: "600" },
  rowSub: { color: t.textSecondary, fontSize: 12, marginTop: 2 },
  cancelBtn: { marginTop: 8, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: t.background },
  cancelText: { color: palette.danger, fontWeight: "700", fontSize: 14 },
});
