import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseForRequest } from "@/lib/supabase/request";

export async function getSessionUser(req?: NextRequest) {
  const token = req?.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token) {
    const sb = await supabaseForRequest(req);
    const { data } = await sb.auth.getUser(token);
    return data.user ?? null;
  }

  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
