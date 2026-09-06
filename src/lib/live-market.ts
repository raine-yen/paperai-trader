"use client";

/**
 * Presentation feed for equities.  It never invents an in-between price: every
 * emission is the value returned by /api/live with its provider timestamp and
 * quality label. The former interpolator was removed because it continued
 * moving equity prices after an exchange had closed.
 */
export const OPEN_POLL_MS = 15_000;
export const CLOSED_POLL_MS = 120_000;

export type LiveSource = "delayed" | "last-close" | "after-hours" | "pre-market" | "cache" | "unknown";
export interface LiveQuote {
  symbol: string;
  price: number;
  prevClose: number | null;
  updatedAt: number;
  providerTimestamp: string | null;
  marketState: "open" | "pre" | "post" | "closed" | "unknown";
  source: LiveSource;
  stale: boolean;
  dir: 1 | -1 | 0;
}
type Listener = (quotes: ReadonlyMap<string, LiveQuote>) => void;

class MarketFeed {
  private quotes = new Map<string, LiveQuote>();
  private symbols = new Set<string>();
  private listeners = new Set<Listener>();
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.quotes);
    return () => this.listeners.delete(listener);
  }

  watch(symbols: string[]): () => void {
    for (const raw of symbols) this.symbols.add(raw.toUpperCase());
    void this.refresh();
    this.schedule();
    return () => {
      for (const raw of symbols) this.symbols.delete(raw.toUpperCase());
      if (!this.symbols.size && this.pollTimer) {
        clearTimeout(this.pollTimer);
        this.pollTimer = null;
      }
    };
  }

  private schedule() {
    if (this.pollTimer || !this.symbols.size || typeof window === "undefined") return;
    const isOpen = [...this.quotes.values()].some((quote) => quote.marketState === "open");
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      void this.refresh().finally(() => this.schedule());
    }, isOpen ? OPEN_POLL_MS : CLOSED_POLL_MS);
  }

  private async refresh() {
    if (this.inFlight || !this.symbols.size || document.visibilityState === "hidden") return;
    this.inFlight = true;
    try {
      const targets = [...this.symbols].slice(0, 24);
      const response = await fetch(`/api/live?symbols=${encodeURIComponent(targets.join(","))}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json() as { quotes?: Array<Record<string, unknown>> };
      let changed = false;
      for (const raw of payload.quotes ?? []) {
        const symbol = String(raw.symbol ?? "").toUpperCase();
        const price = Number(raw.price);
        if (!symbol || !Number.isFinite(price) || price <= 0) continue;
        const previous = this.quotes.get(symbol);
        const marketState = ["open", "pre", "post", "closed"].includes(String(raw.marketState)) ? String(raw.marketState) as LiveQuote["marketState"] : "unknown";
        const source = ["delayed", "last-close", "after-hours", "pre-market", "cache"].includes(String(raw.quality)) ? String(raw.quality) as LiveSource : "unknown";
        const next: LiveQuote = {
          symbol, price, prevClose: raw.prevClose == null ? null : Number(raw.prevClose),
          updatedAt: Date.now(), providerTimestamp: typeof raw.providerTimestamp === "string" ? raw.providerTimestamp : null,
          marketState, source, stale: Boolean(raw.stale),
          dir: !previous || price === previous.price ? 0 : price > previous.price ? 1 : -1,
        };
        // A cached response must never overwrite a newer provider timestamp.
        if (previous?.providerTimestamp && next.providerTimestamp && new Date(next.providerTimestamp) < new Date(previous.providerTimestamp)) continue;
        this.quotes.set(symbol, next);
        changed = true;
      }
      if (changed) for (const listener of this.listeners) listener(this.quotes);
    } catch {
      // Retain the last authoritative quote and try again on the scheduled backoff.
    } finally {
      this.inFlight = false;
    }
  }
}

declare global { var __vantaMarketFeed: MarketFeed | undefined; }
export function getMarketFeed(): MarketFeed {
  if (!globalThis.__vantaMarketFeed) globalThis.__vantaMarketFeed = new MarketFeed();
  return globalThis.__vantaMarketFeed;
}
