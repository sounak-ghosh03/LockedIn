import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { api } from "../../api/client";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

interface NutritionLog {
  _id: string;
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  meals: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
}

const MACRO_GOALS = {
  calories: 2200,
  proteinG: 160,
  carbsG: 220,
  fatG: 70,
  waterMl: 2500,
};

const ProgressBar = React.memo(
  ({ value, max, color }: { value: number; max: number; color: string }) => (
    <View style={pbStyles.track}>
      <View
        style={[
          pbStyles.fill,
          {
            width: `${Math.min(100, (value / max) * 100)}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  ),
);

const pbStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
    flex: 1,
  },
  fill: { height: "100%", borderRadius: 3 },
});

export default function NutritionScreen() {
  const today = new Date().toISOString().slice(0, 10);
  const [addingMeal, setAddingMeal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const qc = useQueryClient();

  const { data: logs = [] } = useQuery<NutritionLog[]>({
    queryKey: ["nutritionLogs", today],
    queryFn: () =>
      api.get(`/nutrition-logs?from=${today}T00:00:00Z&to=${today}T23:59:59Z`),
  });

  const todayLog = logs[0];

  const addMeal = useMutation({
    mutationFn: (meal: {
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }) => {
      // If today log exists, add to meals; otherwise create new log
      const newCalories = (todayLog?.calories ?? 0) + meal.calories;
      const newProtein = (todayLog?.proteinG ?? 0) + meal.protein;
      const newCarbs = (todayLog?.carbsG ?? 0) + meal.carbs;
      const newFat = (todayLog?.fatG ?? 0) + meal.fat;
      const meals = [...(todayLog?.meals ?? []), meal];

      if (todayLog) {
        return api.patch(`/nutrition-logs/${todayLog._id}`, {
          calories: newCalories,
          proteinG: newProtein,
          carbsG: newCarbs,
          fatG: newFat,
          meals,
        });
      }
      return api.post("/nutrition-logs", {
        date: new Date().toISOString(),
        calories: newCalories,
        proteinG: newProtein,
        carbsG: newCarbs,
        fatG: newFat,
        meals,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutritionLogs"] });
      setAddingMeal(false);
      setMealName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
    },
  });

  const macros = [
    {
      label: "Protein",
      value: todayLog?.proteinG ?? 0,
      goal: MACRO_GOALS.proteinG,
      unit: "g",
      color: colors.info,
    },
    {
      label: "Carbs",
      value: todayLog?.carbsG ?? 0,
      goal: MACRO_GOALS.carbsG,
      unit: "g",
      color: colors.warning,
    },
    {
      label: "Fat",
      value: todayLog?.fatG ?? 0,
      goal: MACRO_GOALS.fatG,
      unit: "g",
      color: colors.accentSoft,
    },
    {
      label: "Water",
      value: Math.round(((todayLog?.waterMl ?? 0) / 1000) * 10) / 10,
      goal: MACRO_GOALS.waterMl / 1000,
      unit: "L",
      color: colors.success,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Nutrition</Text>

        {/* Calorie ring summary */}
        <Card accent style={styles.summaryCard}>
          <View style={styles.calorieRow}>
            <View>
              <Text style={styles.calorieValue}>{todayLog?.calories ?? 0}</Text>
              <Text style={styles.calorieLabel}>kcal today</Text>
            </View>
            <View style={styles.calorieGoal}>
              <Text style={styles.goalText}>
                Goal: {MACRO_GOALS.calories} kcal
              </Text>
              <Text style={styles.goalRemain}>
                {Math.max(0, MACRO_GOALS.calories - (todayLog?.calories ?? 0))}{" "}
                remaining
              </Text>
            </View>
          </View>
        </Card>

        {/* Macro progress bars */}
        <Card>
          {macros.map((m) => (
            <View key={m.label} style={styles.macroRow}>
              <Text style={styles.macroLabel}>{m.label}</Text>
              <ProgressBar value={m.value} max={m.goal} color={m.color} />
              <Text style={styles.macroValue}>
                {m.value} / {m.goal}
                {m.unit}
              </Text>
            </View>
          ))}
        </Card>

        {/* Add meal */}
        {!addingMeal ? (
          <Button
            label="+ Add Meal"
            onPress={() => setAddingMeal(true)}
            variant="secondary"
            fullWidth
          />
        ) : (
          <Card>
            <Text style={styles.sectionTitle}>Add Meal</Text>
            {[
              {
                label: "Meal name",
                value: mealName,
                set: setMealName,
                type: "default",
              },
              {
                label: "Calories",
                value: calories,
                set: setCalories,
                type: "numeric",
              },
              {
                label: "Protein (g)",
                value: protein,
                set: setProtein,
                type: "numeric",
              },
              {
                label: "Carbs (g)",
                value: carbs,
                set: setCarbs,
                type: "numeric",
              },
              { label: "Fat (g)", value: fat, set: setFat, type: "numeric" },
            ].map((f) => (
              <View key={f.label} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={f.value}
                  onChangeText={f.set}
                  keyboardType={f.type as "default" | "numeric"}
                  placeholderTextColor={colors.textFaint}
                  placeholder={f.label}
                />
              </View>
            ))}
            <View style={styles.addActions}>
              <Button
                label="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => setAddingMeal(false)}
              />
              <Button
                label="Add"
                size="sm"
                loading={addMeal.isPending}
                onPress={() => {
                  if (!mealName) return;
                  addMeal.mutate({
                    name: mealName,
                    calories: +calories || 0,
                    protein: +protein || 0,
                    carbs: +carbs || 0,
                    fat: +fat || 0,
                  });
                }}
              />
            </View>
          </Card>
        )}

        {/* Today's meals */}
        {(todayLog?.meals ?? []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Meals</Text>
            {todayLog?.meals.map((meal, i) => (
              <Card key={i} style={styles.mealRow}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealMeta}>
                  {meal.calories} kcal · P: {meal.protein}g · C: {meal.carbs}g ·
                  F: {meal.fat}g
                </Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing["2xl"],
    gap: spacing.xl,
    paddingBottom: spacing["5xl"],
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
  },
  summaryCard: {},
  calorieRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calorieValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["3xl"],
    color: colors.accent,
  },
  calorieLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  calorieGoal: { alignItems: "flex-end" },
  goalText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  goalRemain: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
    marginTop: 2,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  macroLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    width: 50,
  },
  macroValue: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    width: 80,
    textAlign: "right",
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
    marginBottom: spacing.sm,
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
  addActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  mealRow: {},
  mealName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  mealMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
});
