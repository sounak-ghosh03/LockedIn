import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { enqueueWrite } from "../offlineQueue";

export interface WorkoutSessionData {
  _id: string;
  planId?: string;
  date: string;
  durationMinutes: number;
  totalVolumeKg: number;
  exercises: Array<{
    exerciseId: string;
    name: string;
    sets: Array<{
      setNumber: number;
      weightKg: number;
      reps: number;
      completed: boolean;
      isNewPR: boolean;
    }>;
    notes: string;
  }>;
  overallNotes: string;
}

export function useWorkoutSessions(opts?: { limit?: number; from?: string }) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.from) params.set("from", opts.from);
  const query = params.toString() ? `?${params}` : "";

  return useQuery<WorkoutSessionData[]>({
    queryKey: ["workoutSessions", opts],
    queryFn: () => api.get(`/workout-sessions${query}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveWorkoutSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<WorkoutSessionData, "_id">) => {
      try {
        return await api.post<WorkoutSessionData>("/workout-sessions", data);
      } catch (err: any) {
        // Network error → queue for offline sync
        if (err?.name === "TypeError" || err?.message?.includes("Network")) {
          await enqueueWrite("POST", "/workout-sessions", data);
          return null; // queued
        }
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workoutSessions"] });
      // Force an immediate refetch (not just mark-stale) so the home-screen
      // heatmap updates as soon as the user navigates back, regardless of the
      // 15-minute staleTime on that query.
      qc.refetchQueries({ queryKey: ["heatmap"] });
    },
  });
}
