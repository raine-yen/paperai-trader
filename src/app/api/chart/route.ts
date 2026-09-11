import { NextRequest, NextResponse } from "next/server";
import { getHistoricalBars, resolveChartRequest, type ChartRange } from "@/lib/prices";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  const range = url.searchParams.get("range") ?? "1mo";

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const validRanges = ["1h", "1d", "5d", "1mo", "3mo", "6mo", "1y"];
  if (!validRanges.includes(range)) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }

  const chartRange = range as ChartRange;
  const resolution = resolveChartRequest(chartRange);
  const bars = await getHistoricalBars(symbol, "1d", chartRange);

  return NextResponse.json({ symbol, range, interval: resolution.interval, asOf: bars.at(-1)?.t ?? null, bars });
}

export const dynamic = "force-dynamic";
