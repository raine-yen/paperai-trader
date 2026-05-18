import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth";
import { fetchYahooPrice } from "@/lib/prices";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const result = await authenticateApiKey(req);
  if (!result.ok) return result.response;
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  const q = await fetchYahooPrice(upper);
  if (!q) {
    return NextResponse.json(
      { code: 40410000, message: "asset not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: upper,
    class: "us_equity",
    exchange: "NASDAQ",
    symbol: upper,
    name: upper,
    status: "active",
    tradable: true,
    marginable: false,
    shortable: false,
    easy_to_borrow: false,
    fractionable: true,
  });
}

export const dynamic = "force-dynamic";
