import React, { useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/useAuth";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { api } from "../../api/client";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

const { width } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeatmapDay {
  date: string;
  hasActivity: boolean;
  workoutCount: number;
  focusMinutes: number;
}

interface Task {
  _id: string;
  title: string;
  category: string;
  completed: boolean;
  dueDate?: string;
}

// ─── Mini heatmap (last 12 weeks) ────────────────────────────────────────────

const MiniHeatmap = React.memo(function MiniHeatmap({
  data,
}: {
  data: HeatmapDay[];
}) {
  // Last 84 days = 12 weeks
  const days = data.slice(-84);
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View style={heatStyles.container}>
      {weeks.map((week, wi) => (
        <View key={wi} style={heatStyles.week}>
          {week.map((day, di) => (
            <View
              key={di}
              style={[
                heatStyles.cell,
                day.hasActivity && heatStyles.cellActive,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

const heatStyles = StyleSheet.create({
  container: { flexDirection: "row", gap: 3 },
  week: { gap: 3 },
  cell: {
    width: (width - spacing["2xl"] * 2 - spacing.lg * 2 - 3 * 11) / 12,
    aspectRatio: 1,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
  },
  cellActive: { backgroundColor: colors.accent },
});

// ─── Quick stat card ──────────────────────────────────────────────────────────

const StatCard = React.memo(function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[statStyles.card, accent && statStyles.cardAccent]}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={[statStyles.value, accent && statStyles.valueAccent]}>
        {value}
      </Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  cardAccent: {
    borderColor: colors.borderAccent,
    backgroundColor: colors.accentDim,
  },
  icon: { fontSize: 22 },
  value: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.xl,
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Heatmap data (last 365 days)
  const { data: heatmapData = [] } = useQuery<HeatmapDay[]>({
    queryKey: ["heatmap"],
    queryFn: () => api.get("/activity/heatmap"),
    // staleTime: 0 means the query is always considered stale, so it refetches
    // whenever the home tab comes into focus — ensuring today's workout/session
    // is immediately reflected without waiting for a 15-min cache window.
    staleTime: 0,
  });

  // Pending tasks (today only)
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks", "pending"],
    queryFn: () => api.get("/tasks?completed=false"),
    staleTime: 2 * 60 * 1000,
  });

  // Derived stats from heatmap
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayData = heatmapData.find((d) => d.date === today);

    // Streak: count consecutive active days from today backwards
    let streak = 0;
    const sorted = [...heatmapData].reverse();
    for (const d of sorted) {
      if (d.hasActivity) streak++;
      else break;
    }

    // Workouts this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStr = weekStart.toISOString().slice(0, 10);
    const workoutsThisWeek = heatmapData
      .filter((d) => d.date >= weekStr)
      .reduce((sum, d) => sum + d.workoutCount, 0);

    // Focus today
    const focusToday = todayData?.focusMinutes ?? 0;

    return { streak, workoutsThisWeek, focusToday };
  }, [heatmapData]);

  const pendingToday = tasks.slice(0, 3);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>
              {user?.name?.split(" ")[0] ?? "Athlete"} 👋
            </Text>
            <Text style={styles.date}>{todayLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push("/settings")}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* ─── Quick Stats ─────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="🔥"
            label="Day Streak"
            value={`${stats.streak}`}
            accent
          />
          <StatCard
            icon="💪"
            label="This Week"
            value={`${stats.workoutsThisWeek}`}
          />
          <StatCard
            icon="🧠"
            label="Focus Today"
            value={`${stats.focusToday}m`}
          />
        </View>

        {/* ─── Start Workout CTA ────────────────────────── */}
        <Card accent glow style={styles.ctaCard}>
          <View style={styles.ctaRow}>
            <View>
              <Text style={styles.ctaTitle}>Ready to train?</Text>
              <Text style={styles.ctaSubtitle}>
                Start or create a workout plan
              </Text>
            </View>
            <Button
              label="Start"
              onPress={() => router.push("/(tabs)/workout")}
              size="sm"
            />
          </View>
        </Card>

        {/* ─── Today's Tasks ────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Tasks</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/tasks")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {pendingToday.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No pending tasks — you're clear! 🎉
              </Text>
            </Card>
          ) : (
            pendingToday.map((task) => (
              <Card key={task._id} style={styles.taskCard}>
                <View style={styles.taskRow}>
                  <View style={styles.taskCheck} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Badge
                      label={task.category}
                      variant={task.category === "coding" ? "accent" : "muted"}
                    />
                  </View>
                </View>
              </Card>
            ))
          )}

          {/* Quick start session buttons */}
          <View style={styles.sessionButtons}>
            <TouchableOpacity
              style={styles.sessionBtn}
              onPress={() => router.push("/(tabs)/tasks")}
            >
              <Text style={styles.sessionBtnIcon}>📚</Text>
              <Text style={styles.sessionBtnLabel}>Study</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sessionBtn}
              onPress={() => router.push("/(tabs)/tasks")}
            >
              <Text style={styles.sessionBtnIcon}>💻</Text>
              <Text style={styles.sessionBtnLabel}>Coding</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sessionBtn}
              onPress={() => router.push("/(tabs)/tasks")}
            >
              <Text style={styles.sessionBtnIcon}>⏱️</Text>
              <Text style={styles.sessionBtnLabel}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Contribution heatmap ─────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity — Last 12 Weeks</Text>
          <Card style={styles.heatmapCard}>
            {heatmapData.length > 0 ? (
              <>
                <MiniHeatmap data={heatmapData} />
                <View style={styles.heatmapLegend}>
                  <Text style={styles.legendText}>Less</Text>
                  <View
                    style={[
                      styles.legendCell,
                      { backgroundColor: colors.surfaceAlt },
                    ]}
                  />
                  <View
                    style={[
                      styles.legendCell,
                      { backgroundColor: colors.accent },
                    ]}
                  />
                  <Text style={styles.legendText}>More</Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>
                Log workouts or sessions to see your heatmap
              </Text>
            )}
          </Card>
        </View>

        {/* ─── Quick shortcuts ──────────────────────────── */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push("/calendar")}
          >
            <Text style={styles.shortcutIcon}>📅</Text>
            <Text style={styles.shortcutLabel}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push("/timer")}
          >
            <Text style={styles.shortcutIcon}>🕛</Text>
            <Text style={styles.shortcutLabel}>Timer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push("/workout-history")}
          >
            <Text style={styles.shortcutIcon}>📋</Text>
            <Text style={styles.shortcutLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push("/ai")}
          >
            <Text style={styles.shortcutIcon}>🤖</Text>
            <Text style={styles.shortcutLabel}>AI Coach</Text>
          </TouchableOpacity>
        </View>

        {/* ─── AI Tip ───────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => router.push("/ai")}
          style={styles.aiTip}
        >
          <View style={styles.aiTipInner}>
            <Text style={styles.aiTipIcon}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTipTitle}>AI Coach</Text>
              <Text style={styles.aiTipSub}>
                Ask about your progress, plan next week's workout, and more →
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    padding: spacing["2xl"],
    paddingBottom: spacing["5xl"],
    gap: spacing.xl,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  name: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
    marginTop: 2,
  },
  date: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textFaint,
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  // Stats
  statsRow: { flexDirection: "row", gap: spacing.sm },

  // CTA
  ctaCard: {},
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  ctaSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Sections
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  seeAll: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.accent,
  },

  // Tasks
  taskCard: { marginBottom: 0 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  taskCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 2,
  },
  taskTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.base,
    color: colors.text,
    marginBottom: 4,
  },

  // Empty
  emptyCard: {},
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Session buttons
  sessionButtons: { flexDirection: "row", gap: spacing.sm },
  sessionBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  sessionBtnIcon: { fontSize: 22 },
  sessionBtnLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Heatmap
  heatmapCard: { overflow: "hidden" },
  heatmapLegend: {
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

  // AI tip
  aiTip: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    backgroundColor: colors.accentDim,
    overflow: "hidden",
  },
  aiTipInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  aiTipIcon: { fontSize: 28 },
  aiTipTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  aiTipSub: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  shortcutsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  shortcutIcon: { fontSize: 22 },
  shortcutLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
});
