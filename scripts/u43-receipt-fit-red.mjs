/** In-memory mutation proof for the scoped phone receipt density. */
import { readFileSync } from "node:fs";
import { receiptFitIssues } from "./u43-receipt-fit-contract.mjs";

const read = (path) => readFileSync(path, "utf8");
const receipt = read("src/components/updown/updown-bet-receipt-modal.tsx");
const modal = read("src/components/markets/operation-result-modal.tsx");
const css = read("src/app/globals.css");
if (receiptFitIssues(receipt, modal, css).length) throw new Error("Baseline receipt fit guard failed");
const plants = [
  ["receipt loses compact opt-in", receipt, "compactOnPhone", "", modal, css],
  ["second action disappears", receipt, 'secondaryLabel={onWatchRound ? t.market.udRcWatchRound : undefined}', 'secondaryLabel={undefined}', modal, css],
  ["modal reverts to tall phone padding", receipt, null, null, modal, css.replace('.orm-phone-compact { padding: var(--sp-4); }', '.orm-phone-compact { padding: var(--sp-6); }')],
  ["detail rows regain tall gaps", receipt, null, null, modal, css.replace('.orm-phone-compact .orm-details { margin-top: var(--sp-2); gap: var(--sp-1); }', '.orm-phone-compact .orm-details { margin-top: var(--sp-4); gap: var(--sp-2); }')],
  ["detail disclosure hidden to gain room", receipt, null, null, modal, css.replace('.orm-phone-compact .orm-detail { padding: var(--sp-1) var(--sp-3); }', '.orm-phone-compact .orm-detail { display: none; }')],
];
for (const [name, src, from, to, modalSource, cssSource] of plants) {
  const receiptSource = from == null ? src : src.replace(from, to);
  if ((receiptSource === receipt && modalSource === modal && cssSource === css)
    || receiptFitIssues(receiptSource, modalSource, cssSource).length === 0) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 phone receipt fit red: ${plants.length} reversions caught`);
