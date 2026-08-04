// Backend API base URL — update this to your Render/Railway URL for production
export const API_BASE_URL = __DEV__
  ? "http://10.0.2.2:3000" // Android emulator → localhost
  : "https://your-backend.onrender.com"; // ← replace before building APK

// TanStack Query stale times
export const STALE_TIMES = {
  workoutSessions: 5 * 60 * 1000, // 5 min
  measurements: 10 * 60 * 1000, // 10 min
  nutritionLogs: 5 * 60 * 1000,
  tasks: 2 * 60 * 1000,
  heatmap: 15 * 60 * 1000,
} as const;

// Offline queue settings
export const OFFLINE_QUEUE = {
  maxSize: 100,
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;
