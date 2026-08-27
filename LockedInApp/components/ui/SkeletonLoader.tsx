import React, { useEffect, useRef } from "react";
import { Animated, View, ViewStyle } from "react-native";
import { colors, radius } from "../../constants/theme";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = React.memo(function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceHigh,
          opacity: shimmer,
        },
        style,
      ]}
    />
  );
});

// ─── Preset skeleton layouts ──────────────────────────────────────────────────

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          gap: 10,
        },
        style,
      ]}
    >
      <Skeleton width="60%" height={14} />
      <Skeleton width="90%" height={12} />
      <Skeleton width="75%" height={12} />
    </View>
  );
}

export function SkeletonStatRow() {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 12,
            alignItems: "center",
            gap: 8,
          }}
        >
          <Skeleton width={32} height={32} borderRadius={radius.sm} />
          <Skeleton width="70%" height={12} />
          <Skeleton width="50%" height={10} />
        </View>
      ))}
    </View>
  );
}
