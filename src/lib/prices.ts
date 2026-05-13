import { supabaseAdmin } from "@/lib/supabase/admin";

// Direct Yahoo Finance HTTP fetch — no package, no crumb issues on serverless.
// Uses the v8 chart endpoint which is the most reliable for single-symbol quotes.

export interface PriceQuote {
  symbol: string;
  price: number;
  prevClose: number | null;
  updatedAt: string;
}

const CACHE_TTL_MS = 30_000;
const memCache = new Map<string, { price: number; prevClose: number | null; ts: number }>();

const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

async function yahooQuote(symbol: string): Promise<{ price: number; prevClose: number | null } | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS, next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price =
      meta.regularMarketPrice ??
      meta.postMarketPrice ??
      meta.preMarketPrice ??
      null;
    if (typeof price !== "number") return null;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
    return { price, prevClose };
  } catch {
    return null;
  }
}

export async function fetchYahooPrice(symbol: string): Promise<PriceQuote | null> {
  const upper = symbol.toUpperCase();
  const cached = memCache.get(upper);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { symbol: upper, price: cached.price, prevClose: cached.prevClose, updatedAt: new Date(cached.ts).toISOString() };
  }
  const q = await yahooQuote(upper);
  if (!q) return null;
  memCache.set(upper, { price: q.price, prevClose: q.prevClose, ts: Date.now() });
  return { symbol: upper, price: q.price, prevClose: q.prevClose, updatedAt: new Date().toISOString() };
}

export async function fetchYahooPrices(symbols: string[]): Promise<Map<string, PriceQuote>> {
  const out = new Map<string, PriceQuote>();
  if (symbols.length === 0) return out;
  const upper = Array.from(new Set(symbols.map((s) => s.toUpperCase())));

  await Promise.all(
    upper.map(async (s) => {
      const cached = memCache.get(s);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        out.set(s, { symbol: s, price: cached.price, prevClose: cached.prevClose, updatedAt: new Date(cached.ts).toISOString() });
        return;
      }
      const q = await yahooQuote(s);
      if (!q) return;
      memCache.set(s, { price: q.price, prevClose: q.prevClose, ts: Date.now() });
      out.set(s, { symbol: s, price: q.price, prevClose: q.prevClose, updatedAt: new Date().toISOString() });
    })
  );
  return out;
}

export async function getPrice(symbol: string): Promise<number | null> {
  const upper = symbol.toUpperCase();
  const db = supabaseAdmin();

  const { data: cached } = await db
    .from("prices")
    .select("price, updated_at")
    .eq("symbol", upper)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date((cached as { updated_at: string }).updated_at).getTime();
    if (age < 120_000) return Number((cached as { price: number }).price);
  }

  const live = await fetchYahooPrice(upper);
  if (!live) return cached ? Number((cached as { price: number }).price) : null;

  await db.from("prices").upsert({
    symbol: upper,
    price: live.price,
    prev_close: live.prevClose,
    updated_at: new Date().toISOString(),
  });
  return live.price;
}

export async function getHistoricalBars(
  symbol: string,
  interval: "1d" | "1h" | "5m" | "15m" = "1d",
  range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" = "1mo"
): Promise<Array<{ t: string; o: number; h: number; l: number; c: number; v: number }>> {
  const upper = symbol.toUpperCase();
  const intervalMap: Record<string, string> = { "1d": "1d", "1h": "1h", "5m": "5m", "15m": "15m" };
  const yInterval = intervalMap[interval] ?? "1d";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upper)}?interval=${yInterval}&range=${range}`;
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS, next: { revalidate: 0 } });
    if (!res.ok) return [];
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp ?? [];
    const ohlcv = result.indicators?.quote?.[0] ?? {};
    return timestamps
      .map((t: number, i: number) => ({
        t: new Date(t * 1000).toISOString(),
        o: Number(ohlcv.open?.[i] ?? ohlcv.close?.[i] ?? 0),
        h: Number(ohlcv.high?.[i] ?? ohlcv.close?.[i] ?? 0),
        l: Number(ohlcv.low?.[i] ?? ohlcv.close?.[i] ?? 0),
        c: Number(ohlcv.close?.[i] ?? 0),
        v: Number(ohlcv.volume?.[i] ?? 0),
      }))
      .filter((b) => b.c > 0);
  } catch {
    return [];
  }
}
