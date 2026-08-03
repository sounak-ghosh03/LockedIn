import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import {
  verifyToken,
  AuthenticatedRequest,
} from "../middleware/verifyGoogleToken";
import { WorkoutSession } from "../models/WorkoutSession";

const router = Router();
router.use(verifyToken);

const setEntrySchema = z.object({
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0).default(0),
  reps: z.number().int().min(0).default(0),
  completed: z.boolean().default(false),
  isNewPR: z.boolean().default(false),
});

const exerciseLogSchema = z.object({
  exerciseId: z.string().min(1),
  name: z.string().min(1),
  sets: z.array(setEntrySchema),
  notes: z.string().default(""),
});

const createSessionSchema = z.object({
  planId: z.string().optional(),
  date: z.string().datetime().optional(),
  durationMinutes: z.number().min(0).default(0),
  totalVolumeKg: z.number().min(0).default(0),
  exercises: z.array(exerciseLogSchema),
  overallNotes: z.string().default(""),
});

/** GET /workout-sessions — optionally filter by date range */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { from, to, limit = "50" } = req.query as Record<string, string>;
      const filter: Record<string, unknown> = { userId: req.userId };
      if (from || to) {
        filter.date = {};
        if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
        if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
      }
      const sessions = await WorkoutSession.find(filter)
        .sort({ date: -1 })
        .limit(parseInt(limit, 10));
      res.json(sessions);
    } catch (err) {
      next(err);
    }
  },
);

/** POST /workout-sessions */
router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createSessionSchema.parse(req.body);
      const session = await WorkoutSession.create({
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

/** PATCH /workout-sessions/:id */
router.patch(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createSessionSchema.partial().parse(req.body);
      const session = await WorkoutSession.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { $set: data },
        { new: true },
      );
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      res.json(session);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
