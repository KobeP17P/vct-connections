export function getEditorUserIds(): string[] {
  const raw = import.meta.env.VITE_EDITOR_USER_IDS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/** Desk, Create, and past archive stay hidden unless this Clerk user id is in VITE_EDITOR_USER_IDS. */
export function canOpenEditorUi(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const allowed = getEditorUserIds();
  if (allowed.length === 0) return false;
  return allowed.includes(userId);
}

export function canAccessPastPuzzle(
  userId: string | null | undefined,
  puzzleDate: string,
  today: string,
): boolean {
  if (puzzleDate > today) return false;
  if (puzzleDate === today) return true;
  return canOpenEditorUi(userId);
}
