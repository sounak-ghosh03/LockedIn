import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useWorkoutSessions } from "../../api/queries/useWorkoutSessions";
import { colors, fontSize, spacing, radius } from "../../constants/theme";
import { formatNum, formatWeight } from "../../utils/formatNumber";

export default function WorkoutSessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: sessions = [] } = useWorkoutSessions({ limit: 200 });
  const session = sessions.find((s) => s._id === id);

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Session Detail</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.muted}>Session not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const prCount = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.isNewPR).length,
    0,
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Session Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Session meta */}
        <View style={styles.metaCard}>
          <Text style={styles.sessionDate}>
            {new Date(session.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <View style={styles.statsRow}>
            {[
              {
                icon: "⏱",
                value: `${session.durationMinutes}m`,
                label: "Duration",
              },
              {
                icon: "🏋️",
                value: formatWeight(Number(session.totalVolumeKg)),
                label: "Volume",
              },
              {
                icon: "✅",
                value: String(
                  session.exercises.reduce(
                    (s, ex) => s + ex.sets.filter((st) => st.completed).length,
                    0,
                  ),
                ),
                label: "Sets Done",
              },
              ...(prCount > 0
                ? [{ icon: "🏆", value: String(prCount), label: "PRs" }]
                : []),
            ].map((stat) => (
              <View key={stat.label} style={styles.statBox}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          {session.overallNotes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{session.overallNotes}</Text>
            </View>
          ) : null}
        </View>

        {/* Exercises */}
        <Text style={styles.sectionTitle}>Exercises</Text>
        {session.exercises.map((ex, ei) => {
          const completedSets = ex.sets.filter((s) => s.completed);
          const totalVolume = completedSets.reduce(
            (s, st) => s + Number(st.weightKg) * Number(st.reps),
            0,
          );
          const hasPR = ex.sets.some((s) => s.isNewPR);

          return (
            <Card key={ei} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <View style={styles.exerciseMeta}>
                    <Text style={styles.exerciseStat}>
                      {completedSets.length} set
                      {completedSets.length !== 1 ? "s" : ""} · {formatWeight(totalVolume)}
                    </Text>
                    {hasPR && <Badge label="🏆 PR" variant="warning" />}
                  </View>
                </View>
              </View>

              {/* Set table */}
              <View style={styles.setTable}>
                <View style={styles.setTableHeader}>
                  <Text style={[styles.setCol, { flex: 0, width: 32 }]}>
                    SET
                  </Text>
                  <Text style={styles.setCol}>WEIGHT</Text>
                  <Text style={styles.setCol}>REPS</Text>
                  <Text style={styles.setCol}>VOL</Text>
                  <Text style={[styles.setCol, { flex: 0, width: 28 }]}> </Text>
                </View>
                {ex.sets
                  .filter((s) => s.completed)
                  .map((s) => {
                    const weight = Number(s.weightKg);
                    const reps = Number(s.reps);
                    const volume = Number.isFinite(weight) && Number.isFinite(reps)
                      ? weight * reps
                      : 0;

                    return (
                      <View key={s.setNumber} style={styles.setRow}>
                        <Text
                          style={[styles.setCellNum, { flex: 0, width: 32 }]}
                        >
                          {s.setNumber}
                        </Text>

                        <Text style={styles.setCell}>
                          {formatNum(weight)} kg
                        </Text>

                        <Text style={styles.setCell}>{formatNum(reps)}</Text>

                        <Text style={styles.setCell}>
                          {formatNum(volume)} kg
                        </Text>

                        <View
                          style={[
                            styles.prDot,
                            !s.isNewPR && { backgroundColor: "transparent" },
                          ]}
                        />
                      </View>
                    );
                  })}
              </View>

              {ex.notes ? (
                <Text style={styles.exerciseNotes}>📝 {ex.notes}</Text>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
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
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing["5xl"],
  },

  // Meta card
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sessionDate: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.xl,
    color: colors.text,
  },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  statIcon: { fontSize: 16 },
  statValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  notesBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  notesLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  notesText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.text,
  },

  // Exercises
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  exerciseCard: { gap: spacing.md },
  exerciseHeader: { flexDirection: "row", alignItems: "flex-start" },
  exerciseName: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  exerciseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
  },
  exerciseStat: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Set table
  setTable: { gap: 2 },
  setTableHeader: {
    flexDirection: "row",
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  setRow: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  setCol: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: colors.textFaint,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  setCell: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: "center",
  },
  setCellNum: {
    flex: 0,
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  prDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
    marginRight: spacing.xs,
  },

  exerciseNotes: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: "italic",
  },

  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
