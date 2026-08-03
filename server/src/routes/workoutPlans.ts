import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import {
  verifyToken,
  AuthenticatedRequest,
} from "../middleware/verifyGoogleToken";
import { WorkoutPlan } from "../models/WorkoutPlan";

const router = Router();
router.use(verifyToken);

const exerciseEntrySchema = z.object({
  exerciseId: z.string().min(1),
  name: z.string().min(1),
  targetSets: z.number().int().min(1).default(3),
  targetReps: z.number().int().min(1).default(10),
  targetWeight: z.number().min(0).default(0),
  restSeconds: z.number().int().min(0).default(90),
});

const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().default("Custom"),
  exercises: z.array(exerciseEntrySchema),
});

/** GET /workout-plans */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const plans = await WorkoutPlan.find({ userId: req.userId }).sort({
        createdAt: -1,
      });
      res.json(plans);
    } catch (err) {
      next(err);
    }
  },
);

/** POST /workout-plans */
router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createPlanSchema.parse(req.body);
      const plan = await WorkoutPlan.create({ ...data, userId: req.userId });
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /workout-plans/:id */
router.patch(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createPlanSchema.partial().parse(req.body);
      const plan = await WorkoutPlan.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { $set: data },
        { new: true },
      );
      if (!plan) {
        res.status(404).json({ error: "Plan not found" });
        return;
      }
      res.json(plan);
    } catch (err) {
      next(err);
    }
  },
);

/** DELETE /workout-plans/:id */
router.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await WorkoutPlan.deleteOne({
        _id: req.params.id,
        userId: req.userId,
      });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: "Plan not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
