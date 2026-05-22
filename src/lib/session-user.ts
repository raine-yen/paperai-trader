import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getSessionUser(req?: NextRequest) {
  const token = req?.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token) {
    const { data } = await supabaseAdmin().auth.getUser(token);
    return data.user ?? null;
  }

  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
