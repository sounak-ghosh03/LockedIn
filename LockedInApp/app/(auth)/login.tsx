import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext } from "../../auth/AuthProvider";
import {
  colors,
  fontSize,
  spacing,
  radius,
  shadows,
} from "../../constants/theme";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const { signIn, isLoading } = useAuthContext();

  // Entrance animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [logoAnim, contentAnim, glowAnim]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Background gradient-like overlay */}
      <View style={styles.bgGlow} />

      {/* Logo section */}
      <Animated.View
        style={[
          styles.logoSection,
          {
            opacity: logoAnim,
            transform: [
              {
                translateY: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-40, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View style={[styles.logoGlow, { opacity: glowAnim }]} />
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🔒</Text>
        </View>
        <Text style={styles.appName}>LockedIn</Text>
        <Text style={styles.tagline}>Stay locked in. Every rep counts.</Text>
      </Animated.View>

      {/* Features list */}
      <Animated.View
        style={[
          styles.featuresSection,
          {
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        {FEATURES.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* Sign in button */}
      <Animated.View style={[styles.bottomSection, { opacity: contentAnim }]}>
        <TouchableOpacity
          style={[styles.googleButton, shadows.accentGlow]}
          onPress={signIn}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          No passwords. No email signup. Just Google.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const FEATURES = [
  {
    icon: "💪",
    label: "Workout Tracker",
    desc: "Log sets, detect PRs, rest timer",
  },
  { icon: "📊", label: "Analytics", desc: "Streaks, heatmap, volume trends" },
  { icon: "🤖", label: "AI Coach", desc: "Gemini & OpenAI — your choice" },
  {
    icon: "✅",
    label: "Focus Sessions",
    desc: "Study, code, and stay locked in",
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing["2xl"],
    justifyContent: "space-between",
    paddingBottom: spacing["4xl"],
  },
  bgGlow: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.accentGlow,
    opacity: 0.6,
  },
  logoSection: {
    alignItems: "center",
    paddingTop: spacing["5xl"],
    position: "relative",
  },
  logoGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accentGlow,
    top: spacing["5xl"] - 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    ...shadows.accentGlow,
  },
  logoIcon: { fontSize: 48 },
  appName: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["4xl"],
    color: colors.text,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  featuresSection: {
    gap: spacing.lg,
    paddingVertical: spacing["2xl"],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
  },
  featureIcon: { fontSize: 24, width: 32, textAlign: "center", marginTop: 2 },
  featureLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  featureDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  bottomSection: { gap: spacing.md },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: radius.full,
    height: 56,
  },
  googleIcon: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 28,
    height: 28,
    textAlign: "center",
    lineHeight: 28,
    borderRadius: 14,
    overflow: "hidden",
  },
  googleButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.md,
    color: colors.text,
  },
  disclaimer: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textAlign: "center",
  },
});
