import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchYahooPrices } from "@/lib/prices";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const competitionId = url.searchParams.get("competition_id");

  const db = supabaseAdmin();

  // Fetch all active accounts (optionally filtered by competition)
  let accountQuery = db
    .from("accounts")
    .select("id, user_id, display_name, cash, starting_cash, competition_id, equity")
    .eq("status", "active")
    .limit(100);

  if (competitionId) accountQuery = accountQuery.eq("competition_id", competitionId);

  const { data: accounts, error: acctErr } = await accountQuery;
  if (acctErr) return NextResponse.json({ error: acctErr.message }, { status: 500 });
  if (!accounts || accounts.length === 0) return NextResponse.json({ entries: [] });

  const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
  const userEmailMap = new Map(users.map((u) => [u.id, u.email ?? "unknown"]));

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
  const posValueByAccount = new Map<string, number>();
  for (const p of posRows) {
    const priceData = priceMap.get(p.symbol) as { price: number } | undefined;
    const price = priceData ? priceData.price : Number(p.avg_entry_price);
    posValueByAccount.set(p.account_id, (posValueByAccount.get(p.account_id) ?? 0) + Number(p.qty) * price);
  }

  type AccountRow = {
    id: string;
    user_id?: string;
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
      const posValue = posValueByAccount.get(a.id) ?? 0;
      const liveEquity = Number(a.cash) + posValue;
      const startingCash = Number(a.starting_cash);
      const returnPct = startingCash > 0 ? ((liveEquity - startingCash) / startingCash) * 100 : 0;
      const email = userEmailMap.get(a.user_id ?? "") ?? "unknown";
      const duplicateName = (duplicateNameCounts.get(a.display_name.trim().toLowerCase()) ?? 0) > 1;
      const emailLabel = email.includes("@") ? email.split("@")[0] : email;
      return {
        account_id: a.id,
        competition_id: a.competition_id,
        display_name: duplicateName ? `${a.display_name} (${emailLabel})` : a.display_name,
        raw_display_name: a.display_name,
        email,
        equity: liveEquity,
        starting_cash: startingCash,
        return_pct: returnPct,
      };
    })
    .sort((a, b) => b.return_pct - a.return_pct);

  return NextResponse.json({ entries });
}

export const dynamic = "force-dynamic";
