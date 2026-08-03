import { Schema, model, Document } from "mongoose";

export type TaskCategory = "study" | "coding" | "custom";

export interface ITask extends Document {
  userId: string;
  title: string;
  category: TaskCategory;
  customCategoryLabel: string;
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["study", "coding", "custom"],
      default: "custom",
    },
    customCategoryLabel: { type: String, default: "" },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

taskSchema.index({ userId: 1, completed: 1, dueDate: 1 });

export const Task = model<ITask>("Task", taskSchema);
