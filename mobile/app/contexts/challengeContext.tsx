import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '../lib/auth-context';
import { 
  ChallengeService, 
  UserChallengeStatus, 
  ChallengeRunData 
} from '../services/challengeService';

interface ChallengeContextType {
  userChallengeStatuses: UserChallengeStatus[];
  joinChallenge: (challengeId: string) => void;
  startChallengeRun: (challengeId: string) => void;
  completeChallengeRun: (challengeId: string, runData: ChallengeRunData) => void;
  getChallengeStatus: (challengeId: string) => UserChallengeStatus;
  resetChallenge: (challengeId: string) => void;
  resetAllChallenges: () => void;
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
  };

  const value: ChallengeContextType = {
    userChallengeStatuses,
    joinChallenge,
    startChallengeRun,
    completeChallengeRun,
    getChallengeStatus,
    resetChallenge,
    resetAllChallenges,
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
};

export default ChallengeProvider;
