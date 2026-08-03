import { Schema, model, Document } from "mongoose";

interface MealEntry {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface INutritionLog extends Document {
  userId: string;
  date: Date;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  meals: MealEntry[];
}

const mealEntrySchema = new Schema<MealEntry>(
  {
    name: { type: String, required: true },
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
  },
  { _id: false },
);

const nutritionLogSchema = new Schema<INutritionLog>(
  {
    userId: { type: String, required: true },
    date: { type: Date, required: true, default: () => new Date() },
    calories: { type: Number, default: 0 },
    proteinG: { type: Number, default: 0 },
    carbsG: { type: Number, default: 0 },
    fatG: { type: Number, default: 0 },
    waterMl: { type: Number, default: 0 },
    meals: [mealEntrySchema],
  },
  { timestamps: true },
);

nutritionLogSchema.index({ userId: 1, date: -1 });

export const NutritionLog = model<INutritionLog>(
  "NutritionLog",
  nutritionLogSchema,
);
