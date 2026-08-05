/**
 * LineChartCard
 * Wraps react-native-gifted-charts LineChart with LockedIn design tokens.
 * Falls back to a styled "no data" state when data is empty.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - spacing["2xl"] * 2 - spacing.lg * 2;

interface DataPoint {
  value: number;
  label?: string;
}

interface LineChartCardProps {
  title: string;
  data: DataPoint[];
  color?: string;
  yAxisSuffix?: string;
  height?: number;
  emptyMessage?: string;
}

export const LineChartCard = React.memo(function LineChartCard({
  title,
  data,
  color = colors.accent,
  yAxisSuffix = "",
  height = 180,
  emptyMessage = "Log more sessions to see your trend",
}: LineChartCardProps) {
  // Lazy-require so the app doesn't crash if the package isn't installed yet
  const LineChart = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("react-native-gifted-charts").LineChart;
    } catch {
      return null;
    }
  }, []);

  const chartData = data.map((d) => ({
    value: d.value,
    label: d.label ?? "",
    dataPointColor: color,
    dataPointRadius: 4,
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {data.length < 2 ? (
        <View style={[styles.emptyState, { height }]}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : LineChart ? (
        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={CHART_WIDTH - 48}
            height={height}
            color={color}
            thickness={2.5}
            curved
            hideDataPoints={data.length > 30}
            dataPointsColor={color}
            dataPointsRadius={4}
            startFillColor={color}
            endFillColor={colors.background}
            startOpacity={0.25}
            endOpacity={0.0}
            areaChart
            xAxisColor={colors.border}
            yAxisColor={colors.border}
            yAxisTextStyle={{
              color: colors.textMuted,
              fontSize: 10,
              fontFamily: "Inter_400Regular",
            }}
            xAxisLabelTextStyle={{
              color: colors.textMuted,
              fontSize: 9,
              fontFamily: "Inter_400Regular",
            }}
            backgroundColor={colors.surface}
            rulesColor={colors.border}
            rulesType="solid"
            noOfSections={4}
            yAxisSuffix={yAxisSuffix}
            initialSpacing={16}
            spacing={(CHART_WIDTH - 80) / Math.max(data.length - 1, 1)}
            pointerConfig={{
              pointerStripHeight: height,
              pointerStripColor: colors.borderAccent,
              pointerStripWidth: 1,
              pointerColor: color,
              radius: 6,
              pointerLabelWidth: 80,
              pointerLabelHeight: 40,
              pointerLabelComponent: (items: any[]) => (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipValue}>
                    {items[0]?.value?.toFixed(1)}
                    {yAxisSuffix}
                  </Text>
                  <Text style={styles.tooltipLabel}>{items[0]?.label}</Text>
                </View>
              ),
            }}
          />
        </View>
      ) : (
        <View style={[styles.emptyState, { height }]}>
          <Text style={styles.emptyText}>
            Install react-native-gifted-charts to see chart
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    overflow: "hidden",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartWrapper: { marginLeft: -spacing.sm },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  tooltip: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    padding: spacing.xs,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  tooltipValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  tooltipLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: colors.textMuted,
  },
});
