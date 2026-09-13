import assert from "node:assert/strict";
import test from "node:test";
import { searchInstruments } from "../src/lib/instrument-catalog.ts";

const emptyPredictionDb = {
  from() {
    return { select() { return { eq: async () => ({ data: [], error: null }) }; } };
  },
};

test("stock matches lead similarly named crypto provider results", async () => {
  const providerResults = [
    {
      symbol: "MICRON-USD", displayName: "Micron Long Random Coin", name: "micron long random coin", aliases: [],
      assetClass: "crypto", exchange: "Crypto", market: "crypto", tradable: true, displaySymbol: "MICRON", displayMarket: "Cryptocurrency",
    },
    {
      symbol: "MCRN", displayName: "Micron Semiconductor Holdings", name: "micron semiconductor holdings", aliases: [],
      assetClass: "stock", exchange: "NASDAQ", market: "us-equities", tradable: true, displaySymbol: "MCRN", displayMarket: "NASDAQ",
    },
  ];
  const results = await searchInstruments("micron", { limit: 5, predictionDb: emptyPredictionDb, providerResults });
  assert.equal(results[0]?.symbol, "MU");
  assert.equal(results[0]?.assetClass, "stock");
  assert.equal(results[1]?.symbol, "MCRN");
  assert.equal(results[2]?.symbol, "MICRON-USD");
});

test("an explicit crypto query keeps its matching coin at the top", async () => {
  const results = await searchInstruments("bitcoin", {
    limit: 5,
    predictionDb: emptyPredictionDb,
    providerResults: [{
      symbol: "BTCO", displayName: "Bitcoin Opportunities Inc.", name: "bitcoin opportunities inc", aliases: [],
      assetClass: "stock", exchange: "NYSE", market: "us-equities", tradable: true, displaySymbol: "BTCO", displayMarket: "NYSE",
    }],
  });
  assert.equal(results[0]?.symbol, "BTC-USD");
  assert.equal(results[0]?.assetClass, "crypto");
});
