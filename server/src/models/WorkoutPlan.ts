import { Schema, model, Document, Types } from "mongoose";

interface ExerciseEntry {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  restSeconds: number;
}

export interface IWorkoutPlan extends Document {
  userId: string;
  name: string;
  type: string;
  exercises: ExerciseEntry[];
}

const exerciseEntrySchema = new Schema<ExerciseEntry>(
  {
    exerciseId: { type: String, required: true },
    name: { type: String, required: true },
    targetSets: { type: Number, default: 3 },
    targetReps: { type: Number, default: 10 },
    targetWeight: { type: Number, default: 0 },
    restSeconds: { type: Number, default: 90 },
  },
  { _id: false },
);

const workoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, default: "Custom" },
    exercises: [exerciseEntrySchema],
  },
  { timestamps: true },
);

// Compound index: fast lookup of all plans for a user
workoutPlanSchema.index({ userId: 1, createdAt: -1 });

export const WorkoutPlan = model<IWorkoutPlan>(
  "WorkoutPlan",
  workoutPlanSchema,
);
