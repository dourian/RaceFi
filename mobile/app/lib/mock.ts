export type Challenge = {
  id: string;
  name: string;
  distanceKm: number;
  windowDays: number;
  stake: number; // USDC
  track?: { lat: number; lng: number }[]; // placeholder for coordinates
};

export const challenges: Challenge[] = [
  {
    id: 'waterfront-5k',
    name: 'Waterfront 5K',
    distanceKm: 5,
    windowDays: 7,
    stake: 5,
  },
  {
    id: 'uptown-10k',
    name: 'Uptown 10K',
    distanceKm: 10,
    windowDays: 7,
    stake: 10,
  },
];

