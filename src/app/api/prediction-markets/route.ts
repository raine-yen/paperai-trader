import { NextResponse } from "next/server";

const POLYMARKET_URL = "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=8&order=volume24hr&ascending=false";
const CACHE_MS = 60_000;
let cached: { expiresAt: number; items: PredictionMarket[] } | null = null;

export interface PredictionMarket {
  id: string;
  question: string;
  yesPrice: number | null;
  noPrice: number | null;
  volume24hr: number | null;
  endDate: string | null;
  image: string | null;
  url: string;
}

function price(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : null;
}

function arrayValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(String(value ?? "[]")); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function parseMarket(raw: Record<string, unknown>): PredictionMarket | null {
  const id = String(raw.id ?? raw.conditionId ?? "").trim();
  const question = String(raw.question ?? "").trim();
  if (!id || !question) return null;
  const outcomes = arrayValue(raw.outcomes).map(String);
  const outcomePrices = arrayValue(raw.outcomePrices);
  const yesIndex = outcomes.findIndex((outcome: string) => outcome.toLowerCase() === "yes");
  const noIndex = outcomes.findIndex((outcome: string) => outcome.toLowerCase() === "no");
  const slug = String(raw.slug ?? "").trim();
  return {
    id,
    question,
    yesPrice: yesIndex >= 0 ? price(outcomePrices[yesIndex]) : null,
    noPrice: noIndex >= 0 ? price(outcomePrices[noIndex]) : null,
    volume24hr: Number.isFinite(Number(raw.volume24hr)) ? Number(raw.volume24hr) : null,
    endDate: typeof raw.endDate === "string" ? raw.endDate : null,
    image: typeof raw.image === "string" ? raw.image : null,
    url: slug ? `https://polymarket.com/event/${encodeURIComponent(slug)}` : `https://polymarket.com/event/${encodeURIComponent(id)}`,
  };
}

export async function GET() {
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json({ items: cached.items, cached: true });
  try {
    const response = await fetch(POLYMARKET_URL, { next: { revalidate: 60 }, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Polymarket returned ${response.status}`);
    const data = await response.json() as unknown;
    const items = (Array.isArray(data) ? data : [])
      .map((entry) => parseMarket(entry as Record<string, unknown>))
      .filter((entry): entry is PredictionMarket => entry !== null);
    cached = { expiresAt: Date.now() + CACHE_MS, items };
    return NextResponse.json({ items, cached: false });
  } catch {
    return NextResponse.json({ items: cached?.items ?? [], unavailable: true }, { status: cached ? 200 : 503 });
  }
}

export const dynamic = "force-dynamic";
