import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { colors, spacing, typography, shadows } from './theme';
import { RunCalculationService } from './services/runCalculationService';

export default function CompletionPage() {
  const router = useRouter();
  const { 
    duration, 
    distance, 
    pace, 
    isChallenge 
  } = useLocalSearchParams<{
    duration?: string;
    distance?: string;
    pace?: string;
    isChallenge?: string;
  }>();

  const handleGoToHome = () => {
    // Navigate to home tabs - this will reset to the tab navigator
    router.push('/(tabs)');
  };

  const isChallengeBool = isChallenge === 'true';
  const durationNum = duration ? parseInt(duration) : 0;
  const distanceNum = distance ? parseFloat(distance) : 0;

  return (
    <>
      <Stack.Screen 
        options={{
          title: "Completion",
          headerBackVisible: false,
        }} 
      />
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Ionicons 
            name="checkmark-circle" 
            size={80} 
            color="#22c55e" 
          />
        </View>

        {/* Success Message */}
        <Text style={styles.title}>
          {isChallengeBool ? 'Challenge Complete!' : 'Run Complete!'}
        </Text>
        <Text style={styles.subtitle}>
          {isChallengeBool 
            ? 'Great job! Your challenge run has been submitted.' 
            : 'Excellent work on your run!'}
        </Text>

        {/* Run Stats */}
        {duration && distance && pace && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Run Summary</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {RunCalculationService.formatDuration(durationNum)}
                </Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {RunCalculationService.formatDistance(distanceNum)}
                </Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{pace}</Text>
                <Text style={styles.statLabel}>Pace/km</Text>
              </View>
            </View>
          </View>
        )}

        {/* Go to Home Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.homeButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
          ]}
          onPress={handleGoToHome}
        >
          <Ionicons name="home" size={20} color="white" />
          <Text style={styles.homeButtonText}>Go to Home</Text>
        </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    fontSize: 16,
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  statsContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  statsTitle: {
    ...typography.body,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accentStrong,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.meta,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  homeButton: {
    backgroundColor: colors.accentStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    gap: spacing.sm,
    ...shadows.button,
    shadowOpacity: 0.3,
    elevation: 4,
    minWidth: 160,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
