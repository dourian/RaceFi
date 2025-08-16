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
