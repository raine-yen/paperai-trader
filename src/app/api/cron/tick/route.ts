import { NextRequest, NextResponse } from "next/server";
import { tick } from "@/lib/engine";

// Called by Vercel Cron every minute. Can also be hit manually for testing.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  // Vercel Cron sends authorization header automatically when CRON_SECRET is set.
  // Allow unauthenticated calls in dev (when no secret is configured) for easy local testing.
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await tick();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("tick failed", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
