import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SetEntry {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  isNewPR: boolean;
  // Cardio-specific fields (treadmill, elliptical, etc.)
  speedKmh?: number;
  inclinePercent?: number;
}

export interface ExerciseLog {
  exerciseId: string;
  name: string;
  /** Exercise type from the Exercise catalogue — drives UI (cardio vs strength) */
  exerciseType: "compound" | "isolation" | "cardio" | "bodyweight";
  sets: SetEntry[];
  notes: string;
}

export interface ActiveSession {
  planId?: string;
  planName: string;
  startTime: number; // Date.now()
  exercises: ExerciseLog[];
  overallNotes: string;
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface WorkoutState {
  activeSession: ActiveSession | null;

  startSession: (
    planName: string,
    exercises: Omit<ExerciseLog, "sets">[],
    planId?: string,
  ) => void;
  endSession: () => ActiveSession | null;
  toggleSetDone: (exerciseIdx: number, setIdx: number) => void;
  updateSetWeight: (
    exerciseIdx: number,
    setIdx: number,
    weightKg: number,
  ) => void;
  updateSetReps: (exerciseIdx: number, setIdx: number, reps: number) => void;
  updateSetSpeed: (
    exerciseIdx: number,
    setIdx: number,
    speedKmh: number,
  ) => void;
  updateSetIncline: (
    exerciseIdx: number,
    setIdx: number,
    inclinePercent: number,
  ) => void;
  markSetPR: (exerciseIdx: number, setIdx: number) => void;
  updateExerciseNotes: (exerciseIdx: number, notes: string) => void;
  updateOverallNotes: (notes: string) => void;
  addSet: (exerciseIdx: number) => void;
  /** Add a brand-new exercise to the active session (e.g. from the in-workout picker) */
  addExercise: (exercise: Omit<ExerciseLog, "sets">) => void;
  /** Remove an exercise by index (with user confirmation handled at the UI layer) */
  removeExercise: (exerciseIdx: number) => void;
  /** Reorder exercises by moving the item at `from` to position `to` */
  reorderExercises: (from: number, to: number) => void;
}

function makeDefaultSets(count = 3): SetEntry[] {
  return Array.from({ length: count }, (_, idx) => ({
    setNumber: idx + 1,
    weightKg: 0,
    reps: 0,
    completed: false,
    isNewPR: false,
  }));
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeSession: null,

  startSession: (planName, exercisesDef, planId) => {
    const exercises: ExerciseLog[] = exercisesDef.map((ex) => ({
      ...ex,
      sets: makeDefaultSets(3),
    }));
    set({
      activeSession: {
        planId,
        planName,
        startTime: Date.now(),
        exercises,
        overallNotes: "",
      },
    });
  },

  endSession: () => {
    const session = get().activeSession;
    set({ activeSession: null });
    return session;
  },

  toggleSetDone: (exerciseIdx, setIdx) => {
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, ei) => {
        if (ei !== exerciseIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((st, si) =>
            si === setIdx ? { ...st, completed: !st.completed } : st,
          ),
        };
      });
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },

  updateSetWeight: (exerciseIdx, setIdx, weightKg) => {
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, ei) => {
        if (ei !== exerciseIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((st, si) =>
            si === setIdx ? { ...st, weightKg } : st,
          ),
        };
      });
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },

  updateSetReps: (exerciseIdx, setIdx, reps) => {
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, ei) => {
        if (ei !== exerciseIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((st, si) => (si === setIdx ? { ...st, reps } : st)),
        };
      });
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },

  updateSetSpeed: (exerciseIdx, setIdx, speedKmh) => {
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, ei) => {
        if (ei !== exerciseIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((st, si) =>
            si === setIdx ? { ...st, speedKmh } : st,
          ),
        };
      });
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },

  updateSetIncline: (exerciseIdx, setIdx, inclinePercent) => {
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, ei) => {
        if (ei !== exerciseIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((st, si) =>
            si === setIdx ? { ...st, inclinePercent } : st,
          ),
        };
      });
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },

  markSetPR: (exerciseIdx, setIdx) => {
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, ei) => {
        if (ei !== exerciseIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((st, si) =>
            si === setIdx ? { ...st, isNewPR: true } : st,
          ),
        };
      });
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },

  updateExerciseNotes: (exerciseIdx, notes) => {
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, ei) =>
        ei === exerciseIdx ? { ...ex, notes } : ex,
      );
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },

  updateOverallNotes: (overallNotes) => {
    set((s) => {
      if (!s.activeSession) return s;
      return { activeSession: { ...s.activeSession, overallNotes } };
    });
  },

  addSet: (exerciseIdx) => {
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, ei) => {
        if (ei !== exerciseIdx) return ex;
        const last = ex.sets.at(-1);
        const newSet: SetEntry = {
          setNumber: ex.sets.length + 1,
          weightKg: last?.weightKg ?? 0,
          reps: last?.reps ?? 0,
          completed: false,
          isNewPR: false,
          speedKmh: last?.speedKmh,
          inclinePercent: last?.inclinePercent,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      });
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },

  addExercise: (exerciseDef) => {
    set((s) => {
      if (!s.activeSession) return s;
      const newExercise: ExerciseLog = {
        ...exerciseDef,
        sets: makeDefaultSets(3),
      };
      return {
        activeSession: {
          ...s.activeSession,
          exercises: [...s.activeSession.exercises, newExercise],
        },
      };
    });
  },

  removeExercise: (exerciseIdx) => {
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.filter(
        (_, ei) => ei !== exerciseIdx,
      );
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },

  reorderExercises: (from, to) => {
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = [...s.activeSession.exercises];
      const [moved] = exercises.splice(from, 1);
      exercises.splice(to, 0, moved);
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },
}));
