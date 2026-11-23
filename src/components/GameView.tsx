import { useCallback, useEffect, useReducer, useState } from "react";
import { useAuth } from "@clerk/react";
import { Board } from "./Board";
import { Controls } from "./Controls";
import { EndModal } from "./EndModal";
import { MistakeDots } from "./MistakeDots";
import { Toast } from "./Toast";
import { createInitialState, gameReducer, restoreState } from "../game/reducer";
import { canSubmit } from "../game/selectors";
import {
  clearPuzzleProgress,
  getPuzzleProgress,
  loadSavedState,
  saveGameProgress,
} from "../game/storage";
import { formatDisplayDate } from "../game/daily";
import type { Puzzle, SavedState } from "../game/types";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { isClerkConfigured } from "../auth/clerk";
import { canOpenEditorUi } from "../auth/editor";
import { DailyResultSync } from "./DailyResultSync";
import { isSupabaseConfigured } from "../lib/supabase";

const SHAKE_MS = 380;
const COLLAPSE_LOCK_MS = 320;
const LOSS_STAGGER_MS = 600;

interface GameViewProps {
  puzzle: Puzzle;
  /** Shown under the title, e.g. "Daily" or "Archive". */
  badge?: string;
  persistProgress?: boolean;
  /** When false, guest progress still saves but does not change streak / win stats. */
  countTowardStats?: boolean;
  hidePuzzleNumber?: boolean;
  shareTitle?: string;
  puzzleLink?: string;
}

function initialGameState(puzzle: Puzzle, persistProgress: boolean) {
  if (persistProgress) {
    const saved = loadSavedState();
    const progress = getPuzzleProgress(saved, puzzle.id);
    if (progress) {
      return restoreState(puzzle, progress, progress.board);
    }
  }
  return createInitialState(puzzle);
}

export function GameView(props: GameViewProps) {
  if (!isClerkConfigured()) {
    return <GameViewCore {...props} canReplay={false} />;
  }
  return <GameViewWithAuth {...props} />;
}

function GameViewWithAuth(props: GameViewProps) {
  const { userId } = useAuth();
  return <GameViewCore {...props} canReplay={canOpenEditorUi(userId)} />;
}

function GameViewCore({
  puzzle,
  badge = "Daily",
  persistProgress = true,
  countTowardStats = persistProgress,
  hidePuzzleNumber = false,
  shareTitle,
  puzzleLink,
  canReplay,
}: GameViewProps & { canReplay: boolean }) {
  const [state, dispatch] = useReducer(
    gameReducer,
    puzzle,
    (p) => initialGameState(p, persistProgress),
  );
  const [stats, setStats] = useState<SavedState["stats"]>(
    () => loadSavedState().stats,
  );

  const reducedMotion = usePrefersReducedMotion();
  const [shakeWords, setShakeWords] = useState<string[]>([]);
  const [celebrateWords, setCelebrateWords] = useState<string[]>([]);
  const [inputLocked, setInputLocked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [revealedLossCount, setRevealedLossCount] = useState(0);
  const [endModalOpen, setEndModalOpen] = useState(
    () => state.status === "won" || state.status === "lost",
  );
  const [practice, setPractice] = useState(false);
  const clearToast = useCallback(() => setToast(null), []);

  const playing = state.status === "playing";
  const finished = state.status === "won" || state.status === "lost";
  const controlsDisabled = !playing || inputLocked;

  useEffect(() => {
    if (!persistProgress) return;
    const saved = saveGameProgress(state, {
      updateStats: countTowardStats && !practice,
    });
    setStats(saved.stats);
  }, [
    persistProgress,
    countTowardStats,
    practice,
    state.guesses,
    state.solved,
    state.pendingSolve,
    state.mistakes,
    state.status,
    state.board,
  ]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || controlsDisabled) return;
      if (!canSubmit(state.selected)) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "BUTTON") return;
      event.preventDefault();
      dispatch({ type: "SUBMIT" });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controlsDisabled, state.selected]);

  useEffect(() => {
    if (state.feedback === null) return;

    if (state.feedback === "already_guessed") {
      setToast("Already guessed!");
      dispatch({ type: "CLEAR_FEEDBACK" });
      return;
    }

    if (state.feedback === "one_away") {
      setToast("One away...");
    }

    if (state.feedback === "incorrect" || state.feedback === "one_away") {
      const words = [...state.selected];
      setShakeWords(words);
      setInputLocked(true);
      const shakeMs = reducedMotion ? 200 : SHAKE_MS;
      const id = window.setTimeout(() => {
        setShakeWords([]);
        setInputLocked(false);
        dispatch({ type: "CLEAR_FEEDBACK" });
      }, shakeMs);
      return () => window.clearTimeout(id);
    }

    if (state.feedback === "correct") {
      setCelebrateWords([...state.selected]);
      setInputLocked(true);
      const lockMs = reducedMotion ? 150 : COLLAPSE_LOCK_MS;
      const id = window.setTimeout(() => {
        setCelebrateWords([]);
        setInputLocked(false);
        dispatch({ type: "COMMIT_SOLVE" });
      }, lockMs);
      return () => window.clearTimeout(id);
    }
  }, [state.feedback, state.selected, reducedMotion]);

  useEffect(() => {
    if (state.status === "won") {
      setToast("Perfect VCT COMMS. You found every group.");
    } else if (state.status === "lost") {
      setToast("Out of mistakes. Revealing categories…");
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "lost") {
      setRevealedLossCount(0);
      return;
    }

    const remaining = state.puzzle.groups.length - state.solved.length;
    if (remaining <= 0) return;

    if (reducedMotion) {
      setRevealedLossCount(remaining);
      return;
    }

    setRevealedLossCount(1);
    if (remaining === 1) return;

    let shown = 1;
    const id = window.setInterval(() => {
      shown += 1;
      setRevealedLossCount(shown);
      if (shown >= remaining) window.clearInterval(id);
    }, LOSS_STAGGER_MS);

    return () => window.clearInterval(id);
  }, [state.status, state.puzzle.groups.length, state.solved.length, reducedMotion]);

  useEffect(() => {
    if (!finished) {
      setEndModalOpen(false);
      return;
    }

    const remaining = state.puzzle.groups.length - state.solved.length;
    const delay =
      state.status === "lost" && !reducedMotion
        ? Math.max(0, remaining - 1) * LOSS_STAGGER_MS + 700
        : COLLAPSE_LOCK_MS + 200;

    const id = window.setTimeout(() => setEndModalOpen(true), delay);
    return () => window.clearTimeout(id);
  }, [finished, state.status, state.puzzle.groups.length, state.solved.length, reducedMotion]);

  function handlePlayAgain() {
    if (!canReplay) return;
    clearPuzzleProgress(state.puzzle.id);
    setPractice(true);
    setEndModalOpen(false);
    setToast(null);
    setShakeWords([]);
    setCelebrateWords([]);
    setInputLocked(false);
    setRevealedLossCount(0);
    dispatch({ type: "RESET" });
  }

  function handleToggle(word: string) {
    if (inputLocked) return;
    if (state.selected.includes(word)) {
      dispatch({ type: "DESELECT", word });
    } else {
      dispatch({ type: "SELECT", word });
    }
  }

  return (
    <div>
      <header className="mx-auto mb-6 max-w-[390px] text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-comms-accent">
          {badge}
        </p>
        <h1 className="font-display text-4xl tracking-wide text-comms-text sm:text-6xl">
          VCT COMMS
        </h1>
        {hidePuzzleNumber ? (
          puzzle.author ? (
            <p className="mt-1 font-body text-sm text-comms-muted">
              By {puzzle.author}
            </p>
          ) : null
        ) : (
          <p className="mt-1 font-body text-sm text-comms-muted">
            {formatDisplayDate(puzzle.date)}
          </p>
        )}
        {finished ? (
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setEndModalOpen(true)}
              className="font-body text-xs font-semibold uppercase tracking-wide text-comms-accent underline-offset-2 hover:underline"
            >
              View results
            </button>
            {canReplay ? (
              <button
                type="button"
                onClick={handlePlayAgain}
                className="font-body text-xs font-semibold uppercase tracking-wide text-comms-muted underline-offset-2 hover:text-comms-text hover:underline"
              >
                Play again
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <Board
        state={state}
        shakeWords={shakeWords}
        celebrateWords={celebrateWords}
        revealedLossCount={revealedLossCount}
        inputLocked={inputLocked}
        onToggle={handleToggle}
      />

      <div className="mx-auto mt-5 flex max-w-[390px] flex-col gap-4">
        <Toast
          message={toast}
          durationMs={playing ? 1600 : null}
          onClear={clearToast}
        />
        <MistakeDots mistakes={state.mistakes} />
        <Controls
          canSubmit={canSubmit(state.selected)}
          canDeselect={state.selected.length > 0}
          disabled={controlsDisabled}
          onShuffle={() => dispatch({ type: "SHUFFLE" })}
          onDeselectAll={() => dispatch({ type: "DESELECT_ALL" })}
          onSubmit={() => dispatch({ type: "SUBMIT" })}
        />
      </div>

      {countTowardStats &&
      !practice &&
      isClerkConfigured() &&
      isSupabaseConfigured() ? (
        <DailyResultSync puzzle={puzzle} state={state} />
      ) : null}

      <EndModal
        open={endModalOpen && finished}
        state={state}
        stats={stats}
        shareTitle={shareTitle}
        puzzleLink={puzzleLink}
        showCareerStats={countTowardStats && !practice}
        onClose={() => setEndModalOpen(false)}
        onPlayAgain={canReplay ? handlePlayAgain : undefined}
      />
    </div>
  );
}
