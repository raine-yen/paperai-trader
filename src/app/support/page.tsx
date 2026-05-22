import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support | Paper Trader",
  description: "Support information for the Paper Trader web and mobile apps.",
};

const supportItems = [
  "Login or account access issues",
  "Paper trading order or portfolio questions",
  "Leaderboard or API key issues",
  "Mobile app TestFlight or App Store review questions",
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-bg text-white">
      <div className="mx-auto max-w-4xl px-5 py-16">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Paper Trader</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Support</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
              Use this page for App Store Connect support details and direct help requests.
            </p>
          </div>
          <Link href="/" className="btn-ghost border border-bg-border">
            Back to site
          </Link>
        </div>

        <section className="card p-6">
          <h2 className="text-lg font-semibold">Contact</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-gray-300">
            <p>
              Support email:{" "}
              <a className="text-accent-green hover:underline" href="mailto:ryzones2010919@gmail.com">
                ryzones2010919@gmail.com
              </a>
            </p>
            <p>Response time is typically within a few business days.</p>
          </div>
        </section>

        <section className="card mt-6 p-6">
          <h2 className="text-lg font-semibold">What We Can Help With</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-300">
            {supportItems.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-accent-green" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
