/**
 * MiniStatRow — a compact horizontal stat for use inside progress cards
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

interface MiniStatRowProps {
  label: string;
  value: string;
  delta?: string; // e.g. "-1.2 kg" — positive/negative trend
  deltaPositiveGood?: boolean; // whether positive delta is good (weight loss: false)
}

export const MiniStatRow = React.memo(function MiniStatRow({
  label,
  value,
  delta,
  deltaPositiveGood = true,
}: MiniStatRowProps) {
  const isPositive = delta?.startsWith("+");
  const isGood = isPositive ? deltaPositiveGood : !deltaPositiveGood;
  const deltaColor = delta
    ? isGood
      ? colors.success
      : colors.error
    : colors.textMuted;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.right}>
        {delta ? (
          <View
            style={[
              styles.deltaBadge,
              { backgroundColor: isGood ? colors.successDim : colors.errorDim },
            ]}
          >
            <Text style={[styles.deltaText, { color: deltaColor }]}>
              {delta}
            </Text>
          </View>
        ) : null}
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
});

interface ProgressRingProps {
  percent: number; // 0–100
  size?: number;
  color?: string;
  label?: string;
}

/** Simple SVG-free circular progress indicator using border trick */
export const ProgressRing = React.memo(function ProgressRing({
  percent,
  size = 56,
  color = colors.accent,
  label,
}: ProgressRingProps) {
  const clampedPct = Math.min(100, Math.max(0, percent));
  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: colors.surfaceAlt,
        },
      ]}
    >
      <View
        style={[
          styles.ringFill,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3,
            borderColor: color,
            opacity: clampedPct / 100,
          },
        ]}
      />
      {label ? (
        <Text style={[styles.ringLabel, { fontSize: size * 0.22 }]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  // MiniStatRow
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  deltaBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  deltaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.xs,
  },
  value: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
    minWidth: 64,
    textAlign: "right",
  },

  // ProgressRing
  ring: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    position: "relative",
  },
  ringFill: {
    position: "absolute",
  },
  ringLabel: {
    fontFamily: "Outfit_700Bold",
    color: colors.text,
  },
});
