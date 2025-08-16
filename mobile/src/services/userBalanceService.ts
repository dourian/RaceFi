import { timeManager } from '../../constants/timeManager';

export interface BalanceTransaction {
  id: string;
  type: 'win' | 'cashout';
  amount: number; // USDC amount
  challengeId?: string; // For wins
  challengeName?: string; // For display
  timestamp: Date;
  description: string;
}

export interface UserBalance {
  totalBalance: number; // Total USDC available for cashout
  totalEarned: number; // Total USDC ever earned
  totalCashedOut: number; // Total USDC cashed out
  transactions: BalanceTransaction[];
  lastCashoutAt?: Date;
}

/**
 * Service for managing user balance and winnings aggregation
 */
export class UserBalanceService {
  private static readonly STORAGE_KEY = 'userBalance';
  private static currentBalance: UserBalance = {
    totalBalance: 0,
    totalEarned: 0,
    totalCashedOut: 0,
    transactions: [],
  };

  /**
   * Get the current user balance state
   */
  static getBalance(): UserBalance {
    return { ...this.currentBalance };
  }

  /**
   * Add winnings to user balance from a challenge win
   */
  static addWinnings(
    challengeId: string,
    challengeName: string,
    amount: number
  ): UserBalance {
    const currentBalance = this.getBalance();
    
    const transaction: BalanceTransaction = {
      id: `win_${challengeId}_${Date.now()}`,
      type: 'win',
      amount,
      challengeId,
      challengeName,
      timestamp: new Date(),
      description: `Won ${challengeName} challenge`,
    };

    const updatedBalance: UserBalance = {
      totalBalance: currentBalance.totalBalance + amount,
      totalEarned: currentBalance.totalEarned + amount,
      totalCashedOut: currentBalance.totalCashedOut,
      transactions: [...currentBalance.transactions, transaction],
      lastCashoutAt: currentBalance.lastCashoutAt,
    };

    // Update internal state
    this.currentBalance = updatedBalance;
    // In a real app, this would be persisted to secure storage/backend
    return updatedBalance;
  }

  /**
   * Cash out the entire balance
   */
  static cashOutBalance(amount?: number): UserBalance {
    const currentBalance = this.getBalance();
    const cashoutAmount = amount || currentBalance.totalBalance;

    if (cashoutAmount > currentBalance.totalBalance) {
      throw new Error('Insufficient balance for cashout');
    }

    if (cashoutAmount <= 0) {
      throw new Error('No balance to cash out');
    }

    const transaction: BalanceTransaction = {
      id: `cashout_${Date.now()}`,
      type: 'cashout',
      amount: cashoutAmount,
      timestamp: new Date(),
      description: `Cashed out ${cashoutAmount} USDC to wallet`,
    };

    const updatedBalance: UserBalance = {
      totalBalance: currentBalance.totalBalance - cashoutAmount,
      totalEarned: currentBalance.totalEarned,
      totalCashedOut: currentBalance.totalCashedOut + cashoutAmount,
      transactions: [...currentBalance.transactions, transaction],
      lastCashoutAt: new Date(),
    };

    // Update internal state
    this.currentBalance = updatedBalance;
    // In a real app, this would trigger actual payout and be persisted
    return updatedBalance;
  }

  /**
   * Get recent transactions (last 10 by default)
   */
  static getRecentTransactions(limit: number = 10): BalanceTransaction[] {
    const balance = this.getBalance();
    return balance.transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get transactions for a specific challenge
   */
  static getChallengeTransactions(challengeId: string): BalanceTransaction[] {
    const balance = this.getBalance();
    return balance.transactions.filter(t => t.challengeId === challengeId);
  }

  /**
   * Check if user has any balance to cash out
   */
  static hasBalance(): boolean {
    const balance = this.getBalance();
    return balance.totalBalance > 0;
  }

  /**
   * Format balance amount for display
   */
  static formatAmount(amount: number): string {
    return `${amount.toFixed(2)} USDC`;
  }

  /**
   * Reset all balance data (for testing)
   */
  static resetBalance(): UserBalance {
    const emptyBalance: UserBalance = {
      totalBalance: 0,
      totalEarned: 0,
      totalCashedOut: 0,
      transactions: [],
    };

    // Update internal state
    this.currentBalance = emptyBalance;
    // In a real app, this would clear from storage
    return emptyBalance;
  }

  /**
   * Get balance stats for display
   */
  static getBalanceStats(): {
    availableBalance: string;
    totalEarned: string;
    totalCashedOut: string;
    totalWins: number;
  } {
    const balance = this.getBalance();
    const wins = balance.transactions.filter(t => t.type === 'win');

    return {
      availableBalance: this.formatAmount(balance.totalBalance),
      totalEarned: this.formatAmount(balance.totalEarned),
      totalCashedOut: this.formatAmount(balance.totalCashedOut),
      totalWins: wins.length,
    };
  }
}
