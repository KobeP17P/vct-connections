import {
  commsRankFromProgress,
  commsRankScore,
  emptyRankDistribution,
  rankDistributionFromMistakes,
  type RankDistribution,
} from "./ranks";
import { commitPendingSolve } from "./reducer";
import type { GameState, PuzzleProgress, SavedState } from "./types";

export const STORAGE_KEY = "comms:v1";

export function emptySavedState(): SavedState {
  return {
    byPuzzle: {},
    stats: {
      played: 0,
      won: 0,
      currentStreak: 0,
      maxStreak: 0,
      mistakeDistribution: [0, 0, 0, 0, 0],
      rankDistribution: emptyRankDistribution(),
    },
  };
}

function isPuzzleProgress(value: unknown): value is PuzzleProgress {
  if (!value || typeof value !== "object") return false;
  const v = value as PuzzleProgress;
  return (
    Array.isArray(v.guesses) &&
    Array.isArray(v.solved) &&
    typeof v.mistakes === "number" &&
    (v.status === "playing" || v.status === "won" || v.status === "lost")
  );
}

function isSavedState(value: unknown): value is SavedState {
  if (!value || typeof value !== "object") return false;
  const v = value as SavedState;
  return Boolean(v.byPuzzle) && Boolean(v.stats) && Array.isArray(v.stats.mistakeDistribution);
}

export function loadSavedState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySavedState();
    const parsed: unknown = JSON.parse(raw);
    if (!isSavedState(parsed)) return emptySavedState();
    return {
      ...parsed,
      stats: {
        ...parsed.stats,
        rankDistribution: normalizeRankDistribution(parsed.stats),
      },
    };
  } catch {
    return emptySavedState();
  }
}

export function writeSavedState(state: SavedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota — keep the in-memory result without crashing.
  }
}

export function progressFromGame(state: GameState): PuzzleProgress {
  const snapshot =
    state.pendingSolve !== null ? commitPendingSolve(state) : state;
  return {
    guesses: snapshot.guesses.map((g) => [...g]),
    solved: [...snapshot.solved],
    mistakes: snapshot.mistakes,
    status: snapshot.status,
    board: [...snapshot.board],
  };
}

/**
 * Persist mid-game / end-game progress. Updates lifetime stats the first time
 * a puzzle finishes (won or lost), unless `updateStats` is false (custom games).
 */
export function saveGameProgress(
  state: GameState,
  options?: { updateStats?: boolean },
): SavedState {
  const updateStats = options?.updateStats ?? true;
  const saved = loadSavedState();
  const prev = saved.byPuzzle[state.puzzle.id];
  const snapshot =
    state.pendingSolve !== null ? commitPendingSolve(state) : state;
  const progress = progressFromGame(state);

  const finishing =
    updateStats &&
    (snapshot.status === "won" || snapshot.status === "lost") &&
    (!prev || prev.status === "playing");

  const next: SavedState = {
    ...saved,
    byPuzzle: {
      ...saved.byPuzzle,
      [state.puzzle.id]: progress,
    },
    stats: finishing ? applyFinishStats(saved.stats, snapshot) : saved.stats,
  };

  writeSavedState(next);
  return next;
}

function applyFinishStats(
  stats: SavedState["stats"],
  state: GameState,
): SavedState["stats"] {
  const played = stats.played + 1;
  const won = state.status === "won" ? stats.won + 1 : stats.won;
  const currentStreak =
    state.status === "won" ? stats.currentStreak + 1 : 0;
  const maxStreak = Math.max(stats.maxStreak, currentStreak);

  const mistakeDistribution = [...stats.mistakeDistribution] as SavedState["stats"]["mistakeDistribution"];
  if (state.status === "won") {
    const bucket = Math.min(3, Math.max(0, state.mistakes));
    mistakeDistribution[bucket] = (mistakeDistribution[bucket] ?? 0) + 1;
  } else {
    mistakeDistribution[4] = (mistakeDistribution[4] ?? 0) + 1;
  }

  const rankDistribution = [
    ...normalizeRankDistribution(stats),
  ] as RankDistribution;
  if (state.status === "won" || state.status === "lost") {
    const rank = commsRankFromProgress(state.puzzle, state);
    const index = commsRankScore(rank);
    rankDistribution[index] = (rankDistribution[index] ?? 0) + 1;
  }

  return {
    played,
    won,
    currentStreak,
    maxStreak,
    mistakeDistribution,
    rankDistribution,
  };
}

function normalizeRankDistribution(
  stats: SavedState["stats"],
): RankDistribution {
  const current = stats.rankDistribution;
  if (Array.isArray(current) && current.length === 6) {
    return [
      current[0] ?? 0,
      current[1] ?? 0,
      current[2] ?? 0,
      current[3] ?? 0,
      current[4] ?? 0,
      current[5] ?? 0,
    ];
  }
  return rankDistributionFromMistakes(stats.mistakeDistribution);
}

export function getPuzzleProgress(
  saved: SavedState,
  puzzleId: number,
): PuzzleProgress | undefined {
  const progress = saved.byPuzzle[puzzleId];
  return isPuzzleProgress(progress) ? progress : undefined;
}

/** Drop one puzzle's board so it can be played again. Career stats stay. */
export function clearPuzzleProgress(puzzleId: number): SavedState {
  const saved = loadSavedState();
  const { [puzzleId]: _removed, ...byPuzzle } = saved.byPuzzle;
  const next: SavedState = { ...saved, byPuzzle };
  writeSavedState(next);
  return next;
}
