# Constants Folder

This folder contains all mock data and type definitions used throughout the app. It's organized to make future API integration seamless.

## File Structure

```
constants/
├── types.ts                 # Type definitions for Participant and Challenge
├── mockParticipants.ts      # Mock participant data by challenge ID
├── mockCreators.ts          # Mock creator data by challenge ID  
├── mockChallenges.ts        # Base challenge data + combination logic
├── index.ts                 # Main exports for easy importing
└── README.md               # This file
```

## Usage

### Import Types
```typescript
import { Participant, Challenge } from '../../constants/types';
```

### Import Challenge Data
```typescript
import { challenges } from '../../constants';
// or
import { challenges, baseChallenges } from '../../constants/mockChallenges';
```

### Import Individual Mock Data
```typescript
import { mockParticipants } from '../../constants/mockParticipants';
import { mockCreators } from '../../constants/mockCreators';
```

## API Migration Strategy

When ready to integrate with a live API:

1. **Use the ApiService**: The `services/apiService.ts` provides an abstraction layer that currently uses mock data but can be easily swapped with real API calls.

2. **Update Service Methods**: Replace the mock implementations in `ApiService` with actual API calls:
   ```typescript
   // Replace this:
   static async getChallenges(): Promise<Challenge[]> {
     return Promise.resolve(challenges);
   }
   
   // With this:
   static async getChallenges(): Promise<Challenge[]> {
     return await fetch('/api/challenges').then(res => res.json());
   }
   ```

3. **Keep Types**: The type definitions in `types.ts` should remain the same (or be updated to match your API schema).

## Data Organization

- **mockParticipants.ts**: Contains participant arrays indexed by challenge ID
- **mockCreators.ts**: Contains creator objects indexed by challenge ID  
- **mockChallenges.ts**: Contains base challenge data and combines it with participants/creators
- **types.ts**: TypeScript definitions shared between mock and real data

This separation makes it easy to:
- Update participant data without touching challenge data
- Add new challenges without affecting existing participants
- Swap mock data with API calls incrementally
- Maintain type safety throughout the migration

## Backwards Compatibility

The old `app/lib/mock.ts` file has been updated to re-export from this constants folder, so existing imports will continue to work without changes.
