import { describe, expect, it } from "vitest";
import {
  buildArchiveDays,
  displayNameFromUser,
  isOfficialDaily,
  missedEveryDaily,
  playerStanding,
  rankByCommsRank,
  rankByStreak,
  suggestedUsername,
  validateUsername,
  type DailyRankRow,
  type LeaderboardRow,
} from "./leaderboard";
import type { Puzzle } from "../game/types";

const official: Puzzle = {
  id: 1,
  date: "2026-11-21",
  groups: [
    { category: "A", difficulty: 1, words: ["a", "b", "c", "d"] },
    { category: "B", difficulty: 2, words: ["e", "f", "g", "h"] },
    { category: "C", difficulty: 3, words: ["i", "j", "k", "l"] },
    { category: "D", difficulty: 4, words: ["m", "n", "o", "p"] },
  ],
};

describe("leaderboard helpers", () => {
  it("only treats dated official puzzles as dailies", () => {
    expect(isOfficialDaily(official)).toBe(true);
    expect(isOfficialDaily({ ...official, id: -12 })).toBe(false);
    expect(isOfficialDaily({ ...official, date: "1970-01-01" })).toBe(false);
  });

  it("ranks longest streaks then highest comms ranks", () => {
    const rows: LeaderboardRow[] = [
      {
        user_id: "a",
        display_name: "Alpha",
        current_streak: 2,
        max_streak: 4,
        rank_avg: 2,
        dailies_played: 4,
      },
      {
        user_id: "b",
        display_name: "Bravo",
        current_streak: 5,
        max_streak: 5,
        rank_avg: 3.75,
        dailies_played: 5,
      },
    ];
    expect(rankByStreak(rows)[0]?.user_id).toBe("b");
    expect(rankByCommsRank(rows)[0]?.user_id).toBe("b");
    expect(
      rankByCommsRank(rows, { minPlays: 5 }).map((row) => row.user_id),
    ).toEqual(["b"]);

    const standing = playerStanding(rows, "a");
    expect(standing.streakRank).toBe(2);
    expect(standing.commsRank).toBe("Plat");
    expect(standing.row?.dailies_played).toBe(4);
    expect(playerStanding(rows, "missing").row).toBeNull();
  });

  it("builds a short display name", () => {
    expect(displayNameFromUser({ fullName: "Jett Main" })).toBe("Jett Main");
    expect(displayNameFromUser({ firstName: "Viper", lastName: "Main" })).toBe(
      "Viper Main",
    );
    expect(displayNameFromUser({ username: "omen" })).toBe("omen");
    expect(displayNameFromUser({ email: "jett.main@example.com" })).toBe(
      "jett main",
    );
    expect(displayNameFromUser({})).toBe("Agent");
  });

  it("suggests and validates a chosen username", () => {
    expect(suggestedUsername({ fullName: "Jett Main" })).toBe("Jett_Main");
    expect(suggestedUsername({})).toBe("");
    expect(validateUsername("jett")).toBeNull();
    expect(validateUsername("ab")).toBe("Use at least 3 characters.");
    expect(validateUsername("jett main")).toBe(
      "Letters, numbers, and underscores only.",
    );
  });

  it("builds archive days with ranks and missed dailies", () => {
    const first = { ...official, id: 1, date: "2026-11-20" };
    const second = { ...official, id: 2, date: "2026-11-21" };
    const ranks: DailyRankRow[] = [
      {
        puzzle_id: 2,
        puzzle_date: "2026-11-21",
        won: true,
        mistakes: 0,
        radiant: false,
        daily_players: 1,
      },
    ];
    const days = buildArchiveDays([second, first], ranks);
    expect(days[0]?.mine?.mistakes).toBe(0);
    expect(days[1]?.mine).toBeNull();
    expect(missedEveryDaily(days)).toBe(false);
    expect(missedEveryDaily(buildArchiveDays([first], []))).toBe(true);
  });
});
