import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Image, Modal, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t, droneTypeLabel } from "../../src/theme";
import { api, formatApiError } from "../../src/api";

type Method = "built_in" | "pdf_upload" | "photo_upload" | "voice" | "manual";
type DroneType = "multirotor" | "fixed_wing" | "heavy_lift" | "vtol" | "custom";
type Phase = "preflight" | "inflight" | "postflight";

const TEMPLATES: Record<string, { name: string; type: DroneType; phase: Phase; items: string[] }> = {
  multirotor_pre: {
    name: "Multirotor — Preflight", type: "multirotor", phase: "preflight",
    items: [
      "Pilot licence and authorizations — valid",
      "Airframe — inspect for cracks or damage",
      "Arms — all locked and secured",
      "Propellers — inspect for chips or cracks",
      "Propellers — all secured and torqued",
      "Motors — no obstructions, spin freely",
      "Battery — fully charged and secured",
      "Battery voltage — within limits",
      "Flight controller — powered on, no errors",
      "GPS — minimum 8 satellites acquired",
      "Compass — calibrated, no interference",
      "Remote controller — charged and linked",
      "Return to home altitude — configured",
      "Failsafe — battery RTL configured",
      "Flight area — clear of bystanders",
      "Weather — wind within limits",
      "Airspace — authorization confirmed",
      "Pre-arm checks — all passed",
    ],
  },
  multirotor_post: {
    name: "Multirotor — Post-flight", type: "multirotor", phase: "postflight",
    items: [
      "Landing — confirmed safe and stable",
      "Motors disarmed — stopped before approach",
      "Battery removed — powered down safely",
      "Battery — inspect for swelling or damage",
      "Battery — log cycle count",
      "Airframe — post-flight inspection",
      "Propellers — inspect for damage",
      "Motors — check for heat or damage",
      "Footage — backed up",
      "Flight log — completed and saved",
    ],
  },
  fixed_wing_pre: {
    name: "Fixed Wing — Preflight", type: "fixed_wing", phase: "preflight",
    items: [
      "Pilot licence and authorizations — valid",
      "Fuselage — inspect for damage",
      "Wings — inspect skin and attachment",
      "Ailerons — correct direction, full travel",
      "Elevator — correct direction, full travel",
      "Rudder — correct direction, full travel",
      "Motor — secured, clear of debris",
      "Propeller — inspected and secured",
      "Battery — sufficient for mission",
      "GPS — 8 satellites acquired",
      "Pitot tube — clear and unobstructed",
      "Airspeed sensor — reading correctly",
      "Failsafe — RTL configured",
      "Launch area — clear of obstacles",
      "Wind speed — within fixed wing limits",
    ],
  },
  vtol_pre: {
    name: "VTOL — Preflight", type: "vtol", phase: "preflight",
    items: [
      "Pilot licence and VTOL endorsement — valid",
      "Fuselage — inspect for damage",
      "Wings — inspect attachment",
      "VTOL motor arms — all locked",
      "VTOL propellers — inspected and torqued",
      "VTOL motors — spin freely",
      "Forward propeller — inspected and secured",
      "Ailerons, elevator, rudder — full travel",
      "Battery — fully charged, secured",
      "GPS — 8 satellites, compass calibrated",
      "Airspeed sensor — reading correctly",
      "VTOL hover mode — tested and stable",
      "Transition airspeed — configured",
      "Failsafe — RTL with VTOL landing",
      "Airspace — clear for full mission",
      "Pre-arm checks — all passed",
    ],
  },
  heavy_lift_pre: {
    name: "Heavy Lift — Preflight", type: "heavy_lift", phase: "preflight",
    items: [
      "Pilot licence and authorizations — valid",
      "Airframe — inspect for cracks or damage",
      "Extended arm locks — all checked and locked",
      "Propellers — inspect and torque all",
      "Motors — no obstructions, spin freely",
      "Payload weight — within MTOW limits",
      "Payload CG — checked and balanced",
      "Payload quick release — tested and secured",
      "All batteries — charged and balanced",
      "Power distribution — connections secure",
      "GPS — minimum 8 satellites",
      "Telemetry — dual link confirmed",
      "Return to home — configured",
      "Flight area — clear of bystanders",
      "Pre-arm checks — all passed",
    ],
  },
};

export default function NewChecklist() {
  const router = useRouter();
  const [step, setStep] = useState<number | "templates" | "pdf" | "photo" | "voice">(1);
  const [method, setMethod] = useState<Method | null>(null);
  const [name, setName] = useState("");
  const [droneType, setDroneType] = useState<DroneType>("multirotor");
  const [phase, setPhase] = useState<Phase>("preflight");
  const [photo, setPhoto] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<string | null>(null);

  // PDF upload state
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const fileInputRef = useRef<any>(null);

  // Photo upload state
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<any>(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceItems, setVoiceItems] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  const updateItem = (idx: number, v: string) => {
    const next = [...items]; next[idx] = v; setItems(next);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const addItem = () => setItems([...items, ""]);

  const chooseTemplate = (key: string) => {
    const tpl = TEMPLATES[key];
    setName(tpl.name); setDroneType(tpl.type); setPhase(tpl.phase);
    setItems(tpl.items); setMethod("built_in"); setStep(2);
  };

  const save = async () => {
    if (!name.trim()) { setModal("Please enter a checklist name."); return; }
    const validItems = items.filter((i) => i.trim());
    if (!validItems.length) { setModal("Add at least one checklist item."); return; }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(), drone_type: droneType, phase,
        source: method || "manual",
        items: validItems.map((label, idx) => ({ label: label.trim(), order_index: idx, is_required: true })),
        drone_photo_url: photo || null,
      };
      const { data } = await api.post("/checklists", payload);
      router.replace(`/checklist/${data.id}/qr`);
    } catch (e: any) { setModal(formatApiError(e)); }
    finally { setBusy(false); }
  };

  // ── PDF UPLOAD ──────────────────────────────────────────────────────────────
  const handlePdfFile = async (file: File) => {
    setPdfBusy(true); setPdfError(null);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      const { data } = await api.post("/checklists/parse-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data.items || data.items.length === 0) {
        setPdfError("No checklist items found in this PDF. Try the photo or manual option instead.");
        setPdfBusy(false); return;
      }
      setItems(data.items.map((it: any) => it.label));
      if (!name.trim()) setName(file.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " "));
      setMethod("pdf_upload"); setStep(2);
    } catch (e: any) {
      setPdfError(formatApiError(e) || "Could not read this PDF. Try a different file.");
    } finally { setPdfBusy(false); }
  };

  // ── PHOTO UPLOAD ────────────────────────────────────────────────────────────
  const handlePhotoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedPhoto(e.target?.result as string);
      setMethod("photo_upload");
    };
    reader.readAsDataURL(file);
  };

  // ── VOICE DICTATION ─────────────────────────────────────────────────────────
  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setModal("Voice recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const sentence = event.results[i][0].transcript.trim();
          if (sentence) setVoiceItems((prev) => [...prev, sentence]);
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setVoiceTranscript(interim);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoiceTranscript("");
  };

  const acceptVoiceItems = () => {
    if (!voiceItems.length) { setModal("No items captured yet. Start speaking first."); return; }
    setItems(voiceItems); setMethod("voice"); setStep(2);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Choose method
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 1) return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="new-checklist-screen">
      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalMsg}>{modal}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setModal(null)}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <Text style={styles.h1}>Add checklist</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={styles.sectionLabel}>Choose method</Text>
        {[
          { key: "built_in", icon: "layers-outline", label: "Built-in template", sub: "Multirotor, Fixed wing, VTOL, Heavy lift" },
          { key: "manual", icon: "create-outline", label: "Type manually", sub: "Enter items one by one" },
          { key: "pdf_upload", icon: "document-outline", label: "Upload PDF", sub: "Import from existing PDF checklist" },
          { key: "photo_upload", icon: "camera-outline", label: "Upload photo", sub: "Photograph an existing checklist" },
          { key: "voice", icon: "mic-outline", label: "Voice dictation", sub: "Speak checklist items aloud" },
        ].map((opt) => (
          <TouchableOpacity key={opt.key} testID={`method-${opt.key}`} style={styles.methodCard} onPress={() => {
            if (opt.key === "built_in") { setStep("templates"); return; }
            if (opt.key === "manual") { setMethod("manual"); setItems([""]); setStep(2); return; }
            if (opt.key === "pdf_upload") { setStep("pdf"); return; }
            if (opt.key === "photo_upload") { setStep("photo"); return; }
            if (opt.key === "voice") { setStep("voice"); return; }
          }}>
            <View style={styles.methodIcon}><Ionicons name={opt.icon as any} size={26} color={palette.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodLabel}>{opt.label}</Text>
              <Text style={styles.methodSub}>{opt.sub}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={t.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATES — pick a built-in template
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === "templates") return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setStep(1)}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <Text style={styles.h1}>Choose template</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {Object.entries(TEMPLATES).map(([key, tpl]) => (
          <TouchableOpacity key={key} testID={`template-${key}`} style={styles.methodCard} onPress={() => chooseTemplate(key)}>
            <View style={[styles.methodIcon, { backgroundColor: palette.primary + "15" }]}>
              <MaterialCommunityIcons
                name={tpl.type === "fixed_wing" ? "airplane" : tpl.type === "vtol" ? "airplane-takeoff" : "quadcopter"}
                size={26} color={palette.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodLabel}>{tpl.name}</Text>
              <Text style={styles.methodSub}>{tpl.items.length} items · {tpl.phase}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={t.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF UPLOAD — its own dedicated page
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === "pdf") return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalMsg}>{modal}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setModal(null)}><Text style={styles.modalBtnText}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { setPdfError(null); setStep(1); }}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <Text style={styles.h1}>Upload PDF</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: "center", gap: 16 }}>
        <View style={styles.bigIcon}>
          <Ionicons name="document-outline" size={56} color={palette.primary} />
        </View>
        <Text style={styles.stepTitle}>Import from PDF</Text>
        <Text style={styles.stepDesc}>
          Upload your drone manufacturer's checklist PDF. FlyReady will automatically
          extract all checklist items and create a tickable digital version for you.
          {"\n\n"}Works best with text-based PDFs (not scanned images).
        </Text>

        {pdfError && (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={16} color={palette.danger} />
            <Text style={styles.errorText}>{pdfError}</Text>
          </View>
        )}

        {pdfBusy ? (
          <View style={styles.busyCard}>
            <ActivityIndicator color={palette.primary} size="large" />
            <Text style={{ color: t.textSecondary, marginTop: 12 }}>Reading your PDF…</Text>
          </View>
        ) : (
          <>
            {/* Web file picker */}
            {Platform.OS === "web" && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); }}
                />
                <TouchableOpacity style={styles.uploadBtn} onPress={() => fileInputRef.current?.click()}>
                  <Ionicons name="cloud-upload-outline" size={22} color={palette.white} />
                  <Text style={styles.uploadBtnText}>Choose PDF file</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Mobile — expo-document-picker */}
            {Platform.OS !== "web" && (
              <TouchableOpacity style={styles.uploadBtn} onPress={async () => {
                setPdfBusy(true); setPdfError(null);
                try {
                  const DocumentPicker = await import("expo-document-picker");
                  const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
                  if (!result.canceled && result.assets?.[0]) {
                    const file = result.assets[0];
                    const resp = await fetch(file.uri);
                    const blob = await resp.blob();
                    const fileObj = new File([blob], file.name || "checklist.pdf", { type: "application/pdf" });
                    await handlePdfFile(fileObj);
                  } else { setPdfBusy(false); }
                } catch (e: any) { setPdfError(e.message || "Could not open file picker."); setPdfBusy(false); }
              }}>
                <Ionicons name="cloud-upload-outline" size={22} color={palette.white} />
                <Text style={styles.uploadBtnText}>Choose PDF file</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <Text style={styles.hint}>
          Supported: any text-based PDF checklist from any drone manufacturer.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHOTO UPLOAD — its own dedicated page
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === "photo") return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalMsg}>{modal}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setModal(null)}><Text style={styles.modalBtnText}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { setUploadedPhoto(null); setStep(1); }}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <Text style={styles.h1}>Upload photo</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        {!uploadedPhoto ? (
          <>
            <View style={[styles.bigIcon, { alignSelf: "center" }]}>
              <Ionicons name="camera-outline" size={56} color={palette.primary} />
            </View>
            <Text style={[styles.stepTitle, { textAlign: "center" }]}>Photograph a checklist</Text>
            <Text style={[styles.stepDesc, { textAlign: "center" }]}>
              Take a photo of your paper checklist or upload an image.
              You'll then type the items you see into the digital checklist below.
            </Text>

            {Platform.OS === "web" && (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); }}
                />
                <TouchableOpacity style={styles.uploadBtn} onPress={() => photoInputRef.current?.click()}>
                  <Ionicons name="image-outline" size={22} color={palette.white} />
                  <Text style={styles.uploadBtnText}>Choose photo</Text>
                </TouchableOpacity>
              </>
            )}

            {Platform.OS !== "web" && (
              <View style={{ gap: 10 }}>
                <TouchableOpacity style={styles.uploadBtn} onPress={async () => {
                  const ImagePicker = await import("expo-image-picker");
                  const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
                  if (!r.canceled && r.assets?.[0]?.base64) {
                    setUploadedPhoto(`data:image/jpeg;base64,${r.assets[0].base64}`);
                    setMethod("photo_upload");
                  }
                }}>
                  <Ionicons name="camera-outline" size={22} color={palette.white} />
                  <Text style={styles.uploadBtnText}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: t.surface, borderWidth: 1, borderColor: palette.primary }]} onPress={async () => {
                  const ImagePicker = await import("expo-image-picker");
                  const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
                  if (!r.canceled && r.assets?.[0]?.base64) {
                    setUploadedPhoto(`data:image/jpeg;base64,${r.assets[0].base64}`);
                    setMethod("photo_upload");
                  }
                }}>
                  <Ionicons name="image-outline" size={22} color={palette.primary} />
                  <Text style={[styles.uploadBtnText, { color: palette.primary }]}>Choose from gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Your photo — type what you see below</Text>
            <Image source={{ uri: uploadedPhoto }} style={styles.previewImg} resizeMode="contain" />
            <TouchableOpacity onPress={() => setUploadedPhoto(null)} style={styles.retakeBtn}>
              <Feather name="refresh-cw" size={16} color={palette.primary} />
              <Text style={{ color: palette.primary, fontWeight: "600" }}>Retake / choose different</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Checklist items — type from photo</Text>
            {items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemNum}><Text style={{ color: palette.primary, fontWeight: "700", fontSize: 12 }}>{idx + 1}</Text></View>
                <TextInput
                  style={styles.itemInput}
                  value={item}
                  onChangeText={(v) => updateItem(idx, v)}
                  placeholder={`Item ${idx + 1} from photo`}
                  placeholderTextColor={t.textSecondary}
                  multiline
                />
                <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 8 }}>
                  <Feather name="trash-2" size={18} color={palette.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
              <Ionicons name="add-circle-outline" size={20} color={palette.primary} />
              <Text style={{ color: palette.primary, fontWeight: "600", fontSize: 14 }}>Add item</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Checklist name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. DJI M300 Preflight" placeholderTextColor={t.textSecondary} />

            <TouchableOpacity
              style={[styles.saveBtn, { marginTop: 16 }, busy && { opacity: 0.6 }]}
              onPress={() => { setPhoto(uploadedPhoto); save(); }}
              disabled={busy}
            >
              <Ionicons name="qr-code-outline" size={20} color={palette.white} />
              <Text style={styles.saveBtnText}>{busy ? "Saving…" : "Save & Generate QR"}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE DICTATION — its own dedicated page
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === "voice") return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalMsg}>{modal}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setModal(null)}><Text style={styles.modalBtnText}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { stopListening(); setVoiceItems([]); setStep(1); }}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <Text style={styles.h1}>Voice dictation</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text style={[styles.stepDesc, { textAlign: "center" }]}>
          Say each checklist item out loud — one sentence at a time.
          Pause briefly between items. FlyReady captures each sentence as a separate checklist item.
        </Text>

        {/* Big mic button */}
        <TouchableOpacity
          style={[styles.micBtn, isListening && { backgroundColor: palette.danger }]}
          onPress={isListening ? stopListening : startListening}
        >
          <Ionicons name={isListening ? "stop" : "mic"} size={40} color={palette.white} />
          <Text style={styles.micBtnText}>{isListening ? "Tap to stop" : "Tap to start"}</Text>
        </TouchableOpacity>

        {isListening && voiceTranscript ? (
          <View style={styles.transcriptBox}>
            <Text style={{ color: t.textSecondary, fontSize: 13 }}>Hearing: {voiceTranscript}</Text>
          </View>
        ) : null}

        {voiceItems.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Captured items ({voiceItems.length})</Text>
            {voiceItems.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemNum}><Text style={{ color: palette.primary, fontWeight: "700", fontSize: 12 }}>{idx + 1}</Text></View>
                <TextInput
                  style={styles.itemInput}
                  value={item}
                  onChangeText={(v) => {
                    const next = [...voiceItems]; next[idx] = v; setVoiceItems(next);
                  }}
                  multiline
                />
                <TouchableOpacity onPress={() => setVoiceItems(voiceItems.filter((_, i) => i !== idx))} style={{ padding: 8 }}>
                  <Feather name="trash-2" size={18} color={palette.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addItemBtn} onPress={() => setVoiceItems([...voiceItems, ""])}>
              <Ionicons name="add-circle-outline" size={20} color={palette.primary} />
              <Text style={{ color: palette.primary, fontWeight: "600", fontSize: 14 }}>Add item manually</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.uploadBtn, { marginTop: 8 }]} onPress={acceptVoiceItems}>
              <Ionicons name="checkmark-circle-outline" size={22} color={palette.white} />
              <Text style={styles.uploadBtnText}>Use these items →</Text>
            </TouchableOpacity>
          </>
        )}

        {!isListening && voiceItems.length === 0 && (
          <Text style={styles.hint}>
            Works in Chrome and Edge browsers. On mobile, use the app with microphone permission granted.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Details + edit items (manual, built-in, and post-PDF/voice flow)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalMsg}>{modal}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setModal(null)}><Text style={styles.modalBtnText}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setStep(1)}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <Text style={styles.h1}>Checklist details</Text>
        <View style={{ width: 28 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

          {method === "pdf_upload" && (
            <View style={styles.importBanner}>
              <Feather name="check-circle" size={15} color={palette.success} />
              <Text style={styles.importBannerText}>{items.filter(i => i.trim()).length} items imported from PDF — review and edit below</Text>
            </View>
          )}
          {method === "voice" && (
            <View style={styles.importBanner}>
              <Feather name="mic" size={15} color={palette.success} />
              <Text style={styles.importBannerText}>{items.filter(i => i.trim()).length} items from voice — review and edit below</Text>
            </View>
          )}

          <Text style={styles.label}>Checklist name *</Text>
          <TextInput testID="checklist-name-input" style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Multirotor Preflight" placeholderTextColor={t.textSecondary} />

          <Text style={styles.label}>Drone type</Text>
          <View style={styles.segRow}>
            {(["multirotor", "fixed_wing", "heavy_lift", "vtol", "custom"] as DroneType[]).map((dt) => (
              <TouchableOpacity key={dt} style={[styles.seg, droneType === dt && styles.segActive]} onPress={() => setDroneType(dt)}>
                <Text style={[styles.segText, droneType === dt && styles.segTextActive]}>{droneTypeLabel(dt)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Phase</Text>
          <View style={styles.segRow}>
            {(["preflight", "inflight", "postflight"] as Phase[]).map((p) => (
              <TouchableOpacity key={p} style={[styles.seg, phase === p && styles.segActive]} onPress={() => setPhase(p)}>
                <Text style={[styles.segText, phase === p && styles.segTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Drone photo (optional)</Text>
          <TouchableOpacity testID="photo-pick-btn" style={styles.photoPick} onPress={async () => {
            if (Platform.OS === "web") {
              const input = document.createElement("input");
              input.type = "file"; input.accept = "image/*";
              input.onchange = (e: any) => {
                const file = e.target.files?.[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setPhoto(ev.target?.result as string);
                reader.readAsDataURL(file);
              };
              input.click(); return;
            }
            const ImagePicker = await import("expo-image-picker");
            const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });
            if (!r.canceled && r.assets?.[0]?.base64) setPhoto(`data:image/jpeg;base64,${r.assets[0].base64}`);
          }}>
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: "100%", height: "100%", borderRadius: 10 }} />
            ) : (
              <View style={{ alignItems: "center", gap: 6 }}>
                <Feather name="camera" size={28} color={t.textSecondary} />
                <Text style={{ color: t.textSecondary, fontSize: 13 }}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 8 }}>
            <Text style={styles.label}>Checklist items *</Text>
            <Text style={{ fontSize: 12, color: t.textSecondary }}>{items.filter(i => i.trim()).length} items</Text>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemNum}><Text style={{ color: palette.primary, fontWeight: "700", fontSize: 12 }}>{idx + 1}</Text></View>
              <TextInput
                testID={`item-input-${idx}`}
                style={styles.itemInput}
                value={item}
                onChangeText={(v) => updateItem(idx, v)}
                placeholder={`Item ${idx + 1}`}
                placeholderTextColor={t.textSecondary}
                multiline
              />
              <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 8 }}>
                <Feather name="trash-2" size={18} color={palette.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity testID="add-item-btn" style={styles.addItemBtn} onPress={addItem}>
            <Ionicons name="add-circle-outline" size={20} color={palette.primary} />
            <Text style={{ color: palette.primary, fontWeight: "600", fontSize: 14 }}>Add item</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity testID="save-checklist-btn" style={[styles.saveBtn, busy && { opacity: 0.6 }]} onPress={save} disabled={busy}>
          <Ionicons name="qr-code-outline" size={20} color={palette.white} />
          <Text style={styles.saveBtnText}>{busy ? "Saving…" : "Save & Generate QR"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 18, fontWeight: "700", color: t.text },
  sectionLabel: { fontSize: 12, color: t.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  methodCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border },
  methodIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: palette.primary + "15", alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 15, fontWeight: "700", color: t.text },
  methodSub: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  label: { fontSize: 12, color: t.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: t.surface, borderRadius: 10, borderWidth: 0.5, borderColor: t.border, padding: 12, fontSize: 15, color: t.text },
  segRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  seg: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  segActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  segText: { fontSize: 12, color: t.text, fontWeight: "600" },
  segTextActive: { color: palette.white },
  photoPick: { height: 100, borderRadius: 10, borderWidth: 1, borderColor: t.border, borderStyle: "dashed", backgroundColor: t.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  itemNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.primary + "15", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemInput: { flex: 1, backgroundColor: t.surface, borderRadius: 8, borderWidth: 0.5, borderColor: t.border, padding: 10, fontSize: 14, color: t.text },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: palette.primary, borderStyle: "dashed", justifyContent: "center", marginTop: 4 },
  footer: { padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 52, borderRadius: 12, backgroundColor: palette.primary },
  saveBtnText: { color: palette.white, fontWeight: "700", fontSize: 16 },
  // dedicated-page styles
  bigIcon: { width: 120, height: 120, borderRadius: 24, backgroundColor: palette.primary + "12", alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 22, fontWeight: "700", color: t.text },
  stepDesc: { fontSize: 14, color: t.textSecondary, lineHeight: 22 },
  uploadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 52, borderRadius: 12, backgroundColor: palette.primary, width: "100%" },
  uploadBtnText: { color: palette.white, fontWeight: "700", fontSize: 15 },
  hint: { fontSize: 12, color: t.textSecondary, textAlign: "center", lineHeight: 18 },
  errorCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: palette.danger + "12", padding: 12, borderRadius: 10, width: "100%" },
  errorText: { color: palette.danger, fontSize: 13, flex: 1 },
  busyCard: { alignItems: "center", padding: 32 },
  importBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: palette.success + "15", padding: 12, borderRadius: 10, marginBottom: 16 },
  importBannerText: { color: palette.success, fontSize: 13, fontWeight: "600", flex: 1 },
  previewImg: { width: "100%", height: 240, borderRadius: 10, backgroundColor: t.border },
  retakeBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center" },
  micBtn: { width: 140, height: 140, borderRadius: 70, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "center" },
  micBtnText: { color: palette.white, fontWeight: "700", fontSize: 13 },
  transcriptBox: { backgroundColor: t.surface, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: t.border },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 24, width: 300 },
  modalMsg: { fontSize: 14, color: t.textSecondary, lineHeight: 22, marginBottom: 20 },
  modalBtn: { height: 44, borderRadius: 10, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
