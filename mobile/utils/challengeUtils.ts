/**
 * Challenge Utility Functions
 * Ensures proper prize pool calculations and challenge management
 */

import { Challenge } from "../constants/types";

/**
 * Calculate the prize pool based on stake and participants
 * Formula: Prize Pool = Stake × Current Participants
 */
export function calculatePrizePool(
  stake: number,
  participants: number,
): number {
  if (stake <= 0) {
    throw new Error("Stake must be a positive number");
  }
  if (participants < 0) {
    throw new Error("Participants cannot be negative");
  }

  return stake * participants;
}

/**
 * Create a challenge with automatically calculated prize pool
 * This ensures the prize pool is always accurate
 */
export function createChallengeWithDynamicPrizePool(
  baseChallenge: Omit<Challenge, "prizePool">,
): Challenge {
  return {
    ...baseChallenge,
    prizePool: calculatePrizePool(
      baseChallenge.stake,
      baseChallenge.participants,
    ),
  };
}

/**
 * Update participant count and recalculate prize pool
 * Use this when someone joins or leaves a challenge
 */
export function updateParticipants(
  challenge: Challenge,
  newParticipantCount: number,
): Challenge {
  if (newParticipantCount > challenge.maxParticipants) {
    throw new Error(
      `Cannot exceed maximum participants (${challenge.maxParticipants})`,
    );
  }

  return {
    ...challenge,
    participants: newParticipantCount,
    prizePool: calculatePrizePool(challenge.stake, newParticipantCount),
  };
}

/**
 * Join a challenge - increases participant count and updates prize pool
 */
export function joinChallenge(challenge: Challenge): Challenge {
  return updateParticipants(challenge, challenge.participants + 1);
}

/**
 * Leave a challenge - decreases participant count and updates prize pool
 */
export function leaveChallenge(challenge: Challenge): Challenge {
  if (challenge.participants <= 0) {
    throw new Error("Cannot leave challenge with no participants");
  }

  return updateParticipants(challenge, challenge.participants - 1);
}

/**
 * Validate that a challenge has correct prize pool calculation
 */
export function validateChallengePrizePool(challenge: Challenge): {
  isValid: boolean;
  expectedPrizePool: number;
  actualPrizePool: number;
  discrepancy: number;
} {
  const expectedPrizePool = calculatePrizePool(
    challenge.stake,
    challenge.participants,
  );
  const actualPrizePool = challenge.prizePool;
  const discrepancy = actualPrizePool - expectedPrizePool;

  return {
    isValid: discrepancy === 0,
    expectedPrizePool,
    actualPrizePool,
    discrepancy,
  };
}

/**
 * Get challenge capacity information
 */
export function getChallengeCapacity(challenge: Challenge): {
  current: number;
  maximum: number;
  available: number;
  percentFull: number;
  isFull: boolean;
} {
  const current = challenge.participants;
  const maximum = challenge.maxParticipants;
  const available = maximum - current;
  const percentFull = (current / maximum) * 100;
  const isFull = current >= maximum;

  return {
    current,
    maximum,
    available,
    percentFull: Math.round(percentFull * 10) / 10, // Round to 1 decimal place
    isFull,
  };
}

/**
 * Calculate total potential prize pool if challenge fills up
 */
export function getMaxPotentialPrizePool(challenge: Challenge): number {
  return calculatePrizePool(challenge.stake, challenge.maxParticipants);
}

/**
 * Get prize pool statistics for a challenge
 */
export function getPrizePoolStats(challenge: Challenge): {
  currentPrizePool: number;
  maxPotentialPrizePool: number;
  averageStakePerParticipant: number;
  potentialIncrease: number;
} {
  const currentPrizePool = challenge.prizePool;
  const maxPotentialPrizePool = getMaxPotentialPrizePool(challenge);
  const averageStakePerParticipant = challenge.stake; // Same as stake since everyone pays the same
  const potentialIncrease = maxPotentialPrizePool - currentPrizePool;

  return {
    currentPrizePool,
    maxPotentialPrizePool,
    averageStakePerParticipant,
    potentialIncrease,
  };
}
