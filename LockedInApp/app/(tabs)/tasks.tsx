import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { api } from "../../api/client";
import { useTaskStore } from "../../store/taskStore";
import { useTimerStore } from "../../store/timerStore";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

type TaskCategory = "study" | "coding" | "custom";

interface Task {
  _id: string;
  title: string;
  category: TaskCategory;
  customCategoryLabel: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

interface TaskSession {
  _id: string;
  category: TaskCategory;
  customCategoryLabel: string;
  durationMinutes: number;
  date: string;
}

const CATEGORY_COLORS: Record<TaskCategory, "accent" | "success" | "warning"> =
  {
    study: "warning",
    coding: "accent",
    custom: "success",
  };

const CATEGORY_ICONS: Record<TaskCategory, string> = {
  study: "📚",
  coding: "💻",
  custom: "⏱️",
};

export default function TasksScreen() {
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<TaskCategory>("custom");
  const [showAddForm, setShowAddForm] = useState(false);
  const [view, setView] = useState<"tasks" | "sessions">("tasks");

  const { activeSession, startSession, stopSession, getElapsedMinutes } =
    useTaskStore();
  const { startStopwatch, stop: stopTimer } = useTimerStore();
  const qc = useQueryClient();

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks"),
  });

  const { data: taskSessions = [] } = useQuery<TaskSession[]>({
    queryKey: ["taskSessions"],
    queryFn: () => api.get("/task-sessions"),
  });

  // ─── Derived lists ──────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const pendingToday = tasks.filter(
    (t) => !t.completed && (!t.dueDate || t.dueDate.slice(0, 10) <= today),
  );
  const upcoming = tasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate.slice(0, 10) > today,
  );
  const completed = tasks.filter((t) => t.completed);

  // Focus time today by category
  const focusToday = taskSessions
    .filter((s) => s.date.slice(0, 10) === today)
    .reduce<Record<string, number>>((acc, s) => {
      acc[s.category] = (acc[s.category] ?? 0) + s.durationMinutes;
      return acc;
    }, {});

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const addTask = useMutation({
    mutationFn: (data: { title: string; category: TaskCategory }) =>
      api.post("/tasks", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setNewTitle("");
      setShowAddForm(false);
    },
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.patch(`/tasks/${id}`, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const logSession = useMutation({
    mutationFn: (data: {
      category: TaskCategory;
      durationMinutes: number;
      customCategoryLabel?: string;
    }) =>
      api.post("/task-sessions", { ...data, date: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taskSessions"] });
      qc.invalidateQueries({ queryKey: ["heatmap"] });
    },
  });

  // ─── Session actions ─────────────────────────────────────────────────────────
  const handleStartSession = useCallback(
    (category: TaskCategory) => {
      if (activeSession) {
        Alert.alert(
          "Session Active",
          `You have an active ${activeSession.category} session. Stop it first?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Stop & Switch",
              onPress: () => {
                const duration = Math.max(1, getElapsedMinutes());
                logSession.mutate({
                  category: activeSession.category,
                  durationMinutes: duration,
                });
                stopSession();
                stopTimer();
                startSession(category);
                startStopwatch(category);
              },
            },
          ],
        );
        return;
      }
      startSession(category);
      startStopwatch(category);
    },
    [
      activeSession,
      startSession,
      startStopwatch,
      stopSession,
      stopTimer,
      getElapsedMinutes,
      logSession,
    ],
  );

  const handleStopSession = useCallback(() => {
    if (!activeSession) return;
    const duration = Math.max(1, getElapsedMinutes());
    logSession.mutate({
      category: activeSession.category,
      durationMinutes: duration,
    });
    stopSession();
    stopTimer();
  }, [activeSession, getElapsedMinutes, logSession, stopSession, stopTimer]);

  // ─── Render helpers ──────────────────────────────────────────────────────────
  const renderTask = (task: Task) => (
    <TouchableOpacity
      key={task._id}
      onPress={() =>
        toggleTask.mutate({ id: task._id, completed: !task.completed })
      }
      onLongPress={() => {
        Alert.alert("Delete Task", `Delete "${task.title}"?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteTask.mutate(task._id),
          },
        ]);
      }}
    >
      <Card style={styles.taskCard}>
        <View style={styles.taskRow}>
          <View
            style={[
              styles.checkCircle,
              task.completed && styles.checkCircleDone,
            ]}
          >
            {task.completed && (
              <Ionicons name="checkmark" size={12} color={colors.success} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.taskTitle, task.completed && styles.taskDone]}>
              {task.title}
            </Text>
            <Badge
              label={`${CATEGORY_ICONS[task.category]} ${task.category}`}
              variant={CATEGORY_COLORS[task.category]}
            />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Tasks</Text>

        {/* Active session banner */}
        {activeSession && (
          <Card accent glow>
            <View style={styles.sessionBanner}>
              <View>
                <Text style={styles.sessionLabel}>
                  {CATEGORY_ICONS[activeSession.category]}{" "}
                  {activeSession.category} session
                </Text>
                <Text style={styles.sessionTime}>
                  {getElapsedMinutes()}m elapsed
                </Text>
              </View>
              <Button
                label="Stop"
                variant="danger"
                size="sm"
                onPress={handleStopSession}
              />
            </View>
          </Card>
        )}

        {/* Focus time today */}
        <View style={styles.focusRow}>
          {(["study", "coding", "custom"] as TaskCategory[]).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.focusCard,
                activeSession?.category === cat && styles.focusCardActive,
              ]}
              onPress={() => handleStartSession(cat)}
            >
              <Text style={styles.focusIcon}>{CATEGORY_ICONS[cat]}</Text>
              <Text style={styles.focusTime}>
                {focusToday[cat] ? `${focusToday[cat]}m` : "—"}
              </Text>
              <Text style={styles.focusLabel}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* View toggle */}
        <View style={styles.toggle}>
          {(["tasks", "sessions"] as const).map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.toggleBtn, view === v && styles.toggleBtnActive]}
              onPress={() => setView(v)}
            >
              <Text
                style={[
                  styles.toggleText,
                  view === v && styles.toggleTextActive,
                ]}
              >
                {v === "tasks" ? "Tasks" : "Sessions"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {view === "tasks" ? (
          <>
            {/* Add task */}
            {!showAddForm ? (
              <Button
                label="+ New Task"
                variant="secondary"
                onPress={() => setShowAddForm(true)}
                fullWidth
              />
            ) : (
              <Card>
                <TextInput
                  style={styles.input}
                  placeholder="Task title…"
                  placeholderTextColor={colors.textFaint}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <View style={styles.catRow}>
                  {(["study", "coding", "custom"] as TaskCategory[]).map(
                    (cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catBtn,
                          newCategory === cat && styles.catBtnActive,
                        ]}
                        onPress={() => setNewCategory(cat)}
                      >
                        <Text style={styles.catBtnText}>
                          {CATEGORY_ICONS[cat]} {cat}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
                <View style={styles.formActions}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    size="sm"
                    onPress={() => setShowAddForm(false)}
                  />
                  <Button
                    label="Add"
                    size="sm"
                    loading={addTask.isPending}
                    onPress={() => {
                      if (!newTitle.trim()) return;
                      addTask.mutate({
                        title: newTitle.trim(),
                        category: newCategory,
                      });
                    }}
                  />
                </View>
              </Card>
            )}

            {/* Today */}
            {pendingToday.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today</Text>
                {pendingToday.map(renderTask)}
              </View>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                {upcoming.map(renderTask)}
              </View>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completed ✓</Text>
                {completed.slice(0, 5).map(renderTask)}
              </View>
            )}

            {tasks.length === 0 && (
              <Card>
                <Text style={styles.muted}>
                  No tasks yet. Add your first task above!
                </Text>
              </Card>
            )}
          </>
        ) : (
          // Sessions list
          <View style={styles.section}>
            {taskSessions.length === 0 ? (
              <Card>
                <Text style={styles.muted}>
                  No sessions logged yet. Start a Study or Coding session!
                </Text>
              </Card>
            ) : (
              taskSessions.slice(0, 20).map((s) => (
                <Card key={s._id} style={styles.sessionCard}>
                  <View style={styles.sessionRow}>
                    <Text style={styles.sessionIcon}>
                      {CATEGORY_ICONS[s.category]}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionCat}>{s.category}</Text>
                      <Text style={styles.sessionDate}>
                        {new Date(s.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.sessionDur}>{s.durationMinutes}m</Text>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing["2xl"],
    gap: spacing.xl,
    paddingBottom: spacing["5xl"],
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
  },

  // Session banner
  sessionBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  sessionTime: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Focus row
  focusRow: { flexDirection: "row", gap: spacing.sm },
  focusCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  focusCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  focusIcon: { fontSize: 20 },
  focusTime: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.md,
    color: colors.text,
  },
  focusLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Toggle
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: colors.surface },
  toggleText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  toggleTextActive: { color: colors.text },

  // Add form
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  catRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  catBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  catBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  catBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.xs,
    color: colors.text,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },

  // Task
  section: { gap: spacing.sm },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  taskCard: {},
  taskRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkCircleDone: {
    borderColor: colors.success,
    backgroundColor: colors.successDim,
  },
  taskTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.base,
    color: colors.text,
    marginBottom: 4,
  },
  taskDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  muted: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Sessions
  sessionCard: {},
  sessionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  sessionIcon: { fontSize: 24 },
  sessionCat: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
    textTransform: "capitalize",
  },
  sessionDate: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  sessionDur: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.accent,
  },
});
