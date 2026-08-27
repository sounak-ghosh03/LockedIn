import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTask,
  useToggleSubtask,
  PRIORITY_CONFIG,
  CATEGORY_CONFIG,
  type Task,
  type TaskPriority,
  type TaskCategory,
  type Subtask,
} from "../../api/queries/useTasks";
import { useTaskStore } from "../../store/taskStore";
import { colors, fontSize, spacing, radius } from "../../constants/theme";

// ─── Add/Edit Task Modal ──────────────────────────────────────────────────────

interface TaskModalProps {
  visible: boolean;
  editing?: Task | null;
  onClose: () => void;
}

function TaskModal({ visible, editing, onClose }: TaskModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState<TaskCategory>(
    editing?.category ?? "study",
  );
  const [priority, setPriority] = useState<TaskPriority>(
    editing?.priority ?? "medium",
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [dueDate, setDueDate] = useState(editing?.dueDate?.slice(0, 10) ?? "");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>(editing?.subtasks ?? []);

  // Reset when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setTitle(editing?.title ?? "");
      setCategory(editing?.category ?? "study");
      setPriority(editing?.priority ?? "medium");
      setNotes(editing?.notes ?? "");
      setDueDate(editing?.dueDate?.slice(0, 10) ?? "");
      setSubtasks(editing?.subtasks ?? []);
    }
  }, [visible, editing]);

  const addSubtask = useCallback(() => {
    if (!subtaskInput.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      { title: subtaskInput.trim(), completed: false },
    ]);
    setSubtaskInput("");
  }, [subtaskInput]);

  const removeSubtask = useCallback((i: number) => {
    setSubtasks((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      Alert.alert("Title required");
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      priority,
      notes: notes.trim() || undefined,
      dueDate: dueDate
        ? new Date(dueDate + "T23:59:59").toISOString()
        : undefined,
      subtasks,
    };

    if (editing) {
      updateTask.mutate(
        { id: editing._id, ...payload },
        { onSuccess: onClose },
      );
    } else {
      createTask.mutate(payload, { onSuccess: onClose });
    }
  }, [
    title,
    category,
    priority,
    notes,
    dueDate,
    subtasks,
    editing,
    createTask,
    updateTask,
    onClose,
  ]);

  const isLoading = createTask.isPending || updateTask.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={mStyles.container} edges={["top", "bottom"]}>
        <View style={mStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={mStyles.title}>
            {editing ? "Edit Task" : "New Task"}
          </Text>
          <Button
            label="Save"
            size="sm"
            loading={isLoading}
            onPress={handleSave}
          />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={mStyles.content}>
            {/* Title */}
            <View style={mStyles.field}>
              <Text style={mStyles.label}>Task Title *</Text>
              <TextInput
                style={mStyles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="What needs to be done?"
                placeholderTextColor={colors.textFaint}
                returnKeyType="next"
                autoFocus
              />
            </View>

            {/* Category */}
            <View style={mStyles.field}>
              <Text style={mStyles.label}>Category</Text>
              <View style={mStyles.chipGrid}>
                {(
                  Object.entries(CATEGORY_CONFIG) as [
                    TaskCategory,
                    (typeof CATEGORY_CONFIG)[TaskCategory],
                  ][]
                ).map(([key, conf]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      mStyles.chip,
                      category === key && mStyles.chipActive,
                    ]}
                    onPress={() => setCategory(key)}
                  >
                    <Text style={mStyles.chipIcon}>{conf.icon}</Text>
                    <Text
                      style={[
                        mStyles.chipText,
                        category === key && mStyles.chipTextActive,
                      ]}
                    >
                      {conf.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority */}
            <View style={mStyles.field}>
              <Text style={mStyles.label}>Priority</Text>
              <View style={mStyles.priorityRow}>
                {(
                  Object.entries(PRIORITY_CONFIG) as [
                    TaskPriority,
                    (typeof PRIORITY_CONFIG)[TaskPriority],
                  ][]
                ).map(([key, conf]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      mStyles.priorityBtn,
                      priority === key && {
                        borderColor: conf.color,
                        backgroundColor: conf.color + "15",
                      },
                    ]}
                    onPress={() => setPriority(key)}
                  >
                    <Text style={mStyles.priorityIcon}>{conf.icon}</Text>
                    <Text
                      style={[
                        mStyles.priorityText,
                        priority === key && { color: conf.color },
                      ]}
                    >
                      {conf.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Due date */}
            <View style={mStyles.field}>
              <Text style={mStyles.label}>Due Date (optional)</Text>
              <TextInput
                style={mStyles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textFaint}
                keyboardType={
                  Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
                }
              />
              {/* Quick date shortcuts */}
              <View style={mStyles.dateShortcuts}>
                {[
                  { label: "Today", days: 0 },
                  { label: "Tomorrow", days: 1 },
                  { label: "In 3d", days: 3 },
                  { label: "In 7d", days: 7 },
                ].map(({ label, days }) => {
                  const d = new Date();
                  d.setDate(d.getDate() + days);
                  const iso = d.toISOString().slice(0, 10);
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        mStyles.shortcut,
                        dueDate === iso && mStyles.shortcutActive,
                      ]}
                      onPress={() => setDueDate(iso)}
                    >
                      <Text
                        style={[
                          mStyles.shortcutText,
                          dueDate === iso && mStyles.shortcutTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Subtasks */}
            <View style={mStyles.field}>
              <Text style={mStyles.label}>Subtasks ({subtasks.length})</Text>
              {subtasks.map((st, i) => (
                <View key={i} style={mStyles.subtaskRow}>
                  <Text style={mStyles.subtaskBullet}>·</Text>
                  <Text style={mStyles.subtaskTitle}>{st.title}</Text>
                  <TouchableOpacity onPress={() => removeSubtask(i)}>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={mStyles.subtaskInputRow}>
                <TextInput
                  style={mStyles.subtaskInput}
                  value={subtaskInput}
                  onChangeText={setSubtaskInput}
                  placeholder="Add a subtask…"
                  placeholderTextColor={colors.textFaint}
                  returnKeyType="done"
                  onSubmitEditing={addSubtask}
                />
                <TouchableOpacity
                  style={mStyles.addSubtaskBtn}
                  onPress={addSubtask}
                >
                  <Ionicons name="add" size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notes */}
            <View style={mStyles.field}>
              <Text style={mStyles.label}>Notes (optional)</Text>
              <TextInput
                style={[mStyles.input, { minHeight: 80 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional details…"
                placeholderTextColor={colors.textFaint}
                multiline
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing["5xl"],
  },
  field: { gap: spacing.sm },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    padding: spacing.md,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  chipIcon: { fontSize: 14 },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipTextActive: { color: colors.accent },
  priorityRow: { flexDirection: "row", gap: spacing.sm },
  priorityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priorityIcon: { fontSize: 14 },
  priorityText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  dateShortcuts: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  shortcut: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shortcutActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  shortcutText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  shortcutTextActive: { color: colors.accent },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  subtaskBullet: { color: colors.textMuted, fontSize: fontSize.base },
  subtaskTitle: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: colors.text,
  },
  subtaskInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
  },
  subtaskInput: {
    flex: 1,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    paddingVertical: spacing.sm,
  },
  addSubtaskBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
  },
});

// ─── Task card ────────────────────────────────────────────────────────────────

const TaskCard = React.memo(function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const toggleSubtask = useToggleSubtask();
  const pri = PRIORITY_CONFIG[task.priority];
  const cat = CATEGORY_CONFIG[task.category];

  const today = new Date().toISOString().slice(0, 10);
  const dueStr = task.dueDate?.slice(0, 10);
  const isOverdue = dueStr && dueStr < today && !task.completed;
  const isDueToday = dueStr === today;

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

  const handleSubtaskToggle = useCallback(
    (i: number) => {
      const updated = task.subtasks.map((st, idx) =>
        idx === i ? { ...st, completed: !st.completed } : st,
      );
      toggleSubtask.mutate({ taskId: task._id, subtasks: updated });
    },
    [task, toggleSubtask],
  );

  return (
    <Card style={[styles.taskCard, task.completed && styles.taskCardDone]}>
      <View style={styles.taskRow}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[styles.checkbox, task.completed && styles.checkboxDone]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onToggle(task._id, !task.completed);
          }}
        >
          {task.completed && (
            <Ionicons name="checkmark" size={16} color={colors.success} />
          )}
        </TouchableOpacity>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.taskTitle, task.completed && styles.taskTitleDone]}
          >
            {task.title}
          </Text>

          {/* Metadata */}
          <View style={styles.taskMeta}>
            <Badge label={`${cat.icon} ${cat.label}`} variant="muted" />
            <View
              style={[styles.priBadge, { backgroundColor: pri.color + "20" }]}
            >
              <Text style={[styles.priText, { color: pri.color }]}>
                {pri.icon} {pri.label}
              </Text>
            </View>
            {dueStr && (
              <Text
                style={[
                  styles.dueText,
                  isOverdue && styles.duOverdue,
                  isDueToday && styles.dueToday,
                ]}
              >
                {isOverdue
                  ? `⚠️ Overdue`
                  : isDueToday
                    ? "📅 Today"
                    : `📅 ${dueStr}`}
              </Text>
            )}
          </View>

          {/* Subtask progress */}
          {task.subtasks.length > 0 && (
            <View style={styles.subtaskSection}>
              <View style={styles.subtaskProgressBar}>
                <View
                  style={[
                    styles.subtaskProgressFill,
                    {
                      width:
                        `${(completedSubtasks / task.subtasks.length) * 100}%` as any,
                    },
                  ]}
                />
              </View>
              <Text style={styles.subtaskCount}>
                {completedSubtasks}/{task.subtasks.length} subtasks
              </Text>
              {/* Subtask list */}
              {task.subtasks.map((st, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.subtaskItem}
                  onPress={() => handleSubtaskToggle(i)}
                >
                  <View
                    style={[
                      styles.subtaskCheck,
                      st.completed && styles.subtaskCheckDone,
                    ]}
                  >
                    {st.completed && (
                      <Ionicons
                        name="checkmark"
                        size={10}
                        color={colors.success}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.subtaskText,
                      st.completed && styles.subtaskTextDone,
                    ]}
                  >
                    {st.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.taskActions}>
          <TouchableOpacity
            onPress={() => onEdit(task)}
            style={styles.actionBtn}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(task._id)}
            style={styles.actionBtn}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
});

// ─── Main Tasks Screen ────────────────────────────────────────────────────────

type Filter = "all" | "today" | "overdue" | "done";
type SortBy = "priority" | "dueDate" | "created";

export default function TasksScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("priority");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: allTasks = [] } = useTasks();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();

  // Active focus session from store
  const activeSession = useTaskStore((s) => s.activeSession);

  const today = new Date().toISOString().slice(0, 10);

  const filteredAndSorted = useMemo(() => {
    let tasks = allTasks;

    // Filter
    switch (filter) {
      case "today":
        tasks = tasks.filter(
          (t) => !t.completed && t.dueDate?.startsWith(today),
        );
        break;
      case "overdue":
        tasks = tasks.filter(
          (t) => !t.completed && t.dueDate && t.dueDate.slice(0, 10) < today,
        );
        break;
      case "done":
        tasks = tasks.filter((t) => t.completed);
        break;
      default:
        tasks = tasks.filter((t) => (showCompleted ? true : !t.completed));
        break;
    }

    // Sort
    const priorityOrder: Record<TaskPriority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    switch (sortBy) {
      case "priority":
        tasks = [...tasks].sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
        );
        break;
      case "dueDate":
        tasks = [...tasks].sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        });
        break;
      case "created":
        tasks = [...tasks].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        );
        break;
    }

    return tasks;
  }, [allTasks, filter, sortBy, showCompleted, today]);

  // Stats
  const stats = useMemo(
    () => ({
      total: allTasks.length,
      done: allTasks.filter((t) => t.completed).length,
      today: allTasks.filter(
        (t) => !t.completed && t.dueDate?.startsWith(today),
      ).length,
      overdue: allTasks.filter(
        (t) => !t.completed && t.dueDate && t.dueDate.slice(0, 10) < today,
      ).length,
    }),
    [allTasks, today],
  );

  const handleToggle = useCallback(
    (id: string, done: boolean) => {
      toggleTask.mutate({ id, completed: done });
    },
    [toggleTask],
  );

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("Delete Task?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTask.mutate(id),
        },
      ]);
    },
    [deleteTask],
  );

  const handleAdd = useCallback(() => {
    setEditingTask(null);
    setShowModal(true);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TaskModal
        visible={showModal}
        editing={editingTask}
        onClose={() => {
          setShowModal(false);
          setEditingTask(null);
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tasks</Text>
          <TouchableOpacity
            style={styles.calBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/calendar");
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Active focus session */}
        {activeSession && (
          <Card accent glow>
            <View style={styles.sessionBanner}>
              <View>
                <Text style={styles.sessionLabel}>⚡ Active Session</Text>
                <Text style={styles.sessionName}>{activeSession.customLabel || activeSession.category}</Text>
              </View>
              <Button
                label="Open Timer"
                size="sm"
                onPress={() => router.push("/timer")}
              />
            </View>
          </Card>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            {
              filter: "all" as Filter,
              label: "All",
              value: stats.total,
              icon: "📋",
            },
            {
              filter: "today" as Filter,
              label: "Today",
              value: stats.today,
              icon: "📅",
            },
            {
              filter: "overdue" as Filter,
              label: "Overdue",
              value: stats.overdue,
              icon: "⚠️",
            },
            {
              filter: "done" as Filter,
              label: "Done",
              value: stats.done,
              icon: "✅",
            },
          ].map((s) => (
            <TouchableOpacity
              key={s.filter}
              style={[
                styles.statChip,
                filter === s.filter && styles.statChipActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(s.filter);
              }}
            >
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text
                style={[
                  styles.statValue,
                  s.value > 0 &&
                    s.filter === "overdue" && { color: colors.error },
                ]}
              >
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sort */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {(["priority", "dueDate", "created"] as SortBy[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
              onPress={() => setSortBy(s)}
            >
              <Text
                style={[
                  styles.sortBtnText,
                  sortBy === s && styles.sortBtnTextActive,
                ]}
              >
                {s === "dueDate"
                  ? "Due Date"
                  : s === "created"
                    ? "Newest"
                    : "Priority"}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.sortSpacer} />
          {filter === "all" && (
            <View style={styles.showDoneRow}>
              <Text style={styles.sortLabel}>Done</Text>
              <Switch
                value={showCompleted}
                onValueChange={setShowCompleted}
                trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
                thumbColor={colors.text}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          )}
        </View>

        {/* Task list */}
        {filteredAndSorted.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>
                {filter === "done"
                  ? "No completed tasks"
                  : filter === "today"
                    ? "Nothing due today!"
                    : filter === "overdue"
                      ? "No overdue tasks 🎉"
                      : "No tasks yet"}
              </Text>
              {filter === "all" && (
                <Button
                  label="Create Task"
                  size="sm"
                  onPress={handleAdd}
                  style={{ marginTop: spacing.sm }}
                />
              )}
            </View>
          </Card>
        ) : (
          filteredAndSorted.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      {/* Floating action button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          handleAdd();
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.text} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing["2xl"],
    gap: spacing.lg,
    paddingBottom: spacing["5xl"],
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize["2xl"],
    color: colors.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  calBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: spacing["2xl"],
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },

  // Session banner
  sessionBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sessionName: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
    marginTop: 2,
  },

  // Stats row
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  statChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  statIcon: { fontSize: 14 },
  statValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Sort
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  sortLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sortBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  sortBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sortBtnTextActive: { color: colors.accent },
  sortSpacer: { flex: 1 },
  showDoneRow: { flexDirection: "row", alignItems: "center", gap: 4 },

  // Task card
  taskCard: { gap: spacing.sm },
  taskCardDone: { opacity: 0.65 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxDone: {
    borderColor: colors.success,
    backgroundColor: colors.successDim,
  },
  taskTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: colors.text,
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 4,
  },
  priBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  priText: { fontFamily: "Inter_600SemiBold", fontSize: fontSize.xs },
  dueText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  duOverdue: { color: colors.error },
  dueToday: { color: colors.warning },
  taskActions: { flexDirection: "row", gap: spacing.xs },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  // Subtasks
  subtaskSection: { gap: spacing.xs, marginTop: spacing.xs },
  subtaskProgressBar: {
    height: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 2,
    overflow: "hidden",
  },
  subtaskProgressFill: {
    height: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  subtaskCount: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  subtaskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 2,
  },
  subtaskCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  subtaskCheckDone: {
    borderColor: colors.success,
    backgroundColor: colors.successDim,
  },
  subtaskText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: colors.text,
  },
  subtaskTextDone: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.lg,
    color: colors.text,
  },
});
