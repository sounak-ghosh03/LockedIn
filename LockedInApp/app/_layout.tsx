import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuthContext } from "../auth/AuthProvider";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { colors } from "../constants/theme";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Shared QueryClient — configure retry + timeout behaviour
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ─── Auth gate ────────────────────────────────────────────────────────────────
// Redirects to login if not authenticated, to tabs if authenticated.
// Lives here so it has access to the router.

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Request notification permissions on first launch (non-blocking)
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthGate>
              <StatusBar style="light" backgroundColor={colors.background} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="workout/[id]"
                  options={{
                    presentation: "card",
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="workout/new"
                  options={{
                    presentation: "card",
                    animation: "slide_from_bottom",
                  }}
                />
                <Stack.Screen
                  name="workout-history"
                  options={{
                    presentation: "card",
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="workout-session/[id]"
                  options={{
                    presentation: "card",
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="timer"
                  options={{
                    presentation: "modal",
                    animation: "slide_from_bottom",
                  }}
                />
                <Stack.Screen
                  name="ai"
                  options={{
                    presentation: "card",
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="settings"
                  options={{
                    presentation: "card",
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="calendar"
                  options={{
                    presentation: "card",
                    animation: "slide_from_right",
                  }}
                />
              </Stack>
            </AuthGate>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
