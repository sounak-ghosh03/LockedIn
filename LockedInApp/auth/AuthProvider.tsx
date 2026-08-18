import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  api,
  getStoredToken,
  storeToken,
  clearToken,
  ApiError,
} from "../api/client";
import { useSettingsStore } from "../store/settingsStore";
import { startOfflineQueueSync, flushQueue } from "../api/offlineQueue";
import { startBackgroundSync, stopBackgroundSync } from "../api/backgroundSync";

// Required by expo-auth-session on Android
WebBrowser.maybeCompleteAuthSession();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  googleId: string | null;
  email: string;
  name: string;
  picture: string;
  units: "metric" | "imperial";
  aiProvider: "gemini" | "openai" | "both";
  restTimerDefaultSeconds: number;
  goals: { weightKg: number; bodyFat: number; dailyCalories: number };
  geminiApiKey?: string; // "••••••••" if set, "" if not
  openaiApiKey?: string; // "••••••••" if set, "" if not
}

/**
 * Sync state for the background synchronisation loop.
 * Kept separate from authentication state so that a background request
 * never causes a global loading screen.
 *
 * - idle    — no sync in progress
 * - syncing — background cycle running
 * - error   — last cycle failed (transient); will retry next cycle
 */
export type SyncState = "idle" | "syncing" | "error";

interface AuthContextValue {
  user: AppUser | null;
  /**
   * True only during the initial startup authentication check.
   * AuthGate uses this to show its one-time loading spinner.
   * It is NOT set during background sync or user-triggered actions.
   */
  isLoading: boolean;
  /** Current state of the ~1-minute background sync loop. */
  syncState: SyncState;
  /** Primary: email/password login */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Primary: email/password registration */
  signUpWithEmail: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  /** Secondary: trigger Google OAuth flow */
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

// Replace these with your actual Google OAuth client IDs from Google Cloud Console
// Web client ID is used in Expo Go (dev), Android client ID is used in the APK
const EXPO_CLIENT_ID = "YOUR_WEB_OAUTH_CLIENT_ID.apps.googleusercontent.com";
const ANDROID_CLIENT_ID =
  "YOUR_ANDROID_OAUTH_CLIENT_ID.apps.googleusercontent.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  /**
   * isInitializing — true only while the startup GET /me check is in flight.
   * Once it resolves (success or failure) this is set to false and never
   * goes back to true.  The AuthGate spinner is driven by this flag.
   */
  const [isInitializing, setIsInitializing] = useState(true);

  /**
   * syncState — reflects the background ~1-minute sync loop only.
   * The UI must never show a full-screen spinner based on this value.
   */
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  // expo-auth-session Google provider
  const [_request, response, promptAsync] = Google.useAuthRequest({
    clientId: EXPO_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
  });

  // ─── Helper: apply user + settings after any successful auth ──────────────

  const applyUser = useCallback(
    (u: AppUser) => {
      setUser(u);
      hydrateSettings({
        units: u.units,
        aiProvider: u.aiProvider,
        restTimerDefaultSeconds: u.restTimerDefaultSeconds,
      });
    },
    [hydrateSettings],
  );

  // ─── Background sync callback (runs every ~1 minute) ──────────────────────

  /**
   * One sync cycle: re-validate the session and flush any offline writes.
   * Errors are NOT caught here — they propagate to backgroundSync.ts which
   * handles them correctly (401 → sign-out, other → retry next cycle).
   */
  const runBackgroundSync = useCallback(async () => {
    setSyncState("syncing");
    try {
      const me = await api.get<AppUser>("/me");
      applyUser(me);
      await flushQueue().catch(() => {
        // Queue flush failures are non-critical — offlineQueue handles its own
        // retry logic on the next flush call.
      });
      setSyncState("idle");
    } catch (err) {
      setSyncState("error");
      // Re-throw so backgroundSync.ts can classify the error correctly.
      throw err;
    }
  }, [applyUser]);

  // ─── Helper: finalise auth after receiving { token, user } ────────────────

  const finaliseAuth = useCallback(
    async (result: { token: string; user: AppUser }) => {
      await storeToken(result.token);
      applyUser(result.user);
      // Start (or update) the background sync loop now that we are authenticated.
      // startBackgroundSync is idempotent — safe to call on every login.
      startBackgroundSync(runBackgroundSync, async () => {
        // This is called only when the server explicitly returns 401,
        // meaning the JWT is truly invalid/expired — sign the user out.
        await clearToken();
        setUser(null);
        setSyncState("idle");
      });
    },
    [applyUser, runBackgroundSync],
  );

  // ─── On mount: restore session from SecureStore ───────────────────────────

  useEffect(() => {
    (async () => {
      const token = await getStoredToken();
      if (token) {
        try {
          const me = await api.get<AppUser>("/me");
          applyUser(me);
          // Session is valid — start background sync.
          startBackgroundSync(runBackgroundSync, async () => {
            await clearToken();
            setUser(null);
            setSyncState("idle");
          });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            // Token is expired/invalid — force re-login.
            await clearToken();
          }
          // Any other error (network down, server unavailable) is treated as
          // "cannot confirm auth right now" — we leave the token in SecureStore
          // and send the user to login so they can explicitly retry.
        }
      }
      // Initial check complete — release the AuthGate spinner.
      setIsInitializing(false);
    })();

    // Start offline queue sync listener (flushes when back online).
    // Owned here — do NOT start it again in _layout.tsx.
    const stopSync = startOfflineQueueSync();
    return () => {
      stopSync();
      // Do NOT stop the background sync timer here — this effect runs once on
      // mount/unmount of AuthProvider which lives for the app lifetime.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Handle Google OAuth response ────────────────────────────────────────

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        exchangeGoogleToken(idToken);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const exchangeGoogleToken = useCallback(
    async (idToken: string) => {
      // Note: NOT setting isLoading here — button-level loading is handled
      // by the login screen; the global gate must not block during this.
      try {
        const result = await api.post<{ token: string; user: AppUser }>(
          "/auth/google",
          { idToken },
          { skipAuth: true },
        );
        await finaliseAuth(result);
      } catch (err) {
        console.error("[auth] Google token exchange failed:", err);
      }
    },
    [finaliseAuth],
  );

  // ─── Primary: email/password login ───────────────────────────────────────

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      // Errors propagate to the screen — do NOT swallow them here.
      // NOT setting isLoading — button-level loading is on the screen.
      const result = await api.post<{ token: string; user: AppUser }>(
        "/auth/login",
        { email, password },
        { skipAuth: true },
      );
      await finaliseAuth(result);
    },
    [finaliseAuth],
  );

  // ─── Primary: email/password registration ────────────────────────────────

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      // Errors propagate to the screen — do NOT swallow them here.
      const result = await api.post<{ token: string; user: AppUser }>(
        "/auth/register",
        { name, email, password, confirmPassword: password },
        { skipAuth: true },
      );
      await finaliseAuth(result);
    },
    [finaliseAuth],
  );

  // ─── Secondary: Google OAuth ──────────────────────────────────────────────

  const signIn = useCallback(async () => {
    await promptAsync();
  }, [promptAsync]);

  // ─── Logout ───────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    // Stop the background sync before clearing credentials so that no
    // authenticated request fires after the token has been removed.
    stopBackgroundSync();
    await clearToken();
    setUser(null);
    setSyncState("idle");
  }, []);

  // ─── Refresh current user profile (on-demand) ────────────────────────────

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<AppUser>("/me");
      applyUser(me);
    } catch {
      // Silent fail on refresh — background sync will retry shortly.
    }
  }, [applyUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        // Expose isInitializing as isLoading so all existing consumers
        // compile unchanged.  It is true ONLY during the startup check.
        isLoading: isInitializing,
        syncState,
        signInWithEmail,
        signUpWithEmail,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
