import { NextRequest, NextResponse } from "next/server";
import { fetchYahooPrice } from "@/lib/prices";

// Public-ish quote endpoint for the UI (no API key required, but session helpful).
// Used by the trade form to show live price as the user types a ticker.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const q = await fetchYahooPrice(symbol);
  if (!q) return NextResponse.json({ error: "unknown symbol" }, { status: 404 });
  return NextResponse.json(q);
}

export const dynamic = "force-dynamic";
