import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseForRequest } from "@/lib/supabase/request";
import { getSessionUser } from "@/lib/session-user";

const REWARD_POINTS = 200; // recognition points only — never account cash

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Dashboard reads should not require a service-role key: this authenticated
  // request is constrained by the user's existing RLS policies.
  const db = await supabaseForRequest(req);
  const { data: account } = await db
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!account) return NextResponse.json({ claims: [] });

  const { data, error } = await db
    .from("quest_points")
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
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "no account" }, { status: 400 });

  const { error: claimError } = await db.from("quest_points").insert({
    account_id: account.id,
    quest_id: questId,
    cycle_id: cycleId,
    points: REWARD_POINTS,
  });

  const message = claimError?.message?.toLowerCase() ?? "";
  const duplicate = claimError?.code === "23505" || message.includes("duplicate");
  const missingTable = message.includes("quest_points") || message.includes("schema cache");
  if (duplicate) return NextResponse.json({ error: "reward already claimed" }, { status: 409 });
  if (claimError && !missingTable) return NextResponse.json({ error: claimError.message }, { status: 500 });

  // Vanta compliance: quests award recognition points only. Account cash is set
  // exactly once ($10,000) at account creation and is never topped up.
  return NextResponse.json({
    ok: true,
    points: REWARD_POINTS,
    claim: `${cycleId}:${questId}`,
    untracked: Boolean(missingTable),
  });
}

export const dynamic = "force-dynamic";
