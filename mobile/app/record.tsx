import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, StyleSheet, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, shadows } from "./theme";
import { useLocation } from "./contexts/locationContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useChallenge } from "./contexts/challengeContext";
import { RunCalculationService } from "./services/runCalculationService";
import { ChallengeService } from "./services/challengeService";
import { NavigationService } from "./services/navigationService";
import RecordMap from "../components/recordMap";
import React from "react";

export default function RecordRun() {
  const router = useRouter();
  const { id: challengeId } = useLocalSearchParams<{ id?: string }>();
  const { completeChallengeRun } = useChallenge();
  const {
    location,
    locationPermission,
    isLocationEnabled,
    isLoading,
    error,
    requestLocationPermission,
    startLocationUpdates,
    stopLocationUpdates,
    checkLocationServices,
    resetLocation,
  } = useLocation();
  
  const isChallenge = !!challengeId;
  
  const [coords, setCoords] = useState<
    { latitude: number; longitude: number; timestamp: number }[]
  >([]);
  const [watching, setWatching] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [runCompleted, setRunCompleted] = useState(false);
  const [completedRunData, setCompletedRunData] = useState<{
    coords: { latitude: number; longitude: number; timestamp: number }[];
    duration: number;
    distance: number;
    pace: string;
  } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Store location updates in coords when location changes
  useEffect(() => {
    if (location && watching) {
      console.log('New location received:', location);
      setCoords((prev) => {
        // Avoid duplicate entries by checking if the new location is significantly different
        const lastCoord = prev[prev.length - 1];
        if (!lastCoord || 
            Math.abs(lastCoord.latitude - location.latitude) > 0.00005 ||
            Math.abs(lastCoord.longitude - location.longitude) > 0.00005 ||
            location.timestamp - lastCoord.timestamp > 2000) {
          console.log('Adding new coordinate:', {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: location.timestamp
          });
          return [...prev, {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: location.timestamp
          }];
        }
        console.log('Skipping duplicate/similar coordinate');
        return prev;
      });
    }
  }, [location, watching]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current as any);
        timerRef.current = null;
      }
    };
  }, []);

  const start = async () => {
    console.log('Start button pressed');
    // Request permission if not granted
    if (locationPermission !== "granted") {
      console.log('Requesting location permission');
      const granted = await requestLocationPermission();
      if (!granted) {
        console.log('Permission denied');
        return;
      }
    }
    
    // Check location services
    console.log('Checking location services');
    const servicesEnabled = await checkLocationServices();
    if (!servicesEnabled) {
      console.log('Location services not enabled');
      return;
    }
    
    console.log('Starting recording...');
    
    // Reset location context to get fresh starting point
    resetLocation();
    
    setCoords([]);
    const startedAt = Date.now();
    console.log('Start time set to:', startedAt);
    setStartTime(startedAt);
    setNow(startedAt);
    setWatching(true);

    // Start ticking timer for live elapsed seconds
    if (timerRef.current) {
      console.log('Clearing existing timer');
      clearInterval(timerRef.current as any);
    }
    console.log('Starting new timer');
    timerRef.current = setInterval(() => {
      const currentTime = Date.now();
      console.log('Timer tick - current time:', currentTime, 'elapsed:', Math.floor((currentTime - startedAt) / 1000));
      setNow(currentTime);
    }, 1000) as any;

    // Start location updates using the context
    console.log('Calling startLocationUpdates...');
    await startLocationUpdates();
    console.log('startLocationUpdates completed');
  };

  const stop = () => {
    stopLocationUpdates();
    if (timerRef.current) {
      clearInterval(timerRef.current as any);
      timerRef.current = null;
    }
    setWatching(false);
    
    // Prepare run completion data using service
    const runMetrics = RunCalculationService.calculateRunMetrics(coords, elapsedSec);
    
    setCompletedRunData({
      coords,
      duration: runMetrics.duration,
      distance: runMetrics.distance,
      pace: runMetrics.pace,
    });
    setRunCompleted(true);
  };

  const elapsedSec = startTime ? Math.floor((now - startTime) / 1000) : 0;
  
  // Get permission status as string for display
  const permissionStatus = locationPermission || "undetermined";
  const currentCoord = coords.length > 0 ? coords[coords.length - 1] : null;

  const handleSubmitRun = () => {
    if (!completedRunData) return;
    
    console.log('Submitting run:', completedRunData);
    
    // If this is a challenge run, update the challenge status
    if (isChallenge && challengeId) {
      const challengeRunData = ChallengeService.createRunData(coords, elapsedSec);
      completeChallengeRun(challengeId, {
        ...challengeRunData,
        completedAt: new Date(),
      });
      
      // Use navigation service
      NavigationService.handleChallengeCompletion(router, challengeId);
    } else {
      // Use navigation service for regular runs
      NavigationService.handleRegularRunCompletion(router);
      handleResetRun();
    }
  };

  const handleResetRun = () => {
    setRunCompleted(false);
    setCompletedRunData(null);
    setCoords([]);
    setStartTime(null);
    setNow(Date.now());
  };

  if (runCompleted && completedRunData) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
        <Text style={styles.completionTitle}>Run Complete!</Text>
        <Text style={styles.completionSubtitle}>Great job on your run</Text>

        {/* Map Section - showing the completed route */}
        <View style={styles.mapContainer}>
          <RecordMap 
            coords={completedRunData.coords} 
            watching={false} 
            style={styles.map}
          />
        </View>

        {/* Run Summary Stats */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Run Summary</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{RunCalculationService.formatDuration(completedRunData.duration)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedRunData.pace}</Text>
              <Text style={styles.statLabel}>Pace/km</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{RunCalculationService.formatDistance(completedRunData.distance)}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.submitButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSubmitRun}
          >
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.actionButtonText}>Submit Run</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.resetButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleResetRun}
          >
            <Ionicons name="refresh" size={24} color={colors.text} />
            <Text style={[styles.actionButtonText, styles.resetButtonText]}>Start New Run</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Text style={styles.title}>Record Run</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Map Section - takes up most of the screen */}
      <View style={styles.mapContainer}>
        <RecordMap 
          coords={coords} 
          watching={watching} 
          style={styles.map}
        />
      </View>

      {/* Control Section */}
      <View style={styles.bottomAction}>
        <Pressable
          style={({ pressed }) => [
            styles.circleButton,
            watching ? styles.circleButtonStop : styles.circleButtonStart,
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
          onPress={watching ? stop : start}
          disabled={locationPermission !== "granted" || isLoading}
        >
          <Ionicons
            name={watching ? "stop" : "play"}
            size={40}
            color="#ffffff"
          />
        </Pressable>
        <Text style={styles.buttonLabel}>
          {watching
            ? "Stop Recording"
            : locationPermission !== "granted"
              ? "Location Required"
              : isLoading
                ? "Loading..."
                : "Start Recording"}
        </Text>
        
        {/* Stats Section - below the button */}
        <View style={styles.primaryStats}>
          <View style={styles.primaryStatItem}>
            <Text style={styles.primaryStatValue}>{elapsedSec}s</Text>
            <Text style={styles.primaryStatLabel}>Time</Text>
          </View>
          <View style={styles.primaryStatItem}>
            <Text style={styles.primaryStatValue}>
              {coords.length > 1 ? RunCalculationService.calculatePace(coords) : "--:--"}
            </Text>
            <Text style={styles.primaryStatLabel}>Pace/km</Text>
          </View>
          <View style={styles.primaryStatItem}>
            <Text style={styles.primaryStatValue}>
              {coords.length > 1 ? `${RunCalculationService.calculateDistance(coords).toFixed(0)}m` : "0m"}
            </Text>
            <Text style={styles.primaryStatLabel}>Distance</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: { 
    ...typography.title, 
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  scrollContainer: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.button,
    shadowOpacity: 0.1,
    elevation: 4,
  },
  map: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  primaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 0,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginHorizontal: -spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e6e6ea",
    minHeight: 80,
  },
  primaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  primaryStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accentStrong,
  },
  primaryStatLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryStats: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e6e6ea",
  },
  statLabel: { 
    ...typography.meta,
    color: colors.textMuted,
  },
  statValue: { 
    ...typography.body,
    fontWeight: '500',
  },
  mono: { fontFamily: "Menlo", fontSize: 11 },
  coordsList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  coordsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  coordItem: {
    paddingVertical: 2,
    color: colors.textMuted,
    fontSize: 11,
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 14,
    fontWeight: "500",
  },
  bottomAction: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e6e6ea",
    flexDirection: 'column',
  },
  circleButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.button,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  circleButtonStart: {
    backgroundColor: colors.accentStrong,
    borderWidth: 0,
  },
  circleButtonStop: {
    backgroundColor: "#FF4444",
    borderWidth: 0,
  },
  buttonLabel: {
    marginTop: spacing.sm,
    ...typography.body,
    fontWeight: "600" as const,
    color: colors.text,
  },
  // Completion screen styles
  completionTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  completionSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  summaryContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.button,
    shadowOpacity: 0.05,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accentStrong,
    marginBottom: spacing.xs,
  },
  actionContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    ...shadows.button,
    shadowOpacity: 0.2,
    elevation: 4,
    gap: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.accentStrong,
  },
  resetButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  resetButtonText: {
    color: colors.text,
  },
});
