import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState, gameReducer } from "./reducer";
import {
  clearPuzzleProgress,
  emptySavedState,
  loadSavedState,
  progressFromGame,
  saveGameProgress,
  STORAGE_KEY,
} from "./storage";
import type { Puzzle } from "./types";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
    },
  });
});

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
      category: "CHAMPIONS",
      difficulty: 2,
      words: ["Acend", "LOUD", "Evil Geniuses", "EDward Gaming"],
    },
    {
      category: "CONTROLLERS",
      difficulty: 3,
      words: ["Brimstone", "Viper", "Astra", "Harbor"],
    },
    {
      category: "WORDPLAY",
      difficulty: 4,
      words: ["Omen", "Raze", "Sage", "Iso"],
    },
  ],
};

describe("storage", () => {
  it("returns empty state when nothing is stored", () => {
    expect(loadSavedState()).toEqual(emptySavedState());
  });

  it("persists mid-game progress including board order", () => {
    let state = createInitialState(puzzle, { shuffle: false });
    state = ["Ascent", "Bind", "Lotus", "Pearl"].reduce(
      (s, word) => gameReducer(s, { type: "SELECT", word }),
      state,
    );
    state = gameReducer(state, { type: "SUBMIT" });
    state = gameReducer(state, { type: "COMMIT_SOLVE" });

    saveGameProgress(state);
    const saved = loadSavedState();
    const progress = saved.byPuzzle[1]!;

    expect(progress.solved).toEqual([0]);
    expect(progress.mistakes).toBe(0);
    expect(progress.status).toBe("playing");
    expect(progress.board).toEqual(state.board);
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
  });

  it("updates stats only once when a puzzle finishes", () => {
    let state = createInitialState(puzzle, { shuffle: false });
    for (const words of [
      ["Ascent", "Bind", "Lotus", "Pearl"],
      ["Acend", "LOUD", "Evil Geniuses", "EDward Gaming"],
      ["Brimstone", "Viper", "Astra", "Harbor"],
      ["Omen", "Raze", "Sage", "Iso"],
    ]) {
      state = words.reduce(
        (s, word) => gameReducer(s, { type: "SELECT", word }),
        gameReducer(state, { type: "DESELECT_ALL" }),
      );
      state = gameReducer(state, { type: "SUBMIT" });
      state = gameReducer(state, { type: "COMMIT_SOLVE" });
    }

    expect(state.status).toBe("won");
    let saved = saveGameProgress(state);
    expect(saved.stats.played).toBe(1);
    expect(saved.stats.won).toBe(1);
    expect(saved.stats.mistakeDistribution[0]).toBe(1);
    expect(saved.stats.rankDistribution[4]).toBe(1);

    saved = saveGameProgress(state);
    expect(saved.stats.played).toBe(1);
  });

  it("can persist a guest game without touching career stats", () => {
    let state = createInitialState(puzzle, { shuffle: false });
    for (const words of [
      ["Ascent", "Bind", "Lotus", "Pearl"],
      ["Acend", "LOUD", "Evil Geniuses", "EDward Gaming"],
      ["Brimstone", "Viper", "Astra", "Harbor"],
      ["Omen", "Raze", "Sage", "Iso"],
    ]) {
      state = words.reduce(
        (s, word) => gameReducer(s, { type: "SELECT", word }),
        gameReducer(state, { type: "DESELECT_ALL" }),
      );
      state = gameReducer(state, { type: "SUBMIT" });
      state = gameReducer(state, { type: "COMMIT_SOLVE" });
    }

    const saved = saveGameProgress(state, { updateStats: false });
    expect(saved.byPuzzle[1]?.status).toBe("won");
    expect(saved.stats.played).toBe(0);
    expect(saved.stats.won).toBe(0);
  });

  it("clears a puzzle without wiping career stats", () => {
    let state = createInitialState(puzzle, { shuffle: false });
    for (const words of [
      ["Ascent", "Bind", "Lotus", "Pearl"],
      ["Acend", "LOUD", "Evil Geniuses", "EDward Gaming"],
      ["Brimstone", "Viper", "Astra", "Harbor"],
      ["Omen", "Raze", "Sage", "Iso"],
    ]) {
      state = words.reduce(
        (s, word) => gameReducer(s, { type: "SELECT", word }),
        gameReducer(state, { type: "DESELECT_ALL" }),
      );
      state = gameReducer(state, { type: "SUBMIT" });
      state = gameReducer(state, { type: "COMMIT_SOLVE" });
    }

    saveGameProgress(state);
    const saved = clearPuzzleProgress(1);
    expect(saved.byPuzzle[1]).toBeUndefined();
    expect(saved.stats.played).toBe(1);
    expect(saved.stats.won).toBe(1);
  });

  it("round-trips progressFromGame fields", () => {
    const state = createInitialState(puzzle, {
      board: ["Omen", "Ascent", "Raze", "Bind"],
    });
    const progress = progressFromGame(state);
    expect(progress.board).toEqual(["Omen", "Ascent", "Raze", "Bind"]);
  });
});
