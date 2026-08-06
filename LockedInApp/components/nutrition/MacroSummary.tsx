import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontSize, spacing } from "../../constants/theme";

interface MacroRingProps {
  calories: number;
  goalCalories: number;
  protein: number;
  goalProtein: number;
  carbs: number;
  goalCarbs: number;
  fat: number;
  goalFat: number;
  size?: number;
}

interface ArcData {
  percent: number;
  color: string;
}

/**
 * Simple SVG-free macro summary using stacked progress bars.
 * A true SVG arc would require react-native-svg, this uses a
 * linearized bar design that perfectly matches the dark theme.
 */
export const MacroSummary = React.memo(function MacroSummary({
  calories,
  goalCalories,
  protein,
  goalProtein,
  carbs,
  goalCarbs,
  fat,
  goalFat,
}: MacroRingProps) {
  const calsPercent =
    goalCalories > 0 ? Math.min(100, (calories / goalCalories) * 100) : 0;
  const remaining = Math.max(0, goalCalories - calories);
  const overGoal = calories > goalCalories;

  const macros = [
    {
      label: "Protein",
      value: protein,
      goal: goalProtein,
      color: "#007AFF",
      unit: "g",
    },
    {
      label: "Carbs",
      value: carbs,
      goal: goalCarbs,
      color: "#FF9500",
      unit: "g",
    },
    { label: "Fat", value: fat, goal: goalFat, color: "#AF52DE", unit: "g" },
  ];

  return (
    <View style={styles.container}>
      {/* Calorie hero */}
      <View style={styles.calHero}>
        <View style={styles.calLeft}>
          <Text style={styles.calValue}>{calories.toFixed(0)}</Text>
          <Text style={styles.calLabel}>kcal eaten</Text>
        </View>
        <View style={styles.calDivider} />
        <View style={styles.calRight}>
          <Text
            style={[styles.calRemaining, overGoal && { color: colors.error }]}
          >
            {overGoal
              ? `+${(calories - goalCalories).toFixed(0)}`
              : remaining.toFixed(0)}
          </Text>
          <Text style={styles.calLabel}>
            {overGoal ? "over goal" : "remaining"}
          </Text>
        </View>
      </View>

      {/* Calorie progress bar */}
      <View style={styles.calBar}>
        <View
          style={[
            styles.calBarFill,
            {
              width: `${calsPercent}%` as any,
              backgroundColor: overGoal ? colors.error : colors.accent,
            },
          ]}
        />
      </View>
      <Text style={styles.calGoal}>Goal: {goalCalories} kcal</Text>

      {/* Macro bars */}
      <View style={styles.macroRow}>
        {macros.map((m) => {
          const pct = m.goal > 0 ? Math.min(100, (m.value / m.goal) * 100) : 0;
          return (
            <View key={m.label} style={styles.macroItem}>
              <View style={styles.macroBarBg}>
                <View
                  style={[
                    styles.macroBarFill,
                    { width: `${pct}%` as any, backgroundColor: m.color },
                  ]}
                />
              </View>
              <Text style={[styles.macroValue, { color: m.color }]}>
                {m.value.toFixed(0)}
                {m.unit}
              </Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
              <Text style={styles.macroGoal}>
                /{m.goal}
                {m.unit}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  calHero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
  },
  calLeft: { alignItems: "center" },
  calRight: { alignItems: "center" },
  calDivider: { width: 1, height: 40, backgroundColor: colors.border },
  calValue: { fontFamily: "Outfit_700Bold", fontSize: 36, color: colors.text },
  calRemaining: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: colors.accent,
  },
  calLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  calBar: {
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    overflow: "hidden",
  },
  calBarFill: { height: 8, borderRadius: 4 },
  calGoal: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textAlign: "right",
  },
  macroRow: { flexDirection: "row", gap: spacing.md },
  macroItem: { flex: 1, gap: 4 },
  macroBarBg: {
    height: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  macroBarFill: { height: 5, borderRadius: 3 },
  macroValue: { fontFamily: "Outfit_700Bold", fontSize: fontSize.base },
  macroLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  macroGoal: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
  },
});
