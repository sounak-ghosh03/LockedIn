import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../components/ui/Card";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { api } from "../api/client";
import { useSettingsStore } from "../store/settingsStore";
import { colors, fontSize, spacing, radius } from "../constants/theme";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const QUICK_PROMPTS = [
  "Suggest today's workout",
  "Analyze my progress this month",
  "Why has my bench plateaued?",
  "Generate next week's workout plan",
  "How much focus time this week?",
  "Help me plan tomorrow's coding session",
];

function AICoachContent() {
  const router = useRouter();
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const activeProvider = aiProvider === "both" ? "gemini" : aiProvider;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hey! I'm your AI coach powered by ${activeProvider === "gemini" ? "Gemini 🔵" : "OpenAI 🟢"}. Ask me anything about your workouts, progress, or focus sessions!`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = useMutation({
    mutationFn: (message: string) =>
      api.post<{ reply: string; provider: string }>("/ai/chat", {
        message,
        provider: activeProvider,
      }),
    onSuccess: (data, message) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: Date.now(),
        },
      ]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I couldn't reach the AI service. Check your API key in Settings.",
          timestamp: Date.now(),
        },
      ]);
    },
  });

  const handleSend = useCallback(
    (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          role: "user",
          content: msg,
          timestamp: Date.now(),
        },
      ]);
      setInput("");
      sendMessage.mutate(msg);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    },
    [input, sendMessage],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>AI Coach</Text>
          <Text style={styles.subtitle}>
            {activeProvider === "gemini" ? "🔵 Gemini" : "🟢 OpenAI"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/settings")}>
          <Ionicons
            name="settings-outline"
            size={22}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {/* Quick prompts */}
          {messages.length <= 1 && (
            <View style={styles.quickSection}>
              <Text style={styles.quickLabel}>Try asking:</Text>
              <View style={styles.quickGrid}>
                {QUICK_PROMPTS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.quickChip}
                    onPress={() => handleSend(p)}
                  >
                    <Text style={styles.quickChipText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Chat bubbles */}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.role === "user"
                  ? styles.bubbleUser
                  : styles.bubbleAssistant,
              ]}
            >
              {msg.role === "assistant" && (
                <Text style={styles.bubbleIcon}>🤖</Text>
              )}
              <View
                style={[
                  styles.bubbleContent,
                  msg.role === "user"
                    ? styles.bubbleContentUser
                    : styles.bubbleContentAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === "user"
                      ? styles.bubbleTextUser
                      : styles.bubbleTextAssistant,
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}

          {sendMessage.isPending && (
            <View style={styles.bubble}>
              <Text style={styles.bubbleIcon}>🤖</Text>
              <View style={styles.bubbleContentAssistant}>
                <ActivityIndicator color={colors.accent} size="small" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach anything…"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || sendMessage.isPending) &&
                styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sendMessage.isPending}
          >
            <Ionicons
              name="send"
              size={18}
              color={
                input.trim() && !sendMessage.isPending
                  ? colors.text
                  : colors.textFaint
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function AIScreen() {
  return (
    <ErrorBoundary
      fallback={
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{ color: colors.textMuted, fontFamily: "Inter_400Regular" }}
          >
            AI Coach unavailable. Check your API key in Settings.
          </Text>
        </View>
      }
    >
      <AICoachContent />
    </ErrorBoundary>
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
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
  },

  messages: { flex: 1 },
  messagesContent: {
    padding: spacing["2xl"],
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

  quickSection: { gap: spacing.md, marginBottom: spacing.md },
  quickLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.text,
  },

  bubble: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  bubbleUser: { flexDirection: "row-reverse" },
  bubbleAssistant: {},
  bubbleIcon: { fontSize: 20, marginTop: 4 },
  bubbleContent: {
    maxWidth: "80%",
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  bubbleContentUser: { backgroundColor: colors.accent },
  bubbleContentAssistant: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  bubbleTextUser: { color: colors.text },
  bubbleTextAssistant: { color: colors.text },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: colors.surfaceAlt },
});
