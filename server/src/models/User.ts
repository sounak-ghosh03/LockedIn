import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  googleId?: string; // present for Google-authenticated users
  email: string;
  name: string;
  picture: string;
  password?: string; // bcrypt hash — present for email/password users, empty for Google users
  authProvider: "google" | "email";
  goals: { weightKg: number; bodyFat: number; dailyCalories: number };
  units: "metric" | "imperial";
  aiProvider: "gemini" | "openai" | "both";
  geminiApiKey: string;
  openaiApiKey: string;
  restTimerDefaultSeconds: number;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    // Optional — only present for Google-authenticated accounts
    // sparse: true means null/undefined values are not indexed, so multiple
    // email-only users can exist without violating uniqueness
    googleId: { type: String, sparse: true, unique: true, index: true },

    email: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    picture: { type: String, default: "" },

    // bcrypt hash — empty string for Google-only accounts; never returned to client
    password: { type: String, default: "" },

    // Which method was used to create this account
    authProvider: {
      type: String,
      enum: ["google", "email"],
      default: "email",
    },

    goals: {
      weightKg: { type: Number, default: 75 },
      bodyFat: { type: Number, default: 15 },
      dailyCalories: { type: Number, default: 2500 },
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
