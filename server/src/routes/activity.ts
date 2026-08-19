import { Router, Response, NextFunction } from "express";
import {
  verifyToken,
  AuthenticatedRequest,
} from "../middleware/verifyGoogleToken";
import { WorkoutSession } from "../models/WorkoutSession";
import { TaskSession } from "../models/TaskSession";

const router = Router();
router.use(verifyToken);

/**
 * GET /activity/heatmap
 *
 * Returns a unified daily activity array for the past 365 days.
 * Each entry: { date: string (YYYY-MM-DD), hasActivity: boolean, workoutCount: number, focusMinutes: number }
 *
 * "Active" = had at least one WorkoutSession OR one TaskSession on that day.
 * Quick checklist tasks (no timer) do NOT count — only timed sessions do.
 */
router.get(
  "/heatmap",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const now = new Date();
      // Build `from` as exactly 365 days ago at UTC midnight so the window
      // is timezone-independent regardless of where the server is running.
      const from = new Date(
        Date.UTC(
          now.getUTCFullYear() - 1,
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );

      // Aggregate workout sessions per calendar day
      const workoutAgg = await WorkoutSession.aggregate([
        {
          $match: {
            userId,
            date: { $gte: from, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" },
            },
            count: { $sum: 1 },
          },
        },
      ]);

      // Aggregate task sessions per calendar day
      const taskAgg = await TaskSession.aggregate([
        {
          $match: {
            userId,
            date: { $gte: from, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" },
            },
            focusMinutes: { $sum: "$durationMinutes" },
          },
        },
      ]);

      // Build lookup maps
      const workoutMap: Record<string, number> = {};
      for (const w of workoutAgg) workoutMap[w._id] = w.count;

      const taskMap: Record<string, number> = {};
      for (const t of taskAgg) taskMap[t._id] = t.focusMinutes;

      // Build one entry per day for the past 365 days
      const result: Array<{
        date: string;
        hasActivity: boolean;
        workoutCount: number;
        focusMinutes: number;
      }> = [];

      const cursor = new Date(from);
      while (cursor <= now) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const workoutCount = workoutMap[dateStr] ?? 0;
        const focusMinutes = taskMap[dateStr] ?? 0;
        result.push({
          date: dateStr,
          hasActivity: workoutCount > 0 || focusMinutes > 0,
          workoutCount,
          focusMinutes,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
