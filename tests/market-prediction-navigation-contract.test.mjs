// Regression contract: a prediction returned by unified search may not be in
// the featured-card cache. Its canonical Polymarket URL must be used directly.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../src/app/(app)/market/page.tsx", import.meta.url), "utf8");

test("prediction search click prefers its result URL over the featured-market cache", () => {
  assert.match(
    page,
    /const url = result\.url \?\? predictionMarkets\.find\(\(m\) => m\.id === result\.marketId\)\?\.url;/,
  );
});
