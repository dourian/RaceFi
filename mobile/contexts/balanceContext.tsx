import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import {
  BalanceTransaction,
  UserBalance,
  UserBalanceService,
} from "../services/userBalanceService";

interface BalanceContextType {
  balance: UserBalance;
  addWinnings: (
    challengeId: string,
    challengeName: string,
    amount: number,
  ) => void;
  cashOutBalance: (amount?: number) => void;
  getRecentTransactions: (limit?: number) => BalanceTransaction[];
  hasBalance: () => boolean;
  resetBalance: () => void;
  refreshBalance: () => void;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error("useBalance must be used within a BalanceProvider");
  }
  return context;
};

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [balance, setBalance] = useState<UserBalance>(
    UserBalanceService.getBalance(),
  );

  // Load balance on mount and set up periodic refresh
  useEffect(() => {
    refreshBalance();
    // Refresh balance every second to catch external updates
    const interval = setInterval(refreshBalance, 1000);
    return () => clearInterval(interval);
  }, []);

  const addWinnings = (
    challengeId: string,
    challengeName: string,
    amount: number,
  ) => {
    const updatedBalance = UserBalanceService.addWinnings(
      challengeId,
      challengeName,
      amount,
    );
    setBalance(updatedBalance);
  };

  const cashOutBalance = (amount?: number) => {
    const updatedBalance = UserBalanceService.cashOutBalance(amount);
    setBalance(updatedBalance);
  };

  const getRecentTransactions = (limit?: number) => {
    const currentBalance = UserBalanceService.getBalance();
    return currentBalance.transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit || 10);
  };

  const hasBalance = () => {
    const currentBalance = UserBalanceService.getBalance();
    return currentBalance.totalBalance > 0;
  };

  const resetBalance = () => {
    const resetBalance = UserBalanceService.resetBalance();
    setBalance(resetBalance);
  };

  const refreshBalance = () => {
    const currentBalance = UserBalanceService.getBalance();
    setBalance(currentBalance);
  };

  const value: BalanceContextType = {
    balance,
    addWinnings,
    cashOutBalance,
    getRecentTransactions,
    hasBalance,
    resetBalance,
    refreshBalance,
  };

  return (
    <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
  );
};

export default BalanceProvider;
