// Regression contract: a unified-search prediction opens Vanta's authenticated
// paper prediction workspace, never an external market page.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const marketPage = fs.readFileSync(new URL("../src/app/(app)/market/page.tsx", import.meta.url), "utf8");
const predictionWorkspace = fs.readFileSync(new URL("../src/components/prediction-workspace.tsx", import.meta.url), "utf8");

test("prediction search click routes into the first-party paper ticket", () => {
  assert.match(marketPage, /\/predictions\?marketId=\$\{encodeURIComponent\(result\.marketId\)/);
  assert.doesNotMatch(marketPage, /window\.open\(url/);
  assert.match(predictionWorkspace, /searchParams\.get\("marketId"\)/);
});
