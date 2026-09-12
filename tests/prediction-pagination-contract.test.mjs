import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("prediction discovery paginates popular markets and loads the next page near the list end", async () => {
  const [workspace, route] = await Promise.all([
    source("src/components/prediction-workspace.tsx"),
    source("src/app/api/prediction-markets/route.ts"),
  ]);

  assert.match(route, /const DEFAULT_LIST_LIMIT = 50/);
  assert.match(route, /\.order\("volume_24h", \{ ascending: false \}\)[\s\S]*?\.range\(listOffset, listOffset \+ listLimit\)/);
  assert.match(route, /hasMore/);
  assert.match(route, /nextOffset/);
  assert.match(workspace, /new IntersectionObserver/);
  assert.match(workspace, /Loading more markets/);
  assert.match(workspace, /\["Esports", "Sports"/);
});
