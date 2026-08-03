import dotenv from "dotenv";

// ─── Startup env validation — fail fast with a clear error ───────────────────
dotenv.config();

const REQUIRED_ENV = ["MONGO_URI", "GOOGLE_CLIENT_ID", "JWT_SECRET"] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[STARTUP] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ─── Now safe to import everything that reads env vars ────────────────────────
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/node";
import { connectDB } from "./db";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import workoutPlanRoutes from "./routes/workoutPlans";
import workoutSessionRoutes from "./routes/workoutSessions";
import measurementRoutes from "./routes/measurements";
import nutritionRoutes from "./routes/nutrition";
import taskRoutes from "./routes/tasks";
import taskSessionRoutes from "./routes/taskSessions";
import activityRoutes from "./routes/activity";
import aiRoutes from "./routes/ai";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// ─── Sentry (optional — no-op if SENTRY_DSN is empty) ────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    // Scrub sensitive data so API keys / JWTs never appear in Sentry reports
    beforeSend(event) {
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>)[
          "authorization"
        ];
      }
      return event;
    },
  });
}

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS — lock to nothing (no browser client) ───────────────────────────────
app.use(
  cors({
    origin: false, // disables CORS for all browser origins; only native/server clients allowed
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// ─── Body parsing with explicit size limit ────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ─── Global rate limiting ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Tighter limit on auth endpoint
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Try again in 15 minutes." },
});
app.use("/auth", authLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/me", userRoutes);
app.use("/workout-plans", workoutPlanRoutes);
app.use("/workout-sessions", workoutSessionRoutes);
app.use("/measurements", measurementRoutes);
app.use("/nutrition-logs", nutritionRoutes);
app.use("/tasks", taskRoutes);
app.use("/task-sessions", taskSessionRoutes);
app.use("/activity", activityRoutes);
app.use("/ai", aiRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ─── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ─── Connect to DB then start listening ──────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] LockedIn API running on port ${PORT}`);
  });
});
