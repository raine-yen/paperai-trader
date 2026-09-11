// Close-early sell endpoint — Polymarket/Robinhood behavior: sell any amount
// (or all shares via close_all) at the live market price; proceeds return to
// the shared paper cash.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sellPredictionShares } from "@/lib/prediction-engine";
import { getSessionUser } from "@/lib/session-user";

const closeSchema = z
  .object({
    market_id: z.string().min(1),
    outcome: z.enum(["yes", "no"]),
    shares: z.union([z.number(), z.string()]).optional().transform((v) => (v == null ? undefined : Number(v))),
    close_all: z.boolean().optional(),
    client_order_id: z.string().min(8).max(128).optional(),
  })
  .refine((d) => d.close_all === true || (d.shares != null && d.shares > 0), {
    message: "provide shares > 0 or close_all: true",
  });

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = closeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: account } = await db
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!account) return NextResponse.json({ error: "no account" }, { status: 400 });

  const r = await sellPredictionShares({
    accountId: account.id,
    marketId: parsed.data.market_id,
    outcome: parsed.data.outcome,
    shares: parsed.data.shares,
    closeAll: parsed.data.close_all,
    clientOrderId: parsed.data.client_order_id,
  });

  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 });
  return NextResponse.json({
    ok: true,
    shares: r.result.shares,
    proceeds: r.result.proceeds,
    realized_pnl: r.result.realizedPnl,
    cash_after: r.result.cash_after,
    closed: r.result.closed,
    duplicate: r.result.duplicate,
  });
}
