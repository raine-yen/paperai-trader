import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncPredictionCatalog } from "@/lib/prediction-sync";

// Refreshes the persisted prediction-markets catalog from Polymarket Gamma.
// Vercel Cron hits this every 10 minutes (Hobby minimum); manual GET works too.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const synced = await syncPredictionCatalog(supabaseAdmin());
    return NextResponse.json({ ok: true, synced });
  } catch (e) {
    console.error("prediction catalog sync failed", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
