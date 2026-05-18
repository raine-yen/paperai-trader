"use client";

import { useEffect, useState, useRef } from "react";
import { Search, ArrowUpRight, ArrowDownRight, X, Loader2, TrendingUp, ChevronRight } from "lucide-react";
import { formatUSD, formatPct, cn } from "@/lib/utils";

// Popular watchlist categories
const WATCHLIST: Record<string, string[]> = {
  "Most Popular": ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "SPY"],
  "Tech": ["AAPL", "MSFT", "NVDA", "AMD", "INTC", "ORCL", "CRM", "SNOW"],
  "Finance": ["JPM", "BAC", "GS", "MS", "V", "MA", "BRK-B", "WFC"],
  "ETFs": ["SPY", "QQQ", "VTI", "IWM", "GLD", "TLT", "ARKK", "DIA"],
  "Energy": ["XOM", "CVX", "COP", "SLB", "OXY", "MPC", "PSX", "VLO"],
};

interface Quote {
  price: number;
  prevClose: number | null;
}

interface TradeState {
  symbol: string;
  price: number;
  prevClose: number | null;
  side: "buy" | "sell";
}

interface AccountInfo {
  cash: number;
  equity: number;
}

export default function MarketPage() {
  const [activeCategory, setActiveCategory] = useState("Most Popular");
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{ symbol: string; quote: Quote } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [tradePanel, setTradePanel] = useState<TradeState | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const symbols = WATCHLIST[activeCategory] ?? [];

  // Fetch account info
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.account) setAccount({ cash: j.account.cash, equity: j.account.equity });
      })
      .catch(() => {});
  }, []);

  // Fetch quotes for a set of symbols (skips already cached)
  async function fetchQuotesForSymbols(syms: string[], forceRefresh = false) {
    const toFetch = forceRefresh ? syms : syms.filter((s) => !quotes.has(s));
    if (toFetch.length === 0) return;
    setLoadingSymbols(new Set(toFetch));
    await Promise.all(
      toFetch.map(async (sym) => {
        const r = await fetch(`/api/quote?symbol=${encodeURIComponent(sym)}`);
        if (!r.ok) return;
        const j = await r.json();
        setQuotes((prev) => new Map(prev).set(sym, { price: j.price, prevClose: j.prevClose }));
        setLoadingSymbols((prev) => { const s = new Set(prev); s.delete(sym); return s; });
      })
    );
  }

  useEffect(() => {
    fetchQuotesForSymbols(symbols);
    // Refresh every 30s
    const id = setInterval(() => fetchQuotesForSymbols(symbols, true), 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  // Live search with debounce
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!searchQuery.trim()) {
      setSearchResult(null);
      setSearchError("");
      return;
    }
    const sym = searchQuery.trim().toUpperCase();
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      setSearchResult(null);
      const r = await fetch(`/api/quote?symbol=${encodeURIComponent(sym)}`);
      setSearchLoading(false);
      if (!r.ok) {
        setSearchError(`No results for "${sym}"`);
        return;
      }
      const j = await r.json();
      setSearchResult({ symbol: sym, quote: { price: j.price, prevClose: j.prevClose } });
    }, 400);
  }, [searchQuery]);

  function openTrade(symbol: string, side: "buy" | "sell" = "buy") {
    const quote = quotes.get(symbol) ?? searchResult?.quote ?? null;
    if (!quote) return;
    setTradePanel({ symbol, price: quote.price, prevClose: quote.prevClose, side });
  }

  function openSearchTrade(side: "buy" | "sell") {
    if (!searchResult) return;
    setTradePanel({ symbol: searchResult.symbol, price: searchResult.quote.price, prevClose: searchResult.quote.prevClose, side });
    setSearchQuery("");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Market</h1>
          <p className="text-sm text-gray-400 mt-0.5">Browse stocks and trade instantly</p>
        </div>
        {account && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Buying Power</div>
            <div className="font-semibold tabular-nums text-accent-green">{formatUSD(account.cash)}</div>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <div className="flex items-center gap-3 bg-bg-card border border-bg-border rounded-xl px-4 py-3 focus-within:border-accent transition-colors">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input
            className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 font-mono uppercase"
            placeholder="Search symbol (e.g. AAPL, TSLA)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          />
          {searchLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500 shrink-0" />}
          {searchQuery && !searchLoading && (
            <button onClick={() => { setSearchQuery(""); setSearchResult(null); setSearchError(""); }}>
              <X className="w-4 h-4 text-gray-500 hover:text-white" />
            </button>
          )}
        </div>

        {/* Search result dropdown */}
        {(searchResult || searchError) && searchQuery && (
          <div className="absolute z-20 top-full mt-2 left-0 right-0 bg-bg-card border border-bg-border rounded-xl shadow-2xl overflow-hidden">
            {searchError ? (
              <div className="px-4 py-5 text-sm text-gray-500 text-center">{searchError}</div>
            ) : searchResult ? (
              <div className="p-4">
                <SearchResultRow
                  symbol={searchResult.symbol}
                  quote={searchResult.quote}
                  onBuy={() => openSearchTrade("buy")}
                  onSell={() => openSearchTrade("sell")}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {Object.keys(WATCHLIST).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0",
              activeCategory === cat
                ? "bg-accent text-black"
                : "bg-bg-elevated text-gray-400 hover:text-white"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stock list */}
      <div className="card overflow-hidden divide-y divide-bg-border">
        {symbols.map((sym) => {
          const quote = quotes.get(sym);
          const isLoading = loadingSymbols.has(sym);
          return (
            <StockRow
              key={sym}
              symbol={sym}
              quote={quote ?? null}
              loading={isLoading}
              onBuy={() => openTrade(sym, "buy")}
              onSell={() => openTrade(sym, "sell")}
            />
          );
        })}
      </div>

      {/* Trade panel overlay */}
      {tradePanel && (
        <TradePanel
          symbol={tradePanel.symbol}
          price={tradePanel.price}
          prevClose={tradePanel.prevClose}
          initialSide={tradePanel.side}
          cash={account?.cash ?? 0}
          onClose={() => setTradePanel(null)}
          onTraded={() => {
            setTradePanel(null);
            // Refresh account
            fetch("/api/me", { cache: "no-store" })
              .then((r) => r.json())
              .then((j) => { if (j.account) setAccount({ cash: j.account.cash, equity: j.account.equity }); });
          }}
        />
      )}
    </div>
  );
}

// ── Stock row in watchlist ─────────────────────────────────────────────────

function StockRow({
  symbol,
  quote,
  loading,
  onBuy,
  onSell,
}: {
  symbol: string;
  quote: Quote | null;
  loading: boolean;
  onBuy: () => void;
  onSell: () => void;
}) {
  const change = quote && quote.prevClose ? quote.price - quote.prevClose : null;
  const changePct = quote && quote.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : null;
  const up = change !== null ? change >= 0 : null;

  return (
    <div className="flex items-center gap-4 px-4 py-4 hover:bg-bg-elevated/40 transition-colors group">
      {/* Symbol + sparkline placeholder */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-bg-elevated flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-gray-300">{symbol.slice(0, 2)}</span>
        </div>
        <div className="min-w-0">
          <div className="font-semibold font-mono text-sm">{symbol}</div>
          <div className="text-xs text-gray-500 truncate">{COMPANY_NAMES[symbol] ?? symbol}</div>
        </div>
      </div>

      {/* Price & change */}
      <div className="text-right min-w-[100px]">
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-4 bg-bg-elevated rounded animate-pulse w-16 ml-auto" />
            <div className="h-3 bg-bg-elevated rounded animate-pulse w-10 ml-auto" />
          </div>
        ) : quote ? (
          <>
            <div className="font-semibold tabular-nums text-sm">{formatUSD(quote.price)}</div>
            {changePct !== null && (
              <div className={cn("text-xs flex items-center justify-end gap-0.5 tabular-nums", up ? "text-accent-green" : "text-accent-red")}>
                {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {formatPct(changePct)}
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-gray-600">–</div>
        )}
      </div>

      {/* Trade buttons — appear on hover */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onBuy}
          disabled={!quote}
          className="px-3 py-1.5 rounded-lg bg-accent-green/20 text-accent-green hover:bg-accent-green hover:text-black text-xs font-semibold transition-colors disabled:opacity-30"
        >
          Buy
        </button>
        <button
          onClick={onSell}
          disabled={!quote}
          className="px-3 py-1.5 rounded-lg bg-accent-red/20 text-accent-red hover:bg-accent-red hover:text-white text-xs font-semibold transition-colors disabled:opacity-30"
        >
          Sell
        </button>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}

function SearchResultRow({
  symbol,
  quote,
  onBuy,
  onSell,
}: {
  symbol: string;
  quote: Quote;
  onBuy: () => void;
  onSell: () => void;
}) {
  const change = quote.prevClose ? quote.price - quote.prevClose : null;
  const changePct = quote.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : null;
  const up = change !== null ? change >= 0 : null;

  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center shrink-0">
        <TrendingUp className="w-4 h-4 text-accent" />
      </div>
      <div className="flex-1">
        <div className="font-semibold font-mono">{symbol}</div>
        <div className="text-xs text-gray-500">{COMPANY_NAMES[symbol] ?? "Stock"}</div>
      </div>
      <div className="text-right mr-4">
        <div className="font-semibold tabular-nums">{formatUSD(quote.price)}</div>
        {changePct !== null && (
          <div className={cn("text-xs tabular-nums", up ? "text-accent-green" : "text-accent-red")}>
            {formatPct(changePct)}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onBuy}
          className="px-4 py-2 rounded-lg bg-accent-green text-black text-sm font-semibold hover:bg-green-400 transition-colors"
        >
          Buy
        </button>
        <button
          onClick={onSell}
          className="px-4 py-2 rounded-lg bg-accent-red text-white text-sm font-semibold hover:bg-red-500 transition-colors"
        >
          Sell
        </button>
      </div>
    </div>
  );
}

// ── Trade panel (slide-in modal) ───────────────────────────────────────────

function TradePanel({
  symbol,
  price,
  prevClose,
  initialSide,
  cash,
  onClose,
  onTraded,
}: {
  symbol: string;
  price: number;
  prevClose: number | null;
  initialSide: "buy" | "sell";
  cash: number;
  onClose: () => void;
  onTraded: () => void;
}) {
  const [side, setSide] = useState<"buy" | "sell">(initialSide);
  const [mode, setMode] = useState<"dollars" | "shares">("dollars");
  const [amount, setAmount] = useState("");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState(price.toFixed(2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const numAmount = Number(amount) || 0;
  const shares = mode === "dollars" ? numAmount / price : numAmount;
  const totalCost = mode === "dollars" ? numAmount : numAmount * price;
  const maxBuyShares = price > 0 ? Math.floor((cash / price) * 100) / 100 : 0;

  function setMax() {
    if (side === "buy") {
      if (mode === "dollars") setAmount(cash.toFixed(2));
      else setAmount(maxBuyShares.toFixed(2));
    }
  }

  const change = prevClose ? price - prevClose : null;
  const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : null;
  const isUp = change !== null ? change >= 0 : true;

  async function submit() {
    if (!numAmount || numAmount <= 0) return;
    setLoading(true);
    setResult(null);
    const qty = mode === "dollars" ? shares : numAmount;
    const res = await fetch("/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        qty: Math.floor(qty * 10000) / 10000,
        side,
        type: orderType,
        limit_price: orderType === "limit" ? Number(limitPrice) : undefined,
      }),
    });
    const j = await res.json();
    if (res.ok) {
      setResult({
        ok: true,
        msg: `${side.toUpperCase()} order ${j.status === "filled" ? `filled at ${formatUSD(Number(j.filled_avg_price))}` : "submitted"}`,
      });
      setTimeout(onTraded, 1500);
    } else {
      setResult({ ok: false, msg: j.error ?? "Order failed" });
      setLoading(false);
    }
  }

  // Preset amounts for quick fill
  const presets = side === "buy"
    ? [25, 50, 100, 250].filter((v) => v <= cash)
    : [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 md:right-auto md:top-0 md:left-auto md:right-0 md:w-[420px] z-50 bg-bg-card border-t md:border-t-0 md:border-l border-bg-border shadow-2xl flex flex-col max-h-[90vh] md:max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-bg-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg font-mono">{symbol}</span>
              <span className="text-xs text-gray-500">{COMPANY_NAMES[symbol] ?? ""}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-semibold tabular-nums">{formatUSD(price)}</span>
              {changePct !== null && (
                <span className={cn("text-xs tabular-nums flex items-center gap-0.5", isUp ? "text-accent-green" : "text-accent-red")}>
                  {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {formatPct(changePct)}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-elevated transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 flex-1">
          {/* Buy/Sell toggle */}
          <div className="grid grid-cols-2 gap-2 bg-bg-elevated rounded-xl p-1">
            <button
              onClick={() => setSide("buy")}
              className={cn(
                "py-2.5 rounded-lg font-semibold text-sm transition-all",
                side === "buy" ? "bg-accent-green text-black shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              Buy {symbol}
            </button>
            <button
              onClick={() => setSide("sell")}
              className={cn(
                "py-2.5 rounded-lg font-semibold text-sm transition-all",
                side === "sell" ? "bg-accent-red text-white shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              Sell {symbol}
            </button>
          </div>

          {/* Order type */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 shrink-0">Order type</span>
            <div className="flex gap-2">
              {(["market", "limit"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize",
                    orderType === t ? "bg-accent/20 text-accent" : "text-gray-500 hover:text-white hover:bg-bg-elevated"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Amount</span>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setMode("dollars")}
                  className={cn("text-xs px-2 py-0.5 rounded transition-colors", mode === "dollars" ? "text-white bg-bg-elevated" : "text-gray-600 hover:text-gray-400")}
                >
                  $ Dollars
                </button>
                <button
                  onClick={() => setMode("shares")}
                  className={cn("text-xs px-2 py-0.5 rounded transition-colors", mode === "shares" ? "text-white bg-bg-elevated" : "text-gray-600 hover:text-gray-400")}
                >
                  Shares
                </button>
              </div>
            </div>

            <div className="flex items-center bg-bg-elevated rounded-xl border border-bg-border focus-within:border-accent transition-colors">
              <span className="pl-4 text-gray-500 text-lg font-semibold">{mode === "dollars" ? "$" : "#"}</span>
              <input
                type="number"
                min="0"
                step={mode === "dollars" ? "0.01" : "0.0001"}
                className="bg-transparent flex-1 px-3 py-4 outline-none text-2xl font-bold tabular-nums"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
              {side === "buy" && (
                <button onClick={setMax} className="px-4 text-xs text-accent hover:text-white font-medium transition-colors">
                  Max
                </button>
              )}
            </div>

            {/* Quick presets */}
            {presets.length > 0 && mode === "dollars" && (
              <div className="flex gap-2 mt-2">
                {presets.map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v.toString())}
                    className="px-3 py-1 rounded-lg bg-bg-elevated text-xs font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    ${v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Limit price */}
          {orderType === "limit" && (
            <div>
              <label className="text-xs text-gray-500 block mb-2">Limit Price</label>
              <div className="flex items-center bg-bg-elevated rounded-xl border border-bg-border focus-within:border-accent transition-colors">
                <span className="pl-4 text-gray-500 font-semibold">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="bg-transparent flex-1 px-3 py-3 outline-none font-semibold tabular-nums"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Order summary */}
          {numAmount > 0 && (
            <div className="bg-bg-elevated rounded-xl p-4 space-y-2 text-sm">
              <SummaryRow label="Shares" value={shares > 0 ? shares.toFixed(4) : "—"} />
              <SummaryRow label="Market price" value={formatUSD(price)} />
              {orderType === "limit" && <SummaryRow label="Limit price" value={formatUSD(Number(limitPrice))} />}
              <div className="border-t border-bg-border pt-2 mt-2">
                <SummaryRow
                  label={side === "buy" ? "Estimated cost" : "Estimated proceeds"}
                  value={formatUSD(totalCost)}
                  bold
                />
                {side === "buy" && (
                  <SummaryRow label="Buying power after" value={formatUSD(Math.max(0, cash - totalCost))} />
                )}
              </div>
            </div>
          )}

          {/* Result message */}
          {result && (
            <div className={cn("p-4 rounded-xl text-sm font-medium text-center", result.ok ? "bg-accent-green/10 text-accent-green" : "bg-accent-red/10 text-accent-red")}>
              {result.msg}
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="px-6 pb-6 shrink-0">
          <button
            onClick={submit}
            disabled={loading || !numAmount || numAmount <= 0 || !!result?.ok}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-base transition-all",
              side === "buy"
                ? "bg-accent-green text-black hover:bg-green-400"
                : "bg-accent-red text-white hover:bg-red-500",
              "disabled:opacity-40"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              `Review ${side === "buy" ? "Buy" : "Sell"} Order`
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={cn("tabular-nums", bold ? "font-bold text-white" : "text-gray-300")}>{value}</span>
    </div>
  );
}

// Company names lookup
const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.", TSLA: "Tesla Inc.", NVDA: "NVIDIA Corp.", MSFT: "Microsoft Corp.",
  AMZN: "Amazon.com Inc.", GOOGL: "Alphabet Inc.", META: "Meta Platforms", SPY: "S&P 500 ETF",
  AMD: "Advanced Micro Devices", INTC: "Intel Corp.", ORCL: "Oracle Corp.", CRM: "Salesforce Inc.",
  SNOW: "Snowflake Inc.", JPM: "JPMorgan Chase", BAC: "Bank of America", GS: "Goldman Sachs",
  MS: "Morgan Stanley", V: "Visa Inc.", MA: "Mastercard Inc.", "BRK-B": "Berkshire Hathaway",
  WFC: "Wells Fargo", QQQ: "Nasdaq 100 ETF", VTI: "Vanguard Total Market", IWM: "Russell 2000 ETF",
  GLD: "SPDR Gold Shares", TLT: "iShares 20+ Year Treasury", ARKK: "ARK Innovation ETF",
  DIA: "Dow Jones ETF", XOM: "ExxonMobil Corp.", CVX: "Chevron Corp.", COP: "ConocoPhillips",
  SLB: "SLB (Schlumberger)", OXY: "Occidental Petroleum", MPC: "Marathon Petroleum",
  PSX: "Phillips 66", VLO: "Valero Energy",
};
