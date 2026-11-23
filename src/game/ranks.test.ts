import { describe, expect, it } from "vitest";
import {
  commsRankFromAverage,
  commsRankFromProgress,
  commsRankFromResult,
  commsRankScore,
  isRadiantSolve,
} from "./ranks";
import type { Puzzle } from "./types";

const puzzle: Puzzle = {
  id: 1,
  date: "2026-11-21",
  groups: [
    { category: "A", difficulty: 1, words: ["a", "b", "c", "d"] },
    { category: "B", difficulty: 2, words: ["e", "f", "g", "h"] },
    { category: "C", difficulty: 3, words: ["i", "j", "k", "l"] },
    { category: "D", difficulty: 4, words: ["m", "n", "o", "p"] },
  ],
};

describe("comms ranks", () => {
  it("maps mistakes to Iron through Immortal", () => {
    expect(commsRankFromResult(false, 4)).toBe("Iron");
    expect(commsRankFromResult(true, 3)).toBe("Silver");
    expect(commsRankFromResult(true, 2)).toBe("Plat");
    expect(commsRankFromResult(true, 1)).toBe("Diamond");
    expect(commsRankFromResult(true, 0)).toBe("Immortal");
    expect(commsRankFromResult(true, 0, true)).toBe("Radiant");
  });

  it("awards Radiant for Radiant → Immortal → Gold → Iron", () => {
    expect(isRadiantSolve(puzzle, [3, 2, 1, 0])).toBe(true);
    expect(isRadiantSolve(puzzle, [0, 1, 2, 3])).toBe(false);
    expect(
      commsRankFromProgress(puzzle, {
        status: "won",
        mistakes: 1,
        solved: [3, 2, 1, 0],
      }),
    ).toBe("Radiant");
    expect(
      commsRankFromProgress(puzzle, {
        status: "won",
        mistakes: 0,
        solved: [0, 1, 2, 3],
      }),
    ).toBe("Immortal");
  });

  it("rounds an average rank score to a named rank", () => {
    expect(commsRankFromAverage(0)).toBe("Iron");
    expect(commsRankFromAverage(1.4)).toBe("Silver");
    expect(commsRankFromAverage(2)).toBe("Plat");
    expect(commsRankFromAverage(3.2)).toBe("Diamond");
    expect(commsRankFromAverage(4)).toBe("Immortal");
    expect(commsRankFromAverage(5)).toBe("Radiant");
    expect(commsRankScore("Radiant")).toBe(5);
  });
});
