/**
 * USDC Prize Pool Validation Utility
 * Validates that prize pools are correctly calculated based on stakes and participants
 */

import { Challenge } from '../constants/types';

export interface PoolValidationResult {
  challengeId: string;
  challengeName: string;
  stake: number;
  participants: number;
  maxParticipants: number;
  currentPrizePool: number;
  expectedPrizePool: number;
  isValid: boolean;
  discrepancy: number;
  validationNotes: string[];
}

export interface PoolAnalysis {
  totalChallenges: number;
  validChallenges: number;
  invalidChallenges: number;
  totalStakeAmount: number;
  totalPrizePoolAmount: number;
  averageStake: number;
  averageParticipants: number;
  results: PoolValidationResult[];
  summary: string[];
}

/**
 * Validate prize pool calculations for a single challenge
 * Expected formula: prizePool = stake × participants
 */
export function validateChallengePool(challenge: Challenge): PoolValidationResult {
  const expectedPrizePool = challenge.stake * challenge.participants;
  const discrepancy = challenge.prizePool - expectedPrizePool;
  const isValid = discrepancy === 0;
  
  const validationNotes: string[] = [];
  
  if (!isValid) {
    if (discrepancy > 0) {
      validationNotes.push(`Prize pool is ${discrepancy} USDC higher than expected`);
    } else {
      validationNotes.push(`Prize pool is ${Math.abs(discrepancy)} USDC lower than expected`);
    }
  }
  
  // Check if participants exceed max participants
  if (challenge.participants > challenge.maxParticipants) {
    validationNotes.push(`Participants (${challenge.participants}) exceed max participants (${challenge.maxParticipants})`);
  }
  
  // Check for edge cases
  if (challenge.participants === 0) {
    validationNotes.push('No participants joined yet');
  }
  
  if (challenge.stake <= 0) {
    validationNotes.push('Invalid stake amount (must be positive)');
  }

  return {
    challengeId: challenge.id,
    challengeName: challenge.name,
    stake: challenge.stake,
    participants: challenge.participants,
    maxParticipants: challenge.maxParticipants,
    currentPrizePool: challenge.prizePool,
    expectedPrizePool,
    isValid,
    discrepancy,
    validationNotes
  };
}

/**
 * Analyze prize pool calculations for all challenges
 */
export function analyzeAllPools(challenges: Challenge[]): PoolAnalysis {
  const results = challenges.map(validateChallengePool);
  
  const validChallenges = results.filter(r => r.isValid).length;
  const invalidChallenges = results.length - validChallenges;
  
  const totalStakeAmount = challenges.reduce((sum, c) => sum + (c.stake * c.participants), 0);
  const totalPrizePoolAmount = challenges.reduce((sum, c) => sum + c.prizePool, 0);
  
  const averageStake = challenges.reduce((sum, c) => sum + c.stake, 0) / challenges.length;
  const averageParticipants = challenges.reduce((sum, c) => sum + c.participants, 0) / challenges.length;
  
  const summary: string[] = [
    `Analyzed ${challenges.length} challenges`,
    `${validChallenges} challenges have correct prize pool calculations`,
    `${invalidChallenges} challenges have incorrect prize pool calculations`,
    `Total stake amount across all participants: ${totalStakeAmount} USDC`,
    `Total prize pool amount: ${totalPrizePoolAmount} USDC`,
    `Discrepancy: ${totalPrizePoolAmount - totalStakeAmount} USDC`,
    `Average stake per challenge: ${averageStake.toFixed(2)} USDC`,
    `Average participants per challenge: ${averageParticipants.toFixed(1)}`
  ];
  
  return {
    totalChallenges: challenges.length,
    validChallenges,
    invalidChallenges,
    totalStakeAmount,
    totalPrizePoolAmount,
    averageStake,
    averageParticipants,
    results,
    summary
  };
}

/**
 * Calculate expected prize pool based on stake and participants
 */
export function calculateExpectedPrizePool(stake: number, participants: number): number {
  return stake * participants;
}

/**
 * Format validation results for console output
 */
export function formatValidationReport(analysis: PoolAnalysis): string {
  let report = '\n=== USDC PRIZE POOL VALIDATION REPORT ===\n\n';
  
  // Summary
  report += 'SUMMARY:\n';
  analysis.summary.forEach(line => {
    report += `  ${line}\n`;
  });
  
  // Invalid challenges details
  const invalidChallenges = analysis.results.filter(r => !r.isValid);
  if (invalidChallenges.length > 0) {
    report += '\nINCORRECT CALCULATIONS:\n';
    invalidChallenges.forEach(result => {
      report += `\n  ${result.challengeName} (${result.challengeId}):\n`;
      report += `    Stake: ${result.stake} USDC × ${result.participants} participants\n`;
      report += `    Expected: ${result.expectedPrizePool} USDC\n`;
      report += `    Actual: ${result.currentPrizePool} USDC\n`;
      report += `    Discrepancy: ${result.discrepancy > 0 ? '+' : ''}${result.discrepancy} USDC\n`;
      result.validationNotes.forEach(note => {
        report += `    ⚠️  ${note}\n`;
      });
    });
  }
  
  // Valid challenges (brief)
  const validChallenges = analysis.results.filter(r => r.isValid);
  if (validChallenges.length > 0) {
    report += '\nCORRECT CALCULATIONS:\n';
    validChallenges.forEach(result => {
      report += `  ✅ ${result.challengeName}: ${result.stake} × ${result.participants} = ${result.currentPrizePool} USDC\n`;
    });
  }
  
  report += '\n=== END REPORT ===\n';
  return report;
}
