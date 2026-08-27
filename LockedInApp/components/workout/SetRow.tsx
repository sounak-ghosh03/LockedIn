import React, { useCallback, useState, useEffect, useRef } from "react";
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
  exerciseType: "compound" | "isolation" | "cardio" | "bodyweight";
  onToggleDone: (exerciseIdx: number, setIdx: number) => void;
  onWeightChange: (exerciseIdx: number, setIdx: number, value: number) => void;
  onRepsChange: (exerciseIdx: number, setIdx: number, value: number) => void;
  onSpeedChange: (exerciseIdx: number, setIdx: number, value: number) => void;
  onInclineChange: (exerciseIdx: number, setIdx: number, value: number) => void;
  onRestStart: () => void; // called when a set is marked done
}

export const SetRow = React.memo(function SetRow({
  set,
  exerciseIdx,
  setIdx,
  units,
  exerciseType,
  onToggleDone,
  onWeightChange,
  onRepsChange,
  onSpeedChange,
  onInclineChange,
  onRestStart,
}: SetRowProps) {
  const isCardio = exerciseType === "cardio";

  // ─── Weight local text state ──────────────────────────────────────────────
  // Keep a local string so mid-decimal typing (e.g. "12.") is preserved while
  // the numeric store only holds the parsed float.
  const [weightText, setWeightText] = useState(() =>
    set.weightKg > 0 ? formatNum(Number(set.weightKg)) : "",
  );
  const weightFocusedRef = useRef(false);

  // Sync when the store value changes externally (addSet copies previous weight,
  // session hydrated from API, etc.) but NOT while the user is actively typing.
  useEffect(() => {
    if (weightFocusedRef.current) return; // user is focused — don't overwrite
    const stored = Number(set.weightKg);
    const local = parseFloat(weightText);
    if (!Number.isNaN(stored) && stored !== local) {
      setWeightText(stored > 0 ? formatNum(stored) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.weightKg]);

  // ─── Reps local text state ────────────────────────────────────────────────
  // Previously reps had NO local state — every re-render read from set.reps,
  // causing the value to reset mid-typing if any other field triggered a render.
  const [repsText, setRepsText] = useState(() =>
    set.reps > 0 ? String(set.reps) : "",
  );
  const repsFocusedRef = useRef(false);

  useEffect(() => {
    if (repsFocusedRef.current) return;
    const stored = Number(set.reps);
    const local = parseInt(repsText, 10);
    if (!Number.isNaN(stored) && stored !== local) {
      setRepsText(stored > 0 ? String(stored) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.reps]);

  // ─── Speed local text state (cardio) ─────────────────────────────────────
  const [speedText, setSpeedText] = useState(() =>
    set.speedKmh && set.speedKmh > 0 ? formatNum(set.speedKmh) : "",
  );
  const speedFocusedRef = useRef(false);

  useEffect(() => {
    if (speedFocusedRef.current) return;
    const stored = Number(set.speedKmh ?? 0);
    const local = parseFloat(speedText);
    if (!Number.isNaN(stored) && stored !== local) {
      setSpeedText(stored > 0 ? formatNum(stored) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.speedKmh]);

  // ─── Incline local text state (cardio) ───────────────────────────────────
  const [inclineText, setInclineText] = useState(() =>
    set.inclinePercent !== undefined && set.inclinePercent >= 0
      ? formatNum(set.inclinePercent)
      : "",
  );
  const inclineFocusedRef = useRef(false);

  useEffect(() => {
    if (inclineFocusedRef.current) return;
    const stored = Number(set.inclinePercent ?? 0);
    const local = parseFloat(inclineText);
    if (!Number.isNaN(stored) && stored !== local) {
      setInclineText(stored >= 0 ? formatNum(stored) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.inclinePercent]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleWeightChange = useCallback(
    (v: string) => {
      setWeightText(v);
      const parsed = parseFloat(v);
      onWeightChange(exerciseIdx, setIdx, Number.isFinite(parsed) ? parsed : 0);
    },
    [onWeightChange, exerciseIdx, setIdx],
  );

  const handleRepsChange = useCallback(
    (v: string) => {
      setRepsText(v);
      const parsed = parseInt(v, 10);
      onRepsChange(exerciseIdx, setIdx, Number.isFinite(parsed) ? parsed : 0);
    },
    [onRepsChange, exerciseIdx, setIdx],
  );

  const handleSpeedChange = useCallback(
    (v: string) => {
      setSpeedText(v);
      const parsed = parseFloat(v);
      onSpeedChange(exerciseIdx, setIdx, Number.isFinite(parsed) ? parsed : 0);
    },
    [onSpeedChange, exerciseIdx, setIdx],
  );

  const handleInclineChange = useCallback(
    (v: string) => {
      setInclineText(v);
      const parsed = parseFloat(v);
      onInclineChange(
        exerciseIdx,
        setIdx,
        Number.isFinite(parsed) ? parsed : 0,
      );
    },
    [onInclineChange, exerciseIdx, setIdx],
  );

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleDone(exerciseIdx, setIdx);
    if (!set.completed) {
      onRestStart();
    }
  }, [onToggleDone, onRestStart, exerciseIdx, setIdx, set.completed]);

  // ─── Display helpers ──────────────────────────────────────────────────────
  const weightDisplayDone =
    units === "imperial"
      ? `${formatNum(Number(set.weightKg) * 2.205)} lbs`
      : `${formatNum(Number(set.weightKg))} kg`;

  return (
    <View style={[styles.row, set.completed && styles.rowDone]}>
      {/* Set number */}
      <Text style={styles.setNum}>{set.setNumber}</Text>

      {isCardio ? (
        /* ── Cardio: Speed + Incline ────────────────────────────────────── */
        <>
          {/* Speed input */}
          <TextInput
            style={[styles.input, set.completed && styles.inputDone]}
            value={
              set.completed
                ? set.speedKmh && set.speedKmh > 0
                  ? `${formatNum(set.speedKmh)} km/h`
                  : "—"
                : speedText
            }
            onChangeText={handleSpeedChange}
            onFocus={() => { speedFocusedRef.current = true; }}
            onBlur={() => { speedFocusedRef.current = false; }}
            keyboardType="decimal-pad"
            placeholder="km/h"
            placeholderTextColor={colors.textFaint}
            editable={!set.completed}
            selectTextOnFocus
          />

          {/* / separator */}
          <Text style={styles.sep}>/</Text>

          {/* Incline input */}
          <TextInput
            style={[styles.input, set.completed && styles.inputDone]}
            value={
              set.completed
                ? set.inclinePercent !== undefined
                  ? `${formatNum(set.inclinePercent)}%`
                  : "—"
                : inclineText
            }
            onChangeText={handleInclineChange}
            onFocus={() => { inclineFocusedRef.current = true; }}
            onBlur={() => { inclineFocusedRef.current = false; }}
            keyboardType="decimal-pad"
            placeholder="%"
            placeholderTextColor={colors.textFaint}
            editable={!set.completed}
            selectTextOnFocus
          />
        </>
      ) : (
        /* ── Strength: Weight × Reps ────────────────────────────────────── */
        <>
          {/* Weight input */}
          <TextInput
            style={[styles.input, set.completed && styles.inputDone]}
            value={set.completed ? weightDisplayDone : weightText}
            onChangeText={handleWeightChange}
            onFocus={() => { weightFocusedRef.current = true; }}
            onBlur={() => { weightFocusedRef.current = false; }}
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
            value={set.completed ? (set.reps > 0 ? String(set.reps) : "—") : repsText}
            onChangeText={handleRepsChange}
            onFocus={() => { repsFocusedRef.current = true; }}
            onBlur={() => { repsFocusedRef.current = false; }}
            keyboardType="number-pad"
            placeholder="reps"
            placeholderTextColor={colors.textFaint}
            editable={!set.completed}
            selectTextOnFocus
          />
        </>
      )}

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
