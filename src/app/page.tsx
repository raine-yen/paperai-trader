import Link from "next/link";
import { ArrowRight, Bot, KeyRound, LineChart, LockKeyhole, Radio, Trophy } from "lucide-react";

const metrics = [
  { label: "Live refresh", value: "10s" },
  { label: "Bot API", value: "/v2" },
  { label: "Starting cash", value: "$100k" },
];

const features = [
  { icon: LineChart, title: "Portfolio command center", body: "Equity, cash, holdings, orders, and snapshots in one clean trading view." },
  { icon: Radio, title: "Market scanner", body: "Browse sectors, filter to what you own, search any ticker, and trade from the row." },
  { icon: Trophy, title: "Reactive leaderboard", body: "Live class rankings update from current holdings and real quote data." },
  { icon: KeyRound, title: "Alpaca-style API keys", body: "Students can connect bots with familiar Alpaca headers and endpoints." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-white">
      <nav className="sticky top-0 z-20 border-b border-bg-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-green font-black text-black">P</div>
            <div>
              <div className="font-semibold tracking-tight">Paper Trader</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Club market</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">Log in</Link>
            <Link href="/signup" className="btn-buy">Start trading <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-[1fr_520px]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-bg-border bg-bg-card px-3 py-1 text-xs font-semibold text-gray-300">
              <LockKeyhole className="h-3.5 w-3.5 text-accent-green" />
              Real market data. Paper money. Bot friendly.
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
              A cleaner trading floor for your investing club.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-400">
              Members get a Robinhood-like paper portfolio, a live market scanner, simple buy and sell flows, and Alpaca-compatible API access for AI agents.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-buy px-5 py-3 text-base">Create account <ArrowRight className="h-5 w-5" /></Link>
              <Link href="/docs" className="btn-ghost border border-bg-border px-5 py-3 text-base">Read API docs</Link>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {metrics.map((m) => (
                <div key={m.label} className="surface p-4">
                  <div className="font-mono text-xl font-bold text-white">{m.value}</div>
                  <div className="mt-1 text-xs text-gray-500">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-bg-border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">Club portfolio</div>
                  <div className="mt-1 text-4xl font-bold tabular-nums">$124,982.44</div>
                </div>
                <div className="rounded-full bg-accent-green/15 px-3 py-1 text-sm font-semibold text-accent-green">+8.2%</div>
              </div>
              <div className="mt-8 h-44 rounded-lg border border-bg-border bg-[linear-gradient(180deg,rgba(0,200,83,.18),rgba(0,200,83,0))] p-4">
                <div className="h-full rounded-md border-b-2 border-accent-green" />
              </div>
            </div>
            <div className="divide-y divide-bg-border">
              {["AAPL", "NVDA", "SPY", "TSLA"].map((s, i) => (
                <div key={s} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-mono font-semibold">{s}</div>
                    <div className="text-xs text-gray-500">{["Apple", "NVIDIA", "S&P 500 ETF", "Tesla"][i]}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">${[219.31, 143.22, 612.18, 178.42][i]}</div>
                    <div className="text-xs font-semibold text-accent-green">+{[1.2, 3.8, 0.4, 2.1][i]}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-16 md:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card p-5">
                <Icon className="mb-4 h-5 w-5 text-accent-green" />
                <h2 className="font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">{f.body}</p>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
