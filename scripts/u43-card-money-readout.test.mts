/** Guard the card's observable pending and realized-money labels. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validRealizedPayout } from "../src/lib/updown-result-truth.ts";

const source = readFileSync(resolve("src/components/updown/updown-card.tsx"), "utf8").replace(/\r\n/g, "\n");
let passed = 0;
const check = (label: string, okay: unknown) => {
  assert.ok(okay, label);
  passed++;
  console.log(`PASS ${label}`);
};
const section = (start: string, end: string) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `card section premise: ${start}`);
  return source.slice(a, b);
};

const resultHeader = section("{settledNow ? (", ") : (\n          <CardCountdownDigits");
check("a known verdict with money unsettled has neutral result ink",
  resultHeader.includes('!settled || state === "void" ? "var(--text-muted)"') &&
  resultHeader.includes('settled && price.kind === "priced" ? t.market.udUpWins : t.market.udUp'));

const single = section("{cardResults.length === 1 ? (", ") : (\n              <>");
check("an unknown single payout appears once, with no invented amount",
  single.includes('cardResults[0].payout == null ? t.market.udPayoutUnavailable') &&
  single.includes('cardResults[0].payout != null && <>') &&
  single.match(/udPayoutUnavailable/g)?.length === 1);
check("a realized LOSS names zero paid out rather than restating stake",
  single.includes('cardResults[0].status !== "VOID" && <span>{t.market.udPaidOut}</span>') &&
  single.includes('formatTzs(cardResults[0].payout)') &&
  !single.includes('formatTzs(cardResults[0].stake)'));
const multi = section("{cardResults.map((result) => (", "</p>\n                ))}");
check("each realized leg uses its actual payout, including zero for a loss",
  multi.includes('result.payout != null && <>') && multi.includes('formatTzs(result.payout)') &&
  !multi.includes('formatTzs(result.stake)'));

check("the mounted card validates realized payouts before formatting",
  source.includes('payout: validRealizedPayout(r) ? r.payout : null') &&
  validRealizedPayout({ status: "LOSS", stake: 2_000, payout: 0 }) &&
  !validRealizedPayout({ status: "LOSS", stake: 2_000, payout: null }) &&
  !validRealizedPayout({ status: "WIN", stake: 2_000, payout: -5 }));
console.log(`u43-card-money-readout: ${passed} passed, 0 failed`);
