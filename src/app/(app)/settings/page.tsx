"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, KeyRound, Loader2, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { formatUSD } from "@/lib/utils";

type Alert = { id: string; symbol: string; direction: string; target_price?: number | null; move_pct?: number | null; status: string };
type Me = {
  account: { id: string; display_name: string; cash: number } | null;
  user?: { email?: string };
  profile?: { bio?: string | null; strategy?: string | null; risk_style?: string | null; is_public?: boolean } | null;
  alerts?: Alert[];
  watchlist?: Array<{ symbol: string }>;
  unread_messages?: number;
};

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [bio, setBio] = useState("");
  const [strategy, setStrategy] = useState("");
  const [risk, setRisk] = useState("balanced");
  const [status, setStatus] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const json = await res.json();
    setMe(json);
    setBio(json.profile?.bio ?? "");
    setStrategy(json.profile?.strategy ?? "");
    setRisk(json.profile?.risk_style ?? "balanced");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProfile() {
    if (!me?.account?.id) return;
    setStatus("");
    const res = await fetch(`/api/trader/${me.account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio, strategy, risk_style: risk, is_public: true }),
    });
    const json = await res.json().catch(() => ({}));
    setStatus(res.ok ? "Profile updated." : json.error ?? "Could not update profile");
    if (res.ok) load();
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      setStatus("Type DELETE to confirm account deletion.");
      return;
    }
    setDeleteBusy(true);
    setStatus("");
    const res = await fetch("/api/account", { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(json.error ?? "Could not delete account");
      setDeleteBusy(false);
      return;
    }
    window.location.href = "/";
  }

  if (loading) return <div className="flex py-24 justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>;

  return (
    <div className="animate-fade-in grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <header>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            <UserRound className="h-3.5 w-3.5 text-accent-green" />
            Account cockpit
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Settings</h1>
          <p className="mt-2 text-sm text-gray-400">Profile, alerts, API keys, and app-review safety surfaces.</p>
        </header>

        <div className="card p-5">
          <h2 className="font-semibold">Trader profile</h2>
          <p className="mt-1 text-sm text-gray-500">Visible from competition profiles so classmates can understand your simulated strategy.</p>
          <div className="mt-5 grid gap-4">
            <div>
              <label className="label">Bio</label>
              <textarea className="input min-h-24" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} />
            </div>
            <div>
              <label className="label">Strategy</label>
              <textarea className="input min-h-24" value={strategy} onChange={(e) => setStrategy(e.target.value)} maxLength={280} />
            </div>
            <div>
              <label className="label">Risk style</label>
              <select className="input" value={risk} onChange={(e) => setRisk(e.target.value)}>
                <option value="conservative">Conservative</option>
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
            {status && <div className="rounded-md bg-bg-elevated px-3 py-2 text-sm text-gray-300">{status}</div>}
            <button onClick={saveProfile} className="btn-buy w-fit">Save profile</button>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Community guidelines</h2>
          <div className="mt-4 grid gap-3 text-sm text-gray-400 md:grid-cols-3">
            <div className="surface p-4">Keep messages school-safe and competition-focused.</div>
            <div className="surface p-4">Report harassment, spam, or personal information sharing.</div>
            <div className="surface p-4">No real-money trading, gambling, betting, prizes, deposits, or withdrawals.</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/privacy" className="btn-ghost border border-bg-border">Privacy policy</Link>
            <Link href="/terms" className="btn-ghost border border-bg-border">Terms</Link>
            <Link href="/community-guidelines" className="btn-ghost border border-bg-border">Guidelines</Link>
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent-green" />
            <h2 className="font-semibold">Account</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Name" value={me?.account?.display_name ?? "-"} />
            <Row label="Email" value={me?.user?.email ?? "-"} />
            <Row label="Practice balance" value={formatUSD(Number(me?.account?.cash ?? 0))} />
            <Row label="Unread DMs" value={String(me?.unread_messages ?? 0)} />
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent-blue" />
            <h2 className="font-semibold">Alerts</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(me?.alerts ?? []).slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between border-b border-bg-border pb-3 text-sm">
                <span className="font-mono font-bold">{alert.symbol}</span>
                <span className="text-gray-500">{alert.direction} {alert.target_price ? formatUSD(Number(alert.target_price)) : `${alert.move_pct}%`}</span>
              </div>
            ))}
            {(me?.alerts ?? []).length === 0 && <p className="text-sm text-gray-500">No active alerts yet.</p>}
          </div>
        </div>
        <Link href="/api-keys" className="card flex items-center justify-between p-5 transition-colors hover:border-accent-green/50">
          <div>
            <h2 className="font-semibold">API keys</h2>
            <p className="mt-1 text-sm text-gray-500">Connect bots to the Alpaca-compatible API.</p>
          </div>
          <KeyRound className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="card border-red-500/30 p-5">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-400" />
            <h2 className="font-semibold">Delete account</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Permanently deletes your Paper Trader account and associated profile, orders, positions, messages, watchlists, and alerts.
          </p>
          <label className="label mt-4 block">Type DELETE to confirm</label>
          <input className="input mt-2" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
          <button
            onClick={deleteAccount}
            disabled={deleteBusy || deleteConfirm !== "DELETE"}
            className="mt-3 w-full rounded-md bg-red-500 px-4 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleteBusy ? "Deleting..." : "Delete my account"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-bg-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="max-w-[180px] truncate text-right font-semibold">{value}</span>
    </div>
  );
}
