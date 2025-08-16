import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { challenges } from '../lib/mock';

export default function BrowseScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>Nearby Challenges</Text>
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Link href={{ pathname: '/challenge/[id]', params: { id: item.id } }} style={styles.cardTitle}>
              {item.name}
            </Link>
            <Text style={styles.meta}>{item.distanceKm} km • window: {item.windowDays} days</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  card: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#1e90ff' },
  meta: { fontSize: 12, color: '#555', marginTop: 4 },
});

