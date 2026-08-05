import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { Card } from "../components/ui/Card";
import { useWorkoutSessions } from "../api/queries/useWorkoutSessions";
import { colors, fontSize, spacing, radius } from "../constants/theme";
import type { WorkoutSessionData } from "../api/queries/useWorkoutSessions";

const SessionCard = React.memo(function SessionCard({
  session,
  onPress,
}: {
  session: WorkoutSessionData;
  onPress: () => void;
}) {
  const prCount = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.isNewPR).length,
    0,
  );
  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0,
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <View>
            <Text style={styles.sessionDate}>
              {new Date(session.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </Text>
            {session.planId && (
              <Text style={styles.sessionPlanHint}>Planned workout</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </View>

        <View style={styles.statsRow}>
          <StatChip
            icon="⏱"
            value={`${session.durationMinutes}m`}
            label="Duration"
          />
          <StatChip
            icon="🏋️"
            value={`${session.totalVolumeKg} kg`}
            label="Volume"
          />
          <StatChip icon="✅" value={`${completedSets}`} label="Sets" />
          {prCount > 0 && (
            <StatChip icon="🏆" value={`${prCount}`} label="PRs" accent />
          )}
        </View>

        <View style={styles.exerciseList}>
          {session.exercises.slice(0, 4).map((ex, i) => (
            <Text key={i} style={styles.exerciseChip}>
              {ex.name}
            </Text>
          ))}
          {session.exercises.length > 4 && (
            <Text style={styles.moreChip}>+{session.exercises.length - 4}</Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
});

const StatChip = React.memo(function StatChip({
  icon,
  value,
  label,
  accent,
}: {
  icon: string;
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[chipStyles.chip, accent && chipStyles.chipAccent]}>
      <Text style={chipStyles.icon}>{icon}</Text>
      <Text style={[chipStyles.value, accent && chipStyles.valueAccent]}>
        {value}
      </Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
});

const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  chipAccent: { backgroundColor: colors.accentDim },
  icon: { fontSize: 14 },
  value: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  valueAccent: { color: colors.accent },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const { data: sessions = [], isLoading } = useWorkoutSessions({ limit: 100 });

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Workout History</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏋️</Text>
          <Text style={styles.emptyTitle}>No workouts logged yet</Text>
          <Text style={styles.muted}>
            Complete a workout session to see your history
          </Text>
        </View>
      ) : (
        <FlashList
          data={sorted}
          keyExtractor={(item) => item._id}
          estimatedItemSize={180}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => router.push(`/workout-session/${item._id}`)}
            />
          )}
        />
      )}
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
  listContent: { padding: spacing.lg, paddingBottom: spacing["5xl"] },

  sessionCard: { gap: spacing.md },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sessionDate: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  sessionPlanHint: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsRow: { flexDirection: "row", gap: spacing.sm },

  exerciseList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  exerciseChip: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  moreChip: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.accent,
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.xl,
    color: colors.text,
  },
  muted: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
