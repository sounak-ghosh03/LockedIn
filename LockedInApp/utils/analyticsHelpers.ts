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
export function useVolumeHistory(
  sessions: WorkoutSessionData[],
): VolumePoint[] {
  const byDate: Record<string, VolumePoint> = {};
  for (const s of sessions) {
    const date = s.date.slice(0, 10);
    if (!byDate[date]) {
      byDate[date] = { date, totalVolumeKg: 0, durationMinutes: 0 };
    }
    byDate[date].totalVolumeKg += s.totalVolumeKg;
    byDate[date].durationMinutes += s.durationMinutes;
  }
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

/** Weekly frequency — how many workouts per week */
export function useWeeklyFrequency(
  sessions: WorkoutSessionData[],
): Array<{ week: string; count: number }> {
  const byWeek: Record<string, number> = {};
  for (const s of sessions) {
    const d = new Date(s.date);
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
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.weightKg <= 0 || set.reps <= 0) continue;
        const est1RM = Math.round(set.weightKg * (1 + set.reps / 30) * 10) / 10;
        const existing = prMap[ex.exerciseId];
        if (!existing || est1RM > existing.best1RM) {
          prMap[ex.exerciseId] = {
            exerciseId: ex.exerciseId,
            exerciseName: ex.name,
            best1RM: est1RM,
            bestWeightKg: set.weightKg,
            bestReps: set.reps,
            achievedDate: s.date.slice(0, 10),
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
    for (const ex of s.exercises) {
      // We only have exercise name, not muscle group here — track unique exercise volume
      counts[ex.name] =
        (counts[ex.name] ?? 0) + ex.sets.filter((st) => st.completed).length;
    }
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([muscle, count]) => ({ muscle, count }));
}
