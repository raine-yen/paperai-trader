import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateKeyPair, hashSecret } from "@/lib/api-keys";
import { getSessionUser } from "@/lib/session-user";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("api_keys")
    .select("id, key_id, label, last_used_at, revoked_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}

const createSchema = z.object({ label: z.string().max(80).optional() });

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: account } = await db
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "no account found for user" }, { status: 400 });
  }

  const { keyId, secret } = generateKeyPair();
  const { error } = await db.from("api_keys").insert({
    user_id: user.id,
    account_id: account.id,
    key_id: keyId,
    secret_hash: hashSecret(secret),
    label: parsed.data.label ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return the secret ONCE — it cannot be recovered later
  return NextResponse.json({ key_id: keyId, secret });
}
