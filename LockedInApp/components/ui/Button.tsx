import React, { useCallback } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  colors,
  fontSize,
  spacing,
  radius,
  shadows,
} from "../../constants/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
}

export const Button = React.memo(function Button({
  onPress,
  label,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  haptic = true,
}: ButtonProps) {
  const handlePress = useCallback(() => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress, haptic]);

  const containerStyle = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    variant === "primary" && !disabled && shadows.accentGlow,
    style,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.text : colors.accent}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`text_${variant}`],
            styles[`textSize_${size}`],
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    flexDirection: "row",
    gap: spacing.sm,
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.45 },

  // Variants
  variant_primary: {
    backgroundColor: colors.accent,
    borderWidth: 0,
  },
  variant_secondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variant_ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  variant_danger: {
    backgroundColor: colors.errorDim,
    borderWidth: 1,
    borderColor: colors.error,
  },
  variant_outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Sizes
  size_sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    height: 34,
  },
  size_md: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    height: 44,
  },
  size_lg: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    height: 54,
  },

  // Text base
  text: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },

  // Text variants
  text_primary: { color: colors.text },
  text_secondary: { color: colors.text },
  text_ghost: { color: colors.accent },
  text_danger: { color: colors.error },
  text_outline: { color: colors.textMuted },

  // Text sizes
  textSize_sm: { fontSize: fontSize.xs },
  textSize_md: { fontSize: fontSize.base },
  textSize_lg: { fontSize: fontSize.md },
});
