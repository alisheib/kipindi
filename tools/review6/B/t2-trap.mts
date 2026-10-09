// What the Modal focus trap can hold in the two money confirms while a request is in flight (review 6, reviewer B).
// Run from F:/kipindi-rev:
//   node_modules/.bin/tsx --tsconfig tsconfig.json --import ./<this folder>/hook-register.mjs <this file>
// The real components (HEAD 9677a3f5 and main's 118fc75c) are drawn through `modal-shim.tsx` (the panel's own content),
// and every element the trap's FOCUSABLE selector (modal.tsx line 45–46) would return is listed.
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SellConfirmModal } from "file:///F:/kipindi-rev/src/components/markets/sell-confirm-modal.tsx";
import { BetConfirmModal } from "file:///F:/kipindi-rev/src/components/markets/bet-confirm-modal.tsx";
import { SellConfirmModal as OldSell } from "./sell-confirm-modal.old.tsx";
import { BetConfirmModal as OldBet } from "./bet-confirm-modal.old.tsx";

// modal.tsx:45  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]),
//                [tabindex]:not([tabindex="-1"])'
const TAG = /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>\/]+(?:="[^"]*")?)*)\s*\/?>/g;
const ATTR = /\s+([^\s=>\/]+)(?:="([^"]*)")?/g;
function focusables(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(TAG)) {
    const tag = m[1].toLowerCase();
    const attrs = new Map<string, string>();
    for (const a of (m[2] ?? "").matchAll(ATTR)) attrs.set(a[1].toLowerCase(), a[2] ?? "");
    const disabled = attrs.has("disabled");
    const hit =
      (tag === "button" && !disabled) ||
      attrs.has("href") ||
      ((tag === "input" || tag === "select" || tag === "textarea") && !disabled) ||
      (attrs.has("tabindex") && attrs.get("tabindex") !== "-1");
    if (hit) out.push(`<${tag}${attrs.has("aria-label") ? ` aria-label="${attrs.get("aria-label")}"` : ""}>`);
  }
  return out;
}

const noop = () => {};
const sell = (C: typeof SellConfirmModal, pending: boolean) =>
  h(C as never, { open: true, pending, stake: 5000, value: 6100, positionId: "pos_0123456789abcdef", onConfirm: noop, onCancel: noop });
const bet = (C: typeof BetConfirmModal, pending: boolean) =>
  h(C as never, { open: true, pending, side: "YES", stake: 5000, multiplier: 1, lean: "fair", isOneSided: false, marketTitle: "Simba watashinda?", onConfirm: noop, onCancel: noop });

for (const [name, el] of [
  ["sell confirm @118fc75c  idle   ", sell(OldSell as never, false)],
  ["sell confirm @118fc75c  pending", sell(OldSell as never, true)],
  ["sell confirm @9677a3f5  idle   ", sell(SellConfirmModal, false)],
  ["sell confirm @9677a3f5  pending", sell(SellConfirmModal, true)],
  ["bet confirm  @118fc75c  idle   ", bet(OldBet as never, false)],
  ["bet confirm  @118fc75c  pending", bet(OldBet as never, true)],
  ["bet confirm  @9677a3f5  idle   ", bet(BetConfirmModal, false)],
  ["bet confirm  @9677a3f5  pending", bet(BetConfirmModal, true)],
] as const) {
  const f = focusables(renderToStaticMarkup(el as never));
  console.log(`${name}  trap list: ${f.length}  ${f.join(" ")}`);
}
