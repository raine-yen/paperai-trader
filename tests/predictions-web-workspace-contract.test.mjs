import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("Predictions is a first-class in-app workspace with a real paper trade and close path", async () => {
  const [nav, page, workspace] = await Promise.all([
    source("src/components/nav.tsx"),
    source("src/app/(app)/predictions/page.tsx"),
    source("src/components/prediction-workspace.tsx"),
  ]);

  assert.match(nav, /href: "\/predictions"/, "Predictions must be a primary destination");
  assert.match(page, /PredictionWorkspace/, "The route must render the dedicated workspace");

  // The UI exposes the outcome contract, not a stock-like generic ticket.
  assert.match(workspace, /Buy Yes/);
  assert.match(workspace, /Buy No/);
  assert.match(workspace, /Payout if correct/);
  assert.match(workspace, /Potential profit/);
  assert.match(workspace, /\/api\/prediction-markets/);
  assert.match(workspace, /\/api\/prediction-markets\/\$\{[^}]+\}\/history/);

  // Side selectors configure; one clearly named final action submits the live API.
  assert.match(workspace, /\/api\/predictions\/trade/);
  assert.match(workspace, /client_order_id/);
  assert.match(workspace, /Review buy/);
  assert.match(workspace, /Place paper buy/);

  // Early close follows the approved partial-or-Max paper trading model.
  assert.match(workspace, /\/api\/predictions\/close/);
  assert.match(workspace, /close_all/);
  assert.match(workspace, />Max</);
  assert.match(workspace, /Review sell/);
});

test("the app shell keeps the five-destination Vanta navigation visible on phones", async () => {
  const [nav, css] = await Promise.all([
    source("src/components/nav.tsx"),
    source("src/app/globals.css"),
  ]);

  assert.match(nav, /vanta-mobile-topbar/);
  assert.match(nav, /vanta-mobile-bottom/);
  assert.match(nav, /Mobile navigation/);
  assert.match(nav, /label: "Predictions"/);
  assert.doesNotMatch(nav, /vanta-mobile-drawer/);
  assert.match(css, /\.vanta-mobile-bottom/);
  assert.match(css, /padding-bottom:.*5\.5rem/s);
});

test("desktop app pages retain the prototype's paper-account watchlist and order-status rail", async () => {
  const [layout, rail] = await Promise.all([
    source("src/app/(app)/layout.tsx"),
    source("src/components/watchlist-rail.tsx"),
  ]);

  assert.match(layout, /WatchlistRail/);
  assert.match(rail, /\/api\/watchlists/);
  assert.match(rail, /\/api\/quotes/);
  assert.match(rail, /Paper account/);
  assert.match(rail, /Watchlist/);
  assert.match(rail, /Order status/);
});
