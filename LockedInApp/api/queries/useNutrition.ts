import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { enqueueWrite } from '../offlineQueue';

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre-workout' | 'post-workout';

export interface MealItem {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG?: number;
}

export interface NutritionLog {
  _id: string;
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  meals: Array<MealItem & { category: MealCategory; time?: string }>;
}

export interface NutritionGoals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

export function useNutritionLogs(from: string, to?: string) {
  const toStr = to ?? from;
  return useQuery<NutritionLog[]>({
    queryKey: ['nutritionLogs', from, toStr],
    queryFn: () =>
      api.get(`/nutrition-logs?from=${from}T00:00:00Z&to=${toStr}T23:59:59Z`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTodayNutrition() {
  const today = new Date().toISOString().slice(0, 10);
  return useNutritionLogs(today);
}

export function useWeekNutrition() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const from = monday.toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);
  return useNutritionLogs(from, to);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useAddMealToLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      existingLogId,
      meal,
      todayMacros,
    }: {
      existingLogId?: string;
      meal: MealItem & { category: MealCategory };
      todayMacros?: { calories: number; proteinG: number; carbsG: number; fatG: number; waterMl: number; meals: any[] };
    }) => {
      const now = new Date().toISOString();
      const entry = {
        ...meal,
        time: now,
      };

      try {
        if (existingLogId && todayMacros) {
          return await api.patch(`/nutrition-logs/${existingLogId}`, {
            calories: todayMacros.calories + meal.calories,
            proteinG: todayMacros.proteinG + meal.proteinG,
            carbsG: todayMacros.carbsG + meal.carbsG,
            fatG: todayMacros.fatG + meal.fatG,
            waterMl: todayMacros.waterMl,
            meals: [...(todayMacros.meals ?? []), entry],
          });
        }
        return await api.post('/nutrition-logs', {
          date: now,
          calories: meal.calories,
          proteinG: meal.proteinG,
          carbsG: meal.carbsG,
          fatG: meal.fatG,
          waterMl: 0,
          meals: [entry],
        });
      } catch (err: any) {
        if (err?.name === 'TypeError' || err?.message?.includes('Network')) {
          await enqueueWrite('POST', '/nutrition-logs', { date: now, meals: [entry] });
          return null;
        }
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutritionLogs'] }),
  });
}

export function useUpdateWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      logId,
      waterMl,
      currentData,
    }: {
      logId?: string;
      waterMl: number;
      currentData?: Partial<NutritionLog>;
    }) => {
      if (logId) {
        return api.patch(`/nutrition-logs/${logId}`, { waterMl });
      }
      return api.post('/nutrition-logs', {
        date: new Date().toISOString(),
        calories: currentData?.calories ?? 0,
        proteinG: currentData?.proteinG ?? 0,
        carbsG: currentData?.carbsG ?? 0,
        fatG: currentData?.fatG ?? 0,
        waterMl,
        meals: currentData?.meals ?? [],
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutritionLogs'] }),
  });
}

// ─── Common foods library ─────────────────────────────────────────────────────

export const COMMON_FOODS: Array<MealItem & { emoji: string; category: MealCategory }> = [
  { name: 'Chicken Breast (100g)', emoji: '🍗', calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6, servingG: 100, category: 'lunch' },
  { name: 'Whole Eggs (2)',        emoji: '🥚', calories: 140, proteinG: 12, carbsG: 1,  fatG: 10,  servingG: 120, category: 'breakfast' },
  { name: 'Greek Yogurt (200g)',   emoji: '🥛', calories: 130, proteinG: 17, carbsG: 9,  fatG: 3,   servingG: 200, category: 'snack' },
  { name: 'Oats (80g dry)',        emoji: '🌾', calories: 300, proteinG: 11, carbsG: 54, fatG: 6,   servingG: 80,  category: 'breakfast' },
  { name: 'Brown Rice (100g dry)', emoji: '🍚', calories: 360, proteinG: 8,  carbsG: 76, fatG: 3,   servingG: 100, category: 'lunch' },
  { name: 'Whey Protein Shake',    emoji: '🥤', calories: 130, proteinG: 25, carbsG: 5,  fatG: 2,   servingG: 35,  category: 'post-workout' },
  { name: 'Banana',                emoji: '🍌', calories: 90,  proteinG: 1,  carbsG: 23, fatG: 0,   servingG: 120, category: 'snack' },
  { name: 'Almonds (30g)',         emoji: '🥜', calories: 174, proteinG: 6,  carbsG: 6,  fatG: 15,  servingG: 30,  category: 'snack' },
  { name: 'Salmon (150g)',         emoji: '🐟', calories: 280, proteinG: 39, carbsG: 0,  fatG: 13,  servingG: 150, category: 'dinner' },
  { name: 'Sweet Potato (200g)',   emoji: '🍠', calories: 172, proteinG: 3,  carbsG: 40, fatG: 0,   servingG: 200, category: 'dinner' },
  { name: 'Cottage Cheese (200g)',emoji: '🧀', calories: 160, proteinG: 28, carbsG: 6,  fatG: 2,   servingG: 200, category: 'snack' },
  { name: 'Tuna Can (185g)',       emoji: '🥫', calories: 180, proteinG: 40, carbsG: 0,  fatG: 2,   servingG: 185, category: 'lunch' },
  { name: 'White Rice (100g dry)', emoji: '🍚', calories: 360, proteinG: 7,  carbsG: 79, fatG: 1,   servingG: 100, category: 'lunch' },
  { name: 'Broccoli (200g)',       emoji: '🥦', calories: 68,  proteinG: 6,  carbsG: 13, fatG: 1,   servingG: 200, category: 'dinner' },
  { name: 'Avocado (100g)',        emoji: '🥑', calories: 160, proteinG: 2,  carbsG: 9,  fatG: 15,  servingG: 100, category: 'snack' },
  { name: 'Peanut Butter (30g)',   emoji: '🥜', calories: 188, proteinG: 8,  carbsG: 6,  fatG: 16,  servingG: 30,  category: 'snack' },
  { name: 'Milk (250ml)',          emoji: '🥛', calories: 150, proteinG: 8,  carbsG: 12, fatG: 8,   servingG: 250, category: 'breakfast' },
  { name: 'Black Beans (100g)',    emoji: '🫘', calories: 132, proteinG: 9,  carbsG: 24, fatG: 0.5, servingG: 100, category: 'lunch' },
];

// ─── Default nutrition goals ──────────────────────────────────────────────────

export const DEFAULT_GOALS: NutritionGoals = {
  calories: 2200,
  proteinG: 160,
  carbsG: 220,
  fatG: 70,
  waterMl: 2500,
};
