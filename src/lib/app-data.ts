import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type SessionAccount = {
  id: string;
  user_id: string;
  competition_id: string;
  display_name: string;
  cash: number;
  starting_cash: number;
  equity: number;
  status: string;
};

export function isMissingTableError(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message).toLowerCase()
      : "";
  return message.includes("schema cache") || message.includes("does not exist") || message.includes("relation");
}

export async function getCurrentAccount(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

  const db = supabaseAdmin();
  const { data: account, error } = await db
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!account) return { response: NextResponse.json({ error: "no paper account" }, { status: 403 }) };

  const suspendedUntil = typeof account.suspended_until === "string" ? Date.parse(account.suspended_until) : NaN;
  if (account.status === "disabled" && Number.isFinite(suspendedUntil) && suspendedUntil <= Date.now()) {
    const { data: restored, error: restoreError } = await db
      .from("accounts")
      .update({ status: "active", suspended_until: null })
      .eq("id", account.id)
      .select("*")
      .maybeSingle();
    if (restoreError) return { response: NextResponse.json({ error: restoreError.message }, { status: 500 }) };
    return { user, account: restored as SessionAccount, db };
  }
  if (account.status !== "active") {
    return { response: NextResponse.json({ error: "account disabled" }, { status: 403 }) };
  }
  return { user, account: account as SessionAccount, db };
}

export function cleanSymbol(symbol: unknown) {
  return String(symbol ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, "")
    .slice(0, 12);
}
