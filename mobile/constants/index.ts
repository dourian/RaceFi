// Type definitions
export * from './types';

// Mock data
export { challenges, baseChallenges } from './mockChallenges';
export { mockParticipants } from './mockParticipants';
export { mockCreators } from './mockCreators';

// Time management
export { timeManager, getCurrentAppTime, useAppTime, TimeControls } from './timeManager';

// Default export for backwards compatibility
export { default } from './mockChallenges';
