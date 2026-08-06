import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchYahooPrices } from "@/lib/prices";
import { getSessionUser } from "@/lib/session-user";
import { calculateInvestedPerformance } from "@/lib/performance";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data: viewerAccount } = await db
    .from("accounts")
    .select("competition_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!viewerAccount) return NextResponse.json({ entries: [] });

  const accountQuery = db
    .from("accounts")
    .select("id, display_name, cash, starting_cash, competition_id, equity")
    .eq("status", "active")
    .eq("competition_id", viewerAccount.competition_id)
    .limit(100);

  const { data: accounts, error: acctErr } = await accountQuery;
  if (acctErr) return NextResponse.json({ error: acctErr.message }, { status: 500 });
  if (!accounts || accounts.length === 0) return NextResponse.json({ entries: [] });

  // Fetch all positions for these accounts (include avg_entry_price as price fallback)
  const accountIds = (accounts as { id: string }[]).map((a) => a.id);
  const { data: positions } = await db
    .from("positions")
    .select("account_id, symbol, qty, avg_entry_price")
    .in("account_id", accountIds);

  const posRows = (positions ?? []) as { account_id: string; symbol: string; qty: number; avg_entry_price: number }[];

  // Fetch live prices for all held symbols
  const symbols = Array.from(new Set(posRows.map((p) => p.symbol)));
  const priceMap = symbols.length > 0 ? await fetchYahooPrices(symbols) : new Map<string, { price: number }>();

  // Fall back to prices table for any missing symbols
  const missingSymbols = symbols.filter((s) => !priceMap.has(s));
  if (missingSymbols.length > 0) {
    const { data: cached } = await db.from("prices").select("symbol, price").in("symbol", missingSymbols);
    for (const row of (cached ?? []) as { symbol: string; price: number }[]) {
      priceMap.set(row.symbol, { price: Number(row.price) } as never);
    }
  }

  // Build account_id -> positions market value map
  // Falls back to avg_entry_price when live price is unavailable so equity never shows as just cash
  const positionsByAccount = new Map<string, Array<{ qty: number; avg_entry_price: number; current_price: number }>>();
  for (const p of posRows) {
    const priceData = priceMap.get(p.symbol) as { price: number } | undefined;
    const price = priceData ? priceData.price : Number(p.avg_entry_price);
    positionsByAccount.set(p.account_id, [
      ...(positionsByAccount.get(p.account_id) ?? []),
      { qty: Number(p.qty), avg_entry_price: Number(p.avg_entry_price), current_price: price },
    ]);
  }

  type AccountRow = {
    id: string;
    display_name: string;
    cash: number;
    starting_cash: number;
    competition_id: string;
  };

  const duplicateNameCounts = new Map<string, number>();
  for (const a of accounts as AccountRow[]) {
    const key = a.display_name.trim().toLowerCase();
    duplicateNameCounts.set(key, (duplicateNameCounts.get(key) ?? 0) + 1);
  }

  // Compute live equity and return_pct, then sort
  const entries = (accounts as AccountRow[])
    .map((a) => {
      const performance = calculateInvestedPerformance(positionsByAccount.get(a.id) ?? []);
      const posValue = performance.market_value;
      const liveEquity = Number(a.cash) + posValue;
      const duplicateName = (duplicateNameCounts.get(a.display_name.trim().toLowerCase()) ?? 0) > 1;
      const safeSuffix = a.id.replace(/-/g, "").slice(0, 4).toUpperCase();
      return {
        account_id: a.id,
        competition_id: a.competition_id,
        display_name: duplicateName ? `${a.display_name} #${safeSuffix}` : a.display_name,
        raw_display_name: a.display_name,
        equity: liveEquity,
        starting_cash: Number(a.starting_cash),
        cost_basis: performance.cost_basis,
        gain_amount: performance.gain_amount,
        return_pct: performance.growth_pct,
      };
    })
    .sort((a, b) => b.return_pct - a.return_pct);

  return NextResponse.json({ entries });
}

export const dynamic = "force-dynamic";
