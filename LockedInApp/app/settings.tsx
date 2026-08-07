import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { useAuth } from "../auth/useAuth";
import { useSettingsStore } from "../store/settingsStore";
import { api } from "../api/client";
import { getPendingCount } from "../api/offlineQueue";
import { colors, fontSize, spacing, radius } from "../constants/theme";

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function SettingRow({
  icon,
  label,
  subtitle,
  value,
  onPress,
  chevron = true,
}: {
  icon?: string;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      {icon && <Text style={styles.rowIcon}>{icon}</Text>}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {value !== undefined && <Text style={styles.rowValue}>{value}</Text>}
      {chevron && onPress && (
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      )}
    </TouchableOpacity>
  );
}

// ─── Number stepper ───────────────────────────────────────────────────────────

function Stepper({
  value,
  step,
  min,
  max,
  unit,
  onChange,
}: {
  value: number;
  step: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onChange(Math.max(min, value - step))}
      >
        <Ionicons name="remove" size={16} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.stepValue}>
        {value}
        <Text style={styles.stepUnit}> {unit}</Text>
      </Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onChange(Math.min(max, value + step))}
      >
        <Ionicons name="add" size={16} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Settings ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();
  const {
    units,
    aiProvider,
    restTimerDefaultSeconds,
    notificationsEnabled,
    setUnits,
    setAiProvider,
    setRestTimerDefault,
    setNotificationsEnabled,
  } = useSettingsStore();

  // API key state
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);

  // Goals — synced from user profile
  const [goalWeight, setGoalWeight] = useState(user?.goals?.weightKg ?? 75);
  const [goalBodyFat, setGoalBodyFat] = useState(user?.goals?.bodyFat ?? 15);
  const [goalCalories, setGoalCalories] = useState(
    user?.goals?.dailyCalories ?? 2500,
  );

  // Offline queue status
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    getPendingCount()
      .then(setPendingCount)
      .catch(() => {});
  }, []);

  // Notification permission status
  const [notifStatus, setNotifStatus] = useState<string>("unknown");
  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((p) => setNotifStatus(p.status))
      .catch(() => {});
  }, []);

  const saveSettings = useMutation({
    mutationFn: (data: object) => api.patch("/me", data),
    onSuccess: () => refreshUser(),
  });

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, [signOut, router]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes all your data and cannot be undone. Are you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/me");
              await signOut();
              router.replace("/(auth)/login");
            } catch {
              Alert.alert(
                "Error",
                "Could not delete account. Try again later.",
              );
            }
          },
        },
      ],
    );
  }, [signOut, router]);

  const handleSaveGoals = useCallback(() => {
    saveSettings.mutate(
      {
        goals: {
          weightKg: goalWeight,
          bodyFat: goalBodyFat,
          dailyCalories: goalCalories,
        },
      },
      {
        onSuccess: () =>
          Alert.alert(
            "✅ Goals Saved",
            "Your fitness goals have been updated.",
          ),
      },
    );
  }, [goalWeight, goalBodyFat, goalCalories, saveSettings]);

  const handleSaveKeys = useCallback(() => {
    const payload: Record<string, string> = {};
    if (geminiKey.trim()) payload.geminiApiKey = geminiKey.trim();
    if (openaiKey.trim()) payload.openaiApiKey = openaiKey.trim();
    if (Object.keys(payload).length === 0) {
      Alert.alert("No keys entered", "Enter at least one API key to save.");
      return;
    }
    saveSettings.mutate(payload, {
      onSuccess: () => {
        setGeminiKey("");
        setOpenaiKey("");
        Alert.alert(
          "✅ Keys Saved",
          "API keys saved securely to your account.",
        );
      },
    });
  }, [geminiKey, openaiKey, saveSettings]);

  const handleNotifToggle = useCallback(
    async (val: boolean) => {
      if (val && notifStatus !== "granted") {
        const result = await Notifications.requestPermissionsAsync();
        if (result.status !== "granted") {
          Alert.alert(
            "Notifications Blocked",
            "Enable notifications in your device Settings to receive timer alerts.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
        setNotifStatus("granted");
      }
      setNotificationsEnabled(val);
    },
    [notifStatus, setNotificationsEnabled],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile ─────────────────────────────────────────── */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0] ?? "?"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
            <Badge label="Pro" variant="accent" />
          </View>
        </Card>

        {/* ─── Fitness Goals ────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel label="🎯 Fitness Goals" />
          <Card style={{ gap: spacing.lg }}>
            <View style={styles.goalRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Target Weight</Text>
                <Text style={styles.rowSubtitle}>
                  {units === "metric" ? "kg" : "lbs"}
                </Text>
              </View>
              <Stepper
                value={goalWeight}
                step={1}
                min={30}
                max={250}
                unit={units === "metric" ? "kg" : "lbs"}
                onChange={setGoalWeight}
              />
            </View>
            <View style={styles.goalRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Target Body Fat</Text>
                <Text style={styles.rowSubtitle}>percentage</Text>
              </View>
              <Stepper
                value={goalBodyFat}
                step={1}
                min={5}
                max={50}
                unit="%"
                onChange={setGoalBodyFat}
              />
            </View>
            <View style={styles.goalRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Daily Calorie Goal</Text>
                <Text style={styles.rowSubtitle}>kcal / day</Text>
              </View>
              <Stepper
                value={goalCalories}
                step={50}
                min={1000}
                max={5000}
                unit="kcal"
                onChange={setGoalCalories}
              />
            </View>
            <Button
              label={saveSettings.isPending ? "Saving…" : "Save Goals"}
              size="sm"
              loading={saveSettings.isPending}
              onPress={handleSaveGoals}
            />
          </Card>
        </View>

        {/* ─── Units ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel label="⚖️ Units" />
          <Card>
            <Text style={styles.rowLabel}>Weight & Measurements</Text>
            <View style={styles.segmented}>
              {(["metric", "imperial"] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.segBtn, units === u && styles.segBtnActive]}
                  onPress={() => {
                    setUnits(u);
                    saveSettings.mutate({ units: u });
                  }}
                >
                  <Text
                    style={[
                      styles.segText,
                      units === u && styles.segTextActive,
                    ]}
                  >
                    {u === "metric" ? "🌍 kg / cm" : "🇺🇸 lbs / in"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        {/* ─── Rest Timer ───────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel label="⏱ Rest Timer Default" />
          <Card>
            <View style={styles.presetsRow}>
              {[60, 90, 120, 180, 300].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.presetBtn,
                    restTimerDefaultSeconds === s && styles.presetBtnActive,
                  ]}
                  onPress={() => {
                    setRestTimerDefault(s);
                    saveSettings.mutate({ restTimerDefaultSeconds: s });
                  }}
                >
                  <Text
                    style={[
                      styles.presetText,
                      restTimerDefaultSeconds === s && styles.presetTextActive,
                    ]}
                  >
                    {s < 60 ? `${s}s` : `${s / 60}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        {/* ─── Notifications ────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel label="🔔 Notifications" />
          <Card>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Timer Alerts</Text>
                <Text style={styles.rowSubtitle}>
                  Notified when rest timer or Pomodoro phase ends
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotifToggle}
                trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
                thumbColor={colors.text}
              />
            </View>
            {notifStatus === "denied" && (
              <TouchableOpacity
                style={styles.notifWarning}
                onPress={() => Linking.openSettings()}
              >
                <Ionicons
                  name="warning-outline"
                  size={14}
                  color={colors.warning}
                />
                <Text style={styles.notifWarningText}>
                  Notifications are blocked — tap to open device Settings
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* ─── AI Provider ──────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel label="🤖 AI Provider" />
          <Card style={{ gap: 0 }}>
            {(
              [
                {
                  key: "gemini",
                  label: "🔵 Google Gemini",
                  sub: "Gemini 1.5 Flash — fast & free tier",
                },
                {
                  key: "openai",
                  label: "🟢 OpenAI GPT",
                  sub: "GPT-4o-mini — high quality",
                },
                {
                  key: "both",
                  label: "🔀 Both (Gemini first)",
                  sub: "Falls back to OpenAI on error",
                },
              ] as const
            ).map((p) => (
              <TouchableOpacity
                key={p.key}
                style={styles.providerRow}
                onPress={() => {
                  setAiProvider(p.key);
                  saveSettings.mutate({ aiProvider: p.key });
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{p.label}</Text>
                  <Text style={styles.rowSubtitle}>{p.sub}</Text>
                </View>
                {aiProvider === p.key && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.accent}
                  />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* ─── API Keys ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel label="🔑 API Keys" />
          <Card style={{ gap: spacing.md }}>
            <Text style={styles.keyNote}>
              Keys are stored server-side and never cached on your device. You
              only need to enter them once.
            </Text>

            {/* Gemini */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Google Gemini Key</Text>
                {user?.geminiApiKey ? (
                  <Badge label="✓ Saved" variant="success" />
                ) : (
                  <Badge label="Not set" variant="muted" />
                )}
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={geminiKey}
                  onChangeText={setGeminiKey}
                  placeholder="AIza…"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry={!showGemini}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowGemini((v) => !v)}
                >
                  <Ionicons
                    name={showGemini ? "eye-off-outline" : "eye-outline"}
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* OpenAI */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>OpenAI Key</Text>
                {user?.openaiApiKey ? (
                  <Badge label="✓ Saved" variant="success" />
                ) : (
                  <Badge label="Not set" variant="muted" />
                )}
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={openaiKey}
                  onChangeText={setOpenaiKey}
                  placeholder="sk-…"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry={!showOpenai}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowOpenai((v) => !v)}
                >
                  <Ionicons
                    name={showOpenai ? "eye-off-outline" : "eye-outline"}
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Button
              label="Save Keys"
              variant="secondary"
              loading={saveSettings.isPending}
              onPress={handleSaveKeys}
            />
          </Card>
        </View>

        {/* ─── Offline Queue ────────────────────────────────────── */}
        {pendingCount > 0 && (
          <View style={styles.section}>
            <SectionLabel label="📡 Offline Queue" />
            <Card accent>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Pending Sync</Text>
                  <Text style={styles.rowSubtitle}>
                    {pendingCount} write{pendingCount !== 1 ? "s" : ""} waiting
                    to sync — they'll upload automatically when back online.
                  </Text>
                </View>
                <Ionicons
                  name="cloud-upload-outline"
                  size={24}
                  color={colors.accent}
                />
              </View>
            </Card>
          </View>
        )}

        {/* ─── About ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel label="ℹ️ About" />
          <Card style={{ gap: 0 }}>
            <SettingRow
              icon="📱"
              label="Version"
              value="1.0.0"
              chevron={false}
            />
            <SettingRow
              icon="🖥️"
              label="Backend"
              value="Express + MongoDB"
              chevron={false}
            />
            <SettingRow
              icon="📚"
              label="Privacy Policy"
              onPress={() => Linking.openURL("https://lockedin.app/privacy")}
            />
            <SettingRow
              icon="📋"
              label="Terms of Service"
              onPress={() => Linking.openURL("https://lockedin.app/terms")}
            />
          </Card>
        </View>

        {/* ─── Danger Zone ──────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel label="⚠️ Account" />
          <Card style={{ gap: spacing.sm }}>
            <Button
              label="Sign Out"
              variant="outline"
              fullWidth
              onPress={handleSignOut}
            />
            <Button
              label="Delete Account"
              variant="danger"
              fullWidth
              onPress={handleDeleteAccount}
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  content: {
    padding: spacing["2xl"],
    gap: spacing.xl,
    paddingBottom: spacing["5xl"],
  },

  // Profile
  profileCard: {},
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.xl,
    color: colors.text,
  },
  profileName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  profileEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Section
  section: { gap: spacing.sm },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Row
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: { fontSize: 18, width: 28, textAlign: "center" },
  rowLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: colors.text,
  },
  rowSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowValue: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Goal rows
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },

  // Stepper
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
    minWidth: 60,
    textAlign: "center",
  },
  stepUnit: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Segments
  segmented: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  segBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  segBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  segText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  segTextActive: { color: colors.accent },

  // Presets
  presetsRow: { flexDirection: "row", gap: spacing.sm },
  presetBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  presetBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  presetText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  presetTextActive: { color: colors.accent },

  // Switch row
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  // Notification warning
  notifWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.warningDim,
    borderRadius: radius.sm,
  },
  notifWarningText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.warning,
    flex: 1,
  },

  // Provider rows
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },

  // API keys
  keyNote: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
  },
  inputGroup: { gap: spacing.xs },
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    padding: spacing.md,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
