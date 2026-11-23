import { COMMS_RANK_ORDER, type CommsRank } from "../theme";
import type { Difficulty, Puzzle, PuzzleProgress } from "./types";

export type { CommsRank };

/** Radiant, Immortal, Gold, Iron — hardest group to easiest. */
export const RADIANT_SOLVE_ORDER: Difficulty[] = [4, 3, 2, 1];

export function isRadiantSolve(puzzle: Puzzle, solved: number[]): boolean {
  if (solved.length !== puzzle.groups.length) return false;
  return solved.every((groupIndex, i) => {
    const group = puzzle.groups[groupIndex];
    return group?.difficulty === RADIANT_SOLVE_ORDER[i];
  });
}

export function commsRankFromResult(
  won: boolean,
  mistakes: number,
  radiant = false,
): CommsRank {
  if (!won) return "Iron";
  if (radiant) return "Radiant";
  if (mistakes <= 0) return "Immortal";
  if (mistakes === 1) return "Diamond";
  if (mistakes === 2) return "Plat";
  return "Silver";
}

export function commsRankFromProgress(
  puzzle: Puzzle,
  progress: Pick<PuzzleProgress, "status" | "mistakes" | "solved">,
): CommsRank {
  const won = progress.status === "won";
  return commsRankFromResult(
    won,
    progress.mistakes,
    won && isRadiantSolve(puzzle, progress.solved),
  );
}

export function commsRankScore(rank: CommsRank): number {
  return COMMS_RANK_ORDER.indexOf(rank);
}

export function commsRankFromAverage(avg: number): CommsRank {
  const max = COMMS_RANK_ORDER.length - 1;
  const index = Math.round(Math.min(max, Math.max(0, avg)));
  return COMMS_RANK_ORDER[index] ?? "Iron";
}

export function rankScoreFromResult(
  won: boolean,
  mistakes: number,
  radiant = false,
): number {
  return commsRankScore(commsRankFromResult(won, mistakes, radiant));
}

export type RankDistribution = [number, number, number, number, number, number];

export function emptyRankDistribution(): RankDistribution {
  return [0, 0, 0, 0, 0, 0];
}

export function rankDistributionFromMistakes(
  mistakes: [number, number, number, number, number],
): RankDistribution {
  return [
    mistakes[4] ?? 0,
    mistakes[3] ?? 0,
    mistakes[2] ?? 0,
    mistakes[1] ?? 0,
    mistakes[0] ?? 0,
    0,
  ];
}
