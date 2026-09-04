import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|sql)$/.test(entry.name) ? [path] : [];
  });
}

test("Vanta has no cash rewards or paper-transfer endpoints", () => {
  assert.equal(existsSync(join(root, "src", "app", "api", "rewards", "route.ts")), false);
  assert.equal(existsSync(join(root, "src", "app", "api", "transfers", "route.ts")), false);
});

test("Vanta source has no reward, refill, or transfer cash pathways", () => {
  const source = [
    ...sourceFiles(join(root, "src")),
    join(root, "supabase", "schema.sql"),
  ].map((path) => readFileSync(path, "utf8")).join("\n");

  assert.doesNotMatch(source, /\b(reward_claims|paper_transfers|practice credits|claimReward)\b/i);
});
