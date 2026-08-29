import React, { useMemo, useRef, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../auth/useAuth";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { SectionHeader } from "../../components/ui/SectionHeader";
import {
  SkeletonStatRow,
  SkeletonCard,
} from "../../components/ui/SkeletonLoader";
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

// ─── Animated count-up number ─────────────────────────────────────────────────

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const displayRef = useRef(0);
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: value,
      duration: 800,
      useNativeDriver: false,
    }).start();

    const id = animVal.addListener(({ value: v }) => {
      const rounded = Math.round(v);
      if (rounded !== displayRef.current) {
        displayRef.current = rounded;
        setDisplay(rounded);
      }
    });
    return () => animVal.removeListener(id);
  }, [value, animVal]);

  return (
    <Text style={countStyles.value}>
      {display}
      {suffix}
    </Text>
  );
}

const countStyles = StyleSheet.create({
  value: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.xl,
    color: colors.text,
  },
});

// ─── Mini heatmap (last 12 weeks) ────────────────────────────────────────────
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]; // JS getDay(): 0=Sun … 6=Sat

const MiniHeatmap = React.memo(function MiniHeatmap({
  data,
}: {
  data: HeatmapDay[];
}) {
  const days = data.slice(-84);
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Row 0 isn't necessarily Sunday — the 84-day window can start on any
  // weekday. Rotate the label list to match whatever the first day actually
  // is, so the letters line up correctly with the grid.
  const startDow = days.length ? new Date(days[0].date).getDay() : 0;
  const rowLabels = Array.from(
    { length: 7 },
    (_, r) => DAY_LETTERS[(startDow + r) % 7],
  );

  const getColor = (day: HeatmapDay) => {
    if (!day.hasActivity) return colors.surfaceAlt;
    const intensity = Math.min(
      1,
      day.workoutCount * 0.5 + day.focusMinutes / 120,
    );
    if (intensity < 0.4) return "#802600";
    if (intensity < 0.7) return "#C13D00";
    return colors.accent;
  };

  return (
    <View style={heatStyles.row}>
      <View style={heatStyles.labelColumn}>
        {rowLabels.map((label, i) => (
          <Text key={i} style={heatStyles.dayLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={heatStyles.container}>
        {weeks.map((week, wi) => (
          <View key={wi} style={heatStyles.week}>
            {week.map((day, di) => (
              <View
                key={di}
                style={[heatStyles.cell, { backgroundColor: getColor(day) }]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

const CELL_SIZE = Math.max(
  8,
  (width - spacing["2xl"] * 2 - spacing.lg * 2 - 3 * 11) / 12,
);

const heatStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  labelColumn: { gap: 3 },
  dayLabel: {
    width: 12,
    height: CELL_SIZE,
    lineHeight: CELL_SIZE,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: colors.textFaint,
  },
  container: { flexDirection: "row", gap: 3 },
  week: { gap: 3 },
  cell: {
    width: CELL_SIZE,
    aspectRatio: 1,
    borderRadius: 2,
  },
});

// ─── Quick stat card ──────────────────────────────────────────────────────────

const StatCard = React.memo(function StatCard({
  icon,
  label,
  value,
  suffix = "",
  accent,
}: {
  icon: string;
  label: string;
  value: number;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <View style={[statStyles.card, accent && statStyles.cardAccent]}>
      <Text style={statStyles.icon}>{icon}</Text>
      <CountUp value={value} suffix={suffix} />
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
  icon: { fontSize: 20 },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
});

// ─── Quick shortcut card ──────────────────────────────────────────────────────

const ShortcutCard = React.memo(function ShortcutCard({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <TouchableOpacity
      style={shortcutStyles.card}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          alignItems: "center",
          gap: spacing.xs,
        }}
      >
        <Text style={shortcutStyles.icon}>{icon}</Text>
        <Text style={shortcutStyles.label}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

const shortcutStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  icon: { fontSize: 24 },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
});

// ─── Avatar initial chip ──────────────────────────────────────────────────────

function AvatarChip({
  name,
  onPress,
}: {
  name: string | undefined;
  onPress: () => void;
}) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <TouchableOpacity
      style={avatarStyles.chip}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.8}
    >
      <Text style={avatarStyles.initial}>{initial}</Text>
    </TouchableOpacity>
  );
}

const avatarStyles = StyleSheet.create({
  chip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  initial: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
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

  const { data: heatmapData = [], isLoading: heatLoading } = useQuery<
    HeatmapDay[]
  >({
    queryKey: ["heatmap"],
    queryFn: () => api.get("/activity/heatmap"),
    staleTime: 0,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks", "pending"],
    queryFn: () => api.get("/tasks?completed=false"),
    staleTime: 2 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayData = heatmapData.find((d) => d.date === today);

    let streak = 0;
    const sorted = [...heatmapData].reverse();
    for (const d of sorted) {
      if (d.hasActivity) streak++;
      else break;
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStr = weekStart.toISOString().slice(0, 10);
    const workoutsThisWeek = heatmapData
      .filter((d) => d.date >= weekStr)
      .reduce((sum, d) => sum + d.workoutCount, 0);

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
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {greeting}, {user?.name?.split(" ")[0] ?? "Athlete"} 👋
            </Text>
            <Text style={styles.date}>{todayLabel}</Text>
          </View>
          <AvatarChip
            name={user?.name}
            onPress={() => router.push("/settings")}
          />
        </View>

        {/* ─── Quick Stats ─────────────────────────────── */}
        {heatLoading ? (
          <SkeletonStatRow />
        ) : (
          <View style={styles.statsRow}>
            <StatCard
              icon="🔥"
              label="Day Streak"
              value={stats.streak}
              accent
            />
            <StatCard
              icon="💪"
              label="Workouts"
              value={stats.workoutsThisWeek}
            />
            <StatCard
              icon="🧠"
              label="Focus"
              value={stats.focusToday}
              suffix="m"
            />
          </View>
        )}

        {/* ─── Start Workout CTA ────────────────────────── */}
        <Card accent glow style={styles.ctaCard}>
          <View style={styles.ctaRow}>
            <View style={{ flex: 1 }}>
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
          <SectionHeader
            title="Today's Tasks"
            actionLabel="See all"
            onAction={() => router.push("/(tabs)/tasks")}
          />

          {tasksLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : pendingToday.length === 0 ? (
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
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textFaint}
                  />
                </View>
              </Card>
            ))
          )}
        </View>

        {/* ─── Quick shortcuts ──────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Quick Access" />
          <View style={styles.shortcutsRow}>
            <ShortcutCard
              icon="📅"
              label="Calendar"
              onPress={() => router.push("/calendar")}
            />
            <ShortcutCard
              icon="⏱️"
              label="Timer"
              onPress={() => router.push("/timer")}
            />
            <ShortcutCard
              icon="📋"
              label="History"
              onPress={() => router.push("/workout-history")}
            />
            <ShortcutCard
              icon="🤖"
              label="AI Coach"
              onPress={() => router.push("/ai")}
            />
          </View>
        </View>

        {/* ─── Contribution heatmap ─────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Activity — Last 12 Weeks" />
          <Card style={styles.heatmapCard}>
            {heatLoading ? (
              <SkeletonCard style={{ height: 70 }} />
            ) : heatmapData.length > 0 ? (
              <>
                <MiniHeatmap data={heatmapData} />
                <View style={styles.heatmapLegend}>
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
              <Text style={styles.emptyText}>
                Log workouts or sessions to see your heatmap
              </Text>
            )}
          </Card>
        </View>

        {/* ─── AI Coach banner ──────────────────────────── */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/ai");
          }}
          style={styles.aiTip}
          activeOpacity={0.82}
        >
          <View style={styles.aiTipInner}>
            <Text style={styles.aiTipIcon}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTipTitle}>AI Coach</Text>
              <Text style={styles.aiTipSub}>
                Ask about progress, plan next week's workout →
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
    gap: spacing["2xl"],
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  greeting: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
  },
  date: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Stats
  statsRow: { flexDirection: "row", gap: spacing.sm },

  // CTA
  ctaCard: {},
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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

  // Tasks
  taskCard: { marginBottom: 0 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  taskCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
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

  // Shortcuts
  shortcutsRow: {
    flexDirection: "row",
    gap: spacing.sm,
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
  aiTipIcon: { fontSize: 26 },
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
});
