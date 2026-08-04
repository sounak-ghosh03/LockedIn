import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../api/client';
import { colors, fontSize, spacing, radius } from '../../constants/theme';

// Minimal exercise library — Phase 3 will expand to 100+ with FlashList
const SAMPLE_EXERCISES = [
  { id: 'bench', name: 'Bench Press', muscle: 'Chest' },
  { id: 'squat', name: 'Squat', muscle: 'Legs' },
  { id: 'deadlift', name: 'Deadlift', muscle: 'Back' },
  { id: 'ohp', name: 'Overhead Press', muscle: 'Shoulders' },
  { id: 'row', name: 'Barbell Row', muscle: 'Back' },
  { id: 'pullup', name: 'Pull-Up', muscle: 'Back' },
  { id: 'incline', name: 'Incline Press', muscle: 'Chest' },
  { id: 'curl', name: 'Bicep Curl', muscle: 'Arms' },
];

export default function NewWorkoutPlanScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState('Custom');
  const [selectedExercises, setSelectedExercises] = useState<typeof SAMPLE_EXERCISES>([]);

  const createPlan = useMutation({
    mutationFn: () =>
      api.post('/workout-plans', {
        name: planName,
        type: planType,
        exercises: selectedExercises.map((ex) => ({
          exerciseId: ex.id,
          name: ex.name,
          targetSets: 3,
          targetReps: 10,
          targetWeight: 0,
          restSeconds: 90,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workoutPlans'] });
      router.back();
    },
  });

  const toggleExercise = (ex: (typeof SAMPLE_EXERCISES)[number]) => {
    setSelectedExercises((prev) =>
      prev.find((e) => e.id === ex.id) ? prev.filter((e) => e.id !== ex.id) : [...prev, ex]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>New Plan</Text>
        <Button
          label="Save"
          size="sm"
          disabled={!planName.trim() || selectedExercises.length === 0}
          loading={createPlan.isPending}
          onPress={() => createPlan.mutate()}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan name */}
        <Card>
          <Text style={styles.label}>Plan Name</Text>
          <TextInput
            style={styles.input}
            value={planName}
            onChangeText={setPlanName}
            placeholder="e.g. Push Day A"
            placeholderTextColor={colors.textFaint}
          />
        </Card>

        {/* Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type</Text>
          <View style={styles.typeRow}>
            {['PPL', 'Upper/Lower', 'Full Body', 'Custom'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, planType === t && styles.typeBtnActive]}
                onPress={() => setPlanType(t)}
              >
                <Text style={[styles.typeBtnText, planType === t && styles.typeBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exercise picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Exercises ({selectedExercises.length} selected)
          </Text>
          {SAMPLE_EXERCISES.map((ex) => {
            const selected = !!selectedExercises.find((e) => e.id === ex.id);
            return (
              <TouchableOpacity key={ex.id} onPress={() => toggleExercise(ex)}>
                <Card style={[styles.exCard, selected && styles.exCardSelected]}>
                  <View style={styles.exRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exName}>{ex.name}</Text>
                      <Badge label={ex.muscle} variant="muted" />
                    </View>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing['2xl'], paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontFamily: 'Outfit_700Bold', fontSize: fontSize.lg, color: colors.text },
  content: { padding: spacing['2xl'], gap: spacing.xl, paddingBottom: spacing['5xl'] },
  label: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, color: colors.text, fontFamily: 'Inter_400Regular',
    fontSize: fontSize.base, padding: spacing.md,
  },
  section: { gap: spacing.md },
  sectionTitle: { fontFamily: 'Outfit_700Bold', fontSize: fontSize.lg, color: colors.text },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  typeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  typeBtnText: { fontFamily: 'Inter_500Medium', fontSize: fontSize.sm, color: colors.textMuted },
  typeBtnTextActive: { color: colors.accent },
  exCard: {},
  exCardSelected: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  exName: { fontFamily: 'Inter_600SemiBold', fontSize: fontSize.base, color: colors.text, marginBottom: 4 },
});
