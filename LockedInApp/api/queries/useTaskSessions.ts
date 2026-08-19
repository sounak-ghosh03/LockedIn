import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { enqueueWrite } from "../offlineQueue";

export type SessionCategory =
  | "study"
  | "coding"
  | "fitness"
  | "work"
  | "personal"
  | "custom";

export interface TaskSession {
  _id: string;
  taskId?: string;
  category: SessionCategory;
  customCategoryLabel: string;
  date: string;
  durationMinutes: number;
  notes: string;
}

export const SESSION_CATEGORY_META: Record<
  SessionCategory,
  { label: string; icon: string; color: string }
> = {
  study: { label: "Study", icon: "📚", color: "#007AFF" },
  coding: { label: "Coding", icon: "💻", color: "#00D084" },
  fitness: { label: "Fitness", icon: "💪", color: "#FF4D00" },
  work: { label: "Work", icon: "💼", color: "#FFB800" },
  personal: { label: "Personal", icon: "🌟", color: "#AF52DE" },
  custom: { label: "Custom", icon: "⏱️", color: "#888888" },
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useTaskSessions(opts?: {
  category?: SessionCategory;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.category) params.set("category", opts.category);
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  const query = params.toString() ? `?${params}` : "";

  return useQuery<TaskSession[]>({
    queryKey: ["taskSessions", opts],
    queryFn: () => api.get(`/task-sessions${query}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveTaskSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      taskId?: string;
      category: SessionCategory;
      customCategoryLabel?: string;
      durationMinutes: number;
      notes?: string;
    }) => {
      const payload = {
        ...data,
        customCategoryLabel: data.customCategoryLabel ?? "",
        notes: data.notes ?? "",
        date: new Date().toISOString(),
      };
      try {
        return await api.post<TaskSession>("/task-sessions", payload);
      } catch (err: any) {
        if (err?.name === "TypeError" || err?.message?.includes("Network")) {
          await enqueueWrite("POST", "/task-sessions", payload);
          return null;
        }
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taskSessions"] });
      qc.refetchQueries({ queryKey: ["heatmap"] });
    },
  });
}

/** Aggregate total focus minutes per category for a given session list */
export function aggregateFocusByCategory(
  sessions: TaskSession[],
): Array<{
  category: SessionCategory;
  label: string;
  icon: string;
  color: string;
  totalMinutes: number;
}> {
  const map: Partial<Record<SessionCategory, number>> = {};
  for (const s of sessions) {
    map[s.category] = (map[s.category] ?? 0) + s.durationMinutes;
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b! - a!)
    .map(([cat, mins]) => ({
      category: cat as SessionCategory,
      ...(SESSION_CATEGORY_META[cat as SessionCategory] ?? {
        label: cat,
        icon: "⏱",
        color: "#888",
      }),
      totalMinutes: mins!,
    }));
}
