/**
 * WHAT APPROVAL UNLOCKS — said once, truthfully, to the player and to the officer.
 *
 * Campaign §6 E-5, found by LOOKING at two live screenshots taken 90 seconds apart
 * (`p2-alpha-player-kyc-430.png`, `p2-alpha-wallet-deposit-430b.png`). `/profile/kyc` showed the gold
 * "ID verified" reward burst reading *"You can now deposit and withdraw freely."* — directly beneath a
 * banner telling the same player to confirm their email before adding money. It credited approval
 * with a door approval had nothing to do with, on the one screen a player is proudest of.
 *
 * ── THE LADDER THIS COPY DESCRIBES (owner ruling, Ali, 2026-09-13) ─────────────────────────────────
 *
 *     register → confirm email → deposit and play → verify identity → withdraw
 *
 * Identity is asked before a WITHDRAWAL and before nothing else (`src/lib/server/kyc-gate.ts`;
 * docs/COMPLIANCE-DECISIONS.md, the top 2026-09-13 entries). So approval unlocks exactly one thing,
 * and every sentence approval produces names that one thing and nothing else — identity attached
 * forward, to the exit, never backward to the entrance.
 *
 * ⛔ READ THE DATES. This file has moved with the product every time, on the day it moved:
 *   · before 2026-08-20 — the burst had to name withdrawals and NOT depositing (E-5);
 *   · 2026-08-20 — the Board removed the withdrawal gate; the officer's dialog had to say that no money
 *     gate turned on approval;
 *   · 2026-09-05 — identity gated deposit, play AND withdrawal; the burst had to NAME depositing;
 *   · 2026-09-13 — identity gates withdrawal only; the burst names withdrawals and must NOT name
 *     depositing or playing, and the services must have exactly that shape.
 * Anyone reading only one of those entries will "fix" this file back to it.
 *
 * The rules this pins: the burst states only what approval ACTUALLY unlocks (§1–§3), it ASKS the live
 * payout gate rather than assuming it (§4, §6), the enforcement really has the ladder's shape (§5),
 * and the accountable officer is told the same truth at the moment of decision (§7).
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
// The ENFORCEMENT, not the pages. Each is read because each is a money path in its own right.
const WALLET_CODE = stripComments(read("../src/lib/server/wallet-service.ts"));
const MARKET_CODE = stripComments(read("../src/lib/server/market-service.ts"));
const UPDOWN_CODE = stripComments(read("../src/lib/server/updown-service.ts"));
// The identity seam itself. `GATE` is the one question; `APPROVAL` is the predicate it asks;
// `KYC_SERVICE` is where the first-approval stamp is written and preserved.
const GATE_CODE = stripComments(read("../src/lib/server/kyc-gate.ts"));
const APPROVAL_CODE = stripComments(read("../src/lib/kyc-approval.ts"));
const KYC_SERVICE_CODE = stripComments(read("../src/lib/server/kyc-service.ts"));
const RAIL_RAW = read("../src/app/admin/kyc/[id]/kyc-decision-rail.tsx");
const KYC_PAGE = stripComments(KYC_PAGE_RAW);
const DEPOSIT = stripComments(DEPOSIT_RAW);
// 🔴 THE RAIL IS STRIPPED TOO. Its fix-comments deliberately QUOTE the wrong sentences so the next
// reader knows what was wrong. Unstripped, an assertion once passed only because an old comment
// happened to WRAP a quoted string across two lines; quoting it on one line reddened it (2026-08-20).
// What must not survive is a RENDERED promise, never a documented one.
const RAIL_S = stripComments(RAIL_RAW);

const LOCALES = ["en", "sw", "zh"] as const;
type Loc = (typeof LOCALES)[number];

/** One top-level function's body — from its head to the next top-level function in the file. */
const bodyOf = (src: string, head: string): string => {
  const i = src.indexOf(head);
  if (i < 0) return "";
  const next = src.slice(i + head.length).search(/\n(?:export\s+)?(?:async\s+)?function\s/);
  return next < 0 ? src.slice(i) : src.slice(i, i + head.length + next);
};

// ── 1 · The burst names the ONE thing approval unlocks, in every language ────
section("1 · every locale names withdrawals — and nothing on the way in");

// 🔴 INVERTED 2026-09-13 — THE THIRD TIME. On 2026-09-05 this REQUIRED the burst to name depositing,
// because approval then unlocked it. From 2026-09-13 approval unlocks withdrawal alone, so naming
// depositing or playing is E-5 again: a screen crediting approval with a door that was never shut.
// ⭐ The per-locale discipline is the reason this section exists: the original defect was invisible in
// review by being in a language the reviewer did not read, so each locale is checked with its OWN terms.
// ⚠️ The EN money-in pattern carries "add money" as well as "deposit": on 2026-09-05 a pattern that
// could only see "deposit" passed EN while SW and ZH failed.
const WITHDRAW_WORDS: Record<Loc, RegExp> = {
  en: /withdraw/i,
  sw: /utoaji|kutoa/i,     // "utoaji wa pesa" / "kutoa pesa" — taking money out
  zh: /提现/,               // withdraw
};
const MONEY_IN_OR_PLAY: Record<Loc, RegExp> = {
  en: /deposit|add money|top up|\bplay(?:ing)?\b|\bbets?\b|\bstakes?\b/i,
  sw: /kuweka|weka pesa|kucheza|\bdau\b|kubashiri|ubashiri/i,
  zh: /充值|存款|存入|下注|投注|游戏/,
};
for (const loc of LOCALES) {
  const body = dict[loc].profile.kycApprovedBody as string;
  ok(`${loc}: the burst names withdrawals`, WITHDRAW_WORDS[loc].test(body), body);
  ok(`${loc}: ⛔ the burst does not name depositing or playing`, !MONEY_IN_OR_PLAY[loc].test(body), body);
  const paused = (dict[loc].profile as Record<string, string>).kycApprovedPayoutsPaused;
  ok(`${loc}: the paused burst names withdrawals too`, WITHDRAW_WORDS[loc].test(paused), paused);
  ok(`${loc}: ⛔ …and does not name depositing or playing either`, !MONEY_IN_OR_PLAY[loc].test(paused), paused);
  // 2026-09-14 — the third body: an approved identity over a HELD wallet (officer hold, self-exclusion).
  const held = (dict[loc].profile as Record<string, string>).kycApprovedWalletHeld;
  ok(`${loc}: the held-wallet burst names withdrawals too`, typeof held === "string" && WITHDRAW_WORDS[loc].test(held), held);
  ok(`${loc}: ⛔ …and the held-wallet burst does not name depositing or playing`, typeof held === "string" && !MONEY_IN_OR_PLAY[loc].test(held), held);
}
// ⭐ CONTROL · the money-in checker must SEE the wording it forbids, in each language — otherwise the
// negatives above pass because the pattern is blind, which is exactly how EN passed on 2026-09-05.
const MONEY_IN_SHAPE: Record<Loc, string> = {
  en: "Your identity is verified. You can now add money, play and withdraw.",
  sw: "Utambulisho wako umethibitishwa. Sasa unaweza kuweka pesa, kucheza na kutoa pesa.",
  zh: "您的身份已验证。您现在可以充值、下注和提现。",
};
for (const loc of LOCALES) {
  ok(`control · ${loc}: the checker catches a burst that names money going in`, MONEY_IN_OR_PLAY[loc].test(MONEY_IN_SHAPE[loc]));
}

// "freely" was the second half of the E-5 lie — nothing about this is free of gates.
const FREELY_WORDS: Record<Loc, RegExp> = { en: /freely/i, sw: /uhuru/i, zh: /自由/ };
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
// A copy-paste of the English string into sw/zh is how E-6 reached a Swahili player.
for (const loc of ["sw", "zh"] as const) {
  ok(`${loc}: kycApprovedBody is translated, not the English string`,
    dict[loc].profile.kycApprovedBody !== dict.en.profile.kycApprovedBody);
  ok(`${loc}: kycApprovedPayoutsPaused is translated, not the English string`,
    (dict[loc].profile as Record<string, unknown>).kycApprovedPayoutsPaused !== (dict.en.profile as Record<string, unknown>).kycApprovedPayoutsPaused);
}

// ── 3 · The paused copy tells the truth about the money ────────────────────
// A player told "paused" must also be told their balance is intact, or "we cannot pay you"
// reads as "your money is gone".
section("3 · the paused state reassures about the balance");

const BALANCE_SAFE: Record<Loc, RegExp> = {
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

ok("🔴 the dead promise is gone from the page",
  !/deposit and withdraw freely/i.test(KYC_PAGE),
  "the literal string that shipped");
ok("the page imports the payout gate",
  /import \{ getPayoutStatus, payoutsAcceptingRequests \} from "@\/lib\/server\/payout-status"/.test(KYC_PAGE_RAW));
ok("…and calls it", /payoutsAcceptingRequests\(\(await getPayoutStatus\(\)\)\.status\)/.test(KYC_PAGE));
ok("the burst picks its body from that gate",
  /payoutsAccepting \? t\.profile\.kycApprovedBody : t\.profile\.kycApprovedPayoutsPaused/.test(KYC_PAGE));
// 2026-09-14 — A HELD WALLET refuses a withdrawal whatever the identity says (officer hold, self-exclusion), so the
// approved card must not promise one. It reads the wallet exactly as /wallet/withdraw does, and the held sentence
// wins over both payout sentences.
ok("🔴 a held wallet never gets the withdrawal promise — the page reads the wallet's own status",
  /walletHeld = !!wallet && wallet\.status !== "ACTIVE"/.test(KYC_PAGE)
  && /walletHeld \? t\.profile\.kycApprovedWalletHeld : payoutsAccepting \? t\.profile\.kycApprovedBody : t\.profile\.kycApprovedPayoutsPaused/.test(KYC_PAGE));
ok("…and a failed wallet read keeps today's copy, not a claimed hold",
  /let walletHeld = false;/.test(KYC_PAGE));
// An unreachable DB is not evidence that payouts are down — claiming a pause we cannot substantiate
// is the same class of defect, pointing the other way.
ok("an unreadable gate defaults to accepting, not to a claimed pause",
  /let payoutsAccepting = true;/.test(KYC_PAGE),
  "matches derivePayoutStatus's own catch, which returns `operational`");

// ── 5 · The ladder, in the code that enforces it ───────────────────────────
section("5 · the ladder, in the services that enforce it");

// 🔴 INVERTED 2026-09-13. On 2026-09-05 this section required identity on the deposit page, in
// `deposit()`, in `buyPositionInner()` and in `withdraw()`. The owner's 2026-09-13 ruling deleted the
// first three — deleted, not disabled: `kyc-gate.ts` records why the function was RENAMED rather than
// narrowed. ⛔ The assertions MOVE, they do not go away: the moment a money gate changes shape is the
// moment the platform can least afford to have no proof either way.
// ⭐ The page is presentation; the service is enforcement. Both are pinned, because a page still drawing
// an identity wall over a service that no longer asks would be a wall the platform does not have.

/** Code that ASKS, or DRAWS, an identity question. The stamp that replaced the gates is not one. */
const IDENTITY_ASK = /\bassertIdentityForPayout\s*\(|\bassertKycForMoney\s*\(|reason:\s*["']kyc_|\bdb\.kyc\b|\bgetKycStatus\s*\(|\bkycGateState\s*\(|\bapprovedEver\s*\(|<KycGatePanel\b/;
ok("control · the identity-ask detector sees a restored gate, in each shape it could come back in",
  IDENTITY_ASK.test("const gate = await assertIdentityForPayout(userId);")
  && IDENTITY_ASK.test('return { ok: false, error: "x", reason: "kyc_not_verified" };')
  && IDENTITY_ASK.test("const k = await db.kyc.findByUserId(session.userId);")
  && IDENTITY_ASK.test("<KycGatePanel purpose=\"deposit\" />"));
ok("control · …and does NOT fire on the record that replaced the gates",
  !IDENTITY_ASK.test("const standing = await readIdentityStanding(userId);"));

// ── the deposit PAGE
ok("control · the deposit page source actually loaded", DEPOSIT.length > 2_000 && /depositAction/.test(DEPOSIT));
ok("🔴 the deposit page asks no identity question and draws no identity panel",
  !IDENTITY_ASK.test(DEPOSIT), (DEPOSIT.match(IDENTITY_ASK) ?? [""])[0]);
ok("…and it still gates on email verification, rendering the email door instead of the form",
  /const emailVerified = !!user\?\.emailVerifiedAt;/.test(DEPOSIT) && /<EmailVerifyGate\b/.test(DEPOSIT));

// ── the deposit SERVICE
const DEPOSIT_FN = bodyOf(WALLET_CODE, "export async function deposit(");
ok("control · deposit() was found and sliced", DEPOSIT_FN.length > 2_000 && DEPOSIT_FN.includes("deposit.initiated"), `len=${DEPOSIT_FN.length}`);
ok("🔴 deposit() asks no identity question", !IDENTITY_ASK.test(DEPOSIT_FN), (DEPOSIT_FN.match(IDENTITY_ASK) ?? [""])[0]);
ok("…and still refuses an unconfirmed email", /if \(!depositor\?\.emailVerifiedAt\)/.test(DEPOSIT_FN));
{
  // ⛔ ORDER, NOT JUST PRESENCE. A responsible-gambling break outranks every trust-ladder door: a
  // self-excluded player is told about their OWN break, which carries an end date, never sent on an
  // errand. Before 2026-09-05 the email gate sat above the lockout while its comment said below.
  const iLock = DEPOSIT_FN.indexOf("deposit.lockout_blocked");
  const iMail = DEPOSIT_FN.indexOf("deposit.email_unverified_blocked");
  const iReserve = DEPOSIT_FN.indexOf("withLock(`wallet:${userId}`");
  ok("🔴 …in the order RG lockout → email → (lock) caps + SOF",
    iLock > 0 && iMail > iLock && iReserve > iMail, `lockout@${iLock} email@${iMail} lock@${iReserve}`);
}
ok("⭐ …and every deposit is STAMPED with the account's identity standing — the record that replaced the gate",
  /readIdentityStanding\(userId\)/.test(DEPOSIT_FN)
  && /action:\s*"deposit\.initiated"[\s\S]{0,300}?kycStatus:\s*standing\.kycStatus[\s\S]{0,80}?everApproved:\s*standing\.everApproved/.test(DEPOSIT_FN),
  "without the stamp the platform cannot answer 'which deposits came from accounts we never verified?'");

// ── the withdraw SERVICE — the one place identity is asked
const WITHDRAW_FN = bodyOf(WALLET_CODE, "export async function withdraw(");
ok("control · withdraw() was found and sliced", WITHDRAW_FN.length > 2_000, `len=${WITHDRAW_FN.length}`);
ok("🔴 withdraw() asks the identity gate and refuses on its reason",
  /const withdrawGate = await assertIdentityForPayout\(userId\)/.test(WITHDRAW_FN)
  && /action:\s*"withdraw\.kyc_blocked"/.test(WITHDRAW_FN)
  && /reason:\s*withdrawGate\.reason/.test(WITHDRAW_FN),
  "the gate is missing — every 'what approval unlocks' string on the player's screen is then false");
{
  const iDest = WITHDRAW_FN.indexOf("payoutDestinationFor(");
  const iGate = WITHDRAW_FN.indexOf("assertIdentityForPayout(userId)");
  const iHold = WITHDRAW_FN.indexOf("db.wallet.adjust(");
  ok("🔴 …asked before any money moves — after the destination check, before the hold",
    iDest > 0 && iGate > iDest && iHold > iGate, `destination@${iDest} gate@${iGate} hold@${iHold}`);
}
ok("⛔ …and withdraw() is the gate's only caller in wallet-service",
  (WALLET_CODE.match(/\bassertIdentityForPayout\s*\(/g) ?? []).length === 1);
// 🔴 THE HALF THAT IS EASY TO GET WRONG, AND THE ONLY REASON MONEY IS NOT TRAPPED. Withdrawal asks
// whether the account was EVER approved, not whether it is approved NOW: `forceReverifyKyc` moves an
// APPROVED player to ADDITIONAL_INFO_REQUIRED while they hold money earned under an identity we accepted.
ok("🔴 the gate asks `approvedEver`, NEVER the current status alone",
  /if \(!approvedEver\(k\)\)/.test(GATE_CODE) && !/status\s*===\s*"APPROVED"/.test(GATE_CODE),
  "gate the payout on current status and a re-verified player is locked out of their own money");
ok("…and `approvedEver` is the stamp OR approved now — both halves demand an approval",
  /return !!facts\?\.approvedAt \|\| facts\?\.status === "APPROVED";/.test(APPROVAL_CODE));
ok("⛔ the gate carries no action parameter — no DEPOSIT or BET question left to answer 'yes' to",
  !/assertKycForMoney|"DEPOSIT"|"BET"/.test(GATE_CODE),
  "a gate that answers eligible:true for a deposit still reads like enforcement at every call site");
ok("🔴 …and the first-approval stamp is never cleared",
  /approvedAt: k\.approvedAt \?\? now/.test(KYC_SERVICE_CODE)
  && /approvedAt: existing\?\.approvedAt \?\? null/.test(KYC_SERVICE_CODE),
  "re-stamping on re-approval, or dropping it in startKyc's reset, re-opens the money trap");
ok("🔴 …and EVERY withdrawal is stamped with the identity status",
  /action:\s*"withdraw\.initiated"[\s\S]{0,400}?kycStatus/.test(WITHDRAW_FN),
  "a stamp missing from withdraw.initiated makes its own absence ambiguous");
ok("🔴 …and a payer not approved NOW produces an AWAITED compliance fact carrying the txn",
  /await audit\(\{[\s\S]{0,600}?action:\s*"withdraw\.unverified_payer"[\s\S]{0,600}?targetId:\s*txnId/.test(WITHDRAW_FN),
  "not awaited, or not carrying txnId, and the record cannot be joined to the payout it explains");

// ── play — both products
// ⭐ STRIPPED FIRST, for the reason recorded on 2026-08-27: one word of prose in an unrelated repair
// reddened this suite when it read the raw file. What must not exist is an identity question on play,
// never a documented mention of one.
{
  const INNER = bodyOf(MARKET_CODE, "async function buyPositionInner(");
  ok("control · buyPositionInner() was found and sliced", INNER.length > 2_000 && INNER.includes('reason: "account_blocked"'), `len=${INNER.length}`);
  ok("🔴 play asks no identity question", !IDENTITY_ASK.test(MARKET_CODE) && !/bet\.kyc_blocked/.test(MARKET_CODE),
    (MARKET_CODE.match(IDENTITY_ASK) ?? [""])[0]);
  ok("…and Up & Down's own service asks none either", !IDENTITY_ASK.test(UPDOWN_CODE), (UPDOWN_CODE.match(IDENTITY_ASK) ?? [""])[0]);
  ok("⭐ the identity standing is read exactly ONCE in market-service",
    (MARKET_CODE.match(/\breadIdentityStanding\s*\(/g) ?? []).length === 1);
  // ⚠️ SCOPED TO `buyPositionInner`. `marketStore.get(opts.marketId)` also appears in an earlier
  // function, and an ordering assertion has to be made inside the one function it is about.
  const iMarket = INNER.indexOf("await marketStore.get(opts.marketId)");
  const iStanding = INNER.indexOf("readIdentityStanding(userId)");
  const iOpened = INNER.indexOf('action: "market.position.opened"');
  ok("⭐ …on the COMMITTED path — after the market is loaded, stamped onto market.position.opened",
    iMarket > 0 && iStanding > iMarket && iOpened > iStanding
    && /kycStatus:\s*standing\.kycStatus[\s\S]{0,60}everApproved:\s*standing\.everApproved/.test(INNER.slice(iOpened, iOpened + 400)),
    `market@${iMarket} standing@${iStanding} opened@${iOpened}`);
}

// ── 6 · The payout gate's meaning, straight from the source ────────────────
// The whole conditional in §4 hangs on what `unavailable` means. Pin it.
section("6 · payoutsAcceptingRequests semantics");

ok("`unavailable` does not accept requests", payoutsAcceptingRequests("unavailable") === false);
ok("`operational` accepts requests", payoutsAcceptingRequests("operational") === true);
ok("`delayed` still accepts requests", payoutsAcceptingRequests("delayed") === true,
  "a slow payout is not a refused one — the burst should not claim a pause");

// ── 7 · The officer is told the same truth as the player (E-9) ──────────────
section("7 · the officer's confirm dialog");

// ⚠️ SLICED TO THE RENDERED BODY. The rail's own fix-comment quotes both the old sentences AND the new
// one ("approval opens the withdrawal gate, and nothing else"), so a positive assertion over the file —
// or over a stripper that ever missed a JSX comment — could pass on the prose. The body is the
// `body={<>…</>}` attribute of the one approve dialog.
const APPROVE_BODY = (() => {
  const i = RAIL_RAW.indexOf('title="Approve identity · Idhinisha kitambulisho"');
  const j = i < 0 ? -1 : RAIL_RAW.indexOf('confirmLabel="Yes, approve identity"', i);
  const block = i < 0 || j < 0 ? "" : RAIL_RAW.slice(i, j);
  const b = block.indexOf("body={<>");
  const e = b < 0 ? -1 : block.indexOf("</>}", b);
  return b < 0 || e < 0 ? "" : block.slice(b, e + 4);
})();
ok("§7.control · the approve dialog's rendered body was found", APPROVE_BODY.length > 200 && /verified/.test(APPROVE_BODY), `len=${APPROVE_BODY.length}`);
// 🔴 INVERTED 2026-09-13. From 2026-08-20 this REQUIRED the dialog to say "does NOT open any money gate";
// from 2026-09-05 that sentence was false in every clause while this file asserted it stayed. Approval
// now opens the withdrawal gate and nothing else, and the dialog must say exactly that.
ok("🔴 the approve dialog says approval opens the withdrawal gate, and nothing else",
  /It opens the withdrawal gate, and nothing else/.test(APPROVE_BODY),
  "an officer must know the one consequence the decision has, at the moment of decision");
ok("⛔ …and does not claim it unlocks deposits or play",
  !/unlocks full real-money deposits, play and withdrawals/.test(RAIL_S) && !/unlock\w*[^.]{0,40}(deposit|play)/i.test(APPROVE_BODY),
  "the officer-facing twin of E-5 — misstating a compliance action to the accountable officer");
ok("⛔ …nor that no money gate turns on it (true only from 2026-08-20 to 2026-09-05)",
  !/does <strong>not<\/strong> open any money gate/.test(RAIL_S));
const MONEY_IN_NEEDS_IDENTITY = /(deposit|play)\w*\s+(needs|requires)\s+(an\s+)?(approved\s+)?identity/i;
ok("⛔ …nor that depositing or playing needs an identity", !MONEY_IN_NEEDS_IDENTITY.test(APPROVE_BODY));
ok("control · that detector fires on the sentence it forbids",
  MONEY_IN_NEEDS_IDENTITY.test("depositing needs an approved identity") && !MONEY_IN_NEEDS_IDENTITY.test("playing needs no identity"));
ok("…and it still names what approval DOES do — record an identity, bind the document",
  /binds this document to this account/.test(APPROVE_BODY) && /verified/.test(APPROVE_BODY));
ok("§7.control · the rail source actually loaded", RAIL_S.length > 2_000 && /Approve identity/.test(RAIL_S));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
