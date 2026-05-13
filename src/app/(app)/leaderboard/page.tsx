"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Award } from "lucide-react";
import { formatUSD, formatPct, cn } from "@/lib/utils";

interface Entry {
  account_id: string;
  display_name: string;
  equity: number;
  starting_cash: number;
  return_pct: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const r = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (active) {
        setEntries(j.entries ?? []);
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 10_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Leaderboard</h1>
        <p className="text-sm text-gray-400">Live rankings by % return. Updates every 10 seconds.</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No accounts yet. Sign up to be first!</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wider bg-bg-elevated">
              <tr>
                <th className="text-left py-3 px-4 font-medium w-16">Rank</th>
                <th className="text-left py-3 px-4 font-medium">Trader</th>
                <th className="text-right py-3 px-4 font-medium">Portfolio Value</th>
                <th className="text-right py-3 px-4 font-medium">Return</th>
                <th className="text-right py-3 px-4 font-medium">P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {entries.map((e, i) => {
                const pl = Number(e.equity) - Number(e.starting_cash);
                const up = Number(e.return_pct) >= 0;
                return (
                  <tr key={e.account_id} className="hover:bg-bg-elevated/40">
                    <td className="py-4 px-4">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="py-4 px-4 font-medium">{e.display_name}</td>
                    <td className="py-4 px-4 text-right tabular-nums">{formatUSD(Number(e.equity))}</td>
                    <td className={cn("py-4 px-4 text-right tabular-nums font-semibold", up ? "text-accent-green" : "text-accent-red")}>
                      {formatPct(Number(e.return_pct))}
                    </td>
                    <td className={cn("py-4 px-4 text-right tabular-nums", up ? "text-accent-green" : "text-accent-red")}>
                      {formatUSD(pl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="flex items-center gap-1.5 text-yellow-400"><Trophy className="w-4 h-4" /> 1</span>;
  if (rank === 2) return <span className="flex items-center gap-1.5 text-gray-300"><Medal className="w-4 h-4" /> 2</span>;
  if (rank === 3) return <span className="flex items-center gap-1.5 text-orange-400"><Award className="w-4 h-4" /> 3</span>;
  return <span className="text-gray-500 font-mono">#{rank}</span>;
}
