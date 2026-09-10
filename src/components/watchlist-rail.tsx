"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getCompanyName } from "@/lib/market-data";
import { cn, formatPct, formatUSD } from "@/lib/utils";

type WatchlistItem = { symbol: string };
type Quote = { symbol: string; price: number; prevClose: number | null; changePercent?: number | null };
type Order = { id: string; symbol: string; side: string; type: string; status: string };

const DEFAULT_SYMBOLS = ["MSFT", "AMZN", "META", "SPY"];

export function WatchlistRail() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [watchlistResponse, meResponse] = await Promise.all([
          fetch("/api/watchlists", { cache: "no-store" }),
          fetch("/api/me", { cache: "no-store" }),
        ]);
        const [watchlistPayload, mePayload] = await Promise.all([
          watchlistResponse.ok ? watchlistResponse.json() : { items: [] },
          meResponse.ok ? meResponse.json() : { orders: [] },
        ]);
        const nextItems = (watchlistPayload.items ?? []) as WatchlistItem[];
        const symbols = (nextItems.length ? nextItems.map((item) => item.symbol) : DEFAULT_SYMBOLS).slice(0, 6);
        const quoteResponse = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`, { cache: "no-store" });
        const quotePayload = quoteResponse.ok ? await quoteResponse.json() : { quotes: [] };
        if (!alive) return;
        setItems(nextItems);
        setQuotes(quotePayload.quotes ?? []);
        setOrders((mePayload.orders ?? []).filter((order: Order) => ["open", "pending", "submitted"].includes(order.status)).slice(0, 3));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  const displayedSymbols = items.length ? items.map((item) => item.symbol).slice(0, 6) : DEFAULT_SYMBOLS;
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol.toUpperCase(), quote]));

  return (
    <aside className="vanta-watchlist-rail" aria-label="Paper account watchlist">
      <div className="border-b border-bg-border p-5">
        <strong className="text-sm">Paper account</strong>
        <p className="mt-1 text-xs leading-5 text-gray-500">Practice orders use current reference quotes. No real money or securities are involved.</p>
      </div>
      <section className="p-5" aria-labelledby="watchlist-rail-heading">
        <div className="flex items-center justify-between"><h2 id="watchlist-rail-heading" className="text-lg font-black">Watchlist</h2><Link href="/market" className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-green">Explore</Link></div>
        {loading ? <div className="flex min-h-28 items-center justify-center text-xs text-gray-500"><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading</div> : <div className="mt-3 divide-y divide-bg-border">{displayedSymbols.map((symbol) => {
          const quote = quoteBySymbol.get(symbol.toUpperCase());
          const pct = quote?.changePercent ?? (quote?.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : null);
          return <Link key={symbol} href={`/market?symbol=${encodeURIComponent(symbol)}`} className="flex min-h-14 items-center justify-between gap-2 py-2 text-sm transition hover:text-accent-green"><span className="min-w-0"><strong className="block font-mono text-xs">{symbol}</strong><small className="block truncate text-[10px] text-gray-500">{getCompanyName(symbol)}</small></span><span className="shrink-0 text-right"><strong className="block text-xs tabular-nums">{quote ? formatUSD(quote.price) : "—"}</strong><small className={cn("block text-[10px] tabular-nums", pct != null && pct < 0 ? "text-accent-red" : "text-accent-green")}>{pct == null ? "—" : formatPct(pct)}</small></span></Link>;
        })}</div>}
      </section>
      <section className="border-t border-bg-border p-5" aria-labelledby="order-status-heading">
        <h2 id="order-status-heading" className="text-lg font-black">Order status</h2>
        {orders.length ? <div className="mt-3 space-y-2">{orders.map((order) => <Link key={order.id} href="/dashboard" className="block border border-bg-border bg-bg-soft p-3 text-xs hover:border-accent-green"><strong className="font-mono">{order.symbol}</strong><span className="ml-2 capitalize text-gray-400">{order.side} {order.type}</span><small className="mt-1 block uppercase tracking-[0.12em] text-accent-yellow">{order.status}</small></Link>)}</div> : <p className="mt-3 text-xs leading-5 text-gray-500"><strong className="block text-gray-300">No open orders</strong>Non-marketable limit orders will appear here.</p>}
      </section>
    </aside>
  );
}
