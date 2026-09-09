// Acceptance test for the instrument catalog ranking (run with --experimental-strip-types)
import { searchInstruments, scoreCatalog, CATALOG } from "../src/lib/instrument-catalog.ts";

let failures = 0;
function check(label, cond, detail) {
  if (cond) console.log(`PASS ${label}`);
  else { failures++; console.log(`FAIL ${label} :: ${detail}`); }
}

const top = async (q, opts) => (await searchInstruments(q, opts ?? { limit: 10 }));

// Offline-only ranking checks (pure local scoring, no network):
const apple = CATALOG.map((i) => [i, scoreCatalog(i, "apple")]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
check("apple local top = AAPL", apple[0]?.[0].symbol === "AAPL", JSON.stringify(apple.slice(0, 3).map(([i, s]) => [i.symbol, s])));

const btc = CATALOG.map((i) => [i, scoreCatalog(i, "bitcoin")]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
check("bitcoin local top = BTC-USD", btc[0]?.[0].symbol === "BTC-USD", JSON.stringify(btc.slice(0, 3).map(([i, s]) => [i.symbol, s])));
check("bitcoin local has BCH second-tier below BTC", btc.findIndex(([i]) => i.symbol === "BCH-USD") > 0, JSON.stringify(btc.map(([i]) => i.symbol)));

const doge = CATALOG.map((i) => [i, scoreCatalog(i, "doge")]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
check("doge local top = DOGE-USD", doge[0]?.[0].symbol === "DOGE-USD", JSON.stringify(doge.slice(0, 3).map(([i, s]) => [i.symbol, s])));
check("results carry tradable flag", doge[0]?.[0].tradable === true && typeof doge[0]?.[0].displaySymbol === "string", JSON.stringify(doge[0]?.[0]));

// Live augmentation (network):
try {
  const r1 = await top("apple");
  check("live: 'apple' first result is AAPL", r1[0]?.symbol === "AAPL", JSON.stringify(r1.slice(0, 5).map((x) => [x.symbol, x.score, x.matchTier])));
  const r2 = await top("bitcoin");
  check("live: 'bitcoin' first result is BTC-USD", r2[0]?.symbol === "BTC-USD", JSON.stringify(r2.slice(0, 5).map((x) => [x.symbol, x.score, x.matchTier])));
  const r3 = await top("doge");
  check("live: 'doge' first result is DOGE-USD", r3[0]?.symbol === "DOGE-USD", JSON.stringify(r3.slice(0, 5).map((x) => [x.symbol, x.score, x.matchTier])));
  const r4 = await top("nvidia", { limit: 3 });
  check("live: 'nvidia' finds NVDA", r4.some((x) => x.symbol === "NVDA"), JSON.stringify(r4.map((x) => x.symbol)));
  const r5 = await top("pepe");
  check("live: 'pepe' finds a meme coin", r5.some((x) => x.assetClass === "crypto"), JSON.stringify(r5.slice(0, 5).map((x) => [x.symbol, x.assetClass])));
  const r6 = await top("tesla", { limit: 2, offset: 2 });
  check("pagination returns offset slice of size<=limit", r6.length <= 2, JSON.stringify(r6.map((x) => x.symbol)));
  const r7 = await top("microstrategy");
  check("alias: 'microstrategy' finds MSTR", r7.some((x) => x.symbol === "MSTR"), JSON.stringify(r7.slice(0, 5).map((x) => x.symbol)));
  const r8 = await top("fuzzyzz");
  check("nonsense query returns no fuzzy false positives above 400", !r8.some((x) => x.score >= 400), JSON.stringify(r8.slice(0, 5).map((x) => [x.symbol, x.score])));
} catch (e) {
  failures++;
  console.log("FAIL live tests threw ::", e && e.message);
}

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
