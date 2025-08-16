import { Link, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, Button } from 'react-native';
import { challenges } from '../lib/mock';

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = challenges.find((c) => c.id === id);

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <Text>Challenge not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>{challenge.name}</Text>
      <Text style={styles.meta}>{challenge.distanceKm} km • window: {challenge.windowDays} days</Text>
      <Text style={styles.body}>Stake required: {challenge.stake} USDC (placeholder onramp)</Text>
      <Link href={{ pathname: '/record', params: { id: challenge.id } }} asChild>
        <Button title="Join and Record" onPress={() => {}} />
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  meta: { fontSize: 12, color: '#555' },
  body: { fontSize: 14 },
});

