import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, radius, spacing, shadows } from "../../constants/theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Adds an accent left border */
  accent?: boolean;
  /** Adds a glow effect */
  glow?: boolean;
  padding?: keyof typeof spacing;
}

export const Card = React.memo(function Card({
  children,
  style,
  accent = false,
  glow = false,
  padding = "lg",
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding: spacing[padding] },
        accent && styles.accent,
        glow && shadows.accentGlow,
        style,
      ]}
    >
      {accent && <View style={styles.accentBar} />}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  accent: {
    borderColor: colors.borderAccent,
    paddingLeft: spacing.lg + 4,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.accent,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
});
