import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(2).max(40),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.display_name },
    },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "signup failed" }, { status: 400 });
  }

  // Create the user's account in the default competition
  const admin = supabaseAdmin();
  const { data: comp } = await admin
    .from("competitions")
    .select("id, starting_cash")
    .eq("is_default", true)
    .maybeSingle();

  if (comp) {
    await admin.from("accounts").insert({
      user_id: data.user.id,
      competition_id: comp.id,
      display_name: parsed.data.display_name,
      cash: Number(comp.starting_cash),
      starting_cash: Number(comp.starting_cash),
      equity: Number(comp.starting_cash),
    });
  }

  return NextResponse.json({ ok: true, user_id: data.user.id });
}
