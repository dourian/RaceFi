import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useChallenge } from "../contexts/challengeContext";
import { ApiService } from "../../src/services/apiService";
import { Challenge } from "../../constants/types";
import { colors, spacing, typography, shadows } from "../theme";
import { Card, CardHeader, CardContent } from "../../components/ui";

const { width: screenWidth } = Dimensions.get("window");
const badgeSize = (screenWidth - spacing.xl * 2 - spacing.lg) / 2; // Two badges per row

export default function TrophiesScreen() {
  const { userChallengeStatuses } = useChallenge();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Load challenges from API
  useEffect(() => {
    const loadChallenges = async () => {
      try {
        const challengesData = await ApiService.getChallenges();
        setChallenges(challengesData);
      } catch (error) {
        console.error('Error loading challenges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChallenges();
  }, []);

  // Get won challenges
  const wonChallenges = userChallengeStatuses
    .filter(status => status.status === 'winner')
    .map(status => {
      const challenge = challenges.find(c => c.id === status.challengeId);
      return { ...status, challenge };
    })
    .filter(item => item.challenge); // Remove any undefined challenges

  const totalWins = wonChallenges.length;
  const totalPrizesMoney = wonChallenges.reduce((sum, item) => sum + (item.winnerRewards || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏆 Trophy Collection</Text>
          <Text style={styles.subtitle}>
            Your victories and achievements
          </Text>
        </View>

        {/* Stats Overview */}
        <Card style={styles.statsCard}>
          <CardContent>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalWins}</Text>
                <Text style={styles.statLabel}>Wins</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalPrizesMoney}</Text>
                <Text style={styles.statLabel}>USDC Won</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {wonChallenges.reduce((sum, item) => sum + (item.challenge?.distanceKm || 0), 0)}km
                </Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Trophy Badges */}
        {wonChallenges.length > 0 ? (
          <View style={styles.trophiesContainer}>
            <View style={styles.trophiesGrid}>
              {wonChallenges.map((item, index) => (
                <TrophyBadge
                  key={item.challengeId}
                  challengeStatus={item}
                  challenge={item.challenge!}
                  index={index}
                />
              ))}
            </View>
          </View>
        ) : (
          <Card style={styles.emptyState}>
            <CardContent>
              <View style={styles.emptyContent}>
                <Ionicons name="trophy-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Trophies Yet</Text>
                <Text style={styles.emptyDescription}>
                  Join and win challenges to earn your first trophy!
                </Text>
                <Link href="/(tabs)" asChild>
                  <Pressable style={styles.exploreButton}>
                    <Ionicons name="compass" size={16} color="white" />
                    <Text style={styles.exploreButtonText}>Explore Challenges</Text>
                  </Pressable>
                </Link>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Achievement Levels (Future feature teaser) */}
        <Card style={styles.achievementsCard}>
          <CardHeader title="Achievement Levels" />
          <CardContent>
            <View style={styles.achievementItem}>
              <View style={[
                styles.achievementIcon,
                { backgroundColor: totalWins >= 1 ? '#DAA520' : colors.surface }
              ]}>
                <Ionicons 
                  name="medal" 
                  size={20} 
                  color={totalWins >= 1 ? 'white' : colors.textMuted} 
                />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>First Victory</Text>
                <Text style={styles.achievementDescription}>Win your first challenge</Text>
              </View>
              {totalWins >= 1 && <Ionicons name="checkmark-circle" size={20} color="#22c55e" />}
            </View>

            <View style={styles.achievementItem}>
              <View style={[
                styles.achievementIcon,
                { backgroundColor: totalWins >= 3 ? '#DAA520' : colors.surface }
              ]}>
                <Ionicons 
                  name="trophy" 
                  size={20} 
                  color={totalWins >= 3 ? 'white' : colors.textMuted} 
                />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>Triple Threat</Text>
                <Text style={styles.achievementDescription}>Win 3 challenges ({totalWins}/3)</Text>
              </View>
              {totalWins >= 3 && <Ionicons name="checkmark-circle" size={20} color="#22c55e" />}
            </View>

            <View style={styles.achievementItem}>
              <View style={[
                styles.achievementIcon,
                { backgroundColor: totalPrizesMoney >= 100 ? '#DAA520' : colors.surface }
              ]}>
                <Ionicons 
                  name="cash" 
                  size={20} 
                  color={totalPrizesMoney >= 100 ? 'white' : colors.textMuted} 
                />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>Prize Hunter</Text>
                <Text style={styles.achievementDescription}>Earn 100+ USDC ({totalPrizesMoney}/100)</Text>
              </View>
              {totalPrizesMoney >= 100 && <Ionicons name="checkmark-circle" size={20} color="#22c55e" />}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// Trophy Badge Component with 3D effect
const TrophyBadge: React.FC<{
  challengeStatus: any;
  challenge: any;
  index: number;
}> = ({ challengeStatus, challenge, index }) => {
  // Different colors for different challenges
  const badgeColors = [
    ['#FFD700', '#FF6B00'], // Gold to Orange
    ['#FF1493', '#8A2BE2'], // Pink to Purple  
    ['#00CED1', '#0066CC'], // Turquoise to Blue
    ['#32CD32', '#006400'], // Lime to Dark Green
    ['#FF4500', '#8B0000'], // Orange Red to Dark Red
    ['#9370DB', '#4B0082'], // Medium Purple to Indigo
    ['#FF69B4', '#C71585'], // Hot Pink to Medium Violet Red
    ['#20B2AA', '#008B8B'], // Light Sea Green to Dark Cyan
  ];
  
  const colorIndex = index % badgeColors.length;
  const [primaryColor, secondaryColor] = badgeColors[colorIndex];

  return (
    <Link
      href={{ pathname: "/challenge/[id]", params: { id: challenge.id } }}
      asChild
    >
      <Pressable style={styles.trophyBadge}>
        <LinearGradient
          colors={[primaryColor, secondaryColor]}
          style={styles.badgeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Main Badge Content */}
          <View style={styles.badgeContent}>
            {/* Trophy Icon */}
            <View style={styles.trophyIconContainer}>
              <Ionicons name="trophy" size={32} color="white" />
            </View>
            
            {/* Challenge Info */}
            <Text style={styles.badgeTitle} numberOfLines={2}>
              {challenge.name}
            </Text>
            
            {/* Prize Amount */}
            <View style={styles.prizeContainer}>
              <Text style={styles.prizeAmount}>
                {challengeStatus.winnerRewards} USDC
              </Text>
            </View>
            
            {/* Challenge Stats */}
            <View style={styles.badgeStats}>
              <Text style={styles.badgeStat}>{challenge.distanceKm}km</Text>
              <Text style={styles.badgeStat}>•</Text>
              <Text style={styles.badgeStat}>{challenge.elevation}m↗</Text>
            </View>
            
            {/* Date Won */}
            <Text style={styles.dateWon}>
              {challengeStatus.completedAt ? 
                new Date(challengeStatus.completedAt).toLocaleDateString() : 
                'Recently'
              }
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 16,
  },
  statsCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.meta,
    fontSize: 12,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  trophiesContainer: {
    paddingHorizontal: spacing.xl,
  },
  trophiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  trophyBadge: {
    width: badgeSize,
    height: badgeSize * 1.2,
    marginBottom: spacing.lg,
    borderRadius: 16,
    overflow: "hidden",
    ...shadows.medium,
  },
  badgeGradient: {
    flex: 1,
    position: "relative",
  },
  badgeContent: {
    flex: 1,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  trophyIconContainer: {
    alignItems: "center",
    position: "relative",
  },
  badgeTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  prizeContainer: {
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  prizeAmount: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  badgeStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeStat: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    fontWeight: "500",
  },
  dateWon: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 9,
    fontWeight: "400",
  },
  emptyState: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.xl,
  },
  emptyContent: {
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  exploreButton: {
    backgroundColor: "#e64a00",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
    gap: spacing.xs,
  },
  exploreButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  achievementsCard: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
    marginBottom: spacing.xl * 2,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
