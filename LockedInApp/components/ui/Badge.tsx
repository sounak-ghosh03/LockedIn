import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

type BadgeVariant = "accent" | "success" | "warning" | "error" | "muted";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge = React.memo(function Badge({
  label,
  variant = "accent",
  style,
}: BadgeProps) {
  return (
    <View style={[styles.base, styles[`variant_${variant}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  variant_accent: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  variant_success: { backgroundColor: colors.successDim },
  variant_warning: { backgroundColor: colors.warningDim },
  variant_error: { backgroundColor: colors.errorDim },
  variant_muted: { backgroundColor: colors.surfaceAlt },

  text: { fontFamily: "Inter_600SemiBold", fontSize: fontSize.xs },
  text_accent: { color: colors.accent },
  text_success: { color: colors.success },
  text_warning: { color: colors.warning },
  text_error: { color: colors.error },
  text_muted: { color: colors.textMuted },
});
