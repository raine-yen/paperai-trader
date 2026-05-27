import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, isMissingTableError } from "@/lib/app-data";

export async function POST(req: NextRequest) {
  const ctx = await getCurrentAccount(req);
  if ("response" in ctx) return ctx.response;
  const body = await req.json().catch(() => ({}));
  const target = String(body.account_id ?? "");
  if (!target || target === ctx.account.id) return NextResponse.json({ error: "valid account_id required" }, { status: 400 });

  const { error } = await ctx.db
    .from("blocked_users")
    .upsert({ blocker_account_id: ctx.account.id, blocked_account_id: target }, { onConflict: "blocker_account_id,blocked_account_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: isMissingTableError(error) ? 501 : 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getCurrentAccount(req);
  if ("response" in ctx) return ctx.response;
  const target = new URL(req.url).searchParams.get("account_id");
  if (!target) return NextResponse.json({ error: "account_id required" }, { status: 400 });

  const { error } = await ctx.db
    .from("blocked_users")
    .delete()
    .eq("blocker_account_id", ctx.account.id)
    .eq("blocked_account_id", target);
  if (error) return NextResponse.json({ error: error.message }, { status: isMissingTableError(error) ? 501 : 500 });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
