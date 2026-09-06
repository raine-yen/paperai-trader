import { NextResponse } from "next/server";

/** Provider-independent NYSE session clock for display/API consumers.
 * Trade simulation remains available outside the session, but this endpoint
 * never calls a closed exchange open. */
export async function GET() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = value("weekday");
  const minutes = Number(value("hour")) * 60 + Number(value("minute"));
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  // Holiday closures require a provider calendar; consumers should treat this
  // as an indicative schedule and rely on quote.marketState for final status.
  const isOpen = isWeekday && minutes >= 9 * 60 + 30 && minutes < 16 * 60;
  const nextTransition = new Date(now.getTime() + 60_000).toISOString();
  return NextResponse.json({
    timestamp: now.toISOString(), is_open: isOpen, real_market_open: isOpen,
    next_open: nextTransition, next_close: nextTransition,
    note: "Indicative NYSE schedule; quote endpoints provide authoritative provider marketState.",
  });
}
export const dynamic = "force-dynamic";
