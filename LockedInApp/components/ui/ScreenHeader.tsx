import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fontSize, spacing } from "../../constants/theme";

interface ScreenHeaderProps {
  title: string;
  /** Optional right-side action element */
  rightAction?: React.ReactNode;
  /** Override back behaviour — defaults to router.back() */
  onBack?: () => void;
  style?: ViewStyle;
}

export const ScreenHeader = React.memo(function ScreenHeader({
  title,
  rightAction,
  onBack,
  style,
}: ScreenHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleBack}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightSlot}>{rightAction ?? null}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: "center",
  },
  rightSlot: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
