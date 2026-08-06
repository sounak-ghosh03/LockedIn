import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { MacroSummary } from "../../components/nutrition/MacroSummary";
import {
  useTodayNutrition,
  useWeekNutrition,
  useAddMealToLog,
  useUpdateWater,
  COMMON_FOODS,
  DEFAULT_GOALS,
  type MealCategory,
  type MealItem,
} from "../../api/queries/useNutrition";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

// ─── Water Tracker ────────────────────────────────────────────────────────────

const WATER_STEP_ML = 250;
const WATER_CUPS = 8;

const WaterTracker = React.memo(function WaterTracker({
  waterMl,
  goalMl,
  onAdd,
  onRemove,
}: {
  waterMl: number;
  goalMl: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const cupsConsumed = Math.floor(waterMl / WATER_STEP_ML);
  const cupsGoal = Math.ceil(goalMl / WATER_STEP_ML);
  const displayCups = Math.max(cupsGoal, WATER_CUPS);

  return (
    <Card>
      <View style={waterStyles.header}>
        <Text style={waterStyles.title}>💧 Water</Text>
        <Text style={waterStyles.amount}>
          {waterMl >= 1000 ? `${(waterMl / 1000).toFixed(1)}L` : `${waterMl}ml`}
          <Text style={waterStyles.goal}>
            {" "}
            /{" "}
            {goalMl >= 1000 ? `${(goalMl / 1000).toFixed(1)}L` : `${goalMl}ml`}
          </Text>
        </Text>
      </View>

      {/* Cup indicators */}
      <View style={waterStyles.cups}>
        {Array.from({ length: displayCups }).map((_, i) => (
          <View
            key={i}
            style={[
              waterStyles.cup,
              i < cupsConsumed && waterStyles.cupFilled,
              i === cupsGoal - 1 && waterStyles.cupGoal,
            ]}
          >
            <Text style={waterStyles.cupIcon}>
              {i < cupsConsumed ? "💧" : "○"}
            </Text>
          </View>
        ))}
      </View>

      <View style={waterStyles.controls}>
        <TouchableOpacity
          style={waterStyles.btn}
          onPress={onRemove}
          disabled={waterMl <= 0}
        >
          <Ionicons
            name="remove"
            size={20}
            color={waterMl > 0 ? colors.text : colors.textFaint}
          />
        </TouchableOpacity>
        <Text style={waterStyles.hint}>+{WATER_STEP_ML}ml per tap</Text>
        <TouchableOpacity style={waterStyles.btn} onPress={onAdd}>
          <Ionicons name="add" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </Card>
  );
});

const waterStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  amount: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: "#007AFF",
  },
  goal: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  cups: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  cup: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
  cupFilled: { backgroundColor: "#007AFF20" },
  cupGoal: { borderWidth: 1, borderColor: "#007AFF", borderStyle: "dashed" },
  cupIcon: { fontSize: 14 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textFaint,
  },
});

// ─── Add Food Modal ───────────────────────────────────────────────────────────

const CATEGORIES: MealCategory[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "pre-workout",
  "post-workout",
];
const CATEGORY_ICONS: Record<MealCategory, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
  "pre-workout": "⚡",
  "post-workout": "💪",
};

interface AddFoodModalProps {
  visible: boolean;
  defaultCategory?: MealCategory;
  onClose: () => void;
}

function AddFoodModal({
  visible,
  defaultCategory = "lunch",
  onClose,
}: AddFoodModalProps) {
  const addMeal = useAddMealToLog();
  const { data: todayLogs = [] } = useTodayNutrition();

  const [tab, setTab] = useState<"quick" | "custom">("quick");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<MealCategory>(defaultCategory);

  // Custom entry fields
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [serving, setServing] = useState("");

  const todayLog = todayLogs[0];

  const filteredFoods = useMemo(() => {
    if (!searchQuery.trim()) return COMMON_FOODS;
    const q = searchQuery.toLowerCase();
    return COMMON_FOODS.filter((f) => f.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleAddQuick = useCallback(
    (food: (typeof COMMON_FOODS)[number]) => {
      addMeal.mutate(
        {
          existingLogId: todayLog?._id,
          meal: {
            name: food.name,
            calories: food.calories,
            proteinG: food.proteinG,
            carbsG: food.carbsG,
            fatG: food.fatG,
            servingG: food.servingG,
            category: selectedCategory,
          },
          todayMacros: todayLog
            ? {
                calories: todayLog.calories,
                proteinG: todayLog.proteinG,
                carbsG: todayLog.carbsG,
                fatG: todayLog.fatG,
                waterMl: todayLog.waterMl,
                meals: todayLog.meals,
              }
            : undefined,
        },
        { onSuccess: onClose },
      );
    },
    [addMeal, todayLog, selectedCategory, onClose],
  );

  const handleAddCustom = useCallback(() => {
    if (!name.trim()) {
      Alert.alert("Name required");
      return;
    }
    if (!calories) {
      Alert.alert("Calories required");
      return;
    }

    addMeal.mutate(
      {
        existingLogId: todayLog?._id,
        meal: {
          name: name.trim(),
          calories: +calories,
          proteinG: +protein || 0,
          carbsG: +carbs || 0,
          fatG: +fat || 0,
          servingG: +serving || undefined,
          category: selectedCategory,
        },
        todayMacros: todayLog
          ? {
              calories: todayLog.calories,
              proteinG: todayLog.proteinG,
              carbsG: todayLog.carbsG,
              fatG: todayLog.fatG,
              waterMl: todayLog.waterMl,
              meals: todayLog.meals,
            }
          : undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setCalories("");
          setProtein("");
          setCarbs("");
          setFat("");
          setServing("");
          onClose();
        },
      },
    );
  }, [
    addMeal,
    todayLog,
    name,
    calories,
    protein,
    carbs,
    fat,
    serving,
    selectedCategory,
    onClose,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={addStyles.container} edges={["top", "bottom"]}>
        <View style={addStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={addStyles.title}>Add Food</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Category selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={addStyles.catScroll}
        >
          <View style={addStyles.catRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  addStyles.catChip,
                  selectedCategory === cat && addStyles.catChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={addStyles.catIcon}>{CATEGORY_ICONS[cat]}</Text>
                <Text
                  style={[
                    addStyles.catText,
                    selectedCategory === cat && addStyles.catTextActive,
                  ]}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Tab switcher */}
        <View style={addStyles.tabs}>
          {(["quick", "custom"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[addStyles.tabBtn, tab === t && addStyles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text
                style={[
                  addStyles.tabText,
                  tab === t && addStyles.tabTextActive,
                ]}
              >
                {t === "quick" ? "⚡ Quick Add" : "✏️ Custom Entry"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {tab === "quick" ? (
            <>
              {/* Search */}
              <View style={addStyles.searchRow}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  style={addStyles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search foods…"
                  placeholderTextColor={colors.textFaint}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView contentContainerStyle={addStyles.foodList}>
                {filteredFoods.map((food, i) => (
                  <TouchableOpacity
                    key={i}
                    style={addStyles.foodItem}
                    onPress={() => handleAddQuick(food)}
                    disabled={addMeal.isPending}
                  >
                    <Text style={addStyles.foodEmoji}>{food.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={addStyles.foodName}>{food.name}</Text>
                      <Text style={addStyles.foodMacros}>
                        {food.calories} kcal · P {food.proteinG}g · C{" "}
                        {food.carbsG}g · F {food.fatG}g
                      </Text>
                    </View>
                    <Ionicons
                      name="add-circle"
                      size={24}
                      color={colors.accent}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <ScrollView contentContainerStyle={addStyles.customForm}>
              {[
                {
                  label: "Food Name *",
                  val: name,
                  set: setName,
                  kb: "default" as const,
                  placeholder: "e.g. Grilled Chicken",
                },
                {
                  label: "Calories (kcal) *",
                  val: calories,
                  set: setCalories,
                  kb: "decimal-pad" as const,
                  placeholder: "0",
                },
                {
                  label: "Protein (g)",
                  val: protein,
                  set: setProtein,
                  kb: "decimal-pad" as const,
                  placeholder: "0",
                },
                {
                  label: "Carbs (g)",
                  val: carbs,
                  set: setCarbs,
                  kb: "decimal-pad" as const,
                  placeholder: "0",
                },
                {
                  label: "Fat (g)",
                  val: fat,
                  set: setFat,
                  kb: "decimal-pad" as const,
                  placeholder: "0",
                },
                {
                  label: "Serving size (g)",
                  val: serving,
                  set: setServing,
                  kb: "decimal-pad" as const,
                  placeholder: "optional",
                },
              ].map((f) => (
                <View key={f.label} style={addStyles.customField}>
                  <Text style={addStyles.customLabel}>{f.label}</Text>
                  <TextInput
                    style={addStyles.customInput}
                    value={f.val}
                    onChangeText={f.set}
                    keyboardType={f.kb}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textFaint}
                    selectTextOnFocus
                  />
                </View>
              ))}
              <Button
                label="Add Food"
                fullWidth
                loading={addMeal.isPending}
                onPress={handleAddCustom}
              />
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const addStyles = StyleSheet.create({
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
  catScroll: { maxHeight: 52 },
  catRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  catIcon: { fontSize: 14 },
  catText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  catTextActive: { color: colors.accent },
  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: colors.surface },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  tabTextActive: { color: colors.text },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    paddingVertical: spacing.sm,
  },
  foodList: { paddingHorizontal: spacing.lg, paddingBottom: spacing["5xl"] },
  foodItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  foodEmoji: { fontSize: 24, width: 36, textAlign: "center" },
  foodName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  foodMacros: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  customForm: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing["5xl"],
  },
  customField: { gap: spacing.xs },
  customLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  customInput: {
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

// ─── Main Nutrition Screen ────────────────────────────────────────────────────

export default function NutritionScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCategory, setAddCategory] = useState<MealCategory>("lunch");

  const goals = DEFAULT_GOALS; // Phase 6 will allow customization
  const { data: todayLogs = [] } = useTodayNutrition();
  const updateWater = useUpdateWater();

  const todayLog = todayLogs[0];
  const totalCals = todayLog?.calories ?? 0;
  const totalProtein = todayLog?.proteinG ?? 0;
  const totalCarbs = todayLog?.carbsG ?? 0;
  const totalFat = todayLog?.fatG ?? 0;
  const waterMl = todayLog?.waterMl ?? 0;

  // Group meals by category
  const mealsByCategory = useMemo(() => {
    const result: Partial<Record<MealCategory, typeof COMMON_FOODS>> = {};
    for (const meal of todayLog?.meals ?? []) {
      const cat = meal.category as MealCategory;
      if (!result[cat]) result[cat] = [];
      result[cat]!.push(meal as any);
    }
    return result;
  }, [todayLog]);

  const handleWaterAdd = useCallback(() => {
    const newWater = waterMl + WATER_STEP_ML;
    updateWater.mutate({
      logId: todayLog?._id,
      waterMl: newWater,
      currentData: todayLog,
    });
  }, [waterMl, updateWater, todayLog]);

  const handleWaterRemove = useCallback(() => {
    if (waterMl <= 0) return;
    const newWater = Math.max(0, waterMl - WATER_STEP_ML);
    updateWater.mutate({
      logId: todayLog?._id,
      waterMl: newWater,
      currentData: todayLog,
    });
  }, [waterMl, updateWater, todayLog]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AddFoodModal
        visible={showAddModal}
        defaultCategory={addCategory}
        onClose={() => setShowAddModal(false)}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Nutrition</Text>
            <Text style={styles.dateLabel}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          <Button
            label="+ Food"
            size="sm"
            onPress={() => {
              setAddCategory("lunch");
              setShowAddModal(true);
            }}
          />
        </View>

        {/* Macro summary */}
        <Card>
          <MacroSummary
            calories={totalCals}
            goalCalories={goals.calories}
            protein={totalProtein}
            goalProtein={goals.proteinG}
            carbs={totalCarbs}
            goalCarbs={goals.carbsG}
            fat={totalFat}
            goalFat={goals.fatG}
          />
        </Card>

        {/* Water */}
        <WaterTracker
          waterMl={waterMl}
          goalMl={goals.waterMl}
          onAdd={handleWaterAdd}
          onRemove={handleWaterRemove}
        />

        {/* Meals by category */}
        {(CATEGORIES as MealCategory[]).map((cat) => {
          const meals = mealsByCategory[cat] ?? [];
          return (
            <View key={cat} style={styles.mealSection}>
              <View style={styles.mealSectionHeader}>
                <Text style={styles.mealSectionTitle}>
                  {CATEGORY_ICONS[cat]}{" "}
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
                </Text>
                {meals.length > 0 && (
                  <Text style={styles.mealSectionCals}>
                    {meals.reduce((s, m) => s + m.calories, 0)} kcal
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setAddCategory(cat);
                    setShowAddModal(true);
                  }}
                  style={styles.addMealBtn}
                >
                  <Ionicons name="add" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {meals.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyMeal}
                  onPress={() => {
                    setAddCategory(cat);
                    setShowAddModal(true);
                  }}
                >
                  <Text style={styles.emptyMealText}>
                    Tap + to log {cat.replace("-", " ")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Card style={{ gap: 0 }}>
                  {meals.map((meal, i) => (
                    <View key={i} style={styles.mealRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        <Text style={styles.mealMacros}>
                          P {meal.proteinG}g · C {meal.carbsG}g · F {meal.fatG}g
                          {meal.servingG ? ` · ${meal.servingG}g` : ""}
                        </Text>
                      </View>
                      <Text style={styles.mealCals}>{meal.calories}</Text>
                    </View>
                  ))}
                </Card>
              )}
            </View>
          );
        })}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
  },
  dateLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  mealSection: { gap: spacing.sm },
  mealSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mealSectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
    flex: 1,
  },
  mealSectionCals: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  addMealBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMeal: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  emptyMealText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textFaint,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  mealName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  mealMacros: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  mealCals: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.accent,
  },
});
