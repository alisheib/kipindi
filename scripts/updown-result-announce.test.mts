/**
 * THE UP & DOWN RESULT MOMENT — Ali's *"perfect popup on win"*, and the decision it must not break.
 *
 * ⛔ THE CONSTRAINT THAT OUTRANKS THE FEATURE. Ali's dated decision of 2026-07-24 suppresses
 * per-round Up & Down notifications (*"forty emails an hour is unusable"*), replaced by the
 * nightly digest E-37 shipped. On 2026-08-05, shown the measured volume — 6.7 messages/hour per
 * player on the board as it actually runs, 15/hour on a 3-minute chain — he chose **in-app only:
 * no email, no push, no inbox row.** §4 below fails if this feature ever grows an outside-the-app
 * channel, because that would silently reverse an owner decision.
 *
 * ⭐ WHY THERE WAS NO MOMENT, and it was two silences meeting:
 *  1. the board never SENT the data — `myStakesByMarket` recorded a settled position only when
 *     `finalPayout === stake` (a refund), so a WIN and a LOSS were both recorded as nothing and
 *     a winner and a loser got byte-identical props;
 *  2. `WinCelebrationHost` (already built, already mounted in `AppShell`) is fired by
 *     `notify-poller.tsx` behind a `readStoredBet()` localStorage record the Up & Down quick-bet
 *     path never writes — and behind notifications, which are suppressed for UPDOWN.
 *     **Suppressing the message also suppressed the moment.**
 *
 * ⚠️ EVERY CHECK IS SCOPED TO A FUNCTION BODY. Session 29 shipped six checks that could not
 * fail, and session 30 shipped two more in its own E-64 driver, both times because a symbol was
 * present somewhere in the file. §0 resolves the slices and REFUSES TO RUN if any is empty.
 *
 *   npm run test:updown-result-announce
 */
import { readFileSync } from "node:fs";

const ANNOUNCER = "src/components/updown/updown-result-announcer.tsx";
const BOARD = "src/lib/server/updown-board.ts";
const BOARD_PAGE = "src/app/updown/page.tsx";
const ROUND_PAGE = "src/app/updown/[roundId]/page.tsx";
const DICT = "src/lib/i18n-dict.ts";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); } else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/**
 * The same source with every comment removed.
 *
 * ⛔ THIS SUITE NEEDED IT ON ITS FIRST RUN, WHICH IS THE POINT. §4 asserts the announcer never
 * reaches for `notifyWin` / `notifyLoss`, and it FAILED — on the announcer's own doc comment
 * saying *"do not complete this by calling notifyWin/notifyLoss"*. A guard tripped by the very
 * warning that explains it is the §0.1a mistake exactly: **never match on words the code's own
 * documentation will one day contain.** ⚠️ And per session 29's E96 repair, the check must then
 * measure the STRIPPED text — stripping into one variable and asserting against the original is
 * precisely how that fix broke itself.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")            // block comments, including JSDoc
    .replace(/^\s*\/\/.*$/gm, "");                 // whole-line // comments
}

/** Brace-matched slice from `open` to the brace that closes it. Null, never "", when absent. */
function sliceBraces(text: string, open: string): string | null {
  const at = text.indexOf(open);
  if (at < 0) return null;
  let i = at + open.length - 1;
  if (text[i] !== "{") { const j = text.indexOf("{", i); if (j < 0) return null; i = j; }
  let depth = 0;
  for (let k = i; k < text.length; k++) {
    if (text[k] === "{") depth++;
    else if (text[k] === "}") { depth--; if (depth === 0) return text.slice(at, k + 1); }
  }
  return null;
}

console.log("\nUp & Down · the result moment, and the owner decision it must not reverse\n");

const announcer = read(ANNOUNCER);
/** ⛔ §3.6 and §4 assert the ABSENCE of a symbol, so they must read CODE — see `stripComments`. */
const announcerCode = stripComments(announcer);
const board = read(BOARD);

// ── §0. THE SLICES ─────────────────────────────────────────────────────────────────────────
console.log("§0 · the slices this suite reasons over (refuse to measure an empty one)");
const effect = sliceBraces(announcer, "useEffect(() => {");
ok("0.1 the announcer's effect body is locatable", effect != null);
ok("0.2 …and is substantial", (effect?.length ?? 0) > 600, `${effect?.length ?? 0} chars`);
const myStakes = sliceBraces(board, "async function myStakesByMarket(userId: string | undefined): Promise<Map<string, MyMarketStake>> {");
ok("0.3 `myStakesByMarket`'s body is locatable", myStakes != null);
ok("0.4 …and is substantial", (myStakes?.length ?? 0) > 500, `${myStakes?.length ?? 0} chars`);
if (!effect || !myStakes) {
  console.log(`\nupdown-result-announce: ${pass} passed, ${fails.length} failed`);
  console.error("\n✗ THE SLICES DID NOT RESOLVE — every later check would have passed over an empty string.\n");
  process.exit(1);
}

// ── §1. THE SERVER SENDS THE VIEWER'S OWN OUTCOME ─────────────────────────────────────────
console.log("\n§1 · the board carries the viewer's settled result (it never did before)");
ok("1.1 `BoardRound` declares `myResult`", /myResult:\s*\{/.test(board));
ok("1.2 …with all three outcomes, not just a win", /"WIN"\s*\|\s*"LOSS"\s*\|\s*"VOID"/.test(board));
ok("1.3 `myStakesByMarket` populates it inside its own body", /e\.result\s*=/.test(myStakes));
// ⛔ The realised figure. `finalPayout` is what settlement actually paid; anything else is a
// projection, and a celebrated projection is a false money statement.
ok("1.4 the payout comes from `finalPayout`, never a projection", /finalPayout/.test(myStakes));
ok("1.5 …and the status is read off the POSITION row, not inferred from the round outcome",
   /p\.status\s*===\s*"WIN"/.test(myStakes) && /p\.status\s*===\s*"LOSS"/.test(myStakes),
   "a round can resolve DOWN and still refund an UP backer in full (E-65) — inferring from the outcome would call that a loss");
ok("1.6 `toBoardRound` actually passes it through", /myResult:\s*mine\?\.result/.test(board));

// ── §2. IT FIRES ON A TRANSITION, NOT ON MOUNT ────────────────────────────────────────────
console.log("\n§2 · the moment is a TRANSITION — a popup that fires because you opened a page is an ambush");
ok("2.1 the first render SEEDS rather than announces",
   /seen\.current\s*==\s*null/.test(effect) && /return;/.test(effect));
ok("2.2 a round unknown to this mount is seeded, not announced", /before\s*===\s*undefined/.test(effect));
ok("2.3 …and only a false → true transition announces", /if\s*\(before\s*\|\|\s*!settled\)\s*continue;/.test(effect));
ok("2.4 it is deduped per round beyond the mount (sessionStorage)",
   /alreadyAnnounced\(/.test(effect) && /markAnnounced\(/.test(effect));

// ── §3. THREE OUTCOMES, NEVER TWO ─────────────────────────────────────────────────────────
console.log("\n§3 · a refund is neither a win nor a loss — conflating them is a false money statement");
ok("3.1 WIN is handled", /status\s*===\s*"WIN"/.test(effect));
ok("3.2 VOID is handled SEPARATELY from LOSS", /status\s*===\s*"VOID"/.test(effect));
ok("3.3 the win fires the kit's existing celebration, not a bespoke popup",
   /dispatchWinCelebration\(/.test(effect));
ok("3.4 …headlining the REALISED payout, not the stake or an estimate",
   /amount:\s*res\.payout/.test(effect));
ok("3.5 the loss names the amount (an unnamed number is the euphemism RG forbids)",
   /formatTzs\(res\.stake\)/.test(effect));
// ⚠️ RG: the loss must NOT be the win's mirror. No glow, no counter, no haptic.
ok("3.6 ⚠️ RG — the loss does NOT celebrate: no haptic in the announcer at all",
   !/haptics\./.test(announcerCode));
ok("3.7 every string comes from the dictionary, never a literal",
   /t\.market\.udStakeReturnedTitle/.test(effect) && /t\.market\.udLostTitle/.test(effect));

// ── §4. ⛔ THE OWNER DECISION — in-app ONLY ────────────────────────────────────────────────
console.log("\n§4 · ⛔ Ali's 2026-07-24 suppression stands — this feature must stay in-app");
for (const [label, sym] of [
  ["notifyWin", "notifyWin"], ["notifyLoss", "notifyLoss"], ["notifyRefund", "notifyRefund"],
  ["sendEmailToUser", "sendEmailToUser"], ["pushOnly", "pushOnly"], ["sendPushToUser", "sendPushToUser"],
] as const) {
  ok(`4.${label} · the announcer does not reach for \`${sym}\``, !new RegExp(`\\b${sym}\\b`).test(announcerCode));
}
// ⭐ THE CONTROL FOR §4, and without it every check above is unfalsifiable. `stripComments`
// could return "" — or strip the whole file — and all six absence checks would pass over
// nothing. Require the stripped source to still contain the symbols the feature genuinely uses.
ok("4.control · the stripped source is still real code (else §4's absences prove nothing)",
   /dispatchWinCelebration/.test(announcerCode) && /useEffect/.test(announcerCode)
   && announcerCode.length > 800,
   `${announcerCode.length} chars after stripping`);
// And the predicate itself must still say UPDOWN is suppressed — if someone flips it, this
// feature's whole premise changed and a human must re-read the decision.
const svc = read("src/lib/server/market-service.ts");
const pred = sliceBraces(svc, 'export function perEventNotificationsSuppressed(m: Pick<StoredMarket, "productLine">): boolean {');
ok("4.1 `perEventNotificationsSuppressed` still suppresses UPDOWN", pred != null && /productLine\s*===\s*"UPDOWN"/.test(pred),
   pred == null ? "predicate not found — read docs/COMPLIANCE-DECISIONS.md before changing anything" : pred.replace(/\s+/g, " "));

// ── §5. MOUNTED ON BOTH SURFACES, FROM ONE COMPONENT ──────────────────────────────────────
console.log("\n§5 · one shared announcer, mounted on both surfaces (§0.1b rule 1)");
for (const [name, path] of [["board", BOARD_PAGE], ["round page", ROUND_PAGE]] as const) {
  const src = read(path);
  ok(`5.${name} · imports the shared announcer`, /updown-result-announcer/.test(src));
  ok(`5.${name} · …and renders it`, /<UpDownResultAnnouncer/.test(src));
}

// ── §6. TRILINGUAL ────────────────────────────────────────────────────────────────────────
console.log("\n§6 · the new copy resolves in EN, SW and ZH");
const dict = read(DICT);
for (const token of ["udStakeReturnedTitle", "udLostTitle", "udUpDown"]) {
  const vals = [...dict.matchAll(new RegExp(`${token}:\\s*"([^"]+)"`, "g"))].map((m) => m[1]);
  ok(`6.${token} · defined three times`, vals.length === 3, `${vals.length}: ${JSON.stringify(vals)}`);
  ok(`6.${token} · …and not three copies of the English`, new Set(vals).size >= 2, JSON.stringify(vals));
}

console.log(`\nupdown-result-announce: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.error("\n✗ the Up & Down result moment is missing, misstates an outcome, or has grown a channel Ali did not agree to.\n");
  for (const f of fails) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("updown-result-announce: OK — win celebrates, loss and refund state their own truth, and nothing leaves the app");
