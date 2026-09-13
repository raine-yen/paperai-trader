import { NextRequest, NextResponse } from "next/server";
import { settlePredictionMarkets } from "@/lib/prediction-settle";
import { getSessionUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Settles only the signed-in trader's resolved prediction positions. This
// short path lets a user receive a paper payout immediately rather than
// waiting for the once-daily cron settlement pass.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: account } = await db.from("accounts").select("id").eq("user_id", user.id).maybeSingle();
  if (!account) return NextResponse.json({ error: "paper account not found" }, { status: 404 });

  try {
    const settled = await settlePredictionMarkets({ db: db as any, accountId: account.id });
    return NextResponse.json({ ok: true, settled });
  } catch (error) {
    console.error("prediction settlement failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "settlement failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;
