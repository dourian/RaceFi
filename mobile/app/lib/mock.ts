export type Participant = {
  name: string;
  avatar: any;
  status: "completed" | "running" | "joined";
  time?: string;
};

export type Challenge = {
  id: string;
  name: string;
  description: string;
  distanceKm: number;
  windowDays: number;
  stake: number; // USDC
  elevation: number;
  difficulty: "Easy" | "Moderate" | "Hard";
  prizePool: number;
  participants: number;
  maxParticipants: number;
  location: string;
  startDate: Date;
  endDate: Date;
  creator: {
    name: string;
    avatar: any;
    time: string;
  };
  participantsList: Participant[];
  track?: { lat: number; lng: number }[]; // placeholder for coordinates
  routePreview?: any; // Route preview image
  polyline?: string; // Encoded polyline for route display
  routeColor?: string; // Color for the route line
};

export const challenges: Challenge[] = [
  {
    id: "waterfront-5k",
    name: "Waterfront 5K Challenge",
    description: "A scenic 5km run along the waterfront with beautiful views. Perfect for morning runs with moderate elevation changes.",
    distanceKm: 5,
    windowDays: 7,
    stake: 5,
    elevation: 85,
    difficulty: "Moderate",
    prizePool: 20,
    participants: 4,
    maxParticipants: 12,
    location: "San Francisco, CA",
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    creator: {
      name: "Sarah Chen",
      avatar: require("../../assets/running/runner-profile.png"),
      time: "22:45",
    },
    participantsList: [
      { 
        name: "Alex Runner", 
        avatar: require("../../assets/running/athlete-in-motion.png"), 
        status: "completed", 
        time: "23:12" 
      },
      { 
        name: "Maria Fast", 
        avatar: require("../../assets/running/athlete-2.png"), 
        status: "joined" 
      },
      { 
        name: "John Speed", 
        avatar: require("../../assets/running/diverse-group-athletes.png"), 
        status: "running", 
        time: "12:34" 
      },
    ],
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
    difficulty: "Hard",
    prizePool: 40,
    participants: 4,
    maxParticipants: 15,
    location: "New York, NY",
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    creator: {
      name: "Mike Johnson",
      avatar: require("../../assets/running/athlete-in-motion.png"),
      time: "45:32",
    },
    participantsList: [
      { 
        name: "Lisa Quick", 
        avatar: require("../../assets/running/diverse-group-athletes.png"), 
        status: "joined" 
      },
      { 
        name: "Tom Swift", 
        avatar: require("../../assets/running/athlete-2.png"), 
        status: "running", 
        time: "25:18" 
      },
      { 
        name: "Emma Parker", 
        avatar: require("../../assets/running/runner-profile.png"), 
        status: "completed", 
        time: "42:33" 
      },
    ],
    polyline: "kb~bFdxp|U}BaBkCcBaB_AiA{@qAmAuAcCa@aAYy@Ws@Qw@M{@G_BAgBB_AF{@L}@Py@Tw@Vw@\\y@b@w@f@{@j@{@n@w@r@s@t@q@x@m@z@i@|@e@~@a@`Ac@bAa@dAc@fAe@hAg@jAi@lAk@nAm@pAo@rAq@tAs@vAu@xAw@zA{@|A}@~A_@`B_A`BaAbBcAbBeAbBgAbBi@bBk@bBo@bBq@bBs@bBu@bBw@bBy@bB}@bB_AzA",
    routeColor: "#ef4444", // Red for uptown
  },
];

export default challenges;
