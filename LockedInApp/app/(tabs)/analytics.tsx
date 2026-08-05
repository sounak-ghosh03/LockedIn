import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { LineChartCard } from "../../components/charts/LineChartCard";
import { BarChartCard } from "../../components/charts/BarChartCard";
import {
  useVolumeHistory,
  useWeeklyFrequency,
  extractPRs,
  muscleGroupFrequency,
} from "../../utils/analyticsHelpers";
import { useWorkoutSessions } from "../../api/queries/useWorkoutSessions";
import { api } from "../../api/client";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

interface HeatmapDay {
  date: string;
  hasActivity: boolean;
  workoutCount: number;
  focusMinutes: number;
}

const { width } = Dimensions.get("window");
const CELL_SIZE = Math.floor(
  (width - spacing["2xl"] * 2 - spacing.lg * 2 - 3 * 11) / 12,
);

// ─── Full-year heatmap ────────────────────────────────────────────────────────
const FullHeatmap = React.memo(function FullHeatmap({
  data,
  onSelectDay,
}: {
  data: HeatmapDay[];
  onSelectDay: (d: HeatmapDay | null) => void;
}) {
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const getIntensity = (d: HeatmapDay) => {
    if (!d.hasActivity) return 0;
    return Math.min(1, d.workoutCount * 0.5 + d.focusMinutes / 120);
  };

  const getColor = (d: HeatmapDay) => {
    const intensity = getIntensity(d);
    if (intensity === 0) return colors.surfaceAlt;
    if (intensity < 0.4) return "#802600";
    if (intensity < 0.7) return "#C13D00";
    return colors.accent;
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {weeks.map((week, wi) => (
          <View key={wi} style={{ gap: 3 }}>
            {week.map((day, di) => (
              <TouchableOpacity
                key={di}
                style={[styles.heatCell, { backgroundColor: getColor(day) }]}
                onPress={() => onSelectDay(day)}
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
});

// ─── PR List item ─────────────────────────────────────────────────────────────
const PRItem = React.memo(function PRItem({
  rank,
  name,
  best1RM,
  bestWeightKg,
  bestReps,
  date,
}: {
  rank: number;
  name: string;
  best1RM: number;
  bestWeightKg: number;
  bestReps: number;
  date: string;
}) {
  const medal =
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  return (
    <View style={styles.prItem}>
      <Text style={styles.prMedal}>{medal}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.prName}>{name}</Text>
        <Text style={styles.prMeta}>
          {bestWeightKg} kg × {bestReps} reps ·{" "}
          {new Date(date).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.pr1RMBadge}>
        <Text style={styles.pr1RMLabel}>Est. 1RM</Text>
        <Text style={styles.pr1RMValue}>{best1RM} kg</Text>
      </View>
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const [prLimit, setPrLimit] = useState(5);

  const { data: heatmapData = [] } = useQuery<HeatmapDay[]>({
    queryKey: ["heatmap"],
    queryFn: () => api.get("/activity/heatmap"),
    staleTime: 15 * 60 * 1000,
  });

  const { data: sessions = [] } = useWorkoutSessions({ limit: 200 });

  // ─── Computed analytics ──────────────────────────────────────────────────────
  const volumeHistory = useMemo(() => useVolumeHistory(sessions), [sessions]);
  const weeklyFrequency = useMemo(
    () => useWeeklyFrequency(sessions),
    [sessions],
  );
  const prRecords = useMemo(() => extractPRs(sessions), [sessions]);
  const topExercises = useMemo(
    () => muscleGroupFrequency(sessions),
    [sessions],
  );

  const stats = useMemo(() => {
    // Streak
    let streak = 0;
    const sorted = [...heatmapData].reverse();
    for (const d of sorted) {
      if (d.hasActivity) streak++;
      else break;
    }
    // Longest streak
    let longest = 0,
      current = 0;
    for (const d of heatmapData) {
      if (d.hasActivity) {
        current++;
        longest = Math.max(longest, current);
      } else current = 0;
    }
    // Active days this year
    const yearStart = new Date().getFullYear() + "-01-01";
    const activeDays = heatmapData.filter(
      (d) => d.date >= yearStart && d.hasActivity,
    ).length;
    // Total volume
    const totalVolumeTonnes =
      sessions.reduce((s, w) => s + w.totalVolumeKg, 0) / 1000;
    // Avg session duration
    const avgDuration = sessions.length
      ? Math.round(
          sessions.reduce((s, w) => s + w.durationMinutes, 0) / sessions.length,
        )
      : 0;

    return { streak, longest, activeDays, totalVolumeTonnes, avgDuration };
  }, [heatmapData, sessions]);

  // Chart data
  const volumeChartData = useMemo(
    () =>
      volumeHistory.slice(-30).map((v) => ({
        value: Math.round(v.totalVolumeKg),
        label: v.date.slice(5),
      })),
    [volumeHistory],
  );

  const freqChartData = useMemo(
    () =>
      weeklyFrequency.slice(-12).map((w) => ({
        value: w.count,
        label: w.week.slice(5),
      })),
    [weeklyFrequency],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Analytics</Text>

        {/* ─── Streak stats ─────────────────────────── */}
        <View style={styles.statsGrid}>
          <StatBox label="Streak 🔥" value={`${stats.streak}d`} accent />
          <StatBox label="Longest" value={`${stats.longest}d`} />
          <StatBox label="This Year" value={`${stats.activeDays}d`} />
          <StatBox
            label="Total Vol."
            value={`${stats.totalVolumeTonnes.toFixed(1)}t`}
          />
          <StatBox label="Sessions" value={`${sessions.length}`} />
          <StatBox label="Avg. Time" value={`${stats.avgDuration}m`} />
        </View>

        {/* ─── Full-year heatmap ────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yearly Activity</Text>
          <Card style={{ overflow: "hidden" }}>
            {heatmapData.length > 0 ? (
              <>
                <FullHeatmap data={heatmapData} onSelectDay={setSelectedDay} />
                <View style={styles.heatLegend}>
                  <Text style={styles.legendText}>Less</Text>
                  {[colors.surfaceAlt, "#802600", "#C13D00", colors.accent].map(
                    (c) => (
                      <View
                        key={c}
                        style={[styles.legendCell, { backgroundColor: c }]}
                      />
                    ),
                  )}
                  <Text style={styles.legendText}>More</Text>
                </View>
              </>
            ) : (
              <Text style={styles.muted}>
                Log workouts or sessions to see your heatmap
              </Text>
            )}
          </Card>

          {/* Day detail */}
          {selectedDay && (
            <Card accent style={{ marginTop: spacing.sm }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text style={styles.sectionTitle}>{selectedDay.date}</Text>
                  {selectedDay.hasActivity ? (
                    <View style={{ gap: 4, marginTop: 4 }}>
                      {selectedDay.workoutCount > 0 && (
                        <Text style={styles.muted}>
                          💪 {selectedDay.workoutCount} workout
                          {selectedDay.workoutCount !== 1 ? "s" : ""}
                        </Text>
                      )}
                      {selectedDay.focusMinutes > 0 && (
                        <Text style={styles.muted}>
                          🧠 {selectedDay.focusMinutes}m focus
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.muted}>Rest day</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelectedDay(null)}>
                  <Text style={[styles.muted, { fontSize: fontSize.lg }]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        </View>

        {/* ─── Volume trend ─────────────────────────── */}
        <LineChartCard
          title="Volume Trend — Last 30 Workouts"
          data={volumeChartData}
          color={colors.accent}
          yAxisSuffix=" kg"
          height={160}
          emptyMessage="Complete workouts to see your volume trend"
        />

        {/* ─── Weekly frequency ─────────────────────── */}
        <BarChartCard
          title="Workouts per Week — Last 12 Weeks"
          data={freqChartData}
          color={colors.accentSoft}
          height={140}
          emptyMessage="Log workouts to see frequency"
        />

        {/* ─── Personal Records ─────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Records 🏆</Text>
          {prRecords.length === 0 ? (
            <Card>
              <Text style={styles.muted}>
                No PRs yet. Complete sets in your workouts to start tracking.
              </Text>
            </Card>
          ) : (
            <Card style={{ gap: 0 }}>
              {prRecords.slice(0, prLimit).map((pr, i) => (
                <PRItem
                  key={pr.exerciseId}
                  rank={i + 1}
                  name={pr.exerciseName}
                  best1RM={pr.best1RM}
                  bestWeightKg={pr.bestWeightKg}
                  bestReps={pr.bestReps}
                  date={pr.achievedDate}
                />
              ))}
              {prRecords.length > prLimit && (
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  onPress={() => setPrLimit((n) => n + 5)}
                >
                  <Text style={styles.showMoreText}>
                    Show {Math.min(5, prRecords.length - prLimit)} more PRs
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          )}
        </View>

        {/* ─── Top exercises ────────────────────────── */}
        {topExercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most Logged Exercises</Text>
            <Card>
              {topExercises.map((ex, i) => (
                <View key={ex.muscle} style={styles.topExRow}>
                  <Text style={styles.topExRank}>{i + 1}</Text>
                  <Text style={styles.topExName}>{ex.muscle}</Text>
                  <Badge label={`${ex.count} sets`} variant="muted" />
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const StatBox = React.memo(function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[sbStyles.box, accent && sbStyles.boxAccent]}>
      <Text style={[sbStyles.value, accent && sbStyles.valueAccent]}>
        {value}
      </Text>
      <Text style={sbStyles.label}>{label}</Text>
    </View>
  );
});

const sbStyles = StyleSheet.create({
  box: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  boxAccent: {
    borderColor: colors.borderAccent,
    backgroundColor: colors.accentDim,
  },
  value: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  valueAccent: { color: colors.accent },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing["2xl"],
    gap: spacing.xl,
    paddingBottom: spacing["5xl"],
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  section: { gap: spacing.md },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  muted: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  heatCell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2 },
  heatLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    justifyContent: "flex-end",
  },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
  legendText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
  },

  prItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prMedal: { fontSize: 22, width: 32, textAlign: "center" },
  prName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  prMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  pr1RMBadge: { alignItems: "flex-end" },
  pr1RMLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  pr1RMValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.accent,
  },
  showMoreBtn: { paddingVertical: spacing.md, alignItems: "center" },
  showMoreText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.accent,
  },

  topExRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topExRank: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.textMuted,
    width: 24,
    textAlign: "center",
  },
  topExName: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.base,
    color: colors.text,
    flex: 1,
  },
});
