import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { useTimerStore, type PomodoroPhase } from "../store/timerStore";
import { useSettingsStore } from "../store/settingsStore";
import { useTaskStore } from "../store/taskStore";
import { useSaveTaskSession } from "../api/queries/useTaskSessions";
import {
  SESSION_CATEGORY_META,
  type SessionCategory,
} from "../api/queries/useTaskSessions";
import { colors, fontSize, spacing, radius } from "../constants/theme";

type TimerTab = "pomodoro" | "rest" | "stopwatch";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatMinutes(min: number) {
  return min >= 60 ? `${min / 60}h` : `${min}m`;
}

const PHASE_CONFIG: Record<
  PomodoroPhase | "idle",
  { color: string; label: string; emoji: string }
> = {
  work: { color: colors.accent, label: "Focus Time", emoji: "🍅" },
  break: { color: "#007AFF", label: "Short Break", emoji: "☕" },
  "long-break": { color: "#00D084", label: "Long Break", emoji: "🌴" },
  idle: { color: colors.textMuted, label: "Ready", emoji: "⏱" },
};

// ─── Animated ring ────────────────────────────────────────────────────────────

const AnimatedRing = React.memo(function AnimatedRing({
  progress,
  phase,
  display,
  label,
  size = 240,
}: {
  progress: number;
  phase: PomodoroPhase | "idle";
  display: string;
  label: string;
  size?: number;
}) {
  const phaseConf = PHASE_CONFIG[phase];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    if (progress > 0 && progress < 1) anim.start();
    else {
      anim.stop();
      pulseAnim.setValue(1);
    }
    return () => anim.stop();
  }, [progress, pulseAnim]);

  const borderWidth = 4;
  const r = (size - borderWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - Math.min(1, progress));

  return (
    <Animated.View
      style={[
        ringStyles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: phaseConf.color + "30",
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <View
        style={[
          ringStyles.inner,
          {
            width: size - 24,
            height: size - 24,
            borderRadius: (size - 24) / 2,
          },
        ]}
      >
        <Text style={ringStyles.emoji}>{phaseConf.emoji}</Text>
        <Text style={[ringStyles.time, { color: phaseConf.color }]}>
          {display}
        </Text>
        <Text style={ringStyles.phaseLabel}>{label}</Text>
      </View>
      {/* Progress arc approximation using a styled border */}
      <View
        style={[
          ringStyles.progressArc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: borderWidth,
            borderColor: phaseConf.color,
            opacity: 0.15 + progress * 0.85,
          },
        ]}
      />
    </Animated.View>
  );
});

const ringStyles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    position: "relative",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  inner: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  emoji: { fontSize: 28 },
  time: {
    fontFamily: "Outfit_700Bold",
    fontSize: 52,
    letterSpacing: -2,
  },
  phaseLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  progressArc: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});

// ─── Pomodoro panel ───────────────────────────────────────────────────────────

function PomodoroPanel() {
  const {
    isRunning,
    pomodoroPhase,
    pomodoroCycle,
    pomodoroTotalWorkSessions,
    pomodoroConfig,
    getPomodoroProgress,
    getRemainingSeconds,
    startPomodoro,
    nextPomodoroPhase,
    stop,
    setPomodoroConfig,
  } = useTimerStore();

  const saveSession = useSaveTaskSession();
  const setActiveSession = useTaskStore((s) => s.setActiveSession);
  const clearActiveSession = useTaskStore((s) => s.clearActiveSession);

  const [display, setDisplay] = useState(pomodoroConfig.workMinutes * 60);
  const [progress, setProgress] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<SessionCategory>("study");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(getRemainingSeconds());
      return;
    }

    intervalRef.current = setInterval(() => {
      const rem = getRemainingSeconds();
      const prog = getPomodoroProgress();
      setDisplay(rem);
      setProgress(prog);

      if (rem === 0 && !sessionDone) {
        setSessionDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearInterval(intervalRef.current!);

        // Auto-save completed work session
        if (pomodoroPhase === "work") {
          saveSession.mutate({
            category: selectedCategory,
            durationMinutes: pomodoroConfig.workMinutes,
          });
        }
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, pomodoroPhase, sessionDone]);

  const handleStart = useCallback(async () => {
    setSessionDone(false);
    await startPomodoro();
    setActiveSession({
      label: `🍅 Pomodoro — ${SESSION_CATEGORY_META[selectedCategory].label}`,
    });
    setDisplay(pomodoroConfig.workMinutes * 60);
    setProgress(0);
  }, [startPomodoro, selectedCategory, pomodoroConfig, setActiveSession]);

  const handleNext = useCallback(async () => {
    setSessionDone(false);
    await nextPomodoroPhase();
    setDisplay(
      pomodoroPhase === "work"
        ? (pomodoroTotalWorkSessions + 1) % pomodoroConfig.cyclesBeforeLong ===
          0
          ? pomodoroConfig.longBreakMinutes * 60
          : pomodoroConfig.breakMinutes * 60
        : pomodoroConfig.workMinutes * 60,
    );
    setProgress(0);
  }, [
    nextPomodoroPhase,
    pomodoroPhase,
    pomodoroTotalWorkSessions,
    pomodoroConfig,
  ]);

  const handleStop = useCallback(async () => {
    await stop();
    clearActiveSession();
    setDisplay(pomodoroConfig.workMinutes * 60);
    setProgress(0);
    setSessionDone(false);
  }, [stop, clearActiveSession, pomodoroConfig]);

  const phaseDone = display === 0;
  const phaseConf = PHASE_CONFIG[pomodoroPhase];

  return (
    <View style={styles.panelContent}>
      {/* Cycle dots */}
      <View style={styles.cycleDots}>
        {Array.from({ length: pomodoroConfig.cyclesBeforeLong }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.cycleDot,
              i < pomodoroCycle - 1 && styles.cycleDotDone,
              i === pomodoroCycle - 1 && isRunning && styles.cycleDotActive,
            ]}
          />
        ))}
        <Text style={styles.cycleLabel}>
          Cycle {pomodoroCycle} · {pomodoroTotalWorkSessions} sessions done
        </Text>
      </View>

      {/* Ring */}
      <AnimatedRing
        progress={progress}
        phase={isRunning ? pomodoroPhase : "idle"}
        display={formatTime(display)}
        label={isRunning ? phaseConf.label : "Ready"}
      />

      {/* Config (shown when idle) */}
      {!isRunning && (
        <>
          <Card style={styles.configCard}>
            <Text style={styles.configTitle}>Pomodoro Settings</Text>
            {[
              { label: "Work", key: "workMinutes" as const, emoji: "🍅" },
              { label: "Break", key: "breakMinutes" as const, emoji: "☕" },
              {
                label: "Long Break",
                key: "longBreakMinutes" as const,
                emoji: "🌴",
              },
            ].map((f) => (
              <View key={f.key} style={styles.configRow}>
                <Text style={styles.configEmoji}>{f.emoji}</Text>
                <Text style={styles.configLabel}>{f.label}</Text>
                <View style={styles.configStepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() =>
                      setPomodoroConfig({
                        [f.key]: Math.max(1, pomodoroConfig[f.key] - 5),
                      })
                    }
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>
                    {formatMinutes(pomodoroConfig[f.key])}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() =>
                      setPomodoroConfig({ [f.key]: pomodoroConfig[f.key] + 5 })
                    }
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Card>

          {/* Category selector */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionLabel}>Logging as</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryRow}>
                {(
                  Object.entries(SESSION_CATEGORY_META) as [
                    SessionCategory,
                    (typeof SESSION_CATEGORY_META)[SessionCategory],
                  ][]
                ).map(([key, meta]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryChip,
                      selectedCategory === key && {
                        borderColor: meta.color,
                        backgroundColor: meta.color + "15",
                      },
                    ]}
                    onPress={() => setSelectedCategory(key)}
                  >
                    <Text style={styles.catEmoji}>{meta.icon}</Text>
                    <Text
                      style={[
                        styles.catLabel,
                        selectedCategory === key && { color: meta.color },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}

      {/* Phase done banner */}
      {phaseDone && isRunning && (
        <Card accent style={styles.phaseDoneBanner}>
          <Text style={styles.phaseDoneText}>
            {pomodoroPhase === "work"
              ? "🎉 Session Complete!"
              : "⚡ Break over!"}
          </Text>
          <Text style={styles.phaseDoneSub}>
            {pomodoroPhase === "work"
              ? `${pomodoroConfig.workMinutes}m logged as ${SESSION_CATEGORY_META[selectedCategory].label}`
              : "Ready for your next focus session"}
          </Text>
        </Card>
      )}

      {/* Controls */}
      <View style={styles.controlsRow}>
        {!isRunning ? (
          <Button
            label="▶  Start Pomodoro"
            size="lg"
            fullWidth
            onPress={handleStart}
          />
        ) : phaseDone ? (
          <View style={styles.doneControls}>
            <Button
              label="→ Next Phase"
              size="lg"
              style={{ flex: 1 }}
              onPress={handleNext}
            />
            <Button
              label="Stop"
              size="lg"
              variant="danger"
              style={{ flex: 0, paddingHorizontal: spacing["2xl"] }}
              onPress={handleStop}
            />
          </View>
        ) : (
          <View style={styles.doneControls}>
            <Button
              label="⏸  Pause & Save"
              size="lg"
              variant="outline"
              style={{ flex: 1 }}
              onPress={async () => {
                const elapsed = Math.floor(
                  pomodoroConfig.workMinutes - getRemainingSeconds() / 60,
                );
                if (pomodoroPhase === "work" && elapsed >= 1) {
                  saveSession.mutate({
                    category: selectedCategory,
                    durationMinutes: elapsed,
                  });
                }
                await handleStop();
              }}
            />
            <Button
              label="Stop"
              variant="danger"
              size="lg"
              style={{ flex: 0, paddingHorizontal: spacing["2xl"] }}
              onPress={handleStop}
            />
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Rest panel ───────────────────────────────────────────────────────────────

function RestPanel() {
  const { isRunning, mode, startRest, stop, getRemainingSeconds } =
    useTimerStore();
  const defaultDuration = useSettingsStore((s) => s.restTimerDefaultSeconds);
  const [customDuration, setCustomDuration] = useState(defaultDuration);
  const [display, setDisplay] = useState(defaultDuration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const restPresets = [30, 60, 90, 120, 180, 300];

  useEffect(() => {
    if (!isRunning || mode !== "rest") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(getRemainingSeconds() || customDuration);
      return;
    }
    intervalRef.current = setInterval(() => {
      const rem = getRemainingSeconds();
      setDisplay(rem);
      if (rem === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearInterval(intervalRef.current!);
      }
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode]);

  const isActive = isRunning && mode === "rest";
  const progress = isActive ? 1 - display / customDuration : 0;

  return (
    <View style={styles.panelContent}>
      <AnimatedRing
        progress={progress}
        phase={isActive ? "work" : "idle"}
        display={formatTime(display)}
        label={isActive ? "Resting…" : "Ready"}
      />

      <Card style={styles.configCard}>
        <Text style={styles.configTitle}>Duration</Text>
        <View style={styles.presetsRow}>
          {restPresets.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.presetBtn,
                customDuration === s && styles.presetBtnActive,
              ]}
              onPress={() => {
                setCustomDuration(s);
                setDisplay(s);
              }}
            >
              <Text
                style={[
                  styles.presetText,
                  customDuration === s && styles.presetTextActive,
                ]}
              >
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <View style={styles.controlsRow}>
        {isActive ? (
          <Button
            label="Stop Timer"
            variant="danger"
            size="lg"
            fullWidth
            onPress={async () => {
              await stop();
              setDisplay(customDuration);
            }}
          />
        ) : (
          <Button
            label={`▶  Start ${customDuration < 60 ? customDuration + "s" : customDuration / 60 + "m"} Rest`}
            size="lg"
            fullWidth
            onPress={() => {
              startRest(customDuration, "Rest");
            }}
          />
        )}
      </View>
    </View>
  );
}

// ─── Stopwatch panel ─────────────────────────────────────────────────────────

function StopwatchPanel() {
  const { isRunning, mode, startStopwatch, stop, getElapsedSeconds } =
    useTimerStore();
  const saveSession = useSaveTaskSession();
  const [display, setDisplay] = useState(0);
  const [selectedCategory, setSelectedCategory] =
    useState<SessionCategory>("study");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRunning || mode !== "stopwatch") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(
      () => setDisplay(getElapsedSeconds()),
      500,
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode]);

  const isActive = isRunning && mode === "stopwatch";

  const handleStop = useCallback(async () => {
    const elapsed = getElapsedSeconds();
    const minutes = Math.floor(elapsed / 60);
    if (minutes >= 1) {
      saveSession.mutate({
        category: selectedCategory,
        durationMinutes: minutes,
      });
    }
    await stop();
    setDisplay(0);
  }, [stop, getElapsedSeconds, saveSession, selectedCategory]);

  return (
    <View style={styles.panelContent}>
      <AnimatedRing
        progress={isActive ? (display % 3600) / 3600 : 0}
        phase={isActive ? "work" : "idle"}
        display={formatTime(display)}
        label={isActive ? "Elapsed" : "Stopped"}
      />

      <View style={styles.categorySection}>
        <Text style={styles.sectionLabel}>Session type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            {(
              Object.entries(SESSION_CATEGORY_META) as [
                SessionCategory,
                (typeof SESSION_CATEGORY_META)[SessionCategory],
              ][]
            ).map(([key, meta]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryChip,
                  selectedCategory === key && {
                    borderColor: meta.color,
                    backgroundColor: meta.color + "15",
                  },
                ]}
                onPress={() => setSelectedCategory(key)}
                disabled={isActive}
              >
                <Text style={styles.catEmoji}>{meta.icon}</Text>
                <Text
                  style={[
                    styles.catLabel,
                    selectedCategory === key && { color: meta.color },
                  ]}
                >
                  {meta.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.controlsRow}>
        {isActive ? (
          <Button
            label="⏹  Stop & Save"
            variant="danger"
            size="lg"
            fullWidth
            onPress={handleStop}
          />
        ) : (
          <Button
            label="▶  Start Stopwatch"
            size="lg"
            fullWidth
            onPress={() =>
              startStopwatch(SESSION_CATEGORY_META[selectedCategory].label)
            }
          />
        )}
      </View>
    </View>
  );
}

// ─── Main Timer Screen ────────────────────────────────────────────────────────

export default function TimerScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TimerTab>("pomodoro");
  const { isRunning, mode } = useTimerStore();

  // Detect active timer and switch to correct tab
  useEffect(() => {
    if (mode === "rest") setTab("rest");
    else if (mode === "stopwatch") setTab("stopwatch");
    else if (mode?.startsWith("pomodoro")) setTab("pomodoro");
  }, [mode]);

  const TABS: Array<{ id: TimerTab; label: string; icon: string }> = [
    { id: "pomodoro", label: "Pomodoro", icon: "🍅" },
    { id: "rest", label: "Rest", icon: "⏱" },
    { id: "stopwatch", label: "Stopwatch", icon: "⏲" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Timer</Text>
        {isRunning && (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
        {!isRunning && <View style={{ width: 60 }} />}
      </View>

      {/* Tab selector */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text
              style={[styles.tabText, tab === t.id && styles.tabTextActive]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {tab === "pomodoro" && <PomodoroPanel />}
        {tab === "rest" && <RestPanel />}
        {tab === "stopwatch" && <StopwatchPanel />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accentDim,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
  activeBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.xs,
    color: colors.accent,
  },

  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  tabActive: { backgroundColor: colors.surface },
  tabIcon: { fontSize: 14 },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  tabTextActive: { color: colors.text, fontFamily: "Inter_600SemiBold" },

  scroll: { paddingHorizontal: spacing["2xl"], paddingBottom: spacing["5xl"] },
  panelContent: { alignItems: "center", gap: spacing.xl },

  // Cycle dots
  cycleDots: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cycleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cycleDotDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  cycleDotActive: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
  },
  cycleLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Config card
  configCard: { width: "100%", gap: spacing.md },
  configTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  configRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  configEmoji: { fontSize: 18, width: 24, textAlign: "center" },
  configLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: colors.text,
    flex: 1,
  },
  configStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  stepValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
    minWidth: 40,
    textAlign: "center",
  },

  // Category
  categorySection: { width: "100%", gap: spacing.sm },
  sectionLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryRow: { flexDirection: "row", gap: spacing.sm },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catEmoji: { fontSize: 14 },
  catLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Phase done
  phaseDoneBanner: { width: "100%", alignItems: "center" },
  phaseDoneText: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  phaseDoneSub: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },

  // Controls
  controlsRow: { width: "100%", gap: spacing.sm },
  doneControls: { flexDirection: "row", gap: spacing.sm, width: "100%" },

  // Rest presets
  presetsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  presetBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    minWidth: 52,
  },
  presetBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  presetText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  presetTextActive: { color: colors.accent },
});
