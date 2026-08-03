import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import {
  verifyToken,
  AuthenticatedRequest,
} from "../middleware/verifyGoogleToken";
import { User } from "../models/User";

const router = Router();

// All /me routes require authentication
router.use(verifyToken);

/** GET /me — current user profile */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await User.findOne({ googleId: req.userId });
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
        // NOTE: API keys are intentionally omitted from this response
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
      weightKg: z.number().optional(),
      bodyFat: z.number().optional(),
    })
    .optional(),
});

/** PATCH /me — update settings */
router.patch(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateUserSchema.parse(req.body);
      const user = await User.findOneAndUpdate(
        { googleId: req.userId },
        { $set: data },
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

export default router;
