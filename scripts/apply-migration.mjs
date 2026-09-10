#!/usr/bin/env node
// Apply a supabase/*.sql migration to the hosted project via the Supabase
// Management API. Requires SUPABASE_ACCESS_TOKEN (a personal access token from
// https://supabase.com/dashboard/account/tokens) — never stored in the repo.
//
//   SUPABASE_ACCESS_TOKEN=*** node scripts/apply-migration.mjs supabase/20260909_predictions.sql
//
// Safe to re-run: every migration in this repo is written idempotent
// (create table if not exists / create policy if not exists guards).
import fs from "node:fs";

const file = process.argv[2];
const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "fwlbickoywztcikyhvbj";

if (!file) {
  console.error("usage: SUPABASE_ACCESS_TOKEN=*** node scripts/apply-migration.mjs <path.sql>");
  process.exit(2);
}
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN is not set. Create one at https://supabase.com/dashboard/account/tokens");
  process.exit(2);
}

const sql = fs.readFileSync(file, "utf8");

// Split on statement-terminating semicolons outside of quotes/dollar-blocks.
function splitStatements(text) {
  const out = [];
  let buf = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "-" && text[i + 1] === "-") {
      // line comment
      const nl = text.indexOf("\n", i);
      i = nl === -1 ? text.length : nl + 1;
      continue;
    }
    if (c === "'" || c === '"') {
      const quote = c;
      buf += c; i++;
      while (i < text.length) {
        buf += text[i];
        if (text[i] === "\\" && quote === "'") { buf += text[i + 1] ?? ""; i += 2; continue; }
        if (text[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === "$") {
      const tag = text.slice(i).match(/^\$[A-Za-z0-9_]*\$/)?.[0];
      if (tag) {
        const end = text.indexOf(tag, i + tag.length);
        const block = text.slice(i, end === -1 ? text.length : end + tag.length);
        buf += block; i += block.length; continue;
      }
    }
    if (c === ";") {
      if (buf.trim()) out.push(buf.trim());
      buf = ""; i++; continue;
    }
    buf += c; i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const statements = splitStatements(sql);
console.log(`${file}: ${statements.length} statement(s)`);

let failures = 0;
for (const [idx, stmt] of statements.entries()) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: stmt }),
  });
  const text = await res.text();
  if (!res.ok) {
    failures++;
    console.error(`  ✗ [${idx + 1}/${statements.length}] HTTP ${res.status}: ${text.slice(0, 300)}`);
    console.error(`    ${stmt.slice(0, 120).replace(/\s+/g, " ")}`);
    break; // stop on first failure; fix and re-run (migrations are idempotent)
  } else {
    console.log(`  ✓ [${idx + 1}/${statements.length}] ${stmt.split("\n")[0].slice(0, 80)}`);
  }
}

if (failures) { console.error("FAILED"); process.exit(1); }
console.log("APPLIED OK");
