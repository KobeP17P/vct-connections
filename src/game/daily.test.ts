import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatDisplayDate,
  formatLocalDate,
  getDailyPuzzle,
  getTodayPuzzle,
  msUntilNextLocalMidnight,
} from "./daily";
import type { Puzzle } from "./types";

const baseGroups = [
  { category: "A", difficulty: 1 as const, words: ["a", "b", "c", "d"] as [string, string, string, string] },
  { category: "B", difficulty: 2 as const, words: ["e", "f", "g", "h"] as [string, string, string, string] },
  { category: "C", difficulty: 3 as const, words: ["i", "j", "k", "l"] as [string, string, string, string] },
  { category: "D", difficulty: 4 as const, words: ["m", "n", "o", "p"] as [string, string, string, string] },
];

function puzzle(id: number, date: string): Puzzle {
  return { id, date, groups: baseGroups as Puzzle["groups"] };
}

describe("getDailyPuzzle", () => {
  const puzzles = [
    puzzle(1, "2026-11-18"),
    puzzle(2, "2026-11-20"),
    puzzle(3, "2026-11-22"),
  ];

  it("returns the puzzle matching today's local date", () => {
    expect(getDailyPuzzle(puzzles, new Date(2026, 10, 20)).id).toBe(2);
    expect(getTodayPuzzle(puzzles, new Date(2026, 10, 20))?.id).toBe(2);
    expect(getTodayPuzzle(puzzles, new Date(2026, 10, 21))).toBeUndefined();
  });

  it("falls back to the most recent past puzzle", () => {
    expect(getDailyPuzzle(puzzles, new Date(2026, 10, 21)).id).toBe(2);
  });

  it("uses the earliest puzzle when all are in the future", () => {
    expect(getDailyPuzzle(puzzles, new Date(2026, 10, 1)).id).toBe(1);
  });
});

describe("countdown helpers", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("formats ISO dates in words", () => {
    expect(formatDisplayDate("2026-11-21")).toBe("November 21, 2026");
    expect(formatDisplayDate("2026-01-05")).toBe("January 5, 2026");
  });

  it("formats countdown as HH:MM:SS", () => {
    expect(formatCountdown(3661000)).toBe("01:01:01");
  });

  it("returns a non-negative ms until midnight", () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 10, 20, 23, 59, 0))).toBeLessThan(
      60_000 + 50,
    );
    expect(msUntilNextLocalMidnight(new Date(2026, 10, 20, 23, 59, 0))).toBeGreaterThan(0);
  });
});
