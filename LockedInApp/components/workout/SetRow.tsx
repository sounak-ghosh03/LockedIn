import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, spacing, radius } from "../../constants/theme";
import type { SetEntry } from "../../store/workoutStore";
import { formatNum } from "../../utils/formatNumber";

interface SetRowProps {
  set: SetEntry;
  exerciseIdx: number;
  setIdx: number;
  units: "metric" | "imperial";
  onToggleDone: (exerciseIdx: number, setIdx: number) => void;
  onWeightChange: (exerciseIdx: number, setIdx: number, value: number) => void;
  onRepsChange: (exerciseIdx: number, setIdx: number, value: number) => void;
  onRestStart: () => void; // called when a set is marked done
}

export const SetRow = React.memo(function SetRow({
  set,
  exerciseIdx,
  setIdx,
  units,
  onToggleDone,
  onWeightChange,
  onRepsChange,
  onRestStart,
}: SetRowProps) {
  // ─── Local text state for weight input ───────────────────────────────────────
  // We keep a local string so that mid-decimal typing (e.g. "12.") is preserved
  // in the text field while the numeric store only sees the parsed value.
  const [weightText, setWeightText] = useState(() =>
    set.weightKg > 0 ? formatNum(Number(set.weightKg)) : "",
  );

  // Sync local text when the store value changes externally (e.g. addSet copies
  // the previous set's weight, or session is hydrated from the API).
  useEffect(() => {
    const stored = Number(set.weightKg);
    const local = parseFloat(weightText);
    // Only overwrite if the store value genuinely differs from what we already
    // have locally (avoids clobbering mid-typing states like "12.").
    if (!Number.isNaN(stored) && stored !== local) {
      setWeightText(stored > 0 ? formatNum(stored) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.weightKg]);

  const handleWeightTextChange = useCallback(
    (v: string) => {
      setWeightText(v);
      // Parse the numeric value and push it to the store.
      // parseFloat handles decimals correctly; empty / non-numeric → 0.
      const parsed = parseFloat(v);
      onWeightChange(exerciseIdx, setIdx, Number.isFinite(parsed) ? parsed : 0);
    },
    [onWeightChange, exerciseIdx, setIdx],
  );

  const handleRepsTextChange = useCallback(
    (v: string) => {
      // Reps stay integer — parseInt is appropriate here.
      const parsed = parseInt(v, 10);
      onRepsChange(exerciseIdx, setIdx, Number.isFinite(parsed) ? parsed : 0);
    },
    [onRepsChange, exerciseIdx, setIdx],
  );

  // Display label shown in the imperial weight column (read-only after completion).
  const weightLabel =
    units === "imperial"
      ? `${formatNum(Number(set.weightKg) * 2.205)} lbs`
      : `${formatNum(Number(set.weightKg))} kg`;

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleDone(exerciseIdx, setIdx);
    if (!set.completed) {
      // Completing a set — trigger rest timer prompt
      onRestStart();
    }
  }, [onToggleDone, onRestStart, exerciseIdx, setIdx, set.completed]);

  return (
    <View style={[styles.row, set.completed && styles.rowDone]}>
      {/* Set number */}
      <Text style={styles.setNum}>{set.setNumber}</Text>

      {/* Weight input */}
      <TextInput
        style={[styles.input, set.completed && styles.inputDone]}
        value={
          set.completed
            ? units === "imperial"
              ? weightLabel
              : formatNum(Number(set.weightKg))
            : weightText
        }
        onChangeText={handleWeightTextChange}
        keyboardType="decimal-pad"
        placeholder="kg"
        placeholderTextColor={colors.textFaint}
        editable={!set.completed}
        selectTextOnFocus
      />

      {/* × separator */}
      <Text style={styles.sep}>×</Text>

      {/* Reps input */}
      <TextInput
        style={[styles.input, set.completed && styles.inputDone]}
        value={set.reps > 0 ? String(Number(set.reps)) : ""}
        onChangeText={handleRepsTextChange}
        keyboardType="number-pad"
        placeholder="reps"
        placeholderTextColor={colors.textFaint}
        editable={!set.completed}
        selectTextOnFocus
      />

      {/* PR badge */}
      {set.isNewPR && (
        <View style={styles.prBadge}>
          <Text style={styles.prText}>PR</Text>
        </View>
      )}

      {/* Done toggle */}
      <TouchableOpacity
        style={[styles.checkBtn, set.completed && styles.checkBtnDone]}
        onPress={handleToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {set.completed ? (
          <Ionicons name="checkmark" size={16} color={colors.success} />
        ) : (
          <View style={styles.checkEmpty} />
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
  },
  rowDone: {
    backgroundColor: "rgba(0, 208, 132, 0.06)",
  },
  setNum: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    width: 20,
    textAlign: "center",
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: "center",
    height: 38,
  },
  inputDone: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    color: colors.textMuted,
  },
  sep: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textFaint,
  },
  prBadge: {
    backgroundColor: colors.warning,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  prText: {
    fontFamily: "Inter_700Bold" as any,
    fontSize: 10,
    color: "#000",
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBtnDone: {
    borderColor: colors.success,
    backgroundColor: colors.successDim,
  },
  checkEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textFaint,
  },
});
