import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, isMissingTableError } from "@/lib/app-data";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  const ctx = await getCurrentAccount(req);
  if ("response" in ctx) return ctx.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "avatar file required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "avatar must be jpeg, png, or webp" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "avatar must be under 4MB" }, { status: 400 });
  }

  await ctx.db.storage.createBucket("avatars", { public: true }).catch(() => null);

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${ctx.account.id}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await ctx.db.storage
    .from("avatars")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = ctx.db.storage.from("avatars").getPublicUrl(path);
  const avatar_url = publicUrl.publicUrl;

  const { data, error } = await ctx.db
    .from("trader_profiles")
    .upsert({
      account_id: ctx.account.id,
      avatar_url,
      is_public: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: isMissingTableError(error) ? 501 : 500 });
  }

  return NextResponse.json({ profile: data, avatar_url });
}

export const dynamic = "force-dynamic";
