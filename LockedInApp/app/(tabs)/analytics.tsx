import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { api } from "../../api/client";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

interface HeatmapDay {
  date: string;
  hasActivity: boolean;
  workoutCount: number;
  focusMinutes: number;
}

interface WorkoutSession {
  _id: string;
  date: string;
  durationMinutes: number;
  totalVolumeKg: number;
  exercises: Array<{ name: string; sets: Array<{ completed: boolean }> }>;
}

export default function AnalyticsScreen() {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  const { data: heatmapData = [] } = useQuery<HeatmapDay[]>({
    queryKey: ["heatmap"],
    queryFn: () => api.get("/activity/heatmap"),
    staleTime: 15 * 60 * 1000,
  });

  const { data: sessions = [] } = useQuery<WorkoutSession[]>({
    queryKey: ["workoutSessions"],
    queryFn: () => api.get("/workout-sessions?limit=100"),
  });

  const stats = useMemo(() => {
    const totalWorkouts = sessions.length;
    const totalVolumeKg = sessions.reduce((s, w) => s + w.totalVolumeKg, 0);
    const avgDuration = sessions.length
      ? Math.round(
          sessions.reduce((s, w) => s + w.durationMinutes, 0) / sessions.length,
        )
      : 0;

    // Current streak
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

    return {
      totalWorkouts,
      totalVolumeKg: Math.round(totalVolumeKg),
      avgDuration,
      streak,
      longest,
      activeDays,
    };
  }, [sessions, heatmapData]);

  // Build week grid for full-year heatmap
  const weeks = useMemo(() => {
    const result: HeatmapDay[][] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      result.push(heatmapData.slice(i, i + 7));
    }
    return result;
  }, [heatmapData]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Analytics</Text>

        {/* Streak stats */}
        <View style={styles.statsRow}>
          <StatBox label="Current Streak" value={`${stats.streak} 🔥`} accent />
          <StatBox label="Longest Streak" value={`${stats.longest}`} />
          <StatBox label="Active Days" value={`${stats.activeDays}`} />
        </View>

        {/* Workout stats */}
        <View style={styles.statsRow}>
          <StatBox label="Total Workouts" value={`${stats.totalWorkouts}`} />
          <StatBox
            label="Total Volume"
            value={`${(stats.totalVolumeKg / 1000).toFixed(1)}t`}
          />
          <StatBox label="Avg Duration" value={`${stats.avgDuration}m`} />
        </View>

        {/* Full-year heatmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yearly Activity</Text>
          <Card style={styles.heatmapCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.heatmapGrid}>
                {weeks.map((week, wi) => (
                  <View key={wi} style={styles.heatWeek}>
                    {week.map((day, di) => (
                      <TouchableOpacity
                        key={di}
                        style={[
                          styles.heatCell,
                          day.hasActivity && styles.heatCellActive,
                        ]}
                        onPress={() => setSelectedDay(day)}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
            <View style={styles.heatLegend}>
              <Text style={styles.legendText}>Less</Text>
              <View
                style={[
                  styles.legendCell,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              />
              <View
                style={[styles.legendCell, { backgroundColor: colors.accent }]}
              />
              <Text style={styles.legendText}>More</Text>
            </View>
          </Card>
        </View>

        {/* Selected day detail */}
        {selectedDay && (
          <Card accent>
            <Text style={styles.sectionTitle}>{selectedDay.date}</Text>
            {selectedDay.hasActivity ? (
              <View style={styles.dayDetail}>
                {selectedDay.workoutCount > 0 && (
                  <Text style={styles.dayItem}>
                    💪 {selectedDay.workoutCount} workout(s)
                  </Text>
                )}
                {selectedDay.focusMinutes > 0 && (
                  <Text style={styles.dayItem}>
                    🧠 {selectedDay.focusMinutes}m focus time
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.muted}>Rest day</Text>
            )}
          </Card>
        )}

        {/* Personal records placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Records 🏆</Text>
          <Card>
            <Text style={styles.muted}>
              PR detection coming in Phase 3 — complete workouts to start
              tracking
            </Text>
          </Card>
        </View>
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
  statsRow: { flexDirection: "row", gap: spacing.sm },
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
    textAlign: "center",
  },
  heatmapCard: {},
  heatmapGrid: { flexDirection: "row", gap: 3 },
  heatWeek: { gap: 3 },
  heatCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
  },
  heatCellActive: { backgroundColor: colors.accent },
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
  dayDetail: { gap: spacing.xs, marginTop: spacing.xs },
  dayItem: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.text,
  },
});
