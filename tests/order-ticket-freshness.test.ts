import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("web market tickets refresh authoritative account and quote state before review and submit", () => {
  const market = read("src/app/(app)/market/page.tsx");

  assert.match(market, /async function refreshOrderState\(\)/);
  assert.match(market, /await Promise\.all\(\[fetchAccount\(\), fetchQuotes\(\[symbol\], true\)\]\)/);
  assert.match(market, /onReview=\{refreshOrderState\}/);
  assert.equal(market.match(/const fresh = await onReview\(\);/g)?.length, 2);
  assert.match(market, /async function review\(\).*setSubmitting\(true\)/s);
  assert.match(market, /async function submit\(\).*setSubmitting\(true\)/s);
  assert.match(market, /await onTraded\(\)/);
});

test("visible web equities are driven by the shared live feed and real anchors poll every 750ms", () => {
  const market = read("src/app/(app)/market/page.tsx");
  const feed = read("src/lib/live-market.ts");

  assert.match(market, /import \{ getMarketFeed \} from "@\/lib\/live-market"/);
  assert.match(market, /feed\.watch\(visibleSymbols\)/);
  assert.match(market, /feed\.subscribe/);
  assert.match(feed, /export const EQUITY_ANCHOR_MS = 750/);
  assert.match(feed, /}, EQUITY_ANCHOR_MS\)/);
});

test("charts preserve sharp linear geometry across web and Expo", () => {
  const market = read("src/app/(app)/market/page.tsx");
  const equity = read("src/components/equity-chart.tsx");
  const mobile = read("mobile/src/charts.tsx");

  assert.match(market, /<Area type="linear"/);
  assert.doesNotMatch(market, /<Area type="monotone"/);
  assert.match(equity, /type="linear"/);
  assert.match(equity, /stroke=\{isUp \? "#c8ff00"/);
  assert.match(mobile, /curveLinear/);
  assert.match(mobile, /\.curve\(curveLinear\)/);
  assert.match(mobile, /strokeLinejoin="miter" strokeLinecap="square"/);
});

test("mobile refreshes account, position, and selected quote before review and before confirm", () => {
  const app = read("mobile/App.tsx");

  assert.match(app, /async function refreshOrderState\(\)/);
  assert.match(app, /const \[nextMe, nextQuote\] = await Promise\.all\(/);
  assert.match(app, /const fresh = await refreshOrderState\(\);/);
  assert.match(app, /setOrderStageState\("review"\)/);
  assert.match(app, /const fresh = await refreshOrderState\(\);/);
  assert.match(app, /await refreshAll\(false\);/);
});

test("paper-account provisioning never rewrites an existing portfolio", () => {
  const provisioning = read("src/lib/ensure-paper-account.ts");
  const ensureBlock = provisioning.match(/export async function ensurePaperAccount[\s\S]*?\n}\n/)?.[0] ?? "";

  assert.match(ensureBlock, /\.select\("id"\)[\s\S]*\.eq\("user_id", user\.id\)[\s\S]*\.eq\("competition_id", competition\.id\)[\s\S]*\.maybeSingle\(\)/);
  assert.match(ensureBlock, /if \(existing\) return/);
  assert.doesNotMatch(ensureBlock, /\.upsert\(/);
  assert.doesNotMatch(provisioning, /status: "active"/);
});

test("new paper accounts always receive the canonical $10,000 allocation", () => {
  const provisioning = read("src/lib/ensure-paper-account.ts");

  assert.match(provisioning, /const CANONICAL_STARTING_CASH = 10_000/);
  assert.match(provisioning, /cash: CANONICAL_STARTING_CASH/);
  assert.match(provisioning, /starting_cash: CANONICAL_STARTING_CASH/);
  assert.match(provisioning, /equity: CANONICAL_STARTING_CASH/);
});

test("dashboard replaces failed account loading with a recoverable error state", () => {
  const dashboard = read("src/app/(app)/dashboard/page.tsx");

  assert.match(dashboard, /setLoadError/);
  assert.match(dashboard, /if \(!r\.ok\)[\s\S]*setLoadError/);
  assert.match(dashboard, /catch[\s\S]*setLoadError/);
  assert.match(dashboard, /Could not load your paper portfolio/);
  assert.match(dashboard, /Try again/);
});

test("sign in and sign up provision through the authenticated client", () => {
  const provisioning = read("src/lib/ensure-paper-account.ts");
  const login = read("src/app/api/auth/login/route.ts");
  const signup = read("src/app/api/auth/signup/route.ts");
  const me = read("src/app/api/me/route.ts");

  assert.match(provisioning, /ensurePaperAccount\(user: PaperUser, db: SupabaseClient\)/);
  assert.match(login, /await ensurePaperAccount\(data\.user, sb\)/);
  assert.match(signup, /if \(data\.session\)[\s\S]*await ensurePaperAccount\(data\.user, sb\)/);
  assert.doesNotMatch(signup, /supabaseAdmin/);
  assert.doesNotMatch(signup, /from\("accounts"\)\.insert/);
  assert.match(me, /const db = await supabaseForRequest\(req\)/);
  assert.match(me, /await ensurePaperAccount\(user, db\)/);
});
