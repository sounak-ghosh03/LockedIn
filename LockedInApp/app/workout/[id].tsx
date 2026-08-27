import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Animated,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui/Button";
import { ExerciseCard } from "../../components/workout/ExerciseCard";
import {
  RestTimerBanner,
  RestTimerPicker,
} from "../../components/workout/RestTimerModal";
import { useWorkoutStore } from "../../store/workoutStore";
import { useTimerStore } from "../../store/timerStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useWorkoutPlans } from "../../api/queries/useWorkoutPlans";
import {
  useWorkoutSessions,
  useSaveWorkoutSession,
} from "../../api/queries/useWorkoutSessions";
import { checkPR } from "../../utils/prDetection";
import { formatNum } from "../../utils/formatNumber";
import { colors, fontSize, spacing, radius } from "../../constants/theme";
import { EXERCISES, MUSCLE_GROUPS, Exercise } from "../../constants/exercises";
import { Badge } from "../../components/ui/Badge";



function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Add Exercise Modal ───────────────────────────────────────────────────────

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (exercise: Exercise) => void;
  /** IDs of exercises already in the session (to show as already-added) */
  existingIds: Set<string>;
}

function AddExerciseModal({ visible, onClose, onAdd, existingIds }: AddExerciseModalProps) {
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = EXERCISES;
    if (selectedMuscle) list = list.filter((e) => e.muscle === selectedMuscle);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscle.toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, selectedMuscle]);

  const handleClose = useCallback(() => {
    setSearch("");
    setSelectedMuscle(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={modalStyles.container} edges={["top"]}>
        {/* Header */}
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Add Exercise</Text>
          <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={modalStyles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={modalStyles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises…"
            placeholderTextColor={colors.textFaint}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Muscle filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={modalStyles.chipRow}
        >
          {["All", ...MUSCLE_GROUPS].map((m) => {
            const isAll = m === "All";
            const active = isAll ? selectedMuscle === null : selectedMuscle === m;
            return (
              <TouchableOpacity
                key={m}
                style={[modalStyles.chip, active && modalStyles.chipActive]}
                onPress={() => setSelectedMuscle(isAll ? null : m)}
              >
                <Text style={[modalStyles.chipText, active && modalStyles.chipTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Exercise list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={modalStyles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const inSession = existingIds.has(item.id);
            return (
              <TouchableOpacity
                style={[modalStyles.item, inSession && modalStyles.itemAdded]}
                onPress={() => {
                  if (!inSession) {
                    onAdd(item);
                    handleClose();
                  }
                }}
                activeOpacity={inSession ? 1 : 0.7}
              >
                <View style={modalStyles.itemLeft}>
                  <Text style={modalStyles.itemName}>{item.name}</Text>
                  <View style={modalStyles.itemBadges}>
                    <Badge label={item.muscle} variant="muted" />
                    <Badge
                      label={item.equipment}
                      variant={item.type === "compound" ? "accent" : "muted"}
                    />
                  </View>
                </View>
                {inSession ? (
                  <Text style={modalStyles.addedLabel}>Added</Text>
                ) : (
                  <Ionicons name="add-circle" size={24} color={colors.accent} />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={modalStyles.empty}>No exercises match your search.</Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}



// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // ─── Store slices ───────────────────────────────────────────────────────────
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const startSession = useWorkoutStore((s) => s.startSession);
  const endSession = useWorkoutStore((s) => s.endSession);
  const addExercise = useWorkoutStore((s) => s.addExercise);
  const removeExercise = useWorkoutStore((s) => s.removeExercise);
  const reorderExercises = useWorkoutStore((s) => s.reorderExercises);
  const restTimerDefault = useSettingsStore((s) => s.restTimerDefaultSeconds);
  const { startRest, stop: stopTimer } = useTimerStore();

  // ─── Remote data ────────────────────────────────────────────────────────────
  const { data: plans = [] } = useWorkoutPlans();
  const { data: previousSessions = [] } = useWorkoutSessions({ limit: 50 });
  const saveSession = useSaveWorkoutSession();

  const plan = plans.find((p) => p._id === id);

  // ─── Initialize session from plan ──────────────────────────────────────────
  useEffect(() => {
    if (!plan) return;
    if (activeSession?.planId === id) return;

    startSession(
      plan.name,
      plan.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        exerciseType: ex.exerciseType ?? "compound",
        notes: "",
      })),
      id,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // ─── Elapsed timer ──────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!activeSession) return;
    elapsedIntervalRef.current = setInterval(() => {
      setElapsed(Date.now() - activeSession.startTime);
    }, 1000);
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [activeSession]);

  // ─── Rest timer ─────────────────────────────────────────────────────────────
  const [showRestPicker, setShowRestPicker] = useState(false);

  const handleRestStart = useCallback(() => {
    setShowRestPicker(true);
  }, []);

  const handleStartRest = useCallback(
    async (seconds: number) => {
      setShowRestPicker(false);
      await startRest(seconds, "Rest");
    },
    [startRest],
  );

  // ─── Add Exercise modal ─────────────────────────────────────────────────────
  const [showAddExercise, setShowAddExercise] = useState(false);

  const existingExerciseIds = useMemo(
    () => new Set(activeSession?.exercises.map((ex) => ex.exerciseId) ?? []),
    [activeSession],
  );

  const handleAddExercise = useCallback(
    (exercise: Exercise) => {
      addExercise({
        exerciseId: exercise.id,
        name: exercise.name,
        exerciseType: exercise.type,
        notes: "",
      });
    },
    [addExercise],
  );

  // ─── Delete exercise ────────────────────────────────────────────────────────
  const handleDeleteExercise = useCallback(
    (exerciseIdx: number) => {
      removeExercise(exerciseIdx);
    },
    [removeExercise],
  );

  // ─── Reorder exercises ──────────────────────────────────────────────────────
  const handleReorder = useCallback(
    (from: number, to: number) => {
      reorderExercises(from, to);
    },
    [reorderExercises],
  );

  // ─── PR detection ───────────────────────────────────────────────────────────
  const prMap = useMemo(() => {
    const result: Record<number, boolean> = {};
    if (!activeSession) return result;
    activeSession.exercises.forEach((ex, i) => {
      const { isPR } = checkPR(ex.exerciseId, ex.sets, previousSessions);
      result[i] = isPR;
    });
    return result;
  }, [activeSession, previousSessions]);

  // ─── Total volume ────────────────────────────────────────────────────────────
  const totalVolume = useMemo(() => {
    if (!activeSession) return 0;
    return activeSession.exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets
          .filter((s) => s.completed)
          .reduce((s2, set) => s2 + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
      0,
    );
  }, [activeSession]);

  // ─── Finish ─────────────────────────────────────────────────────────────────
  const handleFinish = useCallback(() => {
    if (!activeSession) return;

    const completedSets = activeSession.exercises.some((ex) =>
      ex.sets.some((s) => s.completed),
    );

    if (!completedSets) {
      Alert.alert("No sets logged", "Log at least one set before finishing.");
      return;
    }

    Alert.alert(
      "Finish Workout?",
      `${formatElapsed(elapsed)} · ${formatNum(totalVolume)} kg total volume`,
      [
        { text: "Keep Going", style: "cancel" },
        {
          text: "Finish",
          onPress: async () => {
            const session = endSession();
            if (!session) return;
            await stopTimer();

            const durationMinutes = Math.round(elapsed / 60_000);
            const prExercises = activeSession.exercises.map((ex, i) => ({
              exerciseId: ex.exerciseId,
              name: ex.name,
              sets: ex.sets.map((s) => ({
                ...s,
                isNewPR: prMap[i] ?? false,
              })),
              notes: ex.notes,
            }));

            saveSession.mutate(
              {
                planId: session.planId,
                date: new Date().toISOString(),
                durationMinutes,
                totalVolumeKg: parseFloat(totalVolume.toFixed(4)),
                exercises: prExercises,
                overallNotes: session.overallNotes,
              },
              {
                onSuccess: () => router.replace("/(tabs)/workout"),
                onError: () => router.replace("/(tabs)/workout"),
              },
            );
          },
        },
      ],
    );
  }, [
    activeSession,
    elapsed,
    totalVolume,
    endSession,
    stopTimer,
    saveSession,
    prMap,
    router,
  ]);

  // ─── Discard ────────────────────────────────────────────────────────────────
  const handleDiscard = useCallback(() => {
    Alert.alert("Discard Workout?", "Your progress will be lost.", [
      { text: "Keep Going", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: async () => {
          endSession();
          await stopTimer();
          router.back();
        },
      },
    ]);
  }, [endSession, stopTimer, router]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (!activeSession || !plan) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading workout…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const exerciseCount = activeSession.exercises.length;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Rest timer floating banner */}
      <RestTimerBanner />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscard}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.planName} numberOfLines={1}>
            {activeSession.planName}
          </Text>
          <View style={styles.statsRow}>
            <Text style={styles.statText}>⏱ {formatElapsed(elapsed)}</Text>
            <Text style={styles.statSep}>·</Text>
            <Text style={styles.statText}>🏋️ {formatNum(totalVolume)} kg</Text>
          </View>
        </View>

        <Button
          label="Finish"
          size="sm"
          loading={saveSession.isPending}
          onPress={handleFinish}
        />
      </View>

      {/* Rest timer picker */}
      {showRestPicker && (
        <RestTimerPicker
          defaultSeconds={restTimerDefault}
          onStart={handleStartRest}
          onSkip={() => setShowRestPicker(false)}
        />
      )}

      {/* Exercise list — scrollable, drag-sortable */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeSession.exercises.map((ex, index) => (
          <DraggableExerciseCard
            key={`${ex.exerciseId}-${index}`}
            exercise={ex}
            exerciseIdx={index}
            totalCount={exerciseCount}
            isPR={prMap[index] ?? false}
            onRestStart={handleRestStart}
            onDeleteExercise={handleDeleteExercise}
            onMoveUp={index > 0 ? () => handleReorder(index, index - 1) : undefined}
            onMoveDown={
              index < exerciseCount - 1
                ? () => handleReorder(index, index + 1)
                : undefined
            }
          />
        ))}

        {/* Add Exercise button */}
        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => setShowAddExercise(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="add-circle" size={20} color={colors.accent} />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Exercise Modal */}
      <AddExerciseModal
        visible={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onAdd={handleAddExercise}
        existingIds={existingExerciseIds}
      />
    </SafeAreaView>
  );
}

// ─── Draggable wrapper per exercise card ─────────────────────────────────────
// Uses simple Up/Down controls via the drag handle long-press menu,
// or an animated pan-responder when the handle is dragged.

interface DraggableExerciseCardProps {
  exercise: any;
  exerciseIdx: number;
  totalCount: number;
  isPR: boolean;
  onRestStart: () => void;
  onDeleteExercise: (idx: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function DraggableExerciseCard({
  exercise,
  exerciseIdx,
  totalCount: _totalCount,
  isPR,
  onRestStart,
  onDeleteExercise,
  onMoveUp,
  onMoveDown,
}: DraggableExerciseCardProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const startPageY = useRef(0);
  const THRESHOLD = 80; // px to move before triggering a swap

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        startPageY.current = evt.nativeEvent.pageY;
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        isDragging.current = false;
        const dy = gs.dy;
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4,
        }).start();
        if (dy < -THRESHOLD && onMoveUp) {
          onMoveUp();
        } else if (dy > THRESHOLD && onMoveDown) {
          onMoveDown();
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.exerciseWrapper,
        { transform: [{ translateY }] },
      ]}
    >
      <ExerciseCard
        exercise={exercise}
        exerciseIdx={exerciseIdx}
        isPR={isPR}
        onRestStart={onRestStart}
        onDeleteExercise={onDeleteExercise}
        onDragStart={() => {
          // Attach pan handlers via the drag handle press
        }}
        dragHandlePanHandlers={panResponder.panHandlers}
      />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: colors.textMuted,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  planName: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },
  statText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  statSep: { color: colors.textFaint },

  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing["5xl"],
    gap: spacing.md,
  },
  exerciseWrapper: {
    // zIndex is set dynamically when dragging
  },

  addExerciseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderStyle: "dashed",
    backgroundColor: colors.accentDim,
  },
  addExerciseText: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.accent,
  },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  closeBtn: { padding: spacing.xs },
  searchRow: {
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
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    paddingVertical: spacing.sm,
  },
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipTextActive: { color: colors.accent },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["5xl"],
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  itemAdded: {
    opacity: 0.45,
  },
  itemLeft: { flex: 1, gap: 4 },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  itemBadges: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  addedLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing["3xl"],
  },
});
