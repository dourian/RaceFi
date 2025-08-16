import { Challenge } from "../../constants/types";
import { UserChallengeStatus } from "./challengeService";

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  status: "completed" | "joined" | "winner" | "cashOut";
  isCurrentUser: boolean;
  ranking?: number;
  runTime?: string;
  prizeAmount?: number;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  totalParticipants: number;
  userRanking?: number;
  isCompleted: boolean;
  message: string;
}

export class LeaderboardService {
  /**
   * Generate complete leaderboard data for a challenge
   * @param challenge Challenge object
   * @param userStatus Current user's challenge status
   * @returns Complete leaderboard data
   */
  static generateLeaderboard(
    challenge: Challenge,
    userStatus: UserChallengeStatus,
  ): LeaderboardData {
    const isCompleted = ["completed", "winner", "cashOut"].includes(
      userStatus.status,
    );
    const isWinner = ["winner", "cashOut"].includes(userStatus.status);
    const isCashedOut = userStatus.status === "cashOut";

    if (!isCompleted) {
      // Show regular participants list for ongoing challenges
      return this.generateParticipantsList(challenge, userStatus);
    }

    // Show final rankings for completed challenges
    return this.generateFinalRankings(
      challenge,
      userStatus,
      isWinner,
      isCashedOut,
    );
  }

  /**
   * Generate participants list for ongoing challenges
   * @param challenge Challenge object
   * @param userStatus Current user's challenge status
   * @returns Leaderboard data with participants
   */
  private static generateParticipantsList(
    challenge: Challenge,
    userStatus: UserChallengeStatus,
  ): LeaderboardData {
    const entries: LeaderboardEntry[] = [];

    // Challenge Creator (always first)
    entries.push({
      id: "creator",
      name: challenge.creator.name,
      avatar: challenge.creator.avatar,
      status: "completed",
      isCurrentUser: false,
    });

    // Other Participants
    challenge.participantsList.forEach((participant, index) => {
      entries.push({
        id: `participant-${index}`,
        name: participant.name,
        avatar: participant.avatar,
        status: participant.status === "completed" ? "completed" : "joined",
        isCurrentUser: false,
      });
    });

    return {
      entries,
      totalParticipants: challenge.participants,
      isCompleted: false,
      message: `Participants (${challenge.participants}/${challenge.maxParticipants})`,
    };
  }

  /**
   * Generate final rankings for completed challenges
   * @param challenge Challenge object
   * @param userStatus Current user's challenge status
   * @param isWinner Whether current user won
   * @param isCashedOut Whether current user cashed out
   * @returns Leaderboard data with final rankings
   */
  private static generateFinalRankings(
    challenge: Challenge,
    userStatus: UserChallengeStatus,
    isWinner: boolean,
    isCashedOut: boolean,
  ): LeaderboardData {
    const entries: LeaderboardEntry[] = [];
    let currentRanking = 1;
    let userRanking: number | undefined;

    // Winner (Current User) - Always show first if they won or cashed out
    if (isWinner || isCashedOut) {
      entries.push({
        id: "current-user-winner",
        name: "You",
        status: isCashedOut ? "cashOut" : "winner",
        isCurrentUser: true,
        ranking: 1,
        runTime: userStatus.runData
          ? this.formatRunTime(userStatus.runData.duration)
          : undefined,
        prizeAmount: isCashedOut
          ? userStatus.winnerRewards
          : isWinner
            ? userStatus.winnerRewards
            : undefined,
      });
      userRanking = 1;
      currentRanking = 2;
    }

    // Challenge Creator
    entries.push({
      id: "creator",
      name: challenge.creator.name,
      avatar: challenge.creator.avatar,
      status: "completed",
      isCurrentUser: false,
      ranking: currentRanking,
    });
    currentRanking++;

    // Other Completed Participants
    const completedParticipants = challenge.participantsList.filter(
      (p) => p.status === "completed",
    );
    completedParticipants.slice(0, 3).forEach((participant, index) => {
      entries.push({
        id: `completed-${index}`,
        name: participant.name,
        avatar: participant.avatar,
        status: "completed",
        isCurrentUser: false,
        ranking: currentRanking,
      });
      currentRanking++;
    });

    // Non-winner current user (if they completed but didn't win)
    if (!isWinner && !isCashedOut && userStatus.status === "completed") {
      entries.push({
        id: "current-user-completed",
        name: "You",
        status: "completed",
        isCurrentUser: true,
        ranking: currentRanking,
        runTime: userStatus.runData
          ? this.formatRunTime(userStatus.runData.duration)
          : undefined,
      });
      userRanking = currentRanking;
      currentRanking++;
    }

    // Remaining joined participants who haven't completed
    const joinedParticipants = challenge.participantsList.filter(
      (p) => p.status === "joined",
    );
    joinedParticipants.slice(0, 2).forEach((participant, index) => {
      entries.push({
        id: `joined-${index}`,
        name: participant.name,
        avatar: participant.avatar,
        status: "joined",
        isCurrentUser: false,
      });
    });

    // Generate appropriate message
    let message: string;
    if (isWinner || isCashedOut) {
      message = "🎉 Congratulations on winning!";
    } else {
      message = "Challenge completed! Thanks for participating.";
    }

    return {
      entries,
      totalParticipants: challenge.participants,
      userRanking,
      isCompleted: true,
      message,
    };
  }

  /**
   * Format run duration for display
   * @param duration Duration in seconds
   * @returns Formatted time string
   */
  private static formatRunTime(duration: number): string {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  /**
   * Get leaderboard title based on completion status
   * @param isCompleted Whether the challenge is completed
   * @param totalParticipants Total number of participants
   * @param maxParticipants Maximum allowed participants
   * @returns Appropriate title string
   */
  static getLeaderboardTitle(
    isCompleted: boolean,
    totalParticipants: number,
    maxParticipants: number,
  ): string {
    if (isCompleted) {
      return "Final Rankings";
    }
    return `Participants (${totalParticipants}/${maxParticipants})`;
  }

  /**
   * Get appropriate icon for leaderboard header
   * @param isCompleted Whether the challenge is completed
   * @returns Icon name
   */
  static getLeaderboardIcon(isCompleted: boolean): string {
    return isCompleted ? "trophy" : "people";
  }

  /**
   * Get icon color for leaderboard header
   * @param isCompleted Whether the challenge is completed
   * @returns Color string
   */
  static getLeaderboardIconColor(isCompleted: boolean): string {
    return isCompleted ? "#DAA520" : "#6b7280";
  }
}

export default LeaderboardService;
