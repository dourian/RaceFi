import { Router } from 'expo-router';

export interface NavigationRoutes {
  CHALLENGE_DETAIL: string;
  RECORD: string;
  HOME: string;
}

/**
 * Service for managing navigation logic and routing
 */
export class NavigationService {
  /**
   * Navigate to challenge detail page
   * @param router Expo router instance
   * @param challengeId The challenge ID
   */
  static navigateToChallengeDetail(router: Router, challengeId: string): void {
    router.push(`/challenge/${challengeId}`);
  }

  /**
   * Navigate to record page for a specific challenge
   * @param router Expo router instance
   * @param challengeId The challenge ID
   */
  static navigateToRecordChallenge(router: Router, challengeId: string): void {
    router.push({
      pathname: '/record',
      params: { id: challengeId }
    });
  }

  /**
   * Navigate to record page for a regular run
   * @param router Expo router instance
   */
  static navigateToRecord(router: Router): void {
    router.push('/record');
  }

  /**
   * Navigate back to the previous screen
   * @param router Expo router instance
   */
  static navigateBack(router: Router): void {
    router.back();
  }

  /**
   * Navigate to home screen
   * @param router Expo router instance
   */
  static navigateToHome(router: Router): void {
    router.push('/');
  }

  /**
   * Get the route path for challenge detail
   * @param challengeId The challenge ID
   * @returns Route path string
   */
  static getChallengeDetailRoute(challengeId: string): string {
    return `/challenge/${challengeId}`;
  }

  /**
   * Get the route path for challenge recording
   * @param challengeId The challenge ID
   * @returns Route object with pathname and params
   */
  static getChallengeRecordRoute(challengeId: string): { pathname: string; params: { id: string } } {
    return {
      pathname: '/record',
      params: { id: challengeId }
    };
  }

  /**
   * Extract challenge ID from route parameters
   * @param params Route parameters
   * @returns Challenge ID if present
   */
  static extractChallengeId(params: { id?: string }): string | null {
    return params.id || null;
  }

  /**
   * Check if current route is a challenge route
   * @param params Route parameters
   * @returns Whether this is a challenge-related route
   */
  static isChallengeRoute(params: { id?: string }): boolean {
    return !!params.id;
  }

  /**
   * Handle challenge completion navigation
   * @param router Expo router instance
   * @param challengeId The challenge ID
   * @param showAlert Whether to show success alert
   */
  static handleChallengeCompletion(
    router: Router, 
    challengeId: string, 
    showAlert: boolean = true
  ): void {
    if (showAlert) {
      // Note: In a real app, you might want to use a toast service instead of alert
      alert('Challenge run submitted successfully!');
    }
    
    this.navigateToChallengeDetail(router, challengeId);
  }

  /**
   * Handle regular run completion
   * @param router Expo router instance
   * @param showAlert Whether to show success alert
   */
  static handleRegularRunCompletion(
    router: Router,
    showAlert: boolean = true
  ): void {
    if (showAlert) {
      alert('Run submitted successfully!');
    }
    // For regular runs, we might stay on the same page or navigate elsewhere
    // This is where you'd implement the regular run completion flow
  }
}
