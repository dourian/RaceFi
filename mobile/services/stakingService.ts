import { supabase } from '../lib/supabase';

export interface StakeTransaction {
  challengeId: number;
  profileId: number;
  amount: number;
  walletAddress: string;
}

export interface PayoutTransaction {
  winnerAddress: string;
  amount: number;
  challengeId: number;
}

class StakingService {
  /**
   * Stake money for a challenge
   */
  async stakeForChallenge(transaction: StakeTransaction): Promise<string> {
    try {
      // In a real implementation, this would interact with a smart contract
      // For now, we'll simulate the transaction
      const transactionHash = this.generateMockTransactionHash();
      
      // Record the stake in the database
      const { data, error } = await supabase
        .from('challenge_attendees')
        .insert({
          challenge_id: transaction.challengeId,
          profile_id: transaction.profileId,
          stake_amount: transaction.amount,
          stake_transaction_hash: transactionHash,
          status: 'joined'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to record stake: ${error.message}`);
      }

      return transactionHash;
    } catch (error) {
      console.error('Staking error:', error);
      throw error;
    }
  }

  /**
   * Get total staked amount for a challenge
   */
  async getTotalStakedAmount(challengeId: number): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('challenge_attendees')
        .select('stake_amount')
        .eq('challenge_id', challengeId)
        .not('stake_transaction_hash', 'is', null);

      if (error) {
        throw error;
      }

      return data.reduce((total, attendee) => total + attendee.stake_amount, 0);
    } catch (error) {
      console.error('Error getting total staked amount:', error);
      throw error;
    }
  }

  /**
   * Get user's stake for a specific challenge
   */
  async getUserStake(challengeId: number, profileId: number): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('challenge_attendees')
        .select('stake_amount')
        .eq('challenge_id', challengeId)
        .eq('profile_id', profileId)
        .not('stake_transaction_hash', 'is', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return 0; // No stake found
        }
        throw error;
      }

      return data.stake_amount;
    } catch (error) {
      console.error('Error getting user stake:', error);
      return 0;
    }
  }

  /**
   * Payout winnings to the winner
   */
  async payoutWinner(transaction: PayoutTransaction): Promise<string> {
    try {
      // In a real implementation, this would transfer funds from the contract to the winner
      // For now, we'll simulate the transaction
      const transactionHash = this.generateMockTransactionHash();
      
      // Update the challenge to mark it as completed and record the payout
      const { error } = await supabase
        .from('challenges')
        .update({ 
          is_active: false,
          // You might want to add a payout_transaction_hash field to the challenges table
        })
        .eq('id', transaction.challengeId);

      if (error) {
        throw new Error(`Failed to update challenge: ${error.message}`);
      }

      return transactionHash;
    } catch (error) {
      console.error('Payout error:', error);
      throw error;
    }
  }

  /**
   * Check if user has already staked for a challenge
   */
  async hasUserStaked(challengeId: number, profileId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('challenge_attendees')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('profile_id', profileId)
        .not('stake_transaction_hash', 'is', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // No stake found
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking user stake:', error);
      return false;
    }
  }

  /**
   * Get challenge participants with their stakes
   */
  async getChallengeParticipants(challengeId: number) {
    try {
      const { data, error } = await supabase
        .from('challenge_attendees')
        .select(`
          id,
          stake_amount,
          status,
          completion_time,
          profiles (
            id,
            first_name,
            last_name,
            avatar_url,
            wallet_address
          )
        `)
        .eq('challenge_id', challengeId)
        .not('stake_transaction_hash', 'is', null);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting challenge participants:', error);
      throw error;
    }
  }

  private generateMockTransactionHash(): string {
    return '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}

export const stakingService = new StakingService();
