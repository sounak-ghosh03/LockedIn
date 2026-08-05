import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useWorkoutPlans, useDeleteWorkoutPlan } from '../../api/queries/useWorkoutPlans';
import { useWorkoutStore } from '../../store/workoutStore';
import { colors, fontSize, spacing, radius } from '../../constants/theme';

const PLAN_TYPE_ICONS: Record<string, string> = {
  'PPL':          '🔄',
  'Upper/Lower':  '⬆️',
  'Full Body':    '🔥',
  'Custom':       '✏️',
};

export default function WorkoutScreen() {
  const router = useRouter();
  const { data: plans = [], isLoading } = useWorkoutPlans();
  const deletePlan = useDeleteWorkoutPlan();
  const activeSession = useWorkoutStore((s) => s.activeSession);

  const handleDeletePlan = (id: string, name: string) => {
    Alert.alert(`Delete "${name}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePlan.mutate(id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ─── Header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Workout</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/workout/new')}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ─── Active session resume banner ────────────────────── */}
        {activeSession && (
          <Card accent glow>
            <View style={styles.resumeRow}>
              <View>
                <Text style={styles.resumeTitle}>⚡ Session In Progress</Text>
                <Text style={styles.resumeSub}>{activeSession.planName}</Text>
              </View>
              <Button
                label="Resume"
                size="sm"
                onPress={() =>
                  router.push(`/workout/${activeSession.planId ?? 'active'}`)
                }
              />
            </View>
          </Card>
        )}

        {/* ─── Your Plans ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Plans</Text>

          {isLoading && (
            <Text style={styles.muted}>Loading plans…</Text>
          )}

          {!isLoading && plans.length === 0 && (
            <Card>
              <View style={styles.emptyPlan}>
                <Text style={styles.emptyIcon}>🏋️</Text>
                <Text style={styles.emptyTitle}>No plans yet</Text>
                <Text style={styles.emptyText}>
                  Create your first workout plan to get started
                </Text>
                <Button
                  label="Create Plan"
                  onPress={() => router.push('/workout/new')}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            </Card>
          )}

          {plans.map((plan) => (
            <Card key={plan._id} style={styles.planCard}>
              <View style={styles.planRow}>
                {/* Icon */}
                <View style={styles.planIconWrap}>
                  <Text style={styles.planIcon}>
                    {PLAN_TYPE_ICONS[plan.type] ?? '🏋️'}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.planMeta}>
                    <Badge label={plan.type} variant="muted" />
                    <Text style={styles.planExCount}>
                      {plan.exercises.length} exercise{plan.exercises.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.planActions}>
                  <Button
                    label="Start"
                    size="sm"
                    onPress={() => router.push(`/workout/${plan._id}`)}
                  />
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeletePlan(plan._id, plan.name)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Exercise preview */}
              <View style={styles.exercisePreview}>
                {plan.exercises.slice(0, 4).map((ex, i) => (
                  <View key={i} style={styles.exPreviewChip}>
                    <Text style={styles.exPreviewText}>{ex.name}</Text>
                  </View>
                ))}
                {plan.exercises.length > 4 && (
                  <View style={styles.exPreviewChip}>
                    <Text style={styles.exPreviewText}>+{plan.exercises.length - 4} more</Text>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>

        {/* ─── Templates ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Templates</Text>
          <View style={styles.templatesGrid}>
            {TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.name}
                style={styles.templateCard}
                onPress={() => router.push('/workout/new')}
              >
                <Text style={styles.templateIcon}>{t.icon}</Text>
                <Text style={styles.templateName}>{t.name}</Text>
                <Badge label={t.tag} variant="muted" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const TEMPLATES = [
  { icon: '💪', name: 'Push / Pull / Legs', tag: '6-day' },
  { icon: '⬆️', name: 'Upper / Lower', tag: '4-day' },
  { icon: '🔥', name: 'Full Body', tag: '3-day' },
  { icon: '✏️', name: 'Custom', tag: 'flexible' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing['2xl'], gap: spacing.xl, paddingBottom: spacing['5xl'] },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Outfit_700Bold', fontSize: fontSize['2xl'], color: colors.text },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Active session
  resumeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resumeTitle: { fontFamily: 'Outfit_700Bold', fontSize: fontSize.base, color: colors.text },
  resumeSub: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

  // Plans
  section: { gap: spacing.md },
  sectionTitle: { fontFamily: 'Outfit_700Bold', fontSize: fontSize.lg, color: colors.text },
  muted: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, color: colors.textMuted },

  emptyPlan: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontFamily: 'Outfit_700Bold', fontSize: fontSize.lg, color: colors.text },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },

  planCard: { gap: spacing.md },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  planIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  planIcon: { fontSize: 20 },
  planInfo: { flex: 1, gap: 4 },
  planName: { fontFamily: 'Outfit_600SemiBold', fontSize: fontSize.base, color: colors.text },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planExCount: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, color: colors.textMuted },
  planActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  exercisePreview: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  exPreviewChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exPreviewText: { fontFamily: 'Inter_400Regular', fontSize: fontSize.xs, color: colors.textMuted },

  // Templates
  templatesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  templateCard: {
    width: '47%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  templateIcon: { fontSize: 28 },
  templateName: { fontFamily: 'Inter_600SemiBold', fontSize: fontSize.sm, color: colors.text },
});
