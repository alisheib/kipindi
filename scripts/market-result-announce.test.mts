/**
 * DA-5 / E-115 — the LONG-FORM result announcement reads the settled row, never the browser.
 *
 * 🔴 WHAT THIS GUARDS, AND WHY IT HAD NO GATE AT ALL. The market win celebration headlined
 * `payoutIfWin` written into `localStorage` at PLACE TIME, and decided the player had won by
 * comparing the market's PUBLIC outcome to a side kept in the same browser. Four defects lived
 * in that one shortcut: a projected figure instead of the payment; firing off `stage2At`, up to
 * **24h before `settleMarket` moves a shilling**; a CASHED_OUT player getting the seal; and two
 * bets on one market collapsing into one because the key was per market.
 *
 * ⛔ THE EXISTING COVERAGE COULD NOT FAIL. `betting-winning-stress-e2e.mjs` captured the
 * celebration's `detail.amount` and then asserted only LATENCY — it would pass unchanged with a
 * fabricated figure. `qa:win-popup` dispatches the event by hand and says so in its own header.
 * So the poll-path celebration has never had a gate that could go red.
 *
 * ⚠️ EVERY CHECK IS SCOPED TO A FUNCTION BODY OR A STRIPPED SOURCE. A symbol present *somewhere*
 * in a file proves nothing — that is how six checks shipped unfalsifiable in session 29. §0
 * resolves the slices and REFUSES TO RUN if any is empty.
 *
 *   npm run test:market-result-announce
 */
import { readFileSync } from "node:fs";

const POLLER = "src/components/markets/notify-poller.tsx";
const ROUTE = "src/app/api/positions/settled/route.ts";
const DIAL = "src/components/markets/conviction-dial.tsx";
const DICT = "src/lib/i18n-dict.ts";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); } else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/**
 * ⛔ COMMENTS MUST GO BEFORE ANY ABSENCE CHECK. This file's own documentation names
 * `payoutIfWin` and `50pick-bet-` repeatedly — explaining what was removed — so a naive grep
 * for their absence would fail on the paragraphs describing the fix. Never match on words the
 * code's own documentation will one day contain, and always measure the STRIPPED text.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** Brace-matched slice from `open` to the brace that closes it. Null, never "", when absent. */
function sliceBraces(text: string, open: string): string | null {
  const i = text.indexOf(open);
  if (i === -1) return null;
  let depth = 0;
  for (let j = i + open.length - 1; j < text.length; j++) {
    const ch = text[j];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return text.slice(i, j + 1); }
  }
  return null;
}

console.log("\nDA-5 / E-115 — the market celebration reads the settled row\n");
console.log("── 0 · resolve the slices, and refuse to run over nothing ───────");

const pollerRaw = read(POLLER);
const pollerCode = stripComments(pollerRaw);
const routeCode = stripComments(read(ROUTE));
const dialCode = stripComments(read(DIAL));
const dict = read(DICT);

const tick = sliceBraces(pollerCode, "const tick = async () => {");
const handler = sliceBraces(routeCode, "export async function GET(req: Request) {");

ok("0.1 · the poller's tick body resolved", Boolean(tick && tick.length > 400), `${tick?.length ?? 0} chars`);
ok("0.2 · the route's GET handler resolved", Boolean(handler && handler.length > 300), `${handler?.length ?? 0} chars`);
ok("0.3 · ⭐ the stripped poller is still real code (else every absence below proves nothing)",
   /dispatchWinCelebration/.test(pollerCode) && /useEffect/.test(pollerCode) && pollerCode.length > 900,
   `${pollerCode.length} chars after stripping`);
ok("0.4 · ⭐ the stripped dial is still real code",
   /localStorage/.test(dialCode) && dialCode.length > 2000, `${dialCode.length} chars`);

if (fails.length) {
  console.error("\n✗ REFUSING TO RUN — a slice is empty, so the checks below would be vacuous.\n");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}

console.log("\n── 1 · the place-time projection is GONE, at both ends ──────────");

ok("1.1 · the poller never reads a `50pick-bet-` record", !/50pick-bet-/.test(pollerCode));
ok("1.2 · the poller never mentions `payoutIfWin`", !/payoutIfWin/.test(pollerCode));
// ⚠️ THIS CHECK'S FIRST VERSION CONDEMNED CORRECT CODE, and the repair is the lesson.
// It banned the word `payoutIfWin` from the dial outright — and the dial legitimately shows
// a "payout if win" figure in the bet-placed receipt, which is an honestly-labelled
// PROJECTION at the moment of betting and is exactly right. E-115 was never about the
// concept; it was about PERSISTING that number and later re-reading it as a payment. So the
// assertion is about the write, not the word — and 1.3b is its control, proving the
// legitimate use survived rather than being deleted along with the defect.
ok("1.3 · ⭐ the dial persists no bet record — the key is gone and no setItem carries the projection",
   !/50pick-bet-/.test(dialCode) && !/localStorage\.setItem\([\s\S]{0,200}?payoutIfWin/.test(dialCode));
ok("1.3b · …and the CONTROL: the receipt still shows a payout-if-win projection at bet time",
   /payoutIfWin/.test(dialCode), "a projection labelled as one is honest; only storing it was not");
ok("1.4 · …while the dial's watch-list write SURVIVES (it is what makes the poller look)",
   /50pick-notify-markets/.test(dialCode));

console.log("\n── 2 · the amount is the REALISED payout from the row ───────────");

ok("2.1 · the win branch dispatches `amount: p.payout` — a field named payout, off a row",
   /dispatchWinCelebration\(\{[\s\S]{0,200}?amount:\s*p\.payout/.test(tick!));
ok("2.2 · net is profit — payout minus stake",
   /net:\s*p\.payout\s*-\s*p\.stake/.test(tick!));
ok("2.3 · ⛔ the status is READ, never inferred from the market outcome",
   /p\.status\s*===\s*"WIN"/.test(tick!) && !/resolvedOutcome\s*===\s*stored/.test(tick!));
ok("2.4 · the route returns `finalPayout`, not `potentialPayout`",
   /payout:\s*p\.finalPayout/.test(handler!) && !/potentialPayout/.test(handler!));

console.log("\n── 3 · it cannot fire before the money has moved ────────────────");

ok("3.1 · ⭐ the route requires `settledAt` — adjudication alone is not a payment",
   /p\.settledAt\s*!=\s*null/.test(handler!));
ok("3.2 · only terminal statuses are returned (no OPEN, no CASHED_OUT)",
   /"WIN"/.test(handler!) && /"LOSS"/.test(handler!) && /"VOID"/.test(handler!)
   && !/CASHED_OUT/.test(handler!));

console.log("\n── 4 · ownership — a client can only ever see its own money ─────");

ok("4.1 · the handler resolves a session and refuses without one",
   /getSession\(\)/.test(handler!) && /401/.test(handler!));
ok("4.2 · ⭐ rows are read for `session.userId`, never for an id from the query string",
   /listPositionsForUser\(session\.userId/.test(handler!));
ok("4.3 · the caller may name MARKETS only — no userId or positionId parameter is honoured",
   !/searchParams\.get\(["'](userId|user|positionId|position)["']\)/.test(handler!));

console.log("\n── 5 · the three outcomes are three, and none of them lies ──────");

ok("5.1 · ⛔ a VOID refund is `factual`, never `default` (E-114 — `default` paints a TICK)",
   /marketStakeReturnedTitle[\s\S]{0,200}?variant:\s*"factual"/.test(tick!));
ok("5.2 · ⛔ a LOSS is `factual` too — never `warning`, which is the celebration GOLD",
   /marketLostTitle[\s\S]{0,200}?variant:\s*"factual"/.test(tick!));
ok("5.3 · no toast on this path uses `warning` or `gold`",
   !/variant:\s*"(warning|gold)"/.test(tick!));
ok("5.4 · the loss names the amount (an unnamed loss is the euphemism RG bans)",
   /marketLostTitle[\s\S]{0,160}?formatTzs\(p\.stake\)/.test(tick!));

console.log("\n── 6 · announced once, per POSITION ─────────────────────────────");

ok("6.1 · ⭐ the seen-set is keyed by positionId, not marketId",
   /seen\.has\(p\.positionId\)/.test(tick!) && /seen\.add\(p\.positionId\)/.test(tick!));
ok("6.2 · the watch list is pruned on SETTLEMENT, not on adjudication",
   /localStorage\.setItem\(WATCH_KEY/.test(tick!));

console.log("\n── 7 · trilingual, or a player reads a blank ────────────────────");

for (const key of ["marketLostTitle", "marketStakeReturnedTitle"]) {
  const n = (dict.match(new RegExp(`\\b${key}:`, "g")) ?? []).length;
  ok(`7 · \`${key}\` exists in all three locales`, n === 3, `${n} definition(s)`);
}

console.log(`\nmarket-result-announce: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  console.error("✗ E-115 BROKEN — the market celebration may be showing a figure the player was not paid.\n");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("market-result-announce: OK — settled rows only, realised payout, three honest outcomes.");
