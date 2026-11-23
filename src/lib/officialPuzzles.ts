import type { SupabaseClient } from "@supabase/supabase-js";
import type { Difficulty, Group, Puzzle } from "../game/types";
import { formatLocalDate } from "../game/daily";
import {
  validateCustomDraft,
  type CustomPuzzleDraft,
} from "../game/customPuzzle";

export const MAX_NOTES_LENGTH = 240;

export interface OfficialPuzzleRow {
  id: number;
  puzzle_id: number;
  date: string | null;
  author: string;
  notes: string;
  groups: Puzzle["groups"];
}

export interface OfficialDraft extends CustomPuzzleDraft {
  date: string;
  notes: string;
}

export function emptyOfficialDraft(author = "COMMS"): OfficialDraft {
  return {
    author,
    date: "",
    notes: "",
    groups: [
      { category: "", words: ["", "", "", ""] },
      { category: "", words: ["", "", "", ""] },
      { category: "", words: ["", "", "", ""] },
      { category: "", words: ["", "", "", ""] },
    ],
  };
}

export function rowToPuzzle(row: OfficialPuzzleRow): Puzzle {
  return {
    id: row.puzzle_id,
    date: row.date ?? "1970-01-01",
    groups: row.groups,
    author: row.author,
    ...(row.notes.trim() ? { notes: row.notes } : {}),
  };
}

export function rowToDraft(row: OfficialPuzzleRow): OfficialDraft {
  const byDiff = [...row.groups].sort((a, b) => a.difficulty - b.difficulty);
  return {
    author: row.author,
    date: row.date ?? "",
    notes: row.notes,
    groups: [0, 1, 2, 3].map((i) => {
      const group = byDiff[i]!;
      return {
        category: group.category,
        words: [...group.words] as OfficialDraft["groups"][number]["words"],
      };
    }) as OfficialDraft["groups"],
  };
}

export function mergeOfficialPuzzles(
  bundled: Puzzle[],
  remote: Puzzle[],
): Puzzle[] {
  const byId = new Map<number, Puzzle>();
  for (const puzzle of bundled) byId.set(puzzle.id, puzzle);
  for (const puzzle of remote) byId.set(puzzle.id, puzzle);
  return [...byId.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id,
  );
}

export function nextPuzzleId(puzzles: { id: number }[]): number {
  return Math.max(0, ...puzzles.map((puzzle) => puzzle.id)) + 1;
}

export function nextOpenDate(
  taken: string[],
  today: Date = new Date(),
): string {
  const used = new Set(taken.filter(Boolean));
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 366; i += 1) {
    const key = formatLocalDate(cursor);
    if (!used.has(key)) return key;
    cursor.setDate(cursor.getDate() + 1);
  }
  return formatLocalDate(cursor);
}

export function validateOfficialDraft(
  draft: OfficialDraft,
  takenDates: string[],
  editingDate?: string | null,
): string[] {
  const errors = validateCustomDraft(draft);
  if (draft.notes.length > MAX_NOTES_LENGTH) {
    errors.push(`Notes must be ${MAX_NOTES_LENGTH} characters or fewer`);
  }
  const date = draft.date.trim();
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push("Date must be YYYY-MM-DD");
    } else if (takenDates.includes(date) && date !== editingDate) {
      errors.push(`A COMMS is already scheduled for ${date}`);
    }
  }
  return errors;
}

export function draftToGroups(draft: OfficialDraft): Puzzle["groups"] {
  return draft.groups.map((group, index) => ({
    category: group.category.trim(),
    difficulty: (index + 1) as Difficulty,
    words: group.words.map((word) => word.trim()) as Group["words"],
  })) as Puzzle["groups"];
}

function asRow(value: unknown): OfficialPuzzleRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as OfficialPuzzleRow;
  if (typeof row.id !== "number" || typeof row.puzzle_id !== "number") {
    return null;
  }
  if (!Array.isArray(row.groups) || row.groups.length !== 4) return null;
  return {
    id: row.id,
    puzzle_id: row.puzzle_id,
    date: row.date ?? null,
    author: row.author || "COMMS",
    notes: row.notes ?? "",
    groups: row.groups,
  };
}

export async function fetchLiveOfficialPuzzles(
  client: SupabaseClient,
): Promise<{ rows: Puzzle[]; error: string | null }> {
  const { data, error } = await client
    .from("official_puzzles")
    .select("id, puzzle_id, date, author, notes, groups")
    .not("date", "is", null)
    .order("date", { ascending: true });

  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? [])
      .map(asRow)
      .filter((row): row is OfficialPuzzleRow => Boolean(row))
      .filter((row) => Boolean(row.date))
      .map(rowToPuzzle),
    error: null,
  };
}

export async function fetchAllOfficialPuzzles(
  client: SupabaseClient,
): Promise<{ rows: OfficialPuzzleRow[]; error: string | null }> {
  const { data, error } = await client
    .from("official_puzzles")
    .select("id, puzzle_id, date, author, notes, groups")
    .order("date", { ascending: true, nullsFirst: true })
    .order("puzzle_id", { ascending: true });

  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? [])
      .map(asRow)
      .filter((row): row is OfficialPuzzleRow => Boolean(row)),
    error: null,
  };
}

export async function claimEditorSeat(
  client: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await client.rpc("claim_editor_seat");
  if (error) return false;
  return Boolean(data);
}

export async function saveOfficialPuzzle(
  client: SupabaseClient,
  input: {
    rowId?: number;
    puzzleId: number;
    draft: OfficialDraft;
  },
): Promise<string | null> {
  const payload = {
    puzzle_id: input.puzzleId,
    date: input.draft.date.trim() || null,
    author: input.draft.author.trim() || "COMMS",
    notes: input.draft.notes.trim(),
    groups: draftToGroups(input.draft),
    updated_at: new Date().toISOString(),
  };

  if (input.rowId) {
    const { error } = await client
      .from("official_puzzles")
      .update(payload)
      .eq("id", input.rowId);
    return error?.message ?? null;
  }

  const { error } = await client.from("official_puzzles").insert(payload);
  return error?.message ?? null;
}

export async function deleteOfficialPuzzle(
  client: SupabaseClient,
  rowId: number,
): Promise<string | null> {
  const { error } = await client.from("official_puzzles").delete().eq("id", rowId);
  return error?.message ?? null;
}
