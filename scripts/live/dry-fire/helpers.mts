/**
 * Small helpers the scenarios share — recounts of the store's rows, class tables over the oracle, and the numbers a report
 * prints. Nothing here decides a verdict about the engine; the claims and the invariants do.
 *
 * ⛔ This file holds no backslash (an editing tool decodes them).
 */
import type { SmsCampaignRecipientStatus, StoredSmsCampaign, StoredSmsCampaignRecipient } from "../../../src/lib/server/store.ts";
import { enqueueAll, start } from "./core.mts";
import type { Harness, Process } from "./core.mts";
import { buildWorld, confirmedCampaign } from "./world.mts";
import type { Person, World, WorldSpec } from "./world.mts";
import { summarize } from "./kit.mts";
import type { Summary } from "./kit.mts";

export const STATUS_ORDER: readonly SmsCampaignRecipientStatus[] = ["PENDING", "HELD", "SENT", "DELIVERED", "FAILED", "SKIPPED", "UNCONFIRMED"];

export function statusCounts(rows: readonly StoredSmsCampaignRecipient[]): Record<SmsCampaignRecipientStatus, number> {
  const out = { PENDING: 0, HELD: 0, SENT: 0, DELIVERED: 0, FAILED: 0, SKIPPED: 0, UNCONFIRMED: 0 } as Record<SmsCampaignRecipientStatus, number>;
  for (const r of rows) out[r.status] += 1;
  return out;
}

export const settledOf = (c: Record<SmsCampaignRecipientStatus, number>): number => c.SENT + c.DELIVERED + c.FAILED + c.SKIPPED + c.UNCONFIRMED;

export const statusLine = (c: Record<SmsCampaignRecipientStatus, number>): string =>
  STATUS_ORDER.filter((s) => c[s] > 0).map((s) => `${s} ${c[s]}`).join(" · ");

/** The row of a person on a campaign, or undefined (a number the enqueue never seeded). */
export function rowOf(rows: readonly StoredSmsCampaignRecipient[]): Map<string, StoredSmsCampaignRecipient> {
  return new Map(rows.map((r) => [r.msisdn, r]));
}

/** For each class, how its people ended: `{ cls: { SENT: n, SKIPPED:no_consent: n, … } }`. */
export function classTable(world: World, rows: readonly StoredSmsCampaignRecipient[]): Record<string, Record<string, number>> {
  const by = rowOf(rows);
  const out: Record<string, Record<string, number>> = {};
  for (const p of world.people) {
    const r = by.get(p.key);
    const key = r === undefined ? "no row" : r.status === "SKIPPED" ? `SKIPPED:${r.skipReason}` : r.status;
    const t = (out[p.cls] ??= {});
    t[key] = (t[key] ?? 0) + 1;
  }
  return out;
}

/** The people of a world who should have been sent to. */
export const sendablePeople = (w: World): Person[] => w.people.filter((p) => p.expect.send);

/** The sliced obs of one campaign, in order. */
export function slicesOf(h: Harness, campaignId: string, from = 0) {
  return h.obs.slices.slice(from).filter((s) => s.campaignId === campaignId);
}

export type SliceFigures = {
  slices: number;
  sent: number;
  sizes: Summary;
  gateMs: Summary;
  sendMs: Summary;
  firstSizes: number[];
  waits: Record<string, number>;
  pauses: Record<string, number>;
};

/** The numbers the SCALE report prints, from the slices the engine reported. */
export function sliceFigures(h: Harness, campaignId: string, from = 0): SliceFigures {
  const sent = slicesOf(h, campaignId, from);
  const ran = sent.filter((s) => s.result.kind === "sent");
  const waits: Record<string, number> = {};
  const pauses: Record<string, number> = {};
  for (const s of sent) {
    if (s.result.kind === "waiting") waits[s.result.reason] = (waits[s.result.reason] ?? 0) + 1;
    if (s.result.kind === "paused") pauses[s.result.reason] = (pauses[s.result.reason] ?? 0) + 1;
  }
  const size = (s: (typeof ran)[number]): number => (s.result.kind === "sent" ? s.result.claimed : 0);
  const gate = (s: (typeof ran)[number]): number => (s.result.kind === "sent" ? s.result.gateMs : 0);
  const send = (s: (typeof ran)[number]): number => (s.result.kind === "sent" ? s.result.sendMs : 0);
  return {
    slices: ran.length,
    sent: ran.reduce((n, s) => n + (s.result.kind === "sent" ? s.result.handedOver : 0), 0),
    sizes: summarize(ran.map(size)),
    gateMs: summarize(ran.map(gate)),
    sendMs: summarize(ran.map(send)),
    firstSizes: ran.slice(0, 8).map(size),
    waits,
    pauses,
  };
}

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/* ══ LAUNCHING A CAMPAIGN ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type Launch = {
  key: string;
  scn: number;
  label: string;
  /** Number block of the world (default: the next one). */
  block?: number;
  n: number;
  mix?: WorldSpec["mix"];
  duplicates?: number;
  oldTokens?: number;
  budgetTzs?: number;
  priceTzs?: number;
  bilingual?: boolean;
  /** Stop after Start (leave the campaign PREPARING) instead of writing the list. */
  noEnqueue?: boolean;
  /** Do not press Start: leave the campaign CONFIRMED. */
  noStart?: boolean;
};

/**
 * ⭐ A world, its confirmed campaign, Start (the real check) and the whole enqueue — the campaign is RUNNING when this returns
 * (or PREPARING with `noEnqueue`). Registered with the harness so the invariants read it.
 */
export async function launch(h: Harness, proc: Process, o: Launch): Promise<{ world: World; campaign: StoredSmsCampaign; started: { ok: boolean; reason?: string; message: string } }> {
  const world = await buildWorld(h, { id: o.key, block: o.block, n: o.n, population: "book", mix: o.mix, duplicates: o.duplicates, oldTokens: o.oldTokens });
  const campaign = await confirmedCampaign(h, { key: o.key, filter: world.filter, budgetTzs: o.budgetTzs, priceTzs: o.priceTzs, bilingual: o.bilingual, name: `Dry-fire ${o.label}` });
  h.campaigns.push({ id: campaign.id, scn: o.scn, label: o.label, world });
  if (o.noStart === true) return { world, campaign, started: { ok: true, message: "not started" } };
  const started = await start(h, proc, campaign.id);
  if (started.ok && o.noEnqueue !== true) await enqueueAll(h, proc, campaign.id);
  return { world, campaign, started };
}
