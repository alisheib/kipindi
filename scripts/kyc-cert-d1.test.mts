/**
 * D1 · KYC SUBMISSIONS — the identity control must be real, and must never
 * claim to be more than it is.
 *
 * ⚠️ WHY THIS SUITE EXISTS. `nida.ts` is a deterministic MOCK. No request has ever
 * reached the National Identification Authority. Per docs/IDENTITY-POLICY.md (Ali,
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
 *     🔴 AND FROM 2026-08-20 IT MUST SPAN FOUR DOCUMENTS, NOT ONE. A player proves
 *     identity with any ONE of NIDA / passport / driving licence / voter's card.
 *     Three more per-document number columns would have handed one human four
 *     accounts AND a route around a DUPLICATE_IDENTITY rejection — blocked on your
 *     NIDA, re-register with your passport. So the index is on the TUPLE
 *     ("idType","idNumber") with the same partial WHERE, and §3 below asserts BOTH
 *     halves: the pair, and the exclusion of REJECTED.
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
/** Comments describe the trap; they are not the control. Strip before asserting. */
import { decomment as stripComments } from "./lib/decomment.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

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
  "       docs/IDENTITY-POLICY.md in the SAME commit, then relax the claims below.");
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
    "docs/IDENTITY-POLICY.md: no request has ever reached NIDA. Naming the authority as\n" +
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

// ── 2b · 🔴 The privacy policy claims no control and no collection we do not have ─────────────
section("2b · privacy declares only what the code actually does");

/**
 * ⚠️ WHY THIS BLOCK EXISTS (audit F-04, 2026-08-20). §2 above guards the direction everyone
 * expects — a page must not claim a verification we never perform. The privacy policy was
 * failing in the OTHER direction on three separate statements, in all three locales:
 *
 *   1. "device and browser fingerprint" — nothing on the platform computes one. The `Device`
 *      model has a `fingerprint` column and zero writes anywhere in src/. The only
 *      "fingerprint" in auth code is `passwordFingerprint()`, a SHA-256 of the stored
 *      PASSWORD HASH used to make a reset link single-use (password-reset.ts:52-55) — no
 *      browser entropy is read, stored or transmitted.
 *   2. "time on platform, reality-check responses" — both live in browser sessionStorage
 *      and are never sent to the server (reality-check.tsx has no fetch, no action, no POST).
 *      No table holds either.
 *   3. "Passwords (when introduced) will use Argon2id" — password auth is LIVE and primary,
 *      and hashing is scrypt with a per-user salt.
 *
 * The third is the worst of them: over-claiming collection is inaccurate, but mis-stating an
 * actual security control to a regulator on the page they read is a different category. All
 * three are corrected; these assertions keep them corrected.
 *
 * ⛔ This page is NOT dictionary-driven — all three locales are inline JSX in the one file —
 * so `npm run test:i18n` cannot see any of it. This block is the only guard there is.
 */
const privacy = stripComments(read("src/app/legal/privacy/page.tsx"));

ok("🔴 privacy does not claim a device or browser fingerprint (EN/SW/ZH)",
  !/browser fingerprint|device and browser fingerprint|alama ya kifaa na kivinjari|浏览器指纹|设备及浏览器指纹/.test(privacy),
  "Nothing computes a fingerprint. The `Device` model has never been written to. Declaring\n" +
  "       collection that does not happen fails a PDPA accuracy review as surely as concealing\n" +
  "       collection that does.");

ok("🔴 privacy does not claim to collect time-on-platform or reality-check answers",
  !/time on platform|muda kwenye jukwaa|在平台的停留时间/.test(privacy),
  "Session elapsed time and the reality-check dismissal live in browser sessionStorage and\n" +
  "       never reach the server. Only 'limit changes' was ever real (ResponsibleGambling).");

ok("🔴 privacy does not say passwords 'will use' Argon2id — they are live, and scrypt",
  !/will use Argon2id|zitatumia Argon2id|将使用 Argon2id/.test(privacy),
  "Password registration and login are the PRIMARY auth path and hash with scrypt +\n" +
  "       per-user salt. A future-tense claim about a different algorithm mis-states a\n" +
  "       shipped security control on a regulator-facing page.");

ok("and it states the algorithm it actually uses, in all three locales",
  (privacy.match(/scrypt/g) ?? []).length >= 3,
  "The correction must be made in EN, SW and ZH — they are three inline strings in one file,\n" +
  "       and a partial fix leaves two locales lying.");

// CONTROL — if the page ever stops being readable here, every negative above passes vacuously.
ok("CONTROL: the privacy page really was read and contains its own §2 collection list",
  privacy.includes("Technical") && privacy.includes("Kiufundi") && privacy.includes("技术"),
  "The three locale blocks are missing, so the assertions above measured nothing.");

// ── 3 · 🔴 One NIDA, one account — enforced by the DATABASE ───────────────────────────────────
section("3 · uniqueness is atomic, not hopeful");

const MIGRATION = "prisma/migrations/20260731120000_kyc_nida_active_unique/migration.sql";
// 🔴 THE LIVE ONE from 2026-08-20 — one document, one account, across all four types.
const ID_MIGRATION = "prisma/migrations/20260820120000_kyc_identity_document/migration.sql";
// 🔴 THE CONTRACT STEP. ⚠️ NOTHING IN THIS REPO READ A CONTRACT MIGRATION BEFORE THIS
// LINE: cert-d1 hard-coded the two paths above, and its "does NOT drop the deprecated
// columns" assertion is scoped to ID_MIGRATION — so a contract migration that dropped
// the wrong index, forgot one, or wrapped a CONCURRENTLY statement inside Prisma's
// transaction would have been caught by NO suite in the platform.
const DROP_MIGRATION = "prisma/migrations/20260821090000_kyc_drop_nida_legacy/migration.sql";
let migration = "";
try { migration = read(MIGRATION); } catch { /* reported below */ }
let idMigration = "";
try { idMigration = read(ID_MIGRATION); } catch { /* reported below */ }
let dropMigration = "";
try { dropMigration = read(DROP_MIGRATION); } catch { /* reported below */ }

ok("🔴 the partial unique-index migration exists", migration.length > 0,
  `Missing ${MIGRATION}. Without it, scripts/load/s14-kyc-nida-race.mts puts TWO\n` +
  "       accounts on one national ID. Uniqueness is the entire identity control.");
ok("🔴 the FOUR-DOCUMENT identity migration exists", idMigration.length > 0,
  `Missing ${ID_MIGRATION}. Without it the uniqueness rule knows only about NIDA,\n` +
  "       so a player blocked as DUPLICATE_IDENTITY re-registers with their passport.");
/**
 * 🔴 STRIP THE SQL COMMENTS FIRST, AND SLICE TO THE STATEMENT.
 *
 * ⛔ A COMMENT THAT QUOTES SQL IS A DECOY ANCHOR (campaign trap 6, measured at
 * `E-170` on a fix's own comment). Both migrations explain themselves, and the
 * identity one prints the duplicate-check query — which contains the exact string
 * `WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED'`. A file-wide test for
 * "is it partial?" therefore matched the PROSE: `red:id-documents` case 2 made the
 * index TOTAL and this suite stayed green. Read the statement, not the file.
 */
const uniqueIndexStatement = (sql: string): string => {
  const code = sql.replace(/^\s*--.*$/gm, "");
  const i = code.search(/CREATE\s+UNIQUE\s+INDEX/i);
  if (i < 0) return "";
  const end = code.indexOf(";", i);
  return end < 0 ? code.slice(i) : code.slice(i, end + 1);
};

for (const [label, sql] of [["legacy NIDA", migration], ["identity tuple", idMigration]] as const) {
  const stmt = uniqueIndexStatement(sql);
  ok(`${label} · a CREATE UNIQUE INDEX statement exists outside the comments`,
    stmt.length > 0,
    "Everything below reads this statement. Without it they would all pass vacuously.");
  ok(`${label} · targets the real table (KycSubmission, never 'Kyc')`,
    /ON\s+"KycSubmission"/.test(stmt) && !/ON\s+"Kyc"\s*\(/.test(stmt),
    "`Kyc` is the app-layer name (db.kyc.*). There is no such table — that SQL fails.");
  ok(`${label} · is PARTIAL, so a REJECTED submission still frees the number`,
    /WHERE[\s\S]*status\s*<>\s*'REJECTED'/.test(stmt),
    "A total unique index would permanently burn an identity document on any rejection.");
  ok(`${label} · is idempotent (production applies it CONCURRENTLY by hand first)`,
    /IF NOT EXISTS/.test(stmt));
}
// ⭐ CONTROL · the comment-stripper must actually be capable of hiding prose from the
// assertions above, or the fix for `red:id-documents` case 2 is decoration.
ok("control · a WHERE clause that exists ONLY in a comment does not read as partial",
  !/WHERE[\s\S]*status\s*<>\s*'REJECTED'/.test(
    uniqueIndexStatement(`-- WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED'\nCREATE UNIQUE INDEX "x" ON "KycSubmission" ("idType", "idNumber");`),
  ));
// 🔴 THE PAIR, NOT THE NUMBER ALONE. An index on ("idNumber") alone would refuse a
// passport that shares its digits with somebody else's licence; an index on
// ("idType") is meaningless. This is the assertion the whole unit turns on.
ok('🔴 the identity index is on the TUPLE ("idType", "idNumber")',
  /CREATE UNIQUE INDEX[\s\S]{0,200}ON\s+"KycSubmission"\s*\(\s*"idType"\s*,\s*"idNumber"\s*\)/.test(idMigration),
  "One identity tuple, unique together. Three parallel per-document columns give\n" +
  "       one human four accounts and a route around a DUPLICATE_IDENTITY rejection.");
ok("…and it BACKFILLS the existing NIDA rows into that tuple",
  /UPDATE\s+"KycSubmission"[\s\S]{0,400}"idType"\s*=\s*'NIDA'[\s\S]{0,400}"idNumber"\s*=\s*"nidaNumber"/.test(idMigration),
  "Without the backfill every already-verified player reads as having no document,\n" +
  "       and their national ID stops being reserved.");
// ⛔ EXPAND ONLY. Dropping nidaNumber in the same migration 500s every KYC read on
// the previous container for the length of a rolling deploy — on an identity path.
ok("…and it does NOT drop the deprecated columns in the same migration",
  !/DROP\s+COLUMN/i.test(idMigration),
  "Railway health-checks the new deployment while the OLD one still serves, and\n" +
  "       Prisma selects every scalar column. The contract migration is a separate,\n" +
  "       recorded step (docs/COMPLIANCE-DECISIONS.md).");

const svc = read("src/lib/server/kyc-service.ts");
const svcCode = stripComments(svc);
ok("kyc-service pins the LIVE index name in one place",
  /ID_UNIQUE_INDEX\s*=\s*"KycSubmission_idType_idNumber_active_key"/.test(svcCode));
// ⚠️ REWRITTEN 2026-08-20 (contract step). This used to require the EXPORTED constant
// `NIDA_UNIQUE_INDEX` to exist — an assertion phrased as the transitional state, which
// goes RED the moment that state is correctly retired. The constant is gone with the
// column; what must survive is the RECOGNITION, because a row written before this
// release can still trip the legacy index by its old name until the column is dropped.
ok("🔴 the exported legacy-index constant is GONE with the column",
  !/NIDA_UNIQUE_INDEX/.test(svcCode),
  "A pinned name nothing can violate is a dead constant that reads as a live rule.");
ok("🔴 …and a legacy-index violation is STILL recognised as a duplicate, not a 500",
  /msg\.includes\("KycSubmission_nidaNumber_active_key"\)/.test(svcCode),
  "Until the columns are physically dropped, a submission that predates this release\n" +
  "       can still lose the race on the OLD index. The loser must get the readable\n" +
  "       `id_taken` refusal, not an unhandled error on an identity path.");
ok("the identity migration and the code agree on the live index name",
  idMigration.includes("KycSubmission_idType_idNumber_active_key"),
  "A rename in one place turns the constraint into an unhandled 500 for the loser\n" +
  "       of the race, instead of a readable refusal.");
// ── 3b · 🔴 THE CONTRACT MIGRATION — every way it can take production down ──────────
{
  ok("🔴 the contract migration exists", dropMigration.length > 0,
    `Missing ${DROP_MIGRATION}.`);

  // ⛔ READ THE CODE, NOT THE PROSE. A migration in this repo explains itself at length,
  // and its explanation necessarily QUOTES the SQL it is explaining — so a bare
  // `/CONCURRENTLY/` over the whole file fires on the paragraph saying why there is no
  // CONCURRENTLY. Both of these assertions failed exactly that way on their first run
  // against a correct file. It is the same decoy-anchor shape that made "is the index
  // PARTIAL?" pass over a TOTAL one, inside the expand migration's own comment.
  // ⚠️ `--` TO END OF LINE, ANYWHERE — not just on lines that START with it. Written
  // first as `/^\s*--.*$/gm`, and the RED case proved it insufficient in one run: a
  // mutation that commented a statement out INLINE (`SELECT 1; -- UPDATE "KycSubmission"`)
  // left the searched text sitting in the stripped output, so the backfill assertion
  // passed over a migration that no longer had a backfill. The guard was measuring a
  // comment, which is the exact shape it was written to defeat.
  const dropCode = dropMigration.replace(/--.*$/gm, "");
  ok("control · stripping the comments left the statements behind",
    /ALTER TABLE/.test(dropCode) && !/whole safety argument/.test(dropCode),
    "If this fires the stripper ate the SQL, and every assertion below it is vacuous.");
  ok("control · …and an INLINE comment is stripped too",
    !/hidden-by-inline/.test('SELECT 1; -- hidden-by-inline'.replace(/--.*$/gm, "")),
    "A statement commented out mid-line must not still be findable, or every shape\n" +
    "       assertion below can be satisfied by prose.");

  // ⭐ ORDER, INSIDE THE FILE. Postgres DROP COLUMN cascades to every index on the
  // column, so a DROP INDEX placed AFTER it addresses an index that no longer exists.
  // migrate deploy runs the file in ONE transaction, so that aborts the whole
  // migration — and `start` is `migrate deploy && … && next start`, so the container
  // never boots. IF EXISTS makes it survivable either way; the order makes it right.
  const iDropIdx = dropCode.indexOf('DROP INDEX IF EXISTS "KycSubmission_nidaNumber_active_key"');
  const iDropCol = dropCode.indexOf('DROP COLUMN IF EXISTS "nidaNumber"');
  const iBackfill = dropCode.search(/UPDATE\s+"KycSubmission"/);
  ok("🔴 it drops BOTH indexes on the column, by name",
    /DROP INDEX IF EXISTS "KycSubmission_nidaNumber_active_key"/.test(dropCode) &&
    /DROP INDEX IF EXISTS "KycSubmission_nidaNumber_idx"/.test(dropCode),
    "@@index([nidaNumber]) — KycSubmission_nidaNumber_idx, created 2026-06-14 — was left\n" +
    "       out of all three written statements of this step. Naming both puts them in the\n" +
    "       audit trail of what was removed instead of letting them vanish as a cascade.");
  ok("🔴 …and both columns", 
    /DROP COLUMN IF EXISTS "nidaNumber"/.test(dropCode) &&
    /DROP COLUMN IF EXISTS "nidaVerifiedAt"/.test(dropCode));
  ok("🔴 …with the index drops BEFORE the column drop",
    iDropIdx > 0 && iDropCol > 0 && iDropIdx < iDropCol,
    "A DROP INDEX after the DROP COLUMN cannot find its target; in one transaction that\n" +
    "       aborts the migration, and `next start` is never reached.");

  // ⭐ THE RE-BACKFILL. The expand migration's backfill was exhaustive AT THE TIME
  // because it created idNumber in the same file. But the code that shipped BEFORE the
  // tuple wrote nidaNumber with no idType/idNumber — so a row written by the previous
  // container mid-deploy, or after a rollback, is held ONLY by the legacy column.
  // Dropping without this line destroys that player's identity number and silently
  // frees a national ID that is in use.
  ok("🔴 it RE-RUNS the backfill, before the drop, in the same transaction",
    iBackfill > 0 && iBackfill < iDropCol &&
    /"idNumber"\s*=\s*"nidaNumber"/.test(dropCode) &&
    /WHERE\s+"nidaNumber" IS NOT NULL\s+AND\s+"idNumber" IS NULL/.test(dropCode),
    "A row written by a pre-tuple container carries nidaNumber with no idNumber. Without\n" +
    "       the re-backfill the drop destroys an identity number and frees a national ID.");
  ok("…and COALESCEs idVerifiedAt rather than overwriting it",
    /"idVerifiedAt"\s*=\s*COALESCE\("idVerifiedAt",\s*"nidaVerifiedAt"\)/.test(dropCode),
    "Assignment would clobber a timestamp written since the expand release.");

  // ⛔ NO CONCURRENTLY, EITHER DIRECTION. migrate deploy wraps a migration in a
  // transaction; neither CREATE INDEX CONCURRENTLY nor DROP INDEX CONCURRENTLY can run
  // inside one. (The session-52 note asking for a hand-applied CONCURRENTLY index first
  // was describing the EXPAND step — that index already exists. This file creates none.)
  ok("🔴 no CONCURRENTLY anywhere in the contract migration",
    !/CONCURRENTLY/i.test(dropCode),
    "CONCURRENTLY inside Prisma's transaction fails with 25001 and takes the boot with it.");
  ok("🔴 …and it CREATES nothing",
    !/CREATE\s+(UNIQUE\s+)?INDEX/i.test(dropCode),
    "The tuple index shipped with the expand migration. A second CREATE here would be a\n" +
    "       duplicate-name failure or, worse, a silently different definition.");

  // ⛔ IDEMPOTENCE. Pre-applying a migration by hand before pushing is normal practice
  // here (20260731120000's commit body records it), and CI replays each migration
  // exactly ONCE against a fresh database — so a file that is not re-runnable is GREEN
  // in CI and fatal on production, where it aborts migrate deploy and stops the boot.
  const ddl = dropMigration.split("\n").filter((l) => /^\s*(DROP|ALTER)\b/i.test(l));
  ok("control · the DDL lines were actually located", ddl.length >= 4, `found ${ddl.length}`);
  ok("🔴 every DDL statement is IF EXISTS",
    ddl.every((l) => /IF EXISTS/i.test(l)),
    `not re-runnable: ${ddl.filter((l) => !/IF EXISTS/i.test(l)).join(" | ")}\n` +
    "       CI replays a migration once, so a non-idempotent file is green there and fatal\n" +
    "       on a production database where it has already been applied by hand.");

  // ⛔ AND THE EXPAND FILE STAYS UNTOUCHED. Applied history is immutable, and two
  // assertions plus a RED case read it off disk.
  ok("🔴 the expand migration still contains no DROP",
    !/DROP\s+(COLUMN|INDEX)/i.test(idMigration),
    "Editing applied history to match the present tense is how a migration ledger stops\n" +
    "       being one — and the contract step is a SEPARATE file for exactly that reason.");
}

// ⛔ The 2026-07-31 migration file is IMMUTABLE APPLIED HISTORY: five assertions above
// read it off disk. It keeps naming the legacy index, and that is correct — a migration
// records what happened, not what is currently true.
ok("the legacy migration file still records the index it created",
  migration.includes("KycSubmission_nidaNumber_active_key"),
  "Editing applied history to match the present tense is how a database's audit trail\n" +
  "       stops being one.");
// ⚠️ An earlier draft of this assertion tested `/isNidaUniqueViolation\(/`, which
// matches the function's own DEFINITION. Deleting the catch-block guard left the
// gate GREEN — the guard was reading a symbol that happened to be nearby instead
// of the control itself. Caught by mutating the source on purpose. Assert the
// WIRING: the handler must be CALLED, and must re-throw anything else.
ok("🔴 the losing writer is translated into a player-readable refusal",
  /if\s*\(\s*!\s*isIdUniqueViolation\s*\([^)]*\)\s*\)\s*throw\b/.test(svcCode),
  "Without this the second submitter gets a raw Prisma error. The refusal must look\n" +
  "       the same whether the duplicate was sequential or a race — and a NON-constraint\n" +
  "       error must still propagate rather than be swallowed as a duplicate.");
ok("…and the refusal wording is shared with the sequential-duplicate path",
  (svcCode.match(/already linked to another account/g) ?? []).length >= 2,
  "A race and an ordinary duplicate must be indistinguishable to the player.");
ok("…and the race is audited exactly like an ordinary duplicate",
  (svcCode.match(/kyc\.id\.duplicate_blocked/g) ?? []).length >= 2,
  "AML needs both refusals in the log under one action name.");
// ⛔ AND THE DUPLICATE CHECK MUST ASK FOR THE PAIR. `findActiveByIdNumber(type, number)`
// — a read on the number alone would disagree with the index that enforces the rule,
// so a race would resolve differently from a sequential duplicate.
ok("🔴 the fast-path duplicate read matches on (type, number)",
  /findActiveByIdNumber\s*\(\s*idType\s*,\s*idNumber\s*,\s*userId\s*\)/.test(svcCode),
  "The read and the index must ask one question, or the two disagree under load.");

// The proof itself must stay runnable, or the guarantee decays into a memory.
// ⚠️ "PRESENT" IS NOT "RUNNABLE", and this assertion used to check only that the file
// still contained the string "must be exactly 1". Its verdict query named "nidaNumber"
// in raw SQL, so the contract migration would have made the proof throw 42703 on its
// last line with this gate reporting green — a red harness with a dead anchor is an
// ABSENT test, over the one control that stops two accounts sharing a national ID.
{
  const race = read("scripts/load/s14-kyc-nida-race.mts");
  ok("the two-process race proof is still present",
    race.includes("must be exactly 1"));
  ok("🔴 …and its verdict SQL names columns that exist",
    /"idType"\s*=\s*'NIDA'\s*AND\s*"idNumber"\s*=/.test(race) && !/"nidaNumber"\s*=/.test(race),
    "Raw SQL is invisible to tsc and to Prisma's types. A dropped column in a\n" +
    "       $queryRawUnsafe fails at RUNTIME, on the line that decides the verdict.");
  const dec = read("scripts/load/s15-kyc-decision-race.mts");
  ok("🔴 …and the decision-race fixture inserts the tuple, not the dropped mirror",
    /INSERT INTO "KycSubmission"[\s\S]{0,200}"idType",\s*"idNumber"/.test(dec) && !/"nidaNumber"/.test(dec),
    "An INSERT naming a dropped column throws before the race it is setting up begins.");
}

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
  /verified === false/.test(actions) && actions.indexOf("verified === false") < actions.indexOf('"/profile/kyc?id=accepted"'),
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
  ["identity check fails → REJECTED", "submitIdentityStep", "kycRejectedHtml"],
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
