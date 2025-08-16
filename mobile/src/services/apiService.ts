import { Challenge, Participant } from "../../constants/types";
import supabase from "../../app/lib/supabase";

export interface ChallengeCreateRequest {
  name: string;
  description?: string;
  distance_km: number;
  stake: number;
  elevation: number;
  difficulty: "Easy" | "Moderate" | "Hard";
  prize_pool: number;
  max_participants: number;
  location: string;
  start_date: string;
  end_date: string;
  created_by_profile_id: number;
  polyline?: string;
}

/**
 * API Service Layer
 *
 * This service abstracts data access for challenges and participants.
 * Currently uses mock data, but can be easily swapped with real API calls.
 */

export class ApiService {
  // Challenge-related methods
  static async getChallenges(): Promise<Challenge[]> {
    const { data, error } = await supabase.from("challenges").select("*");
    if (error) throw error;

    const { data: tracks, error: tracksError } = await supabase
      .from("tracks")
      .select("challenge_id, polyline");
    if (tracksError) throw tracksError;

    // Transform the data to ensure dates are Date objects and provide defaults for missing fields
    return data.map((challenge) => ({
      ...challenge,
      startDate: challenge.start_date
        ? new Date(challenge.start_date)
        : new Date(),
      endDate: challenge.end_date ? new Date(challenge.end_date) : new Date(),
      creator: (challenge as any).creator || {
        name: "Challenge Creator",
        avatar: null,
        time: "N/A",
      },
      polyline: tracks?.find((t) => t.challenge_id === challenge.id)?.polyline,
      participantsList: (challenge as any).participantsList || [],
    }));
  }

  static async getChallengeById(id: string): Promise<Challenge | undefined> {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if ((error as any).code === "PGRST116") {
        // No rows returned
        return undefined;
      }
      throw error;
    }

    // Fetch track polyline for this challenge
    const { data: track, error: trackError } = await supabase
      .from("tracks")
      .select("polyline")
      .eq("challenge_id", data.id)
      .maybeSingle();
    if (trackError) throw trackError;

    // Transform the data to ensure dates are Date objects and provide defaults for missing fields
    return {
      ...data,
      startDate: data.start_date ? new Date(data.start_date) : new Date(),
      endDate: data.end_date ? new Date(data.end_date) : new Date(),
      creator: (data as any).creator || {
        name: "Challenge Creator",
        avatar: null,
        time: "N/A",
      },
      polyline: (track as any)?.polyline,
      participantsList: (data as any).participantsList || [],
    };
  }

  static async createChallenge(
    challengeData: ChallengeCreateRequest,
  ): Promise<Challenge> {
    // Validate dates (basic validation)
    const startDate = new Date(challengeData.start_date);
    const endDate = new Date(challengeData.end_date);
    if (startDate >= endDate) {
      throw new Error("Start date must be before end date");
    }

    // Prepare challenge data (exclude polyline for challenges table)
    const { polyline, ...challengeFields } = challengeData;
    const challengeInsert = {
      ...challengeFields,
      participants_count: 0,
    };

    // Insert challenge
    const { data: challengeResult, error: challengeError } = await supabase
      .from("challenges")
      .insert(challengeInsert)
      .select()
      .single();

    if (challengeError) {
      if (challengeError.message.includes("duplicate key")) {
        throw new Error("Challenge with this name already exists");
      }
      throw new Error(challengeError.message);
    }

    if (!challengeResult) {
      throw new Error("Failed to create challenge");
    }

    const challengeId = challengeResult.id;

    // Insert track coordinates if provided
    if (polyline) {
      const { error: trackError } = await supabase.from("tracks").insert({
        challenge_id: challengeId,
        polyline: polyline,
      });

      if (trackError) {
        // Could log this error but don't fail the challenge creation
        console.warn("Failed to save track data:", trackError.message);
      }
    }

    // Transform the response to match the Challenge type
    return {
      ...challengeResult,
      startDate: challengeResult.start_date
        ? new Date(challengeResult.start_date)
        : new Date(),
      endDate: challengeResult.end_date
        ? new Date(challengeResult.end_date)
        : new Date(),
      creator: challengeResult.creator || {
        name: "Challenge Creator",
        avatar: null,
        time: "N/A",
      },
      participantsList: challengeResult.participantsList || [],
    };
  }

  // Participant-related methods
  static async getParticipants(challengeId: string): Promise<Participant[]> {
    const cid = Number(challengeId);
    if (!Number.isFinite(cid)) return [];

    const { data, error } = await supabase
      .from("challenge_attendees")
      .select(
        "status,start_time,end_time,profiles:first_name,profiles:last_name,profiles:avatar_url,profiles:id",
      )
      .eq("challenge_id", cid);

    if (error) throw error;

    // PostgREST flattens when using column renames inconsistently across versions.
    // To be robust, we read any embedded "profiles" object if present, else flat fields.
    return (data as any[]).map((row: any) => {
      const p = row.profiles || row;
      const first = p.first_name || "";
      const last = p.last_name || "";
      const name = `${first} ${last}`.trim() || "Participant";
      const status = row.status as any as Participant["status"]; // already matches enum
      return {
        name,
        avatar: p.avatar_url || null,
        status,
        // Optionally surface a human time label if end_time exists
        time: row.end_time || undefined,
      } as Participant;
    });
  }

  static async getChallengeCreator(
    challengeId: string,
  ): Promise<{ name: string; avatar: any; time: string } | null> {
    const cid = Number(challengeId);
    if (!Number.isFinite(cid)) return null;

    // Fetch challenge to get creator profile id
    const { data: ch, error: chErr } = await supabase
      .from("challenges")
      .select("created_by_profile_id")
      .eq("id", cid)
      .single();
    if (chErr) throw chErr;
    const pid = (ch as any)?.created_by_profile_id;
    if (!pid) return null;

    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("first_name,last_name,avatar_url")
      .eq("id", pid)
      .maybeSingle();
    if (pErr) throw pErr;

    const first = prof?.first_name || "";
    const last = prof?.last_name || "";
    const name = `${first} ${last}`.trim() || "Challenge Creator";
    return { name, avatar: prof?.avatar_url || null, time: "N/A" };
  }

  // Future API methods (commented out for now)
  /*
  static async joinChallenge(challengeId: string, userId: string): Promise<boolean> {
    return await fetch(`/api/challenges/${challengeId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).then(res => res.ok);
  }

  static async submitRunResult(challengeId: string, userId: string, result: any): Promise<boolean> {
    return await fetch(`/api/challenges/${challengeId}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, result })
    }).then(res => res.ok);
  }

  static async getChallengeLeaderboard(challengeId: string): Promise<any[]> {
    return await fetch(`/api/challenges/${challengeId}/leaderboard`)
      .then(res => res.json());
  }
  */
}
