// Syncs the Polymarket catalog into `prediction_markets` and provides live
// binary-outcome quotes. The db handle is duck-typed (a SupabaseClient-like
// object) and fetch is injectable, so every code path is unit-testable with
// fakes — production callers pass supabaseAdmin() and global fetch.

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface PredictionMarketRow {
  id: string;
  question: string;
  category: string | null;
  yes_token_id: string | null;
  no_token_id: string | null;
  yes_price: number | null;
  no_price: number | null;
  volume_24h: number | null;
  end_date: string | null;
  status: string;
  resolved_outcome: string | null;
  image: string | null;
  url: string | null;
  updated_at: string;
}

interface GammaMarket {
  id?: string | number;
  question?: string;
  conditionId?: string;
  slug?: string;
  category?: string;
  endDate?: string;
  volume24hr?: number | string;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  image?: string;
  clobTokenIds?: string;
  outcomePrices?: string | Array<string | number>;
}

export function price01(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Parse one Gamma market into a catalog row. Returns null for malformed rows. */
export function parseGammaMarket(raw: GammaMarket): PredictionMarketRow | null {
  const id = String(raw.conditionId ?? raw.id ?? "").trim();
  const question = String(raw.question ?? "").trim();
  if (!id || !question) return null;
  // Only binary Yes/No markets are tradable in this paper app.
  const tokens = parseJsonArray(raw.clobTokenIds);
  const prices = parseJsonArray(raw.outcomePrices);
  if (tokens.length !== 2) return null;
  const yesPrice = price01(prices[0]);
  const noPrice = price01(prices[1]);
  return {
    id,
    question,
    category: raw.category ? String(raw.category) : null,
    yes_token_id: tokens[0] ?? null,
    no_token_id: tokens[1] ?? null,
    yes_price: yesPrice,
    no_price: noPrice,
    volume_24h: Number.isFinite(Number(raw.volume24hr)) ? Number(raw.volume24hr) : null,
    end_date: typeof raw.endDate === "string" ? raw.endDate : null,
    status: raw.closed ? "closed" : "active",
    resolved_outcome: null,
    image: typeof raw.image === "string" ? raw.image : null,
    url: raw.slug ? `https://polymarket.com/event/${encodeURIComponent(String(raw.slug))}` : null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch all active binary markets from Gamma (paginated, up to `maxPages`).
 */
export async function fetchActiveMarkets(
  fetchImpl: FetchLike = fetch,
  maxPages = 100,
): Promise<PredictionMarketRow[]> {
  const out: PredictionMarketRow[] = [];
  const seen = new Set<string>();
  for (let page = 0; page < maxPages; page++) {
    const url =
      "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100" +
      `&offset=${page * 100}&order=volume24hr&ascending=false`;
    const res = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Gamma returned ${res.status}`);
    const data = (await res.json()) as GammaMarket[];
    if (!Array.isArray(data) || data.length === 0) break;
    for (const raw of data) {
      const row = parseGammaMarket(raw);
      if (row && !seen.has(row.id)) { seen.add(row.id); out.push(row); }
    }
    if (data.length < 100) break;
  }
  return out;
}

export function catalogNeedsQuoteRepair(rows: Array<Pick<PredictionMarketRow, "yes_price" | "no_price">>): boolean {
  return rows.length > 0 && rows.every((row) => row.yes_price == null && row.no_price == null);
}

export async function hydratePredictionMarketPrices(
  rows: PredictionMarketRow[],
  fetchImpl: FetchLike = fetch,
  concurrency = 4,
): Promise<PredictionMarketRow[]> {
  const hydrated: PredictionMarketRow[] = [];
  const width = Math.max(1, Math.floor(concurrency));
  for (let index = 0; index < rows.length; index += width) {
    const batch = rows.slice(index, index + width);
    const priced = await Promise.all(batch.map(async (row) => {
      const [yesPrice, noPrice] = await Promise.all([
        liveMidpoint(row.yes_token_id, fetchImpl, row.yes_price),
        liveMidpoint(row.no_token_id, fetchImpl, row.no_price),
      ]);
      return { ...row, yes_price: yesPrice, no_price: noPrice };
    }));
    hydrated.push(...priced);
  }
  return hydrated;
}

export interface CatalogDb {
  from(table: string): {
    upsert(rows: unknown[], opts?: { onConflict?: string }): PromiseLike<{ error?: { message?: string } | null }>;
    update(values: Record<string, unknown>): {
      eq(col: string, val: unknown): PromiseLike<{ error?: { message?: string } | null }>;
    };
  };
}

export async function persistCatalogRows(
  db: CatalogDb,
  rows: PredictionMarketRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await db.from("prediction_markets").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`catalog upsert failed: ${error.message ?? "unknown"}`);
  return rows.length;
}

/**
 * Upsert the fetched catalog into prediction_markets (conflict on id).
 * Prices are intentionally NOT overwritten here (live quote path owns them);
 * we only refresh metadata + volume. Returns the number of upserted rows.
 */
export async function syncPredictionCatalog(
  db: CatalogDb,
  fetchImpl: FetchLike = fetch,
  maxPages = 100,
): Promise<number> {
  const rows = await fetchActiveMarkets(fetchImpl, maxPages);
  return persistCatalogRows(db, rows);
}

/**
 * Live midpoint price (0..1) for one outcome token via the CLOB,
 * with fallback to the top of the book, then to a last-known price.
 */
export async function liveMidpoint(
  tokenId: string | null,
  fetchImpl: FetchLike = fetch,
  lastKnown: number | null = null,
): Promise<number | null> {
  if (!tokenId) return lastKnown;
  try {
    const res = await fetchImpl(`https://clob.polymarket.com/midpoint?token_id=${encodeURIComponent(tokenId)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const body = (await res.json()) as { mid?: string | number; midpoint?: string | number };
      const mid = price01(body.mid ?? body.midpoint);
      if (mid != null) return mid;
    }
  } catch {
    /* fall through to book */
  }
  try {
    const res = await fetchImpl(`https://clob.polymarket.com/book?token_id=${encodeURIComponent(tokenId)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const book = (await res.json()) as { bids?: Array<{ price: string | number }>; asks?: Array<{ price: string | number }> };
      // Gamma/CLOB return bids ascending, asks descending; top of book is the extreme.
      const bid = Math.max(0, ...(book.bids ?? []).map((b) => Number(b.price)).filter((n) => Number.isFinite(n)));
      const ask = Math.min(1, ...(book.asks ?? []).map((a) => Number(a.price)).filter((n) => Number.isFinite(n)));
      if (Number.isFinite(bid) && Number.isFinite(ask) && ask >= bid) return price01((bid + ask) / 2);
      if (Number.isFinite(bid) && bid > 0) return price01(bid);
    }
  } catch {
    /* fall through */
  }
  return lastKnown;
}

/**
 * Probability history for one outcome token (CLOB prices-history).
 * Returns chronological {t (unix seconds), p (0..1)} points; [] on failure.
 */
export async function fetchProbabilityHistory(
  fetchImpl: FetchLike,
  tokenId: string | null,
  days = 7,
  fidelityMinutes = 60,
): Promise<Array<{ t: number; p: number }>> {
  if (!tokenId) return [];
  const now = Math.floor(Date.now() / 1000);
  const url =
    "https://clob.polymarket.com/prices-history?market=" + encodeURIComponent(tokenId) +
    `&startTs=${now - days * 86400}&endTs=${now}&fidelity=${fidelityMinutes}`;
  try {
    const res = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const body = (await res.json()) as { history?: Array<{ t?: number; p?: number }> };
    return (body.history ?? [])
      .map((h) => ({ t: Number(h.t), p: price01(h.p) }))
      .filter((h): h is { t: number; p: number } => Number.isFinite(h.t) && h.p != null);
  } catch {
    return [];
  }
}

/** Live outcome prices for a catalog row: yes from CLOB midpoint, no = 1 - yes. */
export async function liveOutcomePrices(
  row: { yes_token_id: string | null; yes_price: number | null },
  fetchImpl: FetchLike = fetch,
): Promise<{ yesPrice: number | null; noPrice: number | null }> {
  const yes = await liveMidpoint(row.yes_token_id, fetchImpl, row.yes_price);
  return { yesPrice: yes, noPrice: yes == null ? null : Math.round((1 - yes) * 10000) / 10000 };
}

/** Mark a Gamma market resolved in our catalog (called by the settlement pass). */
export async function markResolved(
  db: CatalogDb,
  marketId: string,
  outcome: "yes" | "no",
): Promise<void> {
  const { error } = await db
    .from("prediction_markets")
    .update({ status: "resolved", resolved_outcome: outcome, settled_at: new Date().toISOString() })
    .eq("id", marketId);
  if (error) throw new Error(`mark resolved failed: ${error.message ?? "unknown"}`);
}
