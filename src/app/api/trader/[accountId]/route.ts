import { NextRequest, NextResponse } from "next/server";
import { fetchYahooPrices } from "@/lib/prices";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentAccount, isMissingTableError } from "@/lib/app-data";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const db = supabaseAdmin();

  const { data: account, error } = await db
    .from("accounts")
    .select("id, display_name, cash, starting_cash, competition_id, created_at, status")
    .eq("id", accountId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!account || account.status !== "active") return NextResponse.json({ error: "trader not found" }, { status: 404 });

  const [{ data: positions }, { data: orders }, profileResult, achievementsResult, { data: snapshots }] = await Promise.all([
    db.from("positions").select("symbol, qty, avg_entry_price").eq("account_id", accountId),
    db.from("orders").select("id, symbol, side, qty, status, created_at").eq("account_id", accountId).order("created_at", { ascending: false }).limit(12),
    db.from("trader_profiles").select("*").eq("account_id", accountId).maybeSingle(),
    db.from("achievements").select("*").eq("account_id", accountId).order("earned_at", { ascending: false }).limit(12),
    db.from("equity_snapshots").select("equity, created_at").eq("account_id", accountId).order("created_at", { ascending: true }).limit(200),
  ]);

  const posRows = (positions ?? []) as Array<{ symbol: string; qty: number; avg_entry_price: number }>;
  const prices = posRows.length ? await fetchYahooPrices(posRows.map((p) => p.symbol)) : new Map<string, { price: number }>();
  const holdings = posRows.map((p) => {
    const current_price = prices.get(p.symbol)?.price ?? Number(p.avg_entry_price);
    return {
      symbol: p.symbol,
      qty: Number(p.qty),
      avg_entry_price: Number(p.avg_entry_price),
      current_price,
      market_value: Number(p.qty) * current_price,
    };
  });
  const positionsValue = holdings.reduce((sum, p) => sum + p.market_value, 0);
  const equity = Number(account.cash) + positionsValue;
  const returnPct = Number(account.starting_cash) > 0 ? ((equity - Number(account.starting_cash)) / Number(account.starting_cash)) * 100 : 0;

  return NextResponse.json({
    account: { ...account, equity, positions_value: positionsValue, return_pct: returnPct },
    profile: profileResult.error && isMissingTableError(profileResult.error) ? null : profileResult.data ?? null,
    achievements: achievementsResult.error && isMissingTableError(achievementsResult.error) ? [] : achievementsResult.data ?? [],
    positions: holdings,
    orders: orders ?? [],
    snapshots: snapshots ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const ctx = await getCurrentAccount(req);
  if ("response" in ctx) return ctx.response;
  const { accountId } = await params;
  if (ctx.account.id !== accountId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const risk = ["conservative", "balanced", "aggressive"].includes(String(body.risk_style)) ? String(body.risk_style) : "balanced";
  const { data, error } = await ctx.db
    .from("trader_profiles")
    .upsert({
      account_id: ctx.account.id,
      bio: String(body.bio ?? "").slice(0, 280) || null,
      strategy: String(body.strategy ?? "").slice(0, 280) || null,
      risk_style: risk,
      is_public: body.is_public !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: isMissingTableError(error) ? 501 : 500 });
  return NextResponse.json({ profile: data });
}

export const dynamic = "force-dynamic";
