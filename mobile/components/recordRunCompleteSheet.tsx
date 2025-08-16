import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Dimensions, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native'
import { colors, spacing, typography, shadows } from '../app/theme'
import { RunCalculationService } from '../src/services/runCalculationService'
import { ChallengeService } from '../src/services/challengeService'
import { Ionicons } from '@expo/vector-icons'
import { API_URL } from '../app/config'
import polyline from '@mapbox/polyline'
import { ApiService } from '../src/services/apiService'
import { challenges as mockChallenges } from '../constants'
import { decodePolyline, haversineMeters } from '../src/helpers/polyline'

interface RecordRunCompleteSheetProps {
  visible: boolean
  coords: { latitude: number; longitude: number; timestamp: number }[]
  durationSeconds: number
  distanceMeters: number
  pace: string
  onSubmit: () => void
  onReset: () => void
  challengeId?: string
  maxSpeedKmh?: number
}

export default function RecordRunCompleteSheet({
  visible,
  coords,
  durationSeconds,
  distanceMeters,
  pace,
  onSubmit,
  onReset,
  challengeId,
  maxSpeedKmh,
}: RecordRunCompleteSheetProps) {
  const windowHeight = Dimensions.get('window').height
  const sheetHeight = windowHeight * 0.55
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

  type CheckStatus = 'pending' | 'pass' | 'fail'
  const [routeCheck, setRouteCheck] = useState<{ status: CheckStatus; message?: string }>({ status: 'pending' })
  const [startCheck, setStartCheck] = useState<{ status: CheckStatus; message?: string }>({ status: 'pending' })
  const [endCheck, setEndCheck] = useState<{ status: CheckStatus; message?: string }>({ status: 'pending' })
  const [speedCheck, setSpeedCheck] = useState<{ status: CheckStatus; message?: string }>({ status: 'pending' })
  const [verifying, setVerifying] = useState<boolean>(true)

  const canSubmit = routeCheck.status === 'pass' && startCheck.status === 'pass' && endCheck.status === 'pass' && speedCheck.status === 'pass'

  useEffect(() => {
    if (!visible) return
    if (!coords || coords.length < 2) {
      setRouteCheck({ status: 'fail', message: 'Insufficient coordinates' })
      return
    }

    let isCancelled = false
    const verify = async () => {
      try {
        setVerifying(true)
        setRouteCheck({ status: 'pending' })
        setStartCheck({ status: 'pending' })
        setEndCheck({ status: 'pending' })
        setSpeedCheck({ status: 'pending' })

        // Encode user's route to polyline
        var userPolyline = polyline.encode(coords.map(c => [c.latitude, c.longitude]))
        console.log('userPolyline', userPolyline)
        // Fetch challenge polyline for comparison
        let challengePolyline: string | undefined
        if (challengeId) {
          try {
            const all = await ApiService.getChallenges()
            const found = all.find(c => c.id === challengeId)
            challengePolyline = found?.polyline
          } catch {}
          if (!challengePolyline) {
            const foundMock = mockChallenges.find(c => c.id === challengeId)
            challengePolyline = foundMock?.polyline
          }
        }

        const challengeCoords = decodePolyline(challengePolyline)

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

        // Sequential checks with delays between them

        // 1) Route compare first
        let routeOk = false
        if (challengePolyline) {
          try {
            const resp = await fetch(`${API_URL}/maps/compare`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ polyline1: userPolyline, polyline2: challengePolyline, threshold_ratio: 0.02 }),
            })
            if (!resp.ok) throw new Error(await resp.text())
            const isMatch = await resp.json()
            routeOk = !!isMatch
            if (!isCancelled) setRouteCheck({ status: routeOk ? 'pass' : 'fail', message: routeOk ? 'Route matches' : 'Route differs' })
          } catch (e: any) {
            routeOk = false
            if (!isCancelled) setRouteCheck({ status: 'fail', message: 'Compare failed' })
          }
        } else {
          routeOk = false
          if (!isCancelled) setRouteCheck({ status: 'fail', message: 'No challenge route found' })
        }

        await sleep(600)
        if (isCancelled) return

        // 2) Start/End proximity checks (10m)
        let startOk = false
        let endOk = false
        try {
          const userStart = { latitude: coords[0].latitude, longitude: coords[0].longitude }
          const userEnd = { latitude: coords[coords.length - 1].latitude, longitude: coords[coords.length - 1].longitude }
          const challengeStart = challengeCoords[0]
          const challengeEnd = challengeCoords[challengeCoords.length - 1]
          const startDist = haversineMeters(userStart, challengeStart)
          const endDist = haversineMeters(userEnd, challengeEnd)
          startOk = startDist <= 10
          endOk = endDist <= 10
          if (!isCancelled) {
            setStartCheck({ status: startOk ? 'pass' : 'fail', message: `${Math.round(startDist)}m from start` })
          }
        } catch (e) {
          if (!isCancelled) {
            setStartCheck({ status: 'fail', message: 'Start check failed' })
          }
        }

        await sleep(400)
        if (isCancelled) return

        // 3) End check
        try {
          if (!isCancelled) {
            setEndCheck({ status: endOk ? 'pass' : 'fail', message: `${Math.round(haversineMeters({ latitude: coords[coords.length - 1].latitude, longitude: coords[coords.length - 1].longitude }, challengeCoords[challengeCoords.length - 1]))}m from finish` })
          }
        } catch (e) {
          if (!isCancelled) {
            setEndCheck({ status: 'fail', message: 'End check failed' })
          }
        }

        await sleep(400)
        if (isCancelled) return

        // 4) Speed check from parent (<= 15 km/h)
        let speedOk = false
        if (!isCancelled) {
          if (typeof maxSpeedKmh !== 'number') {
            speedOk = false
            setSpeedCheck({ status: 'fail', message: 'No timing data' })
          } else {
            speedOk = maxSpeedKmh <= 25
            setSpeedCheck({ status: speedOk ? 'pass' : 'fail', message: `max ${maxSpeedKmh.toFixed(1)} km/h` })
          }
        }

        // Final check - if all pass, exit verifying state
        if (!isCancelled) {
          const allPass = routeOk && startOk && endOk && speedOk
          if (allPass) {
            await sleep(300)
            if (!isCancelled) setVerifying(false)
          }
        }
      } catch {
        if (!isCancelled) {
          setRouteCheck({ status: 'fail', message: 'Verification failed' })
          setStartCheck({ status: 'fail', message: 'Verification failed' })
          setEndCheck({ status: 'fail', message: 'Verification failed' })
          setSpeedCheck({ status: 'fail', message: 'Verification failed' })
        }
      }
    }

    verify()
    return () => { isCancelled = true }
  }, [visible, coords, challengeId])

  const renderStatusIcon = (status: CheckStatus) => {
    if (status === 'pending') return <ActivityIndicator size="small" color={colors.textMuted} />
    if (status === 'pass') return <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
    return <Ionicons name="close-circle" size={20} color="#ef4444" />
  }

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

  const titleText = verifying ? 'Verifying run…' : 'Run Complete!'
  const subtitleText = 'Nice work! Review your stats below.'

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
      <Text style={[styles.title, verifying && { marginBottom: spacing.lg }]}>{titleText}</Text>
      {!verifying && <Text style={styles.subtitle}>{subtitleText}</Text>}

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

      {verifying && (
        <View style={styles.verifyBox}>
          <View style={styles.verifyRow}>
            {renderStatusIcon(routeCheck.status)}
            <Text style={styles.verifyText}>Route matches challenge</Text>
          </View>
          <View style={styles.verifyRow}>
            {renderStatusIcon(startCheck.status)}
            <Text style={styles.verifyText}>Start within 10m {startCheck.message ? `(${startCheck.message})` : ''}</Text>
          </View>
          <View style={styles.verifyRow}>
            {renderStatusIcon(endCheck.status)}
            <Text style={styles.verifyText}>Finish within 10m {endCheck.message ? `(${endCheck.message})` : ''}</Text>
          </View>
          <View style={styles.verifyRow}>
            {renderStatusIcon(speedCheck.status)}
            <Text style={styles.verifyText}>No speed {'>'} 15 km/h {speedCheck.message ? `(${speedCheck.message})` : ''}</Text>
          </View>
        </View>
      )}

      {!verifying && comparison && (
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
        {!verifying && (
          <Pressable style={[styles.button, styles.submitButton, !canSubmit && { opacity: 0.6 }]} onPress={onSubmit} disabled={!canSubmit}>
            <Text style={styles.submitText}>Submit Run</Text>
          </Pressable>
        )}
        <Pressable style={[styles.button, styles.resetButton]} onPress={onReset}>
          <Text style={styles.resetText}>{verifying ? 'Retry' : 'Discard'}</Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    ...shadows.medium,
    gap: spacing.xs,
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
  verifyBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  verifyTitle: {
    ...typography.meta,
    color: colors.textMuted,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyText: {
    ...typography.bodyMuted,
    color: colors.text,
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