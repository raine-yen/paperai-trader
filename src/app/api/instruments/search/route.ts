// Unified instrument smart search — stocks, ETFs, crypto (Bitcoin, meme coins).
// Accepts company names, tickers, aliases, and fuzzy/partial queries.
// Ranked: exact ticker > alias > prefix > name match > fuzzy > live-provider hits.
// Paginated (limit/offset) and rate-limited per client IP.
import { NextRequest, NextResponse } from "next/server";
import { searchInstruments } from "@/lib/instrument-catalog";

// Simple fixed-window rate limiter, per IP (serverless-safe: per-instance,
// which is the correct granularity for protecting our own upstream calls).
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now >= entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (hits.size > 10_000) {
      for (const [key, value] of hits) if (now >= value.resetAt) hits.delete(key);
    }
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, retryAfterSec: 0 };
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  entry.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count, retryAfterSec: 0 };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10) || 10, 1), 50);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  if (!query) {
    return NextResponse.json({ error: "q required" }, { status: 400 });
  }
  if (query.length > 64) {
    return NextResponse.json({ error: "query too long" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const results = await searchInstruments(query, { limit, offset });

  return NextResponse.json(
    {
      query,
      offset,
      limit,
      results,
    },
    { headers: { "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW), "X-RateLimit-Remaining": String(rl.remaining) } },
  );
}

export const dynamic = "force-dynamic";
