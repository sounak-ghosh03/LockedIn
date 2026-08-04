import { create } from "zustand";

interface NutritionEntry {
  date: string; // YYYY-MM-DD
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

interface NutritionState {
  todayEntry: NutritionEntry;
  goals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    waterMl: number;
  };
  setToday: (entry: NutritionEntry) => void;
  setGoals: (goals: NutritionState["goals"]) => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export const useNutritionStore = create<NutritionState>((set) => ({
  todayEntry: {
    date: todayStr(),
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    waterMl: 0,
  },
  goals: {
    calories: 2200,
    proteinG: 160,
    carbsG: 220,
    fatG: 70,
    waterMl: 2500,
  },
  setToday: (entry) => set({ todayEntry: entry }),
  setGoals: (goals) => set({ goals }),
}));
