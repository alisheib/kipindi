/**
 * Leader election for work that must run ONCE across the whole platform, not once per
 * container.
 *
 * 🔴 WHY. `lifecycle.ts` guards its sweeps with a module-local boolean. That is correct
 * for one process and meaningless across two: a second Railway replica would run payment
 * reconcile, bonus expiry, schedule reconcile and the wallet↔ledger trial balance on its
 * own 60-second timer, at the same time as the first. On a money platform the reconcile
 * sweep is the dangerous one — two containers re-querying the same in-flight payments and
 * acting on the answers is how a payout gets dispatched twice.
 *
 * Production runs ONE container today, so nothing is broken right now. The problem is that
 * nothing STOPS someone scaling to two: the failure would be silent, intermittent, and
 * would look like a gateway bug.
 *
 * ── Why a lease row and not just an advisory lock ──────────────────────────────────
 * `withLock()` uses `pg_advisory_xact_lock`, which is TRANSACTION-scoped: it is released
 * the moment the surrounding transaction commits. A sweep takes seconds to minutes and
 * runs many transactions of its own, so the lock cannot simply be held for its duration —
 * and a session-scoped lock would leak on a killed container and block every future pass.
 *
 * So: a short-lived LEASE, stored in `SystemConfig`, claimed and renewed inside the
 * advisory lock (which makes the read-then-write atomic across containers). A leader that
 * dies stops renewing and the lease expires on its own — no manual clean-up, no stuck
 * chore, no lock to reap.
 *
 * ── What this deliberately does NOT cover ──────────────────────────────────────────
 * `admission.ts` stays per-container by design: its own invariant 4 forbids Redis or any
 * network hop on the bet path, because a stall there costs a player their bet. The
 * consequence is a NUMBER, not a hand-wave — see docs/POLISH-BACKLOG.md §3.
 */
import { withLock } from "./locks";
import { loadConfig, saveConfig } from "./config-store";
import { hasDatabase } from "./prisma";
import { randomBytes } from "node:crypto";

/**
 * This process's identity for the lifetime of the container. Random rather than derived
 * from a hostname: two Railway replicas of the same service can present the same hostname,
 * and two leaders that believe they are the same leader is the exact failure being
 * prevented.
 */
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_INSTANCE_ID: string | undefined;
}
// ⚠️ Also pinned on globalThis. Next.js can instantiate this module more than once inside
// ONE container (route handlers and instrumentation.ts do not share a graph). With a
// per-module id, those instances would contend for the lease as though they were separate
// machines — the lease would flap between two halves of the same process, and each
// handover costs a tick of payment reconcile. One container must be one identity.
export const INSTANCE_ID: string =
  globalThis.__50PICK_INSTANCE_ID ??
  (globalThis.__50PICK_INSTANCE_ID = `${process.env.RAILWAY_REPLICA_ID ?? "local"}-${randomBytes(6).toString("hex")}`);

/**
 * How long a claim is good for. Three ticks: long enough that one slow pass does not hand
 * leadership to another container mid-sweep, short enough that a container which dies
 * holding it is replaced within a few minutes.
 */
export const LEASE_MS = 3 * 60_000;

export type Lease = { holder: string; expiresAt: number; renewedAt: number };

const keyFor = (task: string): string => `__LEADER_${task}__`;

/**
 * Last known lease per task, for `/api/health`. Never used to make a decision.
 *
 * 🔴 PINNED ON globalThis, and that is not decoration. The first deploy of this module
 * reported `"leadership": {}` on a live container whose ticker was demonstrably running:
 * Next.js gives the route handler a different module instance from `instrumentation.ts`,
 * so the route was reading its own empty Map. `rate-limit.ts` pins its buckets the same
 * way for the same reason. A diagnostic that always reads empty is exactly the silent
 * state this field was added to remove.
 */
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_LEADER_OBSERVED: Map<string, { holder: string; expiresAt: number; isMe: boolean }> | undefined;
}
const observed: Map<string, { holder: string; expiresAt: number; isMe: boolean }> =
  globalThis.__50PICK_LEADER_OBSERVED ?? (globalThis.__50PICK_LEADER_OBSERVED = new Map());

/**
 * Try to become (or stay) the leader for `task`.
 *
 * The read-modify-write happens inside `withLock`, which is a Postgres advisory lock and
 * therefore serialises across containers. Without it, two containers reading an expired
 * lease at the same instant would both write themselves in and both believe they won.
 */
export async function acquireLeadership(task: string, now = Date.now()): Promise<boolean> {
  // Single-process mode (dev, tests, no DATABASE_URL): there is nobody to contend with,
  // and refusing to run the sweeps would break every local workflow.
  if (!hasDatabase()) {
    observed.set(task, { holder: INSTANCE_ID, expiresAt: now + LEASE_MS, isMe: true });
    return true;
  }

  return withLock(`leader:${task}`, async () => {
    const current = await loadConfig<Lease>(keyFor(task));
    const mine = current?.holder === INSTANCE_ID;
    const expired = !current || current.expiresAt <= now;

    // Renew if it is already ours; take it if nobody holds a live one. Never steal a
    // live lease — that is the whole point.
    if (!mine && !expired) {
      observed.set(task, { holder: current.holder, expiresAt: current.expiresAt, isMe: false });
      return false;
    }

    const lease: Lease = { holder: INSTANCE_ID, expiresAt: now + LEASE_MS, renewedAt: now };
    await saveConfig(keyFor(task), lease);
    observed.set(task, { holder: INSTANCE_ID, expiresAt: lease.expiresAt, isMe: true });
    return true;
  }).catch((e) => {
    // Fail CLOSED. If the lease cannot be read or written we do not know whether another
    // container is mid-sweep, and running anyway is the outcome this module exists to
    // prevent. A skipped tick costs 60 seconds; a double payment reconcile costs money.
    console.error(`[leader] could not acquire "${task}" — skipping this pass:`, (e as Error)?.message ?? e);
    return false;
  });
}

/** Give up the lease immediately, so a redeploying container does not hold it for 3 minutes. */
export async function releaseLeadership(task: string): Promise<void> {
  if (!hasDatabase()) return;
  try {
    await withLock(`leader:${task}`, async () => {
      const current = await loadConfig<Lease>(keyFor(task));
      // Only ever release our OWN lease. Clearing someone else's would be the same bug
      // as stealing it.
      if (current?.holder === INSTANCE_ID) {
        await saveConfig(keyFor(task), { holder: current.holder, expiresAt: 0, renewedAt: Date.now() } satisfies Lease);
      }
    });
  } catch {
    // Best effort: the lease expires on its own within LEASE_MS.
  }
}

/** What this process last observed, for `/api/health`. Diagnostic only. */
export function leadershipSnapshot(): Record<string, { holder: string; isMe: boolean; expiresInSec: number }> {
  const out: Record<string, { holder: string; isMe: boolean; expiresInSec: number }> = {};
  for (const [task, v] of observed) {
    out[task] = {
      // The holder id is not a secret, but it is noise; the useful bit is whether it is us.
      holder: v.isMe ? "this instance" : v.holder.slice(0, 12),
      isMe: v.isMe,
      expiresInSec: Math.max(0, Math.round((v.expiresAt - Date.now()) / 1000)),
    };
  }
  return out;
}
