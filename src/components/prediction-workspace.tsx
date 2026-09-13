"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Filter, Loader2, Search, TrendingDown, TrendingUp, X } from "lucide-react";
import { FaceIdSuccessMark } from "@/components/order-flow";
import { cn, formatUSD } from "@/lib/utils";
import { formatPredictionHistoryLabel, predictionCategory, predictionCountdown, predictionOutcomeLabels, predictionSportCategory } from "@/lib/prediction-presentation";

type Outcome = "yes" | "no";
type TradeMode = "buy" | "sell";
type SportsSort = "soonest" | "latest" | "popular";

type PredictionMarket = {
  id: string;
  question: string;
  category: string | null;
  tags?: string[];
  yesPrice: number | null;
  noPrice: number | null;
  yesLabel: string;
  noLabel: string;
  volume24hr: number | null;
  endDate: string | null;
  image: string | null;
};

type PredictionPosition = {
  market_id: string;
  outcome: Outcome;
  shares: number;
  avg_cost: number;
  question: string | null;
  current_price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
};

type AccountData = {
  account: { cash: number } | null;
  prediction_positions: PredictionPosition[];
};

type HistoryPoint = { t: string; p: number; label?: string };

type Receipt = {
  title: string;
  detail: string;
  amount: string;
  price: number;
  action: "buy" | "sell";
};

type OfficialMarketState = {
  tradable: boolean;
  closed: boolean;
  resolved: boolean;
  winnerLabel: string | null;
};

const RANGE_DAYS = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
] as const;

const SPORT_FILTERS = ["All sports", "Basketball", "Football", "Baseball", "Soccer", "Hockey", "Tennis", "Combat", "Motorsports"];
const SPORTS_SORT_OPTIONS: Array<{ value: SportsSort; label: string; description: string }> = [
  { value: "soonest", label: "Closing soon", description: "Closest upcoming resolution first" },
  { value: "latest", label: "Closing later", description: "Farthest resolution first" },
  { value: "popular", label: "Most popular", description: "Highest 24-hour volume first" },
];

const fallbackHistory = (price: number) => [
  { t: "Open", p: Math.max(0.01, price - 0.025) },
  { t: "Midday", p: Math.max(0.01, price - 0.01) },
  { t: "Now", p: price },
];

function cents(value: number | null | undefined) {
  return value == null ? "—" : `${Math.round(value * 100)}¢`;
}

function probability(value: number | null | undefined) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function compactMoney(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return formatUSD(value);
}

function categoryMark(category: string | null) {
  const name = (category ?? "").toLowerCase();
  if (name.includes("esport")) return "ESP";
  if (name.includes("polit")) return "POL";
  if (name.includes("crypto") || name.includes("market")) return "CRY";
  if (name.includes("tech")) return "TEC";
  if (name.includes("sport")) return "SPO";
  if (name.includes("econ")) return "ECO";
  return "OUT";
}

function displayCategory(market: PredictionMarket) {
  return predictionCategory(market.question, market.category, market.tags);
}

function outcomeLabel(market: PredictionMarket, outcome: Outcome) {
  return outcome === "yes" ? market.yesLabel || "Yes" : market.noLabel || "No";
}

function positionOutcomeLabel(position: PredictionPosition) {
  const [yesLabel, noLabel] = predictionOutcomeLabels(position.question ?? "", null, null);
  return position.outcome === "yes" ? yesLabel : noLabel;
}

function endLabel(endDate: string | null) {
  if (!endDate) return "Resolution date pending";
  const date = new Date(endDate);
  return Number.isNaN(date.getTime()) ? endDate : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Pending sports events should lead with the next real opportunity. Catalog
 * rows whose dates have passed or are unavailable stay below dated events, so
 * a stale row cannot displace an upcoming game at the top of discovery. */
function sortSportsMarkets(markets: PredictionMarket[], sort: SportsSort): PredictionMarket[] {
  if (sort === "popular") return [...markets].sort((a, b) => Number(b.volume24hr ?? 0) - Number(a.volume24hr ?? 0));
  const now = Date.now();
  const pendingEndTime = (market: PredictionMarket) => {
    const time = market.endDate ? new Date(market.endDate).getTime() : NaN;
    return Number.isFinite(time) && time > now ? time : null;
  };
  return [...markets].sort((a, b) => {
    const aTime = pendingEndTime(a);
    const bTime = pendingEndTime(b);
    if (aTime == null && bTime == null) return Number(b.volume24hr ?? 0) - Number(a.volume24hr ?? 0);
    if (aTime == null) return 1;
    if (bTime == null) return -1;
    return sort === "soonest" ? aTime - bTime : bTime - aTime;
  });
}

export function PredictionWorkspace() {
  const pageSize = 50;
  const searchParams = useSearchParams();
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState("All sports");
  const [sportsSort, setSportsSort] = useState<SportsSort>("soonest");
  const [showSportsSort, setShowSportsSort] = useState(false);
  const [settlementNote, setSettlementNote] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async (forceQuotes = false, query = "") => {
    const meResponse = await fetch("/api/me", { cache: "no-store" });
    if (!meResponse.ok) throw new Error("Your paper account is temporarily unavailable.");
    const mePayload = await meResponse.json();
    const heldIds = Array.from(new Set((mePayload.prediction_positions ?? []).map((position: PredictionPosition) => position.market_id)));
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", "0");
    if (query) params.set("q", query);
    if (heldIds.length && !query) params.set("ids", heldIds.join(","));
    if (forceQuotes) params.set("refresh", "1");
    const marketResponse = await fetch(`/api/prediction-markets${params.size ? `?${params.toString()}` : ""}`, { cache: "no-store" });
    if (!marketResponse.ok) throw new Error("Prediction markets are temporarily unavailable.");
    const marketPayload = await marketResponse.json();
    setMarkets(marketPayload.items ?? []);
    setHasMore(Boolean(marketPayload.hasMore));
    setNextOffset(marketPayload.nextOffset ?? null);
    setAccount({ account: mePayload.account ?? null, prediction_positions: mePayload.prediction_positions ?? [] });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError("");
    void refresh(false, searchQuery).catch((error: Error) => { if (alive) setLoadError(error.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refresh, searchQuery]);

  useEffect(() => {
    let alive = true;
    void fetch("/api/predictions/settle", { method: "POST" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!alive || !payload?.settled?.marketsResolved) return;
        const payout = Number(payload.settled.payouts ?? 0);
        setSettlementNote(payout > 0 ? `Settled predictions added ${formatUSD(payout)} to your paper cash.` : "Your resolved prediction positions have been settled.");
        void refresh(true);
      })
      .catch(() => { /* Daily cron settlement remains the fallback. */ });
    return () => { alive = false; };
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || nextOffset == null) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(nextOffset) });
      if (searchQuery) params.set("q", searchQuery);
      const response = await fetch(`/api/prediction-markets?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("More prediction markets are temporarily unavailable.");
      const payload = await response.json();
      setMarkets((current) => {
        const merged = new Map(current.map((market) => [market.id, market]));
        for (const market of payload.items ?? []) merged.set(market.id, market);
        return Array.from(merged.values());
      });
      setHasMore(Boolean(payload.hasMore));
      setNextOffset(payload.nextOffset ?? null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "More prediction markets are temporarily unavailable.");
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, nextOffset, pageSize, searchQuery]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: "480px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  useEffect(() => {
    const marketId = searchParams.get("marketId");
    if (marketId && markets.some((market) => market.id === marketId)) setSelectedId(marketId);
  }, [markets, searchParams]);

  const categoryOrder = ["Esports", "Sports", "General", "Politics", "Economics", "Crypto & Markets", "Technology"];
  const orderedMarkets = useMemo(() => [...markets].sort((a, b) => Number(b.volume24hr ?? 0) - Number(a.volume24hr ?? 0)), [markets]);
  const categories = useMemo(() => ["All", ...categoryOrder.filter((item) => orderedMarkets.some((market) => displayCategory(market) === item)), ...Array.from(new Set(orderedMarkets.map(displayCategory))).filter((item) => !categoryOrder.includes(item))], [orderedMarkets]);
  const categoryMarkets = category === "All" ? orderedMarkets : orderedMarkets.filter((market) => displayCategory(market) === category);
  const filteredSportsMarkets = category === "Sports" && sportFilter !== "All sports"
    ? categoryMarkets.filter((market) => predictionSportCategory(market.question, market.tags) === sportFilter)
    : categoryMarkets;
  const visibleMarkets = category === "Sports" ? sortSportsMarkets(filteredSportsMarkets, sportsSort) : filteredSportsMarkets;
  const sportsSortLabel = SPORTS_SORT_OPTIONS.find((option) => option.value === sportsSort)?.label ?? "Closing soon";
  const selected = markets.find((market) => market.id === selectedId) ?? null;

  if (selected) {
    return <PredictionDetail market={selected} account={account} onBack={() => setSelectedId(null)} onChanged={() => void refresh(true, searchQuery)} />;
  }

  return (
    <section className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:py-10" aria-labelledby="predictions-heading">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-bg-border pb-4">
        <div>
          <h1 id="predictions-heading" className="text-2xl font-black tracking-tight sm:text-3xl">Predictions</h1>
          <p className="mt-1 text-xs text-gray-500">Yes/No shares settle at $1.00 if correct · paper cash only</p>
        </div>
        <div className="text-right">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Buying power</span>
          <strong className="text-lg tabular-nums">{formatUSD(account?.account?.cash ?? 0)}</strong>
        </div>
      </header>
      {settlementNote ? <p role="status" className="mt-4 border border-accent-green/40 bg-accent-green/10 p-3 text-sm text-accent-green">{settlementNote}</p> : null}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Prediction category">
        {categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => { setCategory(item); if (item !== "Sports") { setSportFilter("All sports"); setShowSportsSort(false); } }} className={cn("shrink-0 min-h-11 rounded-full px-3.5 py-1.5 text-xs font-bold transition", category === item ? "bg-accent-green text-black" : "border border-bg-border text-gray-400 hover:border-gray-500 hover:text-white")}>{item}</button>)}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[min(100%,19rem)] flex-1"><span className="sr-only">Search prediction markets</span><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="min-h-11 w-full border border-bg-border bg-bg-soft py-2 pl-10 pr-10 text-sm outline-none transition focus:border-accent-green" placeholder="Search prediction markets" />{searchInput ? <button type="button" aria-label="Clear prediction search" onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-white"><X className="h-4 w-4" /></button> : null}</label>
        {searchQuery ? <span className="text-xs text-gray-500">Search results</span> : null}
      </div>

      {category === "Sports" ? <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Sports filters">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="group" aria-label="Sport type">{SPORT_FILTERS.map((item) => <button key={item} type="button" aria-pressed={sportFilter === item} onClick={() => setSportFilter(item)} className={cn("shrink-0 min-h-9 rounded-full px-3 py-1 text-xs font-bold transition", sportFilter === item ? "bg-white text-black" : "border border-bg-border text-gray-400 hover:border-gray-500 hover:text-white")}>{item}</button>)}</div>
        <div className="relative shrink-0">
          <button type="button" aria-label={`Sort sports markets: ${sportsSortLabel}`} aria-expanded={showSportsSort} aria-controls="sports-sort-menu" onClick={() => setShowSportsSort((open) => !open)} className="flex min-h-11 items-center gap-2 rounded-full border border-bg-border bg-bg-soft px-3 text-xs font-bold text-gray-200 transition hover:border-gray-500 hover:text-white">
            <Filter aria-hidden className="h-4 w-4" /><span className="hidden sm:inline">{sportsSortLabel}</span>
          </button>
          {showSportsSort ? <div id="sports-sort-menu" role="menu" aria-label="Sort sports markets" className="absolute right-0 z-20 mt-2 w-64 overflow-hidden border border-bg-border bg-bg-elevated p-1 shadow-xl">
            {SPORTS_SORT_OPTIONS.map((option) => <button key={option.value} type="button" role="menuitemradio" aria-checked={sportsSort === option.value} onClick={() => { setSportsSort(option.value); setShowSportsSort(false); }} className={cn("flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-bg-soft", sportsSort === option.value && "bg-accent-green/10")}> <span><strong className="block text-xs text-white">{option.label}</strong><small className="block text-[11px] font-normal text-gray-500">{option.description}</small></span><span aria-hidden className={cn("h-2 w-2 rounded-full", sportsSort === option.value ? "bg-accent-green" : "border border-gray-500")} /></button>)}
          </div> : null}
        </div>
      </div> : null}

      {account?.prediction_positions?.length ? (
        <section className="mt-6" aria-labelledby="your-prediction-positions">
          <div className="flex items-center justify-between gap-3">
            <h2 id="your-prediction-positions" className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Your positions · {formatUSD(account.prediction_positions.reduce((sum, p) => sum + p.market_value, 0))}</h2>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {account.prediction_positions.map((position) => <button key={`${position.market_id}-${position.outcome}`} type="button" onClick={() => setSelectedId(position.market_id)} className="flex min-h-16 min-w-0 items-center gap-3 border border-bg-border bg-bg-soft p-3 text-left transition hover:border-accent-green">
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{position.question ?? "Prediction market"}</strong><small className="mt-0.5 block truncate text-xs text-gray-500">{Number(position.shares).toFixed(2)} {positionOutcomeLabel(position)} @ {cents(position.avg_cost)}</small></span>
              <span className="shrink-0 text-right"><strong className="block text-sm tabular-nums">{formatUSD(position.market_value)}</strong><small className={cn("mt-0.5 block text-xs tabular-nums", position.unrealized_pl >= 0 ? "text-accent-green" : "text-accent-red")}>{position.unrealized_pl >= 0 ? "+" : ""}{formatUSD(position.unrealized_pl)}</small></span>
            </button>)}
          </div>
        </section>
      ) : null}

      <section className="mt-7" aria-labelledby="active-prediction-markets">
        <div className="flex items-center justify-between gap-3"><h2 id="active-prediction-markets" className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Markets</h2><span className="text-[10px] font-bold tracking-[0.14em] text-gray-600">TAP A PRICE TO TRADE</span></div>
        {loading ? <div className="flex min-h-48 items-center justify-center text-sm text-gray-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading active markets</div> : loadError ? <p role="alert" className="mt-4 border border-accent-red/40 bg-accent-red/10 p-4 text-sm text-accent-red">{loadError}</p> : <>{visibleMarkets.length ? <div className="mt-2 divide-y divide-bg-border border-y border-bg-border">{visibleMarkets.map((market) => <MarketRow key={market.id} market={market} onOpen={setSelectedId} />)}</div> : <p className="mt-3 border-y border-bg-border py-8 text-center text-sm text-gray-500">No prediction markets match these filters.</p>}<div ref={loadMoreRef} className="flex min-h-16 items-center justify-center py-4" aria-live="polite">{loadingMore ? <span className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading more markets</span> : hasMore ? <button type="button" onClick={() => void loadMore()} className="min-h-11 rounded-full border border-bg-border px-4 text-xs font-bold text-gray-300 transition hover:border-gray-500 hover:text-white">Load more markets</button> : <span className="text-xs text-gray-600">You&apos;re all caught up.</span>}</div></>}
      </section>
    </section>
  );
}

function MarketRow({ market, onOpen }: { market: PredictionMarket; onOpen: (id: string) => void }) {
  const yes = market.yesPrice, no = market.noPrice;
  const yesLabel = outcomeLabel(market, "yes"), noLabel = outcomeLabel(market, "no");
  return (
    <div className="flex min-h-[64px] items-center gap-3 py-3">
      <button type="button" onClick={() => onOpen(market.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated text-[10px] font-black text-accent-green">
          {market.image ? <img src={market.image} alt="" className="h-full w-full object-cover" /> : categoryMark(displayCategory(market))}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-semibold leading-5">{market.question}</strong>
          <small className="mt-0.5 block truncate text-xs text-gray-500">{displayCategory(market)} · Vol {compactMoney(market.volume24hr)} · {predictionCountdown(market.endDate)}</small>
        </span>
      </button>
      <span className="flex shrink-0 gap-2">
        <button type="button" onClick={() => onOpen(market.id)} className="w-24 rounded-full border border-accent-green/60 bg-accent-green/10 px-3 py-2 text-center transition hover:bg-accent-green hover:text-black" aria-label={`Buy ${yesLabel} at ${cents(yes)} for ${market.question}`} title={yesLabel}>
          <span className="block w-full truncate text-[10px] font-bold leading-none text-accent-green">{yesLabel}</span>
          <strong className="mt-0.5 block text-sm leading-none tabular-nums">{cents(yes)}</strong>
        </button>
        <button type="button" onClick={() => onOpen(market.id)} className="w-24 rounded-full border border-bg-border px-3 py-2 text-center transition hover:border-gray-400" aria-label={`Buy ${noLabel} at ${cents(no)} for ${market.question}`} title={noLabel}>
          <span className="block w-full truncate text-[10px] font-bold leading-none text-gray-400">{noLabel}</span>
          <strong className="mt-0.5 block text-sm leading-none tabular-nums">{cents(no)}</strong>
        </button>
      </span>
    </div>
  );
}

function PredictionDetail({ market, account, onBack, onChanged }: { market: PredictionMarket; account: AccountData | null; onBack: () => void; onChanged: () => void }) {
  const [outcome, setOutcome] = useState<Outcome>("yes");
  const [mode, setMode] = useState<TradeMode>("buy");
  const [range, setRange] = useState<(typeof RANGE_DAYS)[number]["days"]>(7);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [amount, setAmount] = useState("25");
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [officialState, setOfficialState] = useState<OfficialMarketState | null>(null);
  const currentPrice = outcome === "yes" ? market.yesPrice : market.noPrice;
  const selectedLabel = outcomeLabel(market, outcome);
  const position = account?.prediction_positions.find((item) => item.market_id === market.id && item.outcome === outcome) ?? null;
  const cash = Number(account?.account?.cash ?? 0);
  const parsedAmount = Number(amount);
  const isBuy = mode === "buy";
  const estimatedShares = isBuy ? (currentPrice && parsedAmount > 0 ? parsedAmount / currentPrice : 0) : Math.min(parsedAmount || 0, Number(position?.shares ?? 0));
  const total = isBuy ? parsedAmount : estimatedShares * Number(currentPrice ?? 0);
  const maxShares = Number(position?.shares ?? 0);

  useEffect(() => {
    setHistory([]);
    let alive = true;
    fetch(`/api/prediction-markets/${encodeURIComponent(market.id)}/history?outcome=${outcome}&days=${range}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((payload) => { if (alive) setHistory((payload.items ?? []).map((item: { t: string; p: number }) => ({ t: item.t, p: Number(item.p), label: formatPredictionHistoryLabel(item.t, range) }))); })
      .catch(() => { if (alive) setHistory([]); });
    return () => { alive = false; };
  }, [market.id, outcome, range]);

  useEffect(() => {
    setOfficialState(null);
    let alive = true;
    fetch(`/api/prediction-markets/${encodeURIComponent(market.id)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: OfficialMarketState | null) => { if (alive) setOfficialState(payload); })
      .catch(() => { if (alive) setOfficialState({ tradable: false, closed: false, resolved: false, winnerLabel: null }); });
    return () => { alive = false; };
  }, [market.id]);

  useEffect(() => { setAmount(isBuy ? "25" : ""); setReviewing(false); setError(""); }, [isBuy, outcome, market.id]);

  const chartData = history.length > 1 ? history : fallbackHistory(Number(currentPrice ?? 0.5));
  const canReview = officialState?.tradable === true && (isBuy ? Boolean(currentPrice && parsedAmount > 0 && parsedAmount <= cash) : Boolean(currentPrice && estimatedShares > 0 && estimatedShares <= maxShares));

  function chooseBuy(nextOutcome: Outcome) { setOutcome(nextOutcome); setMode("buy"); }
  function useMax() { setAmount(maxShares > 0 ? String(maxShares) : ""); }

  async function submit() {
    setSubmitting(true);
    setError("");
    const client_order_id = crypto.randomUUID();
    try {
      const response = await fetch(isBuy ? "/api/predictions/trade" : "/api/predictions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isBuy ? {
          market_id: market.id,
          outcome,
          stake_usd: parsedAmount,
          client_order_id,
        } : {
          market_id: market.id,
          outcome,
          shares: estimatedShares,
          close_all: estimatedShares === maxShares,
          client_order_id,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Your paper order could not be placed.");
      const shares = Number(payload.shares ?? estimatedShares);
      setReceipt({
        title: isBuy ? `Paper buy ${selectedLabel} filled` : `Paper sell ${selectedLabel} filled`,
        detail: isBuy ? `${shares.toFixed(2)} ${selectedLabel} shares at ${cents(payload.price ?? currentPrice)}.` : `${shares.toFixed(2)} ${selectedLabel} shares closed for ${formatUSD(Number(payload.proceeds ?? total))}.`,
        amount: shares.toFixed(2),
        price: Number(payload.price ?? currentPrice ?? 0),
        action: isBuy ? "buy" : "sell",
      });
      setReviewing(false);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your paper order could not be placed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:py-10">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to predictions</button>
      <div className="mt-5 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0">
          <header className="border-b border-bg-border pb-6"><div className="flex gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center bg-bg-elevated text-xs font-black text-accent-green">{categoryMark(displayCategory(market))}</span><div><p className="text-xs text-gray-500">{displayCategory(market)} · Resolves {endLabel(market.endDate)}</p><h1 className="mt-1 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">{market.question}</h1></div></div><div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2"><strong className="text-3xl font-black tabular-nums">{cents(market.yesPrice)} {outcomeLabel(market, "yes")}</strong><span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-green"><TrendingUp className="h-4 w-4" /> {probability(market.yesPrice)} implied probability</span></div></header>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500"><span>Vol {compactMoney(market.volume24hr)} 24h</span><span aria-hidden>·</span><span>{predictionCountdown(market.endDate)}</span></div>
          {officialState?.tradable === false ? <div role="status" className="mt-4 border border-accent-yellow/50 bg-accent-yellow/10 p-3 text-sm text-accent-yellow">{officialState.resolved ? <>Official result: <strong>{officialState.winnerLabel ?? "resolved"}</strong>. This market is closed; eligible paper positions will settle from the official result.</> : "Trading is unavailable while Vanta verifies this market’s official status."}</div> : officialState === null ? <div role="status" className="mt-4 border border-bg-border bg-bg-soft p-3 text-sm text-gray-400">Checking the official market status before enabling trades.</div> : null}

          <section className="mt-8 border-y border-bg-border py-6" aria-label="Prediction probability history"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[0.16em] text-gray-500">{selectedLabel.toUpperCase()} ODDS HISTORY</p><h2 className="mt-1 text-xl font-black">{cents(currentPrice)} · {probability(currentPrice)} implied probability</h2></div><div className="flex gap-1" role="tablist" aria-label="Prediction chart period">{RANGE_DAYS.map((item) => <button key={item.days} role="tab" aria-selected={range === item.days} type="button" onClick={() => setRange(item.days)} className={cn("min-h-9 px-3 text-xs font-bold", range === item.days ? "bg-accent-green text-black" : "border border-bg-border text-gray-400")}>{item.label}</button>)}</div></div><div className="vanta-pencil-chart mt-5 h-52" aria-label="Interactive outcome probability chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="predictionOdds" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="rgb(var(--color-accent))" stopOpacity={0.28} /><stop offset="100%" stopColor="rgb(var(--color-accent))" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="label" tick={{ fill: "rgb(var(--color-gray-500))", fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}¢`} tick={{ fill: "rgb(var(--color-gray-500))", fontSize: 10 }} tickLine={false} axisLine={false} width={34} /><Tooltip formatter={(value) => [cents(Number(value)), `${selectedLabel} odds`]} contentStyle={{ background: "#101010", border: "1px solid #262626", borderRadius: 0 }} /><Area key={`${market.id}:${outcome}:${range}:${chartData.length}:${chartData.at(-1)?.t ?? ""}`} type="linear" dataKey="p" stroke="rgb(var(--color-accent))" strokeWidth={2} fill="url(#predictionOdds)" isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></section>

          {position ? <section className="mt-8 border border-bg-border bg-bg-soft p-4" aria-labelledby="prediction-position-heading"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[0.16em] text-gray-500">YOUR POSITION</p><h2 id="prediction-position-heading" className="mt-1 text-xl font-black">{outcomeLabel(market, position.outcome)} shares</h2></div><button type="button" onClick={() => setMode("sell")} className="border border-bg-border px-3 py-2 text-xs font-bold text-gray-300 hover:border-accent-red hover:text-white">Sell position</button></div><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4"><Metric label="Shares" value={Number(position.shares).toFixed(2)} /><Metric label="Average cost" value={cents(position.avg_cost)} /><Metric label="Market value" value={formatUSD(position.market_value)} /><Metric label="Total return" value={`${position.unrealized_pl >= 0 ? "+" : ""}${formatUSD(position.unrealized_pl)}`} tone={position.unrealized_pl >= 0 ? "text-accent-green" : "text-accent-red"} /></div></section> : null}

          <section className="mt-8 border-t border-bg-border pt-6"><h2 className="text-xl font-black">About this market</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">This paper market uses live public outcome prices as a reference. A {selectedLabel} share settles at $1.00 when that outcome wins; the other outcome settles at $0.00. Vanta never sends real-money orders to a prediction exchange.</p></section>
        </main>

        <aside className="xl:sticky xl:top-6 xl:h-fit" aria-label="Trade this prediction"><div className="border border-bg-border bg-bg-soft p-4 sm:p-5"><div className="grid grid-cols-2 gap-1 p-1" role="tablist" aria-label="Order side"><button type="button" role="tab" aria-selected={mode === "buy"} onClick={() => setMode("buy")} className={cn("min-h-10 text-sm font-black transition", mode === "buy" ? "bg-accent-green text-black" : "text-gray-400 hover:text-white")}>Buy</button><button type="button" role="tab" aria-selected={mode === "sell"} onClick={() => position && setMode("sell")} disabled={!position} className={cn("min-h-10 text-sm font-black transition", mode === "sell" ? "bg-accent-green text-black" : "text-gray-400 hover:text-white", !position && "cursor-not-allowed text-gray-600")}>Sell</button></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => chooseBuy("yes")} className={cn("min-h-16 border p-3 text-left transition", outcome === "yes" ? "border-accent-green bg-accent-green/10" : "border-bg-border hover:border-gray-500")}><span className="flex items-baseline justify-between"><span className="text-xs font-bold text-accent-green">{outcomeLabel(market, "yes")}</span><strong className="text-lg tabular-nums">{cents(market.yesPrice)}</strong></span><small className="mt-1 block text-[11px] text-gray-500">{probability(market.yesPrice)} · pays $1.00</small></button><button type="button" onClick={() => chooseBuy("no")} className={cn("min-h-16 border p-3 text-left transition", outcome === "no" ? "border-accent-green bg-accent-green/10" : "border-bg-border hover:border-gray-500")}><span className="flex items-baseline justify-between"><span className="text-xs font-bold text-gray-300">{outcomeLabel(market, "no")}</span><strong className="text-lg tabular-nums">{cents(market.noPrice)}</strong></span><small className="mt-1 block text-[11px] text-gray-500">{probability(market.noPrice)} · pays $1.00</small></button></div><label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">{isBuy ? "Amount" : "Shares to sell"}<div className="mt-1.5 flex items-center border border-bg-border bg-black"><span className="flex items-center px-3 text-gray-500">{isBuy ? "$" : "#"}</span><input aria-label={isBuy ? "Dollar amount" : "Shares to sell"} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} className="min-w-0 flex-1 bg-transparent py-3 text-lg font-bold tabular-nums outline-none" />{!isBuy ? <button type="button" onClick={useMax} className="m-1 px-2.5 py-1 text-xs font-black text-accent-green hover:bg-accent-green/10">Max</button> : null}</div></label>{isBuy ? <div className="mt-2 grid grid-cols-4 gap-1.5">{[5, 10, 25, 100].map((v) => <button key={v} type="button" onClick={() => setAmount(String(v))} className={cn("min-h-9 border text-xs font-bold tabular-nums transition", parsedAmount === v ? "border-accent-green text-accent-green" : "border-bg-border text-gray-400 hover:border-gray-400 hover:text-white")}>+${v}</button>)}</div> : null}<p className="mt-2 text-xs text-gray-500">{isBuy ? `${formatUSD(cash)} buying power` : `${maxShares.toFixed(2)} ${selectedLabel} shares available`}</p><dl className="mt-4 space-y-2.5 border-y border-bg-border py-3.5 text-sm"><Estimate label={isBuy ? "Shares you get" : "Shares sold"} value={estimatedShares.toFixed(2)} /><Estimate label={isBuy ? "Total cost" : "Est. proceeds"} value={formatUSD(total || 0)} /><Estimate label={isBuy ? "Payout if correct" : "Cash after fill"} value={isBuy ? formatUSD(estimatedShares) : formatUSD(cash + total)} tone="text-accent-green" />{isBuy ? <Estimate label="Potential profit" value={formatUSD(Math.max(0, estimatedShares - total))} tone="text-accent-green" /> : null}</dl>{error ? <p role="alert" className="mt-3 text-sm text-accent-red">{error}</p> : null}<button type="button" disabled={!canReview || submitting} onClick={() => { setError(""); setReviewing(true); }} className={cn("mt-4 w-full min-h-12 px-4 text-sm font-black uppercase tracking-wide transition", isBuy ? "bg-accent-green text-black enabled:hover:bg-green-300" : "bg-accent-red text-white enabled:hover:bg-red-500", "disabled:cursor-not-allowed disabled:opacity-40")}>{isBuy ? `Confirm buy ${selectedLabel} ${isBuy && parsedAmount > 0 ? formatUSD(parsedAmount) : ""}` : `Confirm sell ${selectedLabel}`}</button><p className="mt-3 text-center text-[11px] leading-4 text-gray-600">Paper prediction only · quotes can update before a simulated fill</p></div></aside>
      </div>

      {reviewing ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="prediction-review-title"><div className="w-full max-w-md border border-bg-border bg-black p-5"><p className="text-[10px] font-bold tracking-[0.16em] text-accent-green">REVIEW ORDER</p><h2 id="prediction-review-title" className="mt-2 text-2xl font-black">{isBuy ? `Buy ${selectedLabel}` : `Sell ${selectedLabel}`}</h2><p className="mt-2 text-sm text-gray-400">Confirm the outcome, paper amount, and latest displayed price before placing this paper order.</p><div className="mt-5 border-y border-bg-border py-4"><Estimate label="Market" value={market.question} /><Estimate label="Outcome" value={`${selectedLabel} · ${cents(currentPrice)} each`} /><Estimate label={isBuy ? "Paper amount" : "Shares"} value={isBuy ? formatUSD(parsedAmount) : estimatedShares.toFixed(2)} /><Estimate label={isBuy ? "Outcome shares" : "Estimated proceeds"} value={isBuy ? estimatedShares.toFixed(2) : formatUSD(total)} /></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setReviewing(false)} disabled={submitting} className="min-h-11 border border-bg-border text-sm font-bold text-gray-300">Edit</button><button type="button" onClick={() => void submit()} disabled={submitting} className={cn("min-h-11 text-sm font-black", isBuy ? "bg-accent-green text-black" : "bg-accent-red text-white")}>{submitting ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Securing order</> : isBuy ? `Place paper buy ${selectedLabel}` : `Place paper sell ${selectedLabel}`}</button></div></div></div> : null}
      {receipt ? <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="prediction-receipt-title"><div className="w-full max-w-md border border-bg-border bg-black p-6 text-center"><FaceIdSuccessMark className="mx-auto h-14 w-14 text-accent-green" /><p className="mt-4 text-[10px] font-bold tracking-[0.16em] text-gray-500">PAPER ORDER FILLED</p><h2 id="prediction-receipt-title" className="mt-2 text-2xl font-black">{receipt.title}</h2><p className="mt-2 text-sm text-gray-400">{receipt.detail}</p><dl className="mt-5 border-y border-bg-border py-4 text-left"><Estimate label="Status" value="Filled" tone="text-accent-green" /><Estimate label="Quantity" value={`${receipt.amount} ${selectedLabel} shares`} /><Estimate label="Fill price" value={cents(receipt.price)} /></dl><button type="button" onClick={() => setReceipt(null)} className="mt-5 min-h-11 w-full bg-white text-sm font-black text-black">Done</button></div></div> : null}
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className="border border-bg-border bg-bg-soft p-3"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">{label}</dt><dd className={cn("mt-1 truncate text-sm font-bold tabular-nums", tone)} title={value}>{value}</dd></div>;
}

function Estimate({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className="flex items-start justify-between gap-4 py-1.5"><dt className="text-gray-500">{label}</dt><dd className={cn("max-w-[60%] text-right font-semibold tabular-nums", tone)}>{value}</dd></div>;
}
