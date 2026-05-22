import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchYahooPrices } from "@/lib/prices";
import { getSessionUser } from "@/lib/session-user";

// Authenticated dashboard endpoint — returns the current user's account, positions, recent orders.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();

  const { data: account } = await db
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!account) return NextResponse.json({ account: null });

  const [{ data: positions }, { data: orders }, { data: fills }, { data: snapshots }] = await Promise.all([
    db.from("positions").select("*").eq("account_id", account.id),
    db
      .from("orders")
      .select("*")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false })
      .limit(25),
    db
      .from("fills")
      .select("*")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false })
      .limit(25),
    db
      .from("equity_snapshots")
      .select("equity, created_at")
      .eq("account_id", account.id)
      .order("created_at", { ascending: true })
      .limit(500),
  ]);

  const symbols = (positions ?? []).map((p: { symbol: string }) => p.symbol);
  const priceMap = await fetchYahooPrices(symbols);

  const positionsWithMarket = (positions ?? []).map((p: { symbol: string; qty: number; avg_entry_price: number; id: string }) => {
    const cp = priceMap.get(p.symbol)?.price ?? Number(p.avg_entry_price);
    const marketValue = Number(p.qty) * cp;
    const costBasis = Number(p.qty) * Number(p.avg_entry_price);
    const unrealizedPL = marketValue - costBasis;
    return {
      ...p,
      current_price: cp,
      market_value: marketValue,
      cost_basis: costBasis,
      unrealized_pl: unrealizedPL,
      unrealized_plpc: costBasis === 0 ? 0 : (unrealizedPL / costBasis) * 100,
    };
  });

  const positionsValue = positionsWithMarket.reduce((s, p) => s + p.market_value, 0);
  const equity = Number(account.cash) + positionsValue;

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    account: { ...account, equity, positions_value: positionsValue },
    positions: positionsWithMarket,
    orders: orders ?? [],
    fills: fills ?? [],
    snapshots: snapshots ?? [],
  });
}

export const dynamic = "force-dynamic";
