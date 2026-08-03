import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  googleId: string;
  email: string;
  name: string;
  picture: string;
  goals: { weightKg: number; bodyFat: number };
  units: "metric" | "imperial";
  aiProvider: "gemini" | "openai" | "both";
  geminiApiKey: string;
  openaiApiKey: string;
  restTimerDefaultSeconds: number;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, default: "" },
    picture: { type: String, default: "" },
    goals: {
      weightKg: { type: Number, default: 0 },
      bodyFat: { type: Number, default: 0 },
    },
    units: { type: String, enum: ["metric", "imperial"], default: "metric" },
    aiProvider: {
      type: String,
      enum: ["gemini", "openai", "both"],
      default: "gemini",
    },
    // Stored as-is; encrypt at rest in a future hardening pass using a server-held key
    geminiApiKey: { type: String, default: "" },
    openaiApiKey: { type: String, default: "" },
    restTimerDefaultSeconds: { type: Number, default: 90 },
  },
  { timestamps: true },
);

export const User = model<IUser>("User", userSchema);
