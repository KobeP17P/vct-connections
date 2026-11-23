import type { Difficulty } from "./game/types";

export const COLORS = {
  bg: "#0F1923",
  tile: "#1F2731",
  text: "#ECE8E1",
  accent: "#FF4655",
  white: "#FFFFFF",
  muted: "#8B939B",
} as const;

export const DIFFICULTY: Record<
  Difficulty,
  { name: string; color: string; emoji: string }
> = {
  1: { name: "Iron", color: "#F5D76E", emoji: "🟨" },
  2: { name: "Gold", color: "#6FCF97", emoji: "🟩" },
  3: { name: "Immortal", color: "#56CCF2", emoji: "🟦" },
  4: { name: "Radiant", color: "#BB6BD9", emoji: "🟪" },
};

export type CommsRank =
  | "Iron"
  | "Silver"
  | "Plat"
  | "Diamond"
  | "Immortal"
  | "Radiant";

export const COMMS_RANK_ORDER: CommsRank[] = [
  "Iron",
  "Silver",
  "Plat",
  "Diamond",
  "Immortal",
  "Radiant",
];

export const COMMS_PUBLIC_RANK_ORDER = COMMS_RANK_ORDER.filter(
  (rank): rank is Exclude<CommsRank, "Radiant"> => rank !== "Radiant",
);

export const COMMS_RANK: Record<CommsRank, { name: string; color: string }> = {
  Iron: { name: "Iron", color: "#8B8178" },
  Silver: { name: "Silver", color: "#C5CDD3" },
  Plat: { name: "Plat", color: "#4EC8C2" },
  Diamond: { name: "Diamond", color: "#5B8DEE" },
  Immortal: { name: "Immortal", color: "#FF4655" },
  Radiant: { name: "Radiant", color: "#F3D37A" },
};
