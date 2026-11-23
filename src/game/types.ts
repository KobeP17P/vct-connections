export type Difficulty = 1 | 2 | 3 | 4;

export type GameStatus = "playing" | "won" | "lost";

export type Feedback =
  | null
  | "correct"
  | "incorrect"
  | "one_away"
  | "already_guessed";

export interface Group {
  category: string;
  difficulty: Difficulty;
  words: [string, string, string, string];
}

export interface Puzzle {
  id: number;
  date: string;
  groups: [Group, Group, Group, Group];
  author?: string;
  notes?: string;
}

export interface PuzzleProgress {
  guesses: string[][];
  solved: number[];
  mistakes: number;
  status: GameStatus;
  /** Unsolved tile order — stored so reloads restore the board exactly. */
  board?: string[];
}

export interface SavedState {
  byPuzzle: Record<number, PuzzleProgress>;
  stats: {
    played: number;
    won: number;
    currentStreak: number;
    maxStreak: number;
    mistakeDistribution: [number, number, number, number, number];
    rankDistribution: [number, number, number, number, number, number];
  };
}

export interface GameState {
  puzzle: Puzzle;
  /** Unsolved words in current board order. */
  board: string[];
  selected: string[];
  /** Group indices solved, in the order they were found. */
  solved: number[];
  /** Correct group waiting for the tile animation before it collapses. */
  pendingSolve: number | null;
  guesses: string[][];
  mistakes: number;
  status: GameStatus;
  feedback: Feedback;
}

export type GameAction =
  | { type: "SELECT"; word: string }
  | { type: "DESELECT"; word: string }
  | { type: "DESELECT_ALL" }
  | { type: "SHUFFLE" }
  | { type: "SUBMIT" }
  | { type: "COMMIT_SOLVE" }
  | { type: "RESTORE"; progress: PuzzleProgress; board?: string[] }
  | { type: "RESET" }
  | { type: "CLEAR_FEEDBACK" };
