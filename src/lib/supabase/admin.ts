import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only admin client (bypasses RLS). Use ONLY in route handlers
// that have already verified an API key or session.
//
// We deliberately use the untyped `SupabaseClient` here rather than threading
// a full `Database<>` generic. The schema-generic in @supabase/supabase-js is
// strict about row shapes matching `Record<string, unknown>`, which our
// hand-written types don't satisfy; threading it through makes every query
// collapse to `never`. The runtime behavior is identical — callers cast the
// shape of returned rows on a per-query basis using the types in `./types.ts`.

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin client missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
