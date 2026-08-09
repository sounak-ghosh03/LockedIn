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
import { startOfflineQueueSync } from "../api/offlineQueue";

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

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  // expo-auth-session Google provider
  const [_request, response, promptAsync] = Google.useAuthRequest({
    clientId: EXPO_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
  });

  // ─── Helper: finalise auth after receiving { token, user } ────────────────

  const finaliseAuth = useCallback(
    async (result: { token: string; user: AppUser }) => {
      await storeToken(result.token);
      setUser(result.user);
      hydrateSettings({
        units: result.user.units,
        aiProvider: result.user.aiProvider,
        restTimerDefaultSeconds: result.user.restTimerDefaultSeconds,
      });
    },
    [hydrateSettings],
  );

  // ─── On mount: restore session from SecureStore ───────────────────────────

  useEffect(() => {
    (async () => {
      const token = await getStoredToken();
      if (token) {
        try {
          const me = await api.get<AppUser>("/me");
          setUser(me);
          hydrateSettings({
            units: me.units,
            aiProvider: me.aiProvider,
            restTimerDefaultSeconds: me.restTimerDefaultSeconds,
          });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            // Token expired — force re-login
            await clearToken();
          }
        }
      }
      setIsLoading(false);
    })();
    // Start offline queue sync
    const stopSync = startOfflineQueueSync();
    return stopSync;
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
      setIsLoading(true);
      try {
        const result = await api.post<{ token: string; user: AppUser }>(
          "/auth/google",
          { idToken },
          { skipAuth: true },
        );
        await finaliseAuth(result);
      } catch (err) {
        console.error("[auth] Google token exchange failed:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [finaliseAuth],
  );

  // ─── Primary: email/password login ───────────────────────────────────────

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const result = await api.post<{ token: string; user: AppUser }>(
          "/auth/login",
          { email, password },
          { skipAuth: true },
        );
        await finaliseAuth(result);
      } finally {
        // Errors propagate to the screen — do NOT swallow them here
        setIsLoading(false);
      }
    },
    [finaliseAuth],
  );

  // ─── Primary: email/password registration ────────────────────────────────

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const result = await api.post<{ token: string; user: AppUser }>(
          "/auth/register",
          { name, email, password, confirmPassword: password },
          { skipAuth: true },
        );
        await finaliseAuth(result);
      } finally {
        // Errors propagate to the screen — do NOT swallow them here
        setIsLoading(false);
      }
    },
    [finaliseAuth],
  );

  // ─── Secondary: Google OAuth ──────────────────────────────────────────────

  const signIn = useCallback(async () => {
    await promptAsync();
  }, [promptAsync]);

  // ─── Logout ───────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  // ─── Refresh current user profile ────────────────────────────────────────

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<AppUser>("/me");
      setUser(me);
      hydrateSettings({
        units: me.units,
        aiProvider: me.aiProvider,
        restTimerDefaultSeconds: me.restTimerDefaultSeconds,
      });
    } catch {
      // Silent fail on refresh
    }
  }, [hydrateSettings]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
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
