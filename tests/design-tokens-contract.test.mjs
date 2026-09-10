import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

// The market-workspace stylesheet (order rail, segments, receipts) is written
// against a set of design tokens. If any are undefined they silently fall back
// to browser defaults — which is what made the stock Buy/Sell buttons render as
// broken white/black controls. Every token USED must be DECLARED.
test("every design token used in the workspace stylesheet is declared", async () => {
  const css = await source("src/app/globals.css");
  const used = new Set([...css.matchAll(/var\((--[a-z-]+)\)/g)].map((m) => m[1]));
  const declared = new Set([...css.matchAll(/^\s*(--[a-z-]+)\s*:/gm)].map((m) => m[1]));
  const missing = [...used].filter((token) => !declared.has(token));
  assert.deepEqual(missing, [], `undefined CSS variables: ${missing.join(", ")}`);
});

test("the neon lime accent is used, never the mint green regression value", async () => {
  const css = await source("src/app/globals.css");
  // Lime accent: 200 255 0 (== #c8ff00). Mint 45 230 157 must not appear anywhere.
  assert.match(css, /--brand-lime:\s*#c8ff00/i);
  assert.doesNotMatch(css, /45 230 157/);
  assert.doesNotMatch(css, /#2de69d/i);
});

test("stock order segmented controls use lime for the active state, not white/black", async () => {
  const css = await source("src/app/globals.css");
  assert.match(css, /\.vanta-segment button\.is-active\s*\{[^}]*var\(--brand-lime\)/);
  assert.doesNotMatch(css, /\.vanta-segment button\.is-active\s*\{\s*background:\s*white/);
});
