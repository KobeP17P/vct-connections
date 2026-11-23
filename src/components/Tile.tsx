import { useLayoutEffect, useRef } from "react";

interface TileProps {
  word: string;
  selected: boolean;
  shaking?: boolean;
  celebrating?: boolean;
  disabled?: boolean;
  onToggle: (word: string) => void;
}

const MAX_FONT_PX = 16;
const MIN_FONT_PX = 9;

function fitText(el: HTMLElement) {
  const parent = el.parentElement;
  if (!parent) return;

  let size = MAX_FONT_PX;
  el.style.fontSize = `${size}px`;

  while (size > MIN_FONT_PX && el.scrollWidth > parent.clientWidth - 8) {
    size -= 0.5;
    el.style.fontSize = `${size}px`;
  }
}

export function Tile({
  word,
  selected,
  shaking = false,
  celebrating = false,
  disabled = false,
  onToggle,
}: TileProps) {
  const labelRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = labelRef.current;
    if (!el) return;

    fitText(el);

    const parent = el.parentElement;
    if (!parent || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => fitText(el));
    observer.observe(parent);
    return () => observer.disconnect();
  }, [word, selected]);

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onToggle(word)}
      className={[
        "tile-face flex h-[68px] w-full items-center justify-center rounded-sm px-1.5",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-comms-accent",
        "disabled:cursor-default",
        selected
          ? "bg-comms-accent text-white"
          : "bg-comms-tile text-comms-text hover:brightness-110",
        selected && !shaking && !celebrating ? "tile-selected" : "",
        shaking ? "tile-shaking" : "",
        celebrating ? "tile-celebrating" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span ref={labelRef} className="tile-label">
        {word}
      </span>
    </button>
  );
}
