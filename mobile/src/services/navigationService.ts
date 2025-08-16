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
      pathname: '/recordRun',
      params: { id: challengeId }
    });
  }

  /**
   * Navigate to record page for a regular run
   * @param router Expo router instance
   */
  static navigateToRecord(router: Router): void {
    router.push('/recordRun');
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
      pathname: '/recordRun ',
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
   * Navigate to completion page with run data
   * @param router Expo router instance
   * @param duration Run duration in seconds
   * @param distance Run distance in meters
   * @param pace Run pace string
   * @param isChallenge Whether this is a challenge run
   */
  static navigateToCompletion(
    router: Router,
    duration: number,
    distance: number,
    pace: string,
    isChallenge: boolean = false
  ): void {
    // Navigate to completion page - we'll handle back button via headerBackVisible: false
    router.push({
      pathname: '/completion',
      params: {
        duration: duration.toString(),
        distance: distance.toString(),
        pace: pace,
        isChallenge: isChallenge.toString()
      }
    });
  }

  /**
   * Navigate directly to home and reset navigation stack
   * @param router Expo router instance
   */
  static navigateToHomeAndReset(router: Router): void {
    router.dismissAll();
    router.replace('/(tabs)');
  }

  /**
   * Handle challenge completion navigation
   * @param router Expo router instance
   * @param challengeId The challenge ID
   * @param duration Run duration in seconds
   * @param distance Run distance in meters
   * @param pace Run pace string
   */
  static handleChallengeCompletion(
    router: Router, 
    challengeId: string,
    duration: number,
    distance: number,
    pace: string
  ): void {
    this.navigateToCompletion(router, duration, distance, pace, true);
  }

  /**
   * Handle regular run completion
   * @param router Expo router instance
   * @param duration Run duration in seconds
   * @param distance Run distance in meters
   * @param pace Run pace string
   */
  static handleRegularRunCompletion(
    router: Router,
    duration: number,
    distance: number,
    pace: string
  ): void {
    this.navigateToCompletion(router, duration, distance, pace, false);
  }
}
