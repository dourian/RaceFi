import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, Button, View } from 'react-native';

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
      <Text>Permission: {permission}</Text>
      <Text>Time: {elapsedSec}s</Text>
      <Text>Points: {coords.length}</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <Button title="Start" onPress={start} disabled={watching || permission !== 'granted'} />
        <Button title="Stop" onPress={stop} disabled={!watching} />
      </View>
      <Text style={{ marginTop: 12, color: '#555' }}>GPS points are collected every ~5m/1s and stored in memory.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
});

