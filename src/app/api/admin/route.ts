import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { fetchYahooPrices } from "@/lib/prices";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/session-user";

async function verifyAdmin(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = supabaseAdmin();

  const [{ data: accounts }, { data: { users } }] = await Promise.all([
    db.from("accounts").select("*").order("equity", { ascending: false }),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.email ?? "unknown"]));

  const accountIds = (accounts ?? []).map((a: { id: string }) => a.id);

  const [{ data: allPositions }, { data: allOrders }] = await Promise.all([
    db.from("positions").select("account_id, symbol, qty, avg_entry_price").in("account_id", accountIds),
    db.from("orders").select("account_id, status").in("account_id", accountIds),
  ]);

  const posRows = (allPositions ?? []) as Array<{
    account_id: string;
    symbol: string;
    qty: number;
    avg_entry_price: number;
  }>;
  const symbols = Array.from(new Set(posRows.map((p) => p.symbol)));
  const priceMap = symbols.length > 0 ? await fetchYahooPrices(symbols) : new Map<string, { price: number }>();

  const missingSymbols = symbols.filter((s) => !priceMap.has(s));
  if (missingSymbols.length > 0) {
    const { data: cached } = await db.from("prices").select("symbol, price").in("symbol", missingSymbols);
    for (const row of (cached ?? []) as { symbol: string; price: number }[]) {
      priceMap.set(row.symbol, { price: Number(row.price) } as never);
    }
  }

  const posCountMap = new Map<string, number>();
  const posValueMap = new Map<string, number>();
  const positionsByAccount = new Map<string, Array<{
    symbol: string;
    qty: number;
    avg_entry_price: number;
    current_price: number;
    market_value: number;
  }>>();
  for (const p of posRows) {
    posCountMap.set(p.account_id, (posCountMap.get(p.account_id) ?? 0) + 1);
    const livePrice = (priceMap.get(p.symbol) as { price: number } | undefined)?.price ?? Number(p.avg_entry_price);
    const marketValue = Number(p.qty) * livePrice;
    posValueMap.set(p.account_id, (posValueMap.get(p.account_id) ?? 0) + marketValue);
    positionsByAccount.set(p.account_id, [
      ...(positionsByAccount.get(p.account_id) ?? []),
      {
        symbol: p.symbol,
        qty: Number(p.qty),
        avg_entry_price: Number(p.avg_entry_price),
        current_price: livePrice,
        market_value: marketValue,
      },
    ]);
  }

  const orderCountMap = new Map<string, number>();
  for (const o of allOrders ?? []) {
    orderCountMap.set(o.account_id, (orderCountMap.get(o.account_id) ?? 0) + 1);
  }

  type RawAccount = { id: string; user_id: string; cash: number; equity: number; starting_cash: number; [k: string]: unknown };

  const enriched = (accounts ?? []).map((a: RawAccount) => {
    const positionsValue = posValueMap.get(a.id) ?? 0;
    const liveEquity = Number(a.cash) + positionsValue;
    const startingCash = Number(a.starting_cash);
    return {
      ...a,
      email: userMap.get(a.user_id) ?? "unknown",
      equity: liveEquity,
      positions_value: positionsValue,
      positions: positionsByAccount.get(a.id) ?? [],
      position_count: posCountMap.get(a.id) ?? 0,
      order_count: orderCountMap.get(a.id) ?? 0,
      return_pct: startingCash > 0 ? ((liveEquity - startingCash) / startingCash) * 100 : 0,
    };
  });

  const totalEquity = enriched.reduce((s, a) => s + Number(a.equity), 0);
  const avgReturn = enriched.length > 0 ? enriched.reduce((s, a) => s + a.return_pct, 0) / enriched.length : 0;
  const totalOrders = allOrders?.length ?? 0;

  return NextResponse.json({
    accounts: enriched,
    stats: {
      total_users: enriched.length,
      total_orders: totalOrders,
      total_equity: totalEquity,
      avg_return_pct: avgReturn,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  const body = await req.json();
  const { action, account_id } = body as { action: string; account_id: string; amount?: number };

  if (!account_id) return NextResponse.json({ error: "account_id required" }, { status: 400 });

  const { data: account } = await db.from("accounts").select("*").eq("id", account_id).maybeSingle();
  if (!account) return NextResponse.json({ error: "account not found" }, { status: 404 });

  if (action === "reset") {
    await Promise.all([
      db.from("positions").delete().eq("account_id", account_id),
      db
        .from("orders")
        .update({ status: "canceled", canceled_at: new Date().toISOString() })
        .eq("account_id", account_id)
        .eq("status", "new"),
    ]);
    await db
      .from("accounts")
      .update({ cash: account.starting_cash, equity: account.starting_cash })
      .eq("id", account_id);
    return NextResponse.json({ ok: true, message: "Account reset to starting cash" });
  }

  if (action === "disable") {
    await db.from("accounts").update({ status: "disabled" }).eq("id", account_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "enable") {
    await db.from("accounts").update({ status: "active" }).eq("id", account_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "adjust_cash") {
    const { amount } = body as { amount: number };
    if (typeof amount !== "number" || amount < 0) {
      return NextResponse.json({ error: "invalid amount" }, { status: 400 });
    }
    await db.from("accounts").update({ cash: amount }).eq("id", account_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "update_display_name") {
    const { display_name } = body as { display_name?: string };
    const cleanName = display_name?.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 40) {
      return NextResponse.json({ error: "display name must be 2-40 characters" }, { status: 400 });
    }
    await db.from("accounts").update({ display_name: cleanName }).eq("id", account_id);
    return NextResponse.json({ ok: true, message: "Username updated" });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export const dynamic = "force-dynamic";
