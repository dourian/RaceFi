import { supabase } from '../lib/supabase';
import { stakingService } from './stakingService';

export interface ChallengeWinner {
  profileId: number;
  walletAddress: string;
  completionTime: string;
  firstName: string;
  lastName: string;
}

class PayoutService {
  /**
   * Determine the winner of a challenge and process payout
   */
  async processChallengeWinner(challengeId: number): Promise<string | null> {
    try {
      // Get all completed participants
      const participants = await stakingService.getChallengeParticipants(challengeId);
      const completedParticipants = participants.filter(p => 
        p.status === 'completed' && p.completion_time
      );

      if (completedParticipants.length === 0) {
        throw new Error('No participants completed the challenge');
      }

      // Find the winner (fastest completion time)
      const winner = completedParticipants.reduce((fastest, current) => {
        if (!fastest.completion_time || !current.completion_time) return fastest;
        return new Date(current.completion_time) < new Date(fastest.completion_time) 
          ? current : fastest;
      });

      if (!winner.profiles?.wallet_address) {
        throw new Error('Winner does not have a connected wallet');
      }

      // Calculate total prize pool
      const totalStaked = await stakingService.getTotalStakedAmount(challengeId);

      // Process payout
      const transactionHash = await stakingService.payoutWinner({
        winnerAddress: winner.profiles.wallet_address,
        amount: totalStaked,
        challengeId,
      });

      // Update winner's record
      await supabase
        .from('challenge_attendees')
        .update({ 
          status: 'completed',
          // You might want to add a payout_received field
        })
        .eq('id', winner.id);

      return transactionHash;
    } catch (error) {
      console.error('Payout processing error:', error);
      throw error;
    }
  }

  /**
   * Get challenge winner information
   */
  async getChallengeWinner(challengeId: number): Promise<ChallengeWinner | null> {
    try {
      const participants = await stakingService.getChallengeParticipants(challengeId);
      const completedParticipants = participants.filter(p => 
        p.status === 'completed' && p.completion_time
      );

      if (completedParticipants.length === 0) {
        return null;
      }

      const winner = completedParticipants.reduce((fastest, current) => {
        if (!fastest.completion_time || !current.completion_time) return fastest;
        return new Date(current.completion_time) < new Date(fastest.completion_time) 
          ? current : fastest;
      });

      if (!winner.profiles) {
        return null;
      }

      return {
        profileId: winner.profiles.id,
        walletAddress: winner.profiles.wallet_address || '',
        completionTime: winner.completion_time || '',
        firstName: winner.profiles.first_name || '',
        lastName: winner.profiles.last_name || '',
      };
    } catch (error) {
      console.error('Error getting challenge winner:', error);
      return null;
    }
  }

  /**
   * Check if a challenge is ready for payout (ended and has completed participants)
   */
  async isChallengeReadyForPayout(challengeId: number): Promise<boolean> {
    try {
      // Check if challenge has ended
      const { data: challenge, error } = await supabase
        .from('challenges')
        .select('end_date, is_active')
        .eq('id', challengeId)
        .single();

      if (error || !challenge) {
        return false;
      }

      const now = new Date();
      const endDate = new Date(challenge.end_date);
      
      if (now < endDate || !challenge.is_active) {
        return false;
      }

      // Check if there are completed participants
      const participants = await stakingService.getChallengeParticipants(challengeId);
      const completedParticipants = participants.filter(p => p.status === 'completed');

      return completedParticipants.length > 0;
    } catch (error) {
      console.error('Error checking payout readiness:', error);
      return false;
    }
  }

  /**
   * Get payout history for a user
   */
  async getUserPayoutHistory(profileId: number) {
    try {
      const { data, error } = await supabase
        .from('challenge_attendees')
        .select(`
          id,
          stake_amount,
          completion_time,
          challenges (
            id,
            name,
            end_date
          )
        `)
        .eq('profile_id', profileId)
        .eq('status', 'completed')
        .order('completion_time', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting payout history:', error);
      throw error;
    }
  }
}

export const payoutService = new PayoutService();
