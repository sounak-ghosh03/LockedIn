// Epley formula: estimated 1RM = weight × (1 + reps / 30)
// Returns 0 if reps === 0 or weight === 0
export function estimated1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** Returns the highest estimated 1RM across all completed sets for an exercise */
export function bestSet1RM(
  sets: Array<{ weightKg: number; reps: number; completed: boolean }>,
): number {
  return sets
    .filter((s) => s.completed)
    .reduce((best, s) => Math.max(best, estimated1RM(s.weightKg, s.reps)), 0);
}

/**
 * Given previous sessions and current completed sets, returns
 * { isPR: boolean, previousBest1RM: number, current1RM: number }
 */
export function checkPR(
  exerciseId: string,
  currentSets: Array<{ weightKg: number; reps: number; completed: boolean }>,
  previousSessions: Array<{
    exercises: Array<{
      exerciseId: string;
      sets: Array<{ weightKg: number; reps: number; completed: boolean }>;
    }>;
  }>,
): { isPR: boolean; previousBest: number; current: number } {
  let previousBest = 0;

  for (const session of previousSessions) {
    for (const ex of session.exercises) {
      if (ex.exerciseId === exerciseId) {
        previousBest = Math.max(previousBest, bestSet1RM(ex.sets));
      }
    }
  }

  const current = bestSet1RM(currentSets);
  return {
    isPR: current > 0 && current > previousBest,
    previousBest,
    current,
  };
}
