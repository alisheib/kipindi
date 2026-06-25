/**
 * AI usage ledger DAL — per-call records of every Claude API call.
 *
 * Same feature-flag pattern as market-dal: Prisma whenever a DATABASE_URL is
 * present (production), otherwise an in-memory array (local dev / unit tests).
 * Storage only — cost computation, aggregation and alerting live in ai-usage.ts.
 */
import { hasDatabase, prisma } from "./prisma";

export type AiUsageEventRecord = {
  id: string;
  createdAt: string; // ISO
  feature: string;   // "polls" | "chat" | "sentinel" | "other"
  model: string;
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
  costUsd: number;
  ok: boolean;
  errorType: string | null;
  latencyMs: number | null;
  detail: string | null;
};

export type AiUsageFilter = {
  feature?: string;
  status?: "ok" | "error";
  since?: string; // ISO
  until?: string; // ISO
  search?: string; // matches model / errorType / detail (case-insensitive)
};

export interface AiUsageDal {
  create(e: AiUsageEventRecord): Promise<void>;
  /** Events newer than `sinceIso`, newest first, capped — for JS aggregation. */
  recent(sinceIso: string, cap: number): Promise<AiUsageEventRecord[]>;
  /** Paginated, filtered detail view. `page` is 1-based. */
  list(filter: AiUsageFilter, page: number, pageSize: number): Promise<{ rows: AiUsageEventRecord[]; total: number }>;
  /** Total cost (USD) of calls at/after `sinceIso`. */
  sumCostSince(sinceIso: string): Promise<number>;
  /** Retention: delete events older than `beforeIso`. */
  pruneOlderThan(beforeIso: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-memory implementation (dev / tests)
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AI_USAGE: AiUsageEventRecord[] | undefined;
}
const mem: AiUsageEventRecord[] = globalThis.__50PICK_AI_USAGE ?? (globalThis.__50PICK_AI_USAGE = []);

function matches(e: AiUsageEventRecord, f: AiUsageFilter): boolean {
  if (f.feature && e.feature !== f.feature) return false;
  if (f.status === "ok" && !e.ok) return false;
  if (f.status === "error" && e.ok) return false;
  if (f.since && e.createdAt < f.since) return false;
  if (f.until && e.createdAt > f.until) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const hay = `${e.model} ${e.errorType ?? ""} ${e.detail ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

const memoryDal: AiUsageDal = {
  async create(e) {
    mem.push(e);
  },
  async recent(sinceIso, cap) {
    return mem
      .filter((e) => e.createdAt >= sinceIso)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, cap);
  },
  async list(filter, page, pageSize) {
    const all = mem.filter((e) => matches(e, filter)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const start = Math.max(0, (page - 1) * pageSize);
    return { rows: all.slice(start, start + pageSize), total: all.length };
  },
  async sumCostSince(sinceIso) {
    return mem.filter((e) => e.createdAt >= sinceIso).reduce((s, e) => s + e.costUsd, 0);
  },
  async pruneOlderThan(beforeIso) {
    for (let i = mem.length - 1; i >= 0; i--) if (mem[i].createdAt < beforeIso) mem.splice(i, 1);
  },
};

// ---------------------------------------------------------------------------
// Prisma implementation (production)
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function toRecord(r: any): AiUsageEventRecord {
  return {
    id: r.id,
    createdAt: (r.createdAt as Date).toISOString(),
    feature: r.feature,
    model: r.model,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    webSearches: r.webSearches,
    costUsd: Number(r.costUsd),
    ok: r.ok,
    errorType: r.errorType ?? null,
    latencyMs: r.latencyMs ?? null,
    detail: r.detail ?? null,
  };
}

function whereFromFilter(f: AiUsageFilter): any {
  const w: any = {};
  if (f.feature) w.feature = f.feature;
  if (f.status === "ok") w.ok = true;
  else if (f.status === "error") w.ok = false;
  if (f.since || f.until) {
    w.createdAt = {};
    if (f.since) w.createdAt.gte = new Date(f.since);
    if (f.until) w.createdAt.lte = new Date(f.until);
  }
  if (f.search) {
    w.OR = [
      { model: { contains: f.search, mode: "insensitive" } },
      { errorType: { contains: f.search, mode: "insensitive" } },
      { detail: { contains: f.search, mode: "insensitive" } },
    ];
  }
  return w;
}

const prismaDal: AiUsageDal = {
  async create(e) {
    const client = prisma();
    if (!client) return;
    await (client as any).aiUsageEvent.create({
      data: {
        id: e.id,
        createdAt: new Date(e.createdAt),
        feature: e.feature,
        model: e.model,
        inputTokens: e.inputTokens,
        outputTokens: e.outputTokens,
        webSearches: e.webSearches,
        costUsd: e.costUsd,
        ok: e.ok,
        errorType: e.errorType,
        latencyMs: e.latencyMs,
        detail: e.detail,
      },
    });
  },
  async recent(sinceIso, cap) {
    const client = prisma();
    if (!client) return [];
    const rows = await (client as any).aiUsageEvent.findMany({
      where: { createdAt: { gte: new Date(sinceIso) } },
      orderBy: { createdAt: "desc" },
      take: cap,
    });
    return rows.map(toRecord);
  },
  async list(filter, page, pageSize) {
    const client = prisma();
    if (!client) return { rows: [], total: 0 };
    const where = whereFromFilter(filter);
    const [rows, total] = await Promise.all([
      (client as any).aiUsageEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
      }),
      (client as any).aiUsageEvent.count({ where }),
    ]);
    return { rows: rows.map(toRecord), total };
  },
  async sumCostSince(sinceIso) {
    const client = prisma();
    if (!client) return 0;
    const agg = await (client as any).aiUsageEvent.aggregate({
      where: { createdAt: { gte: new Date(sinceIso) } },
      _sum: { costUsd: true },
    });
    return Number(agg._sum.costUsd ?? 0);
  },
  async pruneOlderThan(beforeIso) {
    const client = prisma();
    if (!client) return;
    await (client as any).aiUsageEvent.deleteMany({ where: { createdAt: { lt: new Date(beforeIso) } } });
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
export const aiUsageDal: AiUsageDal = usePrisma ? prismaDal : memoryDal;
