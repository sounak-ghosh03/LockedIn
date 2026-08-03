import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  verifyGoogleIdToken,
  issueSessionJWT,
} from "../middleware/verifyGoogleToken";
import { User } from "../models/User";

const router = Router();

const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});

/**
 * POST /auth/google
 * Exchange Google ID token → upsert User → return session JWT
 */
router.post(
  "/google",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = googleAuthSchema.parse(req.body);

      const { sub, email, name, picture } = await verifyGoogleIdToken(idToken);

      // Upsert — create user on first login, update profile on subsequent logins
      const user = await User.findOneAndUpdate(
        { googleId: sub },
        {
          $setOnInsert: { googleId: sub, createdAt: new Date() },
          $set: { email, name, picture },
        },
        { upsert: true, new: true },
      );

      const sessionToken = issueSessionJWT(sub);

      res.json({
        token: sessionToken,
        user: {
          id: user._id,
          googleId: user.googleId,
          email: user.email,
          name: user.name,
          picture: user.picture,
          units: user.units,
          aiProvider: user.aiProvider,
          restTimerDefaultSeconds: user.restTimerDefaultSeconds,
          goals: user.goals,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
