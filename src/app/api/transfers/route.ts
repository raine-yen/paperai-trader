import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAccount, isMissingTableError } from "@/lib/app-data";

const transferSchema = z.object({
  recipient_account_id: z.string().uuid(),
  amount: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  note: z.string().max(160).optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await getCurrentAccount(req);
  if ("response" in ctx) return ctx.response;

  const { data, error } = await ctx.db
    .from("paper_transfers")
    .select("*")
    .or(`sender_account_id.eq.${ctx.account.id},recipient_account_id.eq.${ctx.account.id}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingTableError(error)) return NextResponse.json({ transfers: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ transfers: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getCurrentAccount(req);
  if ("response" in ctx) return ctx.response;

  const parsed = transferSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });

  const amount = Math.round(parsed.data.amount * 100) / 100;
  if (amount <= 0 || amount > 5000) return NextResponse.json({ error: "amount must be between $0.01 and $5,000" }, { status: 400 });
  if (parsed.data.recipient_account_id === ctx.account.id) return NextResponse.json({ error: "cannot transfer to yourself" }, { status: 400 });
  if (Number(ctx.account.cash) < amount) return NextResponse.json({ error: "not enough paper cash" }, { status: 422 });

  const { data: recipient, error: recipientError } = await ctx.db
    .from("accounts")
    .select("id, cash, status")
    .eq("id", parsed.data.recipient_account_id)
    .eq("competition_id", ctx.account.competition_id)
    .maybeSingle();
  if (recipientError) return NextResponse.json({ error: recipientError.message }, { status: 500 });
  if (!recipient || recipient.status !== "active") return NextResponse.json({ error: "recipient not found in this competition" }, { status: 404 });

  const { data: blocked, error: blockError } = await ctx.db
    .from("blocked_users")
    .select("id")
    .or(
      `and(blocker_account_id.eq.${ctx.account.id},blocked_account_id.eq.${recipient.id}),and(blocker_account_id.eq.${recipient.id},blocked_account_id.eq.${ctx.account.id})`
    )
    .limit(1);
  if (blockError && !isMissingTableError(blockError)) return NextResponse.json({ error: blockError.message }, { status: 500 });
  if ((blocked ?? []).length > 0) return NextResponse.json({ error: "transfers are blocked between these users" }, { status: 403 });

  const senderCash = Number(ctx.account.cash) - amount;
  const recipientCash = Number(recipient.cash) + amount;
  const [{ error: senderError }, { error: receiverError }] = await Promise.all([
    ctx.db.from("accounts").update({ cash: senderCash }).eq("id", ctx.account.id),
    ctx.db.from("accounts").update({ cash: recipientCash }).eq("id", recipient.id),
  ]);
  if (senderError || receiverError) {
    return NextResponse.json({ error: senderError?.message ?? receiverError?.message ?? "transfer failed" }, { status: 500 });
  }

  const { data, error } = await ctx.db
    .from("paper_transfers")
    .insert({
      sender_account_id: ctx.account.id,
      recipient_account_id: recipient.id,
      amount,
      note: parsed.data.note?.trim() || null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: isMissingTableError(error) ? 501 : 500 });
  return NextResponse.json({ transfer: data, sender_cash: senderCash, recipient_cash: recipientCash });
}

export const dynamic = "force-dynamic";
