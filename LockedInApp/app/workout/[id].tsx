import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing } from '../../constants/theme';

// Phase 3 will implement the full active session UI
export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Active Workout</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.body}>
        <Text style={styles.emoji}>💪</Text>
        <Text style={styles.heading}>Session Ready</Text>
        <Text style={styles.sub}>Plan ID: {id}</Text>
        <Text style={styles.sub}>Full session UI coming in Phase 3</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing['2xl'], paddingVertical: spacing.lg,
  },
  title: { fontFamily: 'Outfit_700Bold', fontSize: fontSize.lg, color: colors.text },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emoji: { fontSize: 56 },
  heading: { fontFamily: 'Outfit_700Bold', fontSize: fontSize.xl, color: colors.text },
  sub: { fontFamily: 'Inter_400Regular', fontSize: fontSize.sm, color: colors.textMuted },
});
