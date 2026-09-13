import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { error } = await db.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message || "could not delete account" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
