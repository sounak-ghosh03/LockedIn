import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { Badge } from "../components/ui/Badge";
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

// ─── Typing indicator (3 pulsing dots) ───────────────────────────────────────

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={typingStyles.row}>
      <Text style={typingStyles.icon}>🤖</Text>
      <View style={typingStyles.bubble}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[typingStyles.dot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  icon: { fontSize: 20 },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textMuted,
  },
});

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── AI Coach content ─────────────────────────────────────────────────────────

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
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const providerBadge = (
    <Badge
      label={activeProvider === "gemini" ? "Gemini" : "OpenAI"}
      variant={activeProvider === "gemini" ? "accent" : "muted"}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScreenHeader title="AI Coach" rightAction={providerBadge} />

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
          {/* Quick prompts — shown until conversation starts */}
          {messages.length <= 1 && (
            <View style={styles.quickSection}>
              <Text style={styles.quickLabel}>Try asking:</Text>
              <View style={styles.quickGrid}>
                {QUICK_PROMPTS.map((p, i) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.quickChip}
                    onPress={() => handleSend(p)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.quickChipText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Chat messages */}
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
              <View style={{ maxWidth: "82%" }}>
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
                <Text
                  style={[
                    styles.timestamp,
                    msg.role === "user" && { textAlign: "right" },
                  ]}
                >
                  {relativeTime(msg.timestamp)}
                </Text>
              </View>
            </View>
          ))}

          {/* Typing indicator */}
          {sendMessage.isPending && <TypingIndicator />}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach anything…"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={2000}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || sendMessage.isPending) &&
                styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sendMessage.isPending}
            activeOpacity={0.8}
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
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  bubbleContentUser: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  bubbleContentAssistant: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderColor: colors.border,
  },
  bubbleText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  bubbleTextUser: { color: colors.text },
  bubbleTextAssistant: { color: colors.text },
  timestamp: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
    marginTop: 4,
  },

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
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceAlt,
    shadowOpacity: 0,
    elevation: 0,
  },
});
