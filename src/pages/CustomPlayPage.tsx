import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { GameView } from "../components/GameView";
import { isClerkConfigured } from "../auth/clerk";
import { canOpenEditorUi } from "../auth/editor";
import { customShareTitle, decodeCustomPuzzle } from "../game/customPuzzle";

export function CustomPlayPage() {
  const [params] = useSearchParams();
  const encoded = params.get("p") ?? "";
  const puzzle = decodeCustomPuzzle(encoded);

  if (!puzzle) {
    return (
      <div className="mx-auto max-w-[390px] text-center">
        <h1 className="font-display text-3xl text-comms-text">Broken link</h1>
        <p className="mt-2 font-body text-sm text-comms-muted">
          This custom puzzle could not be loaded. Ask the creator for a new
          link.
        </p>
      </div>
    );
  }

  const puzzleLink =
    typeof window === "undefined"
      ? `/play?p=${encodeURIComponent(encoded)}`
      : `${window.location.origin}/play?p=${encodeURIComponent(encoded)}`;

  return (
    <div>
      <GameView
        key={encoded}
        puzzle={puzzle}
        badge="Custom"
        persistProgress
        countTowardStats={false}
        hidePuzzleNumber
        shareTitle={customShareTitle(puzzle)}
        puzzleLink={puzzleLink}
      />
      <EditorPuzzleLink encoded={encoded} />
    </div>
  );
}

function EditorPuzzleLink({ encoded }: { encoded: string }) {
  if (!isClerkConfigured()) return null;
  return <EditorPuzzleLinkInner encoded={encoded} />;
}

function EditorPuzzleLinkInner({ encoded }: { encoded: string }) {
  const { isSignedIn, userId } = useAuth();
  if (!isSignedIn || !canOpenEditorUi(userId)) {
    return null;
  }

  return (
    <p className="mx-auto mt-6 max-w-[390px] text-center">
      <Link
        to={`/create?p=${encodeURIComponent(encoded)}`}
        className="font-body text-xs font-semibold uppercase tracking-wide text-comms-muted hover:text-comms-accent"
      >
        Edit this puzzle
      </Link>
    </p>
  );
}
