import { Link, router, useFocusEffect } from "expo-router";
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
import { colors, spacing, typography, shadows } from "../theme";
import { useChallenge } from "../contexts/challengeContext";
import StaticRoutePreview from "../../components/StaticRoutePreview";
import { useAppTime, getCurrentAppTime } from "../../constants/timeManager";
import { ApiService } from "../../src/services/apiService";
import { Challenge } from "../../constants/types";
import React, { useState, useMemo, useEffect, useCallback } from 'react';

type FilterType = 'upcoming' | 'passed';

export default function BrowseScreen() {
  const { getChallengeStatus } = useChallenge();
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentAppTime = useAppTime(); // Use centralized app time that updates when time changes

  // Load challenges function
  const loadChallenges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const challengesData = await ApiService.getChallenges();
      setChallenges(challengesData);
    } catch (err) {
      console.error('Error loading challenges:', err);
      setError('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load challenges when screen comes into focus (including initial mount)
  useFocusEffect(
    useCallback(() => {
      loadChallenges();
    }, [loadChallenges])
  );

  // Filter challenges based on current filter
  const filteredChallenges = useMemo(() => {
    if (filter === 'upcoming') {
      // Show only upcoming challenges (not expired)
      return challenges.filter(challenge => {
        try {
          return challenge.endDate && challenge.endDate.getTime && challenge.endDate.getTime() > currentAppTime;
        } catch (error) {
          console.warn('Invalid challenge endDate:', challenge.endDate);
          return false;
        }
      });
    }
    // Show only passed challenges (expired)
    return challenges.filter(challenge => {
      try {
        return challenge.endDate && challenge.endDate.getTime && challenge.endDate.getTime() <= currentAppTime;
      } catch (error) {
        console.warn('Invalid challenge endDate:', challenge.endDate);
        return false;
      }
    });
  }, [filter, currentAppTime, challenges]);

  // Check if a challenge is expired
  const isExpired = (challenge: any) => {
    try {
      return challenge.endDate && challenge.endDate.getTime && challenge.endDate.getTime() < currentAppTime;
    } catch (error) {
      console.warn('Invalid challenge endDate in isExpired:', challenge.endDate);
      return false;
    }
  };

  // Get expiry status and text
  const getExpiryInfo = (challenge: any, challengeStatus: any) => {
    const now = currentAppTime;
    
    // Safety check for invalid dates
    if (!challenge.endDate || !challenge.endDate.getTime) {
      return { text: "Invalid date", color: "#6b7280", urgent: false };
    }
    
    const endTime = challenge.endDate.getTime();
    const timeDiff = endTime - now;
    
    // If user has completed the challenge (won, completed, or cashed out), show completed status
    if (challengeStatus.status === 'winner') {
      return { text: "Challenge won!", color: "#DAA520", urgent: false };
    } else if (challengeStatus.status === 'cashOut') {
      return { text: "Winnings added to balance", color: "#22c55e", urgent: false };
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
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {filter === 'upcoming' ? 'Upcoming Challenges' : 'Passed Challenges'}
          </Text>
          <Pressable style={styles.createButton} onPress={() => {
            router.push('/createChallenge');
          }}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.createButtonText}>Create</Text>
          </Pressable>
        </View>
        <View style={styles.filterButtons}>
          <Pressable
            style={[
              styles.filterButton,
              filter === 'upcoming' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('upcoming')}
          >
            <Ionicons 
              name="time-outline" 
              size={16} 
              color={filter === 'upcoming' ? 'white' : '#374151'} 
            />
            <Text style={[
              styles.filterButtonText,
              filter === 'upcoming' && styles.filterButtonTextActive
            ]}>
              Upcoming
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterButton,
              filter === 'passed' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('passed')}
          >
            <Ionicons 
              name="checkmark-done" 
              size={16} 
              color={filter === 'passed' ? 'white' : '#374151'} 
            />
            <Text style={[
              styles.filterButtonText,
              filter === 'passed' && styles.filterButtonTextActive
            ]}>
              Passed
            </Text>
          </Pressable>
        </View>
      </View>
      
      {/* Loading state */}
      {loading && (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading challenges...</Text>
        </View>
      )}
      
      {/* Error state */}
      {error && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable 
            style={styles.retryButton}
            onPress={() => {
              const loadChallenges = async () => {
                try {
                  setLoading(true);
                  setError(null);
                  const challengesData = await ApiService.getChallenges();
                  setChallenges(challengesData);
                } catch (err) {
                  console.error('Error loading challenges:', err);
                  setError('Failed to load challenges');
                } finally {
                  setLoading(false);
                }
              };
              loadChallenges();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}
      
      {/* Challenges list */}
      {!loading && !error && (
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
                  text: "💰 Added to Balance",
                  icon: "wallet",
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
      )}
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    fontSize: 24,
    fontWeight: "bold",
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f97316', // Orange color to match the theme
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
    ...shadows.button,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: '#ef4444', // Red error color
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.accentStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: 'white',
  },
});
