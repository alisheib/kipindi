/**
 * D3 · SOURCE OF FUNDS — the declaration that unlocks large deposits.
 *
 * An accepted SoF is what lets money above TZS 1,000,000 (single) or 5,000,000
 * (rolling 30 days) into the platform. Three properties have to hold, and until
 * 2026-07-31 one of them did not:
 *
 * 1 · The threshold is enforced SERVER-SIDE, inside the wallet lock, and audited.
 *     (It is. The deposit path reads the rolling sum and reserves under one lock,
 *     so concurrent deposits cannot each clear a cap only one should.)
 *
 * 2 · No self-approval, and every decision audited. (It is: requireOfficer +
 *     admin TOTP + an explicit officer-is-not-the-subject check + COMPLIANCE audit
 *     on all three outcomes.)
 *
 * 3 · 🔴 A declaration an officer ACCEPTED cannot be silently replaced. It could.
 *     `submitSourceOfFundsAction` upserted unconditionally with
 *     reviewStatus:"PENDING", reviewerId:null, reviewedAt:null. There is no
 *     history table, so a player could accept-then-rewrite: the declaration the
 *     officer actually accepted was DESTROYED, and the `sof.accepted` audit row
 *     was left pointing at a record that no longer existed. PENDING and REJECTED
 *     stay editable — a player must be able to correct and resubmit.
 *
 * Before this suite, SoF had ZERO automated coverage anywhere in the repo.
 *
 * Every negative assertion has been broken on purpose and observed red.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SOF_SINGLE_TXN_TZS, SOF_ROLLING_30D_TZS } from "../src/lib/server/wallet-service.ts";
import { decomment as stripComments } from "./lib/decomment.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);

// ── 1 · Thresholds ───────────────────────────────────────────────────────────────────────────
section("1 · the thresholds are real numbers, enforced server-side");

ok("single-transaction threshold is TZS 1,000,000", SOF_SINGLE_TXN_TZS === 1_000_000);
ok("rolling-30-day threshold is TZS 5,000,000", SOF_ROLLING_30D_TZS === 5_000_000);

const wallet = stripComments(read("src/lib/server/wallet-service.ts"));
ok("both thresholds are module-scope and exported (one definition, not two copies)",
  /export const SOF_SINGLE_TXN_TZS/.test(wallet) && /export const SOF_ROLLING_30D_TZS/.test(wallet));
ok("🔴 the gate runs INSIDE the wallet lock",
  (() => {
    const iLock = wallet.indexOf("withLock(`wallet:${userId}`");
    const iGate = wallet.indexOf("triggersSof");
    return iLock >= 0 && iGate >= 0 && iLock < iGate;
  })(),
  "Outside the lock, N concurrent deposits each read the pre-deposit total and all\n" +
  "       clear a threshold only one should.");
ok("the rolling sum counts PENDING reservations",
  /sumDepositsSince\(userId, thirtyDaysAgo, true\)/.test(wallet),
  "Otherwise a double-tap sees a stale total.");
ok("only an ACCEPTED declaration satisfies the gate",
  /sof\.reviewStatus !== "ACCEPTED"/.test(wallet),
  "PENDING must not open the gate — it means nobody has looked yet.");
ok("a blocked deposit is audited with both thresholds and the observed sums",
  /deposit\.sof_gate_blocked/.test(wallet) && /rolling30dAfter/.test(wallet) && /singleTxnThreshold/.test(wallet));
ok("the player is told which threshold they hit, and where to go",
  /profile\/source-of-funds/.test(wallet));

// ── 2 · Officer decisions ────────────────────────────────────────────────────────────────────
section("2 · no self-approval, no re-deciding, every outcome audited");

const review = stripComments(read("src/app/admin/approvals/actions.ts"));
ok("🔴 an officer cannot review their own declaration",
  /session\.userId === userId/.test(review) && /cannot review your own/.test(review),
  "Separation of duties: the person declaring the source of the money must not be\n" +
  "       the person who accepts it.");
ok("the decision requires an officer role", /requireOfficer\(/.test(review));
ok("…and an admin TOTP step-up", /requireAdminTotp\(/.test(review));
ok("the decision is serialised per subject", /withLock\(`sof-review:\$\{userId\}`/.test(review));
ok("🔴 an already-decided declaration cannot be re-decided",
  /reviewStatus !== "PENDING"/.test(review),
  "Two officers opening the queue together must not both record a decision.");
ok("REJECT and MORE_INFO require a written reason the player will read",
  /reason\.length < 5/.test(review));
for (const action of ["sof.accepted", "sof.rejected", "sof.more_info_requested"]) {
  ok(`${action} is audited under COMPLIANCE`, review.includes(action));
}

// ── 3 · 🔴 Accepted evidence is immutable ────────────────────────────────────────────────────
section("3 · a player cannot rewrite what an officer accepted");

const submit = stripComments(read("src/app/profile/source-of-funds/actions.ts"));
const iGet = submit.indexOf("db.sourceOfFunds.get(session.userId)");
const iUpsert = submit.indexOf("db.sourceOfFunds.upsert(");
ok("the action reads the existing declaration and writes one", iGet >= 0 && iUpsert >= 0,
  "Presence is checked first: indexOf(missing) is -1, which would compare as\n" +
  "       'first' and let the ordering assertion below pass over deleted code.");
ok("🔴 it reads the existing status BEFORE overwriting",
  iGet >= 0 && iUpsert >= 0 && iGet < iUpsert);
ok("🔴 an ACCEPTED declaration is refused, not silently replaced",
  /existing\?\.reviewStatus === "ACCEPTED"/.test(submit),
  "There is NO history table. Overwriting destroys the evidence an officer acted on\n" +
  "       and nulls reviewerId/reviewedAt, leaving the sof.accepted audit row pointing\n" +
  "       at a record that no longer exists.");
ok("…and the attempt is audited rather than dropped",
  /sof\.overwrite_blocked/.test(submit),
  "A player trying to change an accepted source-of-funds story is exactly the\n" +
  "       signal an AML officer wants to see.");
// ⭐ RE-POINTED 2026-08-15. This used to grep the ACTION SOURCE for "Contact support", which
// stopped being true the moment the refusal started travelling as a reason KEY instead of as an
// English sentence — the C2 banner tranche. Grepping the action for player copy was always the
// weaker check anyway: it asserted what the SOURCE FILE contains, not what the PLAYER READS, and
// it could only ever pass in English. Follow the reason to the dictionary instead, in all three
// languages, which is the thing the assertion was actually about.
ok("the refusal carries a machine reason rather than prose",
  /fail\("sof_locked"\)/.test(submit),
  "The action redirects with ?reason=; the page resolves it through the registry.");
{
  const dict = read("src/lib/i18n-dict.ts");
  const lines = dict.split("\n").filter((l) => /^\s*errSofLocked:/.test(l));
  ok("…and the copy exists in all three languages", lines.length === 3, `${lines.length} definitions`);
  // ⛔ "What to do next" is the point of the rule (RULES.md §2.9), so assert each language
  // actually says it — not merely that a key exists.
  const NEXT_STEP = [/contact support/i, /wasiliana na msaada/i, /联系客服/];
  ok("…and every one of them names the next step",
    NEXT_STEP.every((re) => lines.some((l) => re.test(l))),
    lines.map((l) => l.trim().slice(0, 40)).join(" | "));
}
ok("PENDING and REJECTED remain editable",
  !/reviewStatus === "PENDING"/.test(submit.replace(/reviewStatus: "PENDING"/g, "")),
  "A player must be able to correct a rejected declaration, and MORE_INFO puts the\n" +
  "       record back to PENDING precisely so they can resubmit.");
ok("a fresh submission always lands as PENDING, never self-accepted",
  /reviewStatus: "PENDING"/.test(submit) && !/reviewStatus: "ACCEPTED"/.test(submit),
  "Nothing on the player side may set ACCEPTED.");
ok("the submission is audited", /sof\.submitted/.test(submit));

console.log("");
console.log("─".repeat(64));
console.log(`  D3 · SOURCE OF FUNDS: ${pass} passed, ${fail} failed`);
console.log(`  Gate: single ≥ TZS ${SOF_SINGLE_TXN_TZS.toLocaleString("en-US")} or`);
console.log(`  rolling-30d ≥ TZS ${SOF_ROLLING_30D_TZS.toLocaleString("en-US")} requires an ACCEPTED declaration.`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
