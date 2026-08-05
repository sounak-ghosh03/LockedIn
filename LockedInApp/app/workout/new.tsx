import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useCreateWorkoutPlan } from "../../api/queries/useWorkoutPlans";
import { EXERCISES, MUSCLE_GROUPS, Exercise } from "../../constants/exercises";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

type Step = "details" | "exercises";
type PlanType = "PPL" | "Upper/Lower" | "Full Body" | "Custom";

const MUSCLE_GROUP_ICONS: Record<string, string> = {
  Chest: "💪",
  Back: "🏋️",
  Shoulders: "🦾",
  Biceps: "💪",
  Triceps: "💪",
  Quads: "🦵",
  Hamstrings: "🦵",
  Glutes: "🍑",
  Calves: "🦵",
  Core: "⚡",
  Forearms: "💪",
  "Full Body": "🔥",
  Cardio: "❤️",
};

interface ExerciseItemProps {
  exercise: Exercise;
  selected: boolean;
  onToggle: (ex: Exercise) => void;
}

const ExerciseItem = React.memo(function ExerciseItem({
  exercise,
  selected,
  onToggle,
}: ExerciseItemProps) {
  return (
    <TouchableOpacity
      style={[styles.exerciseItem, selected && styles.exerciseItemSelected]}
      onPress={() => onToggle(exercise)}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseItemLeft}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <View style={styles.exerciseMeta}>
          <Badge label={exercise.muscle} variant="muted" />
          <Badge
            label={exercise.equipment}
            variant={exercise.type === "compound" ? "accent" : "muted"}
          />
        </View>
      </View>
      <View
        style={[styles.exerciseCheck, selected && styles.exerciseCheckDone]}
      >
        {selected && (
          <Ionicons name="checkmark" size={16} color={colors.accent} />
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function NewWorkoutPlanScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [planName, setPlanName] = useState("");
  const [planType, setPlanType] = useState<PlanType>("Custom");
  const [targetSets, setTargetSets] = useState("3");
  const [targetReps, setTargetReps] = useState("10");
  const [restSeconds, setRestSeconds] = useState("90");
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const createPlan = useCreateWorkoutPlan();

  // Filtered exercise list
  const filteredExercises = useMemo(() => {
    let list = EXERCISES;
    if (selectedMuscle) list = list.filter((e) => e.muscle === selectedMuscle);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscle.toLowerCase().includes(q) ||
          e.equipment.toLowerCase().includes(q),
      );
    }
    return list;
  }, [searchQuery, selectedMuscle]);

  const selectedIds = useMemo(
    () => new Set(selectedExercises.map((e) => e.id)),
    [selectedExercises],
  );

  const toggleExercise = useCallback((ex: Exercise) => {
    setSelectedExercises((prev) =>
      prev.find((e) => e.id === ex.id)
        ? prev.filter((e) => e.id !== ex.id)
        : [...prev, ex],
    );
  }, []);

  const handleCreate = useCallback(() => {
    if (!planName.trim()) {
      Alert.alert("Name required", "Enter a name for your workout plan.");
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert("No exercises", "Select at least one exercise.");
      return;
    }

    createPlan.mutate(
      {
        name: planName.trim(),
        type: planType,
        exercises: selectedExercises.map((ex) => ({
          exerciseId: ex.id,
          name: ex.name,
          targetSets: +targetSets || 3,
          targetReps: +targetReps || 10,
          targetWeight: 0,
          restSeconds: +restSeconds || 90,
        })),
      },
      {
        onSuccess: () => router.back(),
        onError: () =>
          Alert.alert("Error", "Failed to create plan. Try again."),
      },
    );
  }, [
    planName,
    planType,
    targetSets,
    targetReps,
    restSeconds,
    selectedExercises,
    createPlan,
    router,
  ]);

  // ─── Step 1: Plan details ─────────────────────────────────────────────────────
  const DetailsStep = (
    <View style={styles.detailsContent}>
      {/* Plan name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Plan Name *</Text>
        <TextInput
          style={styles.input}
          value={planName}
          onChangeText={setPlanName}
          placeholder="e.g. Push Day A"
          placeholderTextColor={colors.textFaint}
          returnKeyType="next"
        />
      </View>

      {/* Plan type */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Type</Text>
        <View style={styles.typeGrid}>
          {(["PPL", "Upper/Lower", "Full Body", "Custom"] as PlanType[]).map(
            (t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, planType === t && styles.typeBtnActive]}
                onPress={() => setPlanType(t)}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    planType === t && styles.typeBtnTextActive,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      </View>

      {/* Default sets/reps/rest */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Default Sets / Reps / Rest</Text>
        <View style={styles.triRow}>
          {[
            { label: "Sets", value: targetSets, set: setTargetSets },
            { label: "Reps", value: targetReps, set: setTargetReps },
            { label: "Rest (s)", value: restSeconds, set: setRestSeconds },
          ].map((f) => (
            <View key={f.label} style={styles.triField}>
              <Text style={styles.triLabel}>{f.label}</Text>
              <TextInput
                style={[styles.input, styles.triInput]}
                value={f.value}
                onChangeText={f.set}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textFaint}
                selectTextOnFocus
              />
            </View>
          ))}
        </View>
      </View>

      <Button
        label="Next: Choose Exercises →"
        fullWidth
        onPress={() => setStep("exercises")}
        disabled={!planName.trim()}
      />
    </View>
  );

  // ─── Step 2: Exercise picker ──────────────────────────────────────────────────
  const ExercisesStep = (
    <View style={styles.exercisesContent}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color={colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search exercises…"
          placeholderTextColor={colors.textFaint}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Muscle group filter */}
      <FlashList
        data={["All", ...MUSCLE_GROUPS]}
        horizontal
        showsHorizontalScrollIndicator={false}
        estimatedItemSize={80}
        keyExtractor={(item) => item}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
        renderItem={({ item }) => {
          const isAll = item === "All";
          const active = isAll
            ? selectedMuscle === null
            : selectedMuscle === item;
          return (
            <TouchableOpacity
              style={[styles.muscleChip, active && styles.muscleChipActive]}
              onPress={() => setSelectedMuscle(isAll ? null : item)}
            >
              <Text style={styles.muscleChipIcon}>
                {isAll ? "💪" : (MUSCLE_GROUP_ICONS[item] ?? "🏋️")}
              </Text>
              <Text
                style={[
                  styles.muscleChipText,
                  active && styles.muscleChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Selected count */}
      <Text style={styles.selectedCount}>
        {selectedExercises.length} exercise
        {selectedExercises.length !== 1 ? "s" : ""} selected
      </Text>

      {/* Exercise list */}
      <FlashList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        estimatedItemSize={72}
        contentContainerStyle={styles.exerciseList}
        renderItem={({ item }) => (
          <ExerciseItem
            exercise={item}
            selected={selectedIds.has(item.id)}
            onToggle={toggleExercise}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No exercises found. Try a different search.
          </Text>
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            step === "details" ? router.back() : setStep("details")
          }
        >
          <Ionicons
            name={step === "details" ? "close" : "arrow-back"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.title}>
          {step === "details" ? "New Plan" : "Select Exercises"}
        </Text>

        {step === "exercises" ? (
          <Button
            label="Create"
            size="sm"
            loading={createPlan.isPending}
            disabled={selectedExercises.length === 0}
            onPress={handleCreate}
          />
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {step === "details" ? DetailsStep : ExercisesStep}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },

  // Details step
  detailsContent: { padding: spacing["2xl"], gap: spacing.xl },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    padding: spacing.md,
  },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  typeBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  typeBtnTextActive: { color: colors.accent },
  triRow: { flexDirection: "row", gap: spacing.sm },
  triField: { flex: 1, gap: spacing.xs },
  triLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textAlign: "center",
  },
  triInput: { textAlign: "center" },

  // Exercise picker step
  exercisesContent: { flex: 1 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    paddingVertical: spacing.sm,
  },
  muscleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  muscleChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  muscleChipIcon: { fontSize: 14 },
  muscleChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  muscleChipTextActive: { color: colors.accent },
  selectedCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  exerciseList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["5xl"],
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  exerciseItemSelected: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  exerciseItemLeft: { flex: 1, gap: 4 },
  exerciseName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  exerciseMeta: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  exerciseCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseCheckDone: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing["3xl"],
  },
});
