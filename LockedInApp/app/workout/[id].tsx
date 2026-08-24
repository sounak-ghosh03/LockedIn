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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
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

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // ─── Store slices (specific — not full store) ────────────────────────────────
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const startSession = useWorkoutStore((s) => s.startSession);
  const endSession = useWorkoutStore((s) => s.endSession);
  const restTimerDefault = useSettingsStore((s) => s.restTimerDefaultSeconds);
  const { startRest, stop: stopTimer } = useTimerStore();

  // ─── Remote data ─────────────────────────────────────────────────────────────
  const { data: plans = [] } = useWorkoutPlans();
  const { data: previousSessions = [] } = useWorkoutSessions({ limit: 50 });
  const saveSession = useSaveWorkoutSession();

  const plan = plans.find((p) => p._id === id);

  // ─── Initialize session from plan ────────────────────────────────────────────
  useEffect(() => {
    if (!plan) return;
    if (activeSession?.planId === id) return; // already started

    startSession(
      plan.name,
      plan.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        notes: "",
      })),
      id,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // ─── Elapsed timer ────────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  useEffect(() => {
    if (!activeSession) return;
    elapsedIntervalRef.current = setInterval(() => {
      setElapsed(Date.now() - activeSession.startTime);
    }, 1000);
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [activeSession]);

  // ─── Rest timer state ─────────────────────────────────────────────────────────
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

  // ─── PR detection ─────────────────────────────────────────────────────────────
  const prMap = useMemo(() => {
    const result: Record<number, boolean> = {};
    if (!activeSession) return result;
    activeSession.exercises.forEach((ex, i) => {
      const { isPR } = checkPR(ex.exerciseId, ex.sets, previousSessions);
      result[i] = isPR;
    });
    return result;
  }, [activeSession, previousSessions]);

  // ─── Total volume ─────────────────────────────────────────────────────────────
  const totalVolume = useMemo(() => {
    if (!activeSession) return 0;
    return activeSession.exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets
          .filter((s) => s.completed)
          .reduce((s2, set) => s2 + set.weightKg * set.reps, 0),
      0,
    );
  }, [activeSession]);

  // ─── Finish workout ───────────────────────────────────────────────────────────
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

  // ─── Discard ──────────────────────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (!activeSession || !plan) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading workout…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ─── Rest timer floating banner ─────────────────────────── */}
      <RestTimerBanner />

      {/* ─── Header ────────────────────────────────────────────── */}
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

      {/* ─── Rest timer picker (inline) ─────────────────────────── */}
      {showRestPicker && (
        <RestTimerPicker
          defaultSeconds={restTimerDefault}
          onStart={handleStartRest}
          onSkip={() => setShowRestPicker(false)}
        />
      )}

      {/* ─── Exercise list ──────────────────────────────────────── */}
      <FlashList
        data={activeSession.exercises}
        keyExtractor={(_item, i) => String(i)}
        estimatedItemSize={260}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ index }) => {
          // Read from store at render time — memo in ExerciseCard prevents unnecessary re-renders
          const ex = activeSession.exercises[index];
          if (!ex) return null;
          return (
            <ExerciseCard
              exercise={ex}
              exerciseIdx={index}
              isPR={prMap[index] ?? false}
              onRestStart={handleRestStart}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

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

  listContent: { padding: spacing.lg, paddingBottom: spacing["5xl"] },
});
