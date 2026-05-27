import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, isMissingTableError } from "@/lib/app-data";

export async function GET(req: NextRequest) {
  const ctx = await getCurrentAccount(req);
  if ("response" in ctx) return ctx.response;

  const other = new URL(req.url).searchParams.get("account_id");
  let query = ctx.db
    .from("direct_messages")
    .select("id, sender_account_id, recipient_account_id, body, hidden_by_admin, read_at, created_at")
    .or(`sender_account_id.eq.${ctx.account.id},recipient_account_id.eq.${ctx.account.id}`)
    .eq("hidden_by_admin", false)
    .order("created_at", { ascending: false })
    .limit(80);

  if (other) {
    query = query.or(
      `and(sender_account_id.eq.${ctx.account.id},recipient_account_id.eq.${other}),and(sender_account_id.eq.${other},recipient_account_id.eq.${ctx.account.id})`
    );
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return NextResponse.json({ messages: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.length) {
    const unreadIds = data
      .filter((m) => m.recipient_account_id === ctx.account.id && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length) {
      await ctx.db.from("direct_messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    }
  }

  return NextResponse.json({ messages: (data ?? []).reverse() });
}

export async function POST(req: NextRequest) {
  const ctx = await getCurrentAccount(req);
  if ("response" in ctx) return ctx.response;

  const body = await req.json().catch(() => ({}));
  const recipient = String(body.recipient_account_id ?? "");
  const text = String(body.body ?? "").trim();
  if (!recipient || recipient === ctx.account.id) return NextResponse.json({ error: "valid recipient required" }, { status: 400 });
  if (text.length < 1 || text.length > 500) return NextResponse.json({ error: "message must be 1-500 characters" }, { status: 400 });

  const { data: blocked, error: blockError } = await ctx.db
    .from("blocked_users")
    .select("id")
    .or(
      `and(blocker_account_id.eq.${ctx.account.id},blocked_account_id.eq.${recipient}),and(blocker_account_id.eq.${recipient},blocked_account_id.eq.${ctx.account.id})`
    )
    .limit(1);
  if (blockError && !isMissingTableError(blockError)) return NextResponse.json({ error: blockError.message }, { status: 500 });
  if ((blocked ?? []).length > 0) return NextResponse.json({ error: "messaging is blocked between these users" }, { status: 403 });

  const { data, error } = await ctx.db
    .from("direct_messages")
    .insert({ sender_account_id: ctx.account.id, recipient_account_id: recipient, body: text })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: isMissingTableError(error) ? 501 : 500 });
  return NextResponse.json({ message: data });
}

export const dynamic = "force-dynamic";
