// Browser-facing trade endpoint — uses session, not API key
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { placeOrder } from "@/lib/engine";
import { toAlpacaOrder } from "@/lib/alpaca-format";

const tradeSchema = z.object({
  symbol: z.string().min(1),
  qty: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit"]).default("market"),
  limit_price: z.union([z.number(), z.string()]).optional().transform((v) => (v == null ? undefined : Number(v))),
  scheduled_at: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: ud } = await sb.auth.getUser();
  if (!ud.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = tradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: account } = await db
    .from("accounts")
    .select("*")
    .eq("user_id", ud.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "no account" }, { status: 400 });

  const order = await placeOrder({
    account,
    symbol: parsed.data.symbol,
    qty: parsed.data.qty,
    side: parsed.data.side,
    type: parsed.data.type,
    limit_price: parsed.data.limit_price,
    scheduled_at: parsed.data.scheduled_at,
  });

  if (!order.ok) return NextResponse.json({ error: order.error }, { status: 422 });
  return NextResponse.json(toAlpacaOrder(order.order!));
}
