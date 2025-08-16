import supabase from "./supabaseService";
import { Challenge, Participant } from "../constants/types";
import { Tables, TablesInsert, TablesUpdate } from "../database.types";

export interface ChallengeCreateRequest extends TablesInsert<"challenges"> {
  // Add optional polyline to create track along with challenge
  polyline?: string;
}

/**
 * API Service Layer
 *
 * This service abstracts data access for challenges, participants, runs and tracks.
 */

export class ApiService {
  // Convert DB row to UI Challenge shape
  private static mapRowToChallenge(
    row: Tables<"challenges">,
    polyline?: string | null,
  ): Challenge {
    const startDate = row.start_date ? new Date(row.start_date) : new Date();
    const endDate = row.end_date ? new Date(row.end_date) : new Date();
    const windowMs = Math.max(0, endDate.getTime() - startDate.getTime());
    const windowDays = Math.max(
      1,
      Math.round(windowMs / (1000 * 60 * 60 * 24)),
    );

    return {
      id: String(row.id),
      name: row.name,
      description: row.description || "",
      distanceKm: row.distance_km,
      windowDays,
      stake: row.stake,
      elevation: row.elevation,
      difficulty: row.difficulty as Challenge["difficulty"],
      prizePool: row.prize_pool,
      participants: row.participants_count ?? 0,
      maxParticipants: row.max_participants,
      location: row.location,
      startDate,
      endDate,
      creator: {
        name: "Challenge Creator",
        avatar: null,
        time: "N/A",
      },
      participantsList: [],
      polyline: polyline || undefined,
    };
  }

  // Challenge-related methods
  static async getChallenges(): Promise<Challenge[]> {
    const { data, error } = await supabase.from("challenges").select("*");
    if (error) throw error;

    const { data: tracks, error: tracksError } = await supabase
      .from("tracks")
      .select("challenge_id, polyline");
    if (tracksError) throw tracksError;

    return (data || []).map((row) => {
      const polyline = tracks?.find((t) => t.challenge_id === row.id)?.polyline;
      return ApiService.mapRowToChallenge(row, polyline);
    });
  }

  static async getChallengeById(id: string): Promise<Challenge | undefined> {
    const cid = Number(id);
    if (!Number.isFinite(cid)) return undefined;

    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", cid)
      .single();

    if (error) {
      if ((error as any).code === "PGRST116") {
        return undefined;
      }
      throw error;
    }

    const { data: track, error: trackError } = await supabase
      .from("tracks")
      .select("polyline")
      .eq("challenge_id", data.id)
      .maybeSingle();
    if (trackError) throw trackError;

    return ApiService.mapRowToChallenge(data, (track as any)?.polyline);
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
    const challengeInsert: TablesInsert<"challenges"> = {
      ...challengeFields,
      participants_count: challengeFields.participants_count ?? 0,
    } as TablesInsert<"challenges">;

    // Insert challenge
    const { data: challengeResult, error: challengeError } = await supabase
      .from("challenges")
      .insert(challengeInsert)
      .select()
      .single();

    if (challengeError) {
      if (String(challengeError.message || "").includes("duplicate key")) {
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
      } as TablesInsert<"tracks">);

      if (trackError) {
        // Could log this error but don't fail the challenge creation
        console.warn("Failed to save track data:", (trackError as any).message);
      }
    }

    return ApiService.mapRowToChallenge(challengeResult, polyline);
  }

  static async updateChallenge(
    id: number,
    updates: TablesUpdate<"challenges">,
  ): Promise<Tables<"challenges">> {
    const { data, error } = await supabase
      .from("challenges")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Tables<"challenges">;
  }

  static async deleteChallenge(id: number): Promise<void> {
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) throw error;
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

  static async addParticipant(
    insert: TablesInsert<"challenge_attendees">,
  ): Promise<Tables<"challenge_attendees">> {
    const { data, error } = await supabase
      .from("challenge_attendees")
      .insert(insert)
      .select()
      .single();
    if (error) throw error;
    return data as Tables<"challenge_attendees">;
  }

  static async updateParticipant(
    id: number,
    updates: TablesUpdate<"challenge_attendees">,
  ): Promise<Tables<"challenge_attendees">> {
    const { data, error } = await supabase
      .from("challenge_attendees")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Tables<"challenge_attendees">;
  }

  static async removeParticipant(id: number): Promise<void> {
    const { error } = await supabase
      .from("challenge_attendees")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  // Runs CRUD
  static async listRunsByChallenge(
    challengeId: number,
  ): Promise<Tables<"runs">[]> {
    const { data, error } = await supabase
      .from("runs")
      .select("*")
      .eq("challenge_id", challengeId);
    if (error) throw error;
    return (data || []) as Tables<"runs">[];
  }

  static async createRun(
    insert: TablesInsert<"runs">,
  ): Promise<Tables<"runs">> {
    const { data, error } = await supabase
      .from("runs")
      .insert(insert)
      .select()
      .single();
    if (error) throw error;
    return data as Tables<"runs">;
  }

  static async updateRun(
    id: number,
    updates: TablesUpdate<"runs">,
  ): Promise<Tables<"runs">> {
    const { data, error } = await supabase
      .from("runs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Tables<"runs">;
  }

  static async deleteRun(id: number): Promise<void> {
    const { error } = await supabase.from("runs").delete().eq("id", id);
    if (error) throw error;
  }

  // Tracks helpers
  static async getTrackPolyline(challengeId: number): Promise<string | null> {
    const { data, error } = await supabase
      .from("tracks")
      .select("polyline")
      .eq("challenge_id", challengeId)
      .maybeSingle();
    if (error) throw error;
    return (data as any)?.polyline ?? null;
  }

  static async upsertTrack(
    challengeId: number,
    polyline: string,
  ): Promise<void> {
    // Try update first
    const { error: updateErr } = await supabase
      .from("tracks")
      .update({ polyline } as TablesUpdate<"tracks">)
      .eq("challenge_id", challengeId);

    if (updateErr) throw updateErr;

    // If no row affected, ensure row exists; if not, insert
    const { data } = await supabase
      .from("tracks")
      .select("id")
      .eq("challenge_id", challengeId)
      .maybeSingle();

    if (!data) {
      const { error: insertErr } = await supabase.from("tracks").insert({
        challenge_id: challengeId,
        polyline,
      } as TablesInsert<"tracks">);
      if (insertErr) throw insertErr;
    }
  }

  static async getChallengeCreator(
    challengeId: string,
  ): Promise<{ name: string; avatar: any; time: string } | null> {
    const cid = Number(challengeId);
    if (!Number.isFinite(cid)) return null;

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

  // (Optional future endpoints left commented)
}
