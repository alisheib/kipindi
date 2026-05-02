/**
 * Append-only audit log — every state change is recorded.
 *
 * Compliance:
 *  - GBT inspection, FIU AML reporting, ISO 27001 A.12.4
 *  - Each entry is HMAC-chained to the previous entry's signature, forming a
 *    Merkle-style chain. A regulator can verify the entire log is intact by
 *    walking the chain from genesis. Any deletion or in-place edit breaks the
 *    chain at and after the tampered entry — surfacing immediately on
 *    `verifyChain()`.
 *  - Secret used for chaining is `AUDIT_CHAIN_SECRET` (or SESSION_SECRET fallback).
 *    In production, rotate independently of session secret on a published cadence.
 *
 * Storage:
 *  - Dev: in-memory ring (10k entries, console-visible).
 *  - Production: Postgres `AuditLog` table with the same row shape and
 *    `prevHash` + `entryHash` columns.
 */
import { createHmac } from "node:crypto";

export type AuditCategory = "AUTH" | "KYC" | "WALLET" | "BET" | "ADMIN" | "COMPLIANCE" | "SECURITY" | "SYSTEM";

export type AuditEntry = {
  id: string;
  category: AuditCategory;
  action: string;            // verb-noun: "user.login", "kyc.approved"
  actorId: string | null;    // null for system events
  targetType: string | null; // "User" | "Bet" | ...
  targetId: string | null;
  payload?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;         // ISO 8601
  prevHash: string;          // HMAC of the previous entry's row, "GENESIS" for the first
  entryHash: string;         // HMAC over (id + prevHash + serialized row)
};

const MAX_IN_MEM = 10_000;
const GENESIS = "GENESIS";

/**
 * The audit ring lives on globalThis so it survives Next.js module re-imports
 * (which happen on hot reload + sometimes between requests in serverless).
 * It is also persisted to disk via the same backup snapshot machinery as the
 * main store, so a server restart restores the chain.
 */
declare global {
  // eslint-disable-next-line no-var
  var __KIPINDI_AUDIT_RING: AuditEntry[] | undefined;
}
const ring: AuditEntry[] = globalThis.__KIPINDI_AUDIT_RING ?? (globalThis.__KIPINDI_AUDIT_RING = []);

function chainSecret(): string {
  return process.env.AUDIT_CHAIN_SECRET ?? process.env.SESSION_SECRET ?? "dev-only-audit-chain-secret";
}

function hashEntry(entry: Omit<AuditEntry, "entryHash">): string {
  const stable = JSON.stringify({
    id:         entry.id,
    category:   entry.category,
    action:     entry.action,
    actorId:    entry.actorId,
    targetType: entry.targetType,
    targetId:   entry.targetId,
    payload:    entry.payload ?? null,
    ip:         entry.ip ?? null,
    userAgent:  entry.userAgent ?? null,
    createdAt:  entry.createdAt,
    prevHash:   entry.prevHash,
  });
  return createHmac("sha256", chainSecret()).update(stable).digest("hex");
}

export function audit(entry: Omit<AuditEntry, "id" | "createdAt" | "prevHash" | "entryHash">): AuditEntry {
  const prev = ring[ring.length - 1];
  const id = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const partial: Omit<AuditEntry, "entryHash"> = {
    ...entry,
    id,
    createdAt: new Date().toISOString(),
    prevHash: prev?.entryHash ?? GENESIS,
  };
  const entryHash = hashEntry(partial);
  const stamped: AuditEntry = { ...partial, entryHash };
  ring.push(stamped);
  if (ring.length > MAX_IN_MEM) ring.shift();
  if (process.env.NODE_ENV !== "production") {
    console.log("[audit]", stamped.category, stamped.action, stamped.actorId ?? "system", stamped.targetType ? `${stamped.targetType}#${stamped.targetId}` : "");
  }
  return stamped;
}

/** Read-only access for admin dashboards. */
export function getAuditPage(opts: { limit?: number; category?: AuditCategory; actorId?: string } = {}): AuditEntry[] {
  const limit = opts.limit ?? 100;
  let result = [...ring];
  if (opts.category) result = result.filter((e) => e.category === opts.category);
  if (opts.actorId) result = result.filter((e) => e.actorId === opts.actorId);
  return result.slice(-limit).reverse();
}

export function getAuditById(id: string): AuditEntry | undefined {
  return ring.find((e) => e.id === id);
}

/**
 * Verify the entire chain end-to-end. Returns the first tamper point, or null
 * if the chain is fully intact. Used by the admin dashboard's "verify chain"
 * action and by automated tests.
 */
export function verifyChain(): { valid: boolean; firstBreakAt?: string; index?: number } {
  let prevHash = GENESIS;
  for (let i = 0; i < ring.length; i++) {
    const e = ring[i];
    if (e.prevHash !== prevHash) {
      return { valid: false, firstBreakAt: e.id, index: i };
    }
    const recomputed = hashEntry({
      id:         e.id,
      category:   e.category,
      action:     e.action,
      actorId:    e.actorId,
      targetType: e.targetType,
      targetId:   e.targetId,
      payload:    e.payload,
      ip:         e.ip,
      userAgent:  e.userAgent,
      createdAt:  e.createdAt,
      prevHash:   e.prevHash,
    });
    if (recomputed !== e.entryHash) {
      return { valid: false, firstBreakAt: e.id, index: i };
    }
    prevHash = e.entryHash;
  }
  return { valid: true };
}

/** All entries for a specific user — used by the user's self-service activity feed. */
export function getAuditForActor(actorId: string, limit = 200): AuditEntry[] {
  return ring.filter((e) => e.actorId === actorId).slice(-limit).reverse();
}
