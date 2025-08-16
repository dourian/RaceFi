import { Challenge } from './types';
import { mockParticipants } from './mockParticipants';
import { mockCreators } from './mockCreators';

export const baseChallenges = [
  {
    id: "waterfront-5k",
    name: "Waterfront 5K Challenge",
    description: "A scenic 5km run along the waterfront with beautiful views. Perfect for morning runs with moderate elevation changes.",
    distanceKm: 5,
    windowDays: 7,
    stake: 5,
    elevation: 85,
    difficulty: "Moderate" as const,
    prizePool: 20,
    participants: 4,
    maxParticipants: 12,
    location: "San Francisco, CA",
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    polyline: "ki{eFvqfiVqAWQIGEEKAYJgBVqDJ{BHa@jAkNJw@Pw@V{APs@^aABQAOEQGKoJ_FuJkFqAo@{A}@sH{DiAs@Q]?WVy@`@oBt@_CB]KYMMkB{AQEI@WT{BlE{@zAQPI@ICsCqA_BcAeCmAaFmCqIoEcLeG}KcG}A}@cDaBiDsByAkAuBqBi@y@_@o@o@kB}BgI",
    routeColor: "#3b82f6", // Blue for waterfront
  },
  {
    id: "uptown-10k",
    name: "Uptown 10K Challenge",
    description: "A challenging 10km route through uptown with significant elevation changes. Great for experienced runners looking for a workout.",
    distanceKm: 10,
    windowDays: 7,
    stake: 10,
    elevation: 156,
    difficulty: "Hard" as const,
    prizePool: 40,
    participants: 4,
    maxParticipants: 15,
    location: "New York, NY",
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    polyline: "kb~bFdxp|U}BaBkCcBaB_AiA{@qAmAuAcCa@aAYy@Ws@Qw@M{@G_BAgBB_AF{@L}@Py@Tw@Vw@\\\\y@b@w@f@{@j@{@n@w@r@s@t@q@x@m@z@i@|@e@~@a@`Ac@bAa@dAc@fAe@hAg@jAi@lAk@nAm@pAo@rAq@tAs@vAu@xAw@zA{@|A}@~A_@`B_A`BaAbBcAbBeAbBgAbBi@bBk@bBo@bBq@bBs@bBu@bBw@bBy@bB}@bB_AzA",
    routeColor: "#ef4444", // Red for uptown
  },
];

// Combine base challenges with participants and creators
export const challenges: Challenge[] = baseChallenges.map(baseChallenge => ({
  ...baseChallenge,
  creator: mockCreators[baseChallenge.id],
  participantsList: mockParticipants[baseChallenge.id] || [],
}));

export default challenges;
