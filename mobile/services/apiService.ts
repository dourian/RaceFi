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
    creator?: { name: string; avatar: string | null; time?: string } | null,
    participantsCountOverride?: number,
    participantsListOverride?: Participant[],
  ): Challenge {
    const startDate = row.start_date ? new Date(row.start_date) : new Date();
    const endDate = row.end_date ? new Date(row.end_date) : new Date();
    const windowMs = Math.max(0, endDate.getTime() - startDate.getTime());
    const windowDays = Math.max(
      1,
      Math.round(windowMs / (1000 * 60 * 60 * 24)),
    );

    const derivedParticipants = (participantsCountOverride ?? 0) + 1;

    return {
      id: String(row.id),
      name: row.name,
      description: row.description || "",
      distanceKm: row.distance_km,
      windowDays,
      stake: row.stake,
      elevation: row.elevation,
      difficulty: row.difficulty as Challenge["difficulty"],
      prizePool: derivedParticipants * (row.stake ?? 0),
      participants: derivedParticipants,
      maxParticipants: row.max_participants,
      location: row.location,
      startDate,
      endDate,
      creator: {
        name: creator?.name || "Challenge Creator",
        avatar: creator?.avatar ?? null,
        time: creator?.time || "N/A",
      },
      participantsList: participantsListOverride ?? [],
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

    // Fetch creators in bulk
    const creatorIds = Array.from(
      new Set(
        (data || [])
          .map((row) => row.created_by_profile_id)
          .filter((v): v is number => Number.isFinite(v as any)),
      ),
    );

    let creatorsMap = new Map<
      number,
      { name: string; avatar: string | null }
    >();
    if (creatorIds.length) {
      const { data: creators, error: creatorsErr } = await supabase
        .from("profiles")
        .select("id,first_name,last_name,avatar_url")
        .in("id", creatorIds);
      if (creatorsErr) throw creatorsErr;
      creatorsMap = new Map(
        (creators || []).map((p: any) => {
          const first = p?.first_name || "";
          const last = p?.last_name || "";
          const name = `${first} ${last}`.trim() || "Challenge Creator";
          return [
            p.id as number,
            { name, avatar: (p?.avatar_url as string) || null },
          ];
        }),
      );
    }

    // Derive participants count from challenge_attendees per challenge
    const challengeIds = Array.from(
      new Set(
        (data || [])
          .map((r) => r.id)
          .filter((v): v is number => Number.isFinite(v as any)),
      ),
    );
    let attendeeCounts = new Map<number, number>();
    if (challengeIds.length) {
      const { data: attendeeRows, error: attErr } = await supabase
        .from("challenge_attendees")
        .select("challenge_id")
        .in("challenge_id", challengeIds);
      if (attErr) throw attErr;
      attendeeCounts = new Map<number, number>();
      (attendeeRows || []).forEach((r: any) => {
        const cid = r?.challenge_id as number | null;
        if (typeof cid === "number") {
          attendeeCounts.set(cid, (attendeeCounts.get(cid) || 0) + 1);
        }
      });
    }

    return (data || []).map((row) => {
      const polyline = tracks?.find((t) => t.challenge_id === row.id)?.polyline;
      const creator = row.created_by_profile_id
        ? creatorsMap.get(row.created_by_profile_id) || null
        : null;
      const participants = attendeeCounts.get(row.id) ?? 0;
      return ApiService.mapRowToChallenge(row, polyline, creator, participants);
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

    // Fetch creator profile if available
    let creator: { name: string; avatar: string | null } | null = null;
    if (data.created_by_profile_id) {
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("first_name,last_name,avatar_url")
        .eq("id", data.created_by_profile_id)
        .maybeSingle();
      if (pErr) throw pErr;
      if (prof) {
        const first = (prof as any)?.first_name || "";
        const last = (prof as any)?.last_name || "";
        const name = `${first} ${last}`.trim() || "Challenge Creator";
        creator = {
          name,
          avatar: ((prof as any)?.avatar_url as string) || null,
        };
      }
    }

    // Derive participants count via a head count query
    const { count: attendeesCount, error: cntErr } = await supabase
      .from("challenge_attendees")
      .select("id", { count: "exact", head: true })
      .eq("challenge_id", data.id);
    if (cntErr) throw cntErr;

    // Fetch attendee participants list for detailed view
    const participantsList = await ApiService.getParticipants(String(data.id));

    return ApiService.mapRowToChallenge(
      data,
      (track as any)?.polyline,
      creator,
      attendeesCount ?? 0,
      participantsList,
    );
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

    // Step 1: get attendees rows (avoid relying on FK embedding)
    const { data: attendees, error: attErr } = await supabase
      .from("challenge_attendees")
      .select("status,start_time,end_time,profile_id")
      .eq("challenge_id", cid);
    if (attErr) throw attErr;
    const rows = (attendees || []) as Array<{
      status: Participant["status"];
      start_time: string | null;
      end_time: string | null;
      profile_id: number | null;
    }>;
    if (!rows.length) return [];

    // Collect unique profile ids
    const ids = Array.from(
      new Set(
        rows
          .map((r) => r.profile_id)
          .filter((v): v is number => Number.isFinite(v as any)),
      ),
    );

    // Step 2: fetch profiles in bulk
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,avatar_url")
      .in("id", ids);
    if (pErr) throw pErr;
    const pMap = new Map<
      number,
      {
        id: number;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      }
    >();
    (profs || []).forEach((p: any) => pMap.set(p.id, p));

    // Merge
    return rows.map((row) => {
      const p = row.profile_id != null ? pMap.get(row.profile_id) : undefined;
      const first = p?.first_name || "";
      const last = p?.last_name || "";
      const name = `${first} ${last}`.trim() || "Participant";
      return {
        name,
        avatar: p?.avatar_url || null,
        status: row.status,
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

  // Current user helpers
  static async getCurrentUserProfile(): Promise<Tables<"profiles"> | null> {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const email = userData.user?.email;
    if (!email) return null;
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (pErr) throw pErr;
    return (profile as any) ?? null;
  }

  static async joinChallengeAsCurrentUser(
    challengeId: number,
    stakeAmount: number,
  ): Promise<Tables<"challenge_attendees">> {
    const profile = await ApiService.getCurrentUserProfile();
    if (!profile?.id) {
      throw new Error("Profile not found for current user");
    }

    // Check if already joined
    const { data: existing, error: existErr } = await supabase
      .from("challenge_attendees")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("profile_id", profile.id as number)
      .maybeSingle();
    if (existErr) throw existErr;
    if (existing) {
      return existing as Tables<"challenge_attendees">;
    }

    const insert = {
      challenge_id: challengeId,
      profile_id: profile.id as number,
      stake_amount: stakeAmount,
      status: "joined" as any,
    } as TablesInsert<"challenge_attendees">;
    return await ApiService.addParticipant(insert);
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
