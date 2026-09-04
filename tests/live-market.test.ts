import assert from "node:assert/strict";
import test from "node:test";
import { getMarketFeed, type LiveQuote } from "../src/lib/live-market";

type InternalFeed = {
  anchors: Map<string, {
    symbol: string;
    anchorPrice: number;
    price: number;
    prevClose: number | null;
    lastRealAt: number;
    source: LiveQuote["source"];
    vol: number;
    velocity: number;
  }>;
  snapshotCache: Map<string, LiveQuote>;
  timer: ReturnType<typeof setInterval> | null;
  tick: () => void;
};

test("coalesces all simulated quotes into one subscriber update per 100ms tick", () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const previousRandom = Math.random;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { visibilityState: "visible" },
  });

  const feed = getMarketFeed() as unknown as InternalFeed;
  if (feed.timer) clearInterval(feed.timer);
  feed.timer = null;
  feed.anchors.clear();
  feed.snapshotCache.clear();
  feed.anchors.set("AAA", {
    symbol: "AAA",
    anchorPrice: 11,
    price: 10,
    prevClose: 9.5,
    lastRealAt: Date.now(),
    source: "anchor",
    vol: 0,
    velocity: 0,
  });
  feed.anchors.set("BBB", {
    symbol: "BBB",
    anchorPrice: 11,
    price: 10,
    prevClose: 9.5,
    lastRealAt: Date.now(),
    source: "anchor",
    vol: 0,
    velocity: 0,
  });

  const snapshots: number[] = [];
  const unsubscribe = getMarketFeed().subscribe((quotes) => snapshots.push(quotes.size));
  snapshots.length = 0;
  Math.random = () => 0.5;

  try {
    feed.tick();
    assert.deepEqual(snapshots, [2]);
  } finally {
    unsubscribe();
    Math.random = previousRandom;
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
