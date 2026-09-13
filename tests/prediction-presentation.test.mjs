import assert from "node:assert/strict";
import test from "node:test";
import { formatPredictionHistoryLabel, predictionCategory, predictionOutcomeLabels, predictionSportCategory } from "@/lib/prediction-presentation";

test("prediction presentation categories keep the approved discovery taxonomy when the source category is generic", () => {
  assert.equal(predictionCategory("Will the Fed decrease interest rates?", "General"), "Economics");
  assert.equal(predictionCategory("Bitcoin above $120,000 by year end?", null), "Crypto & Markets");
  assert.equal(predictionCategory("Major AI lab ships a flagship model?", "General"), "Technology");
  assert.equal(predictionCategory("Will Team A win the Valorant Champions final?", "Sports"), "Esports");
  assert.equal(predictionCategory("Will San Diego FC win on Sunday?", "General"), "Sports");
  assert.equal(predictionCategory("Will the Senate pass the bill?", "General"), "Politics");
  assert.equal(predictionCategory("A narrowly worded local event", "World"), "World");
  assert.equal(predictionSportCategory("Will the Lakers win their NBA game?"), "Basketball");
  assert.equal(predictionSportCategory("Will the Seahawks win the Super Bowl?"), "Football");
  assert.equal(predictionSportCategory("Will Team A win the Valorant Champions final?"), null);
  assert.deepEqual(predictionOutcomeLabels("US Open WTA: Aryna Sabalenka vs Elena Rybakina", null, null), ["Aryna Sabalenka", "Elena Rybakina"]);
});

test("prediction probability history labels never expose raw epoch timestamps", () => {
  assert.match(formatPredictionHistoryLabel("1788458416", 7), /^[A-Z][a-z]{2} \d{1,2}$/);
  assert.match(formatPredictionHistoryLabel("1788458416", 1), /^\d{1,2}:\d{2}(?:\s[AP]M)?$/);
});
