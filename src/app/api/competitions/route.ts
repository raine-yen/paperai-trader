import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("competitions")
    .select("id, name, description, starting_cash, start_date, end_date, status, is_default, created_at")
    .order("start_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ competitions: data ?? [] });
}

export const dynamic = "force-dynamic";
