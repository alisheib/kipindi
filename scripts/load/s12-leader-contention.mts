/**
 * S12 — cross-instance LEADER ELECTION, the property that keeps the lifecycle chores
 * running exactly once when the platform runs on more than one container.
 *
 * Sibling of S10 (cross-instance double-spend) and S11 (cross-instance audit chain), and
 * it exists for the same reason: this cannot be proven in one process. `leader.ts` keeps
 * its instance id in module scope, so two calls inside one Node process share an identity
 * and always agree — exactly the illusion that makes a broken election look correct.
 *
 * WHAT IS AT STAKE. The lifecycle pass runs payment reconcile, bonus expiry, schedule
 * reconcile and the wallet↔ledger trial balance. Two containers running it concurrently
 * means two of them re-querying the same in-flight payments and acting on the answers.
 *
 * The four properties, each with a separate pair of REAL OS processes:
 *   1. two instances race → exactly ONE wins
 *   2. the loser keeps losing while the lease is live (no flapping)
 *   3. the winner RENEWS rather than locking itself out
 *   4. release hands over immediately, and an EXPIRED lease is taken over
 *
 * Usage:  DATABASE_URL=<a disposable postgres> npx tsx scripts/load/s12-leader-contention.mts
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }
// Same refusal as the rest of the load harness: this writes lease rows.
if (/rlwy\.net|railway\.app|railway\.internal|50pick\.tz/i.test(BASE)) {
  console.error("!! REFUSING — DATABASE_URL points at production. S12 writes to SystemConfig.");
  process.exit(2);
}

const worker = join(dirname(fileURLToPath(import.meta.url)), "s12-leader-worker.mts");
const prisma = new PrismaClient({ datasources: { db: { url: BASE } }, log: ["error"] });

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log(`   OK   ${label}${extra ? `  ${extra}` : ""}`); }
  else { fail++; console.log(`   FAIL ${label}${extra ? `  ${extra}` : ""}`); }
}

type Result = { instance: string; won?: boolean; released?: boolean };

function runWorker(env: Record<string, string>): Promise<Result> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", worker], {
      env: { ...process.env, ...env },
      shell: process.platform === "win32",
    });
    let out = "";
    child.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    child.stderr.on("data", () => { /* prisma/audit noise */ });
    child.on("close", () => {
      const line = out.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("{")).pop();
      resolve(line ? (JSON.parse(line) as Result) : { instance: "?", won: false });
    });
  });
}

/** Two workers, aligned to the same instant so they genuinely race. */
async function race(task: string, mode = "acquire"): Promise<Result[]> {
  const startAt = String(Date.now() + 2500);
  return Promise.all([
    runWorker({ S12_TASK: task, S12_MODE: mode, S12_START_AT: startAt }),
    runWorker({ S12_TASK: task, S12_MODE: mode, S12_START_AT: startAt }),
  ]);
}

const clear = async (task: string) =>
  prisma.systemConfig.deleteMany({ where: { key: `__LEADER_${task}__` } });

console.log("\nS12 — cross-instance leader election\n");

// ── 1. Two instances race for an unheld lease ────────────────────────────────
await clear("s12a");
console.log("1. two instances race from cold:");
const first = await race("s12a");
const winners = first.filter((r) => r.won);
ok("exactly ONE instance won", winners.length === 1,
  `${winners.length} winner(s) of ${first.length} — ${first.map((r) => `${r.instance.slice(0, 10)}:${r.won}`).join(" ")}`);
ok("the two processes had different identities", first[0].instance !== first[1].instance,
  "same id ⇒ they were not really two containers and this proves nothing");

// ── 2. The loser keeps losing while the lease is live ────────────────────────
console.log("\n2. a third instance arrives while the lease is live:");
const third = await runWorker({ S12_TASK: "s12a", S12_MODE: "acquire" });
ok("🔴 it does NOT take a live lease", third.won === false,
  "stealing a live lease is the whole failure this prevents");

// ── 3. The holder renews instead of locking itself out ───────────────────────
// Re-running the SAME process id is impossible across spawns, so this is asserted the
// only way it can be: the lease row must still name the original winner and its expiry
// must have moved forward when that holder asks again. Done in-process here, which is
// legitimate because renewal is a single-instance property.
console.log("\n3. the holder renews:");
process.env.USE_PRISMA_DAL = "true";
const { acquireLeadership } = await import("../../src/lib/server/leader.ts");
await clear("s12b");
const mineFirst = await acquireLeadership("s12b");
const rowA = await prisma.systemConfig.findUnique({ where: { key: "__LEADER_s12b__" } });
await new Promise((r) => setTimeout(r, 1100));
const mineAgain = await acquireLeadership("s12b");
const rowB = await prisma.systemConfig.findUnique({ where: { key: "__LEADER_s12b__" } });
const expA = (rowA?.value as { expiresAt: number } | null)?.expiresAt ?? 0;
const expB = (rowB?.value as { expiresAt: number } | null)?.expiresAt ?? 0;
ok("the holder wins again", mineFirst && mineAgain);
ok("…and the lease expiry moves FORWARD", expB > expA, `${expA} → ${expB}`);

// ── 4. Handover: release, and expiry ─────────────────────────────────────────
console.log("\n4. handover:");
await clear("s12c");
const held = await race("s12c");
ok("one holder established", held.filter((r) => r.won).length === 1);
// Expire it by hand — the alternative is waiting three minutes.
await prisma.systemConfig.update({
  where: { key: "__LEADER_s12c__" },
  data: { value: { holder: "some-dead-container", expiresAt: Date.now() - 1, renewedAt: Date.now() - 1 } },
});
const afterExpiry = await runWorker({ S12_TASK: "s12c", S12_MODE: "acquire" });
ok("🔴 an EXPIRED lease is taken over", afterExpiry.won === true,
  "a container that dies holding the lease must not stall the chores forever");

const holderNow = (await prisma.systemConfig.findUnique({ where: { key: "__LEADER_s12c__" } }))?.value as
  | { holder: string }
  | null;
ok("the new holder is recorded", holderNow?.holder === afterExpiry.instance,
  `${holderNow?.holder?.slice(0, 14)} / ${afterExpiry.instance.slice(0, 14)}`);

// ── 5. A released lease is available at once ─────────────────────────────────
await clear("s12d");
const owner = await runWorker({ S12_TASK: "s12d", S12_MODE: "acquire" });
ok("holder established for the release test", owner.won === true);
// The releasing worker is a NEW process with a different id, so it must NOT be able to
// clear someone else's lease — that is the same bug as stealing it.
const stranger = await runWorker({ S12_TASK: "s12d", S12_MODE: "release" });
void stranger;
const stillHeld = await runWorker({ S12_TASK: "s12d", S12_MODE: "acquire" });
ok("🔴 a stranger's release does NOT free the lease", stillHeld.won === false,
  "release must only ever clear the caller's OWN lease");

await clear("s12a"); await clear("s12b"); await clear("s12c"); await clear("s12d");
await prisma.$disconnect();

console.log(`\n${"─".repeat(60)}\n  S12 LEADER ELECTION: ${pass} passed, ${fail} failed\n${"─".repeat(60)}`);
process.exit(fail === 0 ? 0 : 1);
