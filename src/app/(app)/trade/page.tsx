"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Clock3, Loader2, Search } from "lucide-react";
import { getCompanyName } from "@/lib/market-data";
import { cn, formatPct, formatUSD } from "@/lib/utils";

interface Position {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
}

export default function TradePage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [qty, setQty] = useState("10");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [timing, setTiming] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [quote, setQuote] = useState<{ price: number; prevClose: number | null } | null>(null);
  const [cash, setCash] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const upperSymbol = symbol.trim().toUpperCase();
  const position = useMemo(() => positions.find((p) => p.symbol === upperSymbol) ?? null, [positions, upperSymbol]);
  const ownedQty = Number(position?.qty ?? 0);

  async function refreshAccount() {
    const r = await fetch("/api/me", { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    if (j.account) setCash(Number(j.account.cash));
    if (j.positions) setPositions(j.positions);
  }

  useEffect(() => {
    refreshAccount();
  }, []);

  useEffect(() => {
    if (!upperSymbol) return;
    const id = setTimeout(async () => {
      const r = await fetch(`/api/quote?symbol=${encodeURIComponent(upperSymbol)}`, { cache: "no-store" });
      if (!r.ok) {
        setQuote(null);
        return;
      }
      const j = await r.json();
      const next = { price: Number(j.price), prevClose: j.prevClose == null ? null : Number(j.prevClose) };
      setQuote(next);
      if (!limitPrice) setLimitPrice(next.price.toFixed(2));
    }, 250);
    return () => clearTimeout(id);
  }, [upperSymbol, limitPrice]);

  useEffect(() => {
    setResult(null);
  }, [side, symbol, qty, orderType, limitPrice]);

  const quantity = Number(qty) || 0;
  const orderPrice = orderType === "limit" && Number(limitPrice) > 0 ? Number(limitPrice) : quote?.price ?? 0;
  const notional = quantity * orderPrice;
  const change = quote?.prevClose ? quote.price - quote.prevClose : 0;
  const changePct = quote?.prevClose ? (change / quote.prevClose) * 100 : 0;
  const sellTooMuch = side === "sell" && quantity > ownedQty + 0.00001;
  const cannotSell = side === "sell" && ownedQty <= 0;
  const buyTooMuch = side === "buy" && notional > cash + 0.01;
  const scheduledTime = scheduledAt ? new Date(scheduledAt) : null;
  const scheduledTimeValid = timing === "now" || (!!scheduledTime && scheduledTime.getTime() > Date.now());
  const canSubmit = !!quote && quantity > 0 && scheduledTimeValid && !loading && !sellTooMuch && !cannotSell && !buyTooMuch;

  function sellAll() {
    setSide("sell");
    setQty(ownedQty.toFixed(4));
  }

  function maxBuy() {
    if (!quote?.price) return;
    setQty((Math.floor((cash / quote.price) * 10000) / 10000).toFixed(4));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: upperSymbol,
        qty: quantity,
        side,
        type: orderType,
        limit_price: orderType === "limit" ? Number(limitPrice) : undefined,
        scheduled_at: timing === "scheduled" ? scheduledTime?.toISOString() : undefined,
      }),
    });
    const j = await res.json();
    if (res.ok) {
      setResult({ ok: true, msg: `${side.toUpperCase()} order for ${quantity} ${upperSymbol} ${j.status === "filled" ? `filled at ${formatUSD(Number(j.filled_avg_price))}` : timing === "scheduled" ? "scheduled" : "submitted"}` });
      refreshAccount();
    } else {
      setResult({ ok: false, msg: j.error ?? "Order failed" });
    }
    setLoading(false);
  }

  return (
    <div className="animate-fade-in grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="card overflow-hidden">
        <div className="border-b border-bg-border p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                <Search className="h-3.5 w-3.5 text-accent-green" />
                Manual trade
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Fast order ticket</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">Use this for clean one-off trades. For bots, keep using the Alpaca-compatible API in <Link href="/docs" className="text-accent-green hover:underline">Docs</Link>.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
              <Metric label="Buying power" value={formatUSD(cash)} tone="text-accent-green" />
              <Metric label="Owned" value={`${ownedQty.toFixed(4)}`} caption={upperSymbol} />
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <div>
              <label className="label">Symbol</label>
              <input className="input font-mono uppercase" value={symbol} onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setLimitPrice(""); }} required maxLength={8} />
              <div className="mt-2 text-xs text-gray-500">{getCompanyName(upperSymbol)}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-bg-elevated p-1">
              <button type="button" onClick={() => setSide("buy")} className={cn("rounded-md py-3 font-black transition-colors", side === "buy" ? "bg-accent-green text-black" : "text-gray-400 hover:text-white")}>Buy</button>
              <button type="button" onClick={() => setSide("sell")} className={cn("rounded-md py-3 font-black transition-colors", side === "sell" ? "bg-accent-red text-white" : "text-gray-400 hover:text-white")}>Sell</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="label mb-0">Quantity</label>
                  {side === "sell" ? (
                    <button type="button" onClick={sellAll} disabled={!ownedQty} className="text-xs font-bold text-accent-red hover:text-white disabled:opacity-40">Sell all</button>
                  ) : (
                    <button type="button" onClick={maxBuy} disabled={!quote} className="text-xs font-bold text-accent-green hover:text-white disabled:opacity-40">Max buy</button>
                  )}
                </div>
                <input type="number" min="0" max={side === "sell" ? ownedQty : undefined} step="0.0001" className="input font-mono" value={qty} onChange={(e) => setQty(e.target.value)} required />
              </div>
              <div>
                <label className="label">Order Type</label>
                <select className="input" value={orderType} onChange={(e) => setOrderType(e.target.value as "market" | "limit")}>
                  <option value="market" disabled={timing === "scheduled"}>Market</option>
                  <option value="limit">Limit</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Timing</label>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-bg-elevated p-1">
                <button type="button" onClick={() => setTiming("now")} className={cn("rounded-md py-2.5 text-sm font-black transition-colors", timing === "now" ? "bg-white text-black" : "text-gray-400 hover:text-white")}>Now</button>
                <button type="button" onClick={() => { setTiming("scheduled"); setOrderType("limit"); }} className={cn("rounded-md py-2.5 text-sm font-black transition-colors", timing === "scheduled" ? "bg-accent-blue text-black" : "text-gray-400 hover:text-white")}>Scheduled</button>
              </div>
            </div>

            {orderType === "limit" && (
              <div>
                <label className="label">{timing === "scheduled" ? "Target Price" : "Limit Price"}</label>
                <input type="number" min="0" step="0.01" className="input font-mono" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} required />
              </div>
            )}

            {timing === "scheduled" && (
              <div>
                <label className="label">Send At</label>
                <input type="datetime-local" className="input font-mono" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
                {!scheduledTimeValid && <div className="mt-2 text-xs font-semibold text-accent-red">Pick a future time.</div>}
              </div>
            )}

            {(cannotSell || sellTooMuch || buyTooMuch) && (
              <div className="rounded-lg bg-accent-red/10 p-3 text-sm font-semibold text-accent-red">
                {cannotSell ? `You do not own ${upperSymbol}, so selling is disabled.` : sellTooMuch ? `You only own ${ownedQty.toFixed(4)} shares of ${upperSymbol}.` : "This order is above your buying power."}
              </div>
            )}

            {result && <div className={cn("rounded-lg p-3 text-sm font-semibold", result.ok ? "bg-accent-green/10 text-accent-green" : "bg-accent-red/10 text-accent-red")}>{result.msg}</div>}

            <button type="submit" disabled={!canSubmit} className={cn("w-full rounded-lg py-4 font-black transition-colors disabled:opacity-40", side === "buy" ? "bg-accent-green text-black hover:bg-green-300" : "bg-accent-red text-white hover:bg-red-500")}>
              {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : `${side === "buy" ? "Buy" : "Sell"} ${upperSymbol}`}
            </button>
          </div>

          <div className="space-y-4">
            <div className="surface p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="stat-label">Quote</span>
                <span className="font-mono text-xs text-gray-500">{upperSymbol}</span>
              </div>
              {quote ? (
                <>
                  <div className="text-5xl font-black tabular-nums">{formatUSD(quote.price)}</div>
                  {quote.prevClose && (
                    <div className={cn("mt-2 flex items-center gap-1 text-sm font-semibold", change >= 0 ? "text-accent-green" : "text-accent-red")}>
                      {change >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      {formatUSD(Math.abs(change))} ({formatPct(changePct)}) today
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500">Loading quote...</div>
              )}
            </div>

            <div className="surface p-5">
              <span className="stat-label">Order preview</span>
              <div className="mt-4 space-y-3 text-sm">
                <Row label="Action" value={`${side.toUpperCase()} ${quantity || 0} ${upperSymbol}`} />
                <Row label="Type" value={orderType === "market" ? "Market" : "Limit"} />
                {timing === "scheduled" && <Row label="Scheduled for" value={scheduledAt ? new Date(scheduledAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Pick a time"} />}
                {orderType === "limit" && <Row label="Target price" value={Number(limitPrice) > 0 ? formatUSD(Number(limitPrice)) : "-"} />}
                {quote && <Row label={side === "buy" ? "Estimated cost" : "Estimated proceeds"} value={formatUSD(notional)} bold />}
                {side === "sell" && <Row label="Shares after sale" value={Math.max(0, ownedQty - quantity).toFixed(4)} />}
                {side === "buy" && <Row label="Buying power after" value={formatUSD(Math.max(0, cash - notional))} />}
              </div>
            </div>

            <div className="surface p-5">
              <span className="stat-label">Current holding</span>
              {position ? (
                <div className="mt-4 space-y-3 text-sm">
                  <Row label="Shares owned" value={ownedQty.toFixed(4)} />
                  <Row label="Market value" value={formatUSD(Number(position.market_value))} />
                  <Row label="Avg cost" value={formatUSD(Number(position.avg_entry_price))} />
                  <Row label="Unrealized P/L" value={`${formatUSD(Number(position.unrealized_pl))} (${formatPct(Number(position.unrealized_plpc))})`} tone={Number(position.unrealized_pl) >= 0 ? "text-accent-green" : "text-accent-red"} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">You do not currently own {upperSymbol}.</p>
              )}
            </div>
          </div>
        </form>
      </section>

      <aside className="card h-fit p-5">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-accent-blue" />
          <h2 className="font-semibold">Trading guardrails</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm text-gray-400">
          <p>Sells are capped to your owned quantity before submission, so you will see the exact number available instead of discovering it from a failed order.</p>
          <p>Scheduled orders wait until the selected time, then the regular price check decides whether the target limit can fill.</p>
        </div>
        <div className="mt-5 grid gap-2">
          <Link href="/market" className="btn-buy">Open market scanner</Link>
          <Link href="/api-keys" className="btn-ghost border border-bg-border">Manage API keys</Link>
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value, caption, tone }: { label: string; value: string; caption?: string; tone?: string }) {
  return (
    <div className="surface p-4">
      <div className="stat-label">{label}</div>
      <div className={cn("mt-2 text-xl font-bold tabular-nums", tone)}>{value}</div>
      {caption && <div className="mt-1 text-[11px] text-gray-500">{caption}</div>}
    </div>
  );
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={cn("text-right tabular-nums", bold ? "font-bold text-white" : "font-medium", tone)}>{value}</span>
    </div>
  );
}
