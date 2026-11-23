import { useEffect, useMemo, useState } from "react";
import { useAuth, useSession } from "@clerk/react";
import { PuzzleGroupFields } from "../components/PuzzleGroupFields";
import { RequireAccount, AccountGate } from "../components/AccountGate";
import { usePuzzleCatalog } from "../components/PuzzleCatalog";
import { formatDisplayDate, formatLocalDate } from "../game/daily";
import { MAX_AUTHOR_LENGTH } from "../game/customPuzzle";
import type { CustomPuzzleDraft } from "../game/customPuzzle";
import {
  MAX_NOTES_LENGTH,
  claimEditorSeat,
  deleteOfficialPuzzle,
  emptyOfficialDraft,
  fetchAllOfficialPuzzles,
  nextOpenDate,
  nextPuzzleId,
  rowToDraft,
  saveOfficialPuzzle,
  validateOfficialDraft,
  type OfficialDraft,
  type OfficialPuzzleRow,
} from "../lib/officialPuzzles";
import {
  createClerkSupabaseClient,
  isSupabaseConfigured,
} from "../lib/supabase";
import { canOpenEditorUi } from "../auth/editor";

export function DeskPage() {
  return (
    <RequireAccount
      title="Desk"
      signedOutBody="Sign in to schedule official VCT COMMS dailies and keep a backlog."
    >
      <DeskInner />
    </RequireAccount>
  );
}

function DeskInner() {
  const { userId } = useAuth();
  const { session } = useSession();
  const { puzzles, refresh } = usePuzzleCatalog();
  const [editor, setEditor] = useState(false);
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<OfficialPuzzleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<OfficialDraft>(() => emptyOfficialDraft());
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const client = useMemo(() => {
    if (!isSupabaseConfigured() || !session) return null;
    return createClerkSupabaseClient(() => session.getToken());
  }, [session]);

  const takenDates = useMemo(() => {
    const bundled = puzzles.map((puzzle) => puzzle.date);
    const remote = rows
      .map((row) => row.date)
      .filter((date): date is string => Boolean(date));
    return [...new Set([...bundled, ...remote])];
  }, [puzzles, rows]);

  async function reloadRows(activeClient: NonNullable<typeof client>) {
    const result = await fetchAllOfficialPuzzles(activeClient);
    setRows(result.rows);
    setError(result.error);
  }

  useEffect(() => {
    if (!client || !userId || !canOpenEditorUi(userId)) {
      setReady(true);
      return;
    }
    let active = true;
    void (async () => {
      const claimed = await claimEditorSeat(client);
      if (!active) return;
      setEditor(claimed);
      if (claimed) await reloadRows(client);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [client, userId]);

  if (!isSupabaseConfigured()) {
    return (
      <AccountGate
        title="Desk"
        body="Supabase is not configured, so official dailies cannot be saved yet."
      />
    );
  }

  if (!ready) {
    return (
      <p className="mx-auto max-w-[390px] text-center font-body text-sm text-comms-muted">
        Loading desk…
      </p>
    );
  }

  if (!editor) {
    return (
      <AccountGate
        title="Desk"
        body="This desk is for official COMMS editors. If that's you, ask to be added to the editor list."
      />
    );
  }

  const todayKey = formatLocalDate();
  const backlog = rows.filter((row) => !row.date);
  const upcoming = rows
    .filter((row) => row.date && row.date > todayKey)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const live = rows
    .filter((row) => row.date && row.date <= todayKey)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const editingRow = rows.find((row) => row.id === editingId);

  function updateAuthor(author: string) {
    setDraft((prev) => ({ ...prev, author }));
    setFormErrors([]);
  }

  function updateNotes(notes: string) {
    setDraft((prev) => ({ ...prev, notes }));
    setFormErrors([]);
  }

  function updateDate(date: string) {
    setDraft((prev) => ({ ...prev, date }));
    setFormErrors([]);
  }

  function updateCategory(groupIndex: number, category: string) {
    setDraft((prev) => {
      const groups = prev.groups.map((group, i) =>
        i === groupIndex ? { ...group, category } : group,
      ) as CustomPuzzleDraft["groups"];
      return { ...prev, groups };
    });
    setFormErrors([]);
  }

  function updateWord(groupIndex: number, wordIndex: number, word: string) {
    setDraft((prev) => {
      const groups = prev.groups.map((group, i) => {
        if (i !== groupIndex) return group;
        const words = [...group.words] as CustomPuzzleDraft["groups"][number]["words"];
        words[wordIndex] = word;
        return { ...group, words };
      }) as CustomPuzzleDraft["groups"];
      return { ...prev, groups };
    });
    setFormErrors([]);
  }

  function startNew() {
    setEditingId(null);
    setDraft(emptyOfficialDraft());
    setFormErrors([]);
    setStatus(null);
  }

  function startEdit(row: OfficialPuzzleRow) {
    setEditingId(row.id);
    setDraft(rowToDraft(row));
    setFormErrors([]);
    setStatus(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function persist(next: OfficialDraft) {
    if (!client) return;
    const taken = takenDates.filter(
      (date) => date !== (editingRow?.date ?? undefined),
    );
    const nextErrors = validateOfficialDraft(next, taken, editingRow?.date);
    if (nextErrors.length > 0) {
      setFormErrors(nextErrors);
      return;
    }
    const puzzleId = editingRow?.puzzle_id ?? nextPuzzleId([...puzzles, ...rows.map((row) => ({ id: row.puzzle_id }))]);
    const saveError = await saveOfficialPuzzle(client, {
      rowId: editingRow?.id,
      puzzleId,
      draft: next,
    });
    if (saveError) {
      setError(saveError);
      return;
    }
    setStatus(
      next.date.trim()
        ? `Scheduled for ${formatDisplayDate(next.date)}`
        : "Saved to backlog",
    );
    setFormErrors([]);
    startNew();
    await reloadRows(client);
    await refresh();
  }

  async function remove(row: OfficialPuzzleRow) {
    if (!client) return;
    const ok = window.confirm(`Delete puzzle #${row.puzzle_id}?`);
    if (!ok) return;
    const deleteError = await deleteOfficialPuzzle(client, row.id);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    if (editingId === row.id) startNew();
    await reloadRows(client);
    await refresh();
  }

  return (
    <div className="mx-auto max-w-[390px]">
      <header className="mb-6 text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-comms-accent">
          Official
        </p>
        <h1 className="font-display text-4xl tracking-wide text-comms-text">
          Desk
        </h1>
        <p className="mt-2 font-body text-sm text-comms-muted">
          Write a daily VCT COMMS, park it in the backlog, or schedule it on a date.
        </p>
      </header>

      {error ? (
        <p className="mb-4 font-body text-sm text-comms-accent" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="mb-4 font-body text-sm text-comms-muted">{status}</p>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 font-display text-2xl tracking-wide text-comms-text">
          {editingRow ? `Edit #${editingRow.puzzle_id}` : "New puzzle"}
        </h2>

        <label className="mb-3 block">
          <span className="mb-1.5 block font-body text-[11px] font-semibold uppercase tracking-wide text-comms-muted">
            Daily date
          </span>
          <div className="flex gap-2">
            <input
              type="date"
              value={draft.date}
              onChange={(e) => updateDate(e.target.value)}
              className="w-full rounded-sm border border-comms-text/15 bg-comms-tile px-3 py-2 font-body text-sm text-comms-text outline-none focus:border-comms-accent"
            />
            <button
              type="button"
              onClick={() => updateDate(nextOpenDate(takenDates))}
              className="shrink-0 font-body text-[11px] font-semibold uppercase tracking-wide text-comms-accent"
            >
              Next open
            </button>
          </div>
          <p className="mt-1 font-body text-[11px] text-comms-muted">
            Leave empty to keep it in the backlog.
          </p>
        </label>

        <label className="mb-3 block">
          <span className="mb-1.5 block font-body text-[11px] font-semibold uppercase tracking-wide text-comms-muted">
            Author
          </span>
          <input
            value={draft.author}
            maxLength={MAX_AUTHOR_LENGTH}
            onChange={(e) => updateAuthor(e.target.value)}
            className="w-full rounded-sm border border-comms-text/15 bg-comms-tile px-3 py-2 font-body text-sm text-comms-text outline-none focus:border-comms-accent"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block font-body text-[11px] font-semibold uppercase tracking-wide text-comms-muted">
            Notes
          </span>
          <input
            value={draft.notes}
            maxLength={MAX_NOTES_LENGTH}
            onChange={(e) => updateNotes(e.target.value)}
            placeholder="Red herrings, spoilers for you"
            className="w-full rounded-sm border border-comms-text/15 bg-comms-tile px-3 py-2 font-body text-sm text-comms-text outline-none placeholder:text-comms-muted/60 focus:border-comms-accent"
          />
        </label>

        <PuzzleGroupFields
          groups={draft.groups}
          onCategory={updateCategory}
          onWord={updateWord}
        />

        {formErrors.length > 0 ? (
          <ul className="mt-4 space-y-1 rounded-sm bg-comms-accent/15 px-3 py-3 font-body text-xs text-comms-text">
            {formErrors.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => void persist(draft)}
            className="clip-angled bg-comms-accent px-5 py-3 font-body text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
          >
            {draft.date.trim() ? "Save daily" : "Save to backlog"}
          </button>
          {editingRow ? (
            <button
              type="button"
              onClick={startNew}
              className="font-body text-xs font-semibold uppercase tracking-wide text-comms-muted hover:text-comms-text"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </section>

      <Queue
        title="Backlog"
        hint="Unscheduled — not visible to players yet"
        rows={backlog}
        empty="Nothing in the backlog."
        onEdit={startEdit}
        onDelete={(row) => void remove(row)}
      />
      <Queue
        title="Upcoming"
        hint="Scheduled future dailies"
        rows={upcoming}
        empty="No future dailies scheduled."
        onEdit={startEdit}
        onDelete={(row) => void remove(row)}
      />
      <Queue
        title="Published"
        hint="Already live from this desk"
        rows={live}
        empty="No desk dailies have gone live yet."
        onEdit={startEdit}
        onDelete={(row) => void remove(row)}
      />
    </div>
  );
}

function Queue({
  title,
  hint,
  rows,
  empty,
  onEdit,
  onDelete,
}: {
  title: string;
  hint: string;
  rows: OfficialPuzzleRow[];
  empty: string;
  onEdit: (row: OfficialPuzzleRow) => void;
  onDelete: (row: OfficialPuzzleRow) => void;
}) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-2xl tracking-wide text-comms-text">
        {title}
      </h2>
      <p className="mb-3 font-body text-xs text-comms-muted">{hint}</p>
      {rows.length === 0 ? (
        <p className="rounded-sm bg-comms-tile px-4 py-3 font-body text-sm text-comms-muted">
          {empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-sm bg-comms-tile px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg tracking-wide text-comms-text">
                    #{row.puzzle_id}
                    {row.date ? (
                      <span className="ml-2 font-body text-xs text-comms-muted">
                        {row.date}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate font-body text-xs text-comms-muted">
                    {row.groups
                      .map((group) => group.category)
                      .filter(Boolean)
                      .join(" · ") || "Untitled"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="font-body text-[11px] font-semibold uppercase tracking-wide text-comms-accent"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="font-body text-[11px] font-semibold uppercase tracking-wide text-comms-muted hover:text-comms-text"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
