import { RunCalculationService } from './runCalculationService';

export interface ChallengeRunData {
  coords: { latitude: number; longitude: number; timestamp: number }[];
  duration: number; // in seconds
  distance: number; // in meters
  pace: string; // formatted pace string
  completedAt: Date;
}

export interface UserChallengeStatus {
  challengeId: string;
  status: 'not-joined' | 'joined' | 'in-progress' | 'completed';
  joinedAt?: Date;
  runData?: ChallengeRunData;
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
      status: 'not-joined',
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
      status: 'joined',
      joinedAt: new Date(),
    };
  }

  /**
   * Start a challenge run
   * @param existingStatus Current challenge status
   * @returns Updated challenge status
   */
  static startChallengeRun(existingStatus: UserChallengeStatus): UserChallengeStatus {
    return {
      ...existingStatus,
      status: 'in-progress',
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
    runData: Omit<ChallengeRunData, 'completedAt'>
  ): UserChallengeStatus {
    const challengeRunData: ChallengeRunData = {
      ...runData,
      completedAt: new Date(),
    };

    return {
      ...existingStatus,
      status: 'completed',
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
    durationSeconds: number
  ): Omit<ChallengeRunData, 'completedAt'> {
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
  static formatRunDataForDisplay(runData: ChallengeRunData): ChallengeFormattedData {
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
    return status.status === 'joined' || status.status === 'in-progress';
  }

  /**
   * Check if a challenge is completed
   * @param status Current challenge status
   * @returns Whether the challenge is completed
   */
  static isCompleted(status: UserChallengeStatus): boolean {
    return status.status === 'completed';
  }

  /**
   * Check if a challenge is in progress
   * @param status Current challenge status
   * @returns Whether the challenge is in progress
   */
  static isInProgress(status: UserChallengeStatus): boolean {
    return status.status === 'in-progress';
  }

  /**
   * Check if a user has joined the challenge
   * @param status Current challenge status
   * @returns Whether the user has joined
   */
  static hasJoined(status: UserChallengeStatus): boolean {
    return status.status !== 'not-joined';
  }

  /**
   * Get the appropriate button text based on challenge status
   * @param status Current challenge status
   * @returns Button text for the current state
   */
  static getActionButtonText(status: UserChallengeStatus): string {
    switch (status.status) {
      case 'not-joined':
        return 'Stake & Join Challenge';
      case 'joined':
        return 'Start Recording';
      case 'in-progress':
        return 'Continue Recording';
      case 'completed':
        return 'Challenge Completed';
      default:
        return 'Unknown Status';
    }
  }

  /**
   * Get the appropriate card title based on challenge status
   * @param status Current challenge status
   * @returns Card title for the current state
   */
  static getStatusCardTitle(status: UserChallengeStatus): string {
    switch (status.status) {
      case 'not-joined':
        return 'Join Challenge';
      case 'joined':
        return 'Ready to Run!';
      case 'in-progress':
        return 'Challenge In Progress';
      case 'completed':
        return 'Challenge Completed!';
      default:
        return 'Challenge Status';
    }
  }
}
