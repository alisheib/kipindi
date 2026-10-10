/**
 * S14 — "one NIDA, one account" across two instances.
 *
 * IDENTITY-POLICY.md (Ali, 2026-07-19) states the ENTIRE identity control is format
 * + uniqueness: there is no authority check, so uniqueness is not a nicety — it
 * is the only thing standing between one human and two funded accounts. It is a
 * P0 AML control for a licensed book. ⭐ And since 2026-10-10 a typed identity is
 * APPROVED AT ONCE when the automatic checks pass (`verifyIdentity`), so the losing
 * racer here would not merely hold a number — it would hold an APPROVED identity,
 * withdrawals open, on somebody else's document.
 *
 * The control is a read-then-write: a FAST PATH read before the lock
 *
 *     kyc-service.ts   checkIdentityAvailable → db.kyc.findActiveByIdNumber(idType, idNumber, userId)
 *
 * and the write under `underSubmissionLock` — which is keyed by USER, so it
 * serialises one user against themselves, never two different users against each
 * other. The uniqueness comes from the partial unique index
 * `KycSubmission_idType_idNumber_active_key` (raw SQL: the Prisma DSL has no
 * partial-unique syntax); the loser's write throws and `verifyIdentity` reports it
 * as the same `id_taken` a sequential duplicate gets.
 *
 * Two OS processes (each its own PrismaClient + pool = a Railway container)
 * press "Verify" with the SAME NIDA for two DIFFERENT users, aligned to one
 * wall-clock instant so both are inside the window together.
 *
 * PASS = exactly ONE active submission ends up holding that NIDA.
 * FAIL = two users hold the same national ID ⇒ one human, two accounts, and
 *        every downstream control that assumes one-NIDA-one-account is void.
 *
 * ⭐ ONE FILE, TWO ROLES (2026-10-10). This file is its own worker: run with
 * `LOAD_WORKER_ID` set it presses `verifyIdentity` once and prints one
 * `__S14_RESULT__` line. ⚠️ The separate `s14-kyc-nida-worker.mts` called
 * `submitNidaStep`, a function deleted long before this change — the race had been
 * proving nothing since — and is no longer spawned.
 *
 * Usage:
 *   $env:DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public'
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/s14-kyc-nida-race.mts
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }

// ── THE WORKER ROLE ──────────────────────────────────────────────────────────
if (process.env.LOAD_WORKER_ID) {
  const { LOAD_USER, LOAD_NIDA, LOAD_DOB, LOAD_START_AT, LOAD_WORKER_ID } = process.env;
  if (!LOAD_USER || !LOAD_NIDA || !LOAD_START_AT) {
    console.error("s14 worker: missing env");
    process.exit(1);
  }
  const { verifyIdentity } = await import("../../src/lib/server/kyc-service.ts");
  // Barrier: spin until the agreed instant so both processes race, rather than
  // one finishing before the other has connected its pool.
  const startAt = Number(LOAD_START_AT);
  while (Date.now() < startAt) await new Promise((r) => setTimeout(r, 2));
  let outcome: Record<string, unknown>;
  try {
    // The typed one-press form: the account has no date of birth, so the typed one is used (and adopted).
    const r = await verifyIdentity(LOAD_USER, { idType: "NIDA", idNumber: LOAD_NIDA, fullName: "Asha Mwamba Juma", dob: LOAD_DOB ?? "1990-01-01" });
    outcome = r.ok
      ? { accepted: r.data?.outcome !== "refused", outcome: r.data?.outcome ?? null, routes: r.data?.routes ?? null }
      : { accepted: false, code: r.code ?? null, reason: (r as { reason?: string }).reason ?? null, error: r.error };
  } catch (e) {
    outcome = { accepted: false, threw: String((e as Error)?.message ?? e).slice(0, 200) };
  }
  console.log(`__S14_RESULT__ ${JSON.stringify({ worker: LOAD_WORKER_ID, ...outcome })}`);
  process.exit(0);
}

// ── THE COORDINATOR ROLE ─────────────────────────────────────────────────────
const client = new PrismaClient({ datasources: { db: { url: BASE } } });

// Gate 3 (see scripts/load/README.md): a property of the DATABASE, so a wrong
// env var cannot point this at anything real.
{
  const r = await client.$queryRawUnsafe<{ value: unknown }[]>(
    `SELECT value FROM "SystemConfig" WHERE key = '__LOAD_TEST_TARGET__'`).catch(() => []);
  if (r[0]?.value !== "I_AM_A_DISPOSABLE_LOAD_TEST_DB") {
    console.error("");
    console.error("  ABORT — target DB is not a certified disposable load-test DB.");
    process.exit(2);
  }
}

const rid = Math.random().toString(36).slice(2, 8);
const USER_A = `${rid}_a`;
const USER_B = `${rid}_b`;
// 20 digits, not ending 0000 (SANCTIONED) or 9999 (MISMATCH) — the local NIDA mock's QA hooks.
// Digits 1-8 are the holder's birth date and match LOAD_DOB, so nothing here routes or flags on age.
const NIDA = ("19900101" + String(Date.now())).slice(0, 19) + "7";
const DOB = "1990-01-01";

for (const [id, phone] of [[USER_A, "+255700000911"], [USER_B, "+255700000912"]] as const) {
  await client.$executeRawUnsafe(`
    INSERT INTO "User" (id, "phoneE164", "failedLoginCount", role, status, locale,
                        "marketingOptIn", "twoFactorEnabled", "createdAt", "updatedAt")
    VALUES ('${id}', '${phone}', 0, 'PLAYER', 'ACTIVE', 'EN', false, false, now(), now())`);
  await client.$executeRawUnsafe(`
    INSERT INTO "KycSubmission" (id, "userId", status, "createdAt", "updatedAt")
    VALUES ('kyc_${id}', '${id}', 'IN_PROGRESS', now(), now())`);
}

console.log("");
console.log(`  S14 — one NIDA, one account (cross-instance)`);
console.log(`  NIDA ${NIDA}`);
console.log(`  2 separate OS processes, 2 different users, 1 national ID, "Verify" pressed together`);
console.log("");

const self = fileURLToPath(import.meta.url);
const startAt = Date.now() + 4000; // both spin to this instant

function runWorker(id: string, user: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      LOAD_WORKER_ID: id, LOAD_USER: user, LOAD_NIDA: NIDA,
      LOAD_DOB: DOB, LOAD_START_AT: String(startAt),
    };
    const child = spawn("npx", ["tsx", self], { env, shell: true });
    let out = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", () => { /* audit/email noise */ });
    child.on("close", () => {
      const line = out.split(String.fromCharCode(10)).find((l) => l.includes("__S14_RESULT__"));
      if (!line) return reject(new Error(`worker ${id} produced no result: ${out.slice(-500)}`));
      resolve(JSON.parse(line.replace("__S14_RESULT__", "").trim()));
    });
  });
}

const [a, b] = await Promise.all([runWorker("A", USER_A), runWorker("B", USER_B)]);
console.log(`   worker A: ${JSON.stringify(a)}`);
console.log(`   worker B: ${JSON.stringify(b)}`);

/* ── Verdict, straight from SQL ───────────────────────────────────────────── */
// ⚠️ READS THE TUPLE SINCE 2026-08-20. This query named "nidaNumber" until the
// contract migration, and would have thrown 42703 the moment the column was dropped —
// while `test:cert-d1`'s "the two-process race proof is still present" assertion, which
// only greps this file for the string "must be exactly 1", stayed GREEN. A red harness
// with a dead anchor is an ABSENT test, and this one guards a P0 AML control.
const holders = await client.$queryRawUnsafe<{ userId: string; status: string; auto: boolean }[]>(
  `SELECT "userId", status::text, ("autoApprovedAt" IS NOT NULL) AS auto FROM "KycSubmission"
    WHERE "idType" = 'NIDA' AND "idNumber" = '${NIDA}' AND status <> 'REJECTED'`);

console.log("");
console.log("  ── verdict (from the database) ─────────────────────────────────");
console.log(`     active submissions holding this NIDA : ${holders.length}   (must be exactly 1)`);
for (const h of holders) console.log(`       · ${h.userId} — ${h.status}${h.auto ? " (approved automatically)" : ""}`);
// The loser is told what a sequential duplicate is told — never a 500.
const loser = [a, b].find((r) => !r.accepted);
console.log(`     the other press was refused with     : ${String(loser?.reason ?? loser?.code ?? loser?.threw ?? "—")}   (expected id_taken)`);

const pass = holders.length === 1;

console.log("");
console.log("  ═════════════════════════════════════════════════════════════════");
if (pass) {
  console.log(`   PASS — the database refused the second writer. "One NIDA, one`);
  console.log(`   account" holds even when two containers press "Verify" on the same`);
  console.log(`   national ID in the same instant.`);
} else {
  console.log(`   FAIL — ${holders.length} accounts now hold national ID ${NIDA}.`);
  console.log(`   The fast-path duplicate read (checkIdentityAvailable) is not atomic,`);
  console.log(`   and the partial unique index did not stop the second write. One human`);
  console.log(`   can hold two verified accounts — the AML control that the whole`);
  console.log(`   identity policy rests on is defeated by timing alone.`);
}
console.log("  ═════════════════════════════════════════════════════════════════");
console.log("");
await client.$disconnect();
process.exit(pass ? 0 : 1);
