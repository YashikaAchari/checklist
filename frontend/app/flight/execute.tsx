import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, lightTheme as t } from "../../src/theme";
import { useFlightDraft } from "../../src/flightDraft";

export default function Execute() {
  const router = useRouter();
  const draft = useFlightDraft();
  const cl = draft.checklist;
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<Date | null>(null);
  const interval = useRef<any>(null);
  const [modal, setModal] = useState<{ title: string; msg: string; onConfirm?: () => void } | null>(null);

  useEffect(() => { if (!cl) router.replace("/(tabs)/home"); }, []);

  useEffect(() => {
    if (running) {
      interval.current = setInterval(() => {
        if (startedAt.current) setElapsed(Math.floor((Date.now() - startedAt.current.getTime()) / 1000));
      }, 1000);
    } else if (interval.current) { clearInterval(interval.current); }
    return () => clearInterval(interval.current);
  }, [running]);

  const items: any[] = cl?.items || [];

  const counts = useMemo(() => {
    let p = 0, f = 0, e = 0;
    items.forEach((it) => {
      const s = draft.executions[it.id]?.state || "empty";
      if (s === "pass") p++; else if (s === "fail") f++; else e++;
    });
    return { p, f, e };
  }, [items, draft.executions]);

  if (!cl) return null;

  const pct = items.length ? Math.round(((counts.p + counts.f) / items.length) * 100) : 0;
  const allDone = counts.e === 0 && items.length > 0;
  const hasFails = counts.f > 0;

  const haptic = () => {
    if (Platform.OS !== "web") {
      import("expo-haptics").then((H) => H.impactAsync(H.ImpactFeedbackStyle.Light)).catch(() => {});
    }
  };

  const toggle = (id: string, state: "pass" | "fail") => {
    haptic();
    const cur = draft.executions[id]?.state || "empty";
    draft.setExecution(id, cur === state ? "empty" : state);
  };

  const startOrStop = () => {
    if (!running) {
      startedAt.current = new Date();
      draft.patch({ flight_start_time: startedAt.current.toISOString() });
      setRunning(true);
    } else {
      const end = new Date();
      const seconds = startedAt.current ? Math.floor((end.getTime() - startedAt.current.getTime()) / 1000) : 0;
      draft.patch({ flight_end_time: end.toISOString(), flight_duration_seconds: seconds });
      setRunning(false);
    }
  };

  const complete = () => {
    if (!allDone) {
      setModal({ title: "Items pending", msg: "Please mark every item as pass ✓ or fail ✗ before completing." });
      return;
    }
    if (running) startOrStop();
    if (hasFails) {
      setModal({
        title: "Save with issues?",
        msg: `This flight has ${counts.f} failed item(s). Do you want to continue?`,
        onConfirm: () => { setModal(null); router.push("/flight/summary"); },
      });
    } else {
      router.push("/flight/summary");
    }
  };

  const groups: { heading: string | null; items: any[] }[] = [];
  items.forEach((it) => {
    const h = it.section_heading || null;
    const last = groups[groups.length - 1];
    if (last && last.heading === h) last.items.push(it);
    else groups.push({ heading: h, items: [it] });
  });

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="execute-screen">
      {/* Modal - works on web and mobile */}
      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modal?.title}</Text>
            <Text style={styles.modalMsg}>{modal?.msg}</Text>
            <View style={styles.modalBtns}>
              {modal?.onConfirm && (
                <TouchableOpacity style={styles.modalCancel} onPress={() => setModal(null)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalConfirm, !modal?.onConfirm && { flex: 1 }]}
                onPress={() => { if (modal?.onConfirm) modal.onConfirm(); else setModal(null); }}
              >
                <Text style={styles.modalConfirmText}>{modal?.onConfirm ? "Continue" : "OK"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={t.text} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.h1} numberOfLines={1}>{cl.name}</Text>
          <Text style={styles.sub}>{counts.p + counts.f} of {items.length} items checked</Text>
        </View>
      </View>

      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` as any }]} /></View>

      <View style={styles.statsBar}>
        <TouchableOpacity testID="execute-timer-btn" style={[styles.timerBtn, { backgroundColor: running ? palette.danger : palette.secondary }]} onPress={startOrStop}>
          <Ionicons name={running ? "stop" : "play"} size={18} color={palette.white} />
          <Text style={{ color: palette.white, fontWeight: "700" }}>{running ? "Stop" : "Start"}</Text>
        </TouchableOpacity>
        <Text style={styles.timer}>{fmtTime(running ? elapsed : (draft.flight_duration_seconds || elapsed))}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pill bg={palette.success + "20"} fg={palette.success}>{counts.p} ✓</Pill>
          <Pill bg={palette.danger + "20"} fg={palette.danger}>{counts.f} ✗</Pill>
          <Pill bg={t.border} fg={t.textSecondary}>{counts.e} •</Pill>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {groups.map((g, gi) => (
          <View key={gi}>
            {g.heading && <Text style={styles.section}>{g.heading}</Text>}
            {g.items.map((it: any) => {
              const state = draft.executions[it.id]?.state || "empty";
              return (
                <View key={it.id} testID={`exec-item-${it.id}`} style={[styles.itemCard, state === "fail" && { borderColor: palette.danger }]}>
                  <View style={styles.itemRow}>
                    <TouchableOpacity testID={`exec-pass-${it.id}`} style={[styles.iconBtn, state === "pass" ? { backgroundColor: palette.success, borderColor: palette.success } : { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => toggle(it.id, "pass")}>
                      <Feather name="check" size={20} color={state === "pass" ? palette.white : t.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity testID={`exec-fail-${it.id}`} style={[styles.iconBtn, state === "fail" ? { backgroundColor: palette.danger, borderColor: palette.danger } : { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => toggle(it.id, "fail")}>
                      <Feather name="x" size={20} color={state === "fail" ? palette.white : t.textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.itemLabel, state === "pass" && { color: t.textSecondary, textDecorationLine: "line-through" }, state === "fail" && { color: palette.danger }]}>{it.label}</Text>
                    {state === "fail" && <View style={styles.issueBadge}><Text style={{ color: palette.white, fontSize: 10, fontWeight: "700" }}>ISSUE</Text></View>}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        {hasFails && <Text style={styles.warnText}>{counts.f} item(s) flagged as issues</Text>}
        <TouchableOpacity testID="execute-complete-btn" disabled={!allDone} style={[styles.cta, !allDone && { opacity: 0.5 }, hasFails && { backgroundColor: palette.warning }]} onPress={complete}>
          <Text style={styles.ctaText}>{hasFails ? "Save with issues" : "Complete checklist"}</Text>
          {hasFails ? <MaterialCommunityIcons name="alert" size={20} color={palette.white} /> : <Feather name="check" size={20} color={palette.white} />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Pill({ bg, fg, children }: any) {
  return <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: bg }}><Text style={{ color: fg, fontSize: 11, fontWeight: "700" }}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: t.surface },
  h1: { fontSize: 17, fontWeight: "700", color: t.text },
  sub: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  progressTrack: { height: 4, backgroundColor: t.border },
  progressFill: { height: 4, backgroundColor: palette.secondary },
  statsBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, paddingHorizontal: 16, backgroundColor: t.surface, borderBottomWidth: 0.5, borderBottomColor: t.border, gap: 8 },
  timerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  timer: { fontFamily: "monospace", fontSize: 14, color: t.text, fontWeight: "700" },
  section: { fontSize: 13, fontWeight: "700", color: palette.primary, marginTop: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  itemCard: { padding: 12, borderRadius: 10, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.border, marginBottom: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  itemLabel: { flex: 1, fontSize: 14, color: t.text, lineHeight: 20 },
  issueBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: palette.danger },
  bottomBar: { padding: 16, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.surface },
  warnText: { color: palette.warning, fontWeight: "600", textAlign: "center", marginBottom: 8, fontSize: 13 },
  cta: { backgroundColor: palette.primary, height: 52, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText: { color: palette.white, fontSize: 16, fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 24, width: 300, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: t.text, marginBottom: 8 },
  modalMsg: { fontSize: 14, color: t.textSecondary, lineHeight: 22, marginBottom: 20 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: t.text },
  modalConfirm: { flex: 1, height: 44, borderRadius: 10, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  modalConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
