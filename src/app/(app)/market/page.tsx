"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Loader2, Search, X } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMarketFeed } from "@/lib/live-market";
import { COMPANY_NAMES, getCompanyName, MARKET_GROUPS } from "@/lib/market-data";
import { cn, formatPct, formatUSD } from "@/lib/utils";
import { type OrderReceipt } from "@/components/order-flow";

interface Quote { symbol?: string; price: number; prevClose: number | null; name?: string | null; exchange?: string | null; marketCap?: number | null; trailingPE?: number | null; volume?: number | null; averageVolume?: number | null; open?: number | null; dayHigh?: number | null; dayLow?: number | null; yearHigh?: number | null; yearLow?: number | null; change?: number | null; changePercent?: number | null; providerTimestamp?: string | null; marketState?: "open" | "pre" | "post" | "closed" | "unknown"; quality?: "delayed" | "last-close" | "after-hours" | "pre-market" | "unknown"; stale?: boolean; }
interface Position { symbol: string; qty: number; avg_entry_price: number; current_price: number; market_value: number; unrealized_pl: number; unrealized_plpc: number; }
interface Bar { t: string; c: number; }
interface AccountSnapshot { cash: number; positions: Position[]; }
type Side = "buy" | "sell";
type Mode = "dollars" | "shares";
type OrderType = "market" | "limit";

const CHART_RANGES = [{ label: "1H", range: "1h" }, { label: "1D", range: "1d" }, { label: "1W", range: "5d" }, { label: "1M", range: "1mo" }, { label: "3M", range: "3mo" }, { label: "1Y", range: "1y" }] as const;

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
  const searchDebounce = useRef<number | null>(null);
  const quotesRef = useRef(quotes);

  const positionBySymbol = useMemo(() => new Map(positions.map((position) => [position.symbol.toUpperCase(), position])), [positions]);
  const categories = useMemo(() => ["Owned", ...Object.keys(MARKET_GROUPS)], []);
  const symbols = useMemo(() => activeCategory === "Owned" ? positions.map((position) => position.symbol).sort() : MARKET_GROUPS[activeCategory] ?? [], [activeCategory, positions]);
  const visibleSymbols = useMemo(() => selectedSymbol ? [selectedSymbol] : symbols, [selectedSymbol, symbols]);

  const fetchAccount = useCallback(async () => {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    const snapshot: AccountSnapshot = { cash: Number(data.account?.cash ?? 0), positions: data.positions ?? [] };
    if (data.account) setCash(snapshot.cash);
    if (data.positions) setPositions(snapshot.positions);
    return snapshot;
  }, []);

  const fetchQuotes = useCallback(async (symbolsToFetch: string[], force = false) => {
    const unique = Array.from(new Set(symbolsToFetch.filter(Boolean).map((symbol) => symbol.toUpperCase())));
    const needed = force ? unique : unique.filter((symbol) => !quotesRef.current.has(symbol));
    if (!needed.length) return new Map<string, Quote>();
    setLoadingSymbols(new Set(needed));
    try {
      const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(needed.join(","))}`, { cache: "no-store" });
      if (!response.ok) return new Map<string, Quote>();
      const data = await response.json();
      const fresh = new Map<string, Quote>();
      for (const raw of data.quotes ?? []) {
        const quote = parseQuote(raw);
        if (quote.symbol) fresh.set(quote.symbol, quote);
      }
      setQuotes((previous) => {
        const next = new Map(previous);
        for (const [symbol, quote] of fresh) next.set(symbol, quote);
        quotesRef.current = next;
        return next;
      });
      return fresh;
    } finally {
      setLoadingSymbols(new Set());
    }
  }, []);

  useEffect(() => { fetchAccount(); const id = window.setInterval(fetchAccount, 15_000); return () => window.clearInterval(id); }, [fetchAccount]);
  useEffect(() => { void fetchQuotes(visibleSymbols); }, [fetchQuotes, visibleSymbols]);
  useEffect(() => {
    const feed = getMarketFeed();
    const unwatch = feed.watch(visibleSymbols);
    const unsubscribe = feed.subscribe((liveQuotes) => {
      setQuotes((previous) => {
        const next = new Map(previous);
        for (const symbol of visibleSymbols) {
          const live = liveQuotes.get(symbol);
          const existing = next.get(symbol);
          if (live && existing) next.set(symbol, { ...existing, price: live.price, prevClose: live.prevClose, providerTimestamp: live.providerTimestamp, marketState: live.marketState, quality: live.source === "cache" ? "unknown" : live.source, stale: live.stale });
        }
        quotesRef.current = next;
        return next;
      });
    });
    return () => { unsubscribe(); unwatch(); };
  }, [visibleSymbols]);
  useEffect(() => {
    const symbol = searchParams.get("symbol")?.toUpperCase();
    if (symbol) { setSelectedSymbol(symbol); setInitialSide(searchParams.get("side") === "sell" ? "sell" : "buy"); fetchQuotes([symbol], true); }
  }, [fetchQuotes, searchParams]);
  useEffect(() => {
    window.clearTimeout(searchDebounce.current ?? undefined);
    const symbol = searchQuery.trim().toUpperCase();
    if (!symbol) { setSearchResult(null); setSearchError(""); return; }
    searchDebounce.current = window.setTimeout(async () => {
      setSearchLoading(true); setSearchError(""); setSearchResult(null);
      const response = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      setSearchLoading(false);
      if (!response.ok) { setSearchError(`No quote found for ${symbol}`); return; }
      const quote = parseQuote(await response.json(), symbol);
      setQuotes((previous) => new Map(previous).set(symbol, quote));
      setSearchResult({ symbol, quote });
    }, 300);
    return () => window.clearTimeout(searchDebounce.current ?? undefined);
  }, [searchQuery]);

  function openSymbol(symbol: string, side: Side = "buy") { setInitialSide(side); setSelectedSymbol(symbol); setSearchQuery(""); setSearchResult(null); setSearchError(""); fetchQuotes([symbol], true); }

  if (selectedSymbol) return <MarketWorkspace symbol={selectedSymbol} initialSide={initialSide} initialQuote={quotes.get(selectedSymbol) ?? null} position={positionBySymbol.get(selectedSymbol) ?? null} cash={cash} fetchAccount={fetchAccount} fetchQuotes={fetchQuotes} onBack={() => setSelectedSymbol(null)} onTraded={async () => { await Promise.all([fetchAccount(), fetchQuotes([selectedSymbol], true)]); }} />;

  return (
    <section className="vanta-discover">
      <header className="vanta-search-header">
        <div className="relative w-full max-w-2xl">
          <div className="vanta-search"><Search className="h-4 w-4" aria-hidden /><input autoFocus aria-label="Search a stock symbol" placeholder="Search markets" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value.toUpperCase())} />{searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{searchQuery ? <button onClick={() => setSearchQuery("")} aria-label="Clear search"><X className="h-4 w-4" /></button> : null}</div>
          {searchQuery && (searchResult || searchError) ? <div className="vanta-search-result">{searchError ? <p>{searchError}</p> : searchResult ? <button onClick={() => openSymbol(searchResult.symbol)}><QuoteLine symbol={searchResult.symbol} quote={searchResult.quote} ownedQty={positionBySymbol.get(searchResult.symbol)?.qty} /></button> : null}</div> : null}
        </div>
        <span className="vanta-paper-label">Paper market data</span>
      </header>
      <div className="vanta-discover-intro"><p>DISCOVER</p><h1>Find a market to study.</h1><span>Prices are illustrative market references. Trades use simulated funds only.</span></div>
      <div className="vanta-category-tabs" role="tablist" aria-label="Market categories">{categories.map((category) => <button key={category} role="tab" aria-selected={activeCategory === category} className={cn(activeCategory === category && "is-active")} onClick={() => setActiveCategory(category)}>{category}{category === "Owned" && positions.length ? ` · ${positions.length}` : ""}</button>)}</div>
      <div className="vanta-market-list">
        {symbols.length ? symbols.map((symbol) => <DiscoveryRow key={symbol} symbol={symbol} quote={quotes.get(symbol) ?? null} position={positionBySymbol.get(symbol) ?? null} loading={loadingSymbols.has(symbol)} onOpen={() => openSymbol(symbol)} />) : <p className="py-12 text-center text-sm text-gray-500">No simulated positions yet. Explore Popular to start researching.</p>}
      </div>
    </section>
  );
}

function DiscoveryRow({ symbol, quote, position, loading, onOpen }: { symbol: string; quote: Quote | null; position: Position | null; loading: boolean; onOpen: () => void }) {
  const change = quote?.change ?? (quote?.prevClose ? quote.price - quote.prevClose : null);
  const pct = quote?.changePercent ?? (quote?.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : null);
  return <button className="vanta-market-row" onClick={onOpen}><span className="vanta-ticker-mark">{symbol.slice(0, 2)}</span><span><strong>{symbol}</strong><small>{getCompanyName(symbol)}</small></span><span className="tabular-nums text-right">{loading ? "—" : quote ? formatUSD(quote.price) : "—"}</span><span className={cn("tabular-nums text-right", change != null && change < 0 ? "text-accent-red" : "text-accent-green")}>{pct == null ? "—" : formatPct(pct)}</span><span className="hidden text-right text-xs text-gray-500 md:block">{position ? `${Number(position.qty).toFixed(4)} owned` : "Research"}</span></button>;
}

function MarketWorkspace({ symbol, initialSide, initialQuote, position, cash, fetchAccount, fetchQuotes, onBack, onTraded }: { symbol: string; initialSide: Side; initialQuote: Quote | null; position: Position | null; cash: number; fetchAccount: () => Promise<AccountSnapshot | null>; fetchQuotes: (symbols: string[], force?: boolean) => Promise<Map<string, Quote>>; onBack: () => void; onTraded: () => Promise<void> }) {
  const [quote, setQuote] = useState(initialQuote);
  const [bars, setBars] = useState<Bar[]>([]);
  const [range, setRange] = useState("1d");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [ticketSide, setTicketSide] = useState<Side>(initialSide);
  const [ticketNonce, setTicketNonce] = useState(0);
  useEffect(() => {
    // Every selected stock is immediately trade-ready. The dashboard may set the
    // initial side, but opening a stock from search or the market list does too.
    setTicketNonce((nonce) => nonce + 1);
    setTicketSide(initialSide);
  }, [initialSide, symbol]);
  useEffect(() => { setQuote(initialQuote); }, [initialQuote]);
  useEffect(() => { setLoading(true); fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`, { cache: "no-store" }).then((response) => response.json()).then((data) => setBars(data.bars ?? [])).catch(() => setBars([])).finally(() => setLoading(false)); }, [range, symbol]);
  const price = quote?.price ?? 0;
  const change = quote?.change ?? (quote?.prevClose ? price - quote.prevClose : null);
  const changePct = quote?.changePercent ?? (quote?.prevClose && change != null ? (change / quote.prevClose) * 100 : null);
  const isUp = change == null || change >= 0;
  const ownedQty = Number(position?.qty ?? 0);

  async function refreshOrderState() {
    const [account, freshQuotes] = await Promise.all([fetchAccount(), fetchQuotes([symbol], true)]);
    const freshQuote = freshQuotes.get(symbol);
    if (!account || !freshQuote) throw new Error("Current order state is unavailable");
    setQuote(freshQuote);
    return {
      cash: account.cash,
      position: account.positions.find((item) => item.symbol.toUpperCase() === symbol) ?? null,
      quote: freshQuote,
    };
  }

  async function addWatchlist() { const response = await fetch("/api/watchlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }) }); setMessage(response.ok ? `${symbol} added to your paper watchlist.` : "Watchlist is unavailable right now."); }
  async function createAlert(direction: "above" | "below") { const target = price * (direction === "above" ? 1.03 : 0.97); const response = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol, direction, target_price: target.toFixed(2) }) }); setMessage(response.ok ? `Paper alert set ${direction} ${formatUSD(target)}.` : "Alerts are unavailable right now."); }
  function openTicket(side: Side) { setTicketSide(side); setTicketNonce((nonce) => nonce + 1); }

  return (
    <section className="vanta-workspace has-open-ticket">
      <header className="vanta-workspace-top"><button onClick={onBack} className="vanta-back"><ArrowLeft className="h-4 w-4" /> Back</button><div className="vanta-workspace-search"><Search className="h-4 w-4" /><span>Search markets</span><kbd>⌘ K</kbd></div></header>
      <main className="vanta-detail">
        <div className="vanta-instrument"><span className="vanta-ticker-mark">{symbol.slice(0, 2)}</span><div><p>{symbol} · {quote?.exchange ?? "NASDAQ"}</p><h1>{quote?.name ?? getCompanyName(symbol)}</h1><span>Illustrative paper-market reference</span></div></div>
        <div className="vanta-price-block"><strong className="tabular-nums">{quote ? formatUSD(price) : "—"}</strong>{changePct != null ? <span className={cn(isUp ? "text-accent-green" : "text-accent-red")}><>{isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}</>{formatUSD(Math.abs(change ?? 0))} ({formatPct(Math.abs(changePct))}) today</span> : <span>Awaiting market quote</span>}<small>{quote ? quoteFreshnessLabel(quote) : "No provider timestamp"}</small></div>
        <div className="vanta-chart" aria-label={`${symbol} illustrative price chart`}><div className="h-full">{loading ? <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-500" /></div> : bars.length > 1 ? <PriceChart bars={bars} isUp={isUp} range={range} /> : <p className="flex h-full items-center justify-center text-sm text-gray-500">Illustrative chart data unavailable.</p>}</div></div>
        <div className="vanta-ranges" role="tablist" aria-label="Chart time range">{CHART_RANGES.map((item) => <button key={item.range} role="tab" aria-selected={range === item.range} className={cn(range === item.range && "is-active")} onClick={() => setRange(item.range)}>{item.label}</button>)}</div>
        <div className="vanta-trade-actions" aria-label={`Paper trade ${symbol}`}><button type="button" className="vanta-sell-action" aria-label={`Sell ${symbol} paper order`} onClick={() => openTicket("sell")}>Sell</button><button type="button" className="vanta-buy-action" aria-label={`Buy ${symbol} paper order`} onClick={() => openTicket("buy")}>Buy</button></div>
        <p className="vanta-trade-disclosure">Paper / simulated only — no real money.</p>
        <dl className="vanta-facts"><Fact label="Market cap" value={compactMoney(quote?.marketCap)} /><Fact label="P/E ratio" value={metric(quote?.trailingPE)} /><Fact label="Volume" value={compactNumber(quote?.volume)} /><Fact label="52 week range" value={rangeLabel(quote?.yearLow, quote?.yearHigh)} /></dl>
        {position ? <section className="vanta-section"><div className="vanta-section-heading"><div><p>YOUR POSITION</p><h2>{ownedQty.toFixed(4)} shares · simulated</h2></div></div><dl className="vanta-position-grid"><Fact label="Average cost" value={formatUSD(Number(position.avg_entry_price))} /><Fact label="Market value" value={formatUSD(Number(position.market_value))} /><Fact label="Unrealized P/L" value={`${formatUSD(Number(position.unrealized_pl))} (${formatPct(Number(position.unrealized_plpc))})`} tone={Number(position.unrealized_pl) >= 0 ? "text-accent-green" : "text-accent-red"} /></dl></section> : null}
        <section className="vanta-section"><div className="vanta-section-heading"><div><p>ABOUT {symbol}</p><h2>{quote?.name ?? getCompanyName(symbol)}</h2></div><button onClick={addWatchlist}>Add to watchlist</button></div><p className="vanta-section-copy">Review company metrics, then test an idea with simulated money. Market values are illustrative and can move before a paper order fills.</p><div className="mt-4 flex gap-3"><button className="vanta-text-action" onClick={() => createAlert("above")} disabled={!price}>Alert +3%</button><button className="vanta-text-action" onClick={() => createAlert("below")} disabled={!price}>Alert −3%</button></div>{message ? <p role="status" className="mt-3 text-sm text-gray-400">{message}</p> : null}</section>
        <div className="vanta-education"><article><p>LEARN</p><h3>What moves a price?</h3><span>Study earnings, volume, and broader market conditions before testing an idea.</span></article><article><p>PAPER PRACTICE</p><h3>Build a trade thesis</h3><span>Write down what would prove your simulated decision right or wrong.</span></article></div>
      </main>
      <OrderRail symbol={symbol} price={price} initialSide={ticketSide} open={true} nonce={ticketNonce} position={position} cash={cash} onReview={refreshOrderState} onTraded={onTraded} />
    </section>
  );
}

function OrderRail({ symbol, price, initialSide, open, nonce, position, cash, onReview, onTraded }: { symbol: string; price: number; initialSide: Side; open: boolean; nonce: number; position: Position | null; cash: number; onReview: () => Promise<{ cash: number; position: Position | null; quote: Quote | null }>; onTraded: () => Promise<void> }) {
  const [side, setSide] = useState<Side>(initialSide); const [type, setType] = useState<OrderType>("market"); const [mode, setMode] = useState<Mode>("dollars"); const [amount, setAmount] = useState(""); const [limitPrice, setLimitPrice] = useState(price ? price.toFixed(2) : ""); const [submitting, setSubmitting] = useState(false); const [result, setResult] = useState(""); const [receipt, setReceipt] = useState<OrderReceipt | null>(null); const confirmRef = useRef<HTMLButtonElement | null>(null); const receiptRef = useRef<HTMLButtonElement | null>(null); const railRef = useRef<HTMLElement | null>(null); const amountRef = useRef<HTMLInputElement | null>(null);
 useEffect(() => { setSide(initialSide); setAmount(""); setResult(""); setReceipt(null); }, [initialSide, symbol, nonce]);
 useEffect(() => {
   if (!open) return;
   const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
   railRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
   window.requestAnimationFrame(() => amountRef.current?.focus());
 }, [open, nonce]);
  useEffect(() => {
    if (receipt) receiptRef.current?.focus();
  }, [receipt]);
  useEffect(() => { setLimitPrice((current) => current || (price ? price.toFixed(2) : "")); }, [price]);
  const owned = Number(position?.qty ?? 0); const numberAmount = Number(amount) || 0; const estimatedPrice = type === "limit" ? Number(limitPrice) || 0 : price; const shares = mode === "dollars" && estimatedPrice > 0 ? numberAmount / estimatedPrice : numberAmount; const notional = shares * estimatedPrice; const invalidLimit = type === "limit" && estimatedPrice <= 0; const valid = numberAmount > 0 && !invalidLimit;
  function setMax() { setAmount(side === "sell" ? (mode === "shares" ? owned.toFixed(4) : (owned * estimatedPrice).toFixed(2)) : (mode === "dollars" ? cash.toFixed(2) : Math.floor((cash / Math.max(estimatedPrice, 1)) * 10_000).toFixed(0))); }
  async function submit() { setSubmitting(true); try { const fresh = await onReview(); const freshPrice = type === "limit" ? Number(limitPrice) || 0 : Number(fresh.quote?.price ?? 0); const freshShares = mode === "dollars" && freshPrice > 0 ? numberAmount / freshPrice : numberAmount; const freshNotional = freshShares * freshPrice; const freshOwned = Number(fresh.position?.qty ?? 0); if (!freshShares || freshPrice <= 0 || invalidLimit) { setResult("A current quote and a valid order amount are required."); return; } if (side === "buy" && freshNotional > fresh.cash + 0.01) { setResult("This estimate is above your current simulated buying power."); return; } if (side === "sell" && freshShares > freshOwned + 0.00001) { setResult(`Available to sell: ${freshOwned.toFixed(4)} shares.`); return; } const response = await fetch("/api/trade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol, qty: Math.floor(freshShares * 10_000) / 10_000, side, type, limit_price: type === "limit" ? freshPrice : undefined }) }); const data = await response.json(); if (response.ok) { await onTraded(); const status = data.status === "filled" ? "filled" : "submitted" as OrderReceipt["status"]; setReceipt({ ok: true, title: status === "filled" ? "Order filled" : "Order submitted", detail: status === "filled" ? `${Math.floor(freshShares * 10_000) / 10_000} ${symbol} filled at ${formatUSD(Number(data.filled_avg_price ?? freshPrice))}.` : `${freshShares.toFixed(4)} ${symbol} is working. Fills appear in your portfolio shortly.`, status, side, symbol, amount: (Math.floor(freshShares * 10_000) / 10_000).toFixed(4) }); setAmount(""); } else { setResult(data.error ?? "Paper order could not be submitted."); } } catch { setResult("Could not submit the order. Please try again."); } finally { setSubmitting(false); } }
  const error = invalidLimit ? "Enter a limit price above zero." : "";
  return receipt ? (
  <aside ref={railRef} key="receipt" className={cn("vanta-order-rail is-open is-receipt", open && "is-open")} aria-label="Order receipt" role="status" aria-live="polite"><header><p>ACCOUNT</p><div><span>Buying power</span><strong className="tabular-nums">{formatUSD(cash)}</strong></div><small>Simulated funds only · no real money</small></header>
  <div className="vanta-rail-receipt"><svg viewBox="0 0 40 40" className="vanta-rail-check" aria-hidden="true"><circle cx="20" cy="20" r="17" className="order-check-ring" fill="none" strokeWidth="2" /><path d="M12.5 20.5 L18 26 L28 15" className="order-check-path" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
  <p className="vanta-rail-receipt-kicker">{receipt.side === "buy" ? "Buy" : "Sell"} {receipt.symbol}</p>
  <h2 className="vanta-rail-receipt-title">{receipt.title}</h2>
  <p className="vanta-rail-receipt-detail">{receipt.detail}</p>
  <dl className="vanta-estimates"><Estimate label="Status" value={receipt.status} /><Estimate label="Shares" value={receipt.amount} /></dl>
  <button ref={receiptRef} type="button" className="vanta-confirm-button" onClick={() => { setReceipt(null); setAmount(""); }}>Place another order</button></div></aside>
) : (
  <aside ref={railRef} className={cn("vanta-order-rail", open && "is-open")} aria-label="Paper order ticket"><header><p>ACCOUNT</p><div><span>Buying power</span><strong className="tabular-nums">{formatUSD(cash)}</strong></div><small>Simulated funds only · no real money</small></header>
  <div className="vanta-order-content"><h2>{side === "buy" ? "Buy" : "Sell"} {symbol}</h2><Segment value={side} onChange={setSide} options={[["buy", "Buy"], ["sell", "Sell"]]} label="Order side" /><Segment value={type} onChange={setType} options={[["market", "Market"], ["limit", "Limit"]]} label="Order type" /><Segment value={mode} onChange={setMode} options={[["dollars", "Dollars"], ["shares", "Shares"]]} label="Amount mode" /><label className="vanta-amount"><span>{mode === "dollars" ? "$" : "#"}</span><input ref={amountRef} aria-label={`Order amount in ${mode}`} type="number" min="0" step={mode === "dollars" ? "0.01" : "0.0001"} value={amount} onChange={(event) => setAmount(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && valid && !submitting) submit(); }} /><button onClick={setMax}>Max</button></label>{type === "limit" ? <label className="vanta-limit">Limit price<input aria-label="Limit price" type="number" min="0" step="0.01" value={limitPrice} onChange={(event) => setLimitPrice(event.target.value)} /></label> : null}<dl className="vanta-estimates"><Estimate label="Estimated price" value={estimatedPrice ? formatUSD(estimatedPrice) : "—"} /><Estimate label="Estimated shares" value={shares ? shares.toFixed(4) : "—"} /><Estimate label={side === "buy" ? "Estimated cost" : "Estimated proceeds"} value={notional ? formatUSD(notional) : "—"} /><Estimate label={side === "buy" ? "Buying power after" : "Shares after sale"} value={side === "buy" ? formatUSD(Math.max(0, cash - notional)) : Math.max(0, owned - shares).toFixed(4)} /></dl>{error ? <p role="alert" className="vanta-order-error">{error}</p> : null}{result ? <p role="status" className="vanta-order-result">{result}</p> : null}<button ref={confirmRef} type="button" className={cn("vanta-confirm-button", side === "sell" && "is-sell")} disabled={!valid || submitting} onClick={submit}>{submitting ? "Sending…" : `${side === "buy" ? "Buy" : "Sell"} ${symbol}${notional ? ` · ${formatUSD(notional)}` : ""}`}</button><p className="vanta-order-note">Simulated trade — updates your paper account only.</p></div></aside>
  );
}

function Segment<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: Array<[T, string]>; label: string }) { return <div className="vanta-segment" role="tablist" aria-label={label}>{options.map(([option, labelText]) => <button key={option} role="tab" aria-selected={value === option} className={cn(value === option && "is-active")} onClick={() => onChange(option)}>{labelText}</button>)}</div>; }
function Estimate({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd className="tabular-nums">{value}</dd></div>; }
function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) { return <div><dt>{label}</dt><dd className={cn("tabular-nums", tone)}>{value}</dd></div>; }
function QuoteLine({ symbol, quote, ownedQty }: { symbol: string; quote: Quote; ownedQty?: number }) { return <div className="flex items-center justify-between gap-4 text-left"><div><strong>{symbol}</strong><small className="mt-1 block text-xs text-gray-500">{COMPANY_NAMES[symbol] ?? "Stock"}</small></div><div className="text-right"><strong className="tabular-nums">{formatUSD(quote.price)}</strong><small className="mt-1 block text-xs text-gray-500">{ownedQty ? `${Number(ownedQty).toFixed(4)} simulated shares` : "Open workspace"}</small></div></div>; }

function PriceChart({ bars, isUp, range }: { bars: Bar[]; isUp: boolean; range: string }) { const data = bars.map((bar) => ({ t: new Date(bar.t).getTime(), price: bar.c })); const prices = data.map((item) => item.price).filter(Boolean); const min = Math.min(...prices); const max = Math.max(...prices); const pad = (max - min) * 0.08 || 1; const line = isUp ? "#c8ff00" : "#ff5a67"; return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 16, right: 12, left: 12, bottom: 4 }}><defs><linearGradient id="vanta-market-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={line} stopOpacity={0.15} /><stop offset="100%" stopColor={line} stopOpacity={0} /></linearGradient></defs><XAxis dataKey="t" hide /><YAxis domain={[min - pad, max + pad]} hide /><Tooltip cursor={{ stroke: "#c8ff00", strokeWidth: 1 }} contentStyle={{ background: "#0f0f0f", border: "1px solid #3a3a3a", borderRadius: 0, fontSize: 12 }} labelFormatter={(value) => range === "1h" || range === "1d" ? new Date(Number(value)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : new Date(Number(value)).toLocaleDateString([], { month: "short", day: "numeric" })} formatter={(value: number) => [formatUSD(value), "Illustrative price"]} /><Area type="linear" dataKey="price" stroke={line} strokeWidth={2} fill="url(#vanta-market-area)" dot={false} activeDot={{ r: 4, fill: "#000", stroke: line, strokeWidth: 2 }} /></AreaChart></ResponsiveContainer>; }
function parseQuote(raw: Partial<Quote>, fallback?: string): Quote { return { symbol: (raw.symbol ?? fallback)?.toUpperCase(), price: Number(raw.price), prevClose: raw.prevClose == null ? null : Number(raw.prevClose), name: raw.name ?? null, exchange: raw.exchange ?? null, marketCap: raw.marketCap == null ? null : Number(raw.marketCap), trailingPE: raw.trailingPE == null ? null : Number(raw.trailingPE), volume: raw.volume == null ? null : Number(raw.volume), averageVolume: raw.averageVolume == null ? null : Number(raw.averageVolume), open: raw.open == null ? null : Number(raw.open), dayHigh: raw.dayHigh == null ? null : Number(raw.dayHigh), dayLow: raw.dayLow == null ? null : Number(raw.dayLow), yearHigh: raw.yearHigh == null ? null : Number(raw.yearHigh), yearLow: raw.yearLow == null ? null : Number(raw.yearLow), change: raw.change == null ? null : Number(raw.change), changePercent: raw.changePercent == null ? null : Number(raw.changePercent), providerTimestamp: raw.providerTimestamp ?? null, marketState: raw.marketState, quality: raw.quality, stale: Boolean(raw.stale) }; }
function quoteFreshnessLabel(quote: Quote) {
  const quality = quote.quality === "after-hours" ? "After-hours" : quote.quality === "pre-market" ? "Pre-market" : quote.quality === "delayed" ? "Delayed" : "Last close";
  const state = quote.marketState === "open" ? "Market open" : quote.marketState === "pre" ? "Pre-market" : quote.marketState === "post" ? "After-hours" : "Market closed";
  const timestamp = quote.providerTimestamp ? new Date(quote.providerTimestamp).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }) : "timestamp unavailable";
  return `${state} · ${quality}${quote.stale ? " · stale" : ""} · as of ${timestamp}`;
}

function compactNumber(value: number | null | undefined) { return value == null || !Number.isFinite(value) ? "—" : Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(value); }
function compactMoney(value: number | null | undefined) { return value == null || !Number.isFinite(value) ? "—" : `$${compactNumber(value)}`; }
function metric(value: number | null | undefined) { return value == null || !Number.isFinite(value) ? "—" : value.toFixed(2); }
function rangeLabel(low: number | null | undefined, high: number | null | undefined) { return low == null || high == null || !Number.isFinite(low) || !Number.isFinite(high) ? "—" : `${formatUSD(low)} – ${formatUSD(high)}`; }
