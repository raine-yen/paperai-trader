import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  fetchActiveMarkets,
  catalogNeedsQuoteRepair,
  hydratePredictionMarketPrices,
  persistCatalogRows,
  type PredictionMarketRow,
} from "@/lib/prediction-sync";

export interface PredictionMarket {
  id: string; // condition id (catalog PK; matches /api/predictions/* routes)
  question: string;
  category: string | null;
  yesTokenId: string | null;
  noTokenId: string | null;
  outcomes: string[];
  yesPrice: number | null; // live CLOB midpoint (0..1), last-known on failure
  noPrice: number | null;
  volume24hr: number | null;
  endDate: string | null;
  image: string | null;
  url: string | null;
  status: string;
}

const LIVE_CACHE_MS = 60_000;
let liveCache: { expiresAt: number; markets: PredictionMarket[] } | null = null;

function toMarket(row: {
  id: string;
  question: string;
  category: string | null;
  yes_token_id: string | null;
  no_token_id: string | null;
  yes_price: number | null;
  no_price: number | null;
  volume_24h: number | null;
  end_date: string | null;
  status: string;
  image: string | null;
  url: string | null;
}): PredictionMarket {
  return {
    id: row.id,
    question: row.question,
    category: row.category,
    yesTokenId: row.yes_token_id,
    noTokenId: row.no_token_id,
    outcomes: ["Yes", "No"],
    yesPrice: row.yes_price,
    noPrice: row.no_price ?? (row.yes_price == null ? null : Math.round((1 - row.yes_price) * 10000) / 10000),
    volume24hr: row.volume_24h,
    endDate: row.end_date,
    image: row.image,
    url: row.url,
    status: row.status,
  };
}

export async function GET(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;
  const forceRefresh = searchParams.get("refresh") === "1";
  const requestedIds = Array.from(new Set((searchParams.get("ids") ?? "").split(",").map((id) => id.trim()).filter(Boolean))).slice(0, 50);
  if (!forceRefresh && liveCache && liveCache.expiresAt > Date.now()) {
    return NextResponse.json({ items: liveCache.markets, cached: true });
  }
  try {
    const db = supabaseAdmin();
    let rows = (
      await db
        .from("prediction_markets")
        .select("*")
        .eq("status", "active")
        .order("volume_24h", { ascending: false })
        .limit(20)
    ).data as PredictionMarketRow[] | null;

    if (requestedIds.length) {
      const heldRows = (await db.from("prediction_markets").select("*").in("id", requestedIds)).data as PredictionMarketRow[] | null;
      const merged = new Map((rows ?? []).map((row) => [row.id, row]));
      for (const row of heldRows ?? []) merged.set(row.id, row);
      rows = Array.from(merged.values());
    }

    // First run before the cron has populated the catalog: fetch Gamma directly
    // (and let the next cron persist it). Keeps the endpoint usable immediately.
    if (!rows || rows.length === 0) {
      rows = await fetchActiveMarkets();
      // A first visitor should repair an empty catalog, not merely receive a
      // transient fallback that still cannot be traded or charted.
      await persistCatalogRows(db, rows);
    } else if (catalogNeedsQuoteRepair(rows)) {
      // Repair a legacy all-null catalog promptly. Two pages keep this request
      // bounded; the cron continues to fill the full 1,000-market catalog.
      try {
        const refreshed = await fetchActiveMarkets(fetch, 2);
        await persistCatalogRows(db, refreshed);
        rows = refreshed.slice(0, 20);
      } catch {
        console.warn("Legacy catalog repair failed; serving cached rows");
      }
    }

    // Hydrate a bounded batch and persist usable values. A later CLOB timeout
    // can then fall back to a recent, real quote rather than disabling trading.
    const quotedRows = await hydratePredictionMarketPrices(rows ?? [], fetch, 4);
    await persistCatalogRows(db, quotedRows);
    const markets = quotedRows.map(toMarket);

    liveCache = { expiresAt: Date.now() + LIVE_CACHE_MS, markets };
    return NextResponse.json({ items: markets, cached: false });
  } catch (e) {
    console.error("prediction-markets list failed", e);
    return NextResponse.json(
      { items: liveCache?.markets ?? [], unavailable: true },
      { status: liveCache ? 200 : 503 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;
