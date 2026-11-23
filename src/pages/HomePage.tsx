import { GameView } from "../components/GameView";
import { usePuzzleCatalog } from "../components/PuzzleCatalog";
import { getTodayPuzzle } from "../game/daily";

export function HomePage() {
  const { puzzles, loading } = usePuzzleCatalog();
  if (loading) {
    return (
      <p className="mx-auto max-w-[390px] text-center font-body text-sm text-comms-muted">
        Loading VCT COMMS…
      </p>
    );
  }

  const puzzle = getTodayPuzzle(puzzles);
  if (!puzzle) {
    return (
      <div className="mx-auto max-w-[390px] text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-comms-accent">
          Daily
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-wide text-comms-text">
          No VCT COMMS today
        </h1>
        <p className="mt-2 font-body text-sm text-comms-muted">
          Today&apos;s puzzle is not live yet. Past VCT COMMS close after the day
          ends.
        </p>
      </div>
    );
  }

  return <GameView key={puzzle.id} puzzle={puzzle} badge="Daily" />;
}
