/**
 * AN INDEPENDENT READING OF THE AUDIT CHAIN — written from the spec, not imported from the thing it checks.
 *
 * ⛔ WHY IT IS NOT `import { verifyChainFull } from "audit.ts"`. A rehearsal that asks the audit module whether the
 * audit module is happy proves that one function agrees with itself. Two of the three questions CRA-29 asks are ones
 * `verifyChainFull` deliberately does NOT answer, and its own header says so:
 *
 *   · it recomputes each row's HMAC using `hashEntry` — the SAME function that wrote it, so a hashing bug that is
 *     symmetric (a field dropped on both sides) verifies perfectly. This file re-derives the canonical form from
 *     `audit.ts`'s documented field list and computes the HMAC itself.
 *   · it decides "the links are intact" from THREE AGGREGATES (one genesis, nothing dangling, one tail) and states
 *     in its own comment that this "does not exclude a DISJOINT CYCLE" — a closed ring of rows off to the side
 *     contributes no genesis, no dangling and no tail. That is a sound trade on a table growing 11,500 rows a day.
 *     A rehearsal's table has a few hundred rows, so it can afford the check production cannot: WALK the chain from
 *     GENESIS and require the walk to reach every row exactly once.
 *
 * So `verifyChainFull()` is still run by the rehearsal — it is what production and the nightly backup actually use,
 * and its verdict is the one an operator will see — and THIS file is run beside it. Agreement between two readings
 * taken different ways is evidence; one reading taken twice is not.
 *
 * Every function here is pure over rows already loaded. Nothing in this file writes.
 */
import { createHmac } from "node:crypto";

export const GENESIS = "GENESIS";

/** One persisted `AuditLog` row, as `SELECT *` returns it. */
export type ChainRow = {
  seq: bigint | number | string;
  id: string;
  category: string;
  action: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  payload: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date | string;
  prevHash: string;
  entryHash: string;
};

/**
 * Sort every object's keys, recursively; arrays keep their order.
 *
 * ⚠️ THIS IS LOAD-BEARING AND THE REASON IS NOT OBVIOUS. `payload` is a Postgres `jsonb` column, and `jsonb`
 * normalises key order on write (shorter keys first, then bytewise). A payload hashed in insertion order at write
 * time comes back in a DIFFERENT order, so without this every multi-key payload would recompute to a different HMAC
 * and a perfectly healthy chain would read as forged. `audit.ts`'s `canonicalize` exists for exactly this; this is
 * the same rule re-derived, not a copy of the call.
 */
export function canonicalize(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(canonicalize);
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(src).sort()) out[k] = canonicalize(src[k]);
  return out;
}

/**
 * The HMAC over one row, re-derived from `audit.ts`'s `hashEntryWith` field list and ORDER:
 * id, category, action, actorId, targetType, targetId, payload, ip, userAgent, createdAt, prevHash.
 * ⚠️ The order matters — `JSON.stringify` emits object keys in literal order, so a re-ordered field list is a
 * different string and a different hash.
 */
export function recomputeEntryHash(r: ChainRow, secret: string): string {
  const stable = JSON.stringify({
    id: r.id,
    category: r.category,
    action: r.action,
    actorId: r.actorId,
    targetType: r.targetType,
    targetId: r.targetId,
    payload: canonicalize(r.payload ?? null),
    ip: r.ip ?? null,
    userAgent: r.userAgent ?? null,
    createdAt: new Date(r.createdAt).toISOString(),
    prevHash: r.prevHash,
  });
  return createHmac("sha256", secret).update(stable).digest("hex");
}

/** Rows whose stored `entryHash` does not match a recompute under `secret`. */
export function hashMismatches(rows: ChainRow[], secret: string): ChainRow[] {
  return rows.filter((r) => recomputeEntryHash(r, secret) !== r.entryHash);
}

/** The same four counts `classifyChainLinks` judges, computed here from the loaded rows. */
export function linkCounts(rows: ChainRow[]): { total: number; genesisRows: number; dangling: number; unreferenced: number } {
  const hashes = new Set(rows.map((r) => r.entryHash));
  const pointedAt = new Set(rows.map((r) => r.prevHash));
  return {
    total: rows.length,
    genesisRows: rows.filter((r) => r.prevHash === GENESIS).length,
    dangling: rows.filter((r) => r.prevHash !== GENESIS && !hashes.has(r.prevHash)).length,
    unreferenced: rows.filter((r) => !pointedAt.has(r.entryHash)).length,
  };
}

/**
 * Walk the chain forward from the GENESIS-rooted row, following `prevHash → entryHash`.
 *
 * This is the check `verifyChainFull` cannot afford on a 114,379-row production table and this rehearsal can: a
 * chain that satisfies the three aggregates but contains a side-cycle, a second list, or a row nothing leads to is
 * caught here and only here.
 *
 * Returns the walked order, the rows the walk never reached, and the tail it ended on.
 */
export function walkFromGenesis(rows: ChainRow[]): {
  order: ChainRow[];
  unreached: ChainRow[];
  tail: ChainRow | null;
  revisited: number;
} {
  const next = new Map<string, ChainRow>();
  for (const r of rows) if (!next.has(r.prevHash)) next.set(r.prevHash, r);
  const order: ChainRow[] = [];
  const seen = new Set<string>();
  let revisited = 0;
  let cur = next.get(GENESIS);
  while (cur) {
    if (seen.has(cur.entryHash)) { revisited++; break; } // a cycle: stop rather than spin
    order.push(cur);
    seen.add(cur.entryHash);
    cur = next.get(cur.entryHash);
  }
  return {
    order,
    unreached: rows.filter((r) => !seen.has(r.entryHash)),
    tail: order.length > 0 ? order[order.length - 1] : null,
    revisited,
  };
}
