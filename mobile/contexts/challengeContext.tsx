import { createContext, useContext, ReactNode, useState } from "react";
import { timeManager } from "../helpers/timeManager";
import { ApiService } from "../services/apiService";
import {
  UserChallengeStatus,
  ChallengeRunData,
  ChallengeService,
} from "../services/challengeService";
import { useAuth } from "./authContext";

interface ChallengeContextType {
  userChallengeStatuses: UserChallengeStatus[];
  joinChallenge: (challengeId: string) => void;
  startChallengeRun: (challengeId: string) => void;
  completeChallengeRun: (
    challengeId: string,
    runData: ChallengeRunData,
  ) => void;
  getChallengeStatus: (challengeId: string) => UserChallengeStatus;
  resetChallenge: (challengeId: string) => void;
  resetAllChallenges: () => void;
  getUserStats: () => Promise<{
    totalWins: number;
    totalEarnings: number;
    totalDistance: number;
    winRate: number;
  }>;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(
  undefined,
);

export const useChallenge = () => {
  const context = useContext(ChallengeContext);
  if (context === undefined) {
    throw new Error("useChallenge must be used within a ChallengeProvider");
  }
  return context;
};

export const ChallengeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [userChallengeStatuses, setUserChallengeStatuses] = useState<
    UserChallengeStatus[]
  >([]);

  const joinChallenge = (challengeId: string) => {
    setUserChallengeStatuses((prev) => {
      const existingIndex = prev.findIndex(
        (status) => status.challengeId === challengeId,
      );
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
    setUserChallengeStatuses((prev) => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(
        (status) => status.challengeId === challengeId,
      );

      if (existingIndex >= 0) {
        updated[existingIndex] = ChallengeService.startChallengeRun(
          updated[existingIndex],
        );
      }

      return updated;
    });
  };

  const completeChallengeRun = (
    challengeId: string,
    runData: ChallengeRunData,
  ) => {
    setUserChallengeStatuses((prev) => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(
        (status) => status.challengeId === challengeId,
      );

      if (existingIndex >= 0) {
        updated[existingIndex] = ChallengeService.completeChallengeRun(
          updated[existingIndex],
          runData,
        );
      } else {
        // If somehow not in list, add as completed
        const initialStatus = ChallengeService.createInitialStatus(challengeId);
        const completedStatus = ChallengeService.completeChallengeRun(
          initialStatus,
          runData,
        );
        updated.push(completedStatus);
      }

      return updated;
    });
  };

  const getChallengeStatus = (challengeId: string): UserChallengeStatus => {
    const existingStatus = userChallengeStatuses.find(
      (status) => status.challengeId === challengeId,
    );
    return existingStatus || ChallengeService.createInitialStatus(challengeId);
  };

  const resetChallenge = (challengeId: string) => {
    setUserChallengeStatuses((prev) => {
      return prev.filter((status) => status.challengeId !== challengeId);
    });
  };

  const resetAllChallenges = () => {
    setUserChallengeStatuses([]);
    // Reset time back to real time when resetting all challenges
    timeManager.resetToRealTime();
  };


  const getUserStats = async () => {
    const challenges = await ApiService.getChallenges();
    // Include both winner and cashOut statuses as wins
    const wonChallenges = userChallengeStatuses.filter(
      (status) => status.status === "winner" || status.status === "cashOut",
    );
    const completedChallenges = userChallengeStatuses.filter(
      (status) =>
        status.status === "completed" ||
        status.status === "winner" ||
        status.status === "cashOut",
    );

    const totalWins = wonChallenges.length;
    const totalEarnings = wonChallenges.reduce(
      (sum, status) => sum + (status.winnerRewards || 0),
      0,
    );

    let totalDistance = 0;
    wonChallenges.forEach((status) => {
      const challenge = challenges.find(
        (c: any) => c.id === status.challengeId,
      );
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
      winRate: Math.round(winRate),
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
    getUserStats,
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
};

export default ChallengeProvider;
