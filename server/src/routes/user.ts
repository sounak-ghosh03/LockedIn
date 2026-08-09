import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import {
  verifyToken,
  AuthenticatedRequest,
} from "../middleware/verifyGoogleToken";
import { User } from "../models/User";
import { WorkoutSession } from "../models/WorkoutSession";
import { WorkoutPlan } from "../models/WorkoutPlan";
import { Task } from "../models/Task";
import { TaskSession } from "../models/TaskSession";
import { BodyMeasurement } from "../models/BodyMeasurement";

const router = Router();

// All /me routes require authentication
router.use(verifyToken);

/** GET /me — current user profile */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await User.findOne({ _id: req.userId });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({
        id: user._id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        units: user.units,
        aiProvider: user.aiProvider,
        restTimerDefaultSeconds: user.restTimerDefaultSeconds,
        goals: user.goals,
        // Signal (not value) whether keys are configured
        geminiApiKey: user.geminiApiKey ? "••••••••" : "",
        openaiApiKey: user.openaiApiKey ? "••••••••" : "",
      });
    } catch (err) {
      next(err);
    }
  },
);

const updateUserSchema = z.object({
  units: z.enum(["metric", "imperial"]).optional(),
  aiProvider: z.enum(["gemini", "openai", "both"]).optional(),
  geminiApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  restTimerDefaultSeconds: z.number().int().min(15).max(600).optional(),
  goals: z
    .object({
      weightKg: z.number().min(0).max(500).optional(),
      bodyFat: z.number().min(0).max(100).optional(),
      dailyCalories: z.number().min(500).max(10000).optional(),
    })
    .optional(),
});

/** PATCH /me — update settings / API keys / goals */
router.patch(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateUserSchema.parse(req.body);

      // Build flat $set to support partial goals update
      const flatSet: Record<string, unknown> = {};
      if (data.units !== undefined) flatSet.units = data.units;
      if (data.aiProvider !== undefined) flatSet.aiProvider = data.aiProvider;
      if (data.geminiApiKey !== undefined)
        flatSet.geminiApiKey = data.geminiApiKey;
      if (data.openaiApiKey !== undefined)
        flatSet.openaiApiKey = data.openaiApiKey;
      if (data.restTimerDefaultSeconds !== undefined)
        flatSet.restTimerDefaultSeconds = data.restTimerDefaultSeconds;
      if (data.goals) {
        if (data.goals.weightKg !== undefined)
          flatSet["goals.weightKg"] = data.goals.weightKg;
        if (data.goals.bodyFat !== undefined)
          flatSet["goals.bodyFat"] = data.goals.bodyFat;
        if (data.goals.dailyCalories !== undefined)
          flatSet["goals.dailyCalories"] = data.goals.dailyCalories;
      }

      const user = await User.findOneAndUpdate(
        { _id: req.userId },
        { $set: flatSet },
        { new: true },
      );
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

/** DELETE /me — permanently delete account and all user data */
router.delete(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      // Delete all user data in parallel (best-effort — don't block on failures)
      await Promise.allSettled([
        User.deleteOne({ _id: userId }),
        WorkoutSession.deleteMany({ userId }),
        WorkoutPlan.deleteMany({ userId }),
        Task.deleteMany({ userId }),
        TaskSession.deleteMany({ userId }),
        BodyMeasurement.deleteMany({ userId }),
      ]);

      res.json({ ok: true, message: "Account deleted" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
