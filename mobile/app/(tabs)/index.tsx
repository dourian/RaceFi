import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { challenges } from '../lib/mock';
import { colors, spacing, typography, shadows } from '../theme';

export default function BrowseScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>Nearby Challenges</Text>
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/challenge/[id]', params: { id: item.id } }} asChild>
            <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }] }>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.meta}>{item.distanceKm} km • window: {item.windowDays} days</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.title, marginBottom: spacing.md },
  card: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    ...shadows.card,
  },
  cardTitle: { ...typography.h2 },
  meta: { ...typography.meta, marginTop: 4 },
});

