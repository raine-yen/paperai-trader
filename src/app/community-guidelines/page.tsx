import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Guidelines | Paper Trader",
  description: "Community safety rules for Paper Trader direct messages and competitions.",
};

const rules = [
  "Keep messages respectful, school-safe, and focused on learning or competition.",
  "Do not harass, threaten, spam, impersonate, or share private personal information.",
  "Do not present simulated balances, practice credits, or classroom rankings as real money, payouts, or cash-out value.",
  "Use report and block controls when something feels unsafe or inappropriate.",
  "Admins may review reports, hide messages, disable accounts, and moderate unsafe activity.",
];

export default function CommunityGuidelinesPage() {
  return (
    <main className="min-h-screen bg-bg text-white">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Paper Trader</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Community Guidelines</h1>
        <div className="mt-8 divide-y divide-bg-border rounded-lg border border-bg-border bg-bg-card">
          {rules.map((rule, index) => (
            <div key={rule} className="flex gap-4 p-5">
              <div className="font-mono text-sm text-accent-green">{String(index + 1).padStart(2, "0")}</div>
              <p className="text-sm leading-7 text-gray-300">{rule}</p>
            </div>
          ))}
        </div>
        <Link href="/dashboard" className="btn-buy mt-8">Back to app</Link>
      </div>
    </main>
  );
}
