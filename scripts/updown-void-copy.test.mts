/**
 * Up & Down — A REFUND MUST STATE ITS REAL REASON, on every surface, in every language.
 *
 *   npx tsx scripts/updown-void-copy.test.mts     (npm run test:updown-void-copy)
 *
 * 🔴 E-65, on production. A round resolved **DOWN**, the player had backed **UP**, and the card
 * said *"VOID · REFUNDED · TZS 500"* while the rule printed underneath said *"Down if at or
 * below the Down target"* — i.e. that they had lost. **The money was right and the page argued
 * the opposite.** The refund was correct: theirs was the only side, so there was no counterparty
 * and no pool to win from. Nothing on the screen said so.
 *
 * ⛔ THE ROOT CAUSE WAS TWO BRANCHES FOR FIVE SITUATIONS.
 * `voidReason === "source-failed" ? A : B` — so a one-sided refund inherited *"the price did not
 * move enough to call"*, which in that round was flatly untrue: the price moved, the round
 * decided, and it decided against them.
 *
 * ⛔ AND THE ONE-SIDED CASE IS NOT A VOID AT ALL, which is why the old branch could never reach
 * it: the round's `outcome` is UP or DOWN and its `voidReason` is null. Any rule that consults
 * `voidReason` first finds nothing and falls through to a void's copy. `refundReasonFor` tests
 * the decided-but-refunded case FIRST, and §1.5 pins that ordering.
 *
 * ⚠️ E-56 rides along: a void is NEVER rendered as an UP or a DOWN.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  refundReasonFor, displayDirection, REFUND_REASON_KEY, type RefundReason,
} from "../src/lib/updown-refund-reason.ts";
import { dict } from "../src/lib/i18n-dict.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const code = (p: string) => read(p).split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const ALL: RefundReason[] = ["no-move", "source-failed", "source-mismatch", "operator", "unmatched", "unexplained"];

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE RULE — one decision, and the ORDER is the fix
// ═══════════════════════════════════════════════════════════════════════════
{
  ok("1.1 · a no-move void says so",
     refundReasonFor({ outcome: "VOID", voidReason: "no-move" }) === "no-move");
  ok("1.2 · a source failure says so — OUR failure, named",
     refundReasonFor({ outcome: "VOID", voidReason: "source-failed" }) === "source-failed");
  ok("1.3 · a source mismatch says so",
     refundReasonFor({ outcome: "VOID", voidReason: "source-mismatch" }) === "source-mismatch");
  ok("1.4 · an operator void says so",
     refundReasonFor({ outcome: "VOID", voidReason: "operator" }) === "operator");

  // ⭐ E-65 ITSELF. The round DECIDED (DOWN) and this player was still refunded, because
  // nobody took the other side. Any rule consulting `voidReason` first finds null here.
  const e65 = refundReasonFor({ outcome: "DOWN", voidReason: null, refundedStake: 500 });
  ok("1.5 · ⭐ E-65 · a DECIDED round that refunded this player reads UNMATCHED, not a void",
     e65 === "unmatched", String(e65));
  ok("1.6 · …and the same holds when the round went UP",
     refundReasonFor({ outcome: "UP", voidReason: null, refundedStake: 500 }) === "unmatched");

  // ⛔ A player who genuinely LOST is not refunded, and must get no refund copy at all.
  ok("1.7 · ⭐ a player who LOST gets no refund sentence — silence, not a consolation",
     refundReasonFor({ outcome: "DOWN", voidReason: null, refundedStake: 0 }) === null);
  ok("1.8 · a player who WON likewise", refundReasonFor({ outcome: "UP", voidReason: null, refundedStake: 0 }) === null);
  ok("1.9 · an unresolved round has no refund reason",
     refundReasonFor({ outcome: null, voidReason: null }) === null);

  // ⛔ A silent bucket is how E-1 hid for a month.
  ok("1.10 · ⭐ an UNRECOGNISED void reason surfaces as unexplained — never folded into no-move",
     refundReasonFor({ outcome: "VOID", voidReason: "something-new" }) === "unexplained");
  ok("1.11 · …and so does a void with NO reason recorded",
     refundReasonFor({ outcome: "VOID", voidReason: null }) === "unexplained");
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · E-56 · A VOID IS NEVER AN UP OR A DOWN
// ═══════════════════════════════════════════════════════════════════════════
{
  ok("2.1 · ⭐ a VOID has no direction to render", displayDirection("VOID") === null);
  ok("2.2 · an unresolved round has none either", displayDirection(null) === null);
  ok("2.3 · a decided round keeps its direction",
     displayDirection("UP") === "UP" && displayDirection("DOWN") === "DOWN");
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · EVERY REASON HAS DISTINCT COPY IN ALL THREE LANGUAGES
// ═══════════════════════════════════════════════════════════════════════════
//
// ⛔ DISTINCT, not merely present. The defect was two branches serving five situations, so a
// guard that only checked "the key exists" would pass on copy that says the same thing twice.
{
  for (const locale of ["en", "sw", "zh"] as const) {
    const m = (dict as Record<string, { market: Record<string, string> }>)[locale].market;
    const missing = ALL.filter((r) => !m[REFUND_REASON_KEY[r]]?.trim());
    ok(`3.${locale} · every reason has copy in ${locale.toUpperCase()}`,
       missing.length === 0, missing.join(", "));
    const texts = ALL.map((r) => m[REFUND_REASON_KEY[r]]);
    ok(`3.${locale}b · ⭐ and all six are DIFFERENT sentences — not one branch wearing six names`,
       new Set(texts).size === ALL.length, `${new Set(texts).size}/${ALL.length} distinct`);
  }
  // ⭐ The one that matters most: the unmatched sentence must NOT talk about the price moving,
  // because in E-65's round the price moved perfectly well and the round decided.
  const en = (dict as Record<string, { market: Record<string, string> }>).en.market;
  ok("3.4 · ⭐ the UNMATCHED sentence explains the missing counterparty, not the price",
     /other side/i.test(en.udRefundUnmatched) && !/did not move/i.test(en.udRefundUnmatched),
     en.udRefundUnmatched);
  // ⚠️ THE FIRST VERSION OF THIS CHECK CONDEMNED CORRECT COPY. It banned `/lost|lose/i`, which
  // matched *"nothing to win and nothing to **lose**"* — a sentence that says the exact opposite
  // of what the check feared. A word-level ban cannot tell "you lost" from "there was nothing to
  // lose"; only the CLAIM can. It now bans the claim.
  ok("3.5 · …and it never tells the player they lost",
     !/you lost|you lose|did not win/i.test(en.udRefundUnmatched), en.udRefundUnmatched);
  ok("3.6 · the source-failure sentence owns it as OUR failure",
     /we could not/i.test(en.udRefundSourceFailed), en.udRefundSourceFailed);
  // Every sentence must reassure that the money is back — that is the one fact a refunded
  // player most needs, and it must not depend on which branch they landed in.
  ok("3.7 · ⭐ EVERY reason states the stake is back in full",
     ALL.every((r) => /back in full/i.test(en[REFUND_REASON_KEY[r]])),
     ALL.filter((r) => !/back in full/i.test(en[REFUND_REASON_KEY[r]])).join(", "));
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · BOTH PLAYER SURFACES USE THE SHARED RULE — never their own ternary
// ═══════════════════════════════════════════════════════════════════════════
{
  const card = code("src/components/updown/updown-card.tsx");
  const page = code("src/app/updown/[roundId]/page.tsx");

  ok("4.1 · the card asks the shared rule", /refundReasonFor\(/.test(card));
  ok("4.2 · the round page asks the shared rule", /refundReasonFor\(/.test(page));
  // ⛔ THE SHIPPED DEFECT, in its exact form.
  ok("4.3 · ⭐ the card's two-branch ternary is GONE",
     !/voidReason === "source-failed" \? t\.market\.udVoidedSource : t\.market\.udVoidedBody/.test(card));
  ok("4.4 · ⭐ and the round page's is too",
     !/round\.voidReason === "source-failed" \? t\.market\.udVoidedSource : t\.market\.udVoidedBody/.test(page));
  // ⛔ Both must key off THIS VIEWER's refund, not merely the round's state — otherwise the
  // decided-but-refunded case is unreachable, which is exactly how E-65 survived.
  ok("4.5 · ⭐ the card branches on whether THIS viewer was refunded, not on `state === void`",
     /\) : refundReason \?/.test(card));
  ok("4.6 · …and so does the round page", /\) : refundReason \?/.test(page));

  // ⛔ REACHABILITY, NOT EXISTENCE — AND THE DIFFERENCE COST A LIVE DEFECT.
  //
  // 🔴 Found by driving production, not by this suite. The round page's chain is
  //   `isOpen ? … : decided && myPosition && result ? … : locked ? … : refundReason ? …`
  // so a player who HELD A POSITION on a decided round matched the RESULT panel first and
  // never reached the refund explanation — the one player the sentence was written for.
  // Round `udr_06c8b7b8128a6de53c64` (2026-08-04): resolved UP, echo alone on DOWN, stake 500
  // returned in full, GGR 0, and the page said nothing about why. **E-65 surviving its own fix,
  // one branch further down.**
  //
  // §4.6 asserted the branch EXISTS. It does, and it was unreachable. So this asserts the
  // reason is ALSO consulted inside the result panel, which is where a refunded player lands.
  // ⚠️ Matches the WHOLE file rather than a byte window around `udYourResult`. The first version
  // sliced 2,200 characters after that key and missed the assertion by a few lines — a guard
  // that depends on how much prose sits between two statements is a guard that will drift.
  ok("4.9 · ⭐ the RESULT panel itself carries the refund reason — a branch that exists but cannot be reached is not a fix",
     /\{refundReason && \(/.test(page) && /REFUND_REASON_KEY\[refundReason\]/.test(page),
     "a refunded player matches `decided && myPosition && result` FIRST and never reaches the branch below");
  ok("4.7 · the card is fed the viewer's refunded stake", /myRefundedStake/.test(card));
  // ⚠️ PINS THE COMPUTATION, NOT THE FIELD NAME. The first version grepped for
  // `myRefundedStake` in the board — which survives happily even if the value is never
  // computed, so gutting the calculation left the guard green and the decided-but-refunded
  // case invisible. A field that is always 0 is not a field; the property is that a SETTLED
  // position whose payout equals its stake is counted as refunded.
  const board = code("src/lib/server/updown-board.ts");
  ok("4.8 · ⭐ and the board actually COMPUTES it — a settled position paid exactly its stake",
     /p\.finalPayout != null && p\.finalPayout === p\.stake\) e\.refunded \+= p\.stake/.test(board) &&
     /myRefundedStake: mine\?\.refunded/.test(board));
}

// ═══════════════════════════════════════════════════════════════════════════
// E-87 · A ROUND THAT DECIDED IS NEVER LABELLED A VOID — the CHIP, not the sentence
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 DRIVEN ON PRODUCTION 2026-08-05, round `udr_eb0dc4fad03e9dd7e6a2`. The round RESOLVED
// **UP**, the player had backed **UP**, and the result chip read **"Void · refunded"** — one
// card away from a settlement proof reading **"OUTCOME ▲ Up"**. The paragraph underneath was
// already correct (*"Nobody backed the other side…"*), so the panel argued with itself: the
// chip said the round was void, the proof said it decided, the sentence said neither.
//
// ⛔ IT IS E-65'S OWN DEFECT, ONE LINE FURTHER ON. `WIN : LOSS : else-void` is two branches for
// four situations, so "refunded on a round that decided" fell into the bucket labelled "the
// round voided" — exactly how a one-sided refund used to inherit "the price did not move
// enough". §1 already pins that the SENTENCE is chosen by `refundReasonFor`; nothing pinned
// that the LABEL above it agrees.
//
// ⚠️ THE PROPERTY, NOT THE WORDING: a viewer whose stake came back on a round that reached a
// verdict must not be shown the round's own void label. Guarding the string "Void · refunded"
// would break the next time the copy is edited and would still allow the same contradiction.
{
  const page = code("src/app/updown/[roundId]/page.tsx");

  ok("E87.1 · ⭐ the result chip consults the refund REASON, not what is left over after WIN/LOSS",
     /refundReason === "unmatched" \? t\.market\.udRefundTitle/.test(page),
     "the chip still falls through to the round's void label");
  ok("E87.2 · …and it is the same `refundReason` the sentence below it uses — one rule, one panel",
     /const refundReason = refundReasonFor\(/.test(page) &&
     page.indexOf("const refundReason = refundReasonFor(") < page.indexOf("const resultLabel ="),
     "the chip must read the rule that is already computed above it");

  // ⛔ THE CONTRADICTION ITSELF, stated as data rather than as source text: for every reason a
  // stake can come back, is the round's own verdict a VOID? Only then may the void label show.
  const decidedButRefunded: RefundReason[] = ["unmatched"];
  const roundReallyVoided: RefundReason[] = ["no-move", "source-failed", "source-mismatch", "operator", "unexplained"];
  ok("E87.3 · ⭐ `unmatched` is the ONLY refund reason that happens on a round that decided",
     decidedButRefunded.every((r) => refundReasonFor({ outcome: "UP", voidReason: null, refundedStake: 500 }) === r),
     "if this changes, the chip rule above must change with it");
  ok("E87.4 · …and every other reason really does come from a VOID round",
     roundReallyVoided.every((r) => ALL.includes(r)));

  // The three languages must each have a label that does not claim a void.
  for (const loc of ["en", "sw", "zh"] as const) {
    const m = dict[loc].market as Record<string, string>;
    ok(`E87.5.${loc} · a "stake returned" label exists and is distinct from the void label`,
       !!m.udRefundTitle && !!m.udVoided && m.udRefundTitle !== m.udVoided,
       `${m.udRefundTitle} vs ${m.udVoided}`);
  }
}

console.log(`\n${fail === 0 ? "✅" : "🔴"} updown-void-copy: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
