import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { CalendarGrid, MONTH_NAMES } from "../components/calendar/CalendarGrid";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { useWorkoutSessions } from "../api/queries/useWorkoutSessions";
import { useTasks } from "../api/queries/useTasks";
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from "../api/queries/useTasks";
import { api } from "../api/client";
import { colors, fontSize, spacing, radius } from "../constants/theme";

interface HeatmapDay {
  date: string;
  hasActivity: boolean;
  workoutCount: number;
  focusMinutes: number;
}

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    today.toISOString().slice(0, 10),
  );

  // ─── Data ─────────────────────────────────────────────────────────────────────
  const { data: sessions = [] } = useWorkoutSessions({ limit: 200 });
  const { data: tasks = [] } = useTasks();
  const { data: heatmap = [] } = useQuery<HeatmapDay[]>({
    queryKey: ["heatmap"],
    queryFn: () => api.get("/activity/heatmap"),
    staleTime: 15 * 60 * 1000,
  });

  // ─── Build day data map ───────────────────────────────────────────────────────
  const dayData = useMemo(() => {
    const map: Record<
      string,
      { workouts?: number; tasks?: number; hasFocus?: boolean }
    > = {};

    // From workout sessions
    for (const s of sessions) {
      const date = s.date.slice(0, 10);
      if (!map[date]) map[date] = {};
      map[date].workouts = (map[date].workouts ?? 0) + 1;
    }

    // From task due dates
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const date = t.dueDate.slice(0, 10);
      if (!map[date]) map[date] = {};
      map[date].tasks = (map[date].tasks ?? 0) + 1;
    }

    // From heatmap focus minutes
    for (const h of heatmap) {
      if (h.focusMinutes > 0) {
        if (!map[h.date]) map[h.date] = {};
        map[h.date].hasFocus = true;
      }
    }

    return map;
  }, [sessions, tasks, heatmap]);

  // ─── Navigation ───────────────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
    setSelectedDate(null);
  }, [month]);

  const goForward = useCallback(() => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
    setSelectedDate(null);
  }, [month]);

  const goToday = useCallback(() => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(today.toISOString().slice(0, 10));
  }, [today]);

  // ─── Selected day events ──────────────────────────────────────────────────────
  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    return sessions.filter((s) => s.date.slice(0, 10) === selectedDate);
  }, [selectedDate, sessions]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((t) => t.dueDate?.slice(0, 10) === selectedDate);
  }, [selectedDate, tasks]);

  const hasSelectedEvents =
    selectedDaySessions.length > 0 || selectedDayTasks.length > 0;

  // ─── Month stats ──────────────────────────────────────────────────────────────
  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthSessions = sessions.filter((s) => s.date.startsWith(prefix));
    const monthTasks = tasks.filter(
      (t) => t.dueDate?.startsWith(prefix) && t.completed,
    );
    return {
      workouts: monthSessions.length,
      volume: monthSessions.reduce((s, w) => s + w.totalVolumeKg, 0),
      tasksCompleted: monthTasks.length,
    };
  }, [year, month, sessions, tasks]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Calendar</Text>
        <TouchableOpacity onPress={goToday}>
          <Text style={styles.todayBtn}>Today</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goBack} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity onPress={goForward} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <Card style={{ padding: spacing.md }}>
          <CalendarGrid
            year={year}
            month={month}
            dayData={dayData}
            selectedDate={selectedDate}
            onSelectDate={(d) =>
              setSelectedDate((prev) => (prev === d ? null : d))
            }
          />
        </Card>

        {/* Month stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{monthStats.workouts}</Text>
            <Text style={styles.statLabel}>💪 Workouts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {(monthStats.volume / 1000).toFixed(1)}t
            </Text>
            <Text style={styles.statLabel}>🏋️ Volume</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{monthStats.tasksCompleted}</Text>
            <Text style={styles.statLabel}>✅ Tasks Done</Text>
          </View>
        </View>

        {/* Selected day detail */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                },
              )}
            </Text>

            {!hasSelectedEvents ? (
              <Card>
                <Text style={styles.muted}>No activity on this day</Text>
              </Card>
            ) : (
              <>
                {/* Workouts */}
                {selectedDaySessions.map((s) => {
                  const prCount = s.exercises.reduce(
                    (sum, ex) =>
                      sum + ex.sets.filter((st) => st.isNewPR).length,
                    0,
                  );
                  return (
                    <TouchableOpacity
                      key={s._id}
                      onPress={() => router.push(`/workout-session/${s._id}`)}
                    >
                      <Card style={styles.eventCard} accent>
                        <View style={styles.eventRow}>
                          <Text style={styles.eventIcon}>💪</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.eventTitle}>
                              Workout Session
                            </Text>
                            <Text style={styles.eventMeta}>
                              {s.durationMinutes}m · {s.totalVolumeKg} kg
                              {prCount > 0
                                ? ` · 🏆 ${prCount} PR${prCount !== 1 ? "s" : ""}`
                                : ""}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={colors.textFaint}
                          />
                        </View>
                        {/* Exercise preview */}
                        <View style={styles.exPreview}>
                          {s.exercises.slice(0, 3).map((ex, i) => (
                            <Badge key={i} label={ex.name} variant="muted" />
                          ))}
                          {s.exercises.length > 3 && (
                            <Badge
                              label={`+${s.exercises.length - 3}`}
                              variant="accent"
                            />
                          )}
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}

                {/* Tasks due */}
                {selectedDayTasks.map((task) => {
                  const cat = CATEGORY_CONFIG[task.category];
                  const pri = PRIORITY_CONFIG[task.priority];
                  return (
                    <Card
                      key={task._id}
                      style={[
                        styles.eventCard,
                        task.completed && styles.taskDone,
                      ]}
                    >
                      <View style={styles.eventRow}>
                        <Text style={styles.eventIcon}>{cat.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.eventTitle,
                              task.completed && styles.taskDoneText,
                            ]}
                          >
                            {task.title}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              gap: spacing.xs,
                              marginTop: 4,
                            }}
                          >
                            <Badge label={cat.label} variant="muted" />
                            <Badge
                              label={`${pri.icon} ${pri.label}`}
                              variant="muted"
                            />
                          </View>
                        </View>
                        {task.completed && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={colors.success}
                          />
                        )}
                      </View>
                    </Card>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* Upcoming tasks */}
        {tasks.filter((t) => !t.completed && t.dueDate).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
            <Card style={{ gap: 0 }}>
              {tasks
                .filter((t) => !t.completed && t.dueDate)
                .sort((a, b) =>
                  (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
                )
                .slice(0, 5)
                .map((task) => {
                  const cat = CATEGORY_CONFIG[task.category];
                  const pri = PRIORITY_CONFIG[task.priority];
                  const dueDate = new Date(task.dueDate! + "T12:00:00");
                  const isOverdue = dueDate < today;
                  const daysDiff = Math.ceil(
                    (dueDate.getTime() - today.getTime()) /
                      (1000 * 60 * 60 * 24),
                  );

                  return (
                    <View key={task._id} style={styles.upcomingRow}>
                      <Text style={styles.eventIcon}>{cat.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventTitle}>{task.title}</Text>
                        <Text
                          style={[
                            styles.eventMeta,
                            isOverdue && { color: colors.error },
                          ]}
                        >
                          {isOverdue
                            ? `⚠️ ${Math.abs(daysDiff)}d overdue`
                            : daysDiff === 0
                              ? "📅 Due today"
                              : `📅 In ${daysDiff}d`}
                        </Text>
                      </View>
                      <View
                        style={[styles.priDot, { backgroundColor: pri.color }]}
                      />
                    </View>
                  );
                })}
            </Card>
          </View>
        )}
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
  todayBtn: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing["5xl"],
  },

  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.xl,
    color: colors.text,
  },

  statsRow: { flexDirection: "row", gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
  },

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

  eventCard: { gap: spacing.sm },
  eventRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  eventIcon: { fontSize: 22, width: 30, textAlign: "center", marginTop: 2 },
  eventTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  eventMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  exPreview: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  taskDone: { opacity: 0.6 },
  taskDoneText: { textDecorationLine: "line-through" },

  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  priDot: { width: 8, height: 8, borderRadius: 4 },
});
