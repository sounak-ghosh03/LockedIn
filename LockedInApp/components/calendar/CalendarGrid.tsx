import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  /** Map of ISO date string (YYYY-MM-DD) → { workouts: number; tasks: number; hasFocus: boolean } */
  dayData: Record<
    string,
    { workouts?: number; tasks?: number; hasFocus?: boolean }
  >;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Fully custom month grid calendar — no external dependencies.
 * Shows colored dots for workout sessions, task due dates, and focus sessions.
 */
export const CalendarGrid = React.memo(function CalendarGrid({
  year,
  month,
  dayData,
  selectedDate,
  onSelectDate,
}: CalendarGridProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: Array<{ date: string; day: number } | null> = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) result.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      result.push({ date: `${year}-${mm}-${dd}`, day: d });
    }

    // Pad to complete last row
    while (result.length % 7 !== 0) result.push(null);

    return result;
  }, [year, month]);

  const rows = useMemo(() => {
    const r: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) r.push(cells.slice(i, i + 7));
    return r;
  }, [cells]);

  const getDateString = useCallback(
    (year: number, month: number, day: number) => {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    },
    [],
  );

  return (
    <View style={styles.container}>
      {/* Day-of-week headers */}
      <View style={styles.weekRow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((cell, ci) => {
            if (!cell) return <View key={ci} style={styles.cell} />;
            const data = dayData[cell.date];
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedDate;
            const isPast = cell.date < today;

            return (
              <TouchableOpacity
                key={ci}
                style={[
                  styles.cell,
                  isToday && styles.todayCell,
                  isSelected && styles.selectedCell,
                ]}
                onPress={() => onSelectDate(cell.date)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    styles.dayNum,
                    isToday && styles.todayNum,
                    isSelected && styles.selectedNum,
                    isPast && !data && styles.pastNum,
                  ]}
                >
                  {cell.day}
                </Text>

                {/* Activity dots */}
                <View style={styles.dots}>
                  {data?.workouts && data.workouts > 0 ? (
                    <View
                      style={[styles.dot, { backgroundColor: colors.accent }]}
                    />
                  ) : null}
                  {data?.tasks && data.tasks > 0 ? (
                    <View
                      style={[styles.dot, { backgroundColor: "#007AFF" }]}
                    />
                  ) : null}
                  {data?.hasFocus ? (
                    <View
                      style={[styles.dot, { backgroundColor: "#00D084" }]}
                    />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.accent }]}
          />
          <Text style={styles.legendText}>Workout</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#007AFF" }]} />
          <Text style={styles.legendText}>Tasks due</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#00D084" }]} />
          <Text style={styles.legendText}>Focus</Text>
        </View>
      </View>
    </View>
  );
});

const CELL_SIZE = 42;

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  weekRow: { flexDirection: "row" },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: colors.textFaint,
    paddingBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row" },
  cell: {
    flex: 1,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    gap: 2,
  },
  todayCell: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  selectedCell: {
    backgroundColor: colors.accent,
  },
  dayNum: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.text,
  },
  todayNum: { color: colors.accent, fontFamily: "Outfit_700Bold" },
  selectedNum: { color: colors.text },
  pastNum: { color: colors.textFaint },
  dots: { flexDirection: "row", gap: 2, height: 5, alignItems: "center" },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});

export { MONTH_NAMES, DAYS_OF_WEEK };
