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

    const derivedParticipants = participantsCountOverride ?? 0;

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
      creatorProfileId: (row as any).created_by_profile_id ?? null,
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
          .filter((v): v is string => typeof v === "string"),
      ),
    );

    // Prefetch creators in bulk (support string ids too)
    let creatorsMap = new Map<
      string,
      { name: string; avatar: string | null }
    >();
    if (creatorIds.length) {
      const creatorIdStrings = creatorIds.map((v) => String(v));
      const { data: creators, error: creatorsErr } = await supabase
        .from("profiles")
        .select("id,first_name,last_name,avatar_url,email")
        .in("id", creatorIdStrings as any);
      if (creatorsErr) throw creatorsErr;
      creatorsMap = new Map(
        (creators || []).map((p: any) => {
          const first = p?.first_name || "";
          const last = p?.last_name || "";
          let name = `${first} ${last}`.trim();
          if (!name) {
            const email = p?.email || "";
            name = email ? String(email).split("@")[0] : "User";
          }
          return [
            String(p.id),
            { name: name || null, avatar: (p?.avatar_url as string) || null },
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
        ? creatorsMap.get(String(row.created_by_profile_id)) || null
        : null;
      const participants = attendeeCounts.get(row.id) ?? 0; // Creator is NOT auto-counted
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

    // Fetch creator profile if available (support numeric or UUID)
    let creator: { name: string; avatar: string | null } | null = null;
    const createdBy = (data as any)?.created_by_profile_id;
    if (createdBy != null) {
      // Try as string UUID
      let profRes = await supabase
        .from("profiles")
        .select("first_name,last_name,avatar_url,email")
        .eq("id", createdBy as any) // Adjusted to use 'createdBy' as 'any' to match parameter type
        .maybeSingle();
      if (profRes.error) {
        // Try as numeric id
        profRes = await supabase
          .from("profiles")
          .select("first_name,last_name,avatar_url,email")
          .eq("id", createdBy as number)
          .maybeSingle();
      }
      if (!profRes.error && profRes.data) {
        const first = (profRes.data as any)?.first_name || "";
        const last = (profRes.data as any)?.last_name || "";
        let name = `${first} ${last}`.trim();
        if (!name) {
          const email = (profRes.data as any)?.email || "";
          name = email ? String(email).split("@")[0] : "User";
        }
        creator = {
          name,
          avatar: ((profRes.data as any)?.avatar_url as string) || null,
        };
      }
      // As a last resort, try profiles.user_id == auth user id, if created_by_profile_id stores user id
      if (!creator) {
        const res2 = await supabase
          .from("profiles")
          .select("first_name,last_name,avatar_url,email")
          .eq("user_id", String(createdBy))
          .maybeSingle();
        if (!res2.error && res2.data) {
          const first = (res2.data as any)?.first_name || "";
          const last = (res2.data as any)?.last_name || "";
          let name = `${first} ${last}`.trim();
          if (!name) {
            const email = (res2.data as any)?.email || "";
            name = email ? String(email).split("@")[0] : "User";
          }
          creator = {
            name,
            avatar: ((res2.data as any)?.avatar_url as string) || null,
          };
        }
      }
    }

    // Fallback: use earliest attendee's profile as creator if not resolved
    if (!creator) {
      const { data: firstAttendee } = await supabase
        .from("challenge_attendees")
        .select("profile_id,created_at")
        .eq("challenge_id", data.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstAttendee?.profile_id != null) {
        const { data: prof2 } = await supabase
          .from("profiles")
          .select("first_name,last_name,avatar_url,email")
          .eq("id", firstAttendee.profile_id as number)
          .maybeSingle();
        if (prof2) {
          const first = (prof2 as any)?.first_name || "";
          const last = (prof2 as any)?.last_name || "";
          let name = `${first} ${last}`.trim();
          if (!name) {
            const email = (prof2 as any)?.email || "";
            name = email ? String(email).split("@")[0] : "User";
          }
          creator = {
            name: name || "",
            avatar: ((prof2 as any)?.avatar_url as string) || null,
          };
        }
      }
    }

    // Derive participants count via a head count query
    const { count: attendeesCount, error: cntErr } = await supabase
      .from("challenge_attendees")
      .select("id", { count: "exact", head: true })
      .eq("challenge_id", data.id);
    if (cntErr) throw cntErr;

    // Fetch attendee participants list for detailed view
    let participantsList = await ApiService.getParticipants(String(data.id));

    // Do NOT auto-inject creator; only list attendees who actually joined

    // Use attendees count for participants number
    const participantsCountForDetail = attendeesCount ?? 0;

    return ApiService.mapRowToChallenge(
      data,
      (track as any)?.polyline,
      creator,
      participantsCountForDetail,
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
    // Attach creator profile id (UUID) if available
    try {
      const me = await ApiService.getCurrentUserProfile();
      if (me?.id) {
        (challengeInsert as any).created_by_profile_id = me.id as any;
      }
    } catch {}

    const { data: challengeResult, error: challengeError } = await supabase
      .from("challenges")
      .insert(challengeInsert as any)
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

    // Do NOT auto-join the creator; they must explicitly stake & join

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
    const rows = (attendees || []) as any[];
    if (!rows.length) return [];

    // Collect unique profile ids (UUID strings)
    const ids = Array.from(
      new Set(
        rows
          .map((r) => r.profile_id)
          .filter((v): v is number => typeof v === "number"),
      ),
    );

    // Step 2: fetch profiles in bulk by numeric ids
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,avatar_url,email")
      .in("id", ids);
    if (pErr) throw pErr;
    const pMap = new Map<
      string,
      {
        id: string;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
        email: string | null;
      }
    >();
    (profs || []).forEach((p: any) => pMap.set(String(p.id), p));

    // Merge
    return rows.map((row) => {
      const p = row.profile_id ? pMap.get(String(row.profile_id)) : undefined;
      const first = p?.first_name || "";
      const last = p?.last_name || "";
      let name = `${first} ${last}`.trim();
      if (!name) {
        const email = p?.email || "";
        name = email ? email.split("@")[0] : "User";
      }
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
    const uid = userData.user?.id as string | undefined;
    if (!uid) return null;
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    if (pErr) throw pErr;
    return (profile as any) ?? null;
  }

  /**
   * List challenge attendee rows for the current user
   * Returns an array of { challenge_id, status } for hydration
   */
  static async listCurrentUserAttendees(): Promise<Array<{ challenge_id: number; status: string }>> {
    const profile = await ApiService.getCurrentUserProfile();
    if (!profile?.id) return [];

    const { data, error } = await supabase
      .from("challenge_attendees")
      .select("challenge_id,status")
      .eq("profile_id", profile.id as any);
    if (error) throw error;
    const rows = (data || []) as any[];
    return rows
      .filter((r) => r?.challenge_id != null)
      .map((r) => ({ challenge_id: Number(r.challenge_id), status: String(r.status || "joined") }));
  }

  /**
   * Returns true if current user has already joined the given challenge id
   */
  static async hasCurrentUserJoined(challengeId: number): Promise<boolean> {
    const profile = await ApiService.getCurrentUserProfile();
    if (!profile?.id) return false;
    const { data, error } = await supabase
      .from("challenge_attendees")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("profile_id", profile.id as any)
      .maybeSingle();
    if (error) throw error;
    return !!data;
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
      .eq("profile_id", profile.id as any)
      .maybeSingle();
    if (existErr) throw existErr;
    if (existing) {
      return existing as Tables<"challenge_attendees">;
    }

    // Enforce max participants
    const { data: ch, error: chErr } = await supabase
      .from("challenges")
      .select("id,max_participants")
      .eq("id", challengeId)
      .maybeSingle();
    if (chErr) throw chErr;
    if (ch) {
      const { count } = await supabase
        .from("challenge_attendees")
        .select("id", { count: "exact", head: true })
        .eq("challenge_id", challengeId);
      if ((count || 0) >= (ch as any).max_participants) {
        throw new Error("Challenge is full");
      }
    }

    const insert = {
      challenge_id: challengeId,
      profile_id: profile.id as any,
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
      .select("first_name,last_name,avatar_url,email")
      .eq("id", pid)
      .maybeSingle();
    if (pErr) throw pErr;

    const first = prof?.first_name || "";
    const last = prof?.last_name || "";
    let name = `${first} ${last}`.trim();
    if (!name) {
      const email = prof?.email || "";
      name = email ? String(email).split("@")[0] : "User";
    }
    return {
      name: name || "User",
      avatar: prof?.avatar_url || null,
      time: "N/A",
    };
  }

  // (Optional future endpoints left commented)
}
