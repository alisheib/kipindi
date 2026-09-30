/**
 * THE JOURNEY FUNNEL'S DAILY TOTALS — the server side of the §3.10 measures (the Vodacom plan S3b, §0f).
 *
 * Same shape and same rules as the visit counter (`site-visits.ts`), and for the same reason:
 *   ⛔ IT STORES NOTHING THAT IDENTIFIES A PERSON. One aggregate table (`JourneyFunnelDay`) of daily counts per (EAT
 *      day, step, origin, variant, utm_source, utm_campaign). No user id, no session, no IP, no market, no amount.
 *   ⛔ SERVER STEPS NEVER BLOCK MONEY. `countFunnel` is fire-and-forget: it is called only AFTER a bet or a deposit has
 *      landed (outside every lock), it never throws, and a failure costs one count, never a bet.
 *   ⭐ EVERY EVENT IS RE-CHECKED against the one allow-list (`lib/journey/funnel.ts`) before it is counted — a step or an
 *      origin the list does not name is dropped, whoever sends it.
 *
 * Inline DAL (the `site-visits.ts` / `ai-usage-dal.ts` pattern): Prisma when a database is configured, memory otherwise.
 */
import { hasDatabase, prisma } from "./prisma";
import { eatDayKey } from "../eat-day";
import { FUNNEL_STEPS, FUNNEL_VARIANTS, funnelTag, isFunnelOrigin, type FunnelEvent, type FunnelStep } from "../journey/funnel";

/** Totals are kept 400 days, like the visit counts — they identify no one; the period is for size. */
export const JOURNEY_FUNNEL_RETENTION_DAYS = 400;

export type FunnelRow = FunnelEvent & { day: string; count: number };

interface FunnelDal {
  bump(day: string, e: FunnelEvent): Promise<void>;
  rows(fromDay: string, toDay: string): Promise<FunnelRow[]>;
  pruneBefore(day: string): Promise<number>;
}

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_JOURNEY_FUNNEL: Map<string, FunnelRow> | undefined;
}
const mem = globalThis.__50PICK_JOURNEY_FUNNEL ?? (globalThis.__50PICK_JOURNEY_FUNNEL = new Map());
const key = (day: string, e: FunnelEvent) => JSON.stringify([day, e.step, e.origin, e.variant, e.utmSource, e.utmCampaign]);

const memoryDal: FunnelDal = {
  async bump(day, e) {
    const k = key(day, e);
    const r = mem.get(k) ?? { day, ...e, count: 0 };
    r.count += 1;
    mem.set(k, r);
  },
  async rows(fromDay, toDay) {
    return [...mem.values()].filter((r) => r.day >= fromDay && r.day <= toDay).map((r) => ({ ...r }));
  },
  async pruneBefore(day) {
    let n = 0;
    for (const [k, r] of mem) if (r.day < day) { mem.delete(k); n++; }
    return n;
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const prismaDal: FunnelDal = {
  async bump(day, e) {
    const client = prisma(); if (!client) return;
    const where = { day, step: e.step, origin: e.origin, variant: e.variant, utmSource: e.utmSource, utmCampaign: e.utmCampaign };
    await (client as any).journeyFunnelDay.upsert({
      where: { day_step_origin_variant_utmSource_utmCampaign: where },
      create: { ...where, count: 1 },
      update: { count: { increment: 1 } },
    });
  },
  async rows(fromDay, toDay) {
    const client = prisma(); if (!client) return [];
    const rows = await (client as any).journeyFunnelDay.findMany({ where: { day: { gte: fromDay, lte: toDay } }, orderBy: { day: "asc" } });
    return rows.map((r: any) => ({ day: r.day, step: r.step, origin: r.origin, variant: r.variant, utmSource: r.utmSource, utmCampaign: r.utmCampaign, count: r.count }));
  },
  async pruneBefore(day) {
    const client = prisma(); if (!client) return 0;
    const r = await (client as any).journeyFunnelDay.deleteMany({ where: { day: { lt: day } } });
    return r?.count ?? 0;
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
const dal: FunnelDal = usePrisma ? prismaDal : memoryDal;

/** The event in the stored shape, or null when the allow-list refuses it (a step, origin or variant it does not name). */
export function normaliseFunnelEvent(e: Partial<FunnelEvent> | null | undefined): FunnelEvent | null {
  if (!e || typeof e.step !== "string" || !(e.step in FUNNEL_STEPS)) return null;
  const step = e.step as FunnelStep;
  if (!isFunnelOrigin(step, e.origin)) return null;
  if (typeof e.variant !== "string" || !(FUNNEL_VARIANTS as readonly string[]).includes(e.variant)) return null;
  return { step, origin: e.origin as string, variant: e.variant, utmSource: funnelTag(e.utmSource), utmCampaign: funnelTag(e.utmCampaign) };
}

/** Count one event on the EAT day of `now`. Refused events are dropped silently. Throws only if the store does. */
export async function recordFunnel(e: Partial<FunnelEvent>, now: number): Promise<boolean> {
  const ev = normaliseFunnelEvent(e);
  if (!ev) return false;
  await dal.bump(eatDayKey(now), ev);
  return true;
}

/**
 * ⭐ THE SERVER COUNTER — fire-and-forget, for the money paths. Never awaited by them, never throws, never inside a
 * lock (the callers invoke it after their locks are released). A failure is logged and costs one count.
 */
export function countFunnel(e: Partial<FunnelEvent>, now: number = Date.now()): void {
  void recordFunnel(e, now).catch((err) => console.error("[journey-funnel] count failed", { step: e?.step, err: String(err) }));
}

/** Every total in an inclusive EAT-day range. */
export async function funnelRows(fromDay: string, toDay: string): Promise<FunnelRow[]> {
  return dal.rows(fromDay, toDay);
}

/** Retention: delete totals for days before the EAT day JOURNEY_FUNNEL_RETENTION_DAYS before `now`. Rows deleted. */
export async function pruneJourneyFunnel(now: number): Promise<number> {
  return dal.pruneBefore(eatDayKey(now - JOURNEY_FUNNEL_RETENTION_DAYS * 86_400_000));
}
