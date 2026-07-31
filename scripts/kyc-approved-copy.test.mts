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
const RAIL_S = read("../src/app/admin/kyc/[id]/kyc-decision-rail.tsx");
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const KYC_PAGE = stripComments(KYC_PAGE_RAW);
const DEPOSIT = stripComments(DEPOSIT_RAW);

const LOCALES = ["en", "sw", "zh"] as const;

// ── 1 · The burst no longer promises a deposit, in any language ─────────────
// Each locale gets its OWN forbidden term, because the bug was invisible in
// review precisely by being in a language the reviewer did not read.
section("1 · no locale promises depositing");

const DEPOSIT_WORDS: Record<(typeof LOCALES)[number], RegExp> = {
  en: /deposit/i,
  sw: /kuweka/i,   // "kuweka pesa" — to put money in
  zh: /充值/,       // top up
};

for (const loc of LOCALES) {
  const body = dict[loc].profile.kycApprovedBody as string;
  ok(`${loc}: the burst does not promise depositing`, !DEPOSIT_WORDS[loc].test(body), body);
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

ok("the deposit gate is still email verification", /const emailVerified = !!user\?\.emailVerifiedAt;/.test(DEPOSIT));
ok("…and it renders the email gate instead of the form", /!emailVerified \?[\s\S]{0,80}EmailVerifyGate/.test(DEPOSIT));
ok("the deposit page does NOT gate on KYC approval",
  !/kycApproved/.test(DEPOSIT),
  "if this fires, KYC now unlocks deposits too and the burst may understate what was unlocked");

// The page is presentation; the SERVICE is enforcement. Pin the real thing, because
// that is what makes the claim true or false.
ok("🔴 the deposit SERVICE enforces email verification, not KYC",
  /if \(!depositor\?\.emailVerifiedAt\)/.test(WALLET));
ok("🔴 the withdraw SERVICE is what enforces KYC APPROVED",
  /kyc\?\.status !== "APPROVED"/.test(WALLET) && /withdraw\.kyc_blocked/.test(WALLET));
ok("play is not gated on identity at all",
  !/kyc/i.test(MARKET),
  "market-service carries no KYC reference; if it gains one, every 'what approval unlocks' string moves");

// ── 7 · The officer is told the same truth as the player (E-9) ──────────────
section("7 · the officer's confirm dialog");

ok("🔴 the approve dialog no longer claims it unlocks deposits or play",
  !/unlocks full real-money deposits, play and withdrawals/.test(RAIL_S),
  "the officer-facing twin of E-5 — misstating a compliance action to the accountable officer");
ok("…and it names the withdrawal gate as what the decision opens",
  /opens the <strong>withdrawal<\/strong> gate/.test(RAIL_S));

// ── 6 · The gate's meaning, straight from the source ───────────────────────
// The whole conditional hangs on what `unavailable` means. Pin it.
section("6 · payoutsAcceptingRequests semantics");

ok("`unavailable` does not accept requests", payoutsAcceptingRequests("unavailable") === false);
ok("`operational` accepts requests", payoutsAcceptingRequests("operational") === true);
ok("`delayed` still accepts requests", payoutsAcceptingRequests("delayed") === true,
  "a slow payout is not a refused one — the burst should not claim a pause");

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
