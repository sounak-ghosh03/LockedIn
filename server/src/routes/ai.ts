import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import {
  verifyToken,
  AuthenticatedRequest,
} from "../middleware/verifyGoogleToken";
import { User } from "../models/User";
import { WorkoutSession } from "../models/WorkoutSession";
import { TaskSession } from "../models/TaskSession";
import { Task } from "../models/Task";
import rateLimit from "express-rate-limit";

const router = Router();
router.use(verifyToken);

// Tight rate limit for AI — protects user's own API quota
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Wait a minute and try again." },
});

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  provider: z.enum(["gemini", "openai"]).optional(),
});

/** POST /ai/chat */
router.post(
  "/chat",
  aiLimiter,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const controller = new AbortController();
    // Timeout: 30 seconds — if the AI provider hangs, return a clean error
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const { message, provider: reqProvider } = chatSchema.parse(req.body);

      const user = await User.findOne({ googleId: req.userId });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const activeProvider =
        reqProvider ??
        (user.aiProvider === "both" ? "gemini" : user.aiProvider);

      // Build context from recent data
      const [recentSessions, recentTaskSessions, pendingTasks] =
        await Promise.all([
          WorkoutSession.find({ userId: req.userId })
            .sort({ date: -1 })
            .limit(10),
          TaskSession.find({ userId: req.userId }).sort({ date: -1 }).limit(20),
          Task.find({ userId: req.userId, completed: false }).limit(10),
        ]);

      const focusByCategory: Record<string, number> = {};
      for (const ts of recentTaskSessions) {
        focusByCategory[ts.category] =
          (focusByCategory[ts.category] ?? 0) + ts.durationMinutes;
      }

      const systemContext = `
You are an AI coach for a fitness and productivity app called LockedIn. 
The user's recent data:
- Last ${recentSessions.length} workouts: ${JSON.stringify(
        recentSessions.map((s) => ({
          date: s.date.toISOString().slice(0, 10),
          duration: s.durationMinutes,
          volume: s.totalVolumeKg,
          exercises: s.exercises.map((e) => e.name).slice(0, 5),
        })),
      )}
- Focus time (last 20 sessions): ${JSON.stringify(focusByCategory)} minutes by category
- Pending tasks: ${pendingTasks.map((t) => t.title).join(", ")}
- User goals: weight ${user.goals.weightKg}kg, body fat ${user.goals.bodyFat}%
- Units: ${user.units}

Answer the user's question based on this data. Be concise, motivating, and practical.
`.trim();

      let reply = "";

      if (activeProvider === "gemini") {
        if (!user.geminiApiKey) {
          res
            .status(400)
            .json({
              error: "Gemini API key not configured. Go to Settings to add it.",
            });
          return;
        }
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${user.geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: systemContext + "\n\nUser: " + message }],
                },
              ],
            }),
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini error: ${errText}`);
        }
        const data = (await response.json()) as {
          candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
        };
        reply =
          data.candidates?.[0]?.content.parts[0]?.text ??
          "No response from Gemini.";
      } else {
        // OpenAI
        if (!user.openaiApiKey) {
          res
            .status(400)
            .json({
              error: "OpenAI API key not configured. Go to Settings to add it.",
            });
          return;
        }
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.openaiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemContext },
                { role: "user", content: message },
              ],
              max_tokens: 1000,
            }),
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI error: ${errText}`);
        }
        const data = (await response.json()) as {
          choices?: Array<{ message: { content: string } }>;
        };
        reply =
          data.choices?.[0]?.message?.content ?? "No response from OpenAI.";
      }

      res.json({ reply, provider: activeProvider });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        res
          .status(504)
          .json({ error: "AI provider timed out. Please try again." });
        return;
      }
      next(err);
    } finally {
      clearTimeout(timeout);
    }
  },
);

export default router;
