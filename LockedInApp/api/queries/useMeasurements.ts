import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { enqueueWrite } from "../offlineQueue";

export interface Measurement {
  _id: string;
  date: string;
  weightKg: number;
  bodyFatPercent: number;
  chest: number;
  waist: number;
  hips: number;
  arms: number;
  legs: number;
  notes: string;
}

export type MeasurementKey = keyof Omit<Measurement, "_id" | "date" | "notes">;

export const MEASUREMENT_META: Array<{
  key: MeasurementKey;
  label: string;
  unit: string;
  altUnit: string;
  factor: number;
  icon: string;
  color: string;
}> = [
  {
    key: "weightKg",
    label: "Body Weight",
    unit: "kg",
    altUnit: "lbs",
    factor: 2.205,
    icon: "⚖️",
    color: "#FF4D00",
  },
  {
    key: "bodyFatPercent",
    label: "Body Fat",
    unit: "%",
    altUnit: "%",
    factor: 1,
    icon: "📊",
    color: "#FFB800",
  },
  {
    key: "chest",
    label: "Chest",
    unit: "cm",
    altUnit: "in",
    factor: 0.394,
    icon: "📏",
    color: "#007AFF",
  },
  {
    key: "waist",
    label: "Waist",
    unit: "cm",
    altUnit: "in",
    factor: 0.394,
    icon: "🎯",
    color: "#00D084",
  },
  {
    key: "hips",
    label: "Hips",
    unit: "cm",
    altUnit: "in",
    factor: 0.394,
    icon: "🔵",
    color: "#AF52DE",
  },
  {
    key: "arms",
    label: "Arms",
    unit: "cm",
    altUnit: "in",
    factor: 0.394,
    icon: "💪",
    color: "#FF6B35",
  },
  {
    key: "legs",
    label: "Legs",
    unit: "cm",
    altUnit: "in",
    factor: 0.394,
    icon: "🦵",
    color: "#34C759",
  },
];

export function useMeasurements(from?: string) {
  const query = from ? `?from=${from}` : "";
  return useQuery<Measurement[]>({
    queryKey: ["measurements", from],
    queryFn: () => api.get(`/measurements${query}`),
    staleTime: 10 * 60 * 1000,
  });
}

export function useLogMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Measurement, "_id">) => {
      try {
        return await api.post<Measurement>("/measurements", data);
      } catch (err: any) {
        if (err?.name === "TypeError" || err?.message?.includes("Network")) {
          await enqueueWrite("POST", "/measurements", data);
          return null;
        }
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["measurements"] }),
  });
}
