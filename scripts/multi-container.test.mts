/**
 * MULTI-CONTAINER — what is safe to run on more than one instance, and what is not.
 *
 * Production runs ONE container. Nothing was broken by that; what was missing was
 * anything that would stop someone scaling to two. The lifecycle chores — payment
 * reconcile, bonus expiry, schedule reconcile, the wallet↔ledger trial balance — were
 * guarded by a module-local boolean, which is correct for one process and meaningless
 * across two. Two containers re-querying the same in-flight payments and acting on the
 * answers is the failure, and it would have looked like a gateway bug.
 *
 * ⚠️ THE REAL PROOF IS NOT HERE. Leader election cannot be tested in one process:
 * `leader.ts` keeps its instance id in module scope, so two calls inside one Node process
 * share an identity and always agree — the exact illusion that makes a broken election
 * look correct. Two REAL OS processes racing against real Postgres is
 * `scripts/load/s12-leader-contention.mts`, wired into CI beside the s10/s11 proofs.
 * Removing the advisory lock from the election makes BOTH instances win; verified.
 *
 * This suite covers the parts that hold in-process: the fail-closed/fail-open decisions,
 * and the written-down ceiling for the piece that stays per-container on purpose.
 */
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const read = (p: string): string => readFileSync(new URL(p, import.meta.url), "utf8");
const leader = read("../src/lib/server/leader.ts");
const lifecycle = read("../src/lib/server/lifecycle.ts");
const admission = read("../src/lib/server/admission.ts");
const redis = read("../src/lib/server/redis.ts");

console.log("\n── 1 · The election is serialised by the database ───────────────");

ok("the claim happens inside withLock", /withLock\(`leader:\$\{task\}`/.test(leader),
  "without it, two containers reading an expired lease at the same instant both win — " +
  "proven by removing it and watching s12 report 2 winners of 2");
ok("a LIVE lease is never stolen", /if \(!mine && !expired\)/.test(leader));
ok("the lease EXPIRES, so a dead container cannot stall the chores forever",
  /expiresAt <= now/.test(leader) && /LEASE_MS/.test(leader));
ok("release only ever clears the caller's OWN lease",
  /current\?\.holder === INSTANCE_ID/.test(leader),
  "clearing someone else's is the same bug as stealing it");

console.log("\n── 2 · Fail CLOSED, not open ───────────────────────────────────");

// A skipped tick costs 60 seconds. A doubled payment reconcile costs money. When the
// lease cannot be read we do not know whether another container is mid-sweep.
const catchAt = leader.indexOf(".catch((e) => {");
ok("the failure path was located", catchAt !== -1);
ok("🔴 an unreadable lease SKIPS the pass rather than running blind",
  catchAt !== -1 && leader.slice(catchAt, catchAt + 700).includes("return false;"),
  "returning true here would run the sweeps on every container during a database blip");

console.log("\n── 3 · The ticker actually asks ────────────────────────────────");

const passAt = lifecycle.indexOf("export async function runLifecyclePass");
ok("runLifecyclePass was located", passAt !== -1);
// Wide enough to hold the whole function: the skip/overrun block alone is ~1.5 kB, and a
// window that stops short reports "not found" for code that is plainly there — which is
// a gate failing for the wrong reason, the mirror image of one passing for the wrong one.
const body = passAt === -1 ? "" : lifecycle.slice(passAt, passAt + 8000);
ok("it acquires leadership before doing any work",
  /acquireLeadership\(LIFECYCLE_TASK\)/.test(body));
ok("…and returns when it is not the leader",
  /if \(!\(await acquireLeadership\(LIFECYCLE_TASK\)\)\) \{/.test(body));
// Position matters: acquiring AFTER the chores would be decoration. Anchored on the CALL,
// not the name — `maybeReconcileSchedules` is also declared earlier in the file.
const acquireIdx = body.indexOf("acquireLeadership(LIFECYCLE_TASK)");
const choresIdx = body.indexOf("await maybeReconcileSchedules()");
ok("🔴 the check comes BEFORE the chores, not after",
  acquireIdx !== -1 && choresIdx !== -1 && acquireIdx < choresIdx,
  `acquire@${acquireIdx} chores@${choresIdx}`);
ok("the lease is handed back on shutdown",
  /releaseLeadership\(LIFECYCLE_TASK\)/.test(lifecycle) && /SIGTERM/.test(lifecycle),
  "otherwise every deploy stalls the chores for up to LEASE_MS while the lease expires");

console.log("\n── 4 · Redis stays OFF the bet path, and fails open ─────────────");

ok("admission.ts does not import redis", !/from "\.\/redis"/.test(admission),
  "a Redis stall on the bet path costs a player their bet — admission invariant 4");
ok("every Redis access goes through a fallback", /withRedis/.test(redis));
ok("a dead server does not buffer work", /enableOfflineQueue: false/.test(redis),
  "buffering on a fail-open cache means requests hang holding a promise");
ok("two keys are required to arm it", /REDIS_ENABLED/.test(redis) && /REDIS_URL/.test(redis),
  "configuring and activating are deliberately separate acts");

console.log("\n── 5 · What stays per-container is written down, with a number ──");

const backlog = read("../docs/POLISH-BACKLOG.md");
ok("the backlog states the admission ceiling", /pool − 4|pool - 4/.test(backlog));
ok("…as an arithmetic consequence, not a shrug", /N ×|N x |N&nbsp;×/.test(backlog),
  "\"multi-container is unsafe\" is not actionable; \"N containers need the pool sized N×\" is");
ok("the ticker is no longer listed as unsafe",
  !/ticker'?s? `lastReconcileAt`\/`lastPaymentSweepAt`.{0,80}module-local/s.test(backlog) ||
    /leader lease/i.test(backlog),
  "the doc must move when the code does");

console.log(`\n${"─".repeat(64)}\n  MULTI-CONTAINER: ${pass} passed, ${fail} failed\n${"─".repeat(64)}`);
process.exit(fail === 0 ? 0 : 1);
