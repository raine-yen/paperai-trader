import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, isMissingTableError } from "@/lib/app-data";

export async function POST(req: NextRequest) {
  const ctx = await getCurrentAccount(req);
  if ("response" in ctx) return ctx.response;

  const body = await req.json().catch(() => ({}));
  const messageId = String(body.message_id ?? "");
  const reason = String(body.reason ?? "Inappropriate message").trim().slice(0, 240);
  if (!messageId) return NextResponse.json({ error: "message_id required" }, { status: 400 });

  const { data: message, error: messageError } = await ctx.db
    .from("direct_messages")
    .select("id, sender_account_id, recipient_account_id")
    .eq("id", messageId)
    .maybeSingle();
  if (messageError) return NextResponse.json({ error: messageError.message }, { status: isMissingTableError(messageError) ? 501 : 500 });
  if (!message || ![message.sender_account_id, message.recipient_account_id].includes(ctx.account.id)) {
    return NextResponse.json({ error: "message not found" }, { status: 404 });
  }

  const { error } = await ctx.db
    .from("message_reports")
    .insert({ message_id: messageId, reporter_account_id: ctx.account.id, reason });
  if (error) return NextResponse.json({ error: error.message }, { status: isMissingTableError(error) ? 501 : 500 });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
