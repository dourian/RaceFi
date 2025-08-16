import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '../lib/auth-context';
import { 
  ChallengeService, 
  UserChallengeStatus, 
  ChallengeRunData 
} from '../../src/services/challengeService';
import { ApiService } from '../../src/services/apiService';
import { timeManager } from '../../constants/timeManager';
import { UserBalanceService } from '../../src/services/userBalanceService';

interface ChallengeContextType {
  userChallengeStatuses: UserChallengeStatus[];
  joinChallenge: (challengeId: string) => void;
  startChallengeRun: (challengeId: string) => void;
  completeChallengeRun: (challengeId: string, runData: ChallengeRunData) => void;
  getChallengeStatus: (challengeId: string) => UserChallengeStatus;
  resetChallenge: (challengeId: string) => void;
  resetAllChallenges: () => void;
  simulateCompletedChallengesWithResults: () => void;
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

  const simulateCompletedChallengesWithResults = async () => {
    // Get challenge data from API to get prize pools
    const challenges = await ApiService.getChallenges();
    
    // Advance time to expire some challenges while keeping others active
    // Looking at challenge dates: some end at 5-8 days, others at 12-19 days
    const daysToAdvance = 8 + Math.floor(Math.random() * 4); // 8-11 days
    timeManager.advanceTimeByDays(daysToAdvance);
    
    const simulatedStatuses: UserChallengeStatus[] = [];
    
    challenges.forEach((challenge: any, index: number) => {
      let shouldSimulate = true;
      let simulationType: 'joined' | 'completed' | 'winner' = 'joined';
      
      switch (index) {
        case 0: // First challenge - completed and won (if expired)
          simulationType = 'winner';
          break;
        case 1: // Second challenge - completed and won (if expired) 
          simulationType = 'winner';
          break;
        case 2: // Third challenge - completed but didn't win
          simulationType = 'completed';
          break;
        case 3: // Fourth challenge - just joined
          simulationType = 'joined';
          break;
        case 4: // Fifth challenge - completed but waiting for results
          simulationType = 'completed';
          break;
        case 5: // Sixth challenge - just joined
          simulationType = 'joined';
          break;
        default:
          // For remaining challenges, don't simulate (not joined)
          shouldSimulate = false;
          break;
      }
      
      if (shouldSimulate) {
        if (simulationType === 'joined') {
          // Just joined, no run data yet
          const joinedStatus = ChallengeService.joinChallenge(challenge.id);
          simulatedStatuses.push(joinedStatus);
        } else {
          // Has completed a run
          const isWinningRun = simulationType === 'winner';
          const mockRunData = ChallengeService.createMockRunData(challenge.id, isWinningRun);
          
          const joinedStatus = ChallengeService.joinChallenge(challenge.id);
          const completedStatus = ChallengeService.completeChallengeRun(joinedStatus, mockRunData);
          
          if (simulationType === 'winner') {
            try {
              // Try to determine winner - will only work if challenge is expired
              const winnerStatus = ChallengeService.simulateWinner(completedStatus, challenge.prizePool, challenge);
              simulatedStatuses.push(winnerStatus);
            } catch (error) {
              // Challenge not expired yet, keep as completed
              simulatedStatuses.push(completedStatus);
            }
          } else {
            // Just completed, no winner determination yet
            simulatedStatuses.push(completedStatus);
          }
        }
      }
    });
    
    setUserChallengeStatuses(simulatedStatuses);
  };


  const getUserStats = async () => {
    const challenges = await ApiService.getChallenges();
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
    getUserStats,
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
};

export default ChallengeProvider;
