import { Schema, model, Document } from "mongoose";

export type TaskCategory =
  | "study"
  | "coding"
  | "fitness"
  | "work"
  | "personal"
  | "custom";
export type TaskPriority = "high" | "medium" | "low";

export interface ISubtask {
  title: string;
  completed: boolean;
}

export interface ITask extends Document {
  userId: string;
  title: string;
  category: TaskCategory;
  customCategoryLabel: string;
  priority: TaskPriority;
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
  subtasks: ISubtask[];
  createdAt: Date;
}

const subtaskSchema = new Schema<ISubtask>(
  {
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false },
);

const CATEGORIES = [
  "study",
  "coding",
  "fitness",
  "work",
  "personal",
  "custom",
] as const;

const taskSchema = new Schema<ITask>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, enum: CATEGORIES, default: "custom" },
    customCategoryLabel: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    notes: { type: String },
    subtasks: { type: [subtaskSchema], default: [] },
  },
  { timestamps: true },
);

taskSchema.index({ userId: 1, completed: 1, dueDate: 1 });
taskSchema.index({ userId: 1, priority: 1 });

export const Task = model<ITask>("Task", taskSchema);
