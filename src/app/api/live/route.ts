import { NextRequest, NextResponse } from "next/server";
import { fetchYahooDetailedQuotes } from "@/lib/prices";

/**
 * Lightweight anchor endpoint for the client-side 10 Hz presentation feed.
 * Source quotes are cached server-side; the browser interpolates between anchors
 * and labels those intermediate updates as simulated rather than real trades.
 */
export async function GET(req: NextRequest) {
  const rawSymbols = new URL(req.url).searchParams.get("symbols") ?? "";
  const symbols = rawSymbols
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => /^[A-Z0-9.^=-]{1,20}$/.test(symbol))
    .slice(0, 24);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  const quotes = await fetchYahooDetailedQuotes(symbols);
  return NextResponse.json(
    {
      quotes: symbols
        .map((symbol) => quotes.get(symbol))
        .filter((quote): quote is NonNullable<typeof quote> => Boolean(quote)),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export const dynamic = "force-dynamic";
