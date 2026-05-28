import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms | Paper Trader",
  description: "Terms for Paper Trader educational paper trading.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-bg text-white">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Paper Trader</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Terms</h1>
        <div className="mt-8 space-y-5 text-sm leading-7 text-gray-300">
          <p>Paper Trader is an educational paper-trading simulator. It does not provide brokerage services, investment advice, real-money trading, deposits, withdrawals, or cash transfers.</p>
          <p>All balances, trades, leaderboard rankings, learning goals, and practice credits are simulated and have no real-world monetary value. The app does not include real-money trading, deposits, withdrawals, payouts, or cash-out mechanics.</p>
          <p>Users are responsible for school-safe conduct in direct messages and competition spaces. Accounts may be disabled or content may be hidden for abuse, harassment, spam, or unsafe behavior.</p>
          <p>Market data may be delayed, unavailable, or approximate and is provided only for educational simulation.</p>
        </div>
        <Link href="/dashboard" className="btn-buy mt-8">Back to app</Link>
      </div>
    </main>
  );
}
