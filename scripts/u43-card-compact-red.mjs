/** U43 B1/B5 mutation proof: each reverted improvement must make the guard fail. */
import { readFileSync } from "node:fs";
import { compactCardIssues } from "./u43-card-compact-contract.mjs";

const original = {
  card: readFileSync("src/components/updown/updown-card.tsx", "utf8"),
  css: readFileSync("src/app/globals.css", "utf8"),
  line: readFileSync("src/components/charts/round-live-line.tsx", "utf8"),
  controls: readFileSync("src/components/updown/updown-stake-controls.tsx", "utf8"),
  dict: readFileSync("src/lib/i18n-dict.ts", "utf8"),
};
if (compactCardIssues(original).length) throw new Error("Baseline compact card guard failed");
const cases = [
  ["old mobile gap", "css", '--ud-pad: var(--sp-3); --ud-gap: var(--sp-1);', '--ud-pad: var(--sp-3); --ud-gap: var(--sp-3);'],
  ["large stake rail gap returns", "controls", 'compact ? "mb-1 flex-nowrap"', 'compact ? "mb-2 flex-nowrap"'],
  ["placed ring borrows green", "css", '0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--text) 40%, transparent); }', '0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--success-500) 55%, transparent); }'],
  ["clock pip borrows live red", "card", '<Dot tone="neutral" size={6} pulse />', '<Dot tone="live" size={6} pulse />'],
  ["full source stamp regains a second row", "card", 'fmtEATClock(Date.parse(displayedQuotedAt))', 'fmtEAT(displayedQuotedAt)'],
  ["source omits exact instant", "card", 'dateTime={displayedQuotedAt ?? undefined}', 'dateTime={undefined}'],
  ["refund chip returns", "card", '!refundCopy?.claimsRefund && (', 'refundCopy?.claimsRefund && ('],
  ["refund repeats full promise above amount", "card", '{cardRefundCopyText}</p>', '{refundCopyText}</p>'],
  ["two returned sides called paid out", "card", 'cardResults.every((result) => result.status === "VOID" && result.payout === result.stake)', 'false'],
  ["newer confirmed price loses its missing-line explanation", "line", 'if (confirmedAbove)', 'if (false && confirmedAbove)'],
];
for (const [name, file, from, to] of cases) {
  if (!original[file].includes(from)) throw new Error(`Mutation anchor missing: ${name}`);
  const candidate = { ...original, [file]: original[file].replace(from, to) };
  if (!compactCardIssues(candidate).length) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 compact card red proof: ${cases.length} reversions caught`);
