import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { api } from "../../api/client";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

interface WorkoutPlan {
  _id: string;
  name: string;
  type: string;
  exercises: Array<{ name: string }>;
}

export default function WorkoutScreen() {
  const router = useRouter();

  const { data: plans = [], isLoading } = useQuery<WorkoutPlan[]>({
    queryKey: ["workoutPlans"],
    queryFn: () => api.get("/workout-plans"),
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Workout</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/workout/new")}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Quick start */}
        <Card accent glow>
          <Text style={styles.quickTitle}>No active session</Text>
          <Text style={styles.quickSub}>Start a plan or create a new one</Text>
          <View style={styles.quickActions}>
            <Button
              label="New Plan"
              variant="secondary"
              size="sm"
              onPress={() => router.push("/workout/new")}
            />
          </View>
        </Card>

        {/* Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Plans</Text>
          {isLoading && <Text style={styles.muted}>Loading plans…</Text>}
          {!isLoading && plans.length === 0 && (
            <Card>
              <Text style={styles.muted}>
                No plans yet. Create your first workout plan!
              </Text>
            </Card>
          )}
          {plans.map((plan) => (
            <Card key={plan._id} style={styles.planCard}>
              <View style={styles.planRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planMeta}>
                    {plan.exercises.length} exercises · {plan.type}
                  </Text>
                </View>
                <Button
                  label="Start"
                  size="sm"
                  onPress={() => router.push(`/workout/${plan._id}`)}
                />
              </View>
            </Card>
          ))}
        </View>

        {/* Template shortcuts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Templates</Text>
          <View style={styles.templatesGrid}>
            {TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.name}
                style={styles.templateCard}
                onPress={() => router.push("/workout/new")}
              >
                <Text style={styles.templateIcon}>{t.icon}</Text>
                <Text style={styles.templateName}>{t.name}</Text>
                <Badge label={t.days} variant="muted" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const TEMPLATES = [
  { icon: "💪", name: "Push / Pull / Legs", days: "6-day" },
  { icon: "⬆️", name: "Upper / Lower", days: "4-day" },
  { icon: "🏋️", name: "Full Body", days: "3-day" },
  { icon: "✏️", name: "Custom", days: "flexible" },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing["2xl"],
    gap: spacing.xl,
    paddingBottom: spacing["5xl"],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  quickSub: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  quickActions: { marginTop: spacing.md },
  section: { gap: spacing.md },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  muted: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  planCard: {},
  planRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  planName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  planMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  templatesGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  templateCard: {
    width: "47%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  templateIcon: { fontSize: 28 },
  templateName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.text,
  },
});
