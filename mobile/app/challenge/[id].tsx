import { Link, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, Pressable, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { challenges } from '../lib/mock';
import { colors, spacing, typography, shadows } from '../theme';
import { Card, CardHeader, CardContent, Stat, Avatar } from '../../components/ui';

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
      <Image source={require('../../assets/running/athlete-in-motion.png')} style={styles.hero} resizeMode="cover" />

      <Card style={{ marginTop: spacing.md }}>
        <CardHeader title={challenge.name} icon={<Ionicons name="flash" size={18} color={colors.accentStrong} />} />
        <CardContent>
          <Text style={styles.meta}>{challenge.distanceKm} km • window: {challenge.windowDays} days</Text>
          <View style={styles.statsGrid}>
            <Stat label="Stake" value={`${challenge.stake} USDC`} />
            <Stat label="Difficulty" value="Moderate" />
            <Stat label="Elevation" value="~120m" />
            <Stat label="Participants" value="23/50" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm }}>
            <Avatar source={require('../../assets/running/runner-profile.png')} size={28} />
            <Text style={styles.body}>Creator: Sarah • 22:45</Text>
          </View>
          <Link href={{ pathname: '/record', params: { id: challenge.id } }} asChild>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}>
              <Ionicons name="walk" size={18} color={colors.accentStrong} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Join and Record</Text>
            </Pressable>
          </Link>
        </CardContent>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <CardHeader title="Participants" icon={<Ionicons name="people-outline" size={18} color={colors.text} />} />
        <CardContent>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Avatar source={require('../../assets/running/athlete-2.png')} />
            <Avatar source={require('../../assets/running/diverse-group-athletes.png')} />
          </View>
        </CardContent>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  hero: { width: '100%', height: 160, borderRadius: 12 },
  title: { ...typography.title },
  meta: { ...typography.meta },
  body: { ...typography.body },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.md },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accentStrong,
    ...shadows.button,
  },
  primaryButtonText: { color: colors.accentStrong, fontWeight: '800', letterSpacing: 0.3 },
});

