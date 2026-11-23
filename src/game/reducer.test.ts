import { describe, expect, it } from "vitest";
import { createInitialState, gameReducer } from "./reducer";
import type { Puzzle } from "./types";

const puzzle: Puzzle = {
  id: 1,
  date: "2026-11-20",
  groups: [
    {
      category: "MAPS",
      difficulty: 1,
      words: ["Ascent", "Bind", "Lotus", "Pearl"],
    },
    {
      category: "CHAMPIONS WINNERS (2021–2024)",
      difficulty: 2,
      words: ["Acend", "LOUD", "Evil Geniuses", "EDward Gaming"],
    },
    {
      category: "CONTROLLERS",
      difficulty: 3,
      words: ["Brimstone", "Viper", "Astra", "Harbor"],
    },
    {
      category: "ADD A LETTER IN FRONT TO MAKE A WORD",
      difficulty: 4,
      words: ["Omen", "Raze", "Sage", "Iso"],
    },
  ],
};

function start() {
  return createInitialState(puzzle, { shuffle: false });
}

function selectWords(state: ReturnType<typeof start>, words: string[]) {
  return words.reduce(
    (s, word) => gameReducer(s, { type: "SELECT", word }),
    state,
  );
}

function submitGuess(state: ReturnType<typeof start>, words: string[]) {
  return gameReducer(selectWords(state, words), { type: "SUBMIT" });
}

function submitAndCommit(state: ReturnType<typeof start>, words: string[]) {
  return gameReducer(submitGuess(state, words), { type: "COMMIT_SOLVE" });
}

describe("SELECT / DESELECT", () => {
  it("selects a tile and deselects it", () => {
    let state = start();
    state = gameReducer(state, { type: "SELECT", word: "Ascent" });
    expect(state.selected).toEqual(["Ascent"]);

    state = gameReducer(state, { type: "DESELECT", word: "Ascent" });
    expect(state.selected).toEqual([]);
  });

  it("blocks a 5th selection", () => {
    const four = ["Ascent", "Bind", "Lotus", "Pearl"];
    let state = selectWords(start(), four);
    expect(state.selected).toHaveLength(4);

    state = gameReducer(state, { type: "SELECT", word: "Omen" });
    expect(state.selected).toEqual(four);
    expect(state.selected).not.toContain("Omen");
  });

  it("clears all selected tiles with DESELECT_ALL", () => {
    let state = selectWords(start(), ["Ascent", "Bind"]);
    state = gameReducer(state, { type: "DESELECT_ALL" });
    expect(state.selected).toEqual([]);
  });
});

describe("SUBMIT", () => {
  it("accepts a correct guess and moves the group into solved", () => {
    const staged = submitGuess(start(), ["Ascent", "Bind", "Lotus", "Pearl"]);
    expect(staged.feedback).toBe("correct");
    expect(staged.pendingSolve).toBe(0);
    expect(staged.selected).toEqual(["Ascent", "Bind", "Lotus", "Pearl"]);
    expect(staged.board).toContain("Ascent");
    expect(staged.solved).toEqual([]);

    const state = gameReducer(staged, { type: "COMMIT_SOLVE" });
    expect(state.solved).toEqual([0]);
    expect(state.mistakes).toBe(0);
    expect(state.selected).toEqual([]);
    expect(state.pendingSolve).toBeNull();
    expect(state.board).not.toContain("Ascent");
    expect(state.board).toHaveLength(12);
    expect(state.status).toBe("playing");
  });

  it("penalizes a wrong guess", () => {
    // One tile from each group — not a correct set and not one away
    const state = submitGuess(start(), [
      "Ascent",
      "Acend",
      "Brimstone",
      "Omen",
    ]);

    expect(state.feedback).toBe("incorrect");
    expect(state.mistakes).toBe(1);
    expect(state.solved).toEqual([]);
    expect(state.guesses).toHaveLength(1);
    expect(state.status).toBe("playing");
  });

  it("shows one away when 3 tiles share a group", () => {
    const state = submitGuess(start(), ["Ascent", "Bind", "Lotus", "Omen"]);

    expect(state.feedback).toBe("one_away");
    expect(state.mistakes).toBe(1);
  });

  it("does not penalize an already-guessed set", () => {
    let state = submitGuess(start(), ["Ascent", "Bind", "Lotus", "Omen"]);
    expect(state.mistakes).toBe(1);
    expect(state.feedback).toBe("one_away");

    // Reselect the same four (order shuffled) and submit again
    state = gameReducer(state, { type: "DESELECT_ALL" });
    state = submitGuess(state, ["Omen", "Lotus", "Ascent", "Bind"]);

    expect(state.feedback).toBe("already_guessed");
    expect(state.mistakes).toBe(1);
    expect(state.guesses).toHaveLength(1);
  });

  it("wins when all four groups are found", () => {
    let state = start();
    state = submitAndCommit(state, ["Ascent", "Bind", "Lotus", "Pearl"]);
    state = submitAndCommit(state, ["Acend", "LOUD", "Evil Geniuses", "EDward Gaming"]);
    state = submitAndCommit(state, ["Brimstone", "Viper", "Astra", "Harbor"]);
    state = submitAndCommit(state, ["Omen", "Raze", "Sage", "Iso"]);

    expect(state.status).toBe("won");
    expect(state.solved).toEqual([0, 1, 2, 3]);
    expect(state.mistakes).toBe(0);
    expect(state.board).toEqual([]);
  });

  it("loses after 4 mistakes", () => {
    let state = start();
    const wrongGuesses = [
      ["Ascent", "Bind", "Lotus", "Omen"],
      ["Ascent", "Bind", "Lotus", "Raze"],
      ["Ascent", "Bind", "Lotus", "Sage"],
      ["Ascent", "Bind", "Lotus", "Iso"],
    ];

    for (const guess of wrongGuesses) {
      state = gameReducer(state, { type: "DESELECT_ALL" });
      state = submitGuess(state, guess);
    }

    expect(state.mistakes).toBe(4);
    expect(state.status).toBe("lost");
    expect(state.solved).toEqual([]);
  });
});

describe("SHUFFLE and RESTORE", () => {
  it("shuffles only the unsolved board tiles", () => {
    let state = submitAndCommit(start(), ["Ascent", "Bind", "Lotus", "Pearl"]);
    const before = [...state.board];

    // Force a different order by shuffling many times if needed
    let changed = false;
    for (let i = 0; i < 20; i += 1) {
      state = gameReducer(state, { type: "SHUFFLE" });
      if (state.board.join("|") !== before.join("|")) {
        changed = true;
        break;
      }
    }

    expect(state.board).toHaveLength(12);
    expect(new Set(state.board)).toEqual(new Set(before));
    expect(changed).toBe(true);
  });

  it("restores mid-game progress exactly", () => {
    const mid = submitAndCommit(start(), ["Ascent", "Bind", "Lotus", "Pearl"]);
    const progress = {
      guesses: mid.guesses,
      solved: mid.solved,
      mistakes: 2,
      status: "playing" as const,
    };

    const board = ["Omen", "Raze", "Sage", "Iso", "Acend", "LOUD", "Evil Geniuses", "EDward Gaming", "Brimstone", "Viper", "Astra", "Harbor"];
    let state = start();
    state = gameReducer(state, { type: "RESTORE", progress, board });

    expect(state.solved).toEqual([0]);
    expect(state.mistakes).toBe(2);
    expect(state.board).toEqual(board);
    expect(state.selected).toEqual([]);
    expect(state.status).toBe("playing");
  });

  it("resets a finished puzzle to a fresh board", () => {
    let state = submitGuess(start(), ["Ascent", "Bind", "Lotus", "Pearl"]);
    state = gameReducer(state, { type: "RESET" });
    expect(state.status).toBe("playing");
    expect(state.solved).toEqual([]);
    expect(state.guesses).toEqual([]);
    expect(state.mistakes).toBe(0);
    expect(state.board).toHaveLength(16);
  });
});
