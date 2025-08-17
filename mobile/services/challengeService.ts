import { RunCalculationService } from "./runCalculationService";
import { Challenge } from "../constants/types";
import { UserBalanceService } from "./userBalanceService";
import { timeManager } from "../helpers/timeManager";

export interface ChallengeRunData {
  coords: { latitude: number; longitude: number; timestamp: number }[];
  duration: number; // in seconds
  distance: number; // in meters
  pace: string; // formatted pace string
  completedAt: Date;
}

export interface UserChallengeStatus {
  challengeId: string;
  status:
    | "not-joined"
    | "joined"
    | "in-progress"
    | "completed"
    | "winner"
    | "cashOut";
  joinedAt?: Date;
  runData?: ChallengeRunData;
  isWinner?: boolean;
  winnerRewards?: number; // ETH reward amount
  cashedOutAt?: Date; // When the user cashed out their winnings
}

export interface ChallengeFormattedData {
  formattedDuration: string;
  formattedDistance: string;
  pace: string;
}

/**
 * Service for managing challenge-related business logic
 */
export class ChallengeService {
  /**
   * Create a new user challenge status
   * @param challengeId The challenge ID
   * @returns Initial challenge status
   */
  static createInitialStatus(challengeId: string): UserChallengeStatus {
    return {
      challengeId,
      status: "not-joined",
    };
  }

  /**
   * Join a challenge
   * @param challengeId The challenge ID
   * @returns Updated challenge status
   */
  static joinChallenge(challengeId: string): UserChallengeStatus {
    return {
      challengeId,
      status: "joined",
      joinedAt: new Date(),
    };
  }

  /**
   * Start a challenge run
   * @param existingStatus Current challenge status
   * @returns Updated challenge status
   */
  static startChallengeRun(
    existingStatus: UserChallengeStatus,
  ): UserChallengeStatus {
    return {
      ...existingStatus,
      status: "in-progress",
    };
  }

  /**
   * Complete a challenge run
   * @param existingStatus Current challenge status
   * @param runData Run completion data
   * @returns Updated challenge status
   */
  static completeChallengeRun(
    existingStatus: UserChallengeStatus,
    runData: Omit<ChallengeRunData, "completedAt">,
  ): UserChallengeStatus {
    const challengeRunData: ChallengeRunData = {
      ...runData,
      completedAt: new Date(),
    };

    return {
      ...existingStatus,
      status: "completed",
      runData: challengeRunData,
    };
  }

  /**
   * Create challenge run data from raw coordinates and duration
   * @param coords Coordinate array with timestamps
   * @param durationSeconds Duration in seconds
   * @returns Formatted challenge run data
   */
  static createRunData(
    coords: { latitude: number; longitude: number; timestamp: number }[],
    durationSeconds: number,
  ): Omit<ChallengeRunData, "completedAt"> {
    const distance = RunCalculationService.calculateDistance(coords);
    const pace = RunCalculationService.calculatePace(coords);

    return {
      coords,
      duration: durationSeconds,
      distance,
      pace,
    };
  }

  /**
   * Format challenge run data for display
   * @param runData Challenge run data
   * @returns Formatted display data
   */
  static formatRunDataForDisplay(
    runData: ChallengeRunData,
  ): ChallengeFormattedData {
    return {
      formattedDuration: RunCalculationService.formatDuration(runData.duration),
      formattedDistance: RunCalculationService.formatDistance(runData.distance),
      pace: runData.pace,
    };
  }

  /**
   * Check if a challenge status allows starting a run
   * @param status Current challenge status
   * @returns Whether the user can start recording
   */
  static canStartRecording(status: UserChallengeStatus): boolean {
    return status.status === "joined" || status.status === "in-progress";
  }

  /**
   * Check if a challenge is completed
   * @param status Current challenge status
   * @returns Whether the challenge is completed
   */
  static isCompleted(status: UserChallengeStatus): boolean {
    return status.status === "completed";
  }

  /**
   * Check if a challenge is in progress
   * @param status Current challenge status
   * @returns Whether the challenge is in progress
   */
  static isInProgress(status: UserChallengeStatus): boolean {
    return status.status === "in-progress";
  }

  /**
   * Check if a user has joined the challenge
   * @param status Current challenge status
   * @returns Whether the user has joined
   */
  static hasJoined(status: UserChallengeStatus): boolean {
    return status.status !== "not-joined";
  }

  /**
   * Get the appropriate button text based on challenge status
   * @param status Current challenge status
   * @returns Button text for the current state
   */
  static getActionButtonText(status: UserChallengeStatus): string {
    switch (status.status) {
      case "not-joined":
        return "Stake & Join Challenge";
      case "joined":
        return "Start Recording";
      case "in-progress":
        return "Continue Recording";
      case "completed":
        return "Challenge Completed";
      default:
        return "Unknown Status";
    }
  }

  /**
   * Get the appropriate card title based on challenge status
   * @param status Current challenge status
   * @returns Card title for the current state
   */
  static getStatusCardTitle(status: UserChallengeStatus): string {
    switch (status.status) {
      case "not-joined":
        return "Join Challenge";
      case "joined":
        return "Ready to Run!";
      case "in-progress":
        return "Challenge In Progress";
      case "completed":
        return "Challenge Completed!";
      case "winner":
        return "🏆 Challenge Winner!";
      case "cashOut":
        return "💰 Winnings Cashed Out";
      default:
        return "Challenge Status";
    }
  }

  /**
   * Simulate challenge ending with user as winner (for testing)
   * @param existingStatus Current challenge status
   * @param prizePoolAmount Prize pool amount in ETH
   * @param challenge Challenge object to check expiration
   * @returns Updated status as winner with winnings automatically added to balance
   */
  static simulateWinner(
    existingStatus: UserChallengeStatus,
    prizePoolAmount: number,
    challenge: Challenge,
  ): UserChallengeStatus {
    if (existingStatus.status !== "completed") {
      throw new Error("Can only make completed challenges into winners");
    }

    // CRITICAL: Winner cannot be determined until the race is expired
    if (!this.isRaceExpired(challenge)) {
      throw new Error("Winner cannot be determined until the race is expired");
    }

    // Automatically add winnings to balance
    UserBalanceService.addWinnings(
      challenge.id,
      challenge.name,
      prizePoolAmount,
    );

    return {
      ...existingStatus,
      status: "cashOut", // Directly to cashOut since winnings are already in balance
      isWinner: true,
      winnerRewards: prizePoolAmount,
      cashedOutAt: new Date(),
    };
  }

  /**
   * Generate mock run data for testing
   * @param challengeId Challenge ID
   * @param isWinningTime Whether this should be a winning time
   * @returns Mock challenge run data
   */
  static createMockRunData(
    challengeId: string,
    isWinningTime: boolean = true,
  ): Omit<ChallengeRunData, "completedAt"> {
    // Mock coordinates for a short route
    const mockCoords = [
      {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now() - 1800000,
      }, // 30 min ago
      {
        latitude: 37.7751,
        longitude: -122.4196,
        timestamp: Date.now() - 1500000,
      }, // 25 min ago
      {
        latitude: 37.7753,
        longitude: -122.4198,
        timestamp: Date.now() - 1200000,
      }, // 20 min ago
      { latitude: 37.7755, longitude: -122.42, timestamp: Date.now() - 900000 }, // 15 min ago
      {
        latitude: 37.7757,
        longitude: -122.4202,
        timestamp: Date.now() - 600000,
      }, // 10 min ago
      {
        latitude: 37.7759,
        longitude: -122.4204,
        timestamp: Date.now() - 300000,
      }, // 5 min ago
    ];

    // Generate different times based on challenge and whether it's winning
    let duration: number;
    let pace: string;

    if (challengeId === "waterfront-5k") {
      // 5K challenge
      duration = isWinningTime ? 1200 : 1500; // 20 min vs 25 min
      pace = isWinningTime ? "4:00" : "5:00";
    } else if (challengeId === "uptown-10k") {
      // 10K challenge
      duration = isWinningTime ? 2400 : 3000; // 40 min vs 50 min
      pace = isWinningTime ? "4:00" : "5:00";
    } else {
      // Default for unknown challenges (assume 5K)
      duration = isWinningTime ? 1200 : 1500; // 20 min vs 25 min
      pace = isWinningTime ? "4:00" : "5:00";
    }

    const distance =
      challengeId === "waterfront-5k"
        ? 5000
        : challengeId === "uptown-10k"
          ? 10000
          : 5000; // meters

    return {
      coords: mockCoords,
      duration,
      distance,
      pace,
    };
  }

  /**
   * Check if a challenge status represents a winner
   * @param status Current challenge status
   * @returns Whether the user won the challenge
   */
  static isWinner(status: UserChallengeStatus): boolean {
    return status.isWinner === true || status.status === "winner";
  }

  /**
   * Add winning rewards to balance (previously direct cashout)
   * @param existingStatus Current challenge status
   * @returns Updated status with winnings recorded
   */
  static addWinningsToBalance(
    existingStatus: UserChallengeStatus,
  ): UserChallengeStatus {
    if (existingStatus.status !== "winner") {
      throw new Error("Can only add winnings from winner status");
    }

    return {
      ...existingStatus,
      status: "cashOut",
      cashedOutAt: new Date(),
    };
  }

  /**
   * Legacy cashout method (kept for backward compatibility)
   * @param existingStatus Current challenge status
   * @returns Updated status as cashed out
   */
  static cashOut(existingStatus: UserChallengeStatus): UserChallengeStatus {
    return this.addWinningsToBalance(existingStatus);
  }

  /**
   * Check if a challenge has been cashed out
   * @param status Current challenge status
   * @returns Whether the challenge winnings have been cashed out
   */
  static isCashedOut(status: UserChallengeStatus): boolean {
    return status.status === "cashOut";
  }

  /**
   * Check if a race is expired (ended) based on the current app time
   * @param challenge Challenge object with endDate
   * @returns Whether the race has expired
   */
  static isRaceExpired(challenge: Challenge): boolean {
    return timeManager.isExpired(challenge.endDate);
  }

  /**
   * Check if a race is expired by challengeId (requires challenge lookup)
   * @param challengeId Challenge ID
   * @param challenges Array of challenges to lookup from
   * @returns Whether the race has expired
   */
  static isRaceExpiredById(
    challengeId: string,
    challenges: Challenge[],
  ): boolean {
    const challenge = challenges.find((c) => c.id === challengeId);
    if (!challenge) {
      throw new Error(`Challenge with id ${challengeId} not found`);
    }
    return this.isRaceExpired(challenge);
  }
}
