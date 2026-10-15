/**
 * FIRST-PARTY VISIT COUNTS — the server side of the cookieless counter.
 *
 * Ali, 2026-09-15: "count all, full detail with OK" — every visitor is counted here, and Google Analytics detail runs
 * only for visitors who allow it. This file is what makes counting everyone defensible without consent:
 *
 *   ⛔ IT STORES NOTHING THAT IDENTIFIES A PERSON. Two aggregate tables of daily totals (`SiteVisitPage`,
 *      `SiteVisitSource`). No user id, no session, no IP, no user-agent, no hash of any of them. The request's IP is
 *      used for one thing — the `pv.ip` rate limit that stops one client inflating the counts — exactly as sign-in
 *      already uses it, and it is never written or logged.
 *   ⛔ IT COUNTS VISITS, NOT VISITORS. A unique-visitor count would need a per-person key (an IP hash, a cookie).
 *      That is deliberately not built; unique users are Google Analytics's job, for visitors who consented.
 *   ⭐ THE BODY IS RE-CHECKED HERE, not trusted from the browser: exactly six fields, the path re-masked and refused
 *      if excluded (`gaExcluded`), referrer and campaign only on an entry — the same rules `visitPayload` applies,
 *      because anyone can POST anything to a public endpoint.
 *   ⚠️ A path is free text from the internet, so a day holds at most SITE_VISIT_MAX_PATHS distinct paths; the rest
 *      are counted as "(other)" and the table cannot be grown without bound by junk URLs.
 *
 * Same DAL pattern as `ai-usage-dal.ts`: Prisma when a database is configured, in-memory otherwise (dev / tests).
 */
import { hasDatabase, prisma } from "./prisma";
import { eatDayKey } from "../eat-day";
import { gaExcluded, gaPath } from "../google-tag";
import { PATH_MAX, TAG_MAX, type VisitPayload } from "../site-visits";

/** Counts are kept 400 days — a year-on-year comparison plus a month. They identify no one; the period is for size. */
export const SITE_VISIT_RETENTION_DAYS = 400;
/** Distinct paths recorded per day before the rest are counted as OTHER_PATH. */
export const SITE_VISIT_MAX_PATHS = 1500;
export const OTHER_PATH = "(other)";

export type DayTotal = { day: string; views: number; entries: number };
export type PageTotal = { path: string; views: number; entries: number };
export type SourceTotal = { referrer: string; source: string; medium: string; campaign: string; visits: number };
export type SiteVisitsReport = { fromDay: string; toDay: string; days: DayTotal[]; pages: PageTotal[]; sources: SourceTotal[]; views: number; visits: number };

/* ── Who is not counted ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Crawlers, link previews, uptime monitors and headless automation. An empty or very short agent is not a browser.
 *
 * ⛔ NOT `bot\b`. That matched a real phone — "CUBOT KINGKONG 7" on Android — and would have silently dropped every
 * visit from a whole handset brand (caught by `test:site-visits` §6). Crawlers announce themselves in a SHAPE, not with
 * a word ending in "bot": a product token (`Googlebot/2.1`, `bingbot/2.0`), a `compatible; …bot` clause, or a
 * `+http://` contact link. Those are what is matched.
 */
export function isAutomatedAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.length < 12) return true;
  return /bot\/|bot\.html|compatible;[^)]*bot|\+https?:\/\/|^whatsapp\/|crawl|spider|slurp|scrap|headless|playwright|puppeteer|selenium|phantom|lighthouse|pagespeed|facebookexternalhit|embedly|curl\/|wget|python-|go-http|java\/|okhttp|axios|node-fetch|undici|httpclient|libwww|uptime|pingdom|datadog|statuscake/i.test(ua);
}

/* ── The body ────────────────────────────────────────────────────────────────────────────────────────── */

const CONTROL = /[\x00-\x1f\x7f]/;

/** The payload if the body is exactly what `visitPayload` produces, else null. Never throws. */
export function parseVisitBody(text: string): VisitPayload | null {
  if (!text || text.length > 2048) return null;
  let v: unknown;
  try { v = JSON.parse(text); } catch { return null; }
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (Object.keys(o).sort().join(",") !== "c,e,m,p,r,s") return null;
  const { p, r, s, m, c, e } = o;
  if (typeof e !== "boolean") return null;
  if (typeof p !== "string" || typeof r !== "string" || typeof s !== "string" || typeof m !== "string" || typeof c !== "string") return null;
  if ([p, r, s, m, c].some((x) => CONTROL.test(x))) return null;
  if (!p.startsWith("/") || p.length > PATH_MAX || /[?#\s]|\/\//.test(p)) return null;
  if (gaExcluded(p.toLowerCase().replace(/(.)\/$/, "$1"))) return null;
  if (r.length > TAG_MAX || !/^[a-z0-9.-]*$/.test(r)) return null;
  if ([s, m, c].some((x) => x.length > TAG_MAX || x !== x.toLowerCase())) return null;
  if (!e && (r || s || m || c)) return null;
  return { p: gaPath(p), r, s, m, c, e };
}

/* ── Storage ─────────────────────────────────────────────────────────────────────────────────────────── */

interface SiteVisitDal {
  hasPath(day: string, path: string): Promise<boolean>;
  pathCount(day: string): Promise<number>;
  bumpPage(day: string, path: string, entry: boolean): Promise<void>;
  bumpSource(day: string, s: Omit<SourceTotal, "visits">): Promise<void>;
  report(fromDay: string, toDay: string, top: number): Promise<Omit<SiteVisitsReport, "fromDay" | "toDay" | "views" | "visits">>;
  pruneBefore(day: string): Promise<number>;
  /** One path's views per EAT day (S13: the home page's views for the measures — never a top-N ranking). */
  pathByDay(path: string, fromDay: string, toDay: string): Promise<DayViews[]>;
  /** Landing visits per EAT day and campaign tag, the empty tag left out (S13's campaign table). */
  campaignsByDay(fromDay: string, toDay: string): Promise<CampaignVisits[]>;
}

export type DayViews = { day: string; views: number };
export type CampaignVisits = { day: string; campaign: string; visits: number };

type MemPage = { day: string; path: string; views: number; entries: number };
type MemSource = SourceTotal & { day: string };
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_SITE_VISITS: { pages: Map<string, MemPage>; sources: Map<string, MemSource> } | undefined;
}
const mem = globalThis.__50PICK_SITE_VISITS ?? (globalThis.__50PICK_SITE_VISITS = { pages: new Map(), sources: new Map() });
const srcKey = (day: string, s: Omit<SourceTotal, "visits">) => JSON.stringify([day, s.referrer, s.source, s.medium, s.campaign]);

function rank<T>(rows: T[], by: (r: T) => number, top: number): T[] {
  return [...rows].sort((a, b) => by(b) - by(a)).slice(0, top);
}

const memoryDal: SiteVisitDal = {
  async hasPath(day, path) { return mem.pages.has(`${day} ${path}`); },
  async pathCount(day) { let n = 0; for (const r of mem.pages.values()) if (r.day === day) n++; return n; },
  async bumpPage(day, path, entry) {
    const k = `${day} ${path}`;
    const r = mem.pages.get(k) ?? { day, path, views: 0, entries: 0 };
    r.views += 1; if (entry) r.entries += 1;
    mem.pages.set(k, r);
  },
  async bumpSource(day, s) {
    const k = srcKey(day, s);
    const r = mem.sources.get(k) ?? { day, ...s, visits: 0 };
    r.visits += 1;
    mem.sources.set(k, r);
  },
  async report(fromDay, toDay, top) {
    const inRange = (d: string) => d >= fromDay && d <= toDay;
    const days = new Map<string, DayTotal>(), pages = new Map<string, PageTotal>(), sources = new Map<string, SourceTotal>();
    for (const r of mem.pages.values()) {
      if (!inRange(r.day)) continue;
      const d = days.get(r.day) ?? { day: r.day, views: 0, entries: 0 }; d.views += r.views; d.entries += r.entries; days.set(r.day, d);
      const p = pages.get(r.path) ?? { path: r.path, views: 0, entries: 0 }; p.views += r.views; p.entries += r.entries; pages.set(r.path, p);
    }
    for (const r of mem.sources.values()) {
      if (!inRange(r.day)) continue;
      const k = srcKey("", r);
      const s = sources.get(k) ?? { referrer: r.referrer, source: r.source, medium: r.medium, campaign: r.campaign, visits: 0 };
      s.visits += r.visits; sources.set(k, s);
    }
    return {
      days: [...days.values()].sort((a, b) => (a.day < b.day ? -1 : 1)),
      pages: rank([...pages.values()], (p) => p.views, top),
      sources: rank([...sources.values()], (s) => s.visits, top),
    };
  },
  async pathByDay(path, fromDay, toDay) {
    const out: DayViews[] = [];
    for (const r of mem.pages.values()) if (r.path === path && r.day >= fromDay && r.day <= toDay) out.push({ day: r.day, views: r.views });
    return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  },
  async campaignsByDay(fromDay, toDay) {
    const acc = new Map<string, CampaignVisits>();
    for (const r of mem.sources.values()) {
      if (!r.campaign || r.day < fromDay || r.day > toDay) continue;
      const k = JSON.stringify([r.day, r.campaign]);
      const x = acc.get(k) ?? { day: r.day, campaign: r.campaign, visits: 0 };
      x.visits += r.visits;
      acc.set(k, x);
    }
    return [...acc.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.campaign < b.campaign ? -1 : a.campaign > b.campaign ? 1 : 0));
  },
  async pruneBefore(day) {
    let n = 0;
    for (const [k, r] of mem.pages) if (r.day < day) { mem.pages.delete(k); n++; }
    for (const [k, r] of mem.sources) if (r.day < day) { mem.sources.delete(k); n++; }
    return n;
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const prismaDal: SiteVisitDal = {
  async hasPath(day, path) {
    const client = prisma(); if (!client) return false;
    return !!(await (client as any).siteVisitPage.findUnique({ where: { day_path: { day, path } }, select: { id: true } }));
  },
  async pathCount(day) {
    const client = prisma(); if (!client) return 0;
    return (client as any).siteVisitPage.count({ where: { day } });
  },
  async bumpPage(day, path, entry) {
    const client = prisma(); if (!client) return;
    await (client as any).siteVisitPage.upsert({
      where: { day_path: { day, path } },
      create: { day, path, views: 1, entries: entry ? 1 : 0 },
      update: { views: { increment: 1 }, ...(entry ? { entries: { increment: 1 } } : {}) },
    });
  },
  async bumpSource(day, s) {
    const client = prisma(); if (!client) return;
    await (client as any).siteVisitSource.upsert({
      where: { day_referrer_source_medium_campaign: { day, ...s } },
      create: { day, ...s, visits: 1 },
      update: { visits: { increment: 1 } },
    });
  },
  async report(fromDay, toDay, top) {
    const client = prisma() as any; if (!client) return { days: [], pages: [], sources: [] };
    const where = { day: { gte: fromDay, lte: toDay } };
    const [days, pages, sources] = await Promise.all([
      client.siteVisitPage.groupBy({ by: ["day"], where, _sum: { views: true, entries: true }, orderBy: { day: "asc" } }),
      client.siteVisitPage.groupBy({ by: ["path"], where, _sum: { views: true, entries: true }, orderBy: { _sum: { views: "desc" } }, take: top }),
      client.siteVisitSource.groupBy({ by: ["referrer", "source", "medium", "campaign"], where, _sum: { visits: true }, orderBy: { _sum: { visits: "desc" } }, take: top }),
    ]);
    return {
      days: days.map((r: any) => ({ day: r.day, views: r._sum.views ?? 0, entries: r._sum.entries ?? 0 })),
      pages: pages.map((r: any) => ({ path: r.path, views: r._sum.views ?? 0, entries: r._sum.entries ?? 0 })),
      sources: sources.map((r: any) => ({ referrer: r.referrer, source: r.source, medium: r.medium, campaign: r.campaign, visits: r._sum.visits ?? 0 })),
    };
  },
  async pathByDay(path, fromDay, toDay) {
    const client = prisma(); if (!client) return [];
    const rows = await (client as any).siteVisitPage.findMany({
      where: { day: { gte: fromDay, lte: toDay }, path }, select: { day: true, views: true }, orderBy: { day: "asc" },
    });
    return rows.map((r: any) => ({ day: r.day, views: r.views }));
  },
  async campaignsByDay(fromDay, toDay) {
    const client = prisma(); if (!client) return [];
    const rows = await (client as any).siteVisitSource.groupBy({
      by: ["day", "campaign"], where: { day: { gte: fromDay, lte: toDay }, campaign: { not: "" } }, _sum: { visits: true },
      orderBy: [{ day: "asc" }, { campaign: "asc" }],
    });
    return rows.map((r: any) => ({ day: r.day, campaign: r.campaign, visits: r._sum.visits ?? 0 }));
  },
  async pruneBefore(day) {
    const client = prisma(); if (!client) return 0;
    const [a, b] = await Promise.all([
      (client as any).siteVisitPage.deleteMany({ where: { day: { lt: day } } }),
      (client as any).siteVisitSource.deleteMany({ where: { day: { lt: day } } }),
    ]);
    return (a?.count ?? 0) + (b?.count ?? 0);
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
const dal: SiteVisitDal = usePrisma ? prismaDal : memoryDal;

/* ── Operations ──────────────────────────────────────────────────────────────────────────────────────── */

/** A new path is admitted while the day holds fewer than SITE_VISIT_MAX_PATHS; after that it counts as OTHER_PATH. */
async function admitPath(day: string, path: string): Promise<string> {
  if (await dal.hasPath(day, path)) return path;
  return (await dal.pathCount(day)) < SITE_VISIT_MAX_PATHS ? path : OTHER_PATH;
}

/** Count one page view (and, on an entry, one visit with its source) on the EAT day of `now`. */
export async function recordVisit(v: VisitPayload, now: number): Promise<void> {
  const day = eatDayKey(now);
  const path = await admitPath(day, v.p);
  await dal.bumpPage(day, path, v.e);
  if (v.e) await dal.bumpSource(day, { referrer: v.r, source: v.s, medium: v.m, campaign: v.c });
}

/** Daily totals, top pages and top sources for an inclusive EAT-day range. */
export async function siteVisitsReport(fromDay: string, toDay: string, top = 20): Promise<SiteVisitsReport> {
  const r = await dal.report(fromDay, toDay, top);
  return {
    fromDay, toDay, ...r,
    views: r.days.reduce((n, d) => n + d.views, 0),
    visits: r.days.reduce((n, d) => n + d.entries, 0),
  };
}

/** One path's views per EAT day, inclusive range — a narrow read, never a top-N ranking (S13-PLAN Correction 10). */
export async function pathViewsByDay(path: string, fromDay: string, toDay: string): Promise<DayViews[]> {
  return dal.pathByDay(path, fromDay, toDay);
}

/** Landing visits per EAT day and campaign tag (as the visit counter stored it), inclusive range. */
export async function campaignVisitsByDay(fromDay: string, toDay: string): Promise<CampaignVisits[]> {
  return dal.campaignsByDay(fromDay, toDay);
}

/** Retention: delete counts for days before the EAT day SITE_VISIT_RETENTION_DAYS before `now`. Returns rows deleted. */
export async function pruneSiteVisits(now: number): Promise<number> {
  return dal.pruneBefore(eatDayKey(now - SITE_VISIT_RETENTION_DAYS * 86_400_000));
}
