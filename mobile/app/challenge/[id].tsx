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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { challenges } from "../lib/mock";
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

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = challenges.find((c) => c.id === id);
  const [isJoined, setIsJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5 * 24 * 60 * 60 * 1000); // 5 days in milliseconds

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  };

  const handleJoinChallenge = () => {
    setIsJoined(true);
  };

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <Text>Challenge not found.</Text>
      </SafeAreaView>
    );
  }

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

          {/* Route Map */}
          <Card style={styles.cardSpacing}>
            <CardHeader title="Route Map" />
            <CardContent>
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map" size={48} color={colors.textMuted} />
                <Text style={styles.mapText}>
                  Interactive route map would appear here
                </Text>
                <Text style={styles.mapSubtext}>
                  Showing {challenge.distanceKm}km route through{" "}
                  {challenge.location.split(",")[0]}
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Join Challenge Card */}
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
          ) : (
            <Card style={{ ...styles.cardSpacing, ...styles.joinedCard }}>
              <CardHeader
                title="Joined!"
                icon={<Ionicons name="trophy" size={18} color="#22c55e" />}
              />
              <CardContent>
                <Text style={styles.joinedText}>
                  You've successfully joined this challenge. Complete your run
                  before the deadline to earn rewards!
                </Text>
                <Link
                  href={{ pathname: "/record", params: { id: challenge.id } }}
                  asChild
                >
                  <Pressable style={styles.recordButton}>
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

          {/* Countdown Timer */}
          <Card style={styles.cardSpacing}>
            <CardHeader
              title="Time Remaining"
              icon={<Ionicons name="time" size={18} color={colors.text} />}
            />
            <CardContent>
              <View style={styles.timerContent}>
                <Text style={styles.timeDisplay}>{formatTime(timeLeft)}</Text>
                <Progress value={70} style={styles.progressBar} />
                <Text style={styles.endDate}>
                  Challenge ends {challenge.endDate.toLocaleDateString()}
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Enhanced Participants List */}
          <Card style={styles.cardSpacing}>
            <CardHeader
              title={`Participants (${challenge.participants}/${challenge.maxParticipants})`}
              icon={<Ionicons name="people" size={18} color={colors.text} />}
            />
            <CardContent>
              {/* Challenge Creator */}
              <View style={styles.creatorRow}>
                <Avatar source={challenge.creator.avatar} size={32} />
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {challenge.creator.name}
                  </Text>
                  <Text style={styles.participantStatus}>
                    Creator • {challenge.creator.time}
                  </Text>
                </View>
                <Badge variant="outline">
                  <Text>Creator</Text>
                </Badge>
              </View>

              <Separator />

              {/* Other Participants */}
              {challenge.participantsList.map((participant, index) => (
                <View key={index} style={styles.participantRow}>
                  <Avatar source={participant.avatar} size={32} />
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {participant.name}
                    </Text>
                    <Text style={styles.participantStatus}>
                      {participant.status === "completed" && participant.time
                        ? `Finished • ${participant.time}`
                        : participant.status === "running" && participant.time
                          ? `Running • ${participant.time}`
                          : participant.status === "joined"
                            ? "Joined"
                            : participant.status || "No status"}
                    </Text>
                  </View>
                  <Badge
                    variant={
                      participant.status === "completed"
                        ? "default"
                        : participant.status === "running"
                          ? "default"
                          : "outline"
                    }
                  >
                    <Text>
                      {participant.status === "completed"
                        ? "Done"
                        : participant.status === "running"
                          ? "Running"
                          : participant.status === "joined"
                            ? "Joined"
                            : participant.status || "Status"}
                    </Text>
                  </Badge>
                </View>
              ))}
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
});
