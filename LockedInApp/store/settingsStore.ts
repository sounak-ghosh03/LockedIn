import { create } from "zustand";

interface SettingsState {
  units: "metric" | "imperial";
  aiProvider: "gemini" | "openai" | "both";
  restTimerDefaultSeconds: number;
  notificationsEnabled: boolean;
  setUnits: (units: "metric" | "imperial") => void;
  setAiProvider: (p: "gemini" | "openai" | "both") => void;
  setRestTimerDefault: (seconds: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  hydrate: (
    data: Partial<
      Omit<
        SettingsState,
        | "setUnits"
        | "setAiProvider"
        | "setRestTimerDefault"
        | "setNotificationsEnabled"
        | "hydrate"
      >
    >,
  ) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  units: "metric",
  aiProvider: "gemini",
  restTimerDefaultSeconds: 90,
  notificationsEnabled: true,

  setUnits: (units) => set({ units }),
  setAiProvider: (aiProvider) => set({ aiProvider }),
  setRestTimerDefault: (restTimerDefaultSeconds) =>
    set({ restTimerDefaultSeconds }),
  setNotificationsEnabled: (notificationsEnabled) =>
    set({ notificationsEnabled }),
  hydrate: (data) => set((s) => ({ ...s, ...data })),
}));
