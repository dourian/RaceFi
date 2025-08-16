import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from './theme';

export default function RecordRun() {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [watching, setWatching] = useState(false);
  const watchSub = useRef<Location.LocationSubscription | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status as any);
    })();
    return () => {
      watchSub.current?.remove();
    };
  }, []);

  const start = async () => {
    if (permission !== 'granted') return;
    setCoords([]);
    setStartTime(Date.now());
    setWatching(true);
    watchSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 5, timeInterval: 1000 },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        setCoords((prev) => [...prev, { latitude, longitude }]);
      }
    );
  };

  const stop = () => {
    watchSub.current?.remove();
    watchSub.current = null;
    setWatching(false);
  };

  const elapsedSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

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
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]} onPress={start} disabled={watching || permission !== 'granted'}>
          <Ionicons name="play" size={18} color={colors.accentStrong} style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>Start</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.9 }]} onPress={stop} disabled={!watching}>
          <Ionicons name="stop" size={18} color={colors.accent} style={{ marginRight: 8 }} />
          <Text style={styles.secondaryButtonText}>Stop</Text>
        </Pressable>
      </View>
      <Text style={styles.helpText}>GPS points are collected every ~5m/1s and stored in memory.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.title, marginBottom: spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e6e6ea' },
  statLabel: { ...typography.meta },
  statValue: { ...typography.body },
  primaryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 2, borderColor: colors.accentStrong, ...shadows.button },
  primaryButtonText: { color: colors.accentStrong, fontWeight: '700' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e6e6ea' },
  secondaryButtonText: { color: colors.accent, fontWeight: '700' },
  helpText: { marginTop: spacing.md, color: colors.textMuted },
});

