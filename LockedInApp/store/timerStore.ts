import { create } from "zustand";
import * as Notifications from "expo-notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimerMode = "rest" | "stopwatch" | "warmup" | "task";

interface TimerState {
  mode: TimerMode | null;
  isRunning: boolean;
  // For countdown (rest/warmup): absolute end timestamp (ms)
  endTimestamp: number | null;
  // For stopwatch (task sessions): start timestamp (ms)
  startTimestamp: number | null;
  durationSeconds: number;
  scheduledNotificationId: string | null;
  label: string;

  startRest: (durationSeconds: number, label?: string) => Promise<void>;
  startStopwatch: (label?: string) => void;
  stop: () => Promise<void>;
  getRemainingSeconds: () => number;
  getElapsedSeconds: () => number;
}

// ─── Single-timer guard ───────────────────────────────────────────────────────
// Only one timer exists at a time. Starting a new one cancels the previous.

export const useTimerStore = create<TimerState>((set, get) => ({
  mode: null,
  isRunning: false,
  endTimestamp: null,
  startTimestamp: null,
  durationSeconds: 0,
  scheduledNotificationId: null,
  label: "",

  startRest: async (durationSeconds, label = "Rest") => {
    // Cancel existing timer + notification before starting a new one
    const prev = get().scheduledNotificationId;
    if (prev) {
      await Notifications.cancelScheduledNotificationAsync(prev).catch(
        () => {},
      );
    }

    const endTimestamp = Date.now() + durationSeconds * 1000;

    // Schedule a local notification as source-of-truth (survives JS thread sleep)
    let notificationId: string | null = null;
    try {
      notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🏋️ Rest Done!",
          body: `${label} timer finished. Time to go!`,
          sound: true,
          vibrate: [0, 250, 250, 250],
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: durationSeconds,
        },
      });
    } catch {
      // Notifications may be disabled — timer still works in-foreground
    }

    set({
      mode: "rest",
      isRunning: true,
      endTimestamp,
      startTimestamp: null,
      durationSeconds,
      scheduledNotificationId: notificationId,
      label,
    });
  },

  startStopwatch: (label = "Session") => {
    const prev = get().scheduledNotificationId;
    if (prev) {
      Notifications.cancelScheduledNotificationAsync(prev).catch(() => {});
    }
    set({
      mode: "stopwatch",
      isRunning: true,
      endTimestamp: null,
      startTimestamp: Date.now(),
      durationSeconds: 0,
      scheduledNotificationId: null,
      label,
    });
  },

  stop: async () => {
    const { scheduledNotificationId } = get();
    if (scheduledNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(
        scheduledNotificationId,
      ).catch(() => {});
    }
    set({
      mode: null,
      isRunning: false,
      endTimestamp: null,
      startTimestamp: null,
      durationSeconds: 0,
      scheduledNotificationId: null,
      label: "",
    });
  },

  // Recomputed from timestamp on every call — no drift from counting JS ticks
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
}));
