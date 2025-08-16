# API Migration Guide

This guide shows how to migrate from mock data to live API using the new structure.

## Current Structure

The app now uses a layered approach:

1. **Constants Layer** (`/constants/`) - Mock data and types
2. **Service Layer** (`/app/services/apiService.ts`) - Data access abstraction
3. **Component Layer** - React components that consume data

## Migration Steps

### Step 1: Use ApiService in Components

Instead of directly importing mock data:

```typescript
// OLD: Direct mock data import
import { challenges } from '../lib/mock';

export default function MyComponent() {
  const challenge = challenges.find(c => c.id === id);
  // ...
}
```

Use the ApiService:

```typescript
// NEW: Using ApiService
import { ApiService } from '../services/apiService';
import { Challenge } from '../../constants/types';

export default function MyComponent() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  
  useEffect(() => {
    const loadChallenge = async () => {
      const data = await ApiService.getChallengeById(id);
      setChallenge(data || null);
    };
    loadChallenge();
  }, [id]);
  
  // ...
}
```

### Step 2: Replace Mock Implementation

When your API is ready, simply update the ApiService methods:

```typescript
// In app/services/apiService.ts

static async getChallenges(): Promise<Challenge[]> {
  // Replace this mock implementation:
  // return Promise.resolve(challenges);
  
  // With real API call:
  const response = await fetch('/api/challenges');
  if (!response.ok) {
    throw new Error('Failed to fetch challenges');
  }
  return response.json();
}
```

### Step 3: Add Error Handling

```typescript
static async getChallenges(): Promise<Challenge[]> {
  try {
    const response = await fetch('/api/challenges', {
      headers: {
        'Authorization': `Bearer ${await getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to fetch challenges:', error);
    // Fallback to mock data in development
    if (__DEV__) {
      return challenges;
    }
    throw error;
  }
}
```

### Step 4: Environment-Based Configuration

Create a configuration system:

```typescript
// config/api.ts
const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:3000/api',
    useMockData: true,
  },
  production: {
    baseUrl: 'https://api.racefi.com',
    useMockData: false,
  },
};

export const getApiConfig = () => {
  return API_CONFIG[__DEV__ ? 'development' : 'production'];
};
```

Then use it in ApiService:

```typescript
import { getApiConfig } from '../config/api';

export class ApiService {
  private static config = getApiConfig();
  
  static async getChallenges(): Promise<Challenge[]> {
    if (this.config.useMockData) {
      return Promise.resolve(challenges);
    }
    
    const response = await fetch(`${this.config.baseUrl}/challenges`);
    return response.json();
  }
}
```

## Benefits of This Approach

1. **Gradual Migration**: You can migrate one endpoint at a time
2. **Easy Testing**: Mock data remains available for testing
3. **Type Safety**: TypeScript ensures API responses match expected types
4. **Centralized Logic**: All API calls are in one place
5. **Error Handling**: Consistent error handling across the app
6. **Fallback Support**: Can fallback to mock data if API fails

## Component Usage Examples

### Loading Challenges List

```typescript
const [challenges, setChallenges] = useState<Challenge[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const loadChallenges = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getChallenges();
      setChallenges(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };
  
  loadChallenges();
}, []);
```

### Loading Participants for a Challenge

```typescript
const [participants, setParticipants] = useState<Participant[]>([]);

useEffect(() => {
  if (challengeId) {
    ApiService.getParticipants(challengeId)
      .then(setParticipants)
      .catch(console.error);
  }
}, [challengeId]);
```

This structure makes the transition from mock data to live API seamless while maintaining type safety and good separation of concerns.
