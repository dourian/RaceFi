// Database types for RaceFi app
// These types match the Supabase database schema

export type DifficultyLevel = "Easy" | "Moderate" | "Hard";
export type ParticipantStatus = "joined" | "running" | "completed";

export interface Database {
  public: {
    Tables: {
      challenges: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          distance_km: number;
          window_days: number;
          stake: number;
          elevation: number;
          difficulty: DifficultyLevel;
          prize_pool: number;
          participants_count: number;
          max_participants: number;
          location: string;
          start_date: string;
          end_date: string;
          creator_id: string | null;
          creator_name: string;
          creator_avatar_url: string | null;
          creator_time: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          distance_km: number;
          window_days: number;
          stake: number;
          elevation: number;
          difficulty: DifficultyLevel;
          prize_pool: number;
          participants_count?: number;
          max_participants: number;
          location: string;
          start_date: string;
          end_date: string;
          creator_id?: string | null;
          creator_name: string;
          creator_avatar_url?: string | null;
          creator_time?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          distance_km?: number;
          window_days?: number;
          stake?: number;
          elevation?: number;
          difficulty?: DifficultyLevel;
          prize_pool?: number;
          participants_count?: number;
          max_participants?: number;
          location?: string;
          start_date?: string;
          end_date?: string;
          creator_id?: string | null;
          creator_name?: string;
          creator_avatar_url?: string | null;
          creator_time?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tracks: {
        Row: {
          id: string;
          challenge_id: string;
          coordinates: any; // JSONB array of {lat: number, lng: number}
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          coordinates: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          coordinates?: any;
          created_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string | null;
          code_name: string;
          avatar_url: string | null;
          status: ParticipantStatus;
          start_time: string | null;
          end_time: string | null;
          completion_time: string | null;
          distance_covered: number | null;
          elevation_gained: number | null;
          track_data: any | null; // JSONB GPS track data
          stake_amount: number;
          stake_transaction_hash: string | null;
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id?: string | null;
          code_name: string;
          avatar_url?: string | null;
          status?: ParticipantStatus;
          start_time?: string | null;
          end_time?: string | null;
          completion_time?: string | null;
          distance_covered?: number | null;
          elevation_gained?: number | null;
          track_data?: any | null;
          stake_amount: number;
          stake_transaction_hash?: string | null;
          joined_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          user_id?: string | null;
          code_name?: string;
          avatar_url?: string | null;
          status?: ParticipantStatus;
          start_time?: string | null;
          end_time?: string | null;
          completion_time?: string | null;
          distance_covered?: number | null;
          elevation_gained?: number | null;
          track_data?: any | null;
          stake_amount?: number;
          stake_transaction_hash?: string | null;
          joined_at?: string;
          updated_at?: string;
        };
      };
      runs: {
        Row: {
          id: string;
          participant_id: string;
          challenge_id: string;
          start_time: string;
          end_time: string | null;
          duration_seconds: number | null;
          distance_km: number | null;
          elevation_meters: number | null;
          avg_pace_min_per_km: number | null;
          max_speed_kmh: number | null;
          gps_track: any | null; // JSONB detailed GPS coordinates
          is_valid: boolean;
          deviation_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          challenge_id: string;
          start_time: string;
          end_time?: string | null;
          duration_seconds?: number | null;
          distance_km?: number | null;
          elevation_meters?: number | null;
          avg_pace_min_per_km?: number | null;
          max_speed_kmh?: number | null;
          gps_track?: any | null;
          is_valid?: boolean;
          deviation_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          challenge_id?: string;
          start_time?: string;
          end_time?: string | null;
          duration_seconds?: number | null;
          distance_km?: number | null;
          elevation_meters?: number | null;
          avg_pace_min_per_km?: number | null;
          max_speed_kmh?: number | null;
          gps_track?: any | null;
          is_valid?: boolean;
          deviation_score?: number | null;
          created_at?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          criteria: any; // JSONB criteria object
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          criteria: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          criteria?: any;
          created_at?: string;
        };
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          challenge_id: string | null;
          earned_at: string;
          nft_token_id: string | null;
          nft_contract_address: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          challenge_id?: string | null;
          earned_at?: string;
          nft_token_id?: string | null;
          nft_contract_address?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          challenge_id?: string | null;
          earned_at?: string;
          nft_token_id?: string | null;
          nft_contract_address?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      difficulty_level: DifficultyLevel;
      participant_status: ParticipantStatus;
    };
  };
}

// Helper types for easier usage
export type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
export type Track = Database["public"]["Tables"]["tracks"]["Row"];
export type Participant = Database["public"]["Tables"]["participants"]["Row"];
export type Run = Database["public"]["Tables"]["runs"]["Row"];
export type Badge = Database["public"]["Tables"]["badges"]["Row"];
export type UserBadge = Database["public"]["Tables"]["user_badges"]["Row"];

// Extended types that include related data (for API responses)
export interface ChallengeWithDetails extends Challenge {
  tracks: Track[];
  participants: Participant[];
  creator: {
    name: string;
    avatar_url: string | null;
    time: string | null;
  };
}

export interface ParticipantWithDetails extends Participant {
  runs: Run[];
  user: {
    code_name: string;
    avatar_url: string | null;
  };
}
