import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  })
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("missing env", { hasUrl: !!url, hasKey: !!key });
  process.exit(1);
}
const db = createClient(url, key);
for (const t of ["prediction_markets", "prediction_positions", "prediction_fills"]) {
  const { error, count } = await db.from(t).select("*", { count: "exact" });
  console.log(t, error ? `ERROR: ${error.message}` : `OK count=${count}`);
}
