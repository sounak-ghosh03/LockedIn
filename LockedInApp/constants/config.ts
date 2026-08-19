// ─── Backend API base URL ───────────────────────────────────────────────────
//
// Credentials are loaded from environment variables so they are never
// hard-coded in source control.  Copy .env.example → .env and fill in
// your values before running the app.
//
// Expo natively supports variables prefixed with EXPO_PUBLIC_:
//   https://docs.expo.dev/guides/environment-variables/
//
// DEV:  Set EXPO_PUBLIC_DEV_MACHINE_IP to your computer's local network IP so
//       that physical devices (phones running Expo Go) can reach the dev server.
//       Find it with `ipconfig` (Windows) or `ifconfig` (Mac/Linux).
//         e.g. "192.168.1.42"  — NOT "10.0.2.2" (Android emulator only)
//
// PROD: Set EXPO_PUBLIC_PROD_API_URL to your hosted backend URL.

const DEV_MACHINE_IP = process.env.EXPO_PUBLIC_DEV_MACHINE_IP;
const PROD_API_URL = process.env.EXPO_PUBLIC_PROD_API_URL;

if (__DEV__ && !DEV_MACHINE_IP) {
  console.warn(
    "[config] EXPO_PUBLIC_DEV_MACHINE_IP is not set. " +
      "Copy .env.example to .env and fill in your machine's LAN IP.",
  );
}

if (!__DEV__ && !PROD_API_URL) {
  console.warn(
    "[config] EXPO_PUBLIC_PROD_API_URL is not set. " +
      "Ensure the variable is configured in your EAS build environment or .env file.",
  );
}

export const API_BASE_URL = __DEV__
  ? `http://${DEV_MACHINE_IP}:3000`
  : (PROD_API_URL ?? "");

// TanStack Query stale times
export const STALE_TIMES = {
  workoutSessions: 5 * 60 * 1000, // 5 min
  measurements: 10 * 60 * 1000, // 10 min
  nutritionLogs: 5 * 60 * 1000,
  tasks: 2 * 60 * 1000,
  heatmap: 0, // always refetch — home screen must reflect latest activity immediately
} as const;

// Offline queue settings
export const OFFLINE_QUEUE = {
  maxSize: 100,
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

// Background synchronisation interval
// Runs once per cycle after the initial authentication is complete.
// Covers: session re-validation (GET /me), offline-queue flush,
// and any other periodic backend operations.
export const BACKGROUND_SYNC_INTERVAL_MS = 60_000; // ~1 minute
