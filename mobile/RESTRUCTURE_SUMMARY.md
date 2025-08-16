# Service and Helper Restructuring Summary

## Problem Solved
Fixed Expo Router warnings about missing default exports by moving service and helper files out of the `app` directory.

## Changes Made

### 1. Directory Structure Changes
- **Moved:** `app/services/` → `src/services/`
- **Moved:** `app/helpers/` → `src/helpers/`

### 2. Updated Import Paths
The following files were updated with new import paths:

#### Service Files Moved:
- `src/services/apiService.ts`
- `src/services/challengeService.ts` 
- `src/services/navigationService.ts`
- `src/services/runCalculationService.ts`

#### Helper Files Moved:
- `src/helpers/polyline.ts`

#### Files with Updated Imports:
- `app/contexts/challengeContext.tsx`
- `app/completion.tsx`
- `app/(tabs)/map_test.tsx` 
- `app/record.tsx`
- `app/challenge/[id].tsx`
- `components/StaticRoutePreview.tsx`

### 3. Enhanced ChallengeService
Added new functionality to the ChallengeService:

#### New Status Type:
- Added `'cashOut'` status to `UserChallengeStatus` type
- Added `cashedOutAt?: Date` property for tracking cash-out timestamps

#### New Methods:
- `ChallengeService.cashOut()` - Convert winner status to cashed out
- `ChallengeService.isCashedOut()` - Check if challenge has been cashed out
- Updated `getStatusCardTitle()` to handle cash-out status

#### Enhanced Context Methods:
- `cashOutWinnings(challengeId: string)` - Cash out winnings for a challenge
- Updated `getUserStats()` to include cashed-out challenges in calculations
- Enhanced `simulateCompletedChallengesWithResults()` with more varied mock data

### 4. Enhanced Mock Data
- Expanded `constants/mockChallenges.ts` with 8 total challenges (was 2)
- Added varied challenge types: different distances, difficulties, locations
- More realistic challenge scenarios for testing

### 5. Updated Documentation
- Updated `constants/MIGRATION_GUIDE.md` with new service paths

## Benefits

1. **Resolved Expo Router Warnings**: No more warnings about missing default exports
2. **Better Organization**: Services and helpers are now outside the routing directory
3. **Enhanced Challenge Flow**: Complete challenge lifecycle including cash-out functionality
4. **Richer Mock Data**: More diverse challenges for better testing
5. **Improved Statistics**: More comprehensive user stats calculation

## Challenge Lifecycle Now Supported

1. **Not Joined** → `joinChallenge()`
2. **Joined** → `startChallengeRun()`  
3. **In Progress** → `completeChallengeRun()`
4. **Completed** → `simulateWinner()` (if won)
5. **Winner** → `cashOutWinnings()` 
6. **Cashed Out** → Final state

## User Statistics Tracked

The `getUserStats()` method now calculates:
- **Total Wins**: Count of challenges with 'winner' or 'cashOut' status
- **Total Earnings**: Sum of winnerRewards from all won challenges  
- **Total Distance**: Sum of distances from won challenges only
- **Win Rate**: Percentage of won challenges out of all joined challenges

## UI Improvements for Cash-Out Flow

### Visual States:
1. **Winner State**: Shows gold-themed card with cash-out button
2. **Cashed-Out State**: Shows green-themed card with completion confirmation
   - ✅ Success message with cash-out amount
   - 💰 "Winnings Cashed Out" header with wallet icon
   - Displays cash-out date
   - No clickable cash-out button (prevents re-clicking)

### User Experience:
- **Cash-Out Button**: Only available in "winner" status
- **Confirmation Flow**: Alert dialog with cancel/confirm options
- **State Transition**: Automatically transitions to cashed-out view
- **Visual Feedback**: Clear visual distinction between states
- **Disabled Interactions**: No route map or timer shown for completed challenges

## Testing the Changes

To verify the changes work correctly:

1. Run `npm start` or `expo start`
2. Check that the routing warnings are gone
3. Test the complete challenge flow:
   - Join challenge → Run challenge → Complete → Win → Cash out
4. Verify UI state changes:
   - Winner card shows cash-out button
   - After cash-out: button disappears, shows confirmation
   - Cashed-out card displays timestamp
5. Verify the trophies tab shows updated statistics including cashed-out winnings

All import paths have been updated and the app should function identically to before, but with a cleaner structure, no routing warnings, and a complete cash-out user experience.
