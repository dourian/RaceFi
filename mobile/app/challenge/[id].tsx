import { Link, useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  StyleSheet,
  Pressable,
  View,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { challenges } from "../../constants";
import { colors, spacing, typography, shadows, borderRadius } from "../theme";
import {
  Card,
  CardHeader,
  CardContent,
  Stat,
  Avatar,
  Badge,
  Progress,
  Separator,
} from "../../components/ui";
import React, { useState, useEffect } from "react";
import { useChallenge } from "../contexts/challengeContext";
import { ChallengeService } from "../../src/services/challengeService";
import { RunCalculationService } from "../../src/services/runCalculationService";
import LeaderboardService from "../../src/services/leaderboardService";
import StaticRoutePreview from "../../components/StaticRoutePreview";
import { useAppTime, getCurrentAppTime } from "../../constants/timeManager";

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = challenges.find((c) => c.id === id);
  const { getChallengeStatus, joinChallenge, startChallengeRun, cashOutWinnings } = useChallenge();
  const currentAppTime = useAppTime(); // Use centralized app time that updates when time changes

  const challengeStatus = getChallengeStatus(id || '');
  const isJoined = challengeStatus.status !== 'not-joined';
  const isCompleted = challengeStatus.status === 'completed';
  const isWinner = challengeStatus.status === 'winner';
  const isCashedOut = challengeStatus.status === 'cashOut';
  const isInProgress = challengeStatus.status === 'in-progress';

  // Calculate actual time remaining using challenge end date and current app time
  const getTimeRemaining = () => {
    if (!challenge) return { timeLeft: 0, isExpired: true, progressValue: 0 };
    
    const now = currentAppTime;
    const endTime = challenge.endDate.getTime();
    const startTime = challenge.startDate.getTime();
    const timeLeft = Math.max(0, endTime - now);
    const isExpired = endTime < now;
    
    // Calculate progress as percentage of time elapsed
    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;
    const progressValue = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    
    return { timeLeft, isExpired, progressValue };
  };

  const formatTime = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Get expiry status and text using same logic as home screen
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

  const handleJoinChallenge = () => {
    if (id) {
      joinChallenge(id);
    }
  };

  const handleStartRecording = () => {
    if (id) {
      startChallengeRun(id);
    }
  };


  if (!challenge) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <Text>Challenge not found.</Text>
      </SafeAreaView>
    );
  }

  // Generate leaderboard data using the service
  const leaderboardData = LeaderboardService.generateLeaderboard(challenge, challengeStatus);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView style={styles.scrollView}>
        {/* Orange Header Banner */}
        <View style={styles.headerBanner}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.locationText}>{challenge.location}</Text>
          </View>
          <Text style={styles.headerTitle}>{challenge.name}</Text>
          <Text style={styles.headerDescription}>{challenge.description}</Text>
        </View>

        {/* Runner Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require("../../assets/rwcover.webp")}
            style={styles.runnerImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.mainContent}>
          {/* Challenge Stats */}
          <Card>
            <CardHeader
              title="Challenge Details"
              icon={
                <Ionicons name="flash" size={18} color={colors.accentStrong} />
              }
            />
            <CardContent>
              <View style={styles.statsGrid}>
                <Stat label="Distance" value={`${challenge.distanceKm}km`} />
                <Stat label="Elevation" value={`${challenge.elevation}m`} />
                <Stat
                  label="Prize Pool"
                  value={`${challenge.prizePool} USDC`}
                />
              </View>
            </CardContent>
          </Card>

          {/* Route Map - Only show for non-completed challenges */}
          {!isCompleted && !isWinner && !isCashedOut && (
            <Card style={styles.cardSpacing}>
              <CardHeader title="Route Map" />
              <CardContent>
                <View style={styles.mapContainer}>
                  {challenge.polyline ? (
                    <StaticRoutePreview
                      challengeId={challenge.id}
                      polyline={challenge.polyline}
                      routeColor={challenge.routeColor}
                      width={Dimensions.get('window').width - 80}
                      height={200}
                      style={styles.routeMap}
                    />
                  ) : (
                    <View style={styles.mapPlaceholder}>
                      <Ionicons name="map" size={48} color={colors.textMuted} />
                      <Text style={styles.mapText}>
                        Route map coming soon
                      </Text>
                      <Text style={styles.mapSubtext}>
                        Showing {challenge.distanceKm}km route through{" "}
                        {challenge.location.split(",")[0]}
                      </Text>
                    </View>
                  )}
                </View>
              </CardContent>
            </Card>
          )}

          {/* Challenge Status Card */}
          {!isJoined ? (
            <Card style={{ ...styles.cardSpacing, ...styles.joinCard }}>
              <CardHeader title="Join Challenge" />
              <CardContent>
                <View style={styles.stakeInfo}>
                  <Text style={styles.stakeAmount}>{challenge.stake} USDC</Text>
                  <Text style={styles.stakeLabel}>Stake to join</Text>
                </View>
                <Pressable
                  onPress={handleJoinChallenge}
                  style={styles.joinButton}
                >
                  <Text style={styles.joinButtonText}>
                    Stake & Join Challenge
                  </Text>
                </Pressable>
                <Text style={styles.stakeDisclaimer}>
                  Winner takes all! Complete the challenge with the best time to
                  win the entire prize pool.
                </Text>
              </CardContent>
            </Card>
          ) : isCashedOut ? (
            <Card style={{ ...styles.cardSpacing, ...styles.cashedOutCard }}>
              <CardHeader
                title="💰 Winnings Cashed Out"
                icon={<Ionicons name="wallet" size={18} color="#10b981" />}
              />
              <CardContent>
                <Text style={styles.cashedOutText}>
                  ✅ You've successfully cashed out your {challengeStatus.winnerRewards} USDC winnings!
                </Text>
                {challengeStatus.runData && (
                  <View style={styles.resultStats}>
                    <View style={styles.resultItem}>
                      <Text style={styles.cashedOutValue}>
                        {RunCalculationService.formatDuration(challengeStatus.runData.duration)}
                      </Text>
                      <Text style={styles.resultLabel}>Winning Time</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.cashedOutValue}>
                        {RunCalculationService.formatDistance(challengeStatus.runData.distance)}
                      </Text>
                      <Text style={styles.resultLabel}>Distance</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.cashedOutValue}>
                        {challengeStatus.runData.pace}
                      </Text>
                      <Text style={styles.resultLabel}>Pace/km</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.cashedOutNote}>
                  Funds have been transferred to your wallet. Thanks for participating! 💚
                </Text>

                {challengeStatus.cashedOutAt && (
                  <Text style={styles.cashedOutDate}>
                    Cashed out on {challengeStatus.cashedOutAt.toLocaleDateString()}
                  </Text>
                )}
              </CardContent>
            </Card>
          ) : isWinner ? (
            <Card style={{ ...styles.cardSpacing, ...styles.winnerCard }}>
              <CardHeader
                title="🏆 Challenge Winner!"
                icon={<Ionicons name="trophy" size={18} color="#DAA520" />}
              />
              <CardContent>
                <Text style={styles.winnerText}>
                  🎉 Congratulations! You won this challenge and earned {challengeStatus.winnerRewards} USDC!
                </Text>
                {challengeStatus.runData && (
                  <View style={styles.resultStats}>
                    <View style={styles.resultItem}>
                      <Text style={styles.winnerValue}>
                        {RunCalculationService.formatDuration(challengeStatus.runData.duration)}
                      </Text>
                      <Text style={styles.resultLabel}>Winning Time</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.winnerValue}>
                        {RunCalculationService.formatDistance(challengeStatus.runData.distance)}
                      </Text>
                      <Text style={styles.resultLabel}>Distance</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.winnerValue}>
                        {challengeStatus.runData.pace}
                      </Text>
                      <Text style={styles.resultLabel}>Pace/km</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.winnerNote}>
                  Your reward has been added to your account! 🎊
                </Text>

                <Pressable 
                  style={styles.cashOutButton} 
                  onPress={() => {
                    Alert.alert(
                      'Cash Out',
                      `Ready to cash out your ${challengeStatus.winnerRewards} USDC winnings?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Cash Out', 
                          onPress: () => {
                            if (id) {
                              cashOutWinnings(id);
                              Alert.alert('Success', 'Cashout initiated! Funds will be transferred to your wallet.');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons name="wallet" size={16} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.cashOutButtonText}>Cash Out {challengeStatus.winnerRewards} USDC</Text>
                </Pressable>
              </CardContent>
            </Card>
          ) : isCompleted ? (
            <Card style={{ ...styles.cardSpacing, ...styles.completedCard }}>
              <CardHeader
                title="Challenge Completed!"
                icon={<Ionicons name="checkmark-circle" size={18} color="#10b981" />}
              />
              <CardContent>
                <Text style={styles.completedText}>
                  Congratulations! You've completed this challenge.
                </Text>
                {challengeStatus.runData && (
                  <View style={styles.resultStats}>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultValue}>
                        {RunCalculationService.formatDuration(challengeStatus.runData.duration)}
                      </Text>
                      <Text style={styles.resultLabel}>Your Time</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultValue}>
                        {RunCalculationService.formatDistance(challengeStatus.runData.distance)}
                      </Text>
                      <Text style={styles.resultLabel}>Distance</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultValue}>
                        {challengeStatus.runData.pace}
                      </Text>
                      <Text style={styles.resultLabel}>Pace/km</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.resultNote}>
                  Results have been submitted. Check back later for final rankings!
                </Text>
              </CardContent>
            </Card>
          ) : isInProgress ? (
            <Card style={{ ...styles.cardSpacing, ...styles.inProgressCard }}>
              <CardHeader
                title="Challenge In Progress"
                icon={<Ionicons name="time" size={18} color="#f59e0b" />}
              />
              <CardContent>
                <Text style={styles.inProgressText}>
                  Your run is currently in progress. Complete your recording to
                  submit your result!
                </Text>
                <Link
                  href={{ pathname: "/recordRun", params: { id: challenge.id } }}
                  asChild
                >
                  <Pressable style={styles.continueButton}>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.continueButtonText}>Continue Recording</Text>
                  </Pressable>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card style={{ ...styles.cardSpacing, ...styles.joinedCard }}>
              <CardHeader
                title="Ready to Run!"
                icon={<Ionicons name="trophy" size={18} color="#22c55e" />}
              />
              <CardContent>
                <Text style={styles.joinedText}>
                  You've successfully joined this challenge. Complete your run
                  before the deadline to earn rewards!
                </Text>
                <Link
                  href={{ pathname: "/recordRun", params: { id: challenge.id } }}
                  asChild
                >
                  <Pressable 
                    style={styles.recordButton}
                    onPress={handleStartRecording}
                  >
                    <Ionicons
                      name="play"
                      size={16}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.recordButtonText}>Start Recording</Text>
                  </Pressable>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Countdown Timer - Only show for non-completed challenges */}
          {!isCompleted && !isWinner && !isCashedOut && (() => {
            const { timeLeft, isExpired, progressValue } = getTimeRemaining();
            const expiryInfo = getExpiryInfo(challenge, challengeStatus);
            
            return (
              <Card style={styles.cardSpacing}>
                <CardHeader
                  title="Time Remaining"
                  icon={<Ionicons name="time" size={18} color={expiryInfo.color} />}
                />
                <CardContent>
                  <View style={styles.timerContent}>
                    {isExpired ? (
                      <Text style={[styles.timeDisplay, { color: expiryInfo.color }]}>
                        {expiryInfo.text}
                      </Text>
                    ) : (
                      <Text style={[styles.timeDisplay, { color: expiryInfo.color }]}>
                        {formatTime(timeLeft)}
                      </Text>
                    )}
                    <Progress value={progressValue} style={styles.progressBar} />
                    <Text style={styles.endDate}>
                      Challenge ends {challenge.endDate.toLocaleDateString()}
                    </Text>
                    <Text style={[styles.expiryStatus, { color: expiryInfo.color }]}>
                      {expiryInfo.text}
                    </Text>
                  </View>
                </CardContent>
              </Card>
            );
          })()}

          {/* Enhanced Participants List / Leaderboard */}
          <Card style={styles.cardSpacing}>
            <CardHeader
              title={LeaderboardService.getLeaderboardTitle(
                leaderboardData.isCompleted,
                leaderboardData.totalParticipants,
                challenge.maxParticipants
              )}
              icon={
                <Ionicons 
                  name={LeaderboardService.getLeaderboardIcon(leaderboardData.isCompleted) as any} 
                  size={18} 
                  color={LeaderboardService.getLeaderboardIconColor(leaderboardData.isCompleted)} 
                />
              }
            />
            <CardContent>
              {leaderboardData.isCompleted ? (
                // Show final rankings
                <View>
                  {leaderboardData.entries.map((entry, index) => {
                    const isWinnerEntry = entry.status === 'winner' || entry.status === 'cashOut';
                    const showPrize = isWinnerEntry && entry.prizeAmount;
                    
                    return (
                      <View 
                        key={entry.id} 
                        style={[
                          styles.rankingRow, 
                          isWinnerEntry ? styles.winnerRow : null
                        ]}
                      >
                        <View style={styles.rankingPosition}>
                          {isWinnerEntry ? (
                            <Text style={[styles.rankingNumber, styles.winnerText]}>👑</Text>
                          ) : (
                            <Text style={styles.rankingNumber}>
                              {entry.ranking ? `#${entry.ranking}` : '-'}
                            </Text>
                          )}
                        </View>
                        {entry.avatar && <Avatar source={entry.avatar} size={28} />}
                        <View style={styles.rankingInfo}>
                          <Text style={[
                            styles.rankingName, 
                            isWinnerEntry ? styles.winnerText : null
                          ]}>
                            {entry.name}
                          </Text>
                          <View style={styles.rankingDetails}>
                            <Text style={styles.rankingStatus}>
                              {entry.status === 'completed' ? 'Done' : 
                               entry.status === 'joined' ? 'Joined' : 
                               entry.status === 'cashOut' ? 'Cashed Out' : 'Winner'}
                            </Text>
                            {entry.runTime && (
                              <Text style={styles.rankingTime}> • {entry.runTime}</Text>
                            )}
                          </View>
                        </View>
                        {showPrize && (
                          <View style={styles.prizeIndicator}>
                            <Text style={styles.prizeText}>{entry.prizeAmount} USDC</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                  
                  <Text style={styles.rankingNote}>
                    {leaderboardData.message}
                  </Text>
                </View>
              ) : (
                // Show participants list for ongoing challenges
                <View>
                  {leaderboardData.entries.map((entry, index) => {
                    const isCreator = entry.id === 'creator';
                    return (
                      <View key={entry.id}>
                        {index === 1 && <Separator />}
                        <View style={isCreator ? styles.creatorRow : styles.participantRow}>
                          {entry.avatar && <Avatar source={entry.avatar} size={32} />}
                          <View style={styles.participantInfo}>
                            <Text style={styles.participantName}>
                              {entry.name}
                            </Text>
                            <Text style={styles.participantStatus}>
                              {isCreator ? 'Creator • Done' : 
                               entry.status === 'completed' ? 'Done' : 'Joined'}
                            </Text>
                          </View>
                          <Badge variant={isCreator ? 'outline' : 
                                         entry.status === 'completed' ? 'default' : 'outline'}>
                            <Text>
                              {isCreator ? 'Creator' : 
                               entry.status === 'completed' ? 'Done' : 'Joined'}
                            </Text>
                          </Badge>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBanner: {
    backgroundColor: "#e64a00",
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    marginHorizontal: -spacing.lg,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  locationText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: spacing.sm,
  },
  headerDescription: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    lineHeight: 22,
  },
  imageContainer: {
    height: 200,
    width: Dimensions.get("window").width,
    alignSelf: "center",
  },
  runnerImage: {
    width: "100%",
    height: "100%",
  },
  mainContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  statLabel: {
    ...typography.meta,
    marginTop: 4,
  },
  cardSpacing: {
    marginTop: spacing.lg,
  },
  mapPlaceholder: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  mapText: {
    ...typography.body,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  mapSubtext: {
    ...typography.meta,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  mapContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  routeMap: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  joinCard: {
    borderColor: "#e64a00",
    borderWidth: 1,
  },
  stakeInfo: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  stakeAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
  },
  stakeLabel: {
    ...typography.meta,
  },
  joinButton: {
    backgroundColor: "#e64a00",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  joinButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  stakeDisclaimer: {
    ...typography.meta,
    textAlign: "center",
    fontSize: 12,
  },
  joinedCard: {
    borderColor: "#22c55e",
    borderWidth: 1,
  },
  joinedText: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  recordButton: {
    backgroundColor: "#22c55e",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  recordButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  timerContent: {
    alignItems: "center",
  },
  timeDisplay: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e64a00",
    marginBottom: spacing.md,
  },
  progressBar: {
    marginBottom: spacing.md,
    alignSelf: "stretch",
  },
  endDate: {
    ...typography.meta,
    marginBottom: spacing.xs,
  },
  expiryStatus: {
    ...typography.meta,
    textAlign: "center",
    fontWeight: "500",
    fontSize: 14,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: "rgba(230, 74, 0, 0.1)",
    borderRadius: 8,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  participantInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  participantStatus: {
    ...typography.meta,
    marginTop: 2,
  },
  // Completed challenge card
  completedCard: {
    borderColor: "#10b981",
    borderWidth: 1,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  completedText: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: "#059669",
  },
  resultStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 8,
  },
  resultItem: {
    alignItems: "center",
  },
  resultValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#059669",
  },
  resultLabel: {
    ...typography.meta,
    marginTop: 4,
    fontSize: 12,
  },
  resultNote: {
    ...typography.meta,
    textAlign: "center",
    fontStyle: "italic",
  },
  // In-progress challenge card
  inProgressCard: {
    borderColor: "#f59e0b",
    borderWidth: 1,
    backgroundColor: "rgba(245, 158, 11, 0.05)",
  },
  inProgressText: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: "#d97706",
  },
  continueButton: {
    backgroundColor: "#f59e0b",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Winner challenge card
  winnerCard: {
    borderColor: "#DAA520",
    borderWidth: 2,
    backgroundColor: "rgba(255, 215, 0, 0.05)",
  },
  winnerText: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: "#B8860B",
    fontWeight: "600",
  },
  winnerValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#DAA520",
  },
  winnerNote: {
    ...typography.meta,
    textAlign: "center",
    fontStyle: "italic",
    color: "#B8860B",
    fontWeight: "500",
    marginBottom: spacing.lg,
  },
  cashOutButton: {
    backgroundColor: "#DAA520",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  cashOutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Cashed out challenge card
  cashedOutCard: {
    borderColor: "#10b981",
    borderWidth: 2,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  cashedOutText: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: "#059669",
    fontWeight: "600",
  },
  cashedOutValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10b981",
  },
  cashedOutNote: {
    ...typography.meta,
    textAlign: "center",
    fontStyle: "italic",
    color: "#059669",
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  cashedOutDate: {
    ...typography.meta,
    textAlign: "center",
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  // Ranking/Leaderboard styles
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  winnerRow: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderWidth: 1,
    borderColor: "#DAA520",
  },
  rankingPosition: {
    width: 40,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  rankingNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  rankingInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  rankingName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  rankingDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  rankingTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rankingStatus: {
    fontSize: 12,
    color: colors.textMuted,
  },
  prizeIndicator: {
    backgroundColor: "#DAA520",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  prizeText: {
    fontSize: 12,
    color: "white",
    fontWeight: "bold",
  },
  rankingNote: {
    ...typography.meta,
    textAlign: "center",
    marginTop: spacing.lg,
    fontStyle: "italic",
    color: colors.textMuted,
  },
});
