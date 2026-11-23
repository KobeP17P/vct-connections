import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth, useSession } from "@clerk/react";
import { AccountGate, RequireAccount } from "../components/AccountGate";
import { canOpenEditorUi } from "../auth/editor";
import { RankLabel } from "../components/RankLabel";
import { commsRankFromAverage } from "../game/ranks";
import {
  fetchLeaderboard,
  MIN_RANK_BOARD_PLAYS,
  rankByCommsRank,
  rankByStreak,
  removePlayerResults,
  subscribeProfileSync,
  type LeaderboardRow,
} from "../lib/leaderboard";
import { createClerkSupabaseClient, isSupabaseConfigured } from "../lib/supabase";

const TOP_N = 25;

export function LeaderboardPage() {
  return (
    <RequireAccount
      title="Ranks"
      signedOutBody="Sign in with Google to see who has the longest streaks and the highest average ranks."
      unconfiguredBody="Turn on Clerk sign-in to open the account leaderboard."
    >
      <SignedInLeaderboard />
    </RequireAccount>
  );
}

function SignedInLeaderboard() {
  const { isSignedIn, userId } = useAuth();
  const { session } = useSession();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const client = useMemo(() => {
    if (!isSupabaseConfigured() || !session) return null;
    return createClerkSupabaseClient(() => session.getToken());
  }, [session]);

  useEffect(() => {
    if (!isSignedIn || !client) {
      setLoading(false);
      return;
    }

    let active = true;
    const supabase = client;
    function load(showSpinner: boolean) {
      if (showSpinner) setLoading(true);
      void fetchLeaderboard(supabase).then((result) => {
        if (!active) return;
        setRows(result.rows);
        setError(result.error);
        setLoading(false);
      });
    }

    load(true);
    const unsubscribe = subscribeProfileSync(() => load(false));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [client, isSignedIn]);

  if (!isSupabaseConfigured()) {
    return (
      <AccountGate
        title="Ranks"
        body="Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then run the leaderboard migration."
      />
    );
  }

  const streakRows = rankByStreak(rows).slice(0, TOP_N);
  const rankRows = rankByCommsRank(rows, {
    minPlays: MIN_RANK_BOARD_PLAYS,
  }).slice(0, TOP_N);
  const canModerate = canOpenEditorUi(userId);

  async function removePlayer(targetId: string) {
    if (!client) return;
    const message = await removePlayerResults(client, targetId);
    if (message) {
      setError(message);
      return;
    }
    setRows((current) => current.filter((row) => row.user_id !== targetId));
  }

  return (
    <div className="mx-auto max-w-[390px]">
      <header className="mb-6 text-center">
        <h1 className="font-display text-4xl tracking-wide text-comms-text">
          Ranks
        </h1>
        <p className="mt-2 font-body text-sm text-comms-muted">
          Official dailies only. Highest ranks is your average after{" "}
          {MIN_RANK_BOARD_PLAYS} plays.
        </p>
      </header>

      {loading ? (
        <p className="text-center font-body text-sm text-comms-muted">
          Loading ranks...
        </p>
      ) : error ? (
        <p className="text-center font-body text-sm text-comms-accent" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-center font-body text-sm text-comms-muted">
          No ranked dailies yet. Finish today&apos;s puzzle while signed in to appear here.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <Board
            title="Longest streaks"
            hint="Best win streak, then current streak"
            rows={streakRows}
            userId={userId}
            canModerate={canModerate}
            onRemove={(id) => void removePlayer(id)}
            value={(row) => String(row.max_streak)}
            sub={(row) => "now " + row.current_streak}
          />
          <Board
            title="Highest ranks"
            hint={`Average rank across official dailies. Qualifies after ${MIN_RANK_BOARD_PLAYS} plays.`}
            empty={`No one has ${MIN_RANK_BOARD_PLAYS} official dailies yet. Keep playing to appear here.`}
            rows={rankRows}
            userId={userId}
            canModerate={canModerate}
            onRemove={(id) => void removePlayer(id)}
            value={(row) => (
              <RankLabel
                rank={commsRankFromAverage(Number(row.rank_avg))}
                className="text-2xl"
              />
            )}
            sub={(row) => row.dailies_played + " played"}
          />
        </div>
      )}
    </div>
  );
}

function Board({
  title,
  hint,
  empty,
  rows,
  userId,
  canModerate,
  onRemove,
  value,
  sub,
}: {
  title: string;
  hint: string;
  empty?: string;
  rows: LeaderboardRow[];
  userId: string | null | undefined;
  canModerate: boolean;
  onRemove: (userId: string) => void;
  value: (row: LeaderboardRow) => ReactNode;
  sub: (row: LeaderboardRow) => string;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <section>
      <h2 className="font-display text-2xl tracking-wide text-comms-text">
        {title}
      </h2>
      <p className="mb-3 font-body text-xs text-comms-muted">{hint}</p>
      {rows.length === 0 && empty ? (
        <p className="rounded-sm bg-comms-tile px-4 py-3 font-body text-sm text-comms-muted">
          {empty}
        </p>
      ) : (
      <ol className="flex flex-col gap-2">
        {rows.map((row, index) => {
          const mine = row.user_id === userId;
          const pending = pendingId === row.user_id;
          return (
            <li
              key={row.user_id}
              className={[
                "flex items-center justify-between gap-3 rounded-sm px-4 py-3",
                mine ? "bg-comms-accent/20" : "bg-comms-tile",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p className="truncate font-body text-sm font-semibold text-comms-text">
                  <span className="mr-2 text-comms-muted">{index + 1}</span>
                  {row.display_name}
                  {mine ? (
                    <span className="ml-2 font-body text-[10px] uppercase tracking-wide text-comms-accent">
                      You
                    </span>
                  ) : null}
                </p>
                <p className="font-body text-[11px] text-comms-muted">{sub(row)}</p>
                {canModerate ? (
                  pending ? (
                    <div className="mt-1 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingId(null);
                          onRemove(row.user_id);
                        }}
                        className="font-body text-[10px] font-semibold uppercase tracking-wide text-comms-accent hover:underline"
                      >
                        Confirm remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingId(null)}
                        className="font-body text-[10px] font-semibold uppercase tracking-wide text-comms-muted hover:text-comms-text"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingId(row.user_id)}
                      className="mt-1 font-body text-[10px] font-semibold uppercase tracking-wide text-comms-muted hover:text-comms-accent"
                    >
                      Remove
                    </button>
                  )
                ) : null}
              </div>
              <div className="shrink-0 text-right font-display text-2xl tracking-wide text-comms-text tabular-nums">
                {value(row)}
              </div>
            </li>
          );
        })}
      </ol>
      )}
    </section>
  );
}

