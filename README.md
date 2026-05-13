# Paper Trader

An Alpaca-compatible paper trading simulator built for investing clubs.

Students sign up, get API keys, plug them into their AI trading agents, and
compete on a live leaderboard against real Yahoo Finance market data.

**Why this exists:** Alpaca requires users to be 18+. This simulator gives
high-school / middle-school clubs the exact same API surface with no age limit.

## What's inside

- **Next.js 15** + TypeScript + Tailwind frontend
- **Supabase** for database and email/password auth
- **Yahoo Finance** for free real market data (no API key needed)
- **Alpaca-compatible REST API** at `/v2/*` — works with `alpaca-py` and any
  existing Alpaca code
- **Live leaderboard** sorted by % return
- **Vercel Cron** that runs every minute to fill limit orders and update equity

## Quick start

See [SETUP.md](./SETUP.md) for the full 10-minute walkthrough.

```bash
npm install
cp .env.local.example .env.local
# Fill in the Supabase keys
npm run dev
```

Then visit http://localhost:3000

## File layout

```
src/
  app/
    page.tsx              landing page
    login/, signup/       auth
    (app)/                authenticated pages (uses Nav)
      dashboard/          portfolio overview
      trade/              manual trade form
      leaderboard/        live rankings
      api-keys/           generate API keys for AI agents
      docs/               in-app docs with code snippets
    v2/                   Alpaca-compatible REST API
      account/
      positions/, positions/[symbol]/
      orders/, orders/[id]/
      assets/[symbol]/
      stocks/[symbol]/quotes/latest/
      stocks/[symbol]/bars/
      clock/
    api/
      auth/               login, signup, logout
      keys/, keys/[id]/   manage API keys
      me/                 dashboard data
      trade/              browser trade (session-auth)
      leaderboard/
      quote/              live quote (for trade form)
      cron/tick/          1-minute price + order tick (Vercel Cron)
      cron/snapshot/      5-minute equity snapshot
  lib/
    supabase/             clients (browser / server / admin)
    engine.ts             order matching + tick loop
    prices.ts             Yahoo Finance wrapper
    auth.ts               API key validation
    api-keys.ts           key generation + hashing
    alpaca-format.ts      DB row → Alpaca JSON
    types.ts              TypeScript types
    utils.ts              formatters
supabase/
  schema.sql              full database schema
```

## License

MIT — built for educational use.
