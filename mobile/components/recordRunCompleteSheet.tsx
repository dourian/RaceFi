import { useEffect, useMemo, useRef } from 'react'
import { Animated, Dimensions, StyleSheet, Text, View, Pressable } from 'react-native'
import { colors, spacing, typography, shadows } from '../app/theme'
import { RunCalculationService } from '../src/services/runCalculationService'
import { ChallengeService } from '../src/services/challengeService'

interface RecordRunCompleteSheetProps {
  visible: boolean
  durationSeconds: number
  distanceMeters: number
  pace: string
  onSubmit: () => void
  onReset: () => void
  challengeId?: string
}

export default function RecordRunCompleteSheet({
  visible,
  durationSeconds,
  distanceMeters,
  pace,
  onSubmit,
  onReset,
  challengeId,
}: RecordRunCompleteSheetProps) {
  const windowHeight = Dimensions.get('window').height
  const sheetHeight = windowHeight * 0.5
  const translateY = useRef(new Animated.Value(sheetHeight)).current

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : sheetHeight,
      duration: 250,
      useNativeDriver: true,
    }).start()
  }, [visible, sheetHeight, translateY])

  const durationLabel = RunCalculationService.formatDuration(durationSeconds)
  const distanceLabel = RunCalculationService.formatDistance(distanceMeters)

  const comparison = useMemo(() => {
    if (!challengeId) return null;
    try {
      const mockWinner = ChallengeService.createMockRunData(challengeId, true);
      const winnerDuration = mockWinner.duration;
      const delta = durationSeconds - winnerDuration;
      const deltaLabel = RunCalculationService.formatDuration(Math.abs(delta));
      const isWinner = delta <= 0;
      return { isWinner, deltaSeconds: delta, deltaLabel };
    } catch {
      return null;
    }
  }, [challengeId, durationSeconds])

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: sheetHeight,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Text style={styles.title}>Run Complete</Text>
      <Text style={styles.subtitle}>Nice work! Review your stats below.</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{durationLabel}</Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{pace}</Text>
          <Text style={styles.statLabel}>Pace/km</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{distanceLabel}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
      </View>

      {comparison && (
        <View style={[
          styles.comparisonBox,
          comparison.isWinner ? styles.winnerBox : undefined,
        ]}>
          <Text style={[styles.comparisonText, comparison.isWinner ? styles.winnerText : undefined]}>
            {comparison.isWinner
              ? `🏆 You beat the current best by ${comparison.deltaLabel}`
              : `−${comparison.deltaLabel} behind current best`}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.submitButton]} onPress={onSubmit}>
          <Text style={styles.submitText}>Submit Run</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.resetButton]} onPress={onReset}>
          <Text style={styles.resetText}>Discard</Text>
        </Pressable>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    ...shadows.medium,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.lg,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.accentStrong,
  },
  statLabel: {
    ...typography.meta,
    marginTop: 6,
  },
  actions: {
    gap: spacing.md,
  },
  comparisonBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: spacing.xl,
  },
  comparisonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  winnerBox: {
    backgroundColor: 'rgba(255, 215, 0, 0.10)',
    borderWidth: 1,
    borderColor: '#DAA520',
  },
  winnerText: {
    color: '#B8860B',
  },
  button: {
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: colors.accentStrong,
  },
  resetButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  resetText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
})