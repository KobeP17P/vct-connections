import { COMMS_RANK, type CommsRank } from "../theme";

interface RankLabelProps {
  rank: CommsRank;
  className?: string;
}

export function RankLabel({ rank, className }: RankLabelProps) {
  const style = COMMS_RANK[rank];
  return (
    <span
      className={["font-display tracking-wide", className].filter(Boolean).join(" ")}
      style={{ color: style.color }}
    >
      {style.name}
    </span>
  );
}
