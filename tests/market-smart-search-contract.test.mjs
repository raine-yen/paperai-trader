import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pagePath = new URL("../src/app/(app)/market/page.tsx", import.meta.url);

async function source() {
  return readFile(pagePath, "utf8");
}

test("market search uses the instrument search endpoint without uppercasing names", async () => {
  const page = await source();
  assert.match(page, /\/api\/instruments\/search\?q=\$\{encodeURIComponent\(query\)\}&limit=8/);
  assert.ok(page.includes("onChange={(e) => setSearchQuery(e.target.value)}"));
  assert.match(page, /const query = searchQuery\.trim\(\);/);
});

test("market search exposes accessible result metadata and keyboard navigation", async () => {
  const page = await source();
  assert.match(page, /role="combobox"/);
  assert.match(page, /role="listbox"/);
  assert.match(page, /role="option"/);
  assert.match(page, /onKeyDown=\{handleSearchKeyDown\}/);
  assert.match(page, /aria-activedescendant/);
  assert.match(page, /result\.assetClass/);
  assert.match(page, /result\.tradable/);
  assert.match(page, /searchHasSearched/);
});

test("choosing a result opens its canonical tradable symbol", async () => {
  const page = await source();
  assert.match(page, /onClick=\{\(\) => openInstrument\(result\)\}/);
  assert.match(page, /openSymbol\(instrument\.symbol\)/);
});
