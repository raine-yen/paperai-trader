"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, Loader2, Search, X } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COMPANY_NAMES, getCompanyName, MARKET_GROUPS } from "@/lib/market-data";
import { cn, formatPct, formatUSD } from "@/lib/utils";

interface Quote {
  symbol?: string;
  price: number;
  prevClose: number | null;
  name?: string | null;
  exchange?: string | null;
  marketCap?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  epsTrailingTwelveMonths?: number | null;
  volume?: number | null;
  averageVolume?: number | null;
  open?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  yearHigh?: number | null;
  yearLow?: number | null;
  change?: number | null;
  changePercent?: number | null;
  updatedAt?: string;
}

interface Position {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
}

interface Bar {
  t: string;
  c: number;
}

type Side = "buy" | "sell";

const CHART_RANGES = [
  { label: "1H", range: "1h" },
  { label: "1D", range: "1d" },
  { label: "1W", range: "5d" },
  { label: "1M", range: "1mo" },
  { label: "3M", range: "3mo" },
  { label: "1Y", range: "1y" },
] as const;

export default function MarketPage() {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("Popular");
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{ symbol: string; quote: Quote } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [initialSide, setInitialSide] = useState<Side>("buy");
  const [cash, setCash] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const positionBySymbol = useMemo(() => new Map(positions.map((p) => [p.symbol.toUpperCase(), p])), [positions]);
  const categories = useMemo(() => ["Owned", ...Object.keys(MARKET_GROUPS)], []);
  const symbols = useMemo(() => {
    if (activeCategory === "Owned") return positions.map((p) => p.symbol).sort();
    return MARKET_GROUPS[activeCategory] ?? [];
  }, [activeCategory, positions]);

  const fetchAccount = useCallback(async () => {
    const r = await fetch("/api/me", { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    if (j.account) setCash(Number(j.account.cash));
    if (j.positions) setPositions(j.positions);
    setLastUpdated(new Date());
  }, []);

  const fetchQuotesForSymbols = useCallback(async (syms: string[], forceRefresh = false) => {
    const unique = Array.from(new Set(syms.filter(Boolean).map((s) => s.toUpperCase())));
    const toFetch = forceRefresh ? unique : unique.filter((s) => !quotes.has(s));
    if (toFetch.length === 0) return;
    setLoadingSymbols(new Set(toFetch));
    try {
      const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(toFetch.join(","))}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      const returned = new Set<string>();
      setQuotes((prev) => {
        const next = new Map(prev);
        for (const raw of j.quotes ?? []) {
          const quote = parseQuote(raw);
          if (!quote.symbol) continue;
          returned.add(quote.symbol);
          next.set(quote.symbol, quote);
        }
        return next;
      });
    } finally {
      setLoadingSymbols((prev) => {
        const next = new Set(prev);
        toFetch.forEach((sym) => next.delete(sym));
        return next;
      });
    }
  }, [quotes]);

  useEffect(() => {
    fetchAccount();
    const id = setInterval(fetchAccount, 8_000);
    return () => clearInterval(id);
  }, [fetchAccount]);

  useEffect(() => {
    fetchQuotesForSymbols(symbols);
    const id = setInterval(() => fetchQuotesForSymbols(symbols, true), 8_000);
    return () => clearInterval(id);
  }, [fetchQuotesForSymbols, symbols]);

  useEffect(() => {
    const symbol = searchParams.get("symbol")?.toUpperCase();
    const side = searchParams.get("side") === "sell" ? "sell" : "buy";
    if (symbol) {
      setInitialSide(side);
      setSelectedSymbol(symbol);
      fetchQuotesForSymbols([symbol], true);
    }
  }, [fetchQuotesForSymbols, searchParams]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const sym = searchQuery.trim().toUpperCase();
    if (!sym) {
      setSearchResult(null);
      setSearchError("");
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      setSearchResult(null);
      const r = await fetch(`/api/quote?symbol=${encodeURIComponent(sym)}`, { cache: "no-store" });
      setSearchLoading(false);
      if (!r.ok) {
        setSearchError(`No quote found for ${sym}`);
        return;
      }
      const j = await r.json();
      const quote = parseQuote(j, sym);
      setQuotes((prev) => new Map(prev).set(sym, quote));
      setSearchResult({ symbol: sym, quote });
    }, 350);
  }, [searchQuery]);

  function openSymbol(symbol: string, side: Side = "buy") {
    setInitialSide(side);
    setSelectedSymbol(symbol);
    setSearchQuery("");
    setSearchResult(null);
    setSearchError("");
    fetchQuotesForSymbols([symbol], true);
  }

  const selectedPosition = selectedSymbol ? positionBySymbol.get(selectedSymbol) ?? null : null;

  return (
    <div className="animate-fade-in space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            <span className="h-2 w-2 rounded-full bg-accent-green" />
            Market scanner
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Browse, filter, trade.</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">Scan club-friendly watchlists, filter to what you own, and open a safe trade ticket without leaving the market.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
          <MiniMetric label="Buying power" value={formatUSD(cash)} tone="text-accent-green" />
          <MiniMetric label="Holdings" value={String(positions.length)} caption={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : undefined} />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="card overflow-hidden">
          <div className="border-b border-bg-border p-4">
            <div className="relative">
              <div className="flex items-center gap-3 rounded-lg border border-bg-border bg-bg-elevated px-4 py-3 focus-within:border-accent-green">
                <Search className="h-4 w-4 shrink-0 text-gray-500" />
                <input
                  className="flex-1 bg-transparent font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case placeholder:text-gray-500"
                  placeholder="Search any symbol, like AAPL or BRK-B"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                />
                {searchLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                {searchQuery && !searchLoading && (
                  <button onClick={() => { setSearchQuery(""); setSearchResult(null); setSearchError(""); }} aria-label="Clear search">
                    <X className="h-4 w-4 text-gray-500 hover:text-white" />
                  </button>
                )}
              </div>
              {searchQuery && (searchResult || searchError) && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-bg-border bg-bg-card shadow-2xl">
                  {searchError ? (
                    <div className="p-5 text-center text-sm text-gray-500">{searchError}</div>
                  ) : searchResult ? (
                    <button className="w-full p-4 text-left hover:bg-bg-elevated" onClick={() => openSymbol(searchResult.symbol)}>
                      <QuoteLine symbol={searchResult.symbol} quote={searchResult.quote} ownedQty={positionBySymbol.get(searchResult.symbol)?.qty} />
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    activeCategory === cat ? "bg-white text-black" : "bg-bg-elevated text-gray-400 hover:text-white"
                  )}
                >
                  {cat}
                  {cat === "Owned" && positions.length > 0 ? <span className="ml-2 text-xs opacity-70">{positions.length}</span> : null}
                </button>
              ))}
            </div>
          </div>

          {symbols.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">No owned positions yet. Switch to Popular to find a trade.</div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-bg-soft text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="w-[34%] px-3 py-3 text-left font-semibold sm:px-4">Asset</th>
                    <th className="w-[20%] px-3 py-3 text-right font-semibold sm:px-4">Price</th>
                    <th className="w-[16%] px-3 py-3 text-right font-semibold sm:px-4">Today</th>
                    <th className="hidden w-[14%] px-3 py-3 text-right font-semibold lg:table-cell sm:px-4">Owned</th>
                    <th className="hidden w-[16%] px-3 py-3 text-right font-semibold xl:table-cell sm:px-4">Value</th>
                    <th className="w-[30%] px-3 py-3 text-right font-semibold sm:w-[18%] sm:px-4">Trade</th>
                  </tr>
                </thead>
                <tbody>
                  {symbols.map((sym) => {
                    const quote = quotes.get(sym) ?? null;
                    const pos = positionBySymbol.get(sym) ?? null;
                    return (
                      <MarketRow
                        key={sym}
                        symbol={sym}
                        quote={quote}
                        position={pos}
                        loading={loadingSymbols.has(sym)}
                        selected={selectedSymbol === sym}
                        onOpen={() => openSymbol(sym)}
                        onBuy={() => openSymbol(sym, "buy")}
                        onSell={() => openSymbol(sym, "sell")}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedSymbol ? (
          <StockTicket
            key={selectedSymbol}
            symbol={selectedSymbol}
            initialSide={initialSide}
            quote={quotes.get(selectedSymbol) ?? null}
            position={selectedPosition}
            cash={cash}
            onClose={() => setSelectedSymbol(null)}
            onTraded={() => {
              fetchAccount();
              fetchQuotesForSymbols([selectedSymbol], true);
            }}
          />
        ) : (
          <aside className="card flex min-h-[520px] items-center justify-center p-8 text-center">
            <div>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-bg-elevated font-mono font-bold text-accent-green">PT</div>
              <h2 className="text-xl font-semibold">Select a stock</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500">Open any row to see a chart, owned shares, order preview, and safe buy/sell controls.</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function MiniMetric({ label, value, caption, tone }: { label: string; value: string; caption?: string; tone?: string }) {
  return (
    <div className="surface p-4">
      <div className="stat-label">{label}</div>
      <div className={cn("mt-2 text-xl font-bold tabular-nums", tone)}>{value}</div>
      {caption && <div className="mt-1 text-[11px] text-gray-500">{caption}</div>}
    </div>
  );
}

function MarketRow({ symbol, quote, position, loading, selected, onOpen, onBuy, onSell }: {
  symbol: string;
  quote: Quote | null;
  position: Position | null;
  loading: boolean;
  selected: boolean;
  onOpen: () => void;
  onBuy: () => void;
  onSell: () => void;
}) {
  const changePct = quote?.changePercent ?? (quote?.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : null);
  const change = quote?.change ?? (quote?.prevClose ? quote.price - quote.prevClose : null);
  const up = change == null || change >= 0;
  return (
    <tr className={cn("ticker-row group cursor-pointer", selected && "bg-bg-elevated")} onClick={onOpen}>
      <td className="px-3 py-4 sm:px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-elevated font-mono text-xs font-black text-gray-300 group-hover:bg-accent-green group-hover:text-black">
            {symbol.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold">{symbol}</span>
              {position && <span className="badge bg-accent-green/15 text-accent-green">Owned</span>}
            </div>
            <div className="truncate text-xs text-gray-500">{getCompanyName(symbol)}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-4 text-right font-semibold tabular-nums sm:px-4">{loading ? "..." : quote ? formatUSD(quote.price) : "-"}</td>
      <td className={cn("px-3 py-4 text-right font-semibold tabular-nums sm:px-4", up ? "text-accent-green" : "text-accent-red")}>
        {changePct == null ? "-" : formatPct(changePct)}
      </td>
      <td className="hidden px-3 py-4 text-right tabular-nums text-gray-300 lg:table-cell sm:px-4">{position ? Number(position.qty).toFixed(4) : "-"}</td>
      <td className="hidden px-3 py-4 text-right tabular-nums text-gray-300 xl:table-cell sm:px-4">{position ? formatUSD(Number(position.market_value)) : "-"}</td>
      <td className="px-3 py-4 text-right sm:px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-nowrap justify-end gap-2 opacity-100 sm:transition-opacity">
          <button className="rounded-md bg-accent-green px-3 py-1.5 text-xs font-bold text-black hover:bg-green-300" onClick={onBuy}>Buy</button>
          <button
            className={cn(
              "rounded-md border border-bg-border px-3 py-1.5 text-xs font-bold transition-colors hover:border-accent-red hover:text-accent-red",
              position ? "text-gray-300" : "text-gray-500"
            )}
            title={position ? `Sell ${symbol}` : `Open ${symbol} sell ticket`}
            onClick={onSell}
          >
            Sell
          </button>
        </div>
      </td>
    </tr>
  );
}

function QuoteLine({ symbol, quote, ownedQty }: { symbol: string; quote: Quote; ownedQty?: number }) {
  const changePct = quote.changePercent ?? (quote.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : null);
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-mono font-bold">{symbol}</div>
        <div className="text-xs text-gray-500">{COMPANY_NAMES[symbol] ?? "Stock"}</div>
      </div>
      <div className="text-right">
        <div className="font-semibold tabular-nums">{formatUSD(quote.price)}</div>
        <div className="text-xs text-gray-500">{ownedQty ? `${Number(ownedQty).toFixed(4)} owned` : "Not owned"}</div>
        {changePct != null && <div className={cn("text-xs font-semibold", changePct >= 0 ? "text-accent-green" : "text-accent-red")}>{formatPct(changePct)}</div>}
      </div>
    </div>
  );
}

function StockTicket({ symbol, initialSide, quote: initialQuote, position, cash, onClose, onTraded }: {
  symbol: string;
  initialSide: Side;
  quote: Quote | null;
  position: Position | null;
  cash: number;
  onClose: () => void;
  onTraded: () => void;
}) {
  const [quote, setQuote] = useState<Quote | null>(initialQuote);
  const [bars, setBars] = useState<Bar[]>([]);
  const [chartRange, setChartRange] = useState("1h");
  const [chartLoading, setChartLoading] = useState(false);
  const [side, setSide] = useState<Side>(initialSide);
  const [mode, setMode] = useState<"dollars" | "shares">("shares");
  const [amount, setAmount] = useState("");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState(initialQuote ? initialQuote.price.toFixed(2) : "");
  const [submitting, setSubmitting] = useState(false);
  const [tradeResult, setTradeResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setSide(initialSide);
    setAmount("");
    setTradeResult(null);
  }, [initialSide, symbol]);

  useEffect(() => {
    let active = true;
    async function refreshQuote() {
      const r = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (!active) return;
      const next = parseQuote(j, symbol);
      setQuote(next);
      setLimitPrice((current) => current || next.price.toFixed(2));
    }
    refreshQuote();
    const id = setInterval(refreshQuote, 6_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [symbol]);

  useEffect(() => {
    setChartLoading(true);
    setBars([]);
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${chartRange}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setBars(j.bars ?? []))
      .catch(() => {})
      .finally(() => setChartLoading(false));
  }, [symbol, chartRange]);

  const price = quote?.price ?? 0;
  const ownedQty = Number(position?.qty ?? 0);
  const ownedValue = ownedQty * price;
  const numAmount = Number(amount) || 0;
  const desiredShares = mode === "dollars" ? (price > 0 ? numAmount / price : 0) : numAmount;
  const notional = desiredShares * price;
  const change = quote?.change ?? (quote?.prevClose ? price - quote.prevClose : null);
  const changePct = quote?.changePercent ?? (quote?.prevClose ? (change! / quote.prevClose) * 100 : null);
  const isUp = change == null || change >= 0;
  const sellTooMuch = side === "sell" && desiredShares > ownedQty + 0.00001;
  const cannotSell = side === "sell" && ownedQty <= 0;
  const buyTooMuch = side === "buy" && notional > cash + 0.01;
  const canSubmit = !!quote && desiredShares > 0 && !submitting && !sellTooMuch && !cannotSell && !buyTooMuch;

  function setMax() {
    if (side === "sell") {
      setAmount(mode === "shares" ? ownedQty.toFixed(4) : ownedValue.toFixed(2));
    } else {
      setAmount(mode === "shares" && price > 0 ? (Math.floor((cash / price) * 10000) / 10000).toFixed(4) : cash.toFixed(2));
    }
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setTradeResult(null);
    const qty = Math.floor(desiredShares * 10000) / 10000;
    const res = await fetch("/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        qty,
        side,
        type: orderType,
        limit_price: orderType === "limit" ? Number(limitPrice) : undefined,
      }),
    });
    const j = await res.json();
    if (res.ok) {
      setTradeResult({ ok: true, msg: `${side.toUpperCase()} order ${j.status === "filled" ? `filled at ${formatUSD(Number(j.filled_avg_price))}` : "submitted"}` });
      setAmount("");
      onTraded();
    } else {
      setTradeResult({ ok: false, msg: j.error ?? "Order failed" });
    }
    setSubmitting(false);
  }

  return (
    <aside className="card overflow-hidden xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-bg-border bg-bg-card p-5">
        <div className="flex items-center gap-3">
          <button className="rounded-md p-2 text-gray-400 hover:bg-bg-elevated hover:text-white" onClick={onClose} aria-label="Close ticket">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-xl font-black">{symbol}</h2>
              {position && <span className="badge bg-accent-green/15 text-accent-green">{ownedQty.toFixed(4)} owned</span>}
            </div>
            <div className="truncate text-sm text-gray-500">{getCompanyName(symbol)}</div>
          </div>
        </div>
        <div className="mt-5">
          <div className="text-4xl font-black tabular-nums">{quote ? formatUSD(price) : "--"}</div>
          {changePct != null && (
            <div className={cn("mt-1 flex items-center gap-1 text-sm font-semibold", isUp ? "text-accent-green" : "text-accent-red")}>
              {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {formatUSD(Math.abs(change!))} ({formatPct(Math.abs(changePct))}) today
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <div className="mb-3 flex gap-1">
            {CHART_RANGES.map(({ label, range }) => (
              <button
                key={range}
                onClick={() => setChartRange(range)}
                className={cn("flex-1 rounded-md py-1.5 text-xs font-bold transition-colors", chartRange === range ? "bg-white text-black" : "text-gray-500 hover:bg-bg-elevated hover:text-white")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="h-44 rounded-lg bg-bg-soft p-2">
            {chartLoading ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-500" /></div>
            ) : bars.length < 2 ? (
              <div className="flex h-full items-center justify-center text-xs text-gray-600">Chart data unavailable</div>
            ) : (
              <PriceChart bars={bars} isUp={isUp} range={chartRange} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniMetric label="Buying power" value={formatUSD(cash)} tone="text-accent-green" />
          <MiniMetric label="Owned value" value={formatUSD(ownedValue)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniMetric label="Market cap" value={compactMoney(quote?.marketCap)} />
          <MiniMetric label="P/E ratio" value={metric(quote?.trailingPE)} />
          <MiniMetric label="Volume" value={compactNumber(quote?.volume)} />
          <MiniMetric label="52W range" value={rangeLabel(quote?.yearLow, quote?.yearHigh)} />
        </div>

        {position && (
          <div className="surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="stat-label">Your position</span>
              <button onClick={() => { setSide("sell"); setMode("shares"); setAmount(ownedQty.toFixed(4)); }} className="text-xs font-bold text-accent-red hover:text-white">Sell all</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <SummaryRow label="Shares" value={ownedQty.toFixed(4)} />
              <SummaryRow label="Avg cost" value={formatUSD(Number(position.avg_entry_price))} />
              <SummaryRow label="Market value" value={formatUSD(Number(position.market_value))} />
              <SummaryRow label="P/L" value={`${formatUSD(Number(position.unrealized_pl))} (${formatPct(Number(position.unrealized_plpc))})`} tone={Number(position.unrealized_pl) >= 0 ? "text-accent-green" : "text-accent-red"} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-bg-elevated p-1">
          <button onClick={() => { setSide("buy"); setTradeResult(null); }} className={cn("rounded-md py-2.5 text-sm font-black transition-colors", side === "buy" ? "bg-accent-green text-black" : "text-gray-400 hover:text-white")}>Buy</button>
          <button onClick={() => { setSide("sell"); setTradeResult(null); }} className={cn("rounded-md py-2.5 text-sm font-black transition-colors", side === "sell" ? "bg-accent-red text-white" : "text-gray-400 hover:text-white")}>Sell</button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Order type</span>
          <div className="flex gap-2">
            {(["market", "limit"] as const).map((t) => (
              <button key={t} onClick={() => setOrderType(t)} className={cn("rounded-md px-3 py-1 text-xs font-bold capitalize", orderType === t ? "bg-white text-black" : "bg-bg-elevated text-gray-400 hover:text-white")}>{t}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="stat-label">Amount</span>
            <div className="flex gap-1">
              {(["shares", "dollars"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setAmount(""); }} className={cn("rounded px-2 py-0.5 text-xs font-semibold capitalize", mode === m ? "bg-bg-elevated text-white" : "text-gray-500 hover:text-white")}>{m}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center rounded-lg border border-bg-border bg-bg-elevated focus-within:border-accent-green">
            <span className="pl-4 text-lg font-bold text-gray-500">{mode === "dollars" ? "$" : "#"}</span>
            <input
              type="number"
              min="0"
              step={mode === "dollars" ? "0.01" : "0.0001"}
              max={side === "sell" ? (mode === "shares" ? ownedQty : ownedValue) : undefined}
              className="w-full bg-transparent px-3 py-4 text-2xl font-black tabular-nums outline-none"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button onClick={setMax} className="px-4 text-xs font-bold text-accent-green hover:text-white">Max</button>
          </div>
          {side === "sell" && <div className="mt-2 text-xs text-gray-500">Available to sell: {ownedQty.toFixed(4)} shares ({formatUSD(ownedValue)}).</div>}
        </div>

        {orderType === "limit" && (
          <div>
            <label className="label">Limit price</label>
            <input className="input font-mono" type="number" min="0" step="0.01" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} />
          </div>
        )}

        {numAmount > 0 && (
          <div className="surface space-y-2 p-4 text-sm">
            <SummaryRow label="Shares" value={desiredShares > 0 ? desiredShares.toFixed(4) : "-"} />
            <SummaryRow label="Market price" value={formatUSD(price)} />
            <SummaryRow label={side === "buy" ? "Estimated cost" : "Estimated proceeds"} value={formatUSD(notional)} bold />
            {side === "sell" && <SummaryRow label="Shares left" value={`${Math.max(0, ownedQty - desiredShares).toFixed(4)}`} />}
          </div>
        )}

        {(sellTooMuch || cannotSell || buyTooMuch) && (
          <div className="rounded-lg bg-accent-red/10 p-3 text-sm font-semibold text-accent-red">
            {cannotSell ? `You do not own ${symbol}, so selling is disabled.` : sellTooMuch ? `You can sell up to ${ownedQty.toFixed(4)} shares.` : `Not enough buying power for this order.`}
          </div>
        )}

        {tradeResult && <div className={cn("rounded-lg p-3 text-center text-sm font-semibold", tradeResult.ok ? "bg-accent-green/10 text-accent-green" : "bg-accent-red/10 text-accent-red")}>{tradeResult.msg}</div>}

        <button onClick={submit} disabled={!canSubmit} className={cn("w-full rounded-lg py-4 text-base font-black transition-colors disabled:opacity-40", side === "buy" ? "bg-accent-green text-black hover:bg-green-300" : "bg-accent-red text-white hover:bg-red-500")}>
          {submitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : `${side === "buy" ? "Buy" : "Sell"} ${symbol}`}
        </button>
      </div>
    </aside>
  );
}

function PriceChart({ bars, isUp, range }: { bars: Bar[]; isUp: boolean; range: string }) {
  const data = bars.map((b) => ({ t: new Date(b.t).getTime(), price: b.c }));
  const prices = data.map((d) => d.price).filter(Boolean);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = (max - min) * 0.08 || 1;
  const color = isUp ? "#00c853" : "#ff5252";
  const gradId = `market-grad-${isUp ? "up" : "down"}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" hide />
        <YAxis domain={[min - pad, max + pad]} hide />
        <Tooltip
          contentStyle={{ background: "#0c0f12", border: "1px solid #20262d", borderRadius: 8, fontSize: 12 }}
          labelFormatter={(t) => {
            const d = new Date(Number(t));
            return range === "1h" || range === "1d" ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" });
          }}
          formatter={(v: number) => [formatUSD(v), "Price"]}
        />
        <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SummaryRow({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={cn("text-right tabular-nums", bold ? "font-bold text-white" : "text-gray-300", tone)}>{value}</span>
    </div>
  );
}

function parseQuote(raw: Partial<Quote>, fallbackSymbol?: string): Quote {
  return {
    symbol: (raw.symbol ?? fallbackSymbol)?.toUpperCase(),
    price: Number(raw.price),
    prevClose: raw.prevClose == null ? null : Number(raw.prevClose),
    name: raw.name ?? null,
    exchange: raw.exchange ?? null,
    marketCap: raw.marketCap == null ? null : Number(raw.marketCap),
    trailingPE: raw.trailingPE == null ? null : Number(raw.trailingPE),
    forwardPE: raw.forwardPE == null ? null : Number(raw.forwardPE),
    epsTrailingTwelveMonths: raw.epsTrailingTwelveMonths == null ? null : Number(raw.epsTrailingTwelveMonths),
    volume: raw.volume == null ? null : Number(raw.volume),
    averageVolume: raw.averageVolume == null ? null : Number(raw.averageVolume),
    open: raw.open == null ? null : Number(raw.open),
    dayHigh: raw.dayHigh == null ? null : Number(raw.dayHigh),
    dayLow: raw.dayLow == null ? null : Number(raw.dayLow),
    yearHigh: raw.yearHigh == null ? null : Number(raw.yearHigh),
    yearLow: raw.yearLow == null ? null : Number(raw.yearLow),
    change: raw.change == null ? null : Number(raw.change),
    changePercent: raw.changePercent == null ? null : Number(raw.changePercent),
    updatedAt: raw.updatedAt,
  };
}

function compactNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

function compactMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `$${compactNumber(value)}`;
}

function metric(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function rangeLabel(low: number | null | undefined, high: number | null | undefined) {
  if (low == null || high == null || !Number.isFinite(low) || !Number.isFinite(high)) return "-";
  return `${formatUSD(low)} - ${formatUSD(high)}`;
}
