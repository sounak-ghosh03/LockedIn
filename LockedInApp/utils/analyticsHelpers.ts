import type { WorkoutSessionData } from "../api/queries/useWorkoutSessions";

interface VolumePoint {
  date: string; // YYYY-MM-DD
  totalVolumeKg: number;
  durationMinutes: number;
}

interface PRRecord {
  exerciseId: string;
  exerciseName: string;
  best1RM: number;
  bestWeightKg: number;
  bestReps: number;
  achievedDate: string;
}

/** Volume per day from sessions — used for charts */
export function getVolumeHistory(
  sessions: WorkoutSessionData[],
): VolumePoint[] {
  const byDate: Record<string, VolumePoint> = {};
  for (const s of sessions) {
    if (!s?.date) continue;
    const date = s.date.slice(0, 10);
    if (!byDate[date]) {
      byDate[date] = { date, totalVolumeKg: 0, durationMinutes: 0 };
    }
    byDate[date].totalVolumeKg += s.totalVolumeKg ?? 0;
    byDate[date].durationMinutes += s.durationMinutes ?? 0;
  }
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

/** Weekly frequency — how many workouts per week */
export function getWeeklyFrequency(
  sessions: WorkoutSessionData[],
): Array<{ week: string; count: number }> {
  const byWeek: Record<string, number> = {};
  for (const s of sessions) {
    if (!s?.date) continue;
    const d = new Date(s.date);
    if (isNaN(d.getTime())) continue; // guard against malformed dates -> RangeError
    d.setDate(d.getDate() - d.getDay()); // Sunday of that week
    const week = d.toISOString().slice(0, 10);
    byWeek[week] = (byWeek[week] ?? 0) + 1;
  }
  return Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));
}

/** Extract PR per exercise from all sessions */
export function extractPRs(sessions: WorkoutSessionData[]): PRRecord[] {
  const prMap: Record<string, PRRecord> = {};

  for (const s of sessions) {
    if (!s?.exercises?.length) continue;
    for (const ex of s.exercises) {
      if (!ex?.sets?.length || !ex.exerciseId) continue;
      for (const set of ex.sets) {
        if (!set?.completed) continue;
        if (!(set.weightKg > 0) || !(set.reps > 0)) continue;
        const est1RM = Math.round(set.weightKg * (1 + set.reps / 30) * 10) / 10;
        const existing = prMap[ex.exerciseId];
        if (!existing || est1RM > existing.best1RM) {
          prMap[ex.exerciseId] = {
            exerciseId: ex.exerciseId,
            exerciseName: ex.name ?? "Unknown exercise",
            best1RM: est1RM,
            bestWeightKg: set.weightKg,
            bestReps: set.reps,
            achievedDate: s.date ? s.date.slice(0, 10) : "",
          };
        }
      }
    }
  }

  return Object.values(prMap).sort((a, b) => b.best1RM - a.best1RM);
}

/** Workouts per muscle group from all sessions */
export function muscleGroupFrequency(
  sessions: WorkoutSessionData[],
): Array<{ muscle: string; count: number }> {
  // Use exercise name heuristics since we don't store muscle group in sessions
  // Simplified: just count exercises by name prefix
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    if (!s?.exercises?.length) continue;
    for (const ex of s.exercises) {
      if (!ex?.name || !ex.sets?.length) continue;
      counts[ex.name] =
        (counts[ex.name] ?? 0) + ex.sets.filter((st) => st?.completed).length;
    }
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([muscle, count]) => ({ muscle, count }));
}

/** PR history over time — best est. 1RM per exercise per day for charting */
export function extractPRHistory(
  sessions: WorkoutSessionData[],
): Record<string, Array<{ date: string; value: number; label: string }>> {
  // Map: exerciseId → array of { date, best1RM }
  const history: Record<string, Array<{ date: string; best1RM: number }>> = {};
  // Build the exerciseId -> exerciseName lookup in the SAME pass (was O(n^2) before).
  const exerciseNames: Record<string, string> = {};

  // Sort sessions ascending by date, filtering out anything malformed first.
  const sorted = [...sessions]
    .filter((s) => !!s?.date && !!s.exercises?.length)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const s of sorted) {
    const date = s.date.slice(0, 10);
    for (const ex of s.exercises) {
      if (!ex?.exerciseId || !ex.sets?.length) continue;
      if (!exerciseNames[ex.exerciseId]) {
        exerciseNames[ex.exerciseId] = ex.name ?? ex.exerciseId;
      }
      for (const set of ex.sets) {
        if (!set?.completed) continue;
        if (!(set.weightKg > 0) || !(set.reps > 0)) continue;
        const est1RM = Math.round(set.weightKg * (1 + set.reps / 30) * 10) / 10;
        if (!history[ex.exerciseId]) {
          history[ex.exerciseId] = [];
        }
        const arr = history[ex.exerciseId];
        const last = arr.length ? arr[arr.length - 1] : undefined; // avoid .at() (ES2022)
        // Only keep one data point per date (best on that date)
        if (last && last.date === date) {
          if (est1RM > last.best1RM) last.best1RM = est1RM;
        } else {
          arr.push({ date, best1RM: est1RM });
        }
      }
    }
  }

  // Return as chart-ready arrays, keyed by exerciseName (looked up in O(1) now)
  const result: Record<
    string,
    Array<{ date: string; value: number; label: string }>
  > = {};
  for (const [exId, points] of Object.entries(history)) {
    const exName = exerciseNames[exId] ?? exId;
    result[exName] = points.map((p) => ({
      date: p.date,
      value: p.best1RM,
      label: p.date.slice(5), // MM-DD
    }));
  }
  return result;
}
