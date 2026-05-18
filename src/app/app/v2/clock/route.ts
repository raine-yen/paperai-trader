import { NextResponse } from "next/server";

// Returns NYSE-style market clock.
// Simulator is always "open" so that orders can fill regardless of real market hours —
// students often code outside school hours. For realism flip is_open to NYSE check below.
export async function GET() {
  const now = new Date();
  // Simple NYSE schedule (Mon–Fri 9:30–16:00 ET)
  const nyHour = Number(now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
  const nyMin = Number(now.toLocaleString("en-US", { timeZone: "America/New_York", minute: "numeric" }));
  const nyDay = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).getDay();
  const isWeekday = nyDay >= 1 && nyDay <= 5;
  const minutes = nyHour * 60 + nyMin;
  const realIsOpen = isWeekday && minutes >= 9 * 60 + 30 && minutes < 16 * 60;

  return NextResponse.json({
    timestamp: now.toISOString(),
    is_open: true, // simulator is always open
    next_open: now.toISOString(),
    next_close: now.toISOString(),
    real_market_open: realIsOpen,
  });
}

export const dynamic = "force-dynamic";
