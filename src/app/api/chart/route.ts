import { NextRequest, NextResponse } from "next/server";
import { getHistoricalBars } from "@/lib/prices";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  const range = url.searchParams.get("range") ?? "1mo";

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const validRanges = ["1d", "5d", "1mo", "3mo", "6mo", "1y"];
  if (!validRanges.includes(range)) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }

  const interval: "1d" | "5m" = range === "1d" ? "5m" : "1d";
  const bars = await getHistoricalBars(
    symbol,
    interval,
    range as "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y"
  );

  return NextResponse.json({ symbol, range, bars });
}

export const dynamic = "force-dynamic";
