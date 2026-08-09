import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthContext } from "../../auth/AuthProvider";
import { ApiError } from "../../api/client";
import {
  colors,
  fontSize,
  spacing,
  radius,
  shadows,
} from "../../constants/theme";

export default function LoginScreen() {
  const { signInWithEmail, signIn, isLoading } = useAuthContext();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // Entrance animations — preserved from original
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

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setError("");
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setIsEmailLoading(true);
    try {
      await signInWithEmail(trimmedEmail, password);
      // Navigation is handled by AuthGate in _layout.tsx
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | null;
        setError(body?.error ?? "Login failed. Please try again.");
      } else {
        setError("Network error. Check your connection and try again.");
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    await signIn();
  };

  const busy = isEmailLoading || isLoading;

  return (
    <SafeAreaView style={styles.container}>
      {/* Background glow — preserved from original */}
      <View style={styles.bgGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo section — preserved from original */}
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
            <Text style={styles.tagline}>
              Stay locked in. Every rep counts.
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            style={[
              styles.formSection,
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
            <Text style={styles.formTitle}>Welcome Back</Text>

            {/* Error banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError("");
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!busy}
                  testID="login-email-input"
                />
              </View>
            </View>

            {/* Password input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError("");
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!busy}
                  testID="login-password-input"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  testID="login-password-eye"
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary — Login button */}
            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={busy}
              activeOpacity={0.8}
              testID="login-submit-button"
            >
              {isEmailLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.primaryButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Secondary — Google button */}
            <TouchableOpacity
              style={[styles.googleButton, busy && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={busy}
              activeOpacity={0.8}
              testID="login-google-button"
            >
              {isLoading && !isEmailLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Signup link */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/signup")}
                disabled={busy}
                testID="login-signup-link"
              >
                <Text style={styles.switchLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing["2xl"],
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

  // ── Logo (same as original) ──────────────────────────────────────────────
  logoSection: {
    alignItems: "center",
    paddingTop: spacing["5xl"],
    position: "relative",
    marginBottom: spacing["2xl"],
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
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...shadows.accentGlow,
  },
  logoIcon: { fontSize: 40 },
  appName: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["3xl"],
    color: colors.text,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  // ── Form ─────────────────────────────────────────────────────────────────
  formSection: {
    gap: spacing.md,
  },
  formTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
    marginBottom: spacing.sm,
  },

  errorBanner: {
    backgroundColor: colors.errorDim,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.error,
  },

  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 52,
  },
  input: {
    paddingHorizontal: spacing.lg,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: colors.text,
    height: 52,
  },
  eyeBtn: {
    width: 44,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: spacing.sm,
  },

  // ── Primary button ────────────────────────────────────────────────────────
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    ...shadows.accentGlow,
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.md,
    color: colors.text,
    letterSpacing: 0.3,
  },

  // ── Divider ────────────────────────────────────────────────────────────
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // ── Secondary Google button ───────────────────────────────────────────────
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    height: 52,
  },
  googleIcon: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: "rgba(255,255,255,0.1)",
    width: 26,
    height: 26,
    textAlign: "center",
    lineHeight: 26,
    borderRadius: 13,
    overflow: "hidden",
  },
  googleButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.textMuted,
  },

  // ── Disabled state ────────────────────────────────────────────────────────
  buttonDisabled: { opacity: 0.5 },

  // ── Switch to signup ─────────────────────────────────────────────────────
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  switchText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  switchLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.accent,
  },
});
