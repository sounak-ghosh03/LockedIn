import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SetEntry {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  isNewPR: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  name: string;
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
  markSetPR: (exerciseIdx: number, setIdx: number) => void;
  updateExerciseNotes: (exerciseIdx: number, notes: string) => void;
  updateOverallNotes: (notes: string) => void;
  addSet: (exerciseIdx: number) => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeSession: null,

  startSession: (planName, exercisesDef, planId) => {
    const exercises: ExerciseLog[] = exercisesDef.map((ex, _i) => ({
      ...ex,
      sets: Array.from({ length: 3 }, (_, idx) => ({
        setNumber: idx + 1,
        weightKg: 0,
        reps: 0,
        completed: false,
        isNewPR: false,
      })),
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
        const newSet: SetEntry = {
          setNumber: ex.sets.length + 1,
          weightKg: ex.sets.at(-1)?.weightKg ?? 0,
          reps: ex.sets.at(-1)?.reps ?? 0,
          completed: false,
          isNewPR: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      });
      return { activeSession: { ...s.activeSession, exercises } };
    });
  },
}));
