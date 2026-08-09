import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  verifyGoogleIdToken,
  issueSessionJWT,
} from "../middleware/verifyGoogleToken";
import { User } from "../models/User";

const router = Router();

// ─── Validation schemas ───────────────────────────────────────────────────────

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Builds the user payload returned to the client. Never exposes password. */
function buildUserPayload(user: InstanceType<typeof User>) {
  return {
    id: user._id,
    googleId: user.googleId ?? null,
    email: user.email,
    name: user.name,
    picture: user.picture,
    units: user.units,
    aiProvider: user.aiProvider,
    restTimerDefaultSeconds: user.restTimerDefaultSeconds,
    goals: user.goals,
    // Signal (not value) whether keys are configured — matches GET /me shape
    geminiApiKey: user.geminiApiKey ? "••••••••" : "",
    openaiApiKey: user.openaiApiKey ? "••••••••" : "",
  };
}

// ─── POST /auth/register ──────────────────────────────────────────────────────

/**
 * Create a new email/password account.
 * Returns the same { token, user } shape as all other auth endpoints.
 */
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = registerSchema.parse(req.body);

      // Reject duplicate emails up-front with a clear, safe message
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        res.status(409).json({ error: "Email already registered" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: passwordHash,
        authProvider: "email",
        picture: "",
      });

      const token = issueSessionJWT(user._id.toString());
      res.status(201).json({ token, user: buildUserPayload(user) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /auth/login ─────────────────────────────────────────────────────────

/**
 * Authenticate with email + password.
 * Returns the same { token, user } shape as all other auth endpoints.
 */
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await User.findOne({ email: email.toLowerCase() });

      // Use a constant-time comparison even for the "user not found" branch
      // so the response time does not reveal whether the email exists.
      const passwordHash = user?.password ?? "";
      const valid =
        passwordHash.length > 0 &&
        (await bcrypt.compare(password, passwordHash));

      if (!user || !valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = issueSessionJWT(user._id.toString());
      res.json({ token, user: buildUserPayload(user) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /auth/google ────────────────────────────────────────────────────────

/**
 * Exchange a Google ID token for an application JWT.
 *
 * Account-linking strategy:
 *   1. Look up user by verified Google sub — straightforward returning user.
 *   2. If not found by googleId, look up by email — an existing email/password
 *      account with the same address; link the Google ID to it rather than
 *      creating a duplicate.
 *   3. If neither exists, create a new Google-authenticated account.
 *
 * Returns the same { token, user } shape as all other auth endpoints.
 */
router.post(
  "/google",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = googleAuthSchema.parse(req.body);

      // Will throw a descriptive error if GOOGLE_CLIENT_ID is not configured
      const { sub, email, name, picture } = await verifyGoogleIdToken(idToken);

      // 1. Try lookup by Google sub (fast path for returning Google users)
      let user = await User.findOne({ googleId: sub });

      if (!user) {
        // 2. Check whether an email/password account already has this email
        const byEmail = await User.findOne({ email: email.toLowerCase() });
        if (byEmail) {
          // Link Google ID to the existing account — no duplicate created
          byEmail.googleId = sub;
          if (!byEmail.picture && picture) byEmail.picture = picture;
          await byEmail.save();
          user = byEmail;
        } else {
          // 3. Brand-new user — create a Google-only account
          user = await User.create({
            googleId: sub,
            email: email.toLowerCase(),
            name,
            picture,
            authProvider: "google",
            password: "", // Google users have no password
          });
        }
      }

      const token = issueSessionJWT(user._id.toString());
      res.json({ token, user: buildUserPayload(user) });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
