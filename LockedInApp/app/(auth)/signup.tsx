import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

export default function SignupScreen() {
  const { signUpWithEmail, signIn, isLoading } = useAuthContext();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // Input refs for keyboard navigation
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const clearError = () => {
    if (error) setError("");
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSignup = async () => {
    setError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Name is required");
      return;
    }
    if (!trimmedEmail) {
      setError("Email is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsEmailLoading(true);
    try {
      await signUpWithEmail(trimmedName, trimmedEmail, password);
      // Navigation is handled by AuthGate in _layout.tsx
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | null;
        setError(body?.error ?? "Registration failed. Please try again.");
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
      {/* Background glow — matches login screen style */}
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>🔒</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Start your journey with LockedIn
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            {/* Error banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Name input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  clearError();
                }}
                placeholder="Your name"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                editable={!busy}
                testID="signup-name-input"
              />
            </View>

            {/* Email input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                ref={emailRef}
                style={styles.input}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  clearError();
                }}
                placeholder="you@example.com"
                placeholderTextColor={colors.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!busy}
                testID="signup-email-input"
              />
            </View>

            {/* Password input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  clearError();
                }}
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                editable={!busy}
                testID="signup-password-input"
              />
            </View>

            {/* Confirm password input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  clearError();
                }}
                placeholder="Repeat your password"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                editable={!busy}
                testID="signup-confirm-input"
              />
            </View>

            {/* Primary — Create Account button */}
            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={busy}
              activeOpacity={0.8}
              testID="signup-submit-button"
            >
              {isEmailLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
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
              testID="signup-google-button"
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

            {/* Login link */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                disabled={busy}
                testID="signup-login-link"
              >
                <Text style={styles.switchLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    top: -60,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.accentGlow,
    opacity: 0.5,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    alignItems: "center",
    paddingTop: spacing["3xl"],
    marginBottom: spacing["2xl"],
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...shadows.accentGlow,
  },
  logoIcon: { fontSize: 34 },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // ── Form ─────────────────────────────────────────────────────────────────
  formSection: {
    gap: spacing.md,
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
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: colors.text,
    height: 52,
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

  // ── Switch to login ───────────────────────────────────────────────────────
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
