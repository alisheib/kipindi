/**
 * THE APPROVAL BURST MUST NOT PROMISE WHAT THE NEXT BANNER REFUSES.
 *
 * Campaign §6 E-5, found by LOOKING at two live screenshots taken 90 seconds
 * apart (`p2-alpha-player-kyc-430.png`, `p2-alpha-wallet-deposit-430b.png`).
 *
 * `/profile/kyc` showed the gold "ID verified" reward burst reading
 *
 *     "You can now deposit and withdraw freely."
 *
 * and it was wrong TWICE, on the one screen a player is proudest of:
 *
 *   1. DEPOSITS WERE NEVER GATED ON KYC. The product ladder is
 *      browse free → verify email to deposit → KYC to withdraw
 *      (`wallet/deposit/page.tsx`, the EMAIL GATE block). So approval did not
 *      unlock depositing — and the burst rendered *directly beneath* the very
 *      banner telling the player to confirm their email before adding money.
 *      `/wallet/deposit` then does block on exactly that.
 *   2. WITHDRAWALS CARRY A SECOND GATE. When the payout provider cannot pay,
 *      `payoutsAcceptingRequests` is false and `/wallet/withdraw` refuses the
 *      request outright ("Withdrawals cannot be paid right now"). That is the
 *      live state of the platform as this was written.
 *
 * Same family as D-1 and D-2: telling a player something about their own
 * verification that the product does not support. Cheaper, because no money or
 * audit record moved — but it lands on the celebration screen, which is exactly
 * where a player decides whether to trust us.
 *
 * The rule this pins: the burst states only what approval ACTUALLY unlocked,
 * and it ASKS the live payout gate rather than assuming it.
 */
import { readFileSync } from "node:fs";
import { dict } from "../src/lib/i18n-dict.ts";
import { payoutsAcceptingRequests } from "../src/lib/server/payout-status.ts";
import { decomment as stripComments } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 56 - s.length))}`);

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const KYC_PAGE_RAW = read("../src/app/profile/kyc/page.tsx");
const DEPOSIT_RAW = read("../src/app/wallet/deposit/page.tsx");
const WALLET = read("../src/lib/server/wallet-service.ts");     // the enforcement, not the page
const MARKET = read("../src/lib/server/market-service.ts");
// The identity seam itself (2026-09-05). `GATE` answers WHICH question each money action
// asks; `KYC_SERVICE` is where the first-approval stamp is written and preserved. Both are
// money-safety surfaces in their own right, so both are read here rather than inferred.
const GATE = read("../src/lib/server/kyc-gate.ts");
const KYC_SERVICE = read("../src/lib/server/kyc-service.ts");
const RAIL_RAW = read("../src/app/admin/kyc/[id]/kyc-decision-rail.tsx");
const KYC_PAGE = stripComments(KYC_PAGE_RAW);
const DEPOSIT = stripComments(DEPOSIT_RAW);
// 🔴 THE RAIL IS NOW STRIPPED TOO, AND IT SHOULD HAVE BEEN ALL ALONG. §7's "dead promise"
// assertions run against this file, and the fix's own comment deliberately QUOTES the wrong
// sentence so the next reader knows what was wrong — exactly as §4 already says of the page.
// Unstripped, that assertion passed only because the old comment happened to WRAP the quoted
// string across two lines, putting a newline inside the regex's literal. Reflowing a comment
// would have reddened it; quoting the string on one line did, on 2026-08-20. What must not
// survive is a RENDERED promise, never a documented one.
const RAIL_S = stripComments(RAIL_RAW);

const LOCALES = ["en", "sw", "zh"] as const;

// ── 1 · The burst NAMES depositing, in every language ───────────────────────
// 🔴 INVERTED 2026-09-05. This required the burst NOT to mention depositing, because
// approval did not unlock it — promising it was E-5, a screen claiming what the next one
// refuses. Approval now unlocks depositing, playing and cashing out, so the same sentence
// that was a lie is the truth, and OMITTING it is the new understatement.
// ⭐ The per-locale discipline is unchanged and is the reason this section exists: the
// original defect was invisible in review precisely by being in a language the reviewer
// did not read, so each locale is checked with its OWN term rather than one shared regex.
// ⚠️ AND THE ENGLISH TERM HAD TO WIDEN. The old pattern was `/deposit/i`; the player-facing
// copy says "add money", which is better English and which that pattern cannot see — so on
// the first run after the inversion, EN passed while SW and ZH failed. A locale passing
// because the checker cannot read its wording is the exact failure this section is about.
section("1 · every locale names what approval unlocks");

const DEPOSIT_WORDS: Record<(typeof LOCALES)[number], RegExp> = {
  en: /deposit|add money/i,
  sw: /kuweka/i,   // "kuweka pesa" — to put money in
  zh: /充值/,       // top up
};

for (const loc of LOCALES) {
  const body = dict[loc].profile.kycApprovedBody as string;
  ok(`${loc}: the burst names depositing`, DEPOSIT_WORDS[loc].test(body), body);
}

// "freely" was the second half of the lie — nothing about this is free of gates.
const FREELY_WORDS: Record<(typeof LOCALES)[number], RegExp> = {
  en: /freely/i,
  sw: /uhuru/i,
  zh: /自由/,
};
for (const loc of LOCALES) {
  const body = dict[loc].profile.kycApprovedBody as string;
  ok(`${loc}: the burst does not claim it is unrestricted`, !FREELY_WORDS[loc].test(body), body);
}

// ── 2 · Both bodies exist and are real translations in all three locales ───
section("2 · three locales, both states");

for (const loc of LOCALES) {
  const p = dict[loc].profile as Record<string, unknown>;
  ok(`${loc}: kycApprovedBody present`, typeof p.kycApprovedBody === "string" && (p.kycApprovedBody as string).length > 10);
  ok(`${loc}: kycApprovedPayoutsPaused present`, typeof p.kycApprovedPayoutsPaused === "string" && (p.kycApprovedPayoutsPaused as string).length > 10);
}

// A copy-paste of the English string into sw/zh is how E-6 reached a Swahili
// player, so require the translations to actually differ from English.
for (const loc of ["sw", "zh"] as const) {
  ok(`${loc}: kycApprovedBody is translated, not the English string`,
    dict[loc].profile.kycApprovedBody !== dict.en.profile.kycApprovedBody);
  ok(`${loc}: kycApprovedPayoutsPaused is translated, not the English string`,
    (dict[loc].profile as Record<string, unknown>).kycApprovedPayoutsPaused !== (dict.en.profile as Record<string, unknown>).kycApprovedPayoutsPaused);
}

// ── 3 · The paused copy tells the truth about the money ────────────────────
// A player being told "paused" must also be told their balance is intact,
// otherwise "we cannot pay you" reads as "your money is gone".
section("3 · the paused state reassures about the balance");

const BALANCE_SAFE: Record<(typeof LOCALES)[number], RegExp> = {
  en: /balance is safe/i,
  sw: /salio lako ni salama/i,
  zh: /余额安全/,
};
for (const loc of LOCALES) {
  const paused = (dict[loc].profile as Record<string, string>).kycApprovedPayoutsPaused;
  ok(`${loc}: the paused burst says the balance is safe`, BALANCE_SAFE[loc].test(paused), paused);
}

// ── 4 · The page ASKS the gate — it does not assume it ─────────────────────
section("4 · the burst is bound to the live payout gate");

// Comments are stripped first on purpose: the fix's own comment QUOTES the old
// string so the next reader knows what was wrong, and that is worth keeping.
// What must not survive is a rendered one.
ok("🔴 the dead promise is gone from the page",
  !/deposit and withdraw freely/i.test(KYC_PAGE),
  "the literal string that shipped");

ok("the page imports the payout gate",
  /import \{ getPayoutStatus, payoutsAcceptingRequests \} from "@\/lib\/server\/payout-status"/.test(KYC_PAGE_RAW));
ok("…and calls it", /payoutsAcceptingRequests\(\(await getPayoutStatus\(\)\)\.status\)/.test(KYC_PAGE));
ok("the burst picks its body from that gate",
  /payoutsAccepting \? t\.profile\.kycApprovedBody : t\.profile\.kycApprovedPayoutsPaused/.test(KYC_PAGE));

// An unreachable DB is not evidence that payouts are down — claiming a pause we
// cannot substantiate is the same class of defect, pointing the other way.
ok("an unreadable gate defaults to accepting, not to a claimed pause",
  /let payoutsAccepting = true;/.test(KYC_PAGE),
  "matches derivePayoutStatus's own catch, which returns `operational`");

// ── 5 · The premise the copy rests on ──────────────────────────────────────
// If deposits are ever gated on KYC, "approval unlocks withdrawals" becomes an
// understatement and this copy needs revisiting. Pin the ladder so that change
// cannot happen silently.
section("5 · the ladder the copy describes");

// 🔴 INVERTED AGAIN 2026-09-05 — SECOND TIME, OPPOSITE DIRECTION, SAME DISCIPLINE.
// On 2026-08-20 this section was flipped to prove the withdrawal identity gate was GONE
// (Board comment #1). The owner has now ruled that identity precedes deposit, play AND
// withdrawal — a control stricter than the Board required, disclosed rather than slipped
// in (`docs/COMPLIANCE-DECISIONS.md`). So the assertions MOVE a second time. They do not
// go away: on the money path, at the exact moment behaviour changes, is when the platform
// can least afford to have no proof either way.
// ⛔ The dates are the point. Anyone reading only one of the two entries will "fix" this
// file back to the other one.
ok("the deposit page gates on identity", /kycEligible|kycApproved/.test(DEPOSIT),
  "the deposit form must not be reachable by an unverified player");
ok("…and it still gates on email verification too", /const emailVerified = !!user\?\.emailVerifiedAt;/.test(DEPOSIT),
  "Ali 2026-09-05: keep both, running independently — neither folded into the other");

// The page is presentation; the SERVICE is enforcement. Pin the real thing, because
// that is what makes the claim true or false.
const WALLET_CODE = stripComments(WALLET);
ok("🔴 the deposit SERVICE enforces identity AND email",
  /assertKycForMoney\(userId, "DEPOSIT"\)/.test(WALLET_CODE) && /if \(!depositor\?\.emailVerifiedAt\)/.test(WALLET_CODE));
// ⛔ ORDER, NOT JUST PRESENCE. A responsible-gambling break outranks every trust-ladder
// door: a self-excluded player must be told about their OWN break, which carries an end
// date, not sent off on an identity errand. Before 2026-09-05 the email gate sat ABOVE
// the lockout check while its own comment claimed it sat below — nothing measured the
// sequence, so the code and its comment disagreed silently for as long as both existed.
{
  const iLock = WALLET_CODE.indexOf("deposit.lockout_blocked");
  const iKyc = WALLET_CODE.indexOf('assertKycForMoney(userId, "DEPOSIT")');
  const iMail = WALLET_CODE.indexOf("deposit.email_unverified_blocked");
  ok("🔴 …in the order RG lockout → identity → email",
    iLock > 0 && iKyc > iLock && iMail > iKyc,
    `lockout@${iLock} kyc@${iKyc} email@${iMail}`);
}
ok("🔴 the withdraw SERVICE refuses on identity again",
  /assertKycForMoney\(userId, "WITHDRAW"\)/.test(WALLET_CODE) && /withdraw\.kyc_blocked/.test(WALLET_CODE),
  "the gate is missing — every 'what approval unlocks' string on the player's screen is then false");
// 🔴 THE HALF THAT IS EASY TO GET WRONG, AND THE ONLY REASON MONEY IS NOT TRAPPED.
// Withdrawal asks whether the account was EVER approved, not whether it is approved NOW.
// `forceReverifyKyc` moves an APPROVED player to ADDITIONAL_INFO_REQUIRED while they hold
// real money earned under an identity we accepted; asking current status would freeze it.
ok("🔴 …asking `approvedAt`, NEVER the current status",
  /if \(k\?\.approvedAt\) return \{ eligible: true \}/.test(stripComments(GATE))
  && !/status === "APPROVED"[\s\S]{0,120}WITHDRAW/.test(stripComments(GATE)),
  "gate the payout on current status and a re-verified player is locked out of their own money");
ok("🔴 …and the first-approval stamp is never cleared",
  /approvedAt: k\.approvedAt \?\? now/.test(stripComments(KYC_SERVICE))
  && /approvedAt: existing\?\.approvedAt \?\? null/.test(stripComments(KYC_SERVICE)),
  "re-stamping on re-approval, or dropping it in startKyc's reset, re-opens the money trap");
ok("🔴 …but it STILL READS identity, because the record depends on it",
  /db\.kyc\.findByUserId\(userId\)/.test(WALLET_CODE) && /kycStatus\s*=\s*kyc\?\.status/.test(WALLET_CODE),
  "without this read the platform cannot answer 'which payouts went to unverified accounts?'");
ok("🔴 …and EVERY withdrawal is stamped with it",
  /action:\s*"withdraw\.initiated"[\s\S]{0,400}?kycStatus/.test(WALLET_CODE),
  "a stamp missing from withdraw.initiated makes its own absence ambiguous");
ok("🔴 …and an unverified payer produces an AWAITED compliance fact carrying the txn",
  /await audit\(\{[\s\S]{0,600}?action:\s*"withdraw\.unverified_payer"[\s\S]{0,600}?targetId:\s*txnId/.test(WALLET_CODE),
  "not awaited, or not carrying txnId, and the record cannot be joined to the payout it explains");
// 🔴 STRIPPED 2026-08-27, NOT RELAXED. This read the RAW file, and the E-238 cooling-off fix
// (`f52a357a`, 2026-08-27) added a COMMENT at `market-service.ts:926` explaining why that fix is
// read-only — *"a `PENDING_KYC` player would be silently upgraded"*. One word of prose, inside the
// paragraph documenting an unrelated repair, reddened the money-copy suite. That is precisely
// `decomment.mts`'s own stated reason for existing: a guard that greps raw text matches the
// paragraph explaining the fix instead of the fix. What must not exist is a KYC GATE on play,
// never a documented mention of a status enum — the distinction §7's rail already draws.
// ⭐ CONTROLLED, not assumed: with comments stripped this still goes RED for a
// `db.kyc.findByUserId` read AND for `u.status === "PENDING_KYC"` joining the blocked-status
// branch — the two ways play could actually become identity-gated. It lost reach over prose only.
// 🔴 INVERTED 2026-09-05. Until this date `PENDING_KYC` could stake freely and
// `auth/register/actions.ts` said so in as many words. Play is now identity-gated, so the
// assertion flips from "carries no KYC reference" to "refuses, and refuses in the right
// PLACE". Presence alone would be satisfied by a gate that never fires.
// ⭐ The stripComments() discipline stays for the reason recorded above: on 2026-08-27 one
// word of prose in an unrelated repair reddened this suite.
{
  const MARKET_CODE = stripComments(MARKET);
  ok("🔴 play IS gated on identity",
    /assertKycForMoney\(userId, "BET"\)/.test(MARKET_CODE) && /bet\.kyc_blocked/.test(MARKET_CODE),
    "an unverified player can stake — the approval burst then over-promises nothing, it under-states everything");
  // ⛔ BELOW the account-status block, ABOVE the market read. Below, so a self-excluded
  // player hears about their own break rather than an identity errand. Above, so a refused
  // stake never loads a market or reaches the wallet.
  //
  // ⚠️ SCOPED TO `buyPositionInner` FIRST, AND THE UNSCOPED DRAFT FAILED AGAINST CORRECT
  // CODE. `marketStore.get(opts.marketId)` appears in an EARLIER function in this file, so
  // a whole-file `indexOf` reported the market being loaded at 4107 — before a gate at
  // 18791 — and called a right answer wrong. An ordering assertion has to be made inside
  // the one function whose ordering it is talking about.
  const fnStart = MARKET_CODE.indexOf("async function buyPositionInner");
  const body = fnStart >= 0 ? MARKET_CODE.slice(fnStart) : "";
  const iBlocked = body.indexOf('reason: "account_blocked"');
  const iKyc = body.indexOf('assertKycForMoney(userId, "BET")');
  const iMarket = body.indexOf("await marketStore.get(opts.marketId)");
  ok("🔴 …after the RG/status block and before the market is loaded",
    fnStart > 0 && iBlocked > 0 && iKyc > iBlocked && iMarket > iKyc,
    `fn@${fnStart} blocked@${iBlocked} kyc@${iKyc} market@${iMarket}`);
}

// ── 7 · The officer is told the same truth as the player (E-9) ──────────────
section("7 · the officer's confirm dialog");

ok("🔴 the approve dialog no longer claims it unlocks deposits or play",
  !/unlocks full real-money deposits, play and withdrawals/.test(RAIL_S),
  "the officer-facing twin of E-5 — misstating a compliance action to the accountable officer");
// 🔴 INVERTED 2026-08-20. This REQUIRED the dialog to say approval "opens the withdrawal
// gate". True when written; false from the moment the gate came out — and a green suite
// holding a false statement in front of the accountable compliance officer, at the instant
// they make the decision, is the officer-facing twin of E-5 that this very section exists to
// catch. So the requirement is reversed and replaced with what approval actually does.
ok("🔴 the approve dialog no longer claims it opens a withdrawal gate",
  !/opens the <strong>withdrawal<\/strong> gate/.test(RAIL_S),
  "approval opens nothing in the money path since 2026-08-20");
ok("…and it says plainly that no money gate turns on this decision",
  /does <strong>not<\/strong> open any money gate/.test(RAIL_S),
  "an officer must not infer a consequence the code does not have");
ok("…and it still names what approval DOES do — record an identity, bind the document",
  /binds this document to this account/.test(RAIL_S) && /verified/.test(RAIL_S));
// ⭐ CONTROL · the three assertions above read a real file, not an empty string. If `RAIL_S`
// ever failed to load, every `!/…/` above would pass vacuously.
ok("§7.control · the rail source actually loaded",
  RAIL_S.length > 2_000 && /Approve identity/.test(RAIL_S));

// ── 6 · The gate's meaning, straight from the source ───────────────────────
// The whole conditional hangs on what `unavailable` means. Pin it.
section("6 · payoutsAcceptingRequests semantics");

ok("`unavailable` does not accept requests", payoutsAcceptingRequests("unavailable") === false);
ok("`operational` accepts requests", payoutsAcceptingRequests("operational") === true);
ok("`delayed` still accepts requests", payoutsAcceptingRequests("delayed") === true,
  "a slow payout is not a refused one — the burst should not claim a pause");

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
