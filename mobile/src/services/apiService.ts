import { Challenge, Participant } from '../../constants/types';
import { challenges } from '../../constants';

/**
 * API Service Layer
 * 
 * This service abstracts data access for challenges and participants.
 * Currently uses mock data, but can be easily swapped with real API calls.
 */

export class ApiService {
  // Challenge-related methods
  static async getChallenges(): Promise<Challenge[]> {
    // TODO: Replace with actual API call
    // return await fetch('/api/challenges').then(res => res.json());
    return Promise.resolve(challenges);
  }

  static async getChallengeById(id: string): Promise<Challenge | undefined> {
    // TODO: Replace with actual API call
    // return await fetch(`/api/challenges/${id}`).then(res => res.json());
    return Promise.resolve(challenges.find(c => c.id === id));
  }

  // Participant-related methods
  static async getParticipants(challengeId: string): Promise<Participant[]> {
    // TODO: Replace with actual API call
    // return await fetch(`/api/challenges/${challengeId}/participants`).then(res => res.json());
    const challenge = challenges.find(c => c.id === challengeId);
    return Promise.resolve(challenge?.participantsList || []);
  }

  static async getChallengeCreator(challengeId: string): Promise<{ name: string; avatar: any; time: string } | null> {
    // TODO: Replace with actual API call
    // return await fetch(`/api/challenges/${challengeId}/creator`).then(res => res.json());
    const challenge = challenges.find(c => c.id === challengeId);
    return Promise.resolve(challenge?.creator || null);
  }

  // Future API methods (commented out for now)
  /*
  static async joinChallenge(challengeId: string, userId: string): Promise<boolean> {
    return await fetch(`/api/challenges/${challengeId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).then(res => res.ok);
  }

  static async submitRunResult(challengeId: string, userId: string, result: any): Promise<boolean> {
    return await fetch(`/api/challenges/${challengeId}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, result })
    }).then(res => res.ok);
  }

  static async getChallengeLeaderboard(challengeId: string): Promise<any[]> {
    return await fetch(`/api/challenges/${challengeId}/leaderboard`)
      .then(res => res.json());
  }
  */
}
