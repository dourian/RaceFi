import { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, StyleSheet, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, shadows } from "./theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import RecordMap from "../components/recordMap";

interface RunData {
  coords: { latitude: number; longitude: number; timestamp: number }[];
  duration: number;
  distance: number;
  pace: string;
}

export default function RunComplete() {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Parse the run data directly using useMemo to avoid re-renders
  const runData = useMemo(() => {
    try {
      if (params.coords && params.duration && params.distance && params.pace) {
        const coords = JSON.parse(params.coords as string);
        return {
          coords,
          duration: parseInt(params.duration as string),
          distance: parseFloat(params.distance as string),
          pace: params.pace as string,
        };
      }
    } catch (error) {
      console.error("Error parsing run data:", error);
    }
    return null;
  }, [params.coords, params.duration, params.distance, params.pace]);

  const handleSubmit = () => {
    // TODO: Submit run to backend/storage
    console.log("Submitting run:", runData);

    // For now, just show an alert and navigate back
    alert("Run submitted successfully!");
    router.replace("/recordRun");
  };

  const handleReset = () => {
    // Navigate back to record screen
    router.replace("/recordRun");
  };

  if (!runData) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top", "left", "right", "bottom"]}
      >
        <Text style={styles.loadingText}>Loading run data...</Text>
      </SafeAreaView>
    );
  }

  // Format duration to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Text style={styles.title}>Run Complete!</Text>
      <Text style={styles.subtitle}>Great job on your run</Text>

      {/* Map Section - showing the completed route */}
      <View style={styles.mapContainer}>
        <RecordMap
          coords={runData.coords}
          watching={false}
          style={styles.map}
        />
      </View>

      {/* Run Summary Stats */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Run Summary</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatDuration(runData.duration)}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{runData.pace}</Text>
            <Text style={styles.statLabel}>Pace/km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatDistance(runData.distance)}
            </Text>
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
          onPress={handleSubmit}
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
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={24} color={colors.text} />
          <Text style={[styles.actionButtonText, styles.resetButtonText]}>
            Start New Run
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: "hidden",
    ...shadows.button,
    shadowOpacity: 0.1,
    elevation: 4,
    minHeight: 200,
  },
  map: {
    flex: 1,
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
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.accentStrong,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "600",
    color: "white",
  },
  resetButtonText: {
    color: colors.text,
  },
  loadingText: {
    ...typography.body,
    textAlign: "center",
    marginTop: "50%",
    color: colors.textMuted,
  },
});
