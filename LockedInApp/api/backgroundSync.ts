import { BACKGROUND_SYNC_INTERVAL_MS } from "../constants/config";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Called once per sync cycle.
 * Should be non-throwing — any error is caught here and treated as a
 * temporary failure (retry next cycle).
 */
export type SyncCallback = () => Promise<void>;

/**
 * Called only when the backend explicitly reports that authentication is
 * invalid (HTTP 401).  Network errors and 5xx responses are NOT treated
 * as auth failures — they are retried next cycle.
 */
export type AuthFailureCallback = () => void;

// ─── Module-level state (singleton guard) ─────────────────────────────────────

let intervalId: ReturnType<typeof setInterval> | null = null;
let onSyncCallback: SyncCallback | null = null;
let onAuthFailureCallback: AuthFailureCallback | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Determines whether a caught error is an actual authentication failure
 * (HTTP 401) rather than a transient network or server-side problem.
 *
 * Duck-typed check on the ApiError shape so it works without introducing
 * a circular import between api/ modules.
 */
function isAuthError(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    return (err as { status: number }).status === 401;
  }
  return false;
}

/**
 * Run one sync cycle.  All errors are handled here so the caller (setInterval)
 * never sees an unhandled rejection.
 */
async function runSyncCycle(): Promise<void> {
  if (!onSyncCallback) return;

  try {
    await onSyncCallback();
  } catch (err) {
    if (isAuthError(err)) {
      // Actual authentication failure — stop the sync loop and notify the app.
      console.warn("[backgroundSync] Auth failure detected — stopping sync.");
      stopBackgroundSync();
      onAuthFailureCallback?.();
    } else {
      // Transient network/server error — log and retry next cycle.
      console.warn("[backgroundSync] Sync cycle failed (will retry):", err);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the ~1-minute background sync loop.
 *
 * Safe to call multiple times — subsequent calls while the loop is already
 * running are no-ops (the existing timer is reused, callbacks are updated).
 *
 * @param onSync         Async callback executed once per cycle.
 * @param onAuthFailure  Called if the backend responds with HTTP 401,
 *                       indicating that the JWT is genuinely invalid/expired.
 */
export function startBackgroundSync(
  onSync: SyncCallback,
  onAuthFailure: AuthFailureCallback,
): void {
  // Always update callbacks so a re-login refreshes the closure context.
  onSyncCallback = onSync;
  onAuthFailureCallback = onAuthFailure;

  // Singleton guard — do not create a second interval.
  if (intervalId !== null) return;

  intervalId = setInterval(() => {
    runSyncCycle().catch(() => {
      // runSyncCycle already handles all errors internally; this is a safety net.
    });
  }, BACKGROUND_SYNC_INTERVAL_MS);

  console.log(
    `[backgroundSync] Started — interval ${BACKGROUND_SYNC_INTERVAL_MS / 1000}s`,
  );
}

/**
 * Stop the background sync loop.
 *
 * Call this when the user logs out so authenticated background requests stop.
 * Safe to call when the loop is not running.
 */
export function stopBackgroundSync(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[backgroundSync] Stopped.");
  }
  onSyncCallback = null;
  onAuthFailureCallback = null;
}
