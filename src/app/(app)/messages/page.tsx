"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  const [status, setStatus] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const otherTraders = useMemo(() => traders.filter((trader) => trader.account_id !== me?.account?.id), [traders, me?.account?.id]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadError("");
      try {
        const [meRes, leaderboardRes, blocksRes] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/leaderboard", { cache: "no-store" }),
          fetch("/api/social/block", { cache: "no-store" }),
        ]);
        const [meJson, leaderboardJson, blocksJson] = await Promise.all([
          meRes.json().catch(() => ({})),
          leaderboardRes.json().catch(() => ({})),
          blocksRes.json().catch(() => ({})),
        ]);
        if (!meRes.ok || !leaderboardRes.ok || !blocksRes.ok) {
          throw new Error(meJson.error ?? leaderboardJson.error ?? blocksJson.error ?? "Could not load conversations");
        }
        if (!active) return;
        const blockedIds = new Set<string>(blocksJson.account_ids ?? []);
        const nextTraders = ((leaderboardJson.entries ?? []) as Leader[]).filter((trader) => !blockedIds.has(trader.account_id));
        setMe(meJson);
        setTraders(nextTraders);
        setSelected((current) => current ?? nextTraders.find((trader) => trader.account_id !== meJson.account?.id) ?? null);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load conversations");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const accountId = selected?.account_id;
    if (!accountId) {
      setMessages([]);
      return;
    }
    const conversationAccountId = accountId;

    let active = true;
    async function refresh(showLoading = false) {
      if (showLoading) setMessagesLoading(true);
      try {
        const response = await fetch(`/api/messages?account_id=${encodeURIComponent(conversationAccountId)}`, { cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error ?? "Could not load this conversation");
        if (active) {
          setMessages(json.messages ?? []);
          setLoadError("");
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load this conversation");
      } finally {
        if (active && showLoading) setMessagesLoading(false);
      }
    }

    void refresh(true);
    // Marking read is an explicit action tied to opening the conversation,
    // not a side effect of every poll — the server's GET is read-only.
    void fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: conversationAccountId }),
    }).catch(() => {});
    const intervalId = window.setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [selected?.account_id]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!selected || !text || sending) return;
    setSending(true);
    setStatus("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_account_id: selected.account_id, body: text }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Could not send message");
      setBody("");
      setMessages((current) => [...current, json.message]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  async function reportMessage(messageId: string) {
    const response = await fetch("/api/social/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: messageId, reason: "Reported from conversation" }),
    });
    const json = await response.json().catch(() => ({}));
    setStatus(response.ok ? "Message reported for admin review." : json.error ?? "Could not report message.");
  }

  async function blockUser() {
    if (!selected) return;
    const blocked = selected;
    const response = await fetch("/api/social/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: blocked.account_id }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(json.error ?? "Could not block user.");
      return;
    }
    setTraders((current) => current.filter((trader) => trader.account_id !== blocked.account_id));
    setSelected(null);
    setMessages([]);
    setStatus(`${blocked.display_name} is blocked.`);
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-gray-500" aria-label="Loading conversations" /></div>;

  return (
    <div className="animate-fade-in grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
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
          {otherTraders.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No other traders are available in this competition yet.</p>
          ) : otherTraders.map((trader) => (
            <button
              type="button"
              key={trader.account_id}
              onClick={() => { setSelected(trader); setStatus(""); }}
              className={cn("w-full p-4 text-left transition-colors hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-green", selected?.account_id === trader.account_id && "bg-accent-green/10")}
              aria-pressed={selected?.account_id === trader.account_id}
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

      <section className="card flex h-[520px] min-h-[420px] resize-y flex-col overflow-hidden" aria-label="Direct message conversation">
        <div className="border-b border-bg-border p-5">
          <h2 className="text-xl font-black">{selected?.display_name ?? "Pick a trader"}</h2>
          <p className="mt-1 text-sm text-gray-500">Keep it school-safe. You can block or report any message.</p>
        </div>
        {loadError ? <div role="alert" className="border-b border-bg-border bg-accent-red/10 px-5 py-3 text-sm font-semibold text-accent-red">{loadError}</div> : null}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
          {messagesLoading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-500" aria-label="Loading messages" /></div>
          ) : !selected ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">Select a trader to start a conversation.</div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">No messages yet. Say hello.</div>
          ) : messages.map((message) => {
            const own = message.sender_account_id === me?.account?.id;
            return (
              <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[78%] rounded-lg px-4 py-3", own ? "bg-accent-green text-black" : "bg-bg-elevated text-gray-50")}>
                  <div className="whitespace-pre-wrap break-words text-sm font-medium">{message.body}</div>
                  <div className={cn("mt-1 flex items-center gap-2 text-[11px]", own ? "text-black/60" : "text-gray-500")}>
                    <span>{timeAgo(message.created_at)}</span>
                    {!own ? <button type="button" onClick={() => reportMessage(message.id)} className="inline-flex items-center gap-1 hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"><Flag className="h-3 w-3" /> Report</button> : null}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={conversationEndRef} />
        </div>
        <form onSubmit={sendMessage} className="sticky bottom-0 border-t border-bg-border bg-bg-card p-4">
          {status ? <div role="status" className="mb-3 rounded-md bg-bg-elevated px-3 py-2 text-sm text-gray-300">{status}</div> : null}
          <div className="flex gap-3">
            <label htmlFor="message-body" className="sr-only">Message</label>
            <input id="message-body" className="input" placeholder={selected ? `Message ${selected.display_name}...` : "Select a trader first"} value={body} onChange={(event) => setBody(event.target.value)} maxLength={500} disabled={!selected || sending} autoComplete="off" />
            <button type="submit" disabled={!selected || !body.trim() || sending} className="btn-buy px-4" aria-label="Send message">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </section>

      <aside className="space-y-5">
        <div className="card p-5">
          <h2 className="font-semibold">Competition context</h2>
          <p className="mt-2 text-sm text-gray-500">Use messages to ask about strategy, watchlist ideas, and classroom league progress. No real-money transfers, deposits, withdrawals, payouts, or cash-out mechanics are supported.</p>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Safety</h2>
          <p className="mt-2 text-sm text-gray-500">Blocking prevents messages between both accounts. Reports are visible to admins for moderation.</p>
          <button type="button" onClick={blockUser} disabled={!selected} className="btn-ghost mt-4 w-full border border-bg-border text-accent-red">
            <Ban className="h-4 w-4" /> Block trader
          </button>
        </div>
      </aside>
    </div>
  );
}
