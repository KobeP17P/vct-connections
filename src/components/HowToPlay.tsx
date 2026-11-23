import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { COMMS_RANK, COMMS_PUBLIC_RANK_ORDER, DIFFICULTY } from "../theme";

export const HOW_TO_PLAY_KEY = "comms:howto:seen";

interface HowToPlayProps {
  open: boolean;
  onClose: () => void;
}

const TIERS = [
  { difficulty: 1 as const, hint: "Straightforward" },
  { difficulty: 2 as const, hint: "A bit trickier" },
  { difficulty: 3 as const, hint: "Challenging" },
  { difficulty: 4 as const, hint: "Elite Ball Knowledge" },
];

const RANK_HINTS: Record<(typeof COMMS_PUBLIC_RANK_ORDER)[number], string> = {
  Immortal: "No mistakes — all correct",
  Diamond: "1 mistake",
  Plat: "2 mistakes",
  Silver: "3 mistakes",
  Iron: "Failed the daily",
};

export function HowToPlay({ open, onClose }: HowToPlayProps) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.15 : 0.2 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="howto-title"
            className="max-h-[90vh] w-full max-w-[390px] overflow-y-auto border border-comms-text/15 bg-comms-bg p-5 shadow-2xl"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id="howto-title"
                className="font-display text-3xl tracking-wide text-comms-text"
              >
                How to Play
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="font-body text-sm text-comms-muted hover:text-comms-text"
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <p className="mt-3 font-body text-sm leading-relaxed text-comms-muted">
              Find four groups of four related words from Valorant esports.
              Select four tiles and hit Submit.
            </p>

            <ul className="mt-4 space-y-2 font-body text-sm text-comms-text">
              <li>• You get four mistakes.</li>
              <li>• &quot;One away...&quot; means three tiles belong together.</li>
              <li>• Repeating an exact guess does not cost a mistake.</li>
              <li>• Finish a daily to earn a rank from Iron to Immortal.</li>
              <li>• Highest ranks uses your average rank after 5 official dailies.</li>
              <li>• Progress is saved in this browser even if you do not sign in.</li>
            </ul>

            <p className="mt-5 font-body text-xs font-semibold uppercase tracking-wide text-comms-muted">
              Ranks
            </p>
            <ul className="mt-2 space-y-2">
              {[...COMMS_PUBLIC_RANK_ORDER].reverse().map((rank) => {
                const style = COMMS_RANK[rank];
                return (
                  <li key={rank} className="flex items-center gap-3">
                    <span
                      className="inline-block h-4 w-8 rounded-sm"
                      style={{ backgroundColor: style.color }}
                      aria-hidden="true"
                    />
                    <span className="font-body text-sm text-comms-text">
                      <span className="font-semibold">{style.name}</span>
                      <span className="text-comms-muted">
                        {" "}
                        — {RANK_HINTS[rank]}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-5 font-body text-xs font-semibold uppercase tracking-wide text-comms-muted">
              Difficulty colors
            </p>
            <ul className="mt-2 space-y-2">
              {TIERS.map(({ difficulty, hint }) => {
                const tier = DIFFICULTY[difficulty];
                return (
                  <li key={difficulty} className="flex items-center gap-3">
                    <span
                      className="inline-block h-4 w-8 rounded-sm"
                      style={{ backgroundColor: tier.color }}
                      aria-hidden="true"
                    />
                    <span className="font-body text-sm text-comms-text">
                      <span className="font-semibold">{tier.name}</span>
                      <span className="text-comms-muted"> — {hint}</span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={onClose}
              className="clip-angled mt-6 w-full bg-comms-accent px-5 py-3 font-body text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              Play
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function hasSeenHowToPlay(): boolean {
  try {
    return localStorage.getItem(HOW_TO_PLAY_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHowToPlaySeen(): void {
  try {
    localStorage.setItem(HOW_TO_PLAY_KEY, "1");
  } catch {
    // ignore
  }
}
