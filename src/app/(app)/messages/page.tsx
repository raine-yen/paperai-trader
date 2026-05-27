"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Flag, Loader2, MessageCircle, Send } from "lucide-react";
import { cn, formatUSD, timeAgo } from "@/lib/utils";

type Leader = { account_id: string; display_name: string; equity: number; return_pct: number };
type Message = { id: string; sender_account_id: string; recipient_account_id: string; body: string; created_at: string };
type Me = { account: { id: string; cash: number; display_name: string } | null; unread_messages?: number };

export default function MessagesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [traders, setTraders] = useState<Leader[]>([]);
  const [selected, setSelected] = useState<Leader | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [amount, setAmount] = useState("250");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const otherTraders = useMemo(() => traders.filter((t) => t.account_id !== me?.account?.id), [traders, me]);

  async function load() {
    const [meRes, leaderboardRes] = await Promise.all([fetch("/api/me", { cache: "no-store" }), fetch("/api/leaderboard", { cache: "no-store" })]);
    const [meJson, leaderboardJson] = await Promise.all([meRes.json(), leaderboardRes.json()]);
    setMe(meJson);
    setTraders(leaderboardJson.entries ?? []);
    if (!selected && (leaderboardJson.entries ?? []).length) {
      setSelected((leaderboardJson.entries ?? []).find((t: Leader) => t.account_id !== meJson.account?.id) ?? null);
    }
    setLoading(false);
  }

  async function loadMessages(accountId = selected?.account_id) {
    if (!accountId) return;
    const res = await fetch(`/api/messages?account_id=${encodeURIComponent(accountId)}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setMessages(json.messages ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadMessages();
    const id = setInterval(() => loadMessages(), 10_000);
    return () => clearInterval(id);
  }, [selected?.account_id]);

  async function sendMessage() {
    if (!selected || !body.trim()) return;
    setStatus("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_account_id: selected.account_id, body }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(json.error ?? "Could not send message");
      return;
    }
    setBody("");
    await loadMessages(selected.account_id);
  }

  async function sendTransfer() {
    if (!selected) return;
    setStatus("");
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_account_id: selected.account_id, amount: Number(amount), note: "Competition paper-cash gift" }),
    });
    const json = await res.json().catch(() => ({}));
    setStatus(res.ok ? `Sent ${formatUSD(Number(amount))} in simulated paper cash.` : json.error ?? "Transfer failed");
    if (res.ok) load();
  }

  async function reportMessage(messageId: string) {
    const res = await fetch("/api/social/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: messageId, reason: "Reported from conversation" }),
    });
    setStatus(res.ok ? "Message reported for admin review." : "Could not report message.");
  }

  async function blockUser() {
    if (!selected) return;
    const res = await fetch("/api/social/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: selected.account_id }),
    });
    setStatus(res.ok ? `${selected.display_name} is blocked.` : "Could not block user.");
  }

  if (loading) return <div className="flex py-24 justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>;

  return (
    <div className="animate-fade-in grid min-h-[calc(100vh-4rem)] gap-5 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
      <aside className="card overflow-hidden">
        <div className="border-b border-bg-border p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            <MessageCircle className="h-3.5 w-3.5 text-accent-green" />
            Social desk
          </div>
          <h1 className="mt-2 text-2xl font-black">Messages</h1>
          <p className="mt-2 text-sm text-gray-500">Direct chat for competition talk. Reports go to admins.</p>
        </div>
        <div className="divide-y divide-bg-border">
          {otherTraders.map((trader) => (
            <button
              key={trader.account_id}
              onClick={() => setSelected(trader)}
              className={cn("w-full p-4 text-left transition-colors hover:bg-white/[0.04]", selected?.account_id === trader.account_id && "bg-accent-green/10")}
            >
              <div className="font-semibold">{trader.display_name}</div>
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>{formatUSD(Number(trader.equity))}</span>
                <span className={trader.return_pct >= 0 ? "text-accent-green" : "text-accent-red"}>{trader.return_pct.toFixed(2)}%</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="card flex min-h-[640px] flex-col overflow-hidden">
        <div className="border-b border-bg-border p-5">
          <h2 className="text-xl font-black">{selected?.display_name ?? "Pick a trader"}</h2>
          <p className="mt-1 text-sm text-gray-500">Keep it school-safe. You can block or report any message.</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">No messages yet.</div>
          ) : (
            messages.map((message) => {
              const own = message.sender_account_id === me?.account?.id;
              return (
                <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[78%] rounded-lg px-4 py-3", own ? "bg-accent-green text-black" : "bg-bg-elevated text-white")}>
                    <div className="text-sm font-medium">{message.body}</div>
                    <div className={cn("mt-1 flex items-center gap-2 text-[11px]", own ? "text-black/60" : "text-gray-500")}>
                      <span>{timeAgo(message.created_at)}</span>
                      {!own && <button onClick={() => reportMessage(message.id)} className="inline-flex items-center gap-1 hover:text-accent-red"><Flag className="h-3 w-3" /> Report</button>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="border-t border-bg-border p-4">
          {status && <div className="mb-3 rounded-md bg-bg-elevated px-3 py-2 text-sm text-gray-300">{status}</div>}
          <div className="flex gap-3">
            <input className="input" placeholder="Message this trader..." value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} />
            <button onClick={sendMessage} disabled={!selected || !body.trim()} className="btn-buy px-4"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <div className="card p-5">
          <h2 className="font-semibold">Paper-cash gift</h2>
          <p className="mt-2 text-sm text-gray-500">This is simulated competition cash only. It is not real money.</p>
          <input className="input mt-4 font-mono" type="number" min="1" max="5000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button onClick={sendTransfer} disabled={!selected} className="btn-buy mt-3 w-full">Send simulated cash</button>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Safety</h2>
          <p className="mt-2 text-sm text-gray-500">Blocking prevents messages and paper-cash transfers between both accounts.</p>
          <button onClick={blockUser} disabled={!selected} className="btn-ghost mt-4 w-full border border-bg-border text-accent-red">
            <Ban className="h-4 w-4" /> Block trader
          </button>
        </div>
      </aside>
    </div>
  );
}
