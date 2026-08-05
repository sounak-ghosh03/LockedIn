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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { LineChartCard } from "../../components/charts/LineChartCard";
import { MiniStatRow } from "../../components/charts/StatWidgets";
import {
  useMeasurements,
  useLogMeasurement,
  MEASUREMENT_META,
  type MeasurementKey,
  type Measurement,
} from "../../api/queries/useMeasurements";
import { useSettingsStore } from "../../store/settingsStore";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

type Range = "1M" | "3M" | "6M" | "ALL";

const RANGE_DAYS: Record<Range, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  ALL: 3650,
};

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
        (payload as Record<string, unknown>)[meta.key] = parseFloat(raw);
        hasAny = true;
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
          <TouchableOpacity onPress={onClose}>
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

// ─── Main Progress Screen ─────────────────────────────────────────────────────

export default function ProgressScreen() {
  const [range, setRange] = useState<Range>("3M");
  const [selectedMetricKey, setSelectedMetricKey] =
    useState<MeasurementKey>("weightKg");
  const [showLogModal, setShowLogModal] = useState(false);
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

  // Latest and oldest in current range
  const sorted = useMemo(
    () => [...measurements].sort((a, b) => a.date.localeCompare(b.date)),
    [measurements],
  );
  const latest = sorted.at(-1);
  const oldest = sorted[0];

  // Convert to display unit
  const convertVal = useCallback(
    (val: number | undefined | null) => {
      if (val == null) return null;
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

  // Delta
  const delta = useMemo(() => {
    if (latestVal == null || oldestVal == null) return null;
    const diff = +(latestVal - oldestVal).toFixed(1);
    return diff >= 0 ? `+${diff} ${displayUnit}` : `${diff} ${displayUnit}`;
  }, [latestVal, oldestVal, displayUnit]);

  // Chart data
  const chartData = useMemo(
    () =>
      sorted.map((m) => ({
        value: convertVal(m[selectedMetricKey] as number) ?? 0,
        label: m.date.slice(5), // MM-DD
      })),
    [sorted, selectedMetricKey, convertVal],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Log modal */}
      <LogMeasurementModal
        visible={showLogModal}
        onClose={() => setShowLogModal(false)}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Button
            label="+ Log"
            size="sm"
            onPress={() => setShowLogModal(true)}
          />
        </View>

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
                  onPress={() => setSelectedMetricKey(meta.key)}
                >
                  <Text style={styles.metricIcon}>{meta.icon}</Text>
                  <Text
                    style={[
                      styles.metricLabel,
                      active && { color: meta.color },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Current stat hero */}
        <Card accent style={{ borderColor: selectedMeta.color + "40" }}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroLabel}>{selectedMeta.label}</Text>
              <Text style={[styles.heroValue, { color: selectedMeta.color }]}>
                {latestVal != null ? `${latestVal} ${displayUnit}` : "—"}
              </Text>
              {latest && (
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

        {/* Range selector */}
        <View style={styles.rangeRow}>
          {(["1M", "3M", "6M", "ALL"] as Range[]).map((r) => (
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

        {/* Line chart */}
        <LineChartCard
          title={`${selectedMeta.label} — ${range}`}
          data={chartData}
          color={selectedMeta.color}
          yAxisSuffix={` ${displayUnit}`}
          height={180}
        />

        {/* All metrics summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Metrics (Latest)</Text>
          <Card>
            {MEASUREMENT_META.map((meta, i) => {
              const val = latest
                ? convertVal(latest[meta.key] as number)
                : null;
              const prevVal =
                sorted.length >= 2
                  ? convertVal(sorted.at(-2)![meta.key] as number)
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
          <Text style={styles.sectionTitle}>History</Text>
          {isLoading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : sorted.length === 0 ? (
            <Card>
              <Text style={styles.muted}>
                No measurements yet — tap "+ Log" to start tracking
              </Text>
            </Card>
          ) : (
            sorted
              .slice()
              .reverse()
              .slice(0, 20)
              .map((m) => (
                <Card key={m._id} style={styles.histCard}>
                  <View style={styles.histHeader}>
                    <Text style={styles.histDate}>
                      {new Date(m.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
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
              ))
          )}
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

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
  },

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
});
