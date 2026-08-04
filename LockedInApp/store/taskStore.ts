import { create } from "zustand";

export type TaskCategory = "study" | "coding" | "custom";

export interface ActiveTaskSession {
  category: TaskCategory;
  customLabel: string;
  startTimestamp: number; // Date.now()
  linkedTaskId?: string;
}

interface TaskState {
  // Currently running timed session (Study/Coding/Custom stopwatch)
  activeSession: ActiveTaskSession | null;

  startSession: (
    category: TaskCategory,
    customLabel?: string,
    linkedTaskId?: string,
  ) => void;
  stopSession: () => ActiveTaskSession | null;
  getElapsedMinutes: () => number;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  activeSession: null,

  startSession: (category, customLabel = "", linkedTaskId) => {
    // Single-session guard: starting a new one replaces any existing
    set({
      activeSession: {
        category,
        customLabel,
        linkedTaskId,
        startTimestamp: Date.now(),
      },
    });
  },

  stopSession: () => {
    const session = get().activeSession;
    set({ activeSession: null });
    return session;
  },

  getElapsedMinutes: () => {
    const { activeSession } = get();
    if (!activeSession) return 0;
    return Math.floor((Date.now() - activeSession.startTimestamp) / 60_000);
  },
}));
