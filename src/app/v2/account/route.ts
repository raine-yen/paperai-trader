import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth";
import { toAlpacaAccount } from "@/lib/alpaca-format";

export async function GET(req: NextRequest) {
  const result = await authenticateApiKey(req);
  if (!result.ok) return result.response;
  return NextResponse.json(toAlpacaAccount(result.auth.account));
}

export const dynamic = "force-dynamic";
