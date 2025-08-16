import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '../lib/auth-context';
import { 
  ChallengeService, 
  UserChallengeStatus, 
  ChallengeRunData 
} from '../../src/services/challengeService';
import { timeManager } from '../../constants/timeManager';

interface ChallengeContextType {
  userChallengeStatuses: UserChallengeStatus[];
  joinChallenge: (challengeId: string) => void;
  startChallengeRun: (challengeId: string) => void;
  completeChallengeRun: (challengeId: string, runData: ChallengeRunData) => void;
  getChallengeStatus: (challengeId: string) => UserChallengeStatus;
  resetChallenge: (challengeId: string) => void;
  resetAllChallenges: () => void;
  simulateCompletedChallengesWithResults: () => void;
  cashOutWinnings: (challengeId: string) => void;
  getUserStats: () => {
    totalWins: number;
    totalEarnings: number;
    totalDistance: number;
    winRate: number;
  };
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export const useChallenge = () => {
  const context = useContext(ChallengeContext);
  if (context === undefined) {
    throw new Error('useChallenge must be used within a ChallengeProvider');
  }
  return context;
};

export const ChallengeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isGuest } = useAuth();
  const [userChallengeStatuses, setUserChallengeStatuses] = useState<UserChallengeStatus[]>([]);

  const joinChallenge = (challengeId: string) => {
    setUserChallengeStatuses(prev => {
      const existingIndex = prev.findIndex(status => status.challengeId === challengeId);
      const newStatus = ChallengeService.joinChallenge(challengeId);

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newStatus;
        return updated;
      }
      
      return [...prev, newStatus];
    });
  };

  const startChallengeRun = (challengeId: string) => {
    setUserChallengeStatuses(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(status => status.challengeId === challengeId);
      
      if (existingIndex >= 0) {
        updated[existingIndex] = ChallengeService.startChallengeRun(updated[existingIndex]);
      }
      
      return updated;
    });
  };

  const completeChallengeRun = (challengeId: string, runData: ChallengeRunData) => {
    setUserChallengeStatuses(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(status => status.challengeId === challengeId);
      
      if (existingIndex >= 0) {
        updated[existingIndex] = ChallengeService.completeChallengeRun(
          updated[existingIndex], 
          runData
        );
      } else {
        // If somehow not in list, add as completed
        const initialStatus = ChallengeService.createInitialStatus(challengeId);
        const completedStatus = ChallengeService.completeChallengeRun(initialStatus, runData);
        updated.push(completedStatus);
      }
      
      return updated;
    });
  };

  const getChallengeStatus = (challengeId: string): UserChallengeStatus => {
    const existingStatus = userChallengeStatuses.find(status => status.challengeId === challengeId);
    return existingStatus || ChallengeService.createInitialStatus(challengeId);
  };

  const resetChallenge = (challengeId: string) => {
    setUserChallengeStatuses(prev => {
      return prev.filter(status => status.challengeId !== challengeId);
    });
  };

  const resetAllChallenges = () => {
    setUserChallengeStatuses([]);
    // Reset time back to real time when resetting all challenges
    timeManager.resetToRealTime();
  };

  const simulateCompletedChallengesWithResults = () => {
    // Import challenge data to get prize pools
    const { challenges } = require('../lib/mock');
    
    // Advance time to simulate that races have been completed
    // This makes it realistic that multiple races have finished
    // Advance by 10-15 days to ensure challenges are expired for winner determination
    const daysToAdvance = 10 + Math.floor(Math.random() * 6); // 10-15 days
    timeManager.advanceTimeByDays(daysToAdvance);
    
    const simulatedStatuses: UserChallengeStatus[] = [];
    
    challenges.forEach((challenge: any, index: number) => {
      // Create varied scenarios for different challenges
      let shouldSimulate = true;
      let isWinner = false;
      let shouldCashOut = false;
      
      switch (index) {
        case 0: // First challenge - winner that can be cashed out
          isWinner = true;
          break;
        case 1: // Second challenge - winner that's already cashed out
          isWinner = true;
          shouldCashOut = true;
          break;
        case 2: // Third challenge - completed but didn't win
          isWinner = false;
          break;
        case 3: // Fourth challenge - winner (can cash out)
          isWinner = true;
          break;
        case 4: // Fifth challenge - completed but didn't win
          isWinner = false;
          break;
        default:
          // For remaining challenges, some won't be simulated (not joined yet)
          shouldSimulate = index < 6; // Only simulate first 6 challenges
          isWinner = Math.random() > 0.7; // 30% chance of winning
          break;
      }
      
      if (shouldSimulate) {
        // Create mock run data
        const mockRunData = ChallengeService.createMockRunData(challenge.id, isWinner);
        
        // Create completed status
        const joinedStatus = ChallengeService.joinChallenge(challenge.id);
        const completedStatus = ChallengeService.completeChallengeRun(joinedStatus, mockRunData);
        
        // If this should be a winner, simulate winning
        if (isWinner) {
          try {
            // CRITICAL: Winner can only be determined if the race is expired
            // This is why we advance time by 10-15 days above to ensure challenges are expired
            const winnerStatus = ChallengeService.simulateWinner(completedStatus, challenge.prizePool, challenge);
            
            // If should cash out, do that too
            if (shouldCashOut) {
              const cashedOutStatus = ChallengeService.cashOut(winnerStatus);
              simulatedStatuses.push(cashedOutStatus);
            } else {
              simulatedStatuses.push(winnerStatus);
            }
          } catch (error) {
            // If race is not expired, just keep as completed
            console.warn(`Cannot determine winner for ${challenge.id}: ${error}`);
            simulatedStatuses.push(completedStatus);
          }
        } else {
          simulatedStatuses.push(completedStatus);
        }
      }
    });
    
    setUserChallengeStatuses(simulatedStatuses);
  };

  const cashOutWinnings = (challengeId: string) => {
    setUserChallengeStatuses(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(status => status.challengeId === challengeId);
      
      if (existingIndex >= 0) {
        updated[existingIndex] = ChallengeService.cashOut(updated[existingIndex]);
      }
      
      return updated;
    });
  };

  const getUserStats = () => {
    const { challenges } = require('../lib/mock');
    // Include both winner and cashOut statuses as wins
    const wonChallenges = userChallengeStatuses.filter(
      status => status.status === 'winner' || status.status === 'cashOut'
    );
    const completedChallenges = userChallengeStatuses.filter(
      status => status.status === 'completed' || status.status === 'winner' || status.status === 'cashOut'
    );
    
    const totalWins = wonChallenges.length;
    const totalEarnings = wonChallenges.reduce((sum, status) => sum + (status.winnerRewards || 0), 0);
    
    let totalDistance = 0;
    wonChallenges.forEach(status => {
      const challenge = challenges.find((c: any) => c.id === status.challengeId);
      if (challenge) {
        totalDistance += challenge.distanceKm;
      }
    });
    
    const totalJoined = userChallengeStatuses.length;
    const winRate = totalJoined > 0 ? (totalWins / totalJoined) * 100 : 0;
    
    return {
      totalWins,
      totalEarnings,
      totalDistance,
      winRate: Math.round(winRate)
    };
  };

  const value: ChallengeContextType = {
    userChallengeStatuses,
    joinChallenge,
    startChallengeRun,
    completeChallengeRun,
    getChallengeStatus,
    resetChallenge,
    resetAllChallenges,
    simulateCompletedChallengesWithResults,
    cashOutWinnings,
    getUserStats,
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
};

export default ChallengeProvider;
