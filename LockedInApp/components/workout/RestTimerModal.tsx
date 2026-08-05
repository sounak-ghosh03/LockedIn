import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTimerStore } from "../../store/timerStore";
import { useSettingsStore } from "../../store/settingsStore";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface RestTimerBannerProps {
  onDismiss?: () => void;
}

/**
 * Floating banner that appears when a rest timer is active.
 * Recomputes remaining time from endTimestamp every 500ms — no drift.
 */
export const RestTimerBanner = React.memo(function RestTimerBanner({
  onDismiss,
}: RestTimerBannerProps) {
  const { mode, isRunning, getRemainingSeconds, stop } = useTimerStore();
  const [remaining, setRemaining] = useState(getRemainingSeconds());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnim = useRef(new Animated.Value(-80)).current;

  const isRestActive = mode === "rest" && isRunning;

  // Slide in/out animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isRestActive ? 0 : -80,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [isRestActive, slideAnim]);

  // Tick from timestamp (no drift)
  useEffect(() => {
    if (!isRestActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const rem = getRemainingSeconds();
      setRemaining(rem);
      if (rem === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRestActive, getRemainingSeconds]);

  const handleStop = useCallback(async () => {
    await stop();
    onDismiss?.();
  }, [stop, onDismiss]);

  if (!isRestActive && remaining === 0) return null;

  const isFinished = remaining === 0;

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.inner}>
        <View style={styles.left}>
          <Text style={styles.icon}>{isFinished ? "✅" : "⏱"}</Text>
          <View>
            <Text style={styles.label}>
              {isFinished ? "Rest Complete!" : "Resting…"}
            </Text>
            <Text style={[styles.time, isFinished && styles.timeDone]}>
              {formatTime(remaining)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

/**
 * Rest timer options shown after marking a set done.
 * Lets the user choose a duration or skip.
 */
interface RestTimerPickerProps {
  defaultSeconds: number;
  onStart: (seconds: number) => void;
  onSkip: () => void;
}

export const RestTimerPicker = React.memo(function RestTimerPicker({
  defaultSeconds,
  onStart,
  onSkip,
}: RestTimerPickerProps) {
  const presets = [30, 60, 90, 120, 180];

  return (
    <View style={styles.picker}>
      <Text style={styles.pickerTitle}>Start rest timer?</Text>
      <View style={styles.pickerRow}>
        {presets.map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.pickerBtn,
              s === defaultSeconds && styles.pickerBtnDefault,
            ]}
            onPress={() => onStart(s)}
          >
            <Text
              style={[
                styles.pickerBtnText,
                s === defaultSeconds && styles.pickerBtnTextDefault,
              ]}
            >
              {s < 60 ? `${s}s` : `${s / 60}m`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={onSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { fontSize: 24 },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  time: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.xl,
    color: colors.accent,
  },
  timeDone: { color: colors.success },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  // Picker
  picker: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
  },
  pickerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  pickerRow: { flexDirection: "row", gap: spacing.sm },
  pickerBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  pickerBtnDefault: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  pickerBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  pickerBtnTextDefault: { color: colors.accent },
  skipText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
