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
  googleId: string;
  email: string;
  name: string;
  picture: string;
  units: "metric" | "imperial";
  aiProvider: "gemini" | "openai" | "both";
  restTimerDefaultSeconds: number;
  goals: { weightKg: number; bodyFat: number };
}

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
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
    expoClientId: EXPO_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
  });

  // ─── On mount: check for stored session ────────────────────────────────────
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

  // ─── Handle Google auth response ──────────────────────────────────────────
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
        await storeToken(result.token);
        setUser(result.user);
        hydrateSettings({
          units: result.user.units,
          aiProvider: result.user.aiProvider,
          restTimerDefaultSeconds: result.user.restTimerDefaultSeconds,
        });
      } catch (err) {
        console.error("[auth] Google token exchange failed:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [hydrateSettings],
  );

  const signIn = useCallback(async () => {
    await promptAsync();
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

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
      value={{ user, isLoading, signIn, signOut, refreshUser }}
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
