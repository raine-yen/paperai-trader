import Link from "next/link";
import { ArrowRight, Bot, Trophy, KeyRound, LineChart, Zap, Code } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="border-b border-bg-border bg-bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-green flex items-center justify-center font-bold text-black">
              P
            </div>
            <span className="font-semibold tracking-tight text-lg">Paper Trader</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">Log in</Link>
            <Link href="/signup" className="btn-primary">Sign up <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-card border border-bg-border text-xs text-gray-400 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          Built for high school + college investing clubs
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
          Paper trading that
          <span className="block bg-gradient-to-r from-accent to-accent-green bg-clip-text text-transparent">
            AI agents can plug into.
          </span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
          An open paper trading simulator with an Alpaca-compatible API. Your club members
          build trading bots, plug in their API keys, and battle on a live leaderboard with
          real market data — no real money, no age restrictions.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Start trading
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/docs" className="btn-ghost px-6 py-3 text-base border border-bg-border">
            Read the docs
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-5">
        {[
          {
            icon: Bot,
            title: "Alpaca-compatible API",
            body: "Same endpoints, same auth headers. If it runs against Alpaca, it runs here. Swap one base URL and your AI agent works.",
          },
          {
            icon: LineChart,
            title: "Real market data",
            body: "Live prices from Yahoo Finance every minute. Trades fill against the actual market — your strategy gets tested for real.",
          },
          {
            icon: Trophy,
            title: "Live leaderboard",
            body: "Watch portfolios rank in real time. Run multi-week competitions, project it on the wall, declare a champion.",
          },
          {
            icon: KeyRound,
            title: "One-click API keys",
            body: "Generate Alpaca-style key pairs in seconds. Drop them in your Python script, you're trading.",
          },
          {
            icon: Code,
            title: "Built for beginners",
            body: "Copy-paste starter code. A 14-year-old with two hours of Python can ship a working bot.",
          },
          {
            icon: Zap,
            title: "Free forever",
            body: "Free Vercel hosting + free Supabase tier. Run the platform for your whole club at zero cost.",
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="card p-6">
              <Icon className="w-6 h-6 text-accent mb-4" />
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.body}</p>
            </div>
          );
        })}
      </section>

      {/* Code preview */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Looks just like Alpaca.</h2>
          <p className="text-gray-400">Because it works just like Alpaca — your AI agent can't tell the difference.</p>
        </div>
        <div className="card p-6 font-mono text-sm overflow-x-auto">
          <pre className="text-gray-300 whitespace-pre">
{`import requests

BASE = "https://your-app.vercel.app"
HEADERS = {
  "APCA-API-KEY-ID":     "PK1234567890ABCDEF",
  "APCA-API-SECRET-KEY": "abcd...your-secret...1234",
}

# Buy 10 shares of AAPL at the market
requests.post(f"{BASE}/v2/orders", headers=HEADERS, json={
  "symbol": "AAPL", "qty": 10,
  "side": "buy", "type": "market",
  "time_in_force": "gtc",
})

# Check your portfolio
print(requests.get(f"{BASE}/v2/account", headers=HEADERS).json())`}
          </pre>
        </div>
      </section>

      <footer className="border-t border-bg-border py-8 text-center text-xs text-gray-500">
        Built for investing clubs. Powered by Next.js + Supabase + Yahoo Finance.
      </footer>
    </div>
  );
}
