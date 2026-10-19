/** U43 B1: real round reads and the slim card's money-safe state contract. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cardPriceRead } from "../src/lib/updown-card-view";
import { handoverPodIssues, roundCardIssues } from "./u43-round-card-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path: string) => readFileSync(join(root, path), "utf8");
const start = Date.parse("2026-10-19T10:30:00.000Z");
const close = start + 5 * 60_000;
const read = (at: number | null, readPrice: number | null = 100) => cardPriceRead({
  opensAtMs: start, closesAtMs: close, readQuotedAt: at == null ? null : new Date(at).toISOString(),
  openPrice: 100, readPrice,
});

assert.equal(read(start), "opening", "the open bar is not a newer price");
assert.equal(read(start + 60_000), "newer", "a timed later bar is new even if its price is unchanged");
assert.equal(read(start + 60_000, null), "unknown", "no observed number cannot become a newer price");
assert.equal(read(start - 60_000), "unknown", "a pre-round read is not this round's read");
assert.equal(read(close + 60_000), "unknown", "a later round's read cannot enter this card");
assert.equal(read(null), "unknown", "a missing source time cannot be called current");
assert.equal(cardPriceRead({ opensAtMs: NaN, closesAtMs: close, readQuotedAt: new Date(start).toISOString(),
  openPrice: 100, readPrice: 100 }), "unknown", "invalid instants do not crash or invent a read");

const issues = roundCardIssues(
  source("src/components/updown/updown-card.tsx"),
  source("src/components/updown/updown-stake-controls.tsx"),
  source("src/components/updown/asset-mark.tsx"),
  source("src/app/updown/[roundId]/page.tsx"),
  source("src/components/updown/round-action-panel.tsx"),
  source("src/components/updown/round-countdown.tsx"),
  source("src/lib/i18n-dict.ts"),
);
assert.deepEqual(issues, [], `slim card contract: ${issues.join("; ")}`);
const podIssues = handoverPodIssues(
  source("src/components/updown/round-countdown.tsx"),
  source("src/app/globals.css"),
  source("src/components/updown/updown-handover.tsx"),
);
assert.deepEqual(podIssues, [], `live handover pod: ${podIssues.join("; ")}`);
console.log("U43 B1 round-card guard: price evidence and rendered-state contract passed");
