import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { settlePredictionMarkets } from "@/lib/prediction-settle";

// Pays out resolved prediction markets: $1/winning share to the shared paper
// cash, zeroes losing positions, marks the market resolved. Runs daily
// (Hobby cron ceiling); also callable on-demand via /api/predictions/refresh.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await settlePredictionMarkets({ db: supabaseAdmin() as any });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("prediction settlement failed", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
