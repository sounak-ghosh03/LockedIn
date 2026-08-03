import { Schema, model, Document } from "mongoose";

export interface IBodyMeasurement extends Document {
  userId: string;
  date: Date;
  weightKg: number;
  bodyFatPercent: number;
  chest: number;
  arms: number;
  waist: number;
  legs: number;
}

const bodyMeasurementSchema = new Schema<IBodyMeasurement>(
  {
    userId: { type: String, required: true },
    date: { type: Date, required: true, default: () => new Date() },
    weightKg: { type: Number, default: 0 },
    bodyFatPercent: { type: Number, default: 0 },
    chest: { type: Number, default: 0 },
    arms: { type: Number, default: 0 },
    waist: { type: Number, default: 0 },
    legs: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Compound index for sorted per-user queries
bodyMeasurementSchema.index({ userId: 1, date: -1 });

export const BodyMeasurement = model<IBodyMeasurement>(
  "BodyMeasurement",
  bodyMeasurementSchema,
);
