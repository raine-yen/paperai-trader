"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Award, Eye, Loader2, Medal, Trophy } from "lucide-react";
import { cn, formatPct, formatUSD } from "@/lib/utils";

interface Entry {
  account_id: string;
  display_name: string;
  email?: string;
  equity: number;
  starting_cash: number;
  return_pct: number;
}

interface RevealedAsset {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [revealed, setRevealed] = useState<Record<string, RevealedAsset[]>>({});
  const [peekLoading, setPeekLoading] = useState<string | null>(null);
  const [peekError, setPeekError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const r = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (active) {
        setEntries(j.entries ?? []);
        setLoading(false);
        setLastUpdated(new Date());
      }
    }
    load();
    const id = setInterval(load, 8_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const podium = entries.slice(0, 3);
  const avgReturn = useMemo(() => entries.length ? entries.reduce((sum, e) => sum + Number(e.return_pct), 0) / entries.length : 0, [entries]);

  async function revealAssets(accountId: string) {
    if (revealed[accountId]) return;
    setPeekLoading(accountId);
    setPeekError("");
    const r = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: accountId }),
    });
    const j = await r.json();
    if (r.ok) {
      setRevealed((prev) => ({ ...prev, [accountId]: j.assets ?? [] }));
    } else {
      setPeekError(j.error ?? "Could not reveal assets");
    }
    setPeekLoading(null);
  }

  return (
    <div className="animate-fade-in space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            <span className="h-2 w-2 rounded-full bg-accent-green" />
            Reactive leaderboard
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Club rankings</h1>
          <p className="mt-2 text-sm text-gray-400">Sorted by live return using current positions and quote data. Refreshes every 8 seconds.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
          <Metric label="Traders" value={String(entries.length)} />
          <Metric label="Avg return" value={formatPct(avgReturn)} tone={avgReturn >= 0 ? "text-accent-green" : "text-accent-red"} caption={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : undefined} />
        </div>
      </header>

      {podium.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          {podium.map((entry, index) => (
            <PodiumCard key={entry.account_id} entry={entry} rank={index + 1} />
          ))}
        </section>
      )}

      <section className="card overflow-hidden">
        {peekError && (
          <div className="border-b border-bg-border bg-accent-red/10 px-5 py-3 text-sm font-semibold text-accent-red">{peekError}</div>
        )}
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading rankings...</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No accounts yet. Sign up to be first.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-bg-soft text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="w-20 px-4 py-3 text-left font-semibold">Rank</th>
                  <th className="px-4 py-3 text-left font-semibold">Trader</th>
                  <th className="px-4 py-3 text-right font-semibold">Portfolio</th>
                  <th className="px-4 py-3 text-right font-semibold">Return</th>
                  <th className="px-4 py-3 text-right font-semibold">P/L</th>
                  <th className="px-4 py-3 text-right font-semibold">Progress</th>
                  <th className="px-4 py-3 text-right font-semibold">Assets</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const pl = Number(entry.equity) - Number(entry.starting_cash);
                  const up = Number(entry.return_pct) >= 0;
                  const width = Math.max(4, Math.min(100, Math.abs(Number(entry.return_pct)) * 3));
                  return (
                    <Fragment key={entry.account_id}>
                      <tr className="ticker-row">
                        <td className="px-4 py-4"><RankBadge rank={index + 1} /></td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">{entry.display_name}</div>
                          <div className="text-xs text-gray-500">
                            {entry.email ?? `Starting ${formatUSD(Number(entry.starting_cash))}`}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold tabular-nums">{formatUSD(Number(entry.equity))}</td>
                        <td className={cn("px-4 py-4 text-right font-black tabular-nums", up ? "text-accent-green" : "text-accent-red")}>{formatPct(Number(entry.return_pct))}</td>
                        <td className={cn("px-4 py-4 text-right font-semibold tabular-nums", up ? "text-accent-green" : "text-accent-red")}>{formatUSD(pl)}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="ml-auto h-2 w-32 rounded-full bg-bg-elevated">
                            <div className={cn("h-2 rounded-full", up ? "bg-accent-green" : "bg-accent-red")} style={{ width: `${width}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => revealAssets(entry.account_id)}
                            disabled={peekLoading === entry.account_id}
                            className="btn-ghost border border-bg-border px-3 py-1.5 text-xs"
                            title="Spend $1,000 to reveal this trader's assets"
                          >
                            {peekLoading === entry.account_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                            {revealed[entry.account_id] ? "Viewed" : "$1,000"}
                          </button>
                        </td>
                      </tr>
                      {revealed[entry.account_id] && (
                        <tr className="border-b border-bg-border bg-bg-elevated/35">
                          <td colSpan={7} className="px-4 py-4">
                            {revealed[entry.account_id].length === 0 ? (
                              <div className="text-sm text-gray-500">{entry.display_name} has no open assets.</div>
                            ) : (
                              <div className="grid gap-3 md:grid-cols-3">
                                {revealed[entry.account_id].map((asset) => (
                                  <div key={asset.symbol} className="rounded-lg border border-bg-border bg-bg-card p-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="font-mono font-bold">{asset.symbol}</div>
                                      <div className="text-sm font-semibold tabular-nums">{formatUSD(asset.market_value)}</div>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                                      <div>{asset.qty.toFixed(4)} shares</div>
                                      <div className="text-right">Avg {formatUSD(asset.avg_entry_price)}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PodiumCard({ entry, rank }: { entry: Entry; rank: number }) {
  const pl = Number(entry.equity) - Number(entry.starting_cash);
  const up = Number(entry.return_pct) >= 0;
  const Icon = rank === 1 ? Trophy : rank === 2 ? Medal : Award;
  return (
    <div className={cn("card p-5", rank === 1 && "border-accent-green/50 bg-accent-green/5")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", rank === 1 ? "bg-accent-green text-black" : rank === 2 ? "bg-gray-300 text-black" : "bg-accent-yellow text-black")}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Rank {rank}</div>
            <div className="font-semibold">{entry.display_name}</div>
          </div>
        </div>
        <div className={cn("text-right font-black tabular-nums", up ? "text-accent-green" : "text-accent-red")}>{formatPct(Number(entry.return_pct))}</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="Equity" value={formatUSD(Number(entry.equity))} />
        <Metric label="P/L" value={formatUSD(pl)} tone={up ? "text-accent-green" : "text-accent-red"} />
      </div>
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

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="flex items-center gap-1.5 font-bold text-accent-green"><Trophy className="h-4 w-4" /> 1</span>;
  if (rank === 2) return <span className="flex items-center gap-1.5 font-bold text-gray-300"><Medal className="h-4 w-4" /> 2</span>;
  if (rank === 3) return <span className="flex items-center gap-1.5 font-bold text-accent-yellow"><Award className="h-4 w-4" /> 3</span>;
  return <span className="font-mono text-gray-500">#{rank}</span>;
}
