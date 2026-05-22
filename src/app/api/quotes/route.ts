import { NextRequest, NextResponse } from "next/server";
import { fetchYahooDetailedQuotes } from "@/lib/prices";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawSymbols = url.searchParams.get("symbols") ?? "";
  const symbols = rawSymbols
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 25);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  const quotes = await fetchYahooDetailedQuotes(symbols);
  return NextResponse.json({
    quotes: symbols
      .map((symbol) => quotes.get(symbol))
      .filter((quote): quote is NonNullable<typeof quote> => Boolean(quote)),
  });
}

export const dynamic = "force-dynamic";
