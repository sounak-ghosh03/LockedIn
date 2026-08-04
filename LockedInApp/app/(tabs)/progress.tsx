import React, { useState } from "react";
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
import { useSettingsStore } from "../../store/settingsStore";

type Range = "1W" | "1M" | "3M" | "ALL";

const METRICS = [
  {
    key: "weightKg",
    label: "Body Weight",
    unit: "kg",
    altUnit: "lbs",
    factor: 2.205,
    icon: "⚖️",
  },
  {
    key: "chest",
    label: "Chest",
    unit: "cm",
    altUnit: "in",
    factor: 0.394,
    icon: "📏",
  },
  {
    key: "arms",
    label: "Arms",
    unit: "cm",
    altUnit: "in",
    factor: 0.394,
    icon: "💪",
  },
  {
    key: "waist",
    label: "Waist",
    unit: "cm",
    altUnit: "in",
    factor: 0.394,
    icon: "🎯",
  },
  {
    key: "legs",
    label: "Legs",
    unit: "cm",
    altUnit: "in",
    factor: 0.394,
    icon: "🦵",
  },
  {
    key: "bodyFatPercent",
    label: "Body Fat",
    unit: "%",
    altUnit: "%",
    factor: 1,
    icon: "📊",
  },
] as const;

interface Measurement {
  _id: string;
  date: string;
  weightKg: number;
  bodyFatPercent: number;
  chest: number;
  arms: number;
  waist: number;
  legs: number;
}

export default function ProgressScreen() {
  const [range, setRange] = useState<Range>("1M");
  const [selectedMetric, setSelectedMetric] = useState<string>("weightKg");
  const units = useSettingsStore((s) => s.units);

  const { data: measurements = [] } = useQuery<Measurement[]>({
    queryKey: ["measurements", range],
    queryFn: () => {
      const from = new Date();
      if (range === "1W") from.setDate(from.getDate() - 7);
      else if (range === "1M") from.setMonth(from.getMonth() - 1);
      else if (range === "3M") from.setMonth(from.getMonth() - 3);
      const fromStr = range === "ALL" ? "" : `?from=${from.toISOString()}`;
      return api.get(`/measurements${fromStr}`);
    },
  });

  const metric = METRICS.find((m) => m.key === selectedMetric) ?? METRICS[0];
  const displayUnit = units === "imperial" ? metric.altUnit : metric.unit;

  const latest = measurements[0] as Measurement | undefined;
  const latestValue = latest
    ? +(
        (latest[metric.key as keyof Measurement] as number) *
        (units === "imperial" ? metric.factor : 1)
      ).toFixed(1)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Progress</Text>

        {/* Metric selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            {METRICS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.chip,
                  selectedMetric === m.key && styles.chipActive,
                ]}
                onPress={() => setSelectedMetric(m.key)}
              >
                <Text style={styles.chipIcon}>{m.icon}</Text>
                <Text
                  style={[
                    styles.chipLabel,
                    selectedMetric === m.key && styles.chipLabelActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Current value */}
        <Card accent>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text style={styles.metricValue}>
            {latestValue !== null ? `${latestValue} ${displayUnit}` : "—"}
          </Text>
          <Text style={styles.metricSub}>
            {latest
              ? new Date(latest.date).toLocaleDateString()
              : "No data yet"}
          </Text>
        </Card>

        {/* Range selector */}
        <View style={styles.rangeRow}>
          {(["1W", "1M", "3M", "ALL"] as Range[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
              onPress={() => setRange(r)}
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

        {/* Chart placeholder — Phase 4 will add Victory Native XL chart */}
        <Card style={styles.chartPlaceholder}>
          {measurements.length === 0 ? (
            <Text style={styles.muted}>
              Log your first measurement to see the chart
            </Text>
          ) : (
            <View>
              <Text style={styles.muted}>Chart coming in Phase 4 📈</Text>
              <Text style={[styles.muted, { marginTop: spacing.sm }]}>
                {measurements.length} data points logged
              </Text>
            </View>
          )}
        </Card>

        {/* History list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {measurements.slice(0, 10).map((m) => (
            <Card key={m._id} style={styles.histRow}>
              <Text style={styles.histDate}>
                {new Date(m.date).toLocaleDateString()}
              </Text>
              <Text style={styles.histValue}>
                {
                  +(
                    (m[metric.key as keyof Measurement] as number) *
                    (units === "imperial" ? metric.factor : 1)
                  ).toFixed(1)
                }{" "}
                {displayUnit}
              </Text>
            </Card>
          ))}
        </View>
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
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
  },
  chips: { flexDirection: "row", gap: spacing.sm, paddingRight: spacing.md },
  chip: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  chipIcon: { fontSize: 14 },
  chipLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipLabelActive: { color: colors.accent },
  metricLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  metricValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["3xl"],
    color: colors.text,
    marginTop: 4,
  },
  metricSub: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
    marginTop: 4,
  },
  rangeRow: { flexDirection: "row", gap: spacing.sm },
  rangeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  rangeBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  rangeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  rangeBtnTextActive: { color: colors.accent },
  chartPlaceholder: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { gap: spacing.sm },
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
  histRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  histDate: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  histValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
});
