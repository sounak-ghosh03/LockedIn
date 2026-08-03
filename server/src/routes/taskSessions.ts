import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import {
  verifyToken,
  AuthenticatedRequest,
} from "../middleware/verifyGoogleToken";
import { TaskSession } from "../models/TaskSession";

const router = Router();
router.use(verifyToken);

const createTaskSessionSchema = z.object({
  taskId: z.string().optional(),
  category: z.enum(["study", "coding", "custom"]),
  customCategoryLabel: z.string().default(""),
  date: z.string().datetime().optional(),
  durationMinutes: z.number().min(0),
  notes: z.string().default(""),
});

/** GET /task-sessions — filter by category, date range */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { category, from, to } = req.query as Record<string, string>;
      const filter: Record<string, unknown> = { userId: req.userId };
      if (category) filter.category = category;
      if (from || to) {
        filter.date = {};
        if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
        if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
      }
      const sessions = await TaskSession.find(filter).sort({ date: -1 });
      res.json(sessions);
    } catch (err) {
      next(err);
    }
  },
);

/** POST /task-sessions */
router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createTaskSessionSchema.parse(req.body);
      const session = await TaskSession.create({
        ...data,
        userId: req.userId,
        date: data.date ? new Date(data.date) : new Date(),
      });
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  },
);

/** DELETE /task-sessions/:id */
router.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await TaskSession.deleteOne({
        _id: req.params.id,
        userId: req.userId,
      });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
