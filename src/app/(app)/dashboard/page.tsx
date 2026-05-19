"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3, Gift, Landmark, Target, Trophy, Wallet } from "lucide-react";
import { EquityChart } from "@/components/equity-chart";
import { getCompanyName } from "@/lib/market-data";
import { cn, formatPct, formatUSD, timeAgo } from "@/lib/utils";

interface MeData {
  account: {
    id: string;
    display_name: string;
    cash: number;
    starting_cash: number;
    equity: number;
    positions_value: number;
  } | null;
  positions: Array<{
    symbol: string;
    qty: number;
    avg_entry_price: number;
    current_price: number;
    market_value: number;
    unrealized_pl: number;
    unrealized_plpc: number;
  }>;
  orders: Array<{
    id: string;
    symbol: string;
    qty: number;
    side: string;
    type: string;
    status: string;
    created_at: string;
    filled_avg_price: number | null;
    scheduled_at: string | null;
  }>;
  snapshots: Array<{ equity: number; created_at: string }>;
}

export default function Dashboard() {
  const [data, setData] = useState<MeData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    async function fetchMe() {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (active) {
        setData(j);
        setLastUpdated(new Date());
      }
    }
    fetchMe();
    const id = setInterval(fetchMe, 10_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const topPosition = useMemo(() => {
    if (!data?.positions.length) return null;
    return [...data.positions].sort((a, b) => Math.abs(b.unrealized_pl) - Math.abs(a.unrealized_pl))[0];
  }, [data?.positions]);

  useEffect(() => {
    if (!data?.account?.id) return;
    const raw = window.localStorage.getItem(`paper-trader:rewards:${data.account.id}`);
    setClaimedRewards(raw ? JSON.parse(raw) : []);
  }, [data?.account?.id]);

  if (!data) return <DashboardSkeleton />;
  if (!data.account) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-xl font-semibold">No trading account found</h1>
        <p className="mt-2 text-sm text-gray-400">Please contact your club admin to activate your paper account.</p>
      </div>
    );
  }

  const { account, positions, orders, snapshots } = data;
  const totalReturn = account.equity - account.starting_cash;
  const totalReturnPct = account.starting_cash > 0 ? (totalReturn / account.starting_cash) * 100 : 0;
  const isUp = totalReturn >= 0;
  const allocationBase = Math.max(account.equity, 1);
  const quests = getQuests({
    totalReturnPct,
    holdings: positions.length,
    orders: orders.length,
    scheduledOrders: orders.filter((o) => !!o.scheduled_at).length,
    cash: account.cash,
  });

  function claimReward(id: string) {
    if (claimedRewards.includes(id)) return;
    const next = [...claimedRewards, id];
    setClaimedRewards(next);
    window.localStorage.setItem(`paper-trader:rewards:${account.id}`, JSON.stringify(next));
  }

  return (
    <div className="animate-fade-in space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-5 border-b border-bg-border p-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                <span className="h-2 w-2 rounded-full bg-accent-green" />
                Portfolio
              </div>
              <div className="mt-3 text-5xl font-black tracking-tight tabular-nums md:text-6xl">{formatUSD(account.equity)}</div>
              <div className={cn("mt-2 flex items-center gap-1 text-sm font-semibold", isUp ? "text-accent-green" : "text-accent-red")}>
                {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {formatUSD(totalReturn)} ({formatPct(totalReturnPct)}) all time
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
              <Metric label="Cash" value={formatUSD(account.cash)} icon={Wallet} />
              <Metric label="Invested" value={formatUSD(account.positions_value)} icon={BriefcaseBusiness} />
              <Metric label="Holdings" value={String(positions.length)} icon={Landmark} />
              <Metric label="Refresh" value="10s" icon={Clock3} caption={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : undefined} />
            </div>
          </div>
          <div className="p-5">
            <EquityChart snapshots={snapshots} starting={account.starting_cash} />
          </div>
        </div>

        <aside className="card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Account Mix</h2>
              <p className="text-xs text-gray-500">Cash and open market value</p>
            </div>
            <Link href="/market" className="text-xs font-semibold text-accent-green hover:text-white">Trade</Link>
          </div>
          <div className="space-y-4">
            <Allocation label="Cash" value={account.cash} total={allocationBase} tone="bg-accent-blue" />
            <Allocation label="Positions" value={account.positions_value} total={allocationBase} tone="bg-accent-green" />
          </div>
          <div className="mt-6 rounded-lg bg-bg-elevated p-4">
            <div className="text-xs uppercase tracking-wider text-gray-500">Largest mover</div>
            {topPosition ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono font-bold">{topPosition.symbol}</div>
                  <div className="text-xs text-gray-500">{getCompanyName(topPosition.symbol)}</div>
                </div>
                <div className={cn("text-right text-sm font-semibold tabular-nums", topPosition.unrealized_pl >= 0 ? "text-accent-green" : "text-accent-red")}>
                  <div>{formatUSD(topPosition.unrealized_pl)}</div>
                  <div>{formatPct(topPosition.unrealized_plpc)}</div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">No positions yet.</p>
            )}
          </div>
        </aside>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-bg-border p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              <Trophy className="h-3.5 w-3.5 text-accent-green" />
              Quests
            </div>
            <h2 className="mt-2 font-semibold">Goals and claimable rewards</h2>
          </div>
          <div className="text-sm text-gray-400">{claimedRewards.length}/{quests.length} rewards claimed</div>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          {quests.map((quest) => {
            const pct = Math.min(100, (quest.progress / quest.goal) * 100);
            const complete = quest.progress >= quest.goal;
            const claimed = claimedRewards.includes(quest.id);
            return (
              <div key={quest.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <Target className="h-4 w-4 text-accent-blue" />
                      {quest.title}
                    </div>
                    <p className="mt-1 text-sm text-gray-400">{quest.description}</p>
                  </div>
                  {claimed && <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-green" />}
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{Math.min(quest.progress, quest.goal).toFixed(quest.decimals ?? 0)} / {quest.goal}</span>
                    <span>{Math.floor(pct)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-card">
                    <div className="h-2 rounded-full bg-accent-green" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    <Gift className="mr-1 inline h-3.5 w-3.5" />
                    {quest.reward}
                  </div>
                  <button type="button" onClick={() => claimReward(quest.id)} disabled={!complete || claimed} className="btn-primary px-3 py-1.5 text-xs">
                    {claimed ? "Claimed" : "Claim"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-bg-border p-5">
            <div>
              <h2 className="font-semibold">Holdings</h2>
              <p className="text-xs text-gray-500">Every open position, current value, and unrealized P/L.</p>
            </div>
            <Link href="/market" className="btn-buy px-3 py-1.5 text-xs">Browse market</Link>
          </div>
          {positions.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              No open holdings. <Link href="/market" className="text-accent-green hover:underline">Find your first trade.</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-soft text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Asset</th>
                    <th className="px-4 py-3 text-right font-semibold">Shares</th>
                    <th className="px-4 py-3 text-right font-semibold">Avg Cost</th>
                    <th className="px-4 py-3 text-right font-semibold">Last</th>
                    <th className="px-4 py-3 text-right font-semibold">Value</th>
                    <th className="px-4 py-3 text-right font-semibold">Unrealized</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const up = p.unrealized_pl >= 0;
                    return (
                      <tr key={p.symbol} className="ticker-row">
                        <td className="px-4 py-4">
                          <div className="font-mono font-bold">{p.symbol}</div>
                          <div className="text-xs text-gray-500">{getCompanyName(p.symbol)}</div>
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums">{Number(p.qty).toFixed(4)}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{formatUSD(Number(p.avg_entry_price))}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{formatUSD(Number(p.current_price))}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{formatUSD(Number(p.market_value))}</td>
                        <td className={cn("px-4 py-4 text-right font-semibold tabular-nums", up ? "text-accent-green" : "text-accent-red")}>
                          {formatUSD(Number(p.unrealized_pl))}
                          <span className="ml-1 text-xs opacity-70">{formatPct(Number(p.unrealized_plpc))}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link href={`/market?symbol=${encodeURIComponent(p.symbol)}&side=sell`} className="rounded-md border border-bg-border px-3 py-1.5 text-xs font-semibold text-gray-300 hover:border-accent-red hover:text-accent-red">Sell</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-bg-border p-5">
            <h2 className="font-semibold">Recent Orders</h2>
            <p className="text-xs text-gray-500">Latest fills, queued limits, and rejected orders.</p>
          </div>
          {orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No orders yet.</div>
          ) : (
            <div className="divide-y divide-bg-border">
              {orders.slice(0, 12).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 p-4 hover:bg-bg-elevated/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{o.symbol}</span>
                      <span className={cn("badge", o.side === "buy" ? "bg-accent-green/15 text-accent-green" : "bg-accent-red/15 text-accent-red")}>{o.side}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {Number(o.qty)} shares - {o.scheduled_at ? `scheduled ${new Date(o.scheduled_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}` : timeAgo(o.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={o.status} />
                    <div className="mt-1 text-xs tabular-nums text-gray-500">{o.filled_avg_price ? formatUSD(Number(o.filled_avg_price)) : o.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function getQuests(stats: { totalReturnPct: number; holdings: number; orders: number; scheduledOrders: number; cash: number }) {
  return [
    {
      id: "first-order",
      title: "First Bell",
      description: "Place your first trade.",
      progress: stats.orders,
      goal: 1,
      reward: "Rookie Trader badge",
    },
    {
      id: "three-holdings",
      title: "Diversifier",
      description: "Hold three different symbols at once.",
      progress: stats.holdings,
      goal: 3,
      reward: "Sector Scout badge",
    },
    {
      id: "green-portfolio",
      title: "Green Day",
      description: "Get your all-time return above 2%.",
      progress: Math.max(0, stats.totalReturnPct),
      goal: 2,
      decimals: 1,
      reward: "Momentum ribbon",
    },
    {
      id: "timekeeper",
      title: "Timekeeper",
      description: "Create one scheduled price order.",
      progress: stats.scheduledOrders,
      goal: 1,
      reward: "Clockwork Strategist badge",
    },
    {
      id: "cash-buffer",
      title: "Risk Buffer",
      description: "Keep at least $10,000 in cash.",
      progress: Math.min(stats.cash, 10000),
      goal: 10000,
      reward: "$10K Discipline medal",
    },
    {
      id: "active-trader",
      title: "Active Trader",
      description: "Submit five total orders.",
      progress: stats.orders,
      goal: 5,
      reward: "Order Flow badge",
    },
  ];
}

function Metric({ label, value, caption, icon: Icon }: { label: string; value: string; caption?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="stat-label">{label}</span>
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
      {caption && <div className="mt-1 text-[11px] text-gray-500">{caption}</div>}
    </div>
  );
}

function Allocation({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / total) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono tabular-nums">{formatUSD(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-bg-elevated">
        <div className={cn("h-2 rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    filled: "bg-accent-green/15 text-accent-green",
    new: "bg-accent-blue/15 text-accent-blue",
    partially_filled: "bg-accent-blue/15 text-accent-blue",
    canceled: "bg-gray-500/15 text-gray-400",
    rejected: "bg-accent-red/15 text-accent-red",
    expired: "bg-gray-500/15 text-gray-400",
  };
  return <span className={cn("badge capitalize", map[status] ?? "bg-gray-500/15 text-gray-400")}>{status.replace("_", " ")}</span>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="card h-96 animate-pulse" />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="card h-80 animate-pulse" />
        <div className="card h-80 animate-pulse" />
      </div>
    </div>
  );
}
