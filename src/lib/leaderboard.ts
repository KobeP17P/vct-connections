import type { SupabaseClient } from "@supabase/supabase-js";
import {
  commsRankFromAverage,
  isRadiantSolve,
  type CommsRank,
} from "../game/ranks";
import type { Puzzle, PuzzleProgress } from "../game/types";

export const DISPLAY_NAME_MAX = 24;

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  current_streak: number;
  max_streak: number;
  rank_avg: number;
  dailies_played: number;
}

export function isOfficialDaily(puzzle: Puzzle): boolean {
  return (
    puzzle.id > 0 &&
    puzzle.date !== "1970-01-01" &&
    /^\d{4}-\d{2}-\d{2}$/.test(puzzle.date)
  );
}

export function displayNameFromUser(input: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  const full =
    input.fullName?.trim() ||
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  const emailName = input.email?.split("@")[0]?.replace(/[._+]/g, " ").trim();
  const raw = full || input.username?.trim() || emailName || "Agent";
  return raw.slice(0, DISPLAY_NAME_MAX);
}

export function suggestedUsername(input: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  const raw = displayNameFromUser(input)
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, DISPLAY_NAME_MAX);
  if (!raw || raw.toLowerCase() === "agent") return "";
  return raw;
}

export function validateUsername(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 3) return "Use at least 3 characters.";
  if (name.length > DISPLAY_NAME_MAX) {
    return `Keep it to ${DISPLAY_NAME_MAX} characters.`;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return "Letters, numbers, and underscores only.";
  }
  return null;
}

export interface ProfileRow {
  user_id: string;
  display_name: string;
  username_set: boolean;
}

const profileSyncedListeners = new Set<() => void>();

export function subscribeProfileSync(listener: () => void): () => void {
  profileSyncedListeners.add(listener);
  return () => {
    profileSyncedListeners.delete(listener);
  };
}

export function notifyProfileSynced(): void {
  for (const listener of profileSyncedListeners) listener();
}

export async function fetchOwnProfile(
  client: SupabaseClient,
  userId: string,
): Promise<{ profile: ProfileRow | null; error: string | null }> {
  const { data, error } = await client
    .from("profiles")
    .select("user_id, display_name, username_set")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { profile: null, error: error.message };
  return { profile: (data as ProfileRow | null) ?? null, error: null };
}

export async function upsertProfile(
  client: SupabaseClient,
  userId: string,
  displayName: string,
  usernameSet = false,
): Promise<string | null> {
  const name = displayName.trim().slice(0, DISPLAY_NAME_MAX) || "Agent";
  const { error } = await client.from("profiles").upsert(
    {
      user_id: userId,
      display_name: name,
      username_set: usernameSet,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (!error) notifyProfileSynced();
  if (error?.code === "23505") return "That username is taken.";
  return error?.message ?? null;
}

export async function claimUsername(
  client: SupabaseClient,
  userId: string,
  raw: string,
): Promise<string | null> {
  const invalid = validateUsername(raw);
  if (invalid) return invalid;
  return upsertProfile(client, userId, raw.trim(), true);
}

export async function removePlayerResults(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { error } = await client
    .from("daily_results")
    .delete()
    .eq("user_id", userId);
  return error?.message ?? null;
}

export async function submitDailyResult(
  client: SupabaseClient,
  puzzle: Puzzle,
  progress: Pick<PuzzleProgress, "mistakes" | "status" | "solved">,
): Promise<string | null> {
  if (!isOfficialDaily(puzzle)) return null;
  if (progress.status !== "won" && progress.status !== "lost") return null;

  const { error } = await client.from("daily_results").insert({
    puzzle_id: puzzle.id,
    puzzle_date: puzzle.date,
    mistakes: Math.min(4, Math.max(0, progress.mistakes)),
    won: progress.status === "won",
    radiant:
      progress.status === "won" && isRadiantSolve(puzzle, progress.solved),
  });

  if (error && error.code === "23505") return null;
  return error?.message ?? null;
}

export async function fetchLeaderboard(
  client: SupabaseClient,
): Promise<{ rows: LeaderboardRow[]; error: string | null }> {
  const { data, error } = await client.rpc("get_leaderboard");
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as LeaderboardRow[], error: null };
}

export interface DailyRankRow {
  puzzle_id: number;
  puzzle_date: string;
  won: boolean;
  mistakes: number;
  radiant: boolean;
  daily_players: number;
}

export async function fetchMyDailyRanks(
  client: SupabaseClient,
): Promise<{ rows: DailyRankRow[]; error: string | null }> {
  const { data, error } = await client.rpc("get_my_daily_ranks");
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as DailyRankRow[], error: null };
}

export interface ArchiveDayView {
  puzzle: Puzzle;
  mine: DailyRankRow | null;
}

export function buildArchiveDays(
  puzzles: Puzzle[],
  mine: DailyRankRow[],
): ArchiveDayView[] {
  return puzzles.map((puzzle) => ({
    puzzle,
    mine: mine.find((row) => row.puzzle_id === puzzle.id) ?? null,
  }));
}

export function missedEveryDaily(days: ArchiveDayView[]): boolean {
  return days.length > 0 && days.every((day) => !day.mine);
}

export function rankByStreak(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows].sort(
    (a, b) =>
      b.max_streak - a.max_streak ||
      b.current_streak - a.current_streak ||
      a.display_name.localeCompare(b.display_name),
  );
}

export const MIN_RANK_BOARD_PLAYS = 5;

export function rankByCommsRank(
  rows: LeaderboardRow[],
  options?: { minPlays?: number },
): LeaderboardRow[] {
  const minPlays = options?.minPlays ?? 0;
  return [...rows]
    .filter((row) => row.dailies_played >= minPlays)
    .sort(
      (a, b) =>
        Number(b.rank_avg) - Number(a.rank_avg) ||
        b.dailies_played - a.dailies_played ||
        a.display_name.localeCompare(b.display_name),
    );
}

export interface PlayerStanding {
  row: LeaderboardRow | null;
  streakRank: number | null;
  commsRank: CommsRank | null;
  players: number;
}

export function playerStanding(
  rows: LeaderboardRow[],
  userId: string | null | undefined,
): PlayerStanding {
  const players = rows.length;
  if (!userId) {
    return { row: null, streakRank: null, commsRank: null, players };
  }

  const streak = rankByStreak(rows);
  const ranked = rankByCommsRank(rows);
  const streakIndex = streak.findIndex((row) => row.user_id === userId);
  const rankedRow = ranked.find((row) => row.user_id === userId) ?? null;

  return {
    row: streakIndex >= 0 ? streak[streakIndex]! : rankedRow,
    streakRank: streakIndex >= 0 ? streakIndex + 1 : null,
    commsRank: rankedRow ? commsRankFromAverage(Number(rankedRow.rank_avg)) : null,
    players,
  };
}
