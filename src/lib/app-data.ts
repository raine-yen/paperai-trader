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
  if (!account) return { response: NextResponse.json({ error: "no account" }, { status: 400 }) };
  return { user, account: account as SessionAccount, db };
}

export function cleanSymbol(symbol: unknown) {
  return String(symbol ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, "")
    .slice(0, 12);
}
