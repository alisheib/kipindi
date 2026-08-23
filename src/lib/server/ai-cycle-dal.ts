/**
 * AI spend-cycle ledger DAL — the durable aggregate behind the cycle meter.
 *
 * Same feature-flag pattern as `ai-usage-dal.ts`: Prisma whenever a DATABASE_URL is
 * present (production), otherwise an in-memory array (local dev / unit tests).
 * Storage only — the accrual loop, config and projections live in `ai-usage.ts`.
 *
 * ⛔ THE MEMORY IMPLEMENTATION ENFORCES THE UNIQUE INDEX TOO. It would be easy to let
 * `create()` just push, and every concurrency test would then pass in memory while the
 * real constraint went unexercised — a gate that cannot fail. `withLock` serialises the
 * meter; the unique `index` is what makes a LOST lock LOUD rather than silent, so the
 * fallback store has to be able to make that noise as well.
 */
import { hasDatabase, prisma } from "./prisma";

export type AiSpendCycleRecord = {
  id: string;
  index: number;
  sizeUsd: number;
  priceRev: string;
  openedAt: string; // ISO
  closedAt: string | null; // ISO
  costUsd: number;
  status: "OPEN" | "CLOSED";
  openedBy: string | null;
  note: string | null;
};

/** Thrown when `index` collides — the shape a lost lock takes. Never swallow it silently. */
export class DuplicateCycleIndexError extends Error {
  constructor(index: number) {
    super(`AiSpendCycle index ${index} already exists`);
    this.name = "DuplicateCycleIndexError";
  }
}

export interface AiCycleDal {
  /** The single OPEN cycle, or null when none has been opened yet. */
  openCycle(): Promise<AiSpendCycleRecord | null>;
  /** Highest `index` written so far; 0 when the ledger is empty. */
  maxIndex(): Promise<number>;
  /** Insert. ⛔ Throws `DuplicateCycleIndexError` on an index collision. */
  create(c: AiSpendCycleRecord): Promise<void>;
  /** Patch cost / close a cycle. */
  update(id: string, patch: Partial<Pick<AiSpendCycleRecord, "costUsd" | "closedAt" | "status">>): Promise<void>;
  /** Every cycle, oldest first, capped. The ledger is never pruned, so the cap is real. */
  all(cap: number): Promise<AiSpendCycleRecord[]>;
  /** Paginated newest-first view for the admin table. `page` is 1-based. */
  list(page: number, pageSize: number): Promise<{ rows: AiSpendCycleRecord[]; total: number }>;
  /** How many cycles carry `status = OPEN` — must always be 0 or 1. */
  countOpen(): Promise<number>;
}

// ---------------------------------------------------------------------------
// In-memory implementation (dev / tests)
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AI_CYCLES: AiSpendCycleRecord[] | undefined;
}
const mem: AiSpendCycleRecord[] = globalThis.__50PICK_AI_CYCLES ?? (globalThis.__50PICK_AI_CYCLES = []);

const byIndexAsc = (a: AiSpendCycleRecord, b: AiSpendCycleRecord) => a.index - b.index;

const memoryDal: AiCycleDal = {
  async openCycle() {
    return mem.filter((c) => c.status === "OPEN").sort(byIndexAsc)[0] ?? null;
  },
  async maxIndex() {
    return mem.reduce((m, c) => Math.max(m, c.index), 0);
  },
  async create(c) {
    if (mem.some((x) => x.index === c.index)) throw new DuplicateCycleIndexError(c.index);
    mem.push({ ...c });
  },
  async update(id, patch) {
    const row = mem.find((c) => c.id === id);
    if (!row) return;
    Object.assign(row, patch);
  },
  async all(cap) {
    return mem.slice().sort(byIndexAsc).slice(0, cap);
  },
  async list(page, pageSize) {
    const all = mem.slice().sort((a, b) => b.index - a.index);
    const start = Math.max(0, (page - 1) * pageSize);
    return { rows: all.slice(start, start + pageSize), total: all.length };
  },
  async countOpen() {
    return mem.filter((c) => c.status === "OPEN").length;
  },
};

// ---------------------------------------------------------------------------
// Prisma implementation (production)
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function toRecord(r: any): AiSpendCycleRecord {
  return {
    id: r.id,
    index: r.index,
    sizeUsd: Number(r.sizeUsd),
    priceRev: r.priceRev,
    openedAt: (r.openedAt as Date).toISOString(),
    closedAt: r.closedAt ? (r.closedAt as Date).toISOString() : null,
    costUsd: Number(r.costUsd),
    status: r.status === "CLOSED" ? "CLOSED" : "OPEN",
    openedBy: r.openedBy ?? null,
    note: r.note ?? null,
  };
}

const prismaDal: AiCycleDal = {
  async openCycle() {
    const client = prisma();
    if (!client) return null;
    const r = await (client as any).aiSpendCycle.findFirst({
      where: { status: "OPEN" },
      orderBy: { index: "asc" },
    });
    return r ? toRecord(r) : null;
  },
  async maxIndex() {
    const client = prisma();
    if (!client) return 0;
    const agg = await (client as any).aiSpendCycle.aggregate({ _max: { index: true } });
    return Number(agg._max.index ?? 0);
  },
  async create(c) {
    const client = prisma();
    if (!client) return;
    try {
      await (client as any).aiSpendCycle.create({
        data: {
          id: c.id,
          index: c.index,
          sizeUsd: c.sizeUsd,
          priceRev: c.priceRev,
          openedAt: new Date(c.openedAt),
          closedAt: c.closedAt ? new Date(c.closedAt) : null,
          costUsd: c.costUsd,
          status: c.status,
          openedBy: c.openedBy,
          note: c.note,
        },
      });
    } catch (err) {
      // P2002 = unique constraint. That is the lost-lock signal, and it must keep its
      // identity all the way up rather than becoming a generic failure the meter swallows.
      if ((err as { code?: string })?.code === "P2002") throw new DuplicateCycleIndexError(c.index);
      throw err;
    }
  },
  async update(id, patch) {
    const client = prisma();
    if (!client) return;
    await (client as any).aiSpendCycle.update({
      where: { id },
      data: {
        ...(patch.costUsd !== undefined ? { costUsd: patch.costUsd } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.closedAt !== undefined ? { closedAt: patch.closedAt ? new Date(patch.closedAt) : null } : {}),
      },
    });
  },
  async all(cap) {
    const client = prisma();
    if (!client) return [];
    const rows = await (client as any).aiSpendCycle.findMany({ orderBy: { index: "asc" }, take: cap });
    return rows.map(toRecord);
  },
  async list(page, pageSize) {
    const client = prisma();
    if (!client) return { rows: [], total: 0 };
    const [rows, total] = await Promise.all([
      (client as any).aiSpendCycle.findMany({
        orderBy: { index: "desc" },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
      }),
      (client as any).aiSpendCycle.count(),
    ]);
    return { rows: rows.map(toRecord), total };
  },
  async countOpen() {
    const client = prisma();
    if (!client) return 0;
    return Number(await (client as any).aiSpendCycle.count({ where: { status: "OPEN" } }));
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
export const aiCycleDal: AiCycleDal = usePrisma ? prismaDal : memoryDal;
