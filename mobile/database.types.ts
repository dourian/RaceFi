export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      challenge_attendees: {
        Row: {
          challenge_id: number | null;
          completion_time: string | null;
          created_at: string | null;
          distance_covered: number | null;
          elevation_gained: number | null;
          end_time: string | null;
          id: number;
          profile_id: number | null;
          stake_amount: number;
          stake_transaction_hash: string | null;
          start_time: string | null;
          status: Database["public"]["Enums"]["participant_status"] | null;
          updated_at: string | null;
        };
        Insert: {
          challenge_id?: number | null;
          completion_time?: string | null;
          created_at?: string | null;
          distance_covered?: number | null;
          elevation_gained?: number | null;
          end_time?: string | null;
          id?: number;
          profile_id?: number | null;
          stake_amount: number;
          stake_transaction_hash?: string | null;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["participant_status"] | null;
          updated_at?: string | null;
        };
        Update: {
          challenge_id?: number | null;
          completion_time?: string | null;
          created_at?: string | null;
          distance_covered?: number | null;
          elevation_gained?: number | null;
          end_time?: string | null;
          id?: number;
          profile_id?: number | null;
          stake_amount?: number;
          stake_transaction_hash?: string | null;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["participant_status"] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_attendees_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_attendees_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      challenges: {
        Row: {
          created_at: string | null;
          created_by_profile_id: string | null;
          description: string | null;
          difficulty: Database["public"]["Enums"]["difficulty_level"];
          distance_km: number;
          elevation: number;
          end_date: string;
          id: number;
          is_active: boolean | null;
          location: string;
          max_participants: number;
          name: string;
          stake: number;
          start_date: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          difficulty: Database["public"]["Enums"]["difficulty_level"];
          distance_km: number;
          elevation: number;
          end_date: string;
          id?: number;
          is_active?: boolean | null;
          location: string;
          max_participants: number;
          name: string;
          stake: number;
          start_date: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by_profile_id?: number | null;
          description?: string | null;
          difficulty?: Database["public"]["Enums"]["difficulty_level"];
          distance_km?: number;
          elevation?: number;
          end_date?: string;
          id?: number;
          is_active?: boolean | null;
          location?: string;
          max_participants?: number;
          name?: string;
          stake?: number;
          start_date?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "challenges_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          first_name: string | null;
          id: number;
          last_name: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string | null;
          id?: number;
          last_name?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string | null;
          id?: number;
          last_name?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      runs: {
        Row: {
          avg_pace_min_per_km: number | null;
          challenge_attendee_id: number | null;
          challenge_id: number | null;
          created_at: string | null;
          deviation_score: number | null;
          distance_km: number | null;
          duration_seconds: number | null;
          elevation_meters: number | null;
          end_time: string | null;
          id: number;
          max_speed_kmh: number | null;
          polyline: string | null;
          start_time: string;
          updated_at: string | null;
        };
        Insert: {
          avg_pace_min_per_km?: number | null;
          challenge_attendee_id?: number | null;
          challenge_id?: number | null;
          created_at?: string | null;
          deviation_score?: number | null;
          distance_km?: number | null;
          duration_seconds?: number | null;
          elevation_meters?: number | null;
          end_time?: string | null;
          id?: number;
          max_speed_kmh?: number | null;
          polyline?: string | null;
          start_time: string;
          updated_at?: string | null;
        };
        Update: {
          avg_pace_min_per_km?: number | null;
          challenge_attendee_id?: number | null;
          challenge_id?: number | null;
          created_at?: string | null;
          deviation_score?: number | null;
          distance_km?: number | null;
          duration_seconds?: number | null;
          elevation_meters?: number | null;
          end_time?: string | null;
          id?: number;
          max_speed_kmh?: number | null;
          polyline?: string | null;
          start_time?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "runs_challenge_attendee_id_fkey";
            columns: ["challenge_attendee_id"];
            isOneToOne: false;
            referencedRelation: "challenge_attendees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runs_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          }
        ];
      };
      tracks: {
        Row: {
          challenge_id: number | null;
          created_at: string;
          id: number;
          polyline: string | null;
          updated_at: string | null;
        };
        Insert: {
          challenge_id?: number | null;
          created_at?: string;
          id?: number;
          polyline?: string | null;
          updated_at?: string | null;
        };
        Update: {
          challenge_id?: number | null;
          created_at?: string;
          id?: number;
          polyline?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tracks_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      difficulty_level: "Easy" | "Moderate" | "Hard";
      participant_status: "joined" | "running" | "completed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      difficulty_level: ["Easy", "Moderate", "Hard"],
      participant_status: ["joined", "running", "completed"],
    },
  },
} as const;
