// Task 14 security-hardening contract tests. Each asserts the specific fix
// from the plan by inspecting route source (fast, no live DB needed) plus
// pure-logic checks where the fix is a data-shape change.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("fix 1: /api/trader/[accountId] gates holdings/orders/snapshots behind is_public", async () => {
  const route = await source("src/app/api/trader/[accountId]/route.ts");
  assert.match(route, /const isPublic = \(profile as \{ is_public\?: boolean \} \| null\)\?\.is_public !== false;/);
  assert.match(route, /if \(!isPublic\) \{/);
  // Private branch must return empty positions/orders/snapshots, never the account's cash/equity breakdown.
  const privateBranch = route.slice(route.indexOf("if (!isPublic) {"), route.indexOf("return NextResponse.json({\r\n    account: { ...account, equity"));
  assert.match(privateBranch, /positions: \[\]/);
  assert.match(privateBranch, /orders: \[\]/);
  assert.match(privateBranch, /snapshots: \[\]/);
  assert.doesNotMatch(privateBranch, /account\.cash/);
});

test("fix 2: avatar upload never force-sets is_public", async () => {
  const route = await source("src/app/api/profile/avatar/route.ts");
  assert.doesNotMatch(route, /is_public:\s*true/);
});

test("fix 3: GET /api/messages has no read-marking side effect; PATCH does it explicitly", async () => {
  const route = await source("src/app/api/messages/route.ts");
  const getBody = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function PATCH"));
  assert.doesNotMatch(getBody, /\.update\(\{ read_at/);
  assert.match(route, /export async function PATCH/);
  const patchBody = route.slice(route.indexOf("export async function PATCH"), route.indexOf("export async function POST"));
  assert.match(patchBody, /\.update\(\{ read_at: new Date\(\)\.toISOString\(\) \}\)/);
  assert.match(patchBody, /\.eq\("recipient_account_id", ctx\.account\.id\)/);
});

test("fix 3b: the messages page marks read via an explicit PATCH, not inside the poll", async () => {
  const page = await source("src/app/(app)/messages/page.tsx");
  assert.match(page, /method: "PATCH"/);
  assert.match(page, /fetch\("\/api\/messages", \{/);
});

test("fix 4: getCurrentAccount filters status='active' and returns 403 when none", async () => {
  const lib = await source("src/lib/app-data.ts");
  assert.match(lib, /\.eq\("status", "active"\)/);
  assert.match(lib, /status: 403/);
});
