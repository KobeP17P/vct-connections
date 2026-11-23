import { Link, useParams } from "react-router-dom";
import { RequireEditor } from "../components/AccountGate";
import { GameView } from "../components/GameView";
import { usePuzzleCatalog } from "../components/PuzzleCatalog";
import { formatDisplayDate, formatLocalDate } from "../game/daily";

const ARCHIVE_LOCK =
  "Past VCT COMMS close after the day ends. Today's puzzle stays on the home tab.";

export function PuzzlePage() {
  const { id } = useParams();
  const puzzleId = Number(id);
  const { puzzles, loading } = usePuzzleCatalog();
  const puzzle = Number.isFinite(puzzleId)
    ? puzzles.find((item) => item.id === puzzleId)
    : undefined;
  const todayKey = formatLocalDate();

  if (loading && !puzzle) {
    return (
      <p className="mx-auto max-w-[390px] text-center font-body text-sm text-comms-muted">
        Loading VCT COMMS…
      </p>
    );
  }

  if (!puzzle) {
    return (
      <div className="mx-auto max-w-[390px] text-center">
        <h1 className="font-display text-3xl text-comms-text">Not found</h1>
        <p className="mt-2 font-body text-sm text-comms-muted">
          That puzzle does not exist.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block font-body text-sm font-semibold text-comms-accent"
        >
          Back to today
        </Link>
      </div>
    );
  }

  if (puzzle.date > todayKey) {
    return (
      <div className="mx-auto max-w-[390px] text-center">
        <h1 className="font-display text-3xl text-comms-text">Not live yet</h1>
        <p className="mt-2 font-body text-sm text-comms-muted">
          This puzzle unlocks on {formatDisplayDate(puzzle.date)}.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block font-body text-sm font-semibold text-comms-accent"
        >
          Back to today
        </Link>
      </div>
    );
  }

  const game = (
    <GameView
      key={puzzle.id}
      puzzle={puzzle}
      badge={puzzle.date === todayKey ? "Daily" : "Archive"}
    />
  );

  if (puzzle.date === todayKey) return game;

  return (
    <RequireEditor
      title="Archive"
      body={ARCHIVE_LOCK}
      action={
        <Link
          to="/"
          className="clip-angled mt-6 inline-block bg-comms-accent px-5 py-3 font-body text-sm font-semibold uppercase tracking-wide text-white"
        >
          Play today
        </Link>
      }
    >
      {game}
    </RequireEditor>
  );
}
