import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - spacing["2xl"] * 2 - spacing.lg * 2;

interface BarDataPoint {
  value: number;
  label: string;
  frontColor?: string;
}

interface BarChartCardProps {
  title: string;
  data: BarDataPoint[];
  color?: string;
  height?: number;
  yAxisSuffix?: string;
  emptyMessage?: string;
}

export const BarChartCard = React.memo(function BarChartCard({
  title,
  data,
  color = colors.accent,
  height = 160,
  yAxisSuffix = "",
  emptyMessage = "Not enough data yet",
}: BarChartCardProps) {
  const BarChart = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("react-native-gifted-charts").BarChart;
    } catch {
      return null;
    }
  }, []);

  const chartData = data.map((d) => ({
    value: d.value,
    label: d.label,
    frontColor: d.frontColor ?? color,
    topLabelComponent: () => <Text style={styles.barLabel}>{d.value}</Text>,
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {data.length === 0 ? (
        <View style={[styles.emptyState, { height }]}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : BarChart ? (
        <View style={styles.chartWrapper}>
          <BarChart
            data={chartData}
            width={CHART_WIDTH - 48}
            height={height}
            barWidth={Math.min(
              32,
              (CHART_WIDTH - 80) / Math.max(data.length, 1) - 8,
            )}
            barBorderRadius={4}
            frontColor={color}
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
            noOfSections={4}
            yAxisSuffix={yAxisSuffix}
            initialSpacing={16}
            spacing={8}
            isAnimated
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
  barLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: colors.textMuted,
    textAlign: "center",
  },
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
});
