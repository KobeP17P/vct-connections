import type { Puzzle } from "./types";

/** Local calendar date as YYYY-MM-DD. */
export function formatLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Display an ISO calendar date as "November 21, 2026". */
export function formatDisplayDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Puzzle dated for today in the player's local timezone, if one exists. */
export function getTodayPuzzle(
  puzzles: Puzzle[],
  today: Date = new Date(),
): Puzzle | undefined {
  const todayKey = formatLocalDate(today);
  return puzzles.find((puzzle) => puzzle.date === todayKey);
}

/**
 * Pick the puzzle whose `date` matches today in the player's local timezone.
 * If none match, fall back to the most recent past puzzle.
 */
export function getDailyPuzzle(
  puzzles: Puzzle[],
  today: Date = new Date(),
): Puzzle {
  if (puzzles.length === 0) {
    throw new Error("No puzzles available");
  }

  const exact = getTodayPuzzle(puzzles, today);
  if (exact) return exact;

  const todayKey = formatLocalDate(today);
  const past = puzzles
    .filter((p) => p.date <= todayKey)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (past[0]) return past[0];

  // All puzzles are in the future — use the earliest one
  return [...puzzles].sort((a, b) => a.date.localeCompare(b.date))[0]!;
}

/** Milliseconds until next local midnight. */
export function msUntilNextLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
