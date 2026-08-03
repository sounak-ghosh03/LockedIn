import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import {
  verifyToken,
  AuthenticatedRequest,
} from "../middleware/verifyGoogleToken";
import { NutritionLog } from "../models/NutritionLog";

const router = Router();
router.use(verifyToken);

const mealSchema = z.object({
  name: z.string().min(1),
  calories: z.number().min(0).default(0),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
});

const nutritionLogSchema = z.object({
  date: z.string().datetime().optional(),
  calories: z.number().min(0).default(0),
  proteinG: z.number().min(0).default(0),
  carbsG: z.number().min(0).default(0),
  fatG: z.number().min(0).default(0),
  waterMl: z.number().min(0).default(0),
  meals: z.array(mealSchema).default([]),
});

/** GET /nutrition-logs */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.query as Record<string, string>;
      const filter: Record<string, unknown> = { userId: req.userId };
      if (from || to) {
        filter.date = {};
        if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
        if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
      }
      const logs = await NutritionLog.find(filter).sort({ date: -1 });
      res.json(logs);
    } catch (err) {
      next(err);
    }
  },
);

/** POST /nutrition-logs */
router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = nutritionLogSchema.parse(req.body);
      const log = await NutritionLog.create({
        ...data,
        userId: req.userId,
        date: data.date ? new Date(data.date) : new Date(),
      });
      res.status(201).json(log);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
