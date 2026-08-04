import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useTimerStore } from "../store/timerStore";
import { useSettingsStore } from "../store/settingsStore";
import { colors, fontSize, spacing, radius } from "../constants/theme";

type TimerTab = "rest" | "stopwatch";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimerScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TimerTab>("rest");
  const [display, setDisplay] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    mode,
    isRunning,
    startRest,
    startStopwatch,
    stop,
    getRemainingSeconds,
    getElapsedSeconds,
  } = useTimerStore();
  const defaultDuration = useSettingsStore((s) => s.restTimerDefaultSeconds);
  const [customDuration, setCustomDuration] = useState(defaultDuration);

  // Update display every second from timestamp (no drift)
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mode === "rest") setDisplay(getRemainingSeconds());
      else if (mode === "stopwatch") setDisplay(getElapsedSeconds());
      return;
    }

    intervalRef.current = setInterval(() => {
      if (mode === "rest") {
        const rem = getRemainingSeconds();
        setDisplay(rem);
        if (rem === 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } else {
        setDisplay(getElapsedSeconds());
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, getRemainingSeconds, getElapsedSeconds]);

  const restPresets = [30, 60, 90, 120, 180, 300];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Timer</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tab */}
      <View style={styles.tabs}>
        {(["rest", "stopwatch"] as TimerTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "rest" ? "⏱ Rest Timer" : "⏲ Stopwatch"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timer display */}
      <View style={styles.timerDisplay}>
        <View style={styles.timerCircle}>
          <Text style={styles.timerText}>{formatTime(display)}</Text>
          <Text style={styles.timerMode}>
            {tab === "rest"
              ? isRunning
                ? "Resting…"
                : "Ready"
              : isRunning
                ? "Elapsed"
                : "Stopped"}
          </Text>
        </View>
      </View>

      {/* Presets (rest only) */}
      {tab === "rest" && (
        <Card style={styles.presets}>
          <Text style={styles.presetsLabel}>Duration</Text>
          <View style={styles.presetsRow}>
            {restPresets.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.presetBtn,
                  customDuration === s && styles.presetBtnActive,
                ]}
                onPress={() => setCustomDuration(s)}
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
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {tab === "rest" ? (
          isRunning ? (
            <Button
              label="Stop Timer"
              variant="danger"
              size="lg"
              fullWidth
              onPress={() => {
                stop();
                setDisplay(customDuration);
              }}
            />
          ) : (
            <Button
              label={`Start ${customDuration < 60 ? customDuration + "s" : customDuration / 60 + "m"} Rest`}
              size="lg"
              fullWidth
              onPress={() => {
                startRest(customDuration, "Rest");
                setDisplay(customDuration);
              }}
            />
          )
        ) : isRunning ? (
          <Button
            label="Stop"
            variant="danger"
            size="lg"
            fullWidth
            onPress={() => {
              stop();
              setDisplay(0);
            }}
          />
        ) : (
          <Button
            label="Start"
            size="lg"
            fullWidth
            onPress={() => {
              startStopwatch("Stopwatch");
              setDisplay(0);
            }}
          />
        )}
      </View>
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
  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.surface },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  tabTextActive: { color: colors.text },
  timerDisplay: { flex: 1, alignItems: "center", justifyContent: "center" },
  timerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  timerText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 52,
    color: colors.text,
    letterSpacing: -2,
  },
  timerMode: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  presets: { marginHorizontal: spacing["2xl"] },
  presetsLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  presetsRow: { flexDirection: "row", gap: spacing.sm },
  presetBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
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
  controls: { padding: spacing["2xl"] },
});
