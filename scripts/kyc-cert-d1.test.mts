/**
 * D1 · KYC SUBMISSIONS — the identity control must be real, and must never
 * claim to be more than it is.
 *
 * ⚠️ WHY THIS SUITE EXISTS. `nida.ts` is a deterministic MOCK. No request has ever
 * reached the National Identification Authority. Per docs/NIDA-POLICY.md (Ali,
 * 2026-07-19) that is deliberate and sufficient: the control is FORMAT + UNIQUENESS,
 * and identity assurance comes from a human officer reading the documents.
 *
 * Two things follow, and this suite enforces both.
 *
 * 1 · NOTHING MAY CLAIM AN AUTHORITY CHECK. On 2026-07-31 three legal documents in
 *     three locales each stated one. `legal/aml` told a regulator "Identity is
 *     verified at registration via the National Identification Authority"; `legal/
 *     privacy` listed NIDA as a party we transmit identity data to "(mTLS)" — we
 *     transmit nothing; `legal/terms` required players to verify "against" NIDA. The
 *     admin console showed an officer a "NIDA verified" chip. A compliance officer
 *     releasing a withdrawal on that chip is acting on evidence that does not exist.
 *
 * 2 · UNIQUENESS IS THE WHOLE CONTROL, SO IT MUST BE ATOMIC. It was not. Two OS
 *     processes submitting one national ID for two different users BOTH passed —
 *     proven by scripts/load/s14-kyc-nida-race.mts, which printed
 *     "active submissions holding this NIDA : 2". Closed with a partial unique
 *     index. This suite fails if that index, its migration, or the handler that
 *     turns the constraint into a player-readable refusal is removed.
 *
 * 3 · A REJECTED PLAYER MUST BE TOLD. `page.tsx` called `startKyc()` — which CLEARS
 *     the submission — one line BEFORE it read the status, so `rejected` was always
 *     false and the rejection panel was unreachable dead code. A player whose
 *     identity check failed was shown a green "NIDA number accepted" banner while
 *     their inbox held "Identity check needs attention". Verified in a real browser.
 *
 * Every negative assertion below has been broken on purpose and observed to go red.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** Comments describe the trap; they are not the control. Strip before asserting. */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);

// ── 1 · NIDA is a mock, and says so ──────────────────────────────────────────────────────────
section("1 · the mock is labelled as a mock");

const nida = read("src/lib/server/nida.ts");
ok("nida.ts still declares itself a mock",
  /mock/i.test(nida),
  "If a REAL NIDA integration ever lands, this suite's premise changes — update\n" +
  "       docs/NIDA-POLICY.md in the SAME commit, then relax the claims below.");
ok("nida.ts makes no outbound request",
  !/\bfetch\(|axios|https?\.request|undici/.test(stripComments(nida)),
  "A network call here would mean the mock is gone and every 'no authority check'\n" +
  "       statement in the product became false in the same commit.");

// ── 2 · 🔴 No surface claims an authority check ───────────────────────────────────────────────
section("2 · nothing claims a government match");

/** Player-facing and officer-facing surfaces that must not assert NIDA verification. */
const CLAIM_SURFACES = [
  "src/app/legal/aml/page.tsx",
  "src/app/legal/terms/page.tsx",
  "src/app/legal/privacy/page.tsx",
  "src/app/admin/players/[id]/page.tsx",
  "src/lib/i18n-dict.ts",
];
for (const f of CLAIM_SURFACES) {
  const body = stripComments(read(f));
  ok(`🔴 ${f} does not invoke the National Identification Authority as a checker`,
    !/National Identification Authority|Mamlaka ya Vitambulisho vya Taifa|国民身份管理局/.test(body),
    "docs/NIDA-POLICY.md: no request has ever reached NIDA. Naming the authority as\n" +
    "       the verifier tells a player — or a regulator — something that is not true.");
}

ok("🔴 privacy does not list NIDA as a party we send identity data to",
  !/NIDA \(identity verification|NIDA \(uthibitisho|NIDA（身份验证/.test(read("src/app/legal/privacy/page.tsx")),
  "We transmit nothing to NIDA. A disclosure describing a transfer that does not\n" +
  "       happen is as wrong as concealing one that does.");

const playerDetail = stripComments(read("src/app/admin/players/[id]/page.tsx"));
ok("🔴 the admin chip does not read 'NIDA verified'",
  !/>NIDA verified</.test(playerDetail),
  "An officer reading 'NIDA verified' may release a withdrawal believing a government\n" +
  "       confirmed the identity. Only the FORMAT was accepted and the number found unique.");
ok("the admin field is not labelled 'NIDA verified at'",
  !/label="NIDA verified at"/.test(playerDetail));

// The admin review checklist is where a money decision is actually taken.
const rail = read("src/app/admin/kyc/[id]/page.tsx");
ok("the KYC review checklist states the control has no authority check",
  /no authority check/i.test(rail),
  "The officer must be told what the tick actually means, at the point of decision.");

// ── 3 · 🔴 One NIDA, one account — enforced by the DATABASE ───────────────────────────────────
section("3 · uniqueness is atomic, not hopeful");

const MIGRATION = "prisma/migrations/20260731120000_kyc_nida_active_unique/migration.sql";
let migration = "";
try { migration = read(MIGRATION); } catch { /* reported below */ }
ok("🔴 the partial unique-index migration exists", migration.length > 0,
  `Missing ${MIGRATION}. Without it, scripts/load/s14-kyc-nida-race.mts puts TWO\n` +
  "       accounts on one national ID. Uniqueness is the entire identity control.");
ok("…and it targets the real table (KycSubmission, never 'Kyc')",
  /ON\s+"KycSubmission"/.test(migration) && !/ON\s+"Kyc"\s*\(/.test(migration),
  "`Kyc` is the app-layer name (db.kyc.*). There is no such table — that SQL fails.");
ok("…and it is PARTIAL, so a REJECTED submission still frees the number",
  /WHERE[\s\S]*status\s*<>\s*'REJECTED'/.test(migration),
  "A total unique index would permanently burn a national ID on any rejection.");
ok("…and it is idempotent (production applies it CONCURRENTLY by hand first)",
  /IF NOT EXISTS/.test(migration));

const svc = read("src/lib/server/kyc-service.ts");
const svcCode = stripComments(svc);
ok("kyc-service pins the index name in one place",
  /NIDA_UNIQUE_INDEX\s*=\s*"KycSubmission_nidaNumber_active_key"/.test(svcCode));
ok("the migration and the code agree on that index name",
  migration.includes("KycSubmission_nidaNumber_active_key"),
  "A rename in one place turns the constraint into an unhandled 500 for the loser\n" +
  "       of the race, instead of a readable refusal.");
// ⚠️ An earlier draft of this assertion tested `/isNidaUniqueViolation\(/`, which
// matches the function's own DEFINITION. Deleting the catch-block guard left the
// gate GREEN — the guard was reading a symbol that happened to be nearby instead
// of the control itself. Caught by mutating the source on purpose. Assert the
// WIRING: the handler must be CALLED, and must re-throw anything else.
ok("🔴 the losing writer is translated into a player-readable refusal",
  /if\s*\(\s*!\s*isNidaUniqueViolation\s*\([^)]*\)\s*\)\s*throw\b/.test(svcCode),
  "Without this the second submitter gets a raw Prisma error. The refusal must look\n" +
  "       the same whether the duplicate was sequential or a race — and a NON-constraint\n" +
  "       error must still propagate rather than be swallowed as a duplicate.");
ok("…and the refusal wording is shared with the sequential-duplicate path",
  (svcCode.match(/already linked to another account/g) ?? []).length >= 2,
  "A race and an ordinary duplicate must be indistinguishable to the player.");
ok("…and the race is audited exactly like an ordinary duplicate",
  (svcCode.match(/kyc\.nida\.duplicate_blocked/g) ?? []).length >= 2,
  "AML needs both refusals in the log under one action name.");

// The proof itself must stay runnable, or the guarantee decays into a memory.
ok("the two-process race proof is still present",
  read("scripts/load/s14-kyc-nida-race.mts").includes("must be exactly 1"));

// ── 4 · 🔴 A rejected player is told they were rejected ───────────────────────────────────────
section("4 · rejection is visible, and the record survives being looked at");

const page = read("src/app/profile/kyc/page.tsx");
const iRead = page.indexOf("getKycStatus(session.userId)");
const iStart = page.indexOf("startKyc(session.userId)");
ok("both the read and the start call are present in the KYC page",
  iRead >= 0 && iStart >= 0,
  "Guarding against the -1 trap: indexOf(missing) is -1, which compares as 'first'\n" +
  "       and would make the ordering assertion below pass over deleted code.");
ok("🔴 the page READS the submission before it may start/reset one",
  iRead >= 0 && iStart >= 0 && iRead < iStart,
  "startKyc() nulls nidaNumber, rejectReason, rejectNote and empties documents\n" +
  "       (kyc-service.ts). Calling it first wiped the rejection before the read, so the\n" +
  "       rejection panel could never render and the reason was lost to the player.");
ok("…and it only auto-starts when there is nothing to read",
  /if \(!kyc \|\| kyc\.status === "NOT_STARTED"\)/.test(page),
  "Any broader condition re-introduces the wipe.");
ok("the rejection panel exists and shows the officer's reason",
  page.includes("t.profile.kycRejectReason") && page.includes("rejectNote"));
ok("🔴 restarting is an explicit player action, not a side effect of looking",
  page.includes("restartKycAction"),
  "Clearing the evidence must require a tap.");

const actions = stripComments(read("src/app/profile/kyc/actions.ts"));
ok("🔴 a FAILED identity check does not redirect to the success banner",
  /verified === false/.test(actions) && actions.indexOf("verified === false") < actions.indexOf('"/profile/kyc?nida=verified"'),
  "submitNidaStep returns ok:true even when it REJECTS — `ok` reports that the step\n" +
  "       ran, not that the player passed. Redirecting on `ok` alone greeted a rejected\n" +
  "       player with 'NIDA number accepted', contradicting the email just sent to them.");
ok("restartKycAction is defined and clears through the service, not by hand",
  /export async function restartKycAction/.test(actions) && /startKyc\(/.test(actions));

// ── 5 · Every transition fires ITS OWN event ─────────────────────────────────────────────────
section("5 · each transition emits the right event, and only it");

/**
 * ⚠️ SCOPE. Whether a message renders, is trilingual, and is actually delivered is
 * module C's certification (comms-registry.ts, test:cert-c1..c3) — and its own audit
 * found that `sentAt` is NULL on all 1,673 notification rows, so "the email was sent"
 * is NOT provable from the database today. What D1 owns, and pins here, is that the
 * KYC STATE MACHINE calls the right thing at the right transition: a swap or a
 * deletion is a silent failure that no rendering test can catch.
 */
/**
 * ⚠️ Scope every check to the FUNCTION it belongs to. A file-wide `includes` is
 * not a control: `kycApprovedHtml` also appears on the import line, so swapping
 * the approve branch to send the REJECTED email left the gate green — caught by
 * mutating the source. Slice the body, then assert inside it.
 */
const fnBody = (name: string): string => {
  const i = svcCode.indexOf(`export async function ${name}(`);
  if (i < 0) return "";
  const next = svcCode.slice(i + 1).search(/\nexport (async )?function /);
  return next < 0 ? svcCode.slice(i) : svcCode.slice(i, i + 1 + next);
};
/** A decision branch inside reviewKyc, sliced from its guard to the next one. */
const branch = (from: string, to: string): string => {
  const body = fnBody("reviewKyc");
  const i = body.indexOf(from);
  if (i < 0) return "";
  const j = body.indexOf(to, i + from.length);
  return j < 0 ? body.slice(i) : body.slice(i, j);
};

for (const [label, fn, template] of [
  ["NIDA check fails → REJECTED", "submitNidaStep", "kycRejectedHtml"],
  ["player submits → PENDING_REVIEW", "submitForReview", "kycSubmittedHtml"],
  ["officer forces re-verify", "forceReverifyKyc", "kycMoreInfoHtml"],
] as const) {
  const body = fnBody(fn);
  ok(`${label} sends ${template} (from inside ${fn})`,
    body.length > 0 && body.includes(template),
    "The transition or its message has been renamed, removed, or swapped.");
}
for (const [label, from, to, template] of [
  ["officer approves → APPROVED", 'decision === "APPROVE"', 'decision === "REQUEST_INFO"', "kycApprovedHtml"],
  ["officer asks for more info", 'decision === "REQUEST_INFO"', "// REJECT", "kycMoreInfoHtml"],
] as const) {
  const b = branch(from, to);
  ok(`${label} sends ${template} (from inside its own branch)`,
    b.length > 0 && b.includes(template),
    "Each branch must send ITS message — a swap here tells a rejected player they\n" +
    "       passed, or an approved player that they failed.");
}
ok("the REJECT branch sends kycRejectedHtml",
  branch("// REJECT", "\n}").includes("kycRejectedHtml") ||
  fnBody("reviewKyc").slice(fnBody("reviewKyc").lastIndexOf('status: "REJECTED"')).includes("kycRejectedHtml"));

ok("officers are alerted when a submission arrives for review",
  fnBody("submitForReview").includes("notifyAdminKycReview("));
ok("🔴 a double-submit does NOT re-notify",
  /if \(k\.status === "PENDING_REVIEW" \|\| k\.status === "APPROVED"\) \{[\s\S]{0,60}return \{ ok: true \}/
    .test(fnBody("submitForReview")),
  "Re-emailing the player and every officer on a retry trains officers to ignore the\n" +
  "       queue. The guard must sit inside submitForReview, BEFORE the transition.");
ok("every decision is audited",
  ["kyc.approved", "kyc.rejected", "kyc.more_info_requested"].every((a) => fnBody("reviewKyc").includes(a)) &&
  fnBody("submitForReview").includes("kyc.submitted"));
ok("🔴 an officer cannot decide their own submission",
  /officerId === userId/.test(fnBody("reviewKyc")) && fnBody("reviewKyc").includes("kyc.review.self_blocked"));
ok("🔴 the officer decision is serialised per subject",
  fnBody("reviewKyc").includes("withLock(`kyc:${userId}`"),
  "Proven under real Postgres by `npm run load:kyc-race`: two officers deciding the\n" +
  "       same submission at the same instant, exactly one decision lands and the loser is\n" +
  "       told it was already decided.");
ok("…and so is a forced re-verify",
  fnBody("forceReverifyKyc").includes("withLock(`kyc:${userId}`"));

console.log("");
console.log("─".repeat(64));
console.log(`  D1 · KYC SUBMISSIONS: ${pass} passed, ${fail} failed`);
console.log(`  Uniqueness is enforced by the DATABASE; run 'npm run load:nida-race'`);
console.log(`  against the disposable cluster to see it refuse two containers.`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
