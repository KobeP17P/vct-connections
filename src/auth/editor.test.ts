import { describe, expect, it } from "vitest";
import { canAccessPastPuzzle, canOpenEditorUi } from "./editor";

describe("editor access", () => {
  it("hides desk unless a signed-in user is on the allowlist", () => {
    expect(canOpenEditorUi(null)).toBe(false);
    expect(canOpenEditorUi(undefined)).toBe(false);
    expect(canOpenEditorUi("")).toBe(false);
  });

  it("only lets editors replay puzzles after the day has passed", () => {
    expect(canAccessPastPuzzle(null, "2026-11-21", "2026-11-21")).toBe(true);
    expect(canAccessPastPuzzle(null, "2026-11-20", "2026-11-21")).toBe(false);
    expect(canAccessPastPuzzle("someone", "2026-11-20", "2026-11-21")).toBe(
      false,
    );
    expect(canAccessPastPuzzle(null, "2026-11-22", "2026-11-21")).toBe(false);
  });
});
