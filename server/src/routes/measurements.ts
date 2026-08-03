import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import {
  verifyToken,
  AuthenticatedRequest,
} from "../middleware/verifyGoogleToken";
import { BodyMeasurement } from "../models/BodyMeasurement";

const router = Router();
router.use(verifyToken);

const measurementSchema = z.object({
  date: z.string().datetime().optional(),
  weightKg: z.number().min(0).default(0),
  bodyFatPercent: z.number().min(0).max(100).default(0),
  chest: z.number().min(0).default(0),
  arms: z.number().min(0).default(0),
  waist: z.number().min(0).default(0),
  legs: z.number().min(0).default(0),
});

/** GET /measurements */
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
      const measurements = await BodyMeasurement.find(filter).sort({
        date: -1,
      });
      res.json(measurements);
    } catch (err) {
      next(err);
    }
  },
);

/** POST /measurements */
router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = measurementSchema.parse(req.body);
      const m = await BodyMeasurement.create({
        ...data,
        userId: req.userId,
        date: data.date ? new Date(data.date) : new Date(),
      });
      res.status(201).json(m);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
