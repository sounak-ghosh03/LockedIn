import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export interface WorkoutPlan {
  _id: string;
  name: string;
  type: string;
  exercises: Array<{
    exerciseId: string;
    name: string;
    exerciseType?: "compound" | "isolation" | "cardio" | "bodyweight";
    targetSets: number;
    targetReps: number;
    targetWeight: number;
    restSeconds: number;
  }>;
}

export function useWorkoutPlans() {
  return useQuery<WorkoutPlan[]>({
    queryKey: ["workoutPlans"],
    queryFn: () => api.get("/workout-plans"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWorkoutPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<WorkoutPlan, "_id">) =>
      api.post<WorkoutPlan>("/workout-plans", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workoutPlans"] }),
  });
}

export function useUpdateWorkoutPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkoutPlan> & { id: string }) =>
      api.patch<WorkoutPlan>(`/workout-plans/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workoutPlans"] }),
  });
}

export function useDeleteWorkoutPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workout-plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workoutPlans"] }),
  });
}
