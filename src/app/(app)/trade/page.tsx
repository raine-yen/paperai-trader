"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { formatUSD, cn } from "@/lib/utils";

export default function TradePage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [qty, setQty] = useState("10");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [quote, setQuote] = useState<{ price: number; prevClose: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!symbol || symbol.length < 1) return;
    const id = setTimeout(async () => {
      const r = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
      if (!r.ok) {
        setQuote(null);
        return;
      }
      const j = await r.json();
      setQuote({ price: j.price, prevClose: j.prevClose });
    }, 300);
    return () => clearTimeout(id);
  }, [symbol]);

  const cost = quote ? Number(qty || 0) * quote.price : 0;
  const change = quote && quote.prevClose ? quote.price - quote.prevClose : 0;
  const changePct = quote && quote.prevClose ? (change / quote.prevClose) * 100 : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: symbol.toUpperCase(),
        qty: Number(qty),
        side,
        type: orderType,
        limit_price: orderType === "limit" ? Number(limitPrice) : undefined,
      }),
    });
    const j = await res.json();
    if (res.ok) {
      setResult({
        ok: true,
        msg: `${side.toUpperCase()} order for ${qty} ${symbol.toUpperCase()} ${j.status === "filled" ? `filled at ${formatUSD(Number(j.filled_avg_price))}` : "submitted"}`,
      });
    } else {
      setResult({ ok: false, msg: j.error ?? "order failed" });
    }
    setLoading(false);
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl animate-fade-in">
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-1">Manual Trade</h1>
        <p className="text-sm text-gray-400 mb-6">
          Place orders directly. For AI bots, see the{" "}
          <a className="text-accent hover:underline" href="/docs">docs</a>.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Symbol</label>
            <input
              className="input font-mono uppercase"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              required
              maxLength={8}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={cn(
                "py-3 rounded-lg font-medium border transition-colors",
                side === "buy" ? "bg-accent-green text-black border-accent-green" : "border-bg-border text-gray-400 hover:text-white"
              )}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={cn(
                "py-3 rounded-lg font-medium border transition-colors",
                side === "sell" ? "bg-accent-red text-white border-accent-red" : "border-bg-border text-gray-400 hover:text-white"
              )}
            >
              Sell
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity</label>
              <input type="number" min="0" step="0.01" className="input" value={qty} onChange={(e) => setQty(e.target.value)} required />
            </div>
            <div>
              <label className="label">Order Type</label>
              <select
                className="input"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as "market" | "limit")}
              >
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </div>
          </div>

          {orderType === "limit" && (
            <div>
              <label className="label">Limit Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !quote}
            className={cn("w-full py-3 rounded-lg font-medium transition-colors", side === "buy" ? "bg-accent-green text-black hover:bg-green-400" : "bg-accent-red text-white hover:bg-red-500", "disabled:opacity-50")}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `${side.toUpperCase()} ${symbol}`}
          </button>

          {result && (
            <div className={cn("p-3 rounded text-sm", result.ok ? "bg-accent-green/10 text-accent-green" : "bg-accent-red/10 text-accent-red")}>
              {result.msg}
            </div>
          )}
        </form>
      </div>

      <div className="space-y-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-gray-500">Quote</span>
            <span className="font-mono text-xs text-gray-500">{symbol}</span>
          </div>
          {quote ? (
            <>
              <div className="text-4xl font-bold tabular-nums">{formatUSD(quote.price)}</div>
              {quote.prevClose && (
                <div className={cn("text-sm mt-1 flex items-center gap-1", change >= 0 ? "text-accent-green" : "text-accent-red")}>
                  {change >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                  {formatUSD(Math.abs(change))} ({changePct.toFixed(2)}%) today
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-sm">Loading quote…</div>
          )}
        </div>

        <div className="card p-6">
          <span className="text-xs uppercase tracking-wider text-gray-500">Order Preview</span>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Action" value={`${side.toUpperCase()} ${qty || "0"} ${symbol}`} />
            <Row label="Type" value={orderType === "market" ? "Market (instant)" : "Limit"} />
            {quote && <Row label="Estimated cost" value={formatUSD(cost)} />}
            {orderType === "limit" && limitPrice && (
              <Row label="At limit" value={formatUSD(Number(limitPrice))} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
