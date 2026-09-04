"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock3, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderReceipt = {
  ok: boolean;
  title: string;
  detail: string;
  status: "filled" | "submitted" | "scheduled" | "rejected";
  side: "buy" | "sell";
  symbol: string;
  amount: string;
};

/**
 * Robinhood-style purchase flow: after an order is accepted the success state
 * resolves with a check-mark draw, a short "processing" dwell, and the receipt
 * panel sliding up into place. Purely presentational — the caller owns the API
 * call and only mounts this after a verified successful response.
 */
export function OrderSuccessOverlay({
  receipt,
  onDismiss,
  onOpenOrders,
}: {
  receipt: OrderReceipt;
  onDismiss: () => void;
  onOpenOrders?: () => void;
}) {
  const [stage, setStage] = useState<"processing" | "done">("processing");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStage("done");
      return;
    }
    timers.current.push(window.setTimeout(() => setStage("done"), 700));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const bullish = receipt.side === "buy";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center order-overlay"
      onClick={onDismiss}
    >
      <div
        className={cn("order-sheet card w-full max-w-md p-6 text-center", stage === "done" && "is-done")}
        onClick={(e) => e.stopPropagation()}
      >
        {stage === "processing" ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-accent-green" aria-hidden />
            <p className="text-sm font-semibold text-gray-300">Submitting your {bullish ? "buy" : "sell"} order…</p>
          </div>
        ) : (
          <>
            <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-full", bullish ? "bg-accent-green/15" : "bg-accent-red/15")}>
              <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
                <circle cx="20" cy="20" r="17" className="order-check-ring" fill="none" strokeWidth="2" stroke={bullish ? "rgb(var(--color-green))" : "rgb(var(--color-red))"} />
                {receipt.ok ? (
                  <path d="M12.5 20.5 L18 26 L28 15" className="order-check-path" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" stroke={bullish ? "rgb(var(--color-green))" : "rgb(var(--color-red))"} />
                ) : (
                  <path d="M14 14 L26 26 M26 14 L14 26" className="order-check-path" fill="none" strokeWidth="3" strokeLinecap="round" stroke="rgb(var(--color-red))" />
                )}
              </svg>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Simulated order</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">{receipt.title}</h2>
            <p className="mt-2 text-sm text-gray-400">{receipt.detail}</p>

            <dl className="mt-5 space-y-2 rounded-lg border border-bg-border/70 bg-bg-elevated/60 p-4 text-left text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Order</dt>
                <dd className="font-semibold tabular-nums text-gray-50">
                  {receipt.side === "buy" ? "Buy" : "Sell"} {receipt.amount} {receipt.symbol}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Status</dt>
                <dd className={cn("inline-flex items-center gap-1.5 font-semibold", receipt.status === "filled" ? "text-accent-green" : receipt.status === "rejected" ? "text-accent-red" : "text-accent-yellow")}>
                  {receipt.status === "filled" ? <Check className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                  <span className="capitalize">{receipt.status}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Account</dt>
                <dd className="font-medium text-gray-300">Paper trading — no real money</dd>
              </div>
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {onOpenOrders && (
                <button type="button" onClick={onOpenOrders} className="btn btn-primary w-full">
                  View orders
                </button>
              )}
              <button type="button" onClick={onDismiss} className={cn("btn w-full", !onOpenOrders && "col-span-2", "border border-bg-border text-gray-200 hover:bg-bg-elevated")}>
                <X className="h-4 w-4" aria-hidden />
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
