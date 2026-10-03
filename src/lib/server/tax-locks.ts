/**
 * GOVERNMENT TAX REPORT — period locks: what Finance FILED, frozen (`docs/TAX-REPORT.md` §6).
 *
 * The plan's step 7: "Finance reviews, locks the period, and files with TRA / GBT using the report
 * exports." A lock stores the WHOLE computed report (`TaxReportData`) beside its canonical sha256,
 * so a locked period re-renders — on screen and in every export — from exactly the figures that
 * were filed, even after a late correction moves the live books. The page compares the two and
 * says so when they differ; it never quietly prints the live figure under a "locked" badge.
 *
 * ⭐ ONE LIVE LOCK PER (period, product), ENFORCED BY THE DATABASE: the partial unique index
 * "TaxPeriodLock_active_key" (migration 20261003180000_tax_period_lock). Two officers pressing Lock
 * together cannot both win — the second insert fails and is told the period is already locked.
 * Releasing a lock never deletes it; a re-lock is a new row. The table is the filing history.
 *
 * Twin stores, as every DAL here: Postgres when a database is configured, an in-memory list
 * otherwise (unit suites, local visual QA). Same predicate, same ordering, same refusals.
 */
import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { randomId } from "./crypto";
import type { TaxReportData } from "./tax-report-data";
import type { PeriodKind, ProductFilter } from "@/lib/tax-report";

export type LockablePeriodKind = Exclude<PeriodKind, "custom">;

export type TaxLock = {
  id: string;
  periodKind: LockablePeriodKind;
  periodKey: string;
  product: ProductFilter;
  periodStartMs: number;
  periodEndMs: number;
  snapshot: TaxReportData;
  sha256: string;
  balanced: boolean;
  lockedBy: string;
  lockedAtMs: number;
  note: string | null;
  exceptionsAcknowledged: string | null;
  unlockedBy: string | null;
  unlockedAtMs: number | null;
  unlockReason: string | null;
};

/**
 * JSON with its object keys sorted, recursively — the form the hash is taken over, so a jsonb round
 * trip (which reorders keys) cannot change it. ⛔ Only integers, strings, booleans and null are in a
 * snapshot; a float would be rounded by jsonb to 15 significant digits and break the hash, which is
 * why every figure in `TaxReportData` is integer cents, whole shillings or basis points.
 */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map((x) => canonicalJson(x === undefined ? null : x)).join(",")}]`;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
}

export function snapshotHash(snapshot: TaxReportData): string {
  return createHash("sha256").update(canonicalJson(snapshot), "utf8").digest("hex");
}

/**
 * ⭐ WHAT WAS SHOWN IS WHAT IS LOCKED — the fingerprint of EVERYTHING a period's page shows and a lock would freeze:
 * every line, every tax segment, the TRA/GBT split, the products, the whole book, the exceptions, the rates. The page
 * renders it into the lock form; the lock action recomputes the books and refuses unless the fingerprint is the same.
 * Only `generatedAtMs` is left out: it is the one field that differs between two reads of unchanged books (a lockable
 * period is closed, so its cut-off is its end, whenever it is read).
 */
export function seenFingerprint(d: TaxReportData): string {
  return snapshotHash({ ...d, generatedAtMs: 0 });
}

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_TAX_LOCKS: TaxLock[] | undefined;
}
const memory: TaxLock[] = (globalThis.__50PICK_TAX_LOCKS ??= []);

/** The same backend choice as every store here: Postgres when configured and not opted out. */
function pg() {
  if (process.env.USE_PRISMA_DAL === "false") return null;
  return prisma();
}

type Row = {
  id: string; periodKind: string; periodKey: string; product: string;
  periodStart: Date; periodEnd: Date; snapshot: unknown; sha256: string; balanced: boolean;
  lockedBy: string; lockedAt: Date; note: string | null; exceptionsAcknowledged: string | null;
  unlockedBy: string | null; unlockedAt: Date | null; unlockReason: string | null;
};

function fromRow(r: Row): TaxLock {
  return {
    id: r.id,
    periodKind: r.periodKind as LockablePeriodKind,
    periodKey: r.periodKey,
    product: r.product as ProductFilter,
    periodStartMs: r.periodStart.getTime(),
    periodEndMs: r.periodEnd.getTime(),
    snapshot: r.snapshot as TaxReportData,
    sha256: r.sha256,
    balanced: r.balanced,
    lockedBy: r.lockedBy,
    lockedAtMs: r.lockedAt.getTime(),
    note: r.note,
    exceptionsAcknowledged: r.exceptionsAcknowledged,
    unlockedBy: r.unlockedBy,
    unlockedAtMs: r.unlockedAt ? r.unlockedAt.getTime() : null,
    unlockReason: r.unlockReason,
  };
}

/**
 * Newest first. ⭐ At an equal instant the LIVE lock is the newer one — a period can only be re-locked after its previous
 * lock was released — so the tie never falls to a random id (two locks inside one millisecond listed the released one
 * first: measured 2026-10-03, test:tax-report 13.4). The id settles only what is left, so the order is total.
 */
const newestFirst = (a: TaxLock, b: TaxLock) =>
  b.lockedAtMs - a.lockedAtMs || Number(a.unlockedAtMs !== null) - Number(b.unlockedAtMs !== null) || b.id.localeCompare(a.id);
/** The same order in Postgres: lockedAt, then the live row (NULL unlockedAt) first, then the id. */
const NEWEST_FIRST = [{ lockedAt: "desc" as const }, { unlockedAt: { sort: "desc" as const, nulls: "first" as const } }, { id: "desc" as const }];

/** Every lock ever taken on one period and product, newest first (released ones included). */
export async function locksForPeriod(kind: LockablePeriodKind, key: string, product: ProductFilter): Promise<TaxLock[]> {
  const pc = pg();
  if (!pc) return memory.filter((l) => l.periodKind === kind && l.periodKey === key && l.product === product).sort(newestFirst).map(clone);
  const rows = await pc.taxPeriodLock.findMany({
    where: { periodKind: kind, periodKey: key, product },
    orderBy: NEWEST_FIRST,
  });
  return rows.map(fromRow);
}

/** The live lock on one period and product, or null. */
export async function activeLockFor(kind: LockablePeriodKind, key: string, product: ProductFilter): Promise<TaxLock | null> {
  return (await locksForPeriod(kind, key, product)).find((l) => l.unlockedAtMs === null) ?? null;
}

/** The most recent locks across every period — the filing history card. */
export async function recentLocks(limit = 12): Promise<TaxLock[]> {
  const pc = pg();
  if (!pc) return [...memory].sort(newestFirst).slice(0, limit).map(clone);
  const rows = await pc.taxPeriodLock.findMany({ orderBy: NEWEST_FIRST, take: limit });
  return rows.map(fromRow);
}

/**
 * Insert a lock. ⛔ The caller has already decided the period may be locked (finished, not custom,
 * balanced or acknowledged by the Owner) — this function only refuses what the database refuses:
 * a second live lock on the same period and product.
 */
export async function insertLock(input: Omit<TaxLock, "id" | "lockedAtMs" | "unlockedBy" | "unlockedAtMs" | "unlockReason" | "sha256"> & { lockedAtMs?: number }): Promise<
  { ok: true; lock: TaxLock } | { ok: false; code: "ALREADY_LOCKED" | "FAILED"; error: string }
> {
  const id = `taxlock_${randomId(12)}`;
  const sha256 = snapshotHash(input.snapshot);
  const lockedAtMs = input.lockedAtMs ?? Date.now();
  const pc = pg();
  if (!pc) {
    if (memory.some((l) => l.periodKind === input.periodKind && l.periodKey === input.periodKey && l.product === input.product && l.unlockedAtMs === null)) {
      return { ok: false, code: "ALREADY_LOCKED", error: "This period is already locked." };
    }
    const lock: TaxLock = { ...clone({ ...input, id, sha256, lockedAtMs, unlockedBy: null, unlockedAtMs: null, unlockReason: null } as TaxLock) };
    memory.push(lock);
    return { ok: true, lock: clone(lock) };
  }
  try {
    const row = await pc.taxPeriodLock.create({
      data: {
        id,
        periodKind: input.periodKind,
        periodKey: input.periodKey,
        product: input.product,
        periodStart: new Date(input.periodStartMs),
        periodEnd: new Date(input.periodEndMs),
        snapshot: JSON.parse(JSON.stringify(input.snapshot)),
        sha256,
        balanced: input.balanced,
        lockedBy: input.lockedBy,
        lockedAt: new Date(lockedAtMs),
        note: input.note,
        exceptionsAcknowledged: input.exceptionsAcknowledged,
      },
    });
    return { ok: true, lock: fromRow(row) };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") return { ok: false, code: "ALREADY_LOCKED", error: "This period is already locked." };
    return { ok: false, code: "FAILED", error: "The lock could not be saved. Nothing was changed — please try again." };
  }
}

/** Release a live lock. Its row stays, with who released it, when, and why. */
export async function releaseLock(id: string, by: string, reason: string, atMs: number = Date.now()): Promise<{ ok: true; lock: TaxLock } | { ok: false; error: string }> {
  const pc = pg();
  if (!pc) {
    const l = memory.find((x) => x.id === id);
    if (!l || l.unlockedAtMs !== null) return { ok: false, error: "That lock is not live any more — refresh the page." };
    l.unlockedBy = by; l.unlockedAtMs = atMs; l.unlockReason = reason;
    return { ok: true, lock: clone(l) };
  }
  // ⭐ READ FIRST, THEN RELEASE. The release is the commit; everything the caller audits comes from this read, so a
  // failed read-back after a successful release can no longer leave a reopened period with no audit row.
  const before = await pc.taxPeriodLock.findUnique({ where: { id } });
  if (!before || before.unlockedAt !== null) return { ok: false, error: "That lock is not live any more — refresh the page." };
  // Conditional update: only a lock that is still live is released, so two releases cannot both write.
  const res = await pc.taxPeriodLock.updateMany({
    where: { id, unlockedAt: null },
    data: { unlockedBy: by, unlockedAt: new Date(atMs), unlockReason: reason },
  });
  if (res.count !== 1) return { ok: false, error: "That lock is not live any more — refresh the page." };
  return { ok: true, lock: { ...fromRow(before), unlockedBy: by, unlockedAtMs: atMs, unlockReason: reason } };
}

/** Test seam: forget every in-memory lock. ⛔ Never call from application code. */
export function __resetTaxLocksForTest(): void {
  memory.length = 0;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
