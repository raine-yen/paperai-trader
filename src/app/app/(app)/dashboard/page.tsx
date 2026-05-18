"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Wallet, Briefcase, TrendingUp } from "lucide-react";
import { EquityChart } from "@/components/equity-chart";
import { formatUSD, formatPct, timeAgo, cn } from "@/lib/utils";

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
  }>;
  snapshots: Array<{ equity: number; created_at: string }>;
}

export default function Dashboard() {
  const [data, setData] = useState<MeData | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchMe() {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (active) setData(j);
    }
    fetchMe();
    const id = setInterval(fetchMe, 15_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>;
  if (!data.account) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-400">No trading account found. Please contact your club admin.</p>
      </div>
    );
  }

  const { account, positions, orders, snapshots } = data;
  const totalReturn = account.equity - account.starting_cash;
  const totalReturnPct = (totalReturn / account.starting_cash) * 100;
  const isUp = totalReturn >= 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          label="Portfolio Value"
          value={formatUSD(account.equity)}
          icon={Briefcase}
          subtitle={`${formatPct(totalReturnPct)} all-time`}
          subtitleColor={isUp ? "text-accent-green" : "text-accent-red"}
        />
        <Stat label="Cash" value={formatUSD(account.cash)} icon={Wallet} subtitle="Available to trade" />
        <Stat
          label="Positions Value"
          value={formatUSD(account.positions_value)}
          icon={TrendingUp}
          subtitle={`${positions.length} ${positions.length === 1 ? "position" : "positions"}`}
        />
        <Stat
          label="Today's P/L"
          value={formatUSD(totalReturn)}
          icon={isUp ? ArrowUpRight : ArrowDownRight}
          valueColor={isUp ? "text-accent-green" : "text-accent-red"}
          subtitle={formatPct(totalReturnPct)}
        />
      </div>

      {/* Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Performance</h2>
          <Link href="/trade" className="btn-primary text-xs px-3 py-1.5">
            New Trade
          </Link>
        </div>
        <EquityChart snapshots={snapshots} starting={account.starting_cash} />
      </div>

      {/* Positions */}
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Positions</h2>
        {positions.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No open positions. <Link href="/trade" className="text-accent hover:underline">Make your first trade.</Link>
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase tracking-wider">
                <tr className="border-b border-bg-border">
                  <th className="text-left py-2 px-2 font-medium">Symbol</th>
                  <th className="text-right py-2 px-2 font-medium">Qty</th>
                  <th className="text-right py-2 px-2 font-medium">Avg Cost</th>
                  <th className="text-right py-2 px-2 font-medium">Current</th>
                  <th className="text-right py-2 px-2 font-medium">Market Value</th>
                  <th className="text-right py-2 px-2 font-medium">Unrealized P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {positions.map((p) => {
                  const up = p.unrealized_pl >= 0;
                  return (
                    <tr key={p.symbol} className="hover:bg-bg-elevated/40">
                      <td className="py-3 px-2 font-mono font-semibold">{p.symbol}</td>
                      <td className="py-3 px-2 text-right tabular-nums">{Number(p.qty).toFixed(2)}</td>
                      <td className="py-3 px-2 text-right tabular-nums">{formatUSD(Number(p.avg_entry_price))}</td>
                      <td className="py-3 px-2 text-right tabular-nums">{formatUSD(Number(p.current_price))}</td>
                      <td className="py-3 px-2 text-right tabular-nums">{formatUSD(Number(p.market_value))}</td>
                      <td className={cn("py-3 px-2 text-right tabular-nums", up ? "text-accent-green" : "text-accent-red")}>
                        {formatUSD(Number(p.unrealized_pl))} <span className="text-xs opacity-70">({formatPct(Number(p.unrealized_plpc))})</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent orders */}
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Recent Orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase tracking-wider">
                <tr className="border-b border-bg-border">
                  <th className="text-left py-2 px-2 font-medium">Time</th>
                  <th className="text-left py-2 px-2 font-medium">Symbol</th>
                  <th className="text-left py-2 px-2 font-medium">Side</th>
                  <th className="text-right py-2 px-2 font-medium">Qty</th>
                  <th className="text-right py-2 px-2 font-medium">Fill Price</th>
                  <th className="text-right py-2 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {orders.slice(0, 15).map((o) => (
                  <tr key={o.id} className="hover:bg-bg-elevated/40">
                    <td className="py-2 px-2 text-gray-400">{timeAgo(o.created_at)}</td>
                    <td className="py-2 px-2 font-mono font-semibold">{o.symbol}</td>
                    <td className="py-2 px-2">
                      <span className={cn("badge", o.side === "buy" ? "bg-accent-green/20 text-accent-green" : "bg-accent-red/20 text-accent-red")}>
                        {o.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">{Number(o.qty)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {o.filled_avg_price ? formatUSD(Number(o.filled_avg_price)) : "—"}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  subtitle,
  subtitleColor,
  valueColor,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  subtitleColor?: string;
  valueColor?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="stat-label">{label}</span>
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className={cn("stat", valueColor)}>{value}</div>
      {subtitle && <div className={cn("text-xs mt-1", subtitleColor ?? "text-gray-500")}>{subtitle}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    filled: "bg-accent-green/20 text-accent-green",
    new: "bg-accent/20 text-accent",
    partially_filled: "bg-accent/20 text-accent",
    canceled: "bg-gray-500/20 text-gray-400",
    rejected: "bg-accent-red/20 text-accent-red",
    expired: "bg-gray-500/20 text-gray-400",
  };
  return <span className={cn("badge", map[status] ?? "bg-gray-500/20 text-gray-400")}>{status}</span>;
}
