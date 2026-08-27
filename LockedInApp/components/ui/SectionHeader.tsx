import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, fontSize, spacing } from "../../constants/theme";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const SectionHeader = React.memo(function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: SectionHeaderProps) {
  const handleAction = () => {
    if (onAction) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAction();
    }
  };

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={handleAction} activeOpacity={0.7}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  action: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.accent,
  },
});
