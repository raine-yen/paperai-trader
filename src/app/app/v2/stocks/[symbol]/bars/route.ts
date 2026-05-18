import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth";
import { getHistoricalBars } from "@/lib/prices";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const result = await authenticateApiKey(req);
  if (!result.ok) return result.response;
  const { symbol } = await params;
  const url = new URL(req.url);
  const intervalParam = url.searchParams.get("timeframe") ?? "1Day";
  const rangeParam = url.searchParams.get("range") ?? "1mo";

  const intervalMap: Record<string, "1d" | "1h" | "5m" | "15m"> = {
    "1Day": "1d",
    "1Hour": "1h",
    "15Min": "15m",
    "5Min": "5m",
    "1d": "1d",
    "1h": "1h",
    "15m": "15m",
    "5m": "5m",
  };
  const interval = intervalMap[intervalParam] ?? "1d";
  const range = (["1d", "5d", "1mo", "3mo", "6mo", "1y"].includes(rangeParam)
    ? rangeParam
    : "1mo") as "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y";

  const bars = await getHistoricalBars(symbol, interval, range);
  return NextResponse.json({
    symbol: symbol.toUpperCase(),
    bars: bars.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })),
  });
}

export const dynamic = "force-dynamic";
