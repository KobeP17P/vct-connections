import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function isValidSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Project origin only. Pasting the Data API path (/rest/v1) makes RPC calls 404. */
export function normalizeSupabaseUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || !isValidSupabaseUrl(trimmed)) return undefined;
  try {
    const url = new URL(trimmed);
    url.pathname = url.pathname.replace(/\/rest\/v1\/?$/, "");
    const path = url.pathname.replace(/\/+$/, "");
    return url.origin + (path && path !== "" ? path : "");
  } catch {
    return undefined;
  }
}

export function getSupabaseUrl(): string | undefined {
  const value = import.meta.env.VITE_SUPABASE_URL;
  return value ? normalizeSupabaseUrl(value) : undefined;
}

export function getSupabasePublishableKey(): string | undefined {
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function createPublicSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) return null;

  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>,
): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) return null;

  try {
    return createClient(url, key, {
      accessToken: getToken,
    });
  } catch {
    return null;
  }
}
