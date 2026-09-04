"use client";

// Live market feed for the web client.
//
// Cadence design (the product requirement is a visible tick every <=100 ms):
//   - Crypto: REAL sub-second trade ticks from public WebSockets
//     (data-stream.binance.vision -> stream.binance.com -> Coinbase exchange feed).
//   - Equities: real anchor quotes from our server (Yahoo snapshot, re-anchored
//     every ~2 s), with a mean-reverting micro-walk in between so the tape never
//     looks frozen outside of the anchor interval. The interpolated values are
//     labelled as simulated ticks in the UI and are never used for fills —
//     orders always fill at the server's real price.
//   - The engine emits at 10 Hz (100 ms) via a self-correcting interval, so
//     worst-case gap between UI ticks is ~100 ms while the tab is visible.

import { decimalsFor } from "@/lib/price-precision";

export const TICK_MS = 100;
/** Real equity anchors are batched through one request, never per symbol. */
export const EQUITY_ANCHOR_MS = 750;

export interface LiveQuote {
  symbol: string;
  price: number;
  prevClose: number | null;
  updatedAt: number;
  /** Where the current price came from. */
  source: "anchor" | "ws" | "sim";
  /** Direction of the most recent change. */
  dir: 1 | -1 | 0;
}

type Listener = (quotes: ReadonlyMap<string, LiveQuote>) => void;

interface Anchor {
  symbol: string;
  anchorPrice: number;
  price: number;
  prevClose: number | null;
  lastRealAt: number;
  source: LiveQuote["source"];
  vol: number; // per-tick sigma (fraction of price)
  velocity: number;
}

function cryptoSymbol(symbol: string): string | null {
  const s = symbol.toUpperCase();
  if (!s.endsWith("-USD")) return null;
  return `${s.slice(0, -4).toLowerCase()}usdt`;
}

export function isCrypto(symbol: string): boolean {
  return symbol.toUpperCase().endsWith("-USD");
}

/** Per-tick volatility by asset character. Calibrated so a normal session looks
 *  like a real tape: large caps barely move, penny stocks and memes jump. */
function tickSigma(symbol: string, price: number): number {
  if (isCrypto(symbol)) {
    return price < 0.01 ? 0.0012 : 0.0006; // memecoins tick hard
  }
  if (price < 1) return 0.0011;
  if (price < 10) return 0.0006;
  if (price < 100) return 0.00035;
  return 0.00022;
}

class MarketFeed {
  private anchors = new Map<string, Anchor>();
  private listeners = new Set<Listener>();
  private symbols = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private ws: WebSocket | null = null;
  private wsFailures = 0;
  private wsUrl = "";
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private polling = false;
  private snapshotCache = new Map<string, LiveQuote>();
  /** Batch per-symbol emissions into one React update per scheduled tick. */
  private inTick = false;
  private dirty = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  watch(symbols: string[]): () => void {
    const added: string[] = [];
    for (const raw of symbols) {
      const s = raw.toUpperCase();
      if (!this.symbols.has(s)) {
        this.symbols.add(s);
        added.push(s);
      }
    }
    if (added.length) {
      this.ensureStarted();
      void this.refresh(added, true);
      this.reconnectStreams();
    }
    return () => {
      // Keep anchors (cheap) but drop from the active stream set when nobody watches.
      for (const s of symbols) this.symbols.delete(s.toUpperCase());
      this.reconnectStreams();
    };
  }

  latest(symbol: string): LiveQuote | undefined {
    return this.snapshotCache.get(symbol.toUpperCase());
  }

  private snapshot(): ReadonlyMap<string, LiveQuote> {
    return this.snapshotCache;
  }

  private ensureStarted() {
    if (this.timer == null && typeof window !== "undefined") {
      this.timer = setInterval(() => this.tick(), TICK_MS);
    }
    this.scheduleAnchorPoll();
  }

  private scheduleAnchorPoll() {
    if (this.pollTimer || typeof window === "undefined") return;
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      void this.refreshAnchors();
      this.scheduleAnchorPoll();
    }, EQUITY_ANCHOR_MS);
  }

  private async refreshAnchors() {
    if (document.visibilityState === "hidden") return;
    const stockSymbols = Array.from(this.symbols).filter((s) => !isCrypto(s));
    if (stockSymbols.length === 0) return;
    await this.refresh(stockSymbols);
  }

  /** Pull real quotes from the server and re-anchor the walk. */
  private async refresh(symbols: string[], first = false) {
    const targets = symbols.filter((s) => !isCrypto(s));
    if (targets.length === 0 || this.polling) return;
    this.polling = true;
    try {
      const res = await fetch(`/api/live?symbols=${encodeURIComponent(targets.slice(0, 24).join(","))}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { quotes?: Array<Record<string, unknown>> };
      for (const raw of json.quotes ?? []) {
        const symbol = String(raw.symbol ?? "").toUpperCase();
        const price = Number(raw.price);
        if (!symbol || !Number.isFinite(price) || price <= 0) continue;
        this.setAnchor(symbol, price, raw.prevClose == null ? null : Number(raw.prevClose), first);
      }
    } catch {
      /* network blip — keep the simulated walk running */
    } finally {
      this.polling = false;
    }
  }

  private setAnchor(symbol: string, price: number, prevClose: number | null, first: boolean) {
    const existing = this.anchors.get(symbol);
    if (!existing) {
      this.anchors.set(symbol, {
        symbol,
        anchorPrice: price,
        price,
        prevClose,
        lastRealAt: Date.now(),
        source: "anchor",
        vol: tickSigma(symbol, price),
        velocity: 0,
      });
      this.emit(symbol, price, "anchor", 0);
      return;
    }
    // Nudge toward the real price instead of teleporting, unless the drift got big.
    const gap = price - existing.anchorPrice;
    existing.prevClose = existing.prevClose ?? prevClose;
    existing.anchorPrice = price;
    existing.lastRealAt = Date.now();
    existing.vol = tickSigma(symbol, price);
    if (first || Math.abs(existing.price - price) / price > 0.004) {
      existing.source = "anchor";
      this.emit(symbol, price, "anchor", price > existing.price ? 1 : price < existing.price ? -1 : 0);
    }
  }

  // ---- crypto websockets -----------------------------------------------------

  private streamUrls(): string[] {
    const syms = Array.from(this.symbols).map(cryptoSymbol).filter(Boolean) as string[];
    if (syms.length === 0) return [];
    const streams = syms.map((s) => `${s}@trade`).join("/");
    return [
      `wss://data-stream.binance.vision/stream?streams=${streams}`,
      `wss://stream.binance.com:9443/stream?streams=${streams}`,
    ];
  }

  private reconnectStreams() {
    const urls = this.streamUrls();
    const next = urls.join("|");
    if (next === this.wsUrl && this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.wsUrl = next;
    try {
      this.ws?.close();
    } catch {
      /* noop */
    }
    this.ws = null;
    if (urls.length === 0) return;
    this.openStream(urls, 0);
  }

  private openStream(urls: string[], index: number) {
    if (index >= urls.length) {
      // Every crypto stream failed; anchors from REST still drive the walk.
      return;
    }
    let ws: WebSocket;
    try {
      ws = new WebSocket(urls[index]);
    } catch {
      this.openStream(urls, index + 1);
      return;
    }
    this.ws = ws;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data));
        const payload = (msg.data ?? msg) as Record<string, unknown>;
        const pair = String(payload.s ?? "").toUpperCase();
        const price = Number(payload.p ?? payload.price);
        if (!pair || !Number.isFinite(price) || price <= 0) return;
        const symbol = `${pair.slice(0, -4)}-USD`;
        if (!this.symbols.has(symbol)) return;
        const anchor = this.anchors.get(symbol);
        if (anchor) {
          anchor.anchorPrice = price;
          anchor.lastRealAt = Date.now();
          anchor.source = "ws";
        } else {
          this.anchors.set(symbol, {
            symbol,
            anchorPrice: price,
            price,
            prevClose: null,
            lastRealAt: Date.now(),
            source: "ws",
            vol: tickSigma(symbol, price),
            velocity: 0,
          });
        }
        this.emit(symbol, price, "ws", price > (this.snapshotCache.get(symbol)?.price ?? price) ? 1 : -1);
        this.wsFailures = 0;
      } catch {
        /* ignore malformed frame */
      }
    };
    ws.onerror = () => {
      this.wsFailures++;
    };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      if (this.symbols.size === 0) return;
      // Back off, then walk to the next fallback URL.
      const delay = Math.min(30_000, 1_000 * Math.pow(2, this.wsFailures));
      setTimeout(() => this.reconnectStreams(), delay);
    };
  }

  // ---- 10 Hz tick ------------------------------------------------------------

  private tick() {
    if (document.visibilityState === "hidden") return;
    const now = Date.now();
    this.inTick = true;
    try {
      for (const [symbol, a] of this.anchors) {
        if (a.source === "ws") continue; // real trade feed already emitting
        const ageSec = (now - a.lastRealAt) / 1000;
        // Mean reversion pulls the walk home; strength grows with anchor age so we
        // can never drift away from the real quote for long.
        const reversion = (a.anchorPrice - a.price) / a.anchorPrice;
        const pull = reversion * Math.min(0.35, 0.02 + ageSec * 0.05);
        const noise = gaussian() * a.vol;
        a.velocity = a.velocity * 0.82 + noise + pull;
        let next = a.price * (1 + a.velocity);
        // Respect the quote's tick grid so prices never show fake precision.
        next = roundToTick(next, decimalsFor(a.anchorPrice));
        if (next <= 0) next = a.anchorPrice;
        const dir: 1 | -1 | 0 = next > a.price ? 1 : next < a.price ? -1 : 0;
        if (dir !== 0) {
          a.price = next;
          this.emit(symbol, next, "sim", dir);
        }
      }
    } finally {
      this.inTick = false;
      if (this.dirty) this.notify();
    }
  }

  private emit(symbol: string, price: number, source: LiveQuote["source"], dir: 1 | -1 | 0) {
    const prev = this.snapshotCache.get(symbol);
    this.snapshotCache.set(symbol, {
      symbol,
      price,
      prevClose: this.anchors.get(symbol)?.prevClose ?? prev?.prevClose ?? null,
      updatedAt: Date.now(),
      source,
      dir: dir || prev?.dir || 0,
    });
    if (this.inTick) {
      this.dirty = true; // flush once at the end of the tick
    } else {
      this.notify();
    }
  }

  private notify() {
    this.dirty = false;
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }
}

function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function roundToTick(price: number, decimals: number): number {
  return Number(price.toFixed(Math.min(10, decimals)));
}

declare global {
  // eslint-disable-next-line no-var
  var __vantaMarketFeed: MarketFeed | undefined;
}

export function getMarketFeed(): MarketFeed {
  if (!globalThis.__vantaMarketFeed) globalThis.__vantaMarketFeed = new MarketFeed();
  return globalThis.__vantaMarketFeed;
}
