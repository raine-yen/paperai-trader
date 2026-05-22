import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/session-user";

const REWARD_AMOUNT = 200;

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: account } = await db
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!account) return NextResponse.json({ claims: [] });

  const { data, error } = await db
    .from("reward_claims")
    .select("quest_id, cycle_id")
    .eq("account_id", account.id);

  if (error) return NextResponse.json({ claims: [], untracked: true });

  return NextResponse.json({
    claims: (data ?? []).map((claim: { quest_id: string; cycle_id: string }) => `${claim.cycle_id}:${claim.quest_id}`),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const questId = typeof body?.quest_id === "string" ? body.quest_id : "";
  const cycleId = typeof body?.cycle_id === "string" ? body.cycle_id : "";
  if (!questId || !cycleId) return NextResponse.json({ error: "quest_id and cycle_id required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: account } = await db
    .from("accounts")
    .select("id, cash, equity")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "no account" }, { status: 400 });

  const { error: claimError } = await db.from("reward_claims").insert({
    account_id: account.id,
    quest_id: questId,
    cycle_id: cycleId,
    amount: REWARD_AMOUNT,
  });

  const message = claimError?.message?.toLowerCase() ?? "";
  const duplicate = claimError?.code === "23505" || message.includes("duplicate");
  const missingTable = message.includes("reward_claims") || message.includes("schema cache");
  if (duplicate) return NextResponse.json({ error: "reward already claimed" }, { status: 409 });
  if (claimError && !missingTable) return NextResponse.json({ error: claimError.message }, { status: 500 });

  const nextCash = Number(account.cash) + REWARD_AMOUNT;
  const nextEquity = Number(account.equity ?? account.cash) + REWARD_AMOUNT;
  const { error: updateError } = await db
    .from("accounts")
    .update({ cash: nextCash, equity: nextEquity })
    .eq("id", account.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    amount: REWARD_AMOUNT,
    cash: nextCash,
    claim: `${cycleId}:${questId}`,
    untracked: Boolean(missingTable),
  });
}

export const dynamic = "force-dynamic";
