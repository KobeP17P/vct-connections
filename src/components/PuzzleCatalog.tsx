import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { puzzles as bundledPuzzles } from "../data/puzzles";
import { formatLocalDate } from "../game/daily";
import type { Puzzle } from "../game/types";
import {
  fetchLiveOfficialPuzzles,
  mergeOfficialPuzzles,
} from "../lib/officialPuzzles";
import {
  createPublicSupabaseClient,
  isSupabaseConfigured,
} from "../lib/supabase";

interface PuzzleCatalogValue {
  puzzles: Puzzle[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const PuzzleCatalogContext = createContext<PuzzleCatalogValue | null>(null);

export function PuzzleCatalogProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const client = createPublicSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }
    const result = await fetchLiveOfficialPuzzles(client);
    setRemote(result.rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const puzzles = useMemo(
    () => mergeOfficialPuzzles(bundledPuzzles, remote),
    [remote],
  );

  const value = useMemo(
    () => ({ puzzles, loading, refresh }),
    [puzzles, loading, refresh],
  );

  return (
    <PuzzleCatalogContext.Provider value={value}>
      {children}
    </PuzzleCatalogContext.Provider>
  );
}

export function usePuzzleCatalog(): PuzzleCatalogValue {
  const value = useContext(PuzzleCatalogContext);
  if (!value) {
    return {
      puzzles: bundledPuzzles,
      loading: false,
      refresh: async () => undefined,
    };
  }
  return value;
}

export function usePlayableArchive(): Puzzle[] {
  const { puzzles } = usePuzzleCatalog();
  const todayKey = formatLocalDate();
  return puzzles
    .filter((puzzle) => puzzle.date <= todayKey)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}
