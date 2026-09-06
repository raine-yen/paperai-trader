import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Makes account provisioning recoverable for pre-existing Supabase Auth users.
 * Older users may predate the accounts row; on their next successful sign-in we
 * restore exactly one paper account in the active default competition.
 */
type PaperUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type Competition = { id: string; starting_cash: number | string };

const CANONICAL_STARTING_CASH = 10_000;

function accountRow(user: PaperUser, competition: Competition) {
  const displayName =
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()) ||
    user.email?.split("@")[0] ||
    "Trader";
  return {
    user_id: user.id,
    competition_id: competition.id,
    display_name: displayName.slice(0, 40),
    cash: CANONICAL_STARTING_CASH,
    starting_cash: CANONICAL_STARTING_CASH,
    equity: CANONICAL_STARTING_CASH,
  };
}

async function getActivePaperCompetition(db: SupabaseClient): Promise<Competition> {
  let { data: competition, error } = await db
    .from("competitions")
    .select("id, starting_cash")
    .eq("is_default", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error("Could not load the default paper competition.");

  if (!competition) {
    const fallback = await db
      .from("competitions")
      .select("id, starting_cash")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    competition = fallback.data;
    if (fallback.error || !competition) {
      throw new Error("No active paper competition is available.");
    }
  }

  return competition as Competition;
}

/** Provision one missing account without modifying an existing portfolio. */
export async function ensurePaperAccount(user: PaperUser, db: SupabaseClient) {
  const competition = await getActivePaperCompetition(db);
  const { data: existing, error: lookupError } = await db
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("competition_id", competition.id)
    .maybeSingle();

  if (lookupError) throw new Error("Could not verify your paper account.");
  if (existing) return;

  const { error } = await db.from("accounts").insert(accountRow(user, competition));

  if (error) throw new Error("Could not activate your paper account.");
}

/** Backfill all Supabase Auth users into the active default paper competition. */
export async function ensureAllPaperAccounts() {
  const db = supabaseAdmin();
  const competition = await getActivePaperCompetition(db);
  let page = 1;
  let createdOrExisting = 0;

  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Could not load users for paper-account activation.");
    const users = data.users as PaperUser[];
    if (users.length === 0) break;

    const { error: upsertError } = await db
      .from("accounts")
      .upsert(users.map((user) => accountRow(user, competition)), {
        onConflict: "user_id,competition_id",
        ignoreDuplicates: true,
      });
    if (upsertError) throw new Error("Could not activate paper accounts.");

    createdOrExisting += users.length;
    if (users.length < 1000) break;
    page += 1;
  }

  return createdOrExisting;
}
