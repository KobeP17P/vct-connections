import type { GameState, Group } from "../game/types";
import { SolvedRow } from "./SolvedRow";
import { Tile } from "./Tile";

interface BoardProps {
  state: GameState;
  shakeWords: string[];
  celebrateWords: string[];
  /** How many unsolved groups to show after a loss (staggered). */
  revealedLossCount: number;
  inputLocked: boolean;
  onToggle: (word: string) => void;
}

function unsolvedGroups(state: GameState): Group[] {
  return state.puzzle.groups
    .map((group, index) => ({ group, index }))
    .filter(({ index }) => !state.solved.includes(index))
    .sort((a, b) => a.group.difficulty - b.group.difficulty)
    .map(({ group }) => group);
}

export function Board({
  state,
  shakeWords,
  celebrateWords,
  revealedLossCount,
  inputLocked,
  onToggle,
}: BoardProps) {
  const { puzzle, board, selected, solved, status } = state;
  const playing = status === "playing";

  const solvedGroups = solved.map((index) => puzzle.groups[index]!);
  const lossGroups =
    status === "lost" ? unsolvedGroups(state).slice(0, revealedLossCount) : [];

  return (
    <div className="relative mx-auto flex w-full max-w-[390px] flex-col gap-2">
      {solvedGroups.map((group) => (
        <SolvedRow key={`solved-${group.category}`} group={group} />
      ))}

      {status === "lost" ? (
        lossGroups.map((group) => (
          <SolvedRow key={`reveal-${group.category}`} group={group} />
        ))
      ) : board.length > 0 ? (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Puzzle tiles">
          {board.map((word) => (
            <Tile
              key={word}
              word={word}
              selected={selected.includes(word)}
              shaking={shakeWords.includes(word)}
              celebrating={celebrateWords.includes(word)}
              disabled={!playing || inputLocked}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
