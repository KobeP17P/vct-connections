import type { Difficulty, Group, Puzzle } from "./types";

export const MAX_WORD_LENGTH = 16;
export const MAX_CATEGORY_LENGTH = 40;
export const MAX_AUTHOR_LENGTH = 24;

export interface CustomGroupDraft {
  category: string;
  words: [string, string, string, string];
}

export interface CustomPuzzleDraft {
  author: string;
  groups: [CustomGroupDraft, CustomGroupDraft, CustomGroupDraft, CustomGroupDraft];
}

interface CompactPayload {
  a?: string;
  g: [string, string, string, string, string][];
}

export function emptyCustomDraft(): CustomPuzzleDraft {
  return {
    author: "",
    groups: [
      emptyGroup(),
      emptyGroup(),
      emptyGroup(),
      emptyGroup(),
    ],
  };
}

function emptyGroup(): CustomGroupDraft {
  return { category: "", words: ["", "", "", ""] };
}

export function validateCustomDraft(draft: CustomPuzzleDraft): string[] {
  const errors: string[] = [];
  const author = draft.author.trim();
  if (author.length > MAX_AUTHOR_LENGTH) {
    errors.push(`Author must be ${MAX_AUTHOR_LENGTH} characters or fewer`);
  }

  if (!Array.isArray(draft.groups) || draft.groups.length !== 4) {
    errors.push("Puzzle must have exactly 4 groups");
    return errors;
  }

  const normalizedWords: string[] = [];

  draft.groups.forEach((group, index) => {
    const tier = index + 1;
    const category = group.category.trim();
    if (!category) {
      errors.push(`Group ${tier} needs a category name`);
    } else if (category.length > MAX_CATEGORY_LENGTH) {
      errors.push(
        `Group ${tier} category is longer than ${MAX_CATEGORY_LENGTH} characters`,
      );
    }

    if (!Array.isArray(group.words) || group.words.length !== 4) {
      errors.push(`Group ${tier} must have exactly 4 words`);
      return;
    }

    group.words.forEach((word, wordIndex) => {
      const trimmed = word.trim();
      if (!trimmed) {
        errors.push(`Group ${tier} is missing word ${wordIndex + 1}`);
        return;
      }
      if (trimmed.length > MAX_WORD_LENGTH) {
        errors.push(`"${trimmed}" is longer than ${MAX_WORD_LENGTH} characters`);
      }
      normalizedWords.push(trimmed.toLowerCase());
    });
  });

  const unique = new Set(normalizedWords);
  if (unique.size !== normalizedWords.length) {
    const counts = new Map<string, number>();
    for (const w of normalizedWords) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    const dupes = [...counts.entries()]
      .filter(([, n]) => n > 1)
      .map(([w]) => w);
    errors.push(`Duplicate words: ${dupes.join(", ")}`);
  }

  return errors;
}

export function draftToPuzzle(draft: CustomPuzzleDraft, encoded = ""): Puzzle {
  const groups = draft.groups.map((group, index) => ({
    category: group.category.trim(),
    difficulty: (index + 1) as Difficulty,
    words: group.words.map((w) => w.trim()) as Group["words"],
  })) as Puzzle["groups"];

  const author = draft.author.trim();
  return {
    id: hashToId(encoded || JSON.stringify(groups)),
    date: "1970-01-01",
    groups,
    ...(author ? { author } : {}),
  };
}

export function puzzleToDraft(puzzle: Puzzle): CustomPuzzleDraft {
  const byDiff = [...puzzle.groups].sort((a, b) => a.difficulty - b.difficulty);
  return {
    author: puzzle.author ?? "",
    groups: [0, 1, 2, 3].map((i) => {
      const group = byDiff[i]!;
      return {
        category: group.category,
        words: [...group.words] as CustomGroupDraft["words"],
      };
    }) as CustomPuzzleDraft["groups"],
  };
}

export function encodeCustomPuzzle(puzzle: Puzzle): string {
  const ordered = [...puzzle.groups].sort((a, b) => a.difficulty - b.difficulty);
  const payload: CompactPayload = {
    g: ordered.map((group) => [
      group.category,
      group.words[0],
      group.words[1],
      group.words[2],
      group.words[3],
    ]),
  };
  const author = puzzle.author?.trim();
  if (author) payload.a = author;
  return toBase64Url(JSON.stringify(payload));
}

export function decodeCustomPuzzle(encoded: string): Puzzle | null {
  if (!encoded.trim()) return null;
  let json: string;
  try {
    json = fromBase64Url(encoded);
  } catch {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return null;
  }

  const draft = payloadToDraft(payload);
  if (!draft) return null;
  if (validateCustomDraft(draft).length > 0) return null;
  return draftToPuzzle(draft, encoded);
}

function payloadToDraft(payload: unknown): CustomPuzzleDraft | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as CompactPayload;
  if (!Array.isArray(raw.g) || raw.g.length !== 4) return null;

  const groups: CustomGroupDraft[] = [];
  for (const row of raw.g) {
    if (!Array.isArray(row) || row.length !== 5) return null;
    if (!row.every((cell) => typeof cell === "string")) return null;
    groups.push({
      category: row[0],
      words: [row[1], row[2], row[3], row[4]],
    });
  }

  if (raw.a != null && typeof raw.a !== "string") return null;

  return {
    author: typeof raw.a === "string" ? raw.a : "",
    groups: groups as CustomPuzzleDraft["groups"],
  };
}


export const CREATE_DRAFT_KEY = "comms:create-draft:v1";

function isCustomDraft(value: unknown): value is CustomPuzzleDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as CustomPuzzleDraft;
  return typeof draft.author === "string" && Array.isArray(draft.groups) && draft.groups.length === 4;
}

export function loadCreateDraft(): CustomPuzzleDraft | null {
  try {
    const raw = localStorage.getItem(CREATE_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isCustomDraft(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCreateDraft(draft: CustomPuzzleDraft): void {
  try {
    localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearCreateDraft(): void {
  try {
    localStorage.removeItem(CREATE_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function customShareTitle(puzzle: Puzzle): string {
  return puzzle.author ? `VCT COMMS by ${puzzle.author}` : "VCT COMMS Custom";
}

function hashToId(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  const id = Math.abs(hash);
  return id === 0 ? -1 : -id;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
