import { Participant } from "../constants/types";

export const mockParticipants: Record<string, Participant[]> = {
  "waterfront-5k": [
    {
      name: "Alex Runner",
      avatar: require("../assets/running/athlete-in-motion.png"),
      status: "completed",
      time: "23:12",
      duration_seconds: 1392, // 23:12 in seconds
      completion_time: "2024-01-15T10:30:00Z",
    },
    {
      name: "Maria Fast",
      avatar: require("../assets/running/athlete-2.png"),
      status: "joined",
    },
    {
      name: "John Speed",
      avatar: require("../assets/running/diverse-group-athletes.png"),
      status: "running",
      time: "12:34",
    },
  ],
  "uptown-10k": [
    {
      name: "Lisa Quick",
      avatar: require("../assets/running/diverse-group-athletes.png"),
      status: "joined",
    },
    {
      name: "Tom Swift",
      avatar: require("../assets/running/athlete-2.png"),
      status: "running",
      time: "25:18",
    },
    {
      name: "Emma Parker",
      avatar: require("../assets/running/runner-profile.png"),
      status: "completed",
      time: "42:33",
      duration_seconds: 2553, // 42:33 in seconds
      completion_time: "2024-01-15T11:15:00Z",
    },
  ],
};
