/**
 * THE DRY-FIRE HARNESS'S WINDOW ONTO THE STORE — the one place that knows whether it is looking at the memory twin or at a
 * scratch Postgres, and how to read EVERY row of a campaign in either (the DAL has no "list a campaign's rows" door; the
 * invariants need them all).
 *
 *   · `guardEnvironment` — the refusal. The harness runs only against the console stub / the fake carrier, a memory store, or —
 *     with `--pg` — a LOOPBACK database; never production, never railway, never a real SMS. It reads the environment it was
 *     STARTED with, before any server module is loaded, and never reads a `.env` file.
 *   · `resetMemoryStore` — a pristine memory twin at the start of each run (the red control runs the harness many times in one
 *     process; a world left by the last run would be walked into the next one's campaign).
 *   · `makeReader` — read-only access: a campaign's recipient rows, the SmsMessage rows that name them, the opt-out tokens a
 *     number holds, the audit rows since an instant. The memory reader scans the twin's maps; the Postgres reader asks Prisma
 *     with plain `findMany` (READ ONLY — this file writes nothing to Postgres except `assertScratchDatabase`'s probes, which
 *     only read).
 *
 * ⛔ This file holds no backslash (an editing tool decodes them): patterns are character classes.
 */
import type { AuditEntry } from "../../../src/lib/server/audit.ts";
import type { StoredSmsCampaignRecipient, StoredSmsMessage } from "../../../src/lib/server/store.ts";

export type Mode = "memory" | "pg";

/* ══ THE REFUSAL ════════════════════════════════════════════════════════════════════════════════════════════════════ */

const LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "::1", "[::1]"];
/** Variables whose presence means this shell is wired to something real. None may be set when the harness starts. */
const REAL_RAIL_VARS = ["BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET", "BLACKBALL_API_URL", "BLACKBALL_WEBHOOK_SECRET", "BLACKBALL_WEBHOOK_SECRET_PREVIOUS"];
const REAL_SERVICE_VARS = ["REDIS_URL", "REDIS_ENABLED"];

export type GuardVerdict = { ok: true; mode: Mode; databaseUrl: string | null } | { ok: false; reasons: string[] };

/** A database URL's host, or null when it does not parse. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * ⛔ MAY THIS PROCESS RUN THE DRY-FIRE AT ALL? Judged on the environment it was started with:
 *   · not production (`NODE_ENV`), and not a Railway shell (any `RAILWAY_*` variable);
 *   · the SMS rail is the console stub — `SMS_PROVIDER` unset or `console` — and no Blackball credential, endpoint or webhook
 *     secret is set (the fake carrier brings its own dummies);
 *   · no Redis (the opt-out budget and the rate limiters would write to it);
 *   · memory mode: `DATABASE_URL` UNSET. `--pg`: `DATABASE_URL` (or the scratch cluster's `VERIFY_DATABASE_URL`) set, parsing,
 *     and its host exactly loopback — checked again against the server's own data directory once connected
 *     (`assertScratchDatabase`).
 * Every reason is reported, never just the first. The values of secrets are never printed.
 */
export function guardEnvironment(env: NodeJS.ProcessEnv, pg: boolean): GuardVerdict {
  const reasons: string[] = [];
  if ((env.NODE_ENV ?? "").toLowerCase() === "production") reasons.push("NODE_ENV is production");
  const railway = Object.keys(env).filter((k) => k.startsWith("RAILWAY_") && (env[k] ?? "") !== "");
  if (railway.length > 0) reasons.push(`this is a Railway shell (${railway.slice(0, 3).join(", ")} set)`);
  const provider = (env.SMS_PROVIDER ?? "").trim().toLowerCase();
  if (provider !== "" && provider !== "console") reasons.push(`SMS_PROVIDER is "${provider}" — the dry-fire runs only over the console stub (it installs its own fake carrier)`);
  for (const v of REAL_RAIL_VARS) if ((env[v] ?? "").trim() !== "") reasons.push(`${v} is set — a real gateway credential must not be in this shell`);
  for (const v of REAL_SERVICE_VARS) if ((env[v] ?? "").trim() !== "") reasons.push(`${v} is set — the harness must not reach a shared cache`);
  const url = (env.DATABASE_URL ?? "").trim();
  if (!pg) {
    if (url !== "") reasons.push("DATABASE_URL is set — the memory run refuses a database (use --pg with a loopback scratch database)");
    return reasons.length === 0 ? { ok: true, mode: "memory", databaseUrl: null } : { ok: false, reasons };
  }
  const target = url !== "" ? url : (env.VERIFY_DATABASE_URL ?? "").trim();
  if (target === "") {
    reasons.push("--pg needs a scratch database: DATABASE_URL (or VERIFY_DATABASE_URL, which `db:scratch` exports) is not set");
  } else {
    const host = hostOf(target);
    if (host === null) reasons.push("the database URL does not parse");
    else if (!LOOPBACK_HOSTS.includes(host)) reasons.push(`the database host "${host}" is not loopback (127.0.0.1 / localhost) — never a shared or production database`);
  }
  return reasons.length === 0 ? { ok: true, mode: "pg", databaseUrl: target } : { ok: false, reasons };
}

/**
 * ⛔ THE SECOND LOCK ON `--pg`, taken once connected: the server's own data directory must be the repo's `.pgscratch` cluster
 * (`db:scratch`), and the database must be EMPTY of campaigns and users (a freshly migrated scratch). A loopback port can be a
 * tunnel to a real database (`railway connect` opens one); the data directory cannot lie about that.
 * Read-only: `SHOW data_directory` and two counts.
 */
export type ScratchClient = {
  $queryRawUnsafe: (sql: string) => Promise<unknown>;
  smsCampaign: { count: () => Promise<number> };
  user: { count: () => Promise<number> };
};

/** The scratch lock. `held` is a client handed in by the suite (a stub that answers like a server would); a run passes none, and
 *  the store's own Prisma client is asked. */
export async function assertScratchDatabase(held?: ScratchClient): Promise<{ dataDirectory: string; campaigns: number; users: number }> {
  let client: ScratchClient | null = held ?? null;
  if (client === null) {
    const { prisma } = await import("../../../src/lib/server/prisma.ts");
    client = prisma() as unknown as ScratchClient | null;
  }
  if (client === null) throw new Error("dry-fire --pg: no database client — DATABASE_URL did not reach the store");
  const rows = (await client.$queryRawUnsafe("SHOW data_directory")) as Array<{ data_directory?: string }>;
  const dataDirectory = String(rows[0]?.data_directory ?? "");
  const norm = dataDirectory.split(String.fromCharCode(92)).join("/").toLowerCase();
  if (!norm.includes("/.pgscratch")) {
    throw new Error("dry-fire --pg REFUSED: the server's data directory is not the repo's .pgscratch scratch cluster — never run this against a shared database");
  }
  const campaigns = await client.smsCampaign.count();
  const users = await client.user.count();
  if (campaigns > 0 || users > 0) {
    throw new Error(`dry-fire --pg REFUSED: the scratch database is not empty (${campaigns} campaign(s), ${users} user(s)) — reset it first (db:scratch --reset)`);
  }
  return { dataDirectory, campaigns, users };
}

/* ══ THE MEMORY TWIN ════════════════════════════════════════════════════════════════════════════════════════════════ */

type MemStore = {
  smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient>;
  smsMessages: Map<string, StoredSmsMessage>;
  optOutTokens: Map<string, { token: string; identifier: string }>;
} & Record<string, unknown>;

/** The memory twin's maps, read directly — ⛔ memory mode only; a Postgres run never calls it. */
export function memStore(): MemStore {
  const s = (globalThis as unknown as { __50PICK_STORE?: MemStore }).__50PICK_STORE;
  if (!s || !s.smsCampaignRecipients || !s.smsMessages || !s.optOutTokens) throw new Error("the memory store is not loaded — this is a memory-mode call");
  return s;
}

/** Every map of the memory twin emptied: a run starts from a pristine store. */
export function resetMemoryStore(): void {
  const s = (globalThis as unknown as { __50PICK_STORE?: Record<string, unknown> }).__50PICK_STORE;
  if (!s) return;
  for (const v of Object.values(s)) if (v instanceof Map) v.clear();
}

/** The process-wide counters the SMS rail and the engine keep on `globalThis`, cleared so a run does not inherit the last one's
 *  balance reading, code failure or money-chore flag. */
export function resetProcessGlobals(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  for (const k of [
    "__50PICK_SMS_BALANCE", "__50PICK_SMS_BALANCE_READ", "__50PICK_OTP_LAST_FAILURE_AT", "__50PICK_SMS_HEALTH",
    "__50PICK_MONEY_CHORES", "__50PICK_MARKETING_ENGINE", "__50PICK_CAMPAIGN_STEPS", "__50PICK_DLR_SEEN", "__50PICK_SEND_WINDOW_AT_MS",
  ]) delete g[k];
}

/* ══ THE READER ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

export type Reader = {
  mode: Mode;
  /** Every recipient row of the campaign, in id order, as copies. */
  recipients(campaignId: string): Promise<StoredSmsCampaignRecipient[]>;
  /** Every SmsMessage row (campaign-targeted) naming one of these recipient ids — all of them, not just the newest. */
  messagesOf(recipientIds: readonly string[]): Promise<StoredSmsMessage[]>;
  /** How many opt-out token rows each of these numbers holds. */
  tokenCounts(msisdns: readonly string[]): Promise<Map<string, number>>;
  /** Every audit row written at or after `sinceMs`, oldest first. */
  audit(sinceMs: number): Promise<AuditEntry[]>;
};

const byId = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function copyRecipient(r: StoredSmsCampaignRecipient): StoredSmsCampaignRecipient {
  return { ...r, gateTrail: r.gateTrail === null ? null : r.gateTrail.map((g) => ({ ...g })) };
}

const TARGET_TYPE = "SmsCampaignRecipient";

function memoryReader(): Reader {
  return {
    mode: "memory",
    recipients: async (campaignId) => [...memStore().smsCampaignRecipients.values()].filter((r) => r.campaignId === campaignId).sort(byId).map(copyRecipient),
    messagesOf: async (ids) => {
      const want = new Set(ids);
      return [...memStore().smsMessages.values()].filter((m) => m.targetType === TARGET_TYPE && m.targetId !== null && want.has(m.targetId)).map((m) => ({ ...m }));
    },
    tokenCounts: async (msisdns) => {
      const want = new Set(msisdns);
      const out = new Map<string, number>();
      for (const t of memStore().optOutTokens.values()) if (want.has(t.identifier)) out.set(t.identifier, (out.get(t.identifier) ?? 0) + 1);
      return out;
    },
    audit: async (sinceMs) => {
      const { getAuditPage, auditFlush } = await import("../../../src/lib/server/audit.ts");
      await auditFlush();
      return getAuditPage({ limit: 1_000_000 }).filter((e) => Date.parse(e.createdAt) >= sinceMs).reverse();
    },
  };
}

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** The Postgres reader. `held` and `page` are for the suite (a stub client that answers like Prisma, and a page small enough to
 *  turn); a run passes neither and reads the store's own client in pages of 2,000. */
export async function pgReader(held?: unknown, page = 2000): Promise<Reader> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let client: any = held ?? null;
  if (client === null) {
    const { prisma } = await import("../../../src/lib/server/prisma.ts");
    client = prisma();
  }
  if (client === null) throw new Error("dry-fire --pg: no database client");
  const PAGE = page;
  return {
    mode: "pg",
    recipients: async (campaignId) => {
      const out: StoredSmsCampaignRecipient[] = [];
      let after: string | null = null;
      for (;;) {
        const rows = await client.smsCampaignRecipient.findMany({
          where: { campaignId, ...(after === null ? {} : { id: { gt: after } }) }, orderBy: { id: "asc" }, take: PAGE,
        });
        for (const r of rows) {
          out.push({
            id: r.id, campaignId: r.campaignId, msisdn: r.msisdn, contactId: r.contactId, userId: r.userId,
            status: r.status as StoredSmsCampaignRecipient["status"], smsReference: r.smsReference, optOutToken: r.optOutToken,
            locale: r.locale as StoredSmsCampaignRecipient["locale"], failureClass: r.failureClass, error: r.error,
            skipReason: r.skipReason, skipDetail: r.skipDetail, claimToken: r.claimToken, claimedAt: iso(r.claimedAt),
            attempts: r.attempts, segments: r.segments, bodyLen: r.bodyLen, costTzs: numOrNull(r.costTzs),
            gateTrail: r.gateTrail as StoredSmsCampaignRecipient["gateTrail"], createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(), sentAt: iso(r.sentAt), deliveredAt: iso(r.deliveredAt), failedAt: iso(r.failedAt),
          });
        }
        if (rows.length < PAGE) return out;
        after = rows[rows.length - 1].id;
      }
    },
    messagesOf: async (ids) => {
      const out: StoredSmsMessage[] = [];
      for (let i = 0; i < ids.length; i += 1000) {
        const rows = await client.smsMessage.findMany({ where: { targetType: TARGET_TYPE, targetId: { in: ids.slice(i, i + 1000) as string[] } } });
        for (const s of rows) {
          out.push({
            reference: s.reference, msisdn: s.msisdn, purpose: s.purpose as StoredSmsMessage["purpose"], provider: s.provider,
            senderId: s.senderId, bodyLen: s.bodyLen, status: s.status as StoredSmsMessage["status"], providerMsg: s.providerMsg,
            dlrStatus: s.dlrStatus, dlrDesc: s.dlrDesc, balanceTzs: numOrNull(s.balanceTzs), attempts: s.attempts,
            targetType: s.targetType, targetId: s.targetId, createdAt: s.createdAt.toISOString(), sentAt: iso(s.sentAt),
            deliveredAt: iso(s.deliveredAt), failedAt: iso(s.failedAt),
          });
        }
      }
      return out;
    },
    tokenCounts: async (msisdns) => {
      const out = new Map<string, number>();
      for (let i = 0; i < msisdns.length; i += 1000) {
        const rows = await client.marketingOptOutToken.groupBy({ by: ["identifier"], where: { identifier: { in: msisdns.slice(i, i + 1000) as string[] } }, _count: { _all: true } });
        for (const r of rows) out.set(r.identifier, r._count._all);
      }
      return out;
    },
    audit: async (sinceMs) => {
      const { auditFlush } = await import("../../../src/lib/server/audit.ts");
      await auditFlush();
      const rows = await client.auditLog.findMany({ where: { createdAt: { gte: new Date(sinceMs) } }, orderBy: { createdAt: "asc" }, take: 500_000 });
      return rows.map((r) => ({
        id: r.id, category: r.category as AuditEntry["category"], action: r.action, actorId: r.actorId, targetType: r.targetType,
        targetId: r.targetId, payload: (r.payload ?? undefined) as Record<string, unknown> | undefined, ip: r.ip, userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(), prevHash: r.prevHash, entryHash: r.entryHash,
      }));
    },
  };
}

export async function makeReader(mode: Mode): Promise<Reader> {
  return mode === "memory" ? memoryReader() : pgReader();
}
