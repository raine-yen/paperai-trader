"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatUSD } from "@/lib/utils";

interface Snapshot {
  equity: number;
  created_at: string;
}

export function EquityChart({ snapshots, starting }: { snapshots: Snapshot[]; starting: number }) {
  if (snapshots.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-gray-500">
        Performance chart will appear here once you have a few snapshots.
      </div>
    );
  }
  const data = snapshots.map((s) => ({
    t: new Date(s.created_at).getTime(),
    equity: Number(s.equity),
  }));
  const min = Math.min(...data.map((d) => d.equity), starting);
  const max = Math.max(...data.map((d) => d.equity), starting);
  const padding = (max - min) * 0.1 || starting * 0.01;
  const isUp = data[data.length - 1].equity >= starting;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <XAxis dataKey="t" hide />
          <YAxis
            domain={[min - padding, max + padding]}
            tickFormatter={(v) => formatUSD(v, 0)}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            contentStyle={{
              background: "#111317",
              border: "1px solid #1f242c",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
            formatter={(v: number) => [formatUSD(v), "Equity"]}
          />
          <ReferenceLine y={starting} stroke="#6b7280" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="equity"
            stroke={isUp ? "#22c55e" : "#ef4444"}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
