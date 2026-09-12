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

/** A brief Face ID-inspired scan that resolves into a confirmation check. */
export function FaceIdSuccessMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("face-id-success", className)} aria-hidden="true">
      <g className="face-id-frame" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M8 18v-5a5 5 0 0 1 5-5h5" />
        <path d="M30 8h5a5 5 0 0 1 5 5v5" />
        <path d="M40 30v5a5 5 0 0 1-5 5h-5" />
        <path d="M18 40h-5a5 5 0 0 1-5-5v-5" />
      </g>
      <path className="face-id-scan" d="M13 24h22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path className="face-id-check" d="M15.5 24.5 21.5 30 33 17.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Restrained purchase flow: after an order is accepted the success state
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
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStage("done");
      return;
    }
    timers.current.push(window.setTimeout(() => setStage("done"), 700));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (stage === "done") closeRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  const isBuy = receipt.side === "buy";
  const successTone = receipt.ok ? "rgb(var(--color-green))" : "rgb(var(--color-red))";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-receipt-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm order-overlay sm:items-center"
      onClick={onDismiss}
    >
      <div
        className={cn("order-sheet w-full max-w-md border border-bg-border bg-black p-6 text-center", stage === "done" && "is-done")}
        onClick={(e) => e.stopPropagation()}
      >
        {stage === "processing" ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-accent-green" aria-hidden />
            <p className="text-sm font-semibold text-gray-300">Submitting your {isBuy ? "buy" : "sell"} order…</p>
          </div>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center border border-accent-green/40 bg-black">
              <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
                <circle cx="20" cy="20" r="17" className="order-check-ring" fill="none" strokeWidth="2" stroke={successTone} />
                {receipt.ok ? (
                  <path d="M12.5 20.5 L18 26 L28 15" className="order-check-path" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" stroke={successTone} />
                ) : (
                  <path d="M14 14 L26 26 M26 14 L14 26" className="order-check-path" fill="none" strokeWidth="3" strokeLinecap="round" stroke="rgb(var(--color-red))" />
                )}
              </svg>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Simulated order</p>
            <h2 id="order-receipt-title" className="mt-1 text-2xl font-black tracking-tight">{receipt.title}</h2>
            <p className="mt-2 text-sm text-gray-400" aria-live="polite">{receipt.detail}</p>

            <dl className="mt-5 space-y-2 border-y border-bg-border/70 py-4 text-left text-sm">
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
              <button ref={closeRef} type="button" onClick={onDismiss} className={cn("btn w-full", !onOpenOrders && "col-span-2", "border border-bg-border text-gray-200 hover:bg-bg-elevated")}>
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
