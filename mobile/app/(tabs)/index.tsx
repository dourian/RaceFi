import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  View,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { challenges } from "../../constants";
import { colors, spacing, typography, shadows } from "../theme";
import { useChallenge } from "../contexts/challengeContext";
import StaticRoutePreview from "../../components/StaticRoutePreview";
import { useAppTime, getCurrentAppTime } from "../../constants/timeManager";
import React, { useState, useMemo } from 'react';

type FilterType = 'nearby' | 'all';

export default function BrowseScreen() {
  const { getChallengeStatus } = useChallenge();
  const [filter, setFilter] = useState<FilterType>('nearby');
  const currentAppTime = useAppTime(); // Use centralized app time that updates when time changes

  // Filter challenges based on current filter
  const filteredChallenges = useMemo(() => {
    if (filter === 'nearby') {
      // Show only active challenges (not expired)
      return challenges.filter(challenge => challenge.endDate.getTime() > currentAppTime);
    }
    // Show all challenges including expired ones
    return challenges;
  }, [filter, currentAppTime]);

  // Check if a challenge is expired
  const isExpired = (challenge: any) => {
    return challenge.endDate.getTime() < currentAppTime;
  };

  // Get expiry status and text
  const getExpiryInfo = (challenge: any, challengeStatus: any) => {
    const now = currentAppTime;
    const endTime = challenge.endDate.getTime();
    const timeDiff = endTime - now;
    
    // If user has completed the challenge (won, completed, or cashed out), show completed status
    if (challengeStatus.status === 'winner') {
      return { text: "Challenge won!", color: "#DAA520", urgent: false };
    } else if (challengeStatus.status === 'cashOut') {
      return { text: "Winnings cashed out", color: "#22c55e", urgent: false };
    } else if (challengeStatus.status === 'completed') {
      return { text: "Challenge completed", color: "#22c55e", urgent: false };
    } else if (challengeStatus.status === 'in-progress') {
      return { text: "Currently running", color: "#f59e0b", urgent: false };
    }
    
    // For non-participated or joined challenges, show time-based info
    if (timeDiff < 0) {
      return { text: "Expired", color: "#6b7280", urgent: false };
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    // Running window is the last 7 days before deadline
    const isInRunningWindow = days <= 7;
    
    if (days > 7) {
      // Still in sign-up only period
      const runningStartDays = days - 7;
      return { 
        text: `Running starts in ${runningStartDays} days`, 
        color: "#6b7280", 
        urgent: false 
      };
    } else if (days > 1) {
      // In running window
      return { 
        text: `${days} days to run`, 
        color: "#22c55e", 
        urgent: false 
      };
    } else if (days === 1) {
      return { 
        text: `Final day to run`, 
        color: "#f59e0b", 
        urgent: true 
      };
    } else if (hours > 1) {
      return { 
        text: `${hours}h to run`, 
        color: "#ef4444", 
        urgent: true 
      };
    } else {
      return { 
        text: `${minutes}m to run`, 
        color: "#ef4444", 
        urgent: true 
      };
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      {/* Header with title and filter buttons */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {filter === 'nearby' ? 'Nearby Challenges' : 'All Challenges'}
        </Text>
        <View style={styles.filterButtons}>
          <Pressable
            style={[
              styles.filterButton,
              filter === 'nearby' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('nearby')}
          >
            <Ionicons 
              name="location" 
              size={16} 
              color={filter === 'nearby' ? 'white' : '#374151'} 
            />
            <Text style={[
              styles.filterButtonText,
              filter === 'nearby' && styles.filterButtonTextActive
            ]}>
              Nearby
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('all')}
          >
            <Ionicons 
              name="list" 
              size={16} 
              color={filter === 'all' ? 'white' : '#374151'} 
            />
            <Text style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive
            ]}>
              View All
            </Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={filteredChallenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        renderItem={({ item }) => {
          const challengeStatus = getChallengeStatus(item.id);

          // Get badge text and style based on status
          const getBadgeInfo = () => {
            // Check user's status first - this takes priority over expiry
            switch (challengeStatus.status) {
              case "winner":
                return {
                  text: "👑 Winner",
                  icon: "trophy",
                  backgroundColor: "rgba(255, 215, 0, 0.15)",
                  color: "#DAA520",
                };
              case "cashOut":
                return {
                  text: "💰 Cashed Out",
                  icon: "card",
                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                  color: "#22c55e",
                };
              case "completed":
                return {
                  text: "Completed",
                  icon: "checkmark-circle",
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  color: "#22c55e",
                };
              case "in-progress":
                return {
                  text: "Running",
                  icon: "play-circle",
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  color: "#f59e0b",
                };
              case "joined":
                // If joined but challenge is expired, show that it's too late
                if (isExpired(item)) {
                  return {
                    text: "Missed",
                    icon: "time-outline",
                    backgroundColor: "rgba(107, 114, 128, 0.1)",
                    color: "#6b7280",
                  };
                }
                return {
                  text: "Joined",
                  icon: "checkmark-circle",
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  color: "#22c55e",
                };
              default:
                // Only show "Expired" if user hasn't participated and it's expired
                if (isExpired(item)) {
                  return {
                    text: "Expired",
                    icon: "time-outline",
                    backgroundColor: "rgba(107, 114, 128, 0.1)",
                    color: "#6b7280",
                  };
                }
                return null;
            }
          };

          const badgeInfo = getBadgeInfo();

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
                    <StaticRoutePreview
                      challengeId={item.id}
                      polyline={item.polyline}
                      routeColor={item.routeColor}
                      width={280}
                      height={120}
                      style={styles.routePreview}
                    />
                  </View>

                  {/* Challenge Info */}
                  <View style={styles.challengeInfo}>
                    <View style={styles.headerRow}>
                      <View style={styles.titleContainer}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <View style={styles.locationRow}>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color={colors.textMuted}
                          />
                          <Text style={styles.location}>{item.location}</Text>
                        </View>
                        {/* Expiry Time */}
                        <View style={styles.expiryRow}>
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={getExpiryInfo(item, challengeStatus).color}
                          />
                          <Text style={[
                            styles.expiryText,
                            { color: getExpiryInfo(item, challengeStatus).color },
                            getExpiryInfo(item, challengeStatus).urgent && styles.expiryTextUrgent
                          ]}>
                            {getExpiryInfo(item, challengeStatus).text}
                          </Text>
                        </View>
                      </View>
                      {badgeInfo && (
                        <View
                          style={[
                            styles.joinedBadge,
                            { backgroundColor: badgeInfo.backgroundColor },
                          ]}
                        >
                          <Ionicons
                            name={badgeInfo.icon as any}
                            size={16}
                            color={badgeInfo.color}
                          />
                          <Text
                            style={[
                              styles.joinedText,
                              { color: badgeInfo.color },
                            ]}
                          >
                            {badgeInfo.text}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {item.distanceKm}km
                        </Text>
                        <Text style={styles.statLabel}>Distance</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.elevation}m</Text>
                        <Text style={styles.statLabel}>Elevation</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {item.participants}/{item.maxParticipants}
                        </Text>
                        <Text style={styles.statLabel}>Runners</Text>
                      </View>
                    </View>

                    {/* Prize Pool */}
                    <View style={styles.prizeRow}>
                      <View style={styles.prizeInfo}>
                        <Ionicons name="trophy" size={16} color="#f59e0b" />
                        <Text style={styles.prizeText}>
                          {item.prizePool} USDC Prize Pool
                        </Text>
                      </View>
                      <Text style={styles.stake}>
                        {item.stake} USDC to join
                      </Text>
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
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.md,
    fontSize: 24,
    fontWeight: "bold",
  },
  filterButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: '#f97316', // Orange color
    borderColor: '#f97316',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151', // Darker text for better readability
  },
  filterButtonTextActive: {
    color: 'white',
  },
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db", // Light gray border
    overflow: "hidden",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  routePreviewContainer: {
    width: "100%",
    height: 120,
  },
  routePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  challengeInfo: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h2,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    ...typography.meta,
    fontSize: 12,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: "500",
  },
  expiryTextUrgent: {
    fontWeight: "600",
  },
  joinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: 4,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#22c55e",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  prizeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prizeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  prizeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f59e0b",
  },
  stake: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
});
