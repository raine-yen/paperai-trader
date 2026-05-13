import yahooFinanceTyped from "yahoo-finance2";
import { supabaseAdmin } from "@/lib/supabase/admin";

// The package's public types only cover quote/autoc, but the runtime exports
// chart/historical/etc. Cast once here and use the looser shape internally.
interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  postMarketPrice?: number;
  preMarketPrice?: number;
}
interface YahooChartQuote {
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}
interface YahooFinance {
  quote(symbol: string | string[]): Promise<YahooQuote | YahooQuote[]>;
  chart(
    symbol: string,
    opts: { period1: Date | string | number; period2?: Date | string | number; interval?: string }
  ): Promise<{ quotes: YahooChartQuote[] }>;
  suppressNotices?(notices: string[]): void;
}
const yahooFinance = yahooFinanceTyped as unknown as YahooFinance;
yahooFinance.suppressNotices?.(["yahooSurvey", "ripHistorical"]);

export interface PriceQuote {
  symbol: string;
  price: number;
  prevClose: number | null;
  updatedAt: string;
}

const CACHE_TTL_MS = 30_000;
const memCache = new Map<string, { price: number; prevClose: number | null; ts: number }>();

export async function fetchYahooPrice(symbol: string): Promise<PriceQuote | null> {
  const upper = symbol.toUpperCase();
  const cached = memCache.get(upper);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return {
      symbol: upper,
      price: cached.price,
      prevClose: cached.prevClose,
      updatedAt: new Date(cached.ts).toISOString(),
    };
  }
  try {
    const q = (await yahooFinance.quote(upper)) as YahooQuote;
    const price = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice;
    if (typeof price !== "number") return null;
    const prevClose = q.regularMarketPreviousClose ?? null;
    memCache.set(upper, { price, prevClose, ts: Date.now() });
    return { symbol: upper, price, prevClose, updatedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

export async function fetchYahooPrices(symbols: string[]): Promise<Map<string, PriceQuote>> {
  const out = new Map<string, PriceQuote>();
  if (symbols.length === 0) return out;
  const upper = Array.from(new Set(symbols.map((s) => s.toUpperCase())));

  const toFetch: string[] = [];
  for (const s of upper) {
    const cached = memCache.get(s);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      out.set(s, {
        symbol: s,
        price: cached.price,
        prevClose: cached.prevClose,
        updatedAt: new Date(cached.ts).toISOString(),
      });
    } else {
      toFetch.push(s);
    }
  }
  if (toFetch.length === 0) return out;

  try {
    const results = await yahooFinance.quote(toFetch);
    const arr = Array.isArray(results) ? results : [results];
    for (const q of arr) {
      const sym = q.symbol?.toUpperCase();
      const price = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice;
      if (typeof price !== "number" || !sym) continue;
      const prevClose = q.regularMarketPreviousClose ?? null;
      memCache.set(sym, { price, prevClose, ts: Date.now() });
      out.set(sym, { symbol: sym, price, prevClose, updatedAt: new Date().toISOString() });
    }
  } catch (e) {
    console.error("yahoo batch fetch failed", e);
  }
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
    const age = Date.now() - new Date(cached.updated_at).getTime();
    if (age < 120_000) return Number(cached.price);
  }

  const live = await fetchYahooPrice(upper);
  if (!live) return cached ? Number(cached.price) : null;

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
  const now = new Date();
  const period2 = now;
  const period1 = new Date(now);
  switch (range) {
    case "1d":
      period1.setDate(period1.getDate() - 1);
      break;
    case "5d":
      period1.setDate(period1.getDate() - 5);
      break;
    case "1mo":
      period1.setMonth(period1.getMonth() - 1);
      break;
    case "3mo":
      period1.setMonth(period1.getMonth() - 3);
      break;
    case "6mo":
      period1.setMonth(period1.getMonth() - 6);
      break;
    case "1y":
      period1.setFullYear(period1.getFullYear() - 1);
      break;
  }
  try {
    const result = await yahooFinance.chart(upper, { period1, period2, interval });
    const quotes = result.quotes ?? [];
    return quotes
      .filter((q) => q.close != null)
      .map((q) => ({
        t: q.date.toISOString(),
        o: Number(q.open ?? q.close),
        h: Number(q.high ?? q.close),
        l: Number(q.low ?? q.close),
        c: Number(q.close),
        v: Number(q.volume ?? 0),
      }));
  } catch (e) {
    console.error("yahoo chart fetch failed", e);
    return [];
  }
}
