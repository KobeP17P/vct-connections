import { describe, expect, it } from "vitest";
import { getSafeInternalPath } from "./redirect";

describe("getSafeInternalPath", () => {
  it("keeps in-app paths and query strings", () => {
    expect(getSafeInternalPath("/archive")).toBe("/archive");
    expect(getSafeInternalPath("/create?p=abc")).toBe("/create?p=abc");
  });

  it("rejects off-site or protocol-relative targets", () => {
    expect(getSafeInternalPath("https://evil.example")).toBe("/");
    expect(getSafeInternalPath("//evil.example")).toBe("/");
    expect(getSafeInternalPath("/\\evil.example")).toBe("/");
    expect(getSafeInternalPath("archive")).toBe("/");
  });
});
