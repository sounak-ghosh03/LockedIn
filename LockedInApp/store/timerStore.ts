import { create } from "zustand";
import * as Notifications from "expo-notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimerMode =
  | "rest"
  | "stopwatch"
  | "pomodoro-work"
  | "pomodoro-break"
  | "pomodoro-long";

export type PomodoroPhase = "work" | "break" | "long-break" | "idle";

interface PomodoroConfig {
  workMinutes: number; // default 25
  breakMinutes: number; // default 5
  longBreakMinutes: number; // default 15
  cyclesBeforeLong: number; // default 4
}

interface TimerState {
  // Core timer
  mode: TimerMode | null;
  isRunning: boolean;
  endTimestamp: number | null; // For countdown modes
  startTimestamp: number | null; // For stopwatch mode
  durationSeconds: number;
  scheduledNotificationId: string | null;
  label: string;

  // Pomodoro state
  pomodoroPhase: PomodoroPhase;
  pomodoroCycle: number; // Current cycle (1-based, resets after long break)
  pomodoroTotalWorkSessions: number; // Total completed work sessions in this run
  pomodoroConfig: PomodoroConfig;
  isPomodoroMode: boolean;

  // Actions — basic timers
  startRest: (durationSeconds: number, label?: string) => Promise<void>;
  startStopwatch: (label?: string) => void;
  stop: () => Promise<void>;

  // Actions — Pomodoro
  setPomodoroConfig: (config: Partial<PomodoroConfig>) => void;
  startPomodoro: () => Promise<void>;
  nextPomodoroPhase: () => Promise<void>;

  // Computed getters
  getRemainingSeconds: () => number;
  getElapsedSeconds: () => number;
  getPomodoroProgress: () => number; // 0–1
}

const DEFAULT_POMODORO: PomodoroConfig = {
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLong: 4,
};

async function scheduleNotif(
  title: string,
  body: string,
  seconds: number,
): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        vibrate: [0, 250, 250, 250],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
  } catch {
    return null;
  }
}

async function cancelNotif(id: string | null) {
  if (id)
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useTimerStore = create<TimerState>((set, get) => ({
  mode: null,
  isRunning: false,
  endTimestamp: null,
  startTimestamp: null,
  durationSeconds: 0,
  scheduledNotificationId: null,
  label: "",

  pomodoroPhase: "idle",
  pomodoroCycle: 1,
  pomodoroTotalWorkSessions: 0,
  pomodoroConfig: DEFAULT_POMODORO,
  isPomodoroMode: false,

  // ─── Basic timers ────────────────────────────────────────────────────────────

  startRest: async (durationSeconds, label = "Rest") => {
    await cancelNotif(get().scheduledNotificationId);
    const endTimestamp = Date.now() + durationSeconds * 1000;
    const notif = await scheduleNotif(
      "🏋️ Rest Done!",
      `${label} timer finished. Time to go!`,
      durationSeconds,
    );
    set({
      mode: "rest",
      isRunning: true,
      endTimestamp,
      startTimestamp: null,
      durationSeconds,
      scheduledNotificationId: notif,
      label,
      isPomodoroMode: false,
      pomodoroPhase: "idle",
    });
  },

  startStopwatch: (label = "Session") => {
    cancelNotif(get().scheduledNotificationId);
    set({
      mode: "stopwatch",
      isRunning: true,
      endTimestamp: null,
      startTimestamp: Date.now(),
      durationSeconds: 0,
      scheduledNotificationId: null,
      label,
      isPomodoroMode: false,
      pomodoroPhase: "idle",
    });
  },

  stop: async () => {
    await cancelNotif(get().scheduledNotificationId);
    set({
      mode: null,
      isRunning: false,
      endTimestamp: null,
      startTimestamp: null,
      durationSeconds: 0,
      scheduledNotificationId: null,
      label: "",
      isPomodoroMode: false,
      pomodoroPhase: "idle",
    });
  },

  // ─── Pomodoro ────────────────────────────────────────────────────────────────

  setPomodoroConfig: (config) => {
    set((s) => ({ pomodoroConfig: { ...s.pomodoroConfig, ...config } }));
  },

  startPomodoro: async () => {
    await cancelNotif(get().scheduledNotificationId);
    const { pomodoroConfig } = get();
    const durationSeconds = pomodoroConfig.workMinutes * 60;
    const endTimestamp = Date.now() + durationSeconds * 1000;

    const notif = await scheduleNotif(
      "🍅 Pomodoro Done!",
      "Work session complete. Time for a break!",
      durationSeconds,
    );

    set({
      mode: "pomodoro-work",
      isRunning: true,
      endTimestamp,
      startTimestamp: Date.now(), // Track when work session started for logging
      durationSeconds,
      scheduledNotificationId: notif,
      label: `🍅 Work — Cycle ${get().pomodoroCycle}`,
      isPomodoroMode: true,
      pomodoroPhase: "work",
      pomodoroCycle: 1,
      pomodoroTotalWorkSessions: 0,
    });
  },

  nextPomodoroPhase: async () => {
    await cancelNotif(get().scheduledNotificationId);
    const {
      pomodoroPhase,
      pomodoroCycle,
      pomodoroTotalWorkSessions,
      pomodoroConfig,
    } = get();

    let nextPhase: PomodoroPhase;
    let nextMode: TimerMode;
    let nextCycle = pomodoroCycle;
    let nextTotalWork = pomodoroTotalWorkSessions;
    let durationSeconds: number;
    let notifTitle: string;
    let notifBody: string;
    let label: string;

    if (pomodoroPhase === "work") {
      nextTotalWork = pomodoroTotalWorkSessions + 1;
      const isLongBreak = nextTotalWork % pomodoroConfig.cyclesBeforeLong === 0;
      nextPhase = isLongBreak ? "long-break" : "break";
      nextMode = isLongBreak ? "pomodoro-long" : "pomodoro-break";
      durationSeconds = isLongBreak
        ? pomodoroConfig.longBreakMinutes * 60
        : pomodoroConfig.breakMinutes * 60;
      notifTitle = isLongBreak ? "🌴 Long Break Done!" : "⚡ Break Over!";
      notifBody = "Ready for your next work session!";
      label = isLongBreak ? "🌴 Long Break" : "☕ Break";
    } else {
      // Coming from break → start next work session
      nextPhase = "work";
      nextMode = "pomodoro-work";
      nextCycle = pomodoroCycle + 1;
      durationSeconds = pomodoroConfig.workMinutes * 60;
      notifTitle = "🍅 Pomodoro Done!";
      notifBody = "Work session complete. Take a break!";
      label = `🍅 Work — Cycle ${nextCycle}`;
    }

    const endTimestamp = Date.now() + durationSeconds * 1000;
    const notif = await scheduleNotif(notifTitle, notifBody, durationSeconds);

    set({
      mode: nextMode,
      isRunning: true,
      endTimestamp,
      startTimestamp: nextPhase === "work" ? Date.now() : null,
      durationSeconds,
      scheduledNotificationId: notif,
      label,
      pomodoroPhase: nextPhase,
      pomodoroCycle: nextCycle,
      pomodoroTotalWorkSessions: nextTotalWork,
    });
  },

  // ─── Computed getters ────────────────────────────────────────────────────────

  getRemainingSeconds: () => {
    const { endTimestamp } = get();
    if (!endTimestamp) return 0;
    return Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
  },

  getElapsedSeconds: () => {
    const { startTimestamp } = get();
    if (!startTimestamp) return 0;
    return Math.floor((Date.now() - startTimestamp) / 1000);
  },

  getPomodoroProgress: () => {
    const { durationSeconds, endTimestamp, mode } = get();
    if (!endTimestamp || durationSeconds === 0) return 0;
    const remaining = Math.max(0, (endTimestamp - Date.now()) / 1000);
    return 1 - remaining / durationSeconds;
  },
}));
