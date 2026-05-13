import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const competitionId = url.searchParams.get("competition_id");

  const db = supabaseAdmin();
  let q = db.from("leaderboard").select("*").order("return_pct", { ascending: false }).limit(100);
  if (competitionId) q = q.eq("competition_id", competitionId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

export const dynamic = "force-dynamic";
