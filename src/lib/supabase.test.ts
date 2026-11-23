import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "./supabase";

describe("normalizeSupabaseUrl", () => {
  it("keeps the project origin", () => {
    expect(normalizeSupabaseUrl("https://abcd.supabase.co")).toBe(
      "https://abcd.supabase.co",
    );
  });

  it("strips a pasted Data API path", () => {
    expect(normalizeSupabaseUrl("https://abcd.supabase.co/rest/v1/")).toBe(
      "https://abcd.supabase.co",
    );
    expect(normalizeSupabaseUrl("https://abcd.supabase.co/rest/v1")).toBe(
      "https://abcd.supabase.co",
    );
  });
});
