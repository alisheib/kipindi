/**
 * F1 · PAYOUT HONESTY — the product must tell a player the truth about taking money out.
 *
 * ⚠️ WHY THIS TEST EXISTS. Since 2026-07-29 withdrawals on 50pick cannot be paid: Selcom's
 * `WALLET_CASHIN` rail rides an upstream (TIPS) answering `999`, and the two Selcom-internal rails
 * that would bypass it are not enabled for this vendor (`4035`). Two real payouts have been frozen
 * since that date.
 *
 * Throughout, the platform kept accepting deposits and kept showing a withdraw form that looked
 * completely normal — no notice, no warning, in any language. A player could fill it in, submit,
 * and receive a generic failure. On a licensed gambling platform that is the worst asymmetry we can
 * ship, and it is a licence question, not merely an ops one.
 *
 * THE PROPERTY THIS GUARDS IS NOT "a banner exists". It is that **the banner cannot lie**:
 *
 *   effective status = worstOf(officer-declared, derived-from-the-queue)
 *
 * so an officer can never declare "operational" while payouts are visibly stuck. `/admin/compliance`
 * once displayed a hardcoded green tick claiming HMAC-signed disk-backed backups that did not
 * exist, beside a real card whose credibility it borrowed. A payout banner an officer could force
 * green would be the same defect pointed at players instead of auditors.
 *
 * Every negative assertion here has been broken on purpose and observed to go red.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PAYOUT_STATUSES,
  worstOf,
  payoutsAcceptingRequests,
  DELAYED_AFTER_MS,
  UNAVAILABLE_AFTER_HOURS,
  UNAVAILABLE_STUCK_COUNT,
  type PayoutStatus,
} from "../src/lib/server/payout-status.ts";
import { STUCK_PROCESSING_MS } from "../src/lib/server/txn-filters.ts";
import { dict } from "../src/lib/i18n-dict.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 60 - s.length))}`);

// ── 1 · The worst-of rule — an officer may not declare away reality ──────────────────────────
section("1 · worstOf — the flag may only make it WORSE");

ok("statuses are ordered best → worst", PAYOUT_STATUSES.join() === "operational,delayed,unavailable",
  "Comparison depends on this order. Reordering silently inverts the rule.");

for (const declared of PAYOUT_STATUSES) {
  for (const derived of PAYOUT_STATUSES) {
    const eff = worstOf(declared, derived);
    const worseIdx = Math.max(PAYOUT_STATUSES.indexOf(declared), PAYOUT_STATUSES.indexOf(derived));
    ok(`worstOf(${declared}, ${derived}) = ${PAYOUT_STATUSES[worseIdx]}`, eff === PAYOUT_STATUSES[worseIdx]);
  }
}

// The single most important assertion in this file.
ok("🔴 an officer declaring 'operational' CANNOT suppress a derived 'unavailable'",
  worstOf("operational", "unavailable") === "unavailable");
ok("🔴 …nor a derived 'delayed'", worstOf("operational", "delayed") === "delayed");
// And the converse: a quiet queue must not undo a declared outage either. If an officer knows the
// provider is down before any payout has aged into "stuck", their word stands.
ok("🔴 a quiet queue cannot suppress a DECLARED outage",
  worstOf("unavailable", "operational") === "unavailable");

// ── 2 · Thresholds are shared, not re-invented ───────────────────────────────────────────────
section("2 · thresholds");

ok("'stuck' reuses txn-filters' STUCK_PROCESSING_MS, not a second definition",
  DELAYED_AFTER_MS === STUCK_PROCESSING_MS,
  "A second definition of 'stuck' will drift from the reconcile sweep's, and the one that drifts\n" +
    "       is the one nobody drives.");
ok("the unavailable escalation is stricter than the delayed one", UNAVAILABLE_AFTER_HOURS * 3_600_000 > DELAYED_AFTER_MS);
ok("a systemic count threshold exists and is > 1", UNAVAILABLE_STUCK_COUNT > 1);

// ── 3 · Only 'unavailable' refuses a request ─────────────────────────────────────────────────
section("3 · what each status does to the form");

ok("operational accepts requests", payoutsAcceptingRequests("operational") === true);
ok("delayed STILL accepts requests", payoutsAcceptingRequests("delayed") === true,
  "A slow payout is not a refused one. Blocking on 'delayed' would be its own lie about what we can do.");
ok("unavailable refuses requests", payoutsAcceptingRequests("unavailable") === false);

// ── 4 · The derive step must not walk the transactions table ─────────────────────────────────
section("4 · the derive step runs on a player page load");

const svc = read("src/lib/server/payout-status.ts");
ok("🔴 derive uses txn.search (indexed), NOT txn.listAll",
  svc.includes("db.txn.search(") && !/db\.txn\.listAll\(/.test(svc),
  "txn.listAll() is a findMany with no filter or limit, already called from 12+ sites, and its\n" +
    "       sibling's comment says this table 'must never be walked in memory'. This code runs on a\n" +
    "       player-facing page load.");
ok("it filters to WITHDRAWAL only", svc.includes('types: ["WITHDRAWAL"]'));
ok("it counts from `total`, not an array length", svc.includes("res.total"));
ok("a DB failure yields 'operational' for the DERIVED half only — it cannot manufacture an outage",
  /catch\s*\{\s*return\s*\{\s*derived:\s*"operational"/.test(svc.replace(/\s+/g, " ").replace(/ /g, " ")) ||
    svc.includes('return { derived: "operational", stuckCount: 0, oldestStuckHours: null };'));

// ── 5 · The player-facing copy exists in ALL THREE locales ───────────────────────────────────
section("5 · i18n — a player must be told in their own language");

const KEYS = [
  "payoutsDelayedTitle",
  "payoutsDelayedBody",
  "payoutsUnavailableTitle",
  "payoutsUnavailableBody",
  "payoutsUnavailableDepositWarning",
  "payoutsSince",
] as const;

for (const loc of ["en", "sw", "zh"] as const) {
  const w = (dict as Record<string, { wallet: Record<string, string> }>)[loc].wallet;
  for (const k of KEYS) {
    ok(`${loc}.wallet.${k} exists and is non-empty`, typeof w[k] === "string" && w[k].trim().length > 0);
  }
}
// Distinct translations, not English pasted into three slots — the parity suite checks keys, not
// whether anyone actually translated the value.
for (const k of KEYS) {
  const en = (dict as Record<string, { wallet: Record<string, string> }>).en.wallet[k];
  for (const loc of ["sw", "zh"] as const) {
    const v = (dict as Record<string, { wallet: Record<string, string> }>)[loc].wallet[k];
    ok(`${loc}.wallet.${k} is actually translated`, v !== en);
  }
}
ok("payoutsSince carries its {date} placeholder in all three",
  KEYS.includes("payoutsSince") &&
    (["en", "sw", "zh"] as const).every((l) =>
      (dict as Record<string, { wallet: Record<string, string> }>)[l].wallet.payoutsSince.includes("{date}")));

// ── 6 · The surfaces actually render it ──────────────────────────────────────────────────────
section("6 · the notice is on the surfaces that matter");

const withdrawPage = read("src/app/wallet/withdraw/page.tsx");
const depositPage = read("src/app/wallet/deposit/page.tsx");

ok("withdraw page reads the live status", withdrawPage.includes("getPayoutStatus()"));
ok("withdraw page renders the notice", withdrawPage.includes("<PayoutStatusNotice"));
ok("🔴 withdraw form is disabled when payouts cannot be paid",
  withdrawPage.includes("payoutsAcceptingRequests(") && withdrawPage.includes("canSubmit"),
  "The form must not invite a request we cannot fulfil.");
ok("withdraw form no longer gates on KYC alone", !/disabled=\{!kycApproved\}/.test(withdrawPage));

ok("🔴 DEPOSIT page also warns — before money comes in", depositPage.includes("<PayoutStatusNotice"));
ok("deposit page reads the live status", depositPage.includes("getPayoutStatus()"));
// Ordering is the ethical part: an incentive shown above a limitation reads as a lure.
ok("🔴 the deposit warning renders ABOVE the cashback promo",
  depositPage.indexOf("<PayoutStatusNotice") < depositPage.indexOf("<CashbackPromo"),
  "Showing a deposit bonus before telling the player we cannot pay them out is the shape of a\n" +
    "       scam, whatever the intent.");

const notice = read("src/components/wallet/payout-status-notice.tsx");
// Strip comments first. The component's own header says "Deliberately NOT dismissible", and the
// first version of this assertion matched that sentence and failed on it — a guard that reads
// prose instead of code is exactly the mistake this suite exists to catch elsewhere.
const noticeCode = notice.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("the notice is not dismissible", !/dismiss|onClose|useState|onClick/i.test(noticeCode),
  "A notice a player can close is one they will not have read when it matters.");
ok("the notice returns nothing when operational", notice.includes('status === "operational"') && notice.includes("return null"));
ok("the notice is announced to screen readers", notice.includes('role="alert"'));

// ── 7 · The server action is the real gate ───────────────────────────────────────────────────
section("7 · a disabled form is a hint; the action is the control");

const action = read("src/app/wallet/withdraw/actions.ts");
ok("🔴 withdrawAction refuses when payouts cannot be paid",
  action.includes("payoutsAcceptingRequests(") && action.includes("getPayoutStatus()"),
  "This action is reachable by a direct POST. Without a server-side refusal the disabled form is\n" +
    "       decoration.");
// It must refuse BEFORE it touches the wallet, or the money has already moved.
ok("…and it refuses BEFORE calling withdraw()",
  action.indexOf("payoutsAcceptingRequests(") < action.indexOf("await withdraw("));

ok("no hardcoded English validation copy left on the withdraw path",
  !action.includes("Amount must be between") && !action.includes("Enter the destination mobile number"),
  "A Swahili- or Chinese-speaking player saw English validation errors on the money path.");
ok("the action resolves the player's locale", action.includes("getServerT()"));
ok("bounds come from the validators, not re-typed literals",
  action.includes("WITHDRAW_MIN_TZS") && action.includes("WITHDRAW_MAX_TZS"),
  "The old code hardcoded 1000 / 5_000_000 beside a schema that already owned those numbers.");

console.log("");
console.log("─".repeat(64));
console.log(`  PAYOUT HONESTY (F1): ${pass} passed, ${fail} failed`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
