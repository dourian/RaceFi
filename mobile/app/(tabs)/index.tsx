import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, StyleSheet, FlatList, Pressable, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { challenges } from "../lib/mock";
import { colors, spacing, typography, shadows } from "../theme";
import { useChallenge } from "../contexts/challengeContext";
import RoutePreview from "../../components/RoutePreview";

export default function BrowseScreen() {
  const { getChallengeStatus } = useChallenge();
  
  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <Text style={styles.title}>Nearby Challenges</Text>
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const challengeStatus = getChallengeStatus(item.id);
          const isJoined = challengeStatus.status !== 'not-joined';
          
          return (
            <Link
              href={{ pathname: "/challenge/[id]", params: { id: item.id } }}
              asChild
            >
              <Pressable
                style={({ pressed }) => [
                  styles.cardContainer,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <View style={styles.card}>
                  {/* Route Preview */}
                  <View style={styles.routePreviewContainer}>
                    <RoutePreview 
                      challengeId={item.id}
                      width={280}
                      height={100}
                      style={styles.routePreview}
                    />
                  </View>
                  
                  {/* Challenge Info */}
                  <View style={styles.challengeInfo}>
                    <View style={styles.headerRow}>
                      <View style={styles.titleContainer}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <View style={styles.locationRow}>
                          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                          <Text style={styles.location}>{item.location}</Text>
                        </View>
                      </View>
                      {isJoined && (
                        <View style={styles.joinedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                          <Text style={styles.joinedText}>Joined</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.distanceKm}km</Text>
                        <Text style={styles.statLabel}>Distance</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.elevation}m</Text>
                        <Text style={styles.statLabel}>Elevation</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.participants}/{item.maxParticipants}</Text>
                        <Text style={styles.statLabel}>Runners</Text>
                      </View>
                    </View>
                    
                    {/* Prize Pool */}
                    <View style={styles.prizeRow}>
                      <View style={styles.prizeInfo}>
                        <Ionicons name="trophy" size={16} color="#f59e0b" />
                        <Text style={styles.prizeText}>{item.prizePool} USDC Prize Pool</Text>
                      </View>
                      <Text style={styles.stake}>{item.stake} USDC to join</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { 
    ...typography.title, 
    marginBottom: spacing.lg,
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db', // Light gray border
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  routePreviewContainer: {
    width: '100%',
    height: 120,
  },
  routePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  challengeInfo: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: { 
    ...typography.h2,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    ...typography.meta,
    fontSize: 12,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: 4,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  stake: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  listContent: { 
    gap: spacing.xl, 
    paddingBottom: spacing.xl,
  },
});
