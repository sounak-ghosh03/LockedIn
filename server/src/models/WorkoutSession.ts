import { Schema, model, Document, Types } from "mongoose";

interface SetEntry {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  isNewPR: boolean;
}

interface ExerciseLog {
  exerciseId: string;
  name: string;
  sets: SetEntry[];
  notes: string;
}

export interface IWorkoutSession extends Document {
  userId: string;
  planId?: Types.ObjectId;
  date: Date;
  durationMinutes: number;
  totalVolumeKg: number;
  exercises: ExerciseLog[];
  overallNotes: string;
}

const setEntrySchema = new Schema<SetEntry>(
  {
    setNumber: { type: Number, required: true },
    weightKg: { type: Number, default: 0 },
    reps: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    isNewPR: { type: Boolean, default: false },
  },
  { _id: false },
);

const exerciseLogSchema = new Schema<ExerciseLog>(
  {
    exerciseId: { type: String, required: true },
    name: { type: String, required: true },
    sets: [setEntrySchema],
    notes: { type: String, default: "" },
  },
  { _id: false },
);

const workoutSessionSchema = new Schema<IWorkoutSession>(
  {
    userId: { type: String, required: true },
    planId: { type: Schema.Types.ObjectId, ref: "WorkoutPlan" },
    date: { type: Date, required: true, default: () => new Date() },
    durationMinutes: { type: Number, default: 0 },
    totalVolumeKg: { type: Number, default: 0 },
    exercises: [exerciseLogSchema],
    overallNotes: { type: String, default: "" },
  },
  { timestamps: true },
);

// Compound indexes — critical for analytics/heatmap aggregation
workoutSessionSchema.index({ userId: 1, date: -1 });
workoutSessionSchema.index({ userId: 1, "exercises.exerciseId": 1 });

export const WorkoutSession = model<IWorkoutSession>(
  "WorkoutSession",
  workoutSessionSchema,
);
