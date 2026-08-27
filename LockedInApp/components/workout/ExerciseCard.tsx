import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  GestureResponderHandlers,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "../ui/Badge";
import { SetRow } from "./SetRow";
import { colors, fontSize, spacing, radius } from "../../constants/theme";
import type { ExerciseLog } from "../../store/workoutStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { useSettingsStore } from "../../store/settingsStore";
import { formatNum } from "../../utils/formatNumber";

interface ExerciseCardProps {
  exercise: ExerciseLog;
  exerciseIdx: number;
  isPR: boolean;
  onRestStart: () => void;
  onDeleteExercise: (exerciseIdx: number) => void;
  /** Pan handlers from the parent drag-sort wrapper, attached to the drag handle */
  dragHandlePanHandlers?: GestureResponderHandlers;
  /** Legacy callback — kept for API compat, not used when panHandlers provided */
  onDragStart?: () => void;
}

export const ExerciseCard = React.memo(function ExerciseCard({
  exercise,
  exerciseIdx,
  isPR,
  onRestStart,
  onDeleteExercise,
  dragHandlePanHandlers,
}: ExerciseCardProps) {
  const [notesOpen, setNotesOpen] = useState(false);

  const isCardio = exercise.exerciseType === "cardio";

  // Subscribe to specific store slices only — not the full store
  const toggleSetDone = useWorkoutStore((s) => s.toggleSetDone);
  const updateSetWeight = useWorkoutStore((s) => s.updateSetWeight);
  const updateSetReps = useWorkoutStore((s) => s.updateSetReps);
  const updateSetSpeed = useWorkoutStore((s) => s.updateSetSpeed);
  const updateSetIncline = useWorkoutStore((s) => s.updateSetIncline);
  const updateExerciseNotes = useWorkoutStore((s) => s.updateExerciseNotes);
  const addSet = useWorkoutStore((s) => s.addSet);
  const units = useSettingsStore((s) => s.units);

  const handleToggle = useCallback(
    (ei: number, si: number) => toggleSetDone(ei, si),
    [toggleSetDone],
  );
  const handleWeightChange = useCallback(
    (ei: number, si: number, v: number) => updateSetWeight(ei, si, v),
    [updateSetWeight],
  );
  const handleRepsChange = useCallback(
    (ei: number, si: number, v: number) => updateSetReps(ei, si, v),
    [updateSetReps],
  );
  const handleSpeedChange = useCallback(
    (ei: number, si: number, v: number) => updateSetSpeed(ei, si, v),
    [updateSetSpeed],
  );
  const handleInclineChange = useCallback(
    (ei: number, si: number, v: number) => updateSetIncline(ei, si, v),
    [updateSetIncline],
  );

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Remove Exercise",
      `Remove "${exercise.name}" from this workout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onDeleteExercise(exerciseIdx),
        },
      ],
    );
  }, [exercise.name, exerciseIdx, onDeleteExercise]);

  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const totalVolume = isCardio
    ? 0
    : exercise.sets
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + Number(s.weightKg) * Number(s.reps), 0);

  // For cardio, show avg speed across completed sets
  const avgSpeed = isCardio
    ? (() => {
        const done = exercise.sets.filter(
          (s) => s.completed && s.speedKmh && s.speedKmh > 0,
        );
        if (!done.length) return null;
        const avg =
          done.reduce((sum, s) => sum + (s.speedKmh ?? 0), 0) / done.length;
        return formatNum(avg);
      })()
    : null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        {/* Drag handle — pan handlers attached here */}
        <View style={styles.dragHandle} {...(dragHandlePanHandlers ?? {})}>
          <Ionicons name="reorder-three" size={22} color={colors.textFaint} />
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.badges}>
            <Text style={styles.progress}>
              {completedCount}/{exercise.sets.length} sets
            </Text>
            {isCardio ? (
              avgSpeed && (
                <Text style={styles.volume}>· avg {avgSpeed} km/h</Text>
              )
            ) : (
              totalVolume > 0 && (
                <Text style={styles.volume}>· {formatNum(totalVolume)} kg</Text>
              )
            )}
            {isPR && <Badge label="🏆 PR" variant="warning" />}
          </View>
        </View>

        <View style={styles.headerActions}>
          {/* Notes toggle */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setNotesOpen((v) => !v)}
          >
            <Ionicons
              name={notesOpen ? "create" : "create-outline"}
              size={18}
              color={notesOpen ? colors.accent : colors.textMuted}
            />
          </TouchableOpacity>

          {/* Delete exercise */}
          <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
            <Ionicons
              name="trash-outline"
              size={18}
              color={colors.error}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes */}
      {notesOpen && (
        <TextInput
          style={styles.notesInput}
          value={exercise.notes}
          onChangeText={(v) => updateExerciseNotes(exerciseIdx, v)}
          placeholder="Notes for this exercise…"
          placeholderTextColor={colors.textFaint}
          multiline
        />
      )}

      {/* Column headers */}
      <View style={styles.colHeaders}>
        <Text style={[styles.colHeader, { width: 20 }]}>SET</Text>
        {isCardio ? (
          <>
            <Text style={[styles.colHeader, { flex: 1 }]}>SPEED</Text>
            <Text style={[styles.colHeader, { width: 8 }]}> </Text>
            <Text style={[styles.colHeader, { flex: 1 }]}>INCLINE</Text>
          </>
        ) : (
          <>
            <Text style={[styles.colHeader, { flex: 1 }]}>WEIGHT</Text>
            <Text style={[styles.colHeader, { width: 8 }]}> </Text>
            <Text style={[styles.colHeader, { flex: 1 }]}>REPS</Text>
          </>
        )}
        <Text style={[styles.colHeader, { width: 32 }]}> </Text>
      </View>

      {/* Sets */}
      {exercise.sets.map((set, si) => (
        <SetRow
          key={set.setNumber}
          set={set}
          exerciseIdx={exerciseIdx}
          setIdx={si}
          units={units}
          exerciseType={exercise.exerciseType}
          onToggleDone={handleToggle}
          onWeightChange={handleWeightChange}
          onRepsChange={handleRepsChange}
          onSpeedChange={handleSpeedChange}
          onInclineChange={handleInclineChange}
          onRestStart={onRestStart}
        />
      ))}

      {/* Add set */}
      <TouchableOpacity
        style={styles.addSetBtn}
        onPress={() => addSet(exerciseIdx)}
      >
        <Ionicons name="add" size={16} color={colors.accent} />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  dragHandle: {
    paddingTop: 2,
    paddingRight: 4,
    width: 28,
    alignItems: "center",
    justifyContent: "flex-start",
    // Make it easier to grab
    minHeight: 36,
  },
  headerCenter: { flex: 1, gap: 4 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  exerciseName: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  badges: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  progress: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  volume: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  notesInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    padding: spacing.sm,
    minHeight: 60,
  },
  colHeaders: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: 2,
  },
  colHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: colors.textFaint,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  addSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  addSetText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.accent,
  },
});
