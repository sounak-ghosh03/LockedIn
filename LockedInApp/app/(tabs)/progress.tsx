import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { ErrorBoundary } from "../../components/ui/ErrorBoundary";
import {
  SkeletonCard,
  SkeletonStatRow,
} from "../../components/ui/SkeletonLoader";
import { LineChartCard } from "../../components/charts/LineChartCard";
import { BarChartCard } from "../../components/charts/BarChartCard";
import { MiniStatRow } from "../../components/charts/StatWidgets";
import {
  useMeasurements,
  useLogMeasurement,
  MEASUREMENT_META,
  type MeasurementKey,
  type Measurement,
} from "../../api/queries/useMeasurements";
import { useWorkoutSessions } from "../../api/queries/useWorkoutSessions";
import { api } from "../../api/client";
import { useSettingsStore } from "../../store/settingsStore";
import {
  getVolumeHistory,
  getWeeklyFrequency,
  extractPRs,
  extractPRHistory,
  muscleGroupFrequency,
} from "../../utils/analyticsHelpers";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

type Range = "1M" | "3M" | "6M" | "ALL";
type ScreenTab = "progress" | "analytics";

const RANGE_DAYS: Record<Range, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  ALL: 3650,
};

// Fire-and-forget haptics — never let a rejected promise (e.g. no haptics
// hardware on this device/simulator) turn into an unhandled rejection.
function tapHaptic(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
) {
  Haptics.impactAsync(style).catch(() => {});
}

// ─── Log Measurement Modal ────────────────────────────────────────────────────

interface LogMeasurementModalProps {
  visible: boolean;
  onClose: () => void;
}

function LogMeasurementModal({ visible, onClose }: LogMeasurementModalProps) {
  const logMeasurement = useLogMeasurement();
  const [values, setValues] = useState<Partial<Record<MeasurementKey, string>>>(
    {},
  );

  const handleSave = useCallback(() => {
    const payload: Partial<Omit<Measurement, "_id">> = {
      date: new Date().toISOString(),
    };
    let hasAny = false;
    for (const meta of MEASUREMENT_META) {
      const raw = values[meta.key];
      if (raw && raw.trim() !== "") {
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) {
          (payload as Record<string, unknown>)[meta.key] = parsed;
          hasAny = true;
        }
      }
    }
    if (!hasAny) {
      Alert.alert("Nothing entered", "Enter at least one measurement value.");
      return;
    }
    logMeasurement.mutate(payload as Omit<Measurement, "_id">, {
      onSuccess: () => {
        setValues({});
        onClose();
      },
    });
  }, [values, logMeasurement, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={modalStyles.container} edges={["top", "bottom"]}>
        <View style={modalStyles.header}>
          <TouchableOpacity
            onPress={() => {
              tapHaptic();
              onClose();
            }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={modalStyles.title}>Log Measurements</Text>
          <Button
            label="Save"
            size="sm"
            loading={logMeasurement.isPending}
            onPress={handleSave}
          />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={modalStyles.content}>
            <Text style={modalStyles.dateLabel}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>

            {MEASUREMENT_META.map((meta) => (
              <View key={meta.key} style={modalStyles.fieldRow}>
                <View style={modalStyles.fieldLeft}>
                  <Text style={modalStyles.fieldIcon}>{meta.icon}</Text>
                  <View>
                    <Text style={modalStyles.fieldLabel}>{meta.label}</Text>
                    <Text style={modalStyles.fieldUnit}>{meta.unit}</Text>
                  </View>
                </View>
                <TextInput
                  style={modalStyles.input}
                  value={values[meta.key] ?? ""}
                  onChangeText={(v) =>
                    setValues((prev) => ({ ...prev, [meta.key]: v }))
                  }
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={colors.textFaint}
                  selectTextOnFocus
                />
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
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
    padding: spacing["2xl"],
    gap: spacing.sm,
    paddingBottom: spacing["5xl"],
  },
  dateLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  fieldIcon: { fontSize: 22, width: 30, textAlign: "center" },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  fieldUnit: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    padding: spacing.md,
    width: 100,
    textAlign: "center",
  },
});

// ─── Heatmap component ────────────────────────────────────────────────────────

interface HeatmapDay {
  date: string;
  hasActivity: boolean;
  workoutCount: number;
  focusMinutes: number;
}

const FullHeatmap = React.memo(function FullHeatmap({
  data,
  cellSize,
  onSelectDay,
}: {
  data: HeatmapDay[];
  cellSize: number;
  onSelectDay: (d: HeatmapDay | null) => void;
}) {
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const getColor = (d: HeatmapDay) => {
    if (!d?.hasActivity) return colors.surfaceAlt;
    const intensity = Math.min(
      1,
      (d.workoutCount ?? 0) * 0.5 + (d.focusMinutes ?? 0) / 120,
    );
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
                style={[
                  styles.heatCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: getColor(day),
                  },
                ]}
                onPress={() => {
                  tapHaptic();
                  onSelectDay(day);
                }}
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
  const dateObj = date ? new Date(date) : null;
  const dateLabel =
    dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : "—";
  return (
    <View style={styles.prItem}>
      <Text style={styles.prMedal}>{medal}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.prName}>{name}</Text>
        <Text style={styles.prMeta}>
          {bestWeightKg} kg × {bestReps} reps · {dateLabel}
        </Text>
      </View>
      <View style={styles.pr1RMBadge}>
        <Text style={styles.pr1RMLabel}>Est. 1RM</Text>
        <Text style={styles.pr1RMValue}>{best1RM} kg</Text>
      </View>
    </View>
  );
});

// ─── Stat box ─────────────────────────────────────────────────────────────────

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

// ─── Progress tab content ─────────────────────────────────────────────────────

function ProgressContent() {
  const [range, setRange] = useState<Range>("3M");
  const [selectedMetricKey, setSelectedMetricKey] =
    useState<MeasurementKey>("weightKg");
  const units = useSettingsStore((s) => s.units);

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - RANGE_DAYS[range]);
    return d.toISOString().slice(0, 10);
  }, [range]);

  const { data: measurements = [], isLoading } = useMeasurements(
    range === "ALL" ? undefined : fromDate,
  );

  const selectedMeta =
    MEASUREMENT_META.find((m) => m.key === selectedMetricKey) ??
    MEASUREMENT_META[0];

  const sorted = useMemo(
    () =>
      [...measurements]
        .filter((m) => !!m?.date)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [measurements],
  );
  // Avoid Array.prototype.at() — not guaranteed available on older Hermes builds.
  const latest = sorted.length ? sorted[sorted.length - 1] : undefined;
  const oldest = sorted.length ? sorted[0] : undefined;

  const convertVal = useCallback(
    (val: number | undefined | null) => {
      if (val == null || Number.isNaN(val)) return null;
      const converted = units === "imperial" ? val * selectedMeta.factor : val;
      return +converted.toFixed(1);
    },
    [units, selectedMeta],
  );

  const latestVal = latest
    ? convertVal(latest[selectedMetricKey] as number)
    : null;
  const oldestVal =
    oldest && oldest !== latest
      ? convertVal(oldest[selectedMetricKey] as number)
      : null;
  const displayUnit =
    units === "imperial" ? selectedMeta.altUnit : selectedMeta.unit;

  const delta = useMemo(() => {
    if (latestVal == null || oldestVal == null) return null;
    const diff = +(latestVal - oldestVal).toFixed(1);
    return diff >= 0 ? `+${diff} ${displayUnit}` : `${diff} ${displayUnit}`;
  }, [latestVal, oldestVal, displayUnit]);

  const chartData = useMemo(
    () =>
      sorted.map((m) => ({
        value: convertVal(m[selectedMetricKey] as number) ?? 0,
        label: m.date.slice(5),
      })),
    [sorted, selectedMetricKey, convertVal],
  );

  return (
    <>
      {/* Metric selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.metricChips}>
          {MEASUREMENT_META.map((meta) => {
            const active = meta.key === selectedMetricKey;
            return (
              <TouchableOpacity
                key={meta.key}
                style={[
                  styles.metricChip,
                  active && {
                    borderColor: meta.color,
                    backgroundColor: meta.color + "15",
                  },
                ]}
                onPress={() => {
                  tapHaptic();
                  setSelectedMetricKey(meta.key);
                }}
              >
                <Text style={styles.metricIcon}>{meta.icon}</Text>
                <Text
                  style={[styles.metricLabel, active && { color: meta.color }]}
                >
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Current stat hero */}
      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card accent style={{ borderColor: selectedMeta.color + "40" }}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroLabel}>{selectedMeta.label}</Text>
              <Text style={[styles.heroValue, { color: selectedMeta.color }]}>
                {latestVal != null ? `${latestVal} ${displayUnit}` : "—"}
              </Text>
              {latest?.date && !isNaN(new Date(latest.date).getTime()) && (
                <Text style={styles.heroDate}>
                  {new Date(latest.date).toLocaleDateString()}
                </Text>
              )}
            </View>
            {delta && (
              <View
                style={[
                  styles.deltaBadge,
                  { backgroundColor: selectedMeta.color + "15" },
                ]}
              >
                <Text style={[styles.deltaText, { color: selectedMeta.color }]}>
                  {delta}
                </Text>
                <Text style={styles.deltaRangeText}>last {range}</Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Range selector — pill segmented control */}
      <View style={styles.rangeSegment}>
        {(["1M", "3M", "6M", "ALL"] as Range[]).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
            onPress={() => {
              tapHaptic();
              setRange(r);
            }}
          >
            <Text
              style={[
                styles.rangeBtnText,
                range === r && styles.rangeBtnTextActive,
              ]}
            >
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Line chart */}
      {isLoading ? (
        <SkeletonCard style={{ height: 180 }} />
      ) : (
        <LineChartCard
          title={`${selectedMeta.label} — ${range}`}
          data={chartData}
          color={selectedMeta.color}
          yAxisSuffix={` ${displayUnit}`}
          height={180}
        />
      )}

      {/* All metrics summary */}
      <View style={styles.section}>
        <SectionHeader title="All Metrics (Latest)" />
        <Card>
          {MEASUREMENT_META.map((meta) => {
            const val = latest ? convertVal(latest[meta.key] as number) : null;
            const prevVal =
              sorted.length >= 2
                ? convertVal(sorted[sorted.length - 2][meta.key] as number)
                : null;
            let deltaStr: string | undefined;
            if (val != null && prevVal != null) {
              const diff = +(val - prevVal).toFixed(1);
              deltaStr = diff >= 0 ? `+${diff}` : `${diff}`;
            }
            const unit = units === "imperial" ? meta.altUnit : meta.unit;
            return (
              <MiniStatRow
                key={meta.key}
                label={`${meta.icon} ${meta.label}`}
                value={val != null ? `${val} ${unit}` : "—"}
                delta={deltaStr ? `${deltaStr} ${unit}` : undefined}
                deltaPositiveGood={
                  meta.key !== "bodyFatPercent" && meta.key !== "waist"
                }
              />
            );
          })}
        </Card>
      </View>

      {/* History */}
      <View style={styles.section}>
        <SectionHeader title="History" />
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : sorted.length === 0 ? (
          <Card>
            <Text style={styles.muted}>
              No measurements yet — tap "＋ Log" to start tracking
            </Text>
          </Card>
        ) : (
          sorted
            .slice()
            .reverse()
            .slice(0, 20)
            .map((m) => {
              const dateObj = new Date(m.date);
              const dateLabel = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "—";
              return (
                <Card key={m._id} style={styles.histCard}>
                  <View style={styles.histHeader}>
                    <Text style={styles.histDate}>{dateLabel}</Text>
                  </View>
                  <View style={styles.histMetrics}>
                    {MEASUREMENT_META.filter(
                      (mt) => m[mt.key] != null && (m[mt.key] as number) > 0,
                    ).map((mt) => {
                      const val = convertVal(m[mt.key] as number);
                      const unit = units === "imperial" ? mt.altUnit : mt.unit;
                      return (
                        <View key={mt.key} style={styles.histMetric}>
                          <Text style={styles.histMetricIcon}>{mt.icon}</Text>
                          <Text style={styles.histMetricVal}>
                            {val} {unit}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              );
            })
        )}
      </View>
    </>
  );
}

// ─── Analytics tab content ────────────────────────────────────────────────────

function AnalyticsContent({ cellSize }: { cellSize: number }) {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const [prLimit, setPrLimit] = useState(5);
  const [selectedPRExercise, setSelectedPRExercise] = useState<string | null>(
    null,
  );

  const { data: heatmapData = [], isLoading: heatLoading } = useQuery<
    HeatmapDay[]
  >({
    queryKey: ["heatmap"],
    queryFn: () => api.get("/activity/heatmap"),
    staleTime: 15 * 60 * 1000,
  });

  const { data: sessions = [], isLoading: sessionsLoading } =
    useWorkoutSessions({ limit: 200 });

  const volumeHistory = useMemo(() => getVolumeHistory(sessions), [sessions]);
  const weeklyFrequency = useMemo(
    () => getWeeklyFrequency(sessions),
    [sessions],
  );
  const prRecords = useMemo(() => extractPRs(sessions), [sessions]);
  const topExercises = useMemo(
    () => muscleGroupFrequency(sessions),
    [sessions],
  );
  const prHistory = useMemo(() => extractPRHistory(sessions), [sessions]);

  // Select the first PR exercise by default
  const defaultPRExercise = prRecords[0]?.exerciseName ?? null;
  const activePRExercise = selectedPRExercise ?? defaultPRExercise;
  const prHistoryData = activePRExercise
    ? (prHistory[activePRExercise] ?? [])
    : [];

  const stats = useMemo(() => {
    let streak = 0;
    const reversed = [...heatmapData].reverse();
    for (const d of reversed) {
      if (d?.hasActivity) streak++;
      else break;
    }
    let longest = 0,
      current = 0;
    for (const d of heatmapData) {
      if (d?.hasActivity) {
        current++;
        longest = Math.max(longest, current);
      } else current = 0;
    }
    const yearStart = new Date().getFullYear() + "-01-01";
    const activeDays = heatmapData.filter(
      (d) => d?.date >= yearStart && d?.hasActivity,
    ).length;
    const totalVolumeTonnes =
      sessions.reduce((s, w) => s + (w?.totalVolumeKg ?? 0), 0) / 1000;
    const avgDuration = sessions.length
      ? Math.round(
          sessions.reduce((s, w) => s + (w?.durationMinutes ?? 0), 0) /
            sessions.length,
        )
      : 0;
    return { streak, longest, activeDays, totalVolumeTonnes, avgDuration };
  }, [heatmapData, sessions]);

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

  const isLoading = heatLoading || sessionsLoading;

  return (
    <>
      {/* Streak stat grid */}
      {isLoading ? (
        <SkeletonStatRow />
      ) : (
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
      )}

      {/* Full-year heatmap */}
      <View style={styles.section}>
        <SectionHeader title="Yearly Activity" />
        <Card style={{ overflow: "hidden" }}>
          {isLoading ? (
            <View style={{ height: 80 }}>
              <SkeletonCard />
            </View>
          ) : heatmapData.length > 0 ? (
            <>
              <FullHeatmap
                data={heatmapData}
                cellSize={cellSize}
                onSelectDay={setSelectedDay}
              />
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

        {/* Day detail tooltip */}
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
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </View>

      {/* Volume trend */}
      {isLoading ? (
        <SkeletonCard style={{ height: 160 }} />
      ) : (
        <LineChartCard
          title="Volume Trend — Last 30 Workouts"
          data={volumeChartData}
          color={colors.accent}
          yAxisSuffix=" kg"
          height={160}
          emptyMessage="Complete workouts to see your volume trend"
        />
      )}

      {/* Weekly frequency */}
      {isLoading ? (
        <SkeletonCard style={{ height: 140 }} />
      ) : (
        <BarChartCard
          title="Workouts per Week — Last 12 Weeks"
          data={freqChartData}
          color={colors.accentSoft}
          height={140}
          emptyMessage="Log workouts to see frequency"
        />
      )}

      {/* ─── PR Over Time ─────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="PR Progress Over Time 📈" />
        {prRecords.length === 0 ? (
          <Card>
            <Text style={styles.muted}>
              Complete sets in workouts to track your 1RM progress over time.
            </Text>
          </Card>
        ) : (
          <>
            {/* Exercise selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.metricChips}>
                {prRecords.slice(0, 10).map((pr) => (
                  <TouchableOpacity
                    key={pr.exerciseId}
                    style={[
                      styles.metricChip,
                      activePRExercise === pr.exerciseName && {
                        borderColor: colors.accent,
                        backgroundColor: colors.accentDim,
                      },
                    ]}
                    onPress={() => {
                      tapHaptic();
                      setSelectedPRExercise(pr.exerciseName);
                    }}
                  >
                    <Text
                      style={[
                        styles.metricLabel,
                        activePRExercise === pr.exerciseName && {
                          color: colors.accent,
                        },
                      ]}
                    >
                      {pr.exerciseName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Line chart for selected exercise */}
            {prHistoryData.length > 1 ? (
              <LineChartCard
                title={`${activePRExercise} — Est. 1RM History`}
                data={prHistoryData}
                color={colors.accent}
                yAxisSuffix=" kg"
                height={160}
              />
            ) : (
              <Card>
                <Text style={styles.muted}>
                  {prHistoryData.length <= 1
                    ? "Log more sessions with this exercise to see a trend."
                    : "Select an exercise above."}
                </Text>
              </Card>
            )}
          </>
        )}
      </View>

      {/* Personal Records */}
      <View style={styles.section}>
        <SectionHeader title="Personal Records 🏆" />
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
                onPress={() => {
                  tapHaptic();
                  setPrLimit((n) => n + 5);
                }}
              >
                <Text style={styles.showMoreText}>
                  Show {Math.min(5, prRecords.length - prLimit)} more PRs
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        )}
      </View>

      {/* Top exercises */}
      {topExercises.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Most Logged Exercises" />
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
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const [screenTab, setScreenTab] = useState<ScreenTab>("progress");
  const [showLogModal, setShowLogModal] = useState(false);

  // Recompute from live window dimensions (not a module-level constant) and
  // clamp to a sane minimum so a small/foldable/split-screen width can never
  // produce a negative or NaN cell size — that was crashing the native layout
  // engine (Yoga) whenever the Analytics heatmap rendered.
  const { width } = useWindowDimensions();
  const cellSize = useMemo(() => {
    const raw = Math.floor(
      (width - spacing["2xl"] * 2 - spacing.lg * 2 - 3 * 11) / 12,
    );
    return Math.max(8, Number.isFinite(raw) ? raw : 8);
  }, [width]);

  const handleTabChange = (tab: ScreenTab) => {
    tapHaptic();
    setScreenTab(tab);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Log modal — mounted only while open, so its hooks/JSX can't throw
          while the screen is just sitting on "Body Metrics" or "Analytics". */}
      {showLogModal && (
        <LogMeasurementModal
          visible={showLogModal}
          onClose={() => setShowLogModal(false)}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {screenTab === "progress" ? "Progress" : "Analytics"}
        </Text>
        {screenTab === "progress" && (
          <Button
            label="+ Log"
            size="sm"
            icon="add-outline"
            onPress={() => {
              tapHaptic(Haptics.ImpactFeedbackStyle.Medium);
              setShowLogModal(true);
            }}
          />
        )}
      </View>

      {/* Internal tab switcher */}
      <View style={styles.internalTabBar}>
        <TouchableOpacity
          style={[
            styles.internalTab,
            screenTab === "progress" && styles.internalTabActive,
          ]}
          onPress={() => handleTabChange("progress")}
        >
          <Ionicons
            name="trending-up-outline"
            size={15}
            color={screenTab === "progress" ? colors.accent : colors.textMuted}
          />
          <Text
            style={[
              styles.internalTabText,
              screenTab === "progress" && styles.internalTabTextActive,
            ]}
          >
            Body Metrics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.internalTab,
            screenTab === "analytics" && styles.internalTabActive,
          ]}
          onPress={() => handleTabChange("analytics")}
        >
          <Ionicons
            name="stats-chart-outline"
            size={15}
            color={screenTab === "analytics" ? colors.accent : colors.textMuted}
          />
          <Text
            style={[
              styles.internalTabText,
              screenTab === "analytics" && styles.internalTabTextActive,
            ]}
          >
            Workout Analytics
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {screenTab === "progress" ? (
          <ErrorBoundary>
            <ProgressContent />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary>
            <AnalyticsContent cellSize={cellSize} />
          </ErrorBoundary>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing["2xl"],
    gap: spacing.xl,
    paddingBottom: spacing["5xl"],
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
  },

  // Internal tab bar
  internalTabBar: {
    flexDirection: "row",
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    padding: 3,
    marginBottom: spacing.md,
  },
  internalTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  internalTabActive: { backgroundColor: colors.surface },
  internalTabText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  internalTabTextActive: {
    color: colors.accent,
    fontFamily: "Inter_600SemiBold",
  },

  // Metric chips
  metricChips: { flexDirection: "row", gap: spacing.sm },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricIcon: { fontSize: 14 },
  metricLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Hero
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  heroValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["3xl"],
    marginTop: 2,
  },
  heroDate: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
    marginTop: 2,
  },
  deltaBadge: {
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  deltaText: { fontFamily: "Outfit_700Bold", fontSize: fontSize.lg },
  deltaRangeText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Range segmented control
  rangeSegment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    padding: 3,
    gap: 0,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
  },
  rangeBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  rangeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  rangeBtnTextActive: { color: colors.accent },

  // Sections
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

  // History
  histCard: { gap: spacing.sm },
  histHeader: { flexDirection: "row", justifyContent: "space-between" },
  histDate: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  histMetrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  histMetric: { flexDirection: "row", alignItems: "center", gap: 4 },
  histMetricIcon: { fontSize: 14 },
  histMetricVal: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Analytics
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },

  heatCell: { borderRadius: 2 },
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

  // PR
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
