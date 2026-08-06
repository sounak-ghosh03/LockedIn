import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { enqueueWrite } from '../offlineQueue';

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskCategory = 'study' | 'coding' | 'fitness' | 'work' | 'personal' | 'custom';

export interface Subtask {
  title: string;
  completed: boolean;
}

export interface Task {
  _id: string;
  title: string;
  category: TaskCategory;
  customCategoryLabel: string;
  priority: TaskPriority;
  completed: boolean;
  dueDate?: string;   // ISO string
  notes?: string;
  subtasks: Subtask[];
  createdAt: string;
}

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  high:   { label: 'High',   color: '#FF3B30', icon: '🔴' },
  medium: { label: 'Medium', color: '#FFB800', icon: '🟡' },
  low:    { label: 'Low',    color: '#00D084', icon: '🟢' },
};

export const CATEGORY_CONFIG: Record<TaskCategory, { label: string; icon: string }> = {
  study:    { label: 'Study',    icon: '📚' },
  coding:   { label: 'Coding',   icon: '💻' },
  fitness:  { label: 'Fitness',  icon: '💪' },
  work:     { label: 'Work',     icon: '💼' },
  personal: { label: 'Personal', icon: '🌟' },
  custom:   { label: 'Custom',   icon: '⏱️' },
};

// ─── Query hooks ──────────────────────────────────────────────────────────────

export function useTasks(filters?: { completed?: boolean; category?: TaskCategory; priority?: TaskPriority }) {
  const params = new URLSearchParams();
  if (filters?.completed !== undefined) params.set('completed', String(filters.completed));
  if (filters?.category) params.set('category', filters.category);
  if (filters?.priority) params.set('priority', filters.priority);
  const query = params.toString() ? `?${params}` : '';

  return useQuery<Task[]>({
    queryKey: ['tasks', filters],
    queryFn: () => api.get(`/tasks${query}`),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      category: TaskCategory;
      priority: TaskPriority;
      dueDate?: string;
      notes?: string;
      subtasks?: Subtask[];
      customCategoryLabel?: string;
    }) => {
      try {
        return await api.post<Task>('/tasks', { ...data, subtasks: data.subtasks ?? [] });
      } catch (err: any) {
        if (err?.name === 'TypeError' || err?.message?.includes('Network')) {
          await enqueueWrite('POST', '/tasks', data);
          return null;
        }
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Task> & { id: string }) =>
      api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.patch<Task>(`/tasks/${id}`, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useToggleSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      subtasks,
    }: {
      taskId: string;
      subtasks: Subtask[];
    }) => api.patch<Task>(`/tasks/${taskId}`, { subtasks }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
