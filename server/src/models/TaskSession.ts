import { Schema, model, Document, Types } from "mongoose";
import { TaskCategory } from "./Task";

export interface ITaskSession extends Document {
  userId: string;
  taskId?: Types.ObjectId;
  category: TaskCategory;
  customCategoryLabel: string;
  date: Date;
  durationMinutes: number;
  notes: string;
}

const taskSessionSchema = new Schema<ITaskSession>(
  {
    userId: { type: String, required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    category: {
      type: String,
      enum: ["study", "coding", "fitness", "work", "personal", "custom"],
      required: true,
    },
    customCategoryLabel: { type: String, default: "" },
    date: { type: Date, required: true, default: () => new Date() },
    durationMinutes: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

// Compound index for heatmap aggregation and analytics
taskSessionSchema.index({ userId: 1, date: -1 });
taskSessionSchema.index({ userId: 1, category: 1, date: -1 });

export const TaskSession = model<ITaskSession>(
  "TaskSession",
  taskSessionSchema,
);
