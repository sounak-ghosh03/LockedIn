import React, { useCallback } from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing, shadows } from "../../constants/theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Adds an accent left border */
  accent?: boolean;
  /** Adds a glow effect */
  glow?: boolean;
  /** Adds a subtle glass-like gradient overlay */
  gradient?: boolean;
  /** Makes the card tappable with a press-sink feel */
  pressable?: boolean;
  /** Called when the card is pressed (requires pressable=true) */
  onPress?: () => void;
  padding?: keyof typeof spacing;
}

export const Card = React.memo(function Card({
  children,
  style,
  accent = false,
  glow = false,
  gradient = false,
  pressable = false,
  onPress,
  padding = "lg",
}: CardProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }, [onPress]);

  const content = (
    <View
      style={[
        styles.card,
        { padding: spacing[padding] },
        accent && styles.accent,
        glow && shadows.accentGlow,
        !glow && shadows.subtle,
        style,
      ]}
    >
      {accent && <View style={styles.accentBar} />}
      {gradient && <View style={styles.gradientOverlay} pointerEvents="none" />}
      {children}
    </View>
  );

  if (pressable || onPress) {
    return (
      <TouchableOpacity activeOpacity={0.82} onPress={handlePress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
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
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.025)",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
});
