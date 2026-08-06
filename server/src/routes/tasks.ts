import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import {
  verifyToken,
  AuthenticatedRequest,
} from "../middleware/verifyGoogleToken";
import { Task } from "../models/Task";

const router = Router();
router.use(verifyToken);

const CATEGORIES = [
  "study",
  "coding",
  "fitness",
  "work",
  "personal",
  "custom",
] as const;

const subtaskSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().default(false),
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(CATEGORIES).default("custom"),
  customCategoryLabel: z.string().default(""),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  subtasks: z.array(subtaskSchema).default([]),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.enum(CATEGORIES).optional(),
  customCategoryLabel: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  completed: z.boolean().optional(),
  notes: z.string().optional(),
  subtasks: z.array(subtaskSchema).optional(),
});

/** GET /tasks — filter by completed, category, priority */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { completed, category, priority } = req.query as Record<
        string,
        string
      >;
      const filter: Record<string, unknown> = { userId: req.userId };
      if (completed !== undefined) filter.completed = completed === "true";
      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      const tasks = await Task.find(filter).sort({ dueDate: 1, createdAt: -1 });
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  },
);

/** POST /tasks */
router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createTaskSchema.parse(req.body);
      const task = await Task.create({
        ...data,
        userId: req.userId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /tasks/:id — toggle complete, edit title/category/due date */
router.patch(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateTaskSchema.parse(req.body);
      const update: Record<string, unknown> = { ...data };

      // Handle completion timestamp
      if (data.completed === true) {
        update.completedAt = new Date();
      } else if (data.completed === false) {
        update.completedAt = undefined;
      }

      const task = await Task.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { $set: update },
        { new: true },
      );
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json(task);
    } catch (err) {
      next(err);
    }
  },
);

/** DELETE /tasks/:id */
router.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await Task.deleteOne({
        _id: req.params.id,
        userId: req.userId,
      });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
