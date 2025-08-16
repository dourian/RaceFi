import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, StyleSheet, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, shadows } from "./theme";

export default function RecordRun() {
  const [permission, setPermission] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");
  const [coords, setCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [watching, setWatching] = useState(false);
  const watchSub = useRef<Location.LocationSubscription | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status as any);
    })();
    return () => {
      // Cleanup on unmount
      watchSub.current?.remove();
      if (timerRef.current) {
        clearInterval(timerRef.current as any);
        timerRef.current = null;
      }
    };
  }, []);

  const start = async () => {
    if (permission !== "granted") return;
    setCoords([]);
    const startedAt = Date.now();
    setStartTime(startedAt);
    setNow(startedAt);
    setWatching(true);

    // Start ticking timer for live elapsed seconds
    if (timerRef.current) {
      clearInterval(timerRef.current as any);
    }
    timerRef.current = setInterval(() => setNow(Date.now()), 1000) as any;

    // Start watching position with a time-based interval to ensure regular updates
    watchSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 0,
        timeInterval: 1000,
      },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        setCoords((prev) => [...prev, { latitude, longitude }]);
      },
    );
  };

  const stop = () => {
    watchSub.current?.remove();
    watchSub.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current as any);
      timerRef.current = null;
    }
    setWatching(false);
  };

  const elapsedSec = startTime ? Math.floor((now - startTime) / 1000) : 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>Record Run</Text>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Permission</Text>
        <Text style={styles.statValue}>{permission}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Time</Text>
        <Text style={styles.statValue}>{elapsedSec}s</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Points</Text>
        <Text style={styles.statValue}>{coords.length}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Current</Text>
        <Text style={[styles.statValue, styles.mono]}>
          {coords.length > 0
            ? `${coords[coords.length - 1].latitude.toFixed(5)}, ${coords[coords.length - 1].longitude.toFixed(5)}`
            : watching
              ? "Waiting..."
              : "-"}
        </Text>
      </View>

      {coords.length > 0 && (
        <View style={styles.coordsList}>
          {coords
            .slice(-5)
            .reverse()
            .map((c, i) => (
              <Text key={`pt-${i}`} style={[styles.coordItem, styles.mono]}>
                {`${(coords.length - i).toString().padStart(3, "0")}: ${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`}
              </Text>
            ))}
        </View>
      )}

      <Text style={styles.helpText}>
        GPS points are collected every ~5m/1s and stored in memory.
      </Text>

      <View style={styles.bottomAction}>
        <Pressable
          style={({ pressed }) => [
            styles.circleButton,
            watching ? styles.circleButtonStop : styles.circleButtonStart,
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
          onPress={watching ? stop : start}
          disabled={permission !== "granted"}
        >
          <Ionicons
            name={watching ? "stop" : "play"}
            size={40}
            color="#ffffff" // Always white icon for better contrast
          />
        </Pressable>
        <Text style={styles.buttonLabel}>
          {watching
            ? "Stop Recording"
            : permission !== "granted"
              ? "Location Required"
              : "Start Recording"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { ...typography.title, marginBottom: spacing.lg },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e6e6ea",
  },
  statLabel: { ...typography.meta },
  statValue: { ...typography.body },
  helpText: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    textAlign: "center",
  },
  mono: { fontFamily: "Menlo" },
  coordsList: {
    marginTop: spacing.sm,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e6e6ea",
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  coordItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    color: colors.text,
  },
  bottomAction: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  circleButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.button,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  circleButtonStart: {
    backgroundColor: colors.accentStrong, // Orange background
    borderWidth: 0, // Remove border since background is now orange
  },
  circleButtonStop: {
    backgroundColor: "#FF4444",
    borderWidth: 0,
  },
  buttonLabel: {
    marginTop: spacing.md,
    ...typography.body,
    fontWeight: "600" as const,
    color: colors.text,
  },
});
