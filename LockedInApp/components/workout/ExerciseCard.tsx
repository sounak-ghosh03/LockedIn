import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "../ui/Badge";
import { SetRow } from "./SetRow";
import { colors, fontSize, spacing, radius } from "../../constants/theme";
import type { ExerciseLog } from "../../store/workoutStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { useSettingsStore } from "../../store/settingsStore";

interface ExerciseCardProps {
  exercise: ExerciseLog;
  exerciseIdx: number;
  isPR: boolean;
  onRestStart: () => void;
}

export const ExerciseCard = React.memo(function ExerciseCard({
  exercise,
  exerciseIdx,
  isPR,
  onRestStart,
}: ExerciseCardProps) {
  const [notesOpen, setNotesOpen] = useState(false);

  // Subscribe to specific store slices only — not the full store
  const toggleSetDone = useWorkoutStore((s) => s.toggleSetDone);
  const updateSetWeight = useWorkoutStore((s) => s.updateSetWeight);
  const updateSetReps = useWorkoutStore((s) => s.updateSetReps);
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

  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const totalVolume = exercise.sets
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.weightKg * s.reps, 0);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.badges}>
            <Text style={styles.progress}>
              {completedCount}/{exercise.sets.length} sets
            </Text>
            {totalVolume > 0 && (
              <Text style={styles.volume}>· {totalVolume} kg</Text>
            )}
            {isPR && <Badge label="🏆 PR" variant="warning" />}
          </View>
        </View>
        <TouchableOpacity
          style={styles.notesBtn}
          onPress={() => setNotesOpen((v) => !v)}
        >
          <Ionicons
            name={notesOpen ? "create" : "create-outline"}
            size={18}
            color={notesOpen ? colors.accent : colors.textMuted}
          />
        </TouchableOpacity>
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
        <Text style={[styles.colHeader, { flex: 1 }]}>WEIGHT</Text>
        <Text style={[styles.colHeader, { width: 8 }]}> </Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>REPS</Text>
        <Text style={[styles.colHeader, { width: 32 }]}> </Text>
      </View>

      {/* Sets */}
      {exercise.sets.map((set, si) => (
        <SetRow
          key={si}
          set={set}
          exerciseIdx={exerciseIdx}
          setIdx={si}
          units={units}
          onToggleDone={handleToggle}
          onWeightChange={handleWeightChange}
          onRepsChange={handleRepsChange}
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
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { flex: 1, gap: 4 },
  exerciseName: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  badges: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
  notesBtn: {
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
