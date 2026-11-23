import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useSession } from "@clerk/react";
import { AccountGate, RequireAccount } from "../components/AccountGate";
import { usePlayableArchive } from "../components/PuzzleCatalog";
import { canOpenEditorUi } from "../auth/editor";
import { formatDisplayDate, formatLocalDate } from "../game/daily";
import { RankLabel } from "../components/RankLabel";
import { commsRankFromResult } from "../game/ranks";
import {
  buildArchiveDays,
  fetchMyDailyRanks,
  missedEveryDaily,
  type ArchiveDayView,
  type DailyRankRow,
} from "../lib/leaderboard";
import { createClerkSupabaseClient, isSupabaseConfigured } from "../lib/supabase";

export function ArchivePage() {
  return (
    <RequireAccount
      title="Archive"
      signedOutBody="Sign in with Google to see the rank you earned each day. Today's puzzle stays open without an account."
    >
      <ArchiveList />
    </RequireAccount>
  );
}

function ArchiveList() {
  const archive = usePlayableArchive();
  const todayKey = formatLocalDate();
  const { isSignedIn, userId } = useAuth();
  const { session } = useSession();
  const isEditor = canOpenEditorUi(userId);
  const [history, setHistory] = useState<DailyRankRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());

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
    setLoading(true);
    void fetchMyDailyRanks(client).then((result) => {
      if (!active) return;
      setHistory(result.rows);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [client, isSignedIn]);

  const days = useMemo(
    () => buildArchiveDays(archive, history),
    [archive, history],
  );
  const neverPlayed = missedEveryDaily(days);

  if (!isSupabaseConfigured()) {
    return (
      <AccountGate
        title="Archive"
        body="Supabase is not configured yet, so daily ranks cannot be loaded."
      />
    );
  }

  return (
    <div className="mx-auto max-w-[390px]">
      <header className="mb-6 text-center">
        <h1 className="font-display text-4xl tracking-wide text-comms-text">
          Archive
        </h1>
        <p className="mt-2 font-body text-sm text-comms-muted">
          The rank you earned each day since launch.
          {isEditor
            ? " As editor you can open any day and play it again."
            : " Past puzzles cannot be replayed."}
        </p>
      </header>

      {loading ? (
        <p className="text-center font-body text-sm text-comms-muted">
          Loading archive...
        </p>
      ) : error ? (
        <p className="text-center font-body text-sm text-comms-accent" role="alert">
          {error}
        </p>
      ) : days.length === 0 ? (
        <p className="text-center font-body text-sm text-comms-muted">
          No puzzles available yet.
        </p>
      ) : (
        <>
          {neverPlayed ? (
            <p className="mb-4 rounded-sm bg-comms-accent/20 px-4 py-3 text-center font-body text-sm text-comms-text">
              You haven&apos;t played a VCT COMMS since the site started. Today&apos;s
              puzzle is on the home tab.
            </p>
          ) : null}

          <ul className="flex flex-col gap-2">
            {days.map((day) => (
              <ArchiveDay
                key={day.puzzle.id}
                day={day}
                isToday={day.puzzle.date === todayKey}
                canReplay={isEditor || day.puzzle.date === todayKey}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ArchiveDay({
  day,
  isToday,
  canReplay,
}: {
  day: ArchiveDayView;
  isToday: boolean;
  canReplay: boolean;
}) {
  const title = (
    <div>
      <p className="font-display text-lg tracking-wide text-comms-text">
        {formatDisplayDate(day.puzzle.date)}
        {isToday ? (
          <span className="ml-2 font-body text-xs font-semibold uppercase tracking-wide text-comms-accent">
            Today
          </span>
        ) : null}
      </p>
    </div>
  );

  const rank = day.mine ? (
    <RankLabel
      rank={commsRankFromResult(
        day.mine.won,
        day.mine.mistakes,
        day.mine.radiant,
      )}
      className="text-xl"
    />
  ) : (
    <p className="font-body text-xs font-semibold uppercase tracking-wide text-comms-muted">
      You haven&apos;t played
    </p>
  );

  const body = (
    <div className="flex items-center justify-between gap-3">
      {title}
      <div className="shrink-0 text-right">{rank}</div>
    </div>
  );

  return (
    <li>
      {canReplay ? (
        <Link
          to={isToday ? "/" : `/puzzle/${day.puzzle.id}`}
          className="block rounded-sm bg-comms-tile px-4 py-3 transition hover:brightness-110"
        >
          {body}
        </Link>
      ) : (
        <div className="rounded-sm bg-comms-tile px-4 py-3">{body}</div>
      )}
    </li>
  );
}
