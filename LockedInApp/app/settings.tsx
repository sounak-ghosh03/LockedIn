import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../auth/useAuth";
import { useSettingsStore } from "../store/settingsStore";
import { api } from "../api/client";
import { colors, fontSize, spacing, radius } from "../constants/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();
  const {
    units,
    aiProvider,
    restTimerDefaultSeconds,
    setUnits,
    setAiProvider,
    setRestTimerDefault,
  } = useSettingsStore((s) => ({
    units: s.units,
    aiProvider: s.aiProvider,
    restTimerDefaultSeconds: s.restTimerDefaultSeconds,
    setUnits: s.setUnits,
    setAiProvider: s.setAiProvider,
    setRestTimerDefault: s.setRestTimerDefault,
  }));

  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");

  const saveSettings = useMutation({
    mutationFn: (data: object) => api.patch("/me", data),
    onSuccess: () => refreshUser(),
  });

  const handleSignOut = () => {
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
  };

  const SettingRow = ({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </View>
    </TouchableOpacity>
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
        {/* Profile */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0] ?? "?"}</Text>
            </View>
            <View>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        {/* Units */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Units</Text>
          <Card>
            <View style={styles.toggleRow}>
              <Text style={styles.rowLabel}>Weight / Measurements</Text>
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
                      {u === "metric" ? "kg / cm" : "lbs / in"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>
        </View>

        {/* Timer */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Rest Timer Default</Text>
          <Card>
            <View style={styles.timerRow}>
              {[60, 90, 120, 180, 300].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.timerBtn,
                    restTimerDefaultSeconds === s && styles.timerBtnActive,
                  ]}
                  onPress={() => {
                    setRestTimerDefault(s);
                    saveSettings.mutate({ restTimerDefaultSeconds: s });
                  }}
                >
                  <Text
                    style={[
                      styles.timerText,
                      restTimerDefaultSeconds === s && styles.timerTextActive,
                    ]}
                  >
                    {s < 60 ? `${s}s` : `${s / 60}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        {/* AI Provider */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AI Provider</Text>
          <Card>
            {(["gemini", "openai", "both"] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.row}
                onPress={() => {
                  setAiProvider(p);
                  saveSettings.mutate({ aiProvider: p });
                }}
              >
                <Text style={styles.rowLabel}>
                  {p === "gemini"
                    ? "🔵 Gemini"
                    : p === "openai"
                      ? "🟢 OpenAI"
                      : "🔀 Both"}
                </Text>
                {aiProvider === p && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.accent}
                  />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* API Keys */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>API Keys</Text>
          <Card>
            <Text style={styles.keyNote}>
              Keys are stored securely in your account, never in the app.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gemini API Key</Text>
              <TextInput
                style={styles.input}
                value={geminiKey}
                onChangeText={setGeminiKey}
                placeholder="AIza…"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OpenAI API Key</Text>
              <TextInput
                style={styles.input}
                value={openaiKey}
                onChangeText={setOpenaiKey}
                placeholder="sk-…"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <Button
              label="Save Keys"
              variant="secondary"
              loading={saveSettings.isPending}
              onPress={() => {
                const payload: Record<string, string> = {};
                if (geminiKey) payload.geminiApiKey = geminiKey;
                if (openaiKey) payload.openaiApiKey = openaiKey;
                if (Object.keys(payload).length > 0) {
                  saveSettings.mutate(payload, {
                    onSuccess: () => {
                      setGeminiKey("");
                      setOpenaiKey("");
                      Alert.alert("Saved", "API keys saved to your account.");
                    },
                  });
                }
              }}
            />
          </Card>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <Card>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>1.0.0</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Backend</Text>
              <Text style={styles.rowValue}>Express + MongoDB Atlas</Text>
            </View>
          </Card>
        </View>

        {/* Sign out */}
        <Button
          label="Sign Out"
          variant="danger"
          onPress={handleSignOut}
          fullWidth
        />
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

  profileCard: {},
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
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

  section: { gap: spacing.sm },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: colors.text,
  },
  rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  rowValue: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  toggleRow: { gap: spacing.md },
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
  timerRow: { flexDirection: "row", gap: spacing.xs },
  timerBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  timerBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  timerText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  timerTextActive: { color: colors.accent },
  keyNote: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
    marginBottom: spacing.md,
  },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    padding: spacing.md,
  },
});
