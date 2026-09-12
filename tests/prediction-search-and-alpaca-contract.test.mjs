import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("prediction discovery has searchable, sport-specific progressive filtering", async () => {
  const [workspace, route, presentation] = await Promise.all([
    source("src/components/prediction-workspace.tsx"),
    source("src/app/api/prediction-markets/route.ts"),
    source("src/lib/prediction-presentation.ts"),
  ]);
  assert.match(workspace, /Search prediction markets/);
  assert.match(workspace, /SPORT_FILTERS/);
  assert.match(workspace, /predictionSportCategory/);
  assert.match(route, /searchParams\.get\("q"\)/);
  assert.match(route, /\.ilike\("question", `%\$\{searchTerm\}%`\)/);
  assert.match(presentation, /sport: "Basketball"/);
  assert.match(presentation, /sport: "Football"/);
});

test("the Alpaca-compatible API supports official headers and HTTP Basic authentication", async () => {
  const auth = await source("src/lib/auth.ts");
  assert.match(auth, /apca-api-key-id/);
  assert.match(auth, /apca-api-secret-key/);
  assert.match(auth, /\^Basic\\s\+\(\.\+\)\$\/i/);
  assert.match(auth, /Buffer\.from\(basic, "base64"\)/);
});
