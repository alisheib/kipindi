/**
 * THE SIX INVARIANTS — asserted after EVERY scenario, over the whole store as it stands then (every campaign the run has made so
 * far, every message the carrier has seen, every audit row since the run began). A failure names the campaign and says what; a
 * defect in the engine from an earlier scenario shows in every later row, because the store is still wrong.
 *
 *   INV1  NO DOUBLE SEND   per campaign × number at most ONE message handed to the carrier — counted twice: by the fake carrier's own
 *                          request log (a message is "handed" unless its whole request was refused outright) and by the SmsMessage
 *                          rows (QUEUED · ACCEPTED · UNKNOWN · DELIVERED, or FAILED by a receipt). A refused batch is no hand-over: the
 *                          gateway took nothing and charged nothing, so sending it again after Resume is not a second message.
 *   INV2  EVERY ROW TERMINAL   at DONE no recipient row is PENDING, HELD or claimed; HELD exists only while the campaign is not DONE;
 *                          every settled row carries the columns its state owes (a SENT row a reference and an instant, a SKIPPED row
 *                          its reason, …); no claim outlives the reaper's age.
 *   INV3  NOBODY PROTECTED IS SENT   everyone the oracle says the gate must refuse (suppressed, withdrawn, self-excluded, on a break,
 *                          harm marker, under 25 with a history, a minor, a suspended account, no consent, no 18+ evidence) has ZERO
 *                          requests on the carrier and no message row, and is SKIPPED with the oracle's reason — or is still waiting
 *                          on a campaign that has not finished.
 *   INV4  COUNTS ADD UP    the live page's figures partition the rows and equal an independent recount; the list page's tally and bar
 *                          are the same numbers; the bar's value is exactly the SETTLED rows (HELD is not one); progress never moves
 *                          backwards within a driver's run; a stopped campaign's headline says the true number left unmessaged.
 *   INV5  AUDIT            one row per officer act that landed and per engine pause, one for each finish and each enqueue, nothing
 *                          else on a campaign (no row per recipient or per slice, E24), one RG line per RG refusal, and ⛔ no phone
 *                          number in any audit row or in any line the server printed.
 *   INV6  TIME             no message reached the carrier from a claim older than the send-age bound (CLAIM_SEND_MAX_AGE_MS).
 *
 * ⛔ This file holds no backslash (an editing tool decodes them): patterns are character classes.
 */
import type {
  SmsCampaignRecipientStatus, StoredSmsCampaign, StoredSmsCampaignRecipient, StoredSmsMessage,
} from "../../../src/lib/server/store.ts";
import type { AuditEntry } from "../../../src/lib/server/audit.ts";
import type { CampaignRef, Harness } from "./core.mts";
import { json, num } from "./kit.mts";

export type InvId = "INV1" | "INV2" | "INV3" | "INV4" | "INV5" | "INV6";
export const INV_NAMES: Readonly<Record<InvId, string>> = {
  INV1: "no double send",
  INV2: "every row terminal",
  INV3: "nobody protected sent",
  INV4: "counts add up",
  INV5: "audit",
  INV6: "time",
};
export const INV_IDS = Object.keys(INV_NAMES) as InvId[];

export type Inv = { id: InvId; name: string; ok: boolean; detail: string; numbers: Record<string, number | string>; failures: string[] };

const mask = (key: string): string => `...${key.slice(-4)}`;
const STATUSES: readonly SmsCampaignRecipientStatus[] = ["PENDING", "HELD", "SENT", "DELIVERED", "FAILED", "SKIPPED", "UNCONFIRMED"];
const zero = (): Record<SmsCampaignRecipientStatus, number> => ({ PENDING: 0, HELD: 0, SENT: 0, DELIVERED: 0, FAILED: 0, SKIPPED: 0, UNCONFIRMED: 0 });

type Data = {
  ref: CampaignRef;
  campaign: StoredSmsCampaign;
  rows: StoredSmsCampaignRecipient[];
  byKey: Map<string, StoredSmsCampaignRecipient>;
  messages: StoredSmsMessage[];
  counts: Record<SmsCampaignRecipientStatus, number>;
};

async function gather(h: Harness): Promise<Data[]> {
  const out: Data[] = [];
  for (const ref of h.campaigns) {
    const campaign = await Promise.resolve(h.S.db.smsCampaign.find(ref.id));
    if (campaign === null) continue;
    const rows = await h.reader.recipients(ref.id);
    const counts = zero();
    for (const r of rows) counts[r.status] += 1;
    const messages = rows.length === 0 ? [] : await h.reader.messagesOf(rows.map((r) => r.id));
    out.push({ ref, campaign, rows, byKey: new Map(rows.map((r) => [r.msisdn, r])), messages, counts });
  }
  return out;
}

const first = (xs: string[], n = 5): string => xs.slice(0, n).join("; ") + (xs.length > n ? ` (+${xs.length - n} more)` : "");

/* ══ INV1 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** A message the carrier may hold: any state but a plain refusal. */
const handedMessage = (m: StoredSmsMessage): boolean =>
  m.status === "QUEUED" || m.status === "ACCEPTED" || m.status === "UNKNOWN" || m.status === "DELIVERED"
  || (m.status === "FAILED" && typeof m.dlrStatus === "string" && m.dlrStatus !== "");

function inv1(h: Harness, data: Data[]): Inv {
  const failures: string[] = [];
  let handedMessages = 0;
  let distinct = 0;
  let maxPerNumber = 0;
  let refusedRequests = 0;
  for (const d of data) {
    const viaCarrier = h.carrier.handedBy(d.campaign.id);
    for (const [msisdn, n] of viaCarrier) {
      handedMessages += n;
      distinct += 1;
      maxPerNumber = Math.max(maxPerNumber, n);
      if (n > 1) failures.push(`${d.campaign.id.slice(-12)}: ${mask(msisdn)} reached the carrier ${n} times`);
    }
    const byRecipient = new Map<string, number>();
    const ownerOf = new Map(d.rows.map((r) => [r.id, r.msisdn]));
    for (const m of d.messages) {
      if (!handedMessage(m)) continue;
      const msisdn = ownerOf.get(m.targetId ?? "") ?? m.msisdn;
      byRecipient.set(msisdn, (byRecipient.get(msisdn) ?? 0) + 1);
    }
    for (const [msisdn, n] of byRecipient) {
      maxPerNumber = Math.max(maxPerNumber, n);
      if (n > 1) failures.push(`${d.campaign.id.slice(-12)}: ${mask(msisdn)} has ${n} message rows that left the building`);
    }
  }
  for (const r of h.carrier.requests) if (r.answered === "refused") refusedRequests += 1;
  return {
    id: "INV1", name: INV_NAMES.INV1, ok: failures.length === 0,
    detail: failures.length === 0
      ? `${num(handedMessages)} messages handed to the carrier to ${num(distinct)} numbers in ${num(h.carrier.requests.length)} requests (${num(refusedRequests)} refused outright), at most ${maxPerNumber} per number`
      : first(failures),
    numbers: { handedMessages, distinctNumbers: distinct, requests: h.carrier.requests.length, refusedRequests, maxPerNumber, violations: failures.length },
    failures,
  };
}

/* ══ INV2 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

function terminalProblem(r: StoredSmsCampaignRecipient): string | null {
  switch (r.status) {
    case "SENT": return r.smsReference && r.sentAt && r.gateTrail ? null : "SENT without its reference, instant or trail";
    case "DELIVERED": return r.smsReference && r.deliveredAt ? null : "DELIVERED without its reference or instant";
    case "UNCONFIRMED": return r.gateTrail ? null : "UNCONFIRMED without its trail";
    case "FAILED": return r.failureClass && r.failedAt ? null : "FAILED without its class or instant";
    case "SKIPPED": return r.skipReason && r.gateTrail ? null : "SKIPPED without its reason or trail";
    default: return null;
  }
}

function inv2(h: Harness, data: Data[]): Inv {
  const failures: string[] = [];
  const reapAfter = h.S.engine.REAP_AFTER_MS;
  const now = h.clock.now();
  let rows = 0;
  let done = 0;
  const total = zero();
  for (const d of data) {
    const tag = d.campaign.id.slice(-12);
    rows += d.rows.length;
    for (const s of STATUSES) total[s] += d.counts[s];
    const claimed = d.rows.filter((r) => r.status === "PENDING" && r.claimToken !== null);
    if (d.campaign.status === "DONE") {
      done += 1;
      if (d.counts.PENDING > 0) failures.push(`${tag}: DONE with ${d.counts.PENDING} PENDING`);
      if (d.counts.HELD > 0) failures.push(`${tag}: DONE with ${d.counts.HELD} HELD`);
      if (claimed.length > 0) failures.push(`${tag}: DONE with ${claimed.length} claimed`);
    }
    if (d.campaign.status === "CANCELLED" && claimed.length > 0) failures.push(`${tag}: stopped with ${claimed.length} rows still claimed`);
    const stale = claimed.filter((r) => now - Date.parse(r.claimedAt ?? "") > reapAfter + 60_000);
    if (stale.length > 0) failures.push(`${tag}: ${stale.length} claims older than the reaper's age and nobody reaped them`);
    const bad: string[] = [];
    for (const r of d.rows) {
      const p = terminalProblem(r);
      if (p !== null) bad.push(`${r.id.slice(-8)} ${p}`);
    }
    if (bad.length > 0) failures.push(`${tag}: ${bad.length} malformed settled rows (${first(bad, 2)})`);
    // one row per number: the unique key holds
    if (d.byKey.size !== d.rows.length) failures.push(`${tag}: ${d.rows.length - d.byKey.size} numbers on the list twice`);
  }
  return {
    id: "INV2", name: INV_NAMES.INV2, ok: failures.length === 0,
    detail: failures.length === 0
      ? `${num(rows)} rows over ${data.length} campaigns (${done} DONE): ` + STATUSES.filter((s) => total[s] > 0).map((s) => `${s} ${num(total[s])}`).join(" · ")
      : first(failures),
    numbers: { campaigns: data.length, done, rows, ...total },
    failures,
  };
}

/* ══ INV3 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

function inv3(h: Harness, data: Data[]): Inv {
  const failures: string[] = [];
  let protectedPeople = 0;
  let requestsForThem = 0;
  let skippedRight = 0;
  let waiting = 0;
  let wrongReason = 0;
  let lateStops = 0;
  for (const d of data) {
    if (d.ref.world === null) continue;
    const tag = d.campaign.id.slice(-12);
    const finished = d.campaign.status === "DONE";
    const msgByRecipient = new Map<string, number>();
    for (const m of d.messages) msgByRecipient.set(m.targetId ?? "", (msgByRecipient.get(m.targetId ?? "") ?? 0) + 1);
    for (const p of d.ref.world.people) {
      if (p.expect.send) continue;
      protectedPeople += 1;
      if (p.lateStopAt !== null) lateStops += 1;
      const calls = h.carrier.requestsFor(d.campaign.id, p.key).length;
      requestsForThem += calls;
      if (calls > 0) failures.push(`${tag}: ${p.cls} ${mask(p.key)} was on the wire (${calls} request(s))`);
      const row = d.byKey.get(p.key);
      if ("unusable" in p.expect) {
        if (row !== undefined) failures.push(`${tag}: unusable number ${mask(p.key)} became a row (${row.status})`);
        continue;
      }
      if (row === undefined) {
        // a row is written for every walked person once the list is finished; a campaign stopped while preparing may lack it
        if (d.campaign.enqueuedAt !== null) failures.push(`${tag}: ${p.cls} ${mask(p.key)} has no row though the list was finished`);
        continue;
      }
      if (msgByRecipient.get(row.id)) failures.push(`${tag}: ${p.cls} ${mask(p.key)} has a message row`);
      if (row.status === "SKIPPED") {
        if (row.skipReason === p.expect.reason) skippedRight += 1;
        else {
          wrongReason += 1;
          failures.push(`${tag}: ${p.cls} ${mask(p.key)} was skipped as ${row.skipReason}, the gate owes ${p.expect.reason}`);
        }
      } else if (row.status === "PENDING" || row.status === "HELD") {
        waiting += 1;
        if (finished) failures.push(`${tag}: ${p.cls} ${mask(p.key)} is still ${row.status} on a DONE campaign`);
      } else {
        failures.push(`${tag}: ${p.cls} ${mask(p.key)} ended ${row.status}, a state only a message reaches`);
      }
    }
  }
  return {
    id: "INV3", name: INV_NAMES.INV3, ok: failures.length === 0,
    detail: failures.length === 0
      ? `${num(protectedPeople)} people the gate must refuse (${lateStops} stopped mid-run): ${num(requestsForThem)} carrier requests for them, ${num(skippedRight)} SKIPPED with the right reason, ${num(waiting)} still waiting on a campaign not finished` + " · referees: none in this branch's gate"
      : first(failures),
    numbers: { protectedPeople, requestsForThem, skippedRight, waiting, wrongReason, lateStops, violations: failures.length },
    failures,
  };
}

/* ══ INV4 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const N = "([0-9][0-9,]*)";

async function inv4(h: Harness, data: Data[]): Promise<Inv> {
  const { S } = h;
  const failures: string[] = [];
  const proc = h.proc("A");
  const viewDeps = proc.viewDeps();
  let viewsChecked = 0;
  let backwards = 0;
  let samples = 0;
  const CS = S.campaignStatus;
  const tally = await Promise.resolve(S.db.smsCampaignRecipient.countsByCampaign(data.map((d) => d.campaign.id)));
  for (const d of data) {
    const tag = d.campaign.id.slice(-12);
    const c = d.campaign;
    if (c.status === "DRAFT") continue;
    const view = await S.live.campaignLiveView(c.id, h.viewer, viewDeps);
    if (view === null) { failures.push(`${tag}: the live page cannot find it`); continue; }
    viewsChecked += 1;
    const k = view.kpis;
    const rowsN = d.rows.length;
    const want = {
      onCampaign: rowsN, handedOver: d.counts.SENT + d.counts.DELIVERED, failed: d.counts.FAILED, notSent: d.counts.SKIPPED,
      noAnswer: d.counts.UNCONFIRMED, waiting: d.counts.PENDING + d.counts.HELD,
    };
    for (const key of Object.keys(want) as (keyof typeof want)[]) {
      if (k[key] !== want[key]) failures.push(`${tag}: KPI ${key} says ${k[key]}, the rows say ${want[key]}`);
    }
    const sum = (k.handedOver ?? 0) + (k.failed ?? 0) + (k.notSent ?? 0) + (k.noAnswer ?? 0) + (k.waiting ?? 0);
    if (sum !== k.onCampaign) failures.push(`${tag}: the KPIs add up to ${sum}, the rows are ${k.onCampaign}`);
    const chipSum = (view.chips ?? []).reduce((a, x) => a + x.count, 0);
    if (view.chips !== null && chipSum !== rowsN) failures.push(`${tag}: the chips add up to ${chipSum}, the rows are ${rowsN}`);
    const reasonSum = (view.notSentReasons ?? []).reduce((a, x) => a + x.count, 0);
    if (view.notSentReasons !== null && reasonSum !== want.notSent) failures.push(`${tag}: "not sent" by reason adds up to ${reasonSum}, not ${want.notSent}`);
    // the DAL's own groupBy agrees with an independent recount of the rows
    const dal = await Promise.resolve(S.db.smsCampaignRecipient.countByStatus(c.id));
    for (const x of dal) if (x.count !== d.counts[x.status]) failures.push(`${tag}: the DAL counts ${x.count} ${x.status}, the rows ${d.counts[x.status]}`);
    // the bar: exactly the SETTLED rows (HELD is outstanding)
    const settled = rowsN - d.counts.PENDING - d.counts.HELD;
    const p = view.progress;
    const sendingPhase = p !== null && p.phase === "sending";
    if (sendingPhase && p.value !== settled) failures.push(`${tag}: the bar says ${p.value} done, ${settled} rows are settled (HELD ${d.counts.HELD})`);
    if (sendingPhase && p.max !== rowsN) failures.push(`${tag}: the bar's total is ${p.max}, the rows are ${rowsN}`);
    // the list page: the same tally, the same bar, the same words
    const listCounts = tally[c.id];
    for (const s of STATUSES) if (listCounts[s] !== d.counts[s]) failures.push(`${tag}: the list tallies ${listCounts[s]} ${s}, the rows ${d.counts[s]}`);
    const listBar = CS.campaignProgress(c, listCounts);
    if (json(listBar) !== json(view.progress)) failures.push(`${tag}: the list's bar ${json(listBar)} is not the live page's ${json(view.progress)}`);
    if (CS.CAMPAIGN_STATUS_VIEW[c.status].label !== view.statusLabel) failures.push(`${tag}: the list says "${CS.CAMPAIGN_STATUS_VIEW[c.status].label}", the page "${view.statusLabel}"`);
    if (c.audienceCount !== null && view.confirmed?.count !== c.audienceCount) failures.push(`${tag}: confirmed ${c.audienceCount} on the list, ${view.confirmed?.count} on the page`);
    if (listBar !== null && view.progress !== null) {
      const caption = S.campaignsCopy.progressCaption(listBar);
      const m = new RegExp(`^${N} of ${N} `).exec(caption);
      const head = new RegExp(`${N} of ${N} (?:done|people written)`).exec(view.headline);
      if (c.status === "RUNNING" && (m === null || head === null || m[1] !== head[1] || m[2] !== head[2])) {
        failures.push(`${tag}: the list says "${caption}", the page "${view.headline}"`);
      }
    }
    // a stopped campaign says the true number it left unmessaged
    if (c.status === "CANCELLED") {
      const left = c.enqueuedAt === null ? Math.max(0, (c.audienceCount ?? 0) - settled) : d.counts.PENDING + d.counts.HELD;
      const said = new RegExp(`${N} (?:person|people) (?:was|were) not messaged`).exec(view.headline);
      const saidNone = view.headline.includes("nobody on it was left to message");
      const ok = left === 0 ? saidNone : said !== null && Number(said[1].split(",").join("")) === left;
      if (!ok) failures.push(`${tag}: stopped with ${left} unmessaged, the headline says "${view.headline.slice(0, 120)}"`);
    }
    if (c.status === "DONE" && d.counts.PENDING + d.counts.HELD > 0) failures.push(`${tag}: DONE with rows outstanding`);
  }
  // progress never moves backwards within one driver's run of one campaign
  const lastBy = new Map<string, { phase: string; value: number; rows: number }>();
  for (const o of h.obs.steps) {
    if (o.progress === null) continue;
    samples += 1;
    // the bar and the KPIs are two readings of the same rows: at every step the bar's value is the rows the KPIs call decided
    if (o.progress.phase === "sending" && o.kpiSettled !== null && o.progress.value !== o.kpiSettled) {
      failures.push(`${o.campaignId.slice(-12)}: a step's bar said ${o.progress.value} done while its KPIs call ${o.kpiSettled} rows decided`);
    }
    const key = `${o.proc}|${o.campaignId}`;
    const was = lastBy.get(key);
    if (was !== undefined && was.phase === o.progress.phase && o.progress.value < was.value) {
      backwards += 1;
      failures.push(`${o.campaignId.slice(-12)}: the bar moved back ${was.value} -> ${o.progress.value} (${o.progress.phase}) for driver ${o.proc}`);
    }
    if (was !== undefined && o.rows < was.rows) {
      backwards += 1;
      failures.push(`${o.campaignId.slice(-12)}: "on campaign" moved back ${was.rows} -> ${o.rows} for driver ${o.proc}`);
    }
    lastBy.set(key, { phase: o.progress.phase, value: o.progress.value, rows: o.rows });
  }
  return {
    id: "INV4", name: INV_NAMES.INV4, ok: failures.length === 0,
    detail: failures.length === 0
      ? `${viewsChecked} live views and list tallies agree with a recount of the rows; ${num(samples)} bar samples, none moved back`
      : first(failures),
    numbers: { viewsChecked, barSamples: samples, movedBackwards: backwards, violations: failures.length },
    failures,
  };
}

/* ══ INV5 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const KNOWN_CAMPAIGN_ACTIONS = new Set([
  "marketing.campaign_started", "marketing.campaign_start_refused", "marketing.campaign_paused", "marketing.campaign_resumed",
  "marketing.campaign_stopped", "marketing.campaign_enqueued", "marketing.campaign_finished", "marketing.campaign_reaped",
]);

/** The made-up numbers a text mentions — judged by their nine national digits, so a reference's accidental digit run is never
 *  taken for one. Plus any other 255-shaped Tanzanian mobile number (a number the world did not make is still a leak). */
export function numbersIn(text: string, nines: ReadonlySet<string>): string[] {
  const hits: string[] = [];
  const runs = text.match(/[0-9]{9,}/g) ?? [];
  for (const run of runs) {
    for (let i = 0; i + 9 <= run.length; i++) {
      if (nines.has(run.slice(i, i + 9))) { hits.push(`...${run.slice(-4)}`); break; }
    }
  }
  for (const m of text.match(/255[67][0-9]{8}/g) ?? []) hits.push(`...${m.slice(-4)}`);
  return hits;
}

async function inv5(h: Harness, data: Data[]): Promise<Inv> {
  const failures: string[] = [];
  const entries: AuditEntry[] = await h.reader.audit(h.startedAt);
  const officer = h.officer.id;
  const byCampaign = new Map<string, AuditEntry[]>();
  for (const e of entries) {
    if (e.targetType === "SmsCampaign" && e.targetId) byCampaign.set(e.targetId, [...(byCampaign.get(e.targetId) ?? []), e]);
  }
  const count = (es: AuditEntry[], action: string, pred: (e: AuditEntry) => boolean = () => true): number =>
    es.filter((e) => e.action === action && pred(e)).length;
  let actsLanded = 0;
  let enginePauses = 0;
  let rgLines = 0;
  for (const d of data) {
    const id = d.campaign.id;
    const tag = id.slice(-12);
    const es = byCampaign.get(id) ?? [];
    const acts = h.acts.filter((a) => a.campaignId === id);
    const landed = (kind: string): number => acts.filter((a) => a.kind === kind && a.ok).length;
    const refusedStarts = acts.filter((a) => a.kind === "start" && !a.ok && a.reason !== "role").length;
    const officerRows = (action: string): number => count(es, action, (e) => e.category === "ADMIN" && e.actorId === officer);
    const pairs: [string, number, number][] = [
      ["started", landed("start"), officerRows("marketing.campaign_started")],
      ["officer pause", landed("pause"), officerRows("marketing.campaign_paused")],
      ["resumed", landed("resume"), officerRows("marketing.campaign_resumed")],
      ["stopped", landed("stop"), officerRows("marketing.campaign_stopped")],
      ["start refused", refusedStarts, officerRows("marketing.campaign_start_refused")],
    ];
    for (const [what, want, got] of pairs) {
      actsLanded += what === "start refused" ? 0 : want;
      if (want !== got) failures.push(`${tag}: ${want} officer act(s) "${what}" landed, ${got} audit row(s)`);
    }
    // engine pauses: one SYSTEM row per pause a step reported, with its reason
    const pauses = h.obs.pauses.filter((p) => p.campaignId === id);
    enginePauses += pauses.length;
    const reasons = new Set(pauses.map((p) => p.reason));
    for (const reason of reasons) {
      const want = pauses.filter((p) => p.reason === reason).length;
      const got = count(es, "marketing.campaign_paused", (e) => e.category === "SYSTEM" && e.actorId === null && (e.payload as { reason?: unknown } | undefined)?.reason === reason);
      if (want !== got) failures.push(`${tag}: ${want} engine pause(s) "${reason}" reported, ${got} SYSTEM audit row(s)`);
    }
    const systemPauses = count(es, "marketing.campaign_paused", (e) => e.category === "SYSTEM" && e.actorId === null);
    if (systemPauses !== pauses.length) failures.push(`${tag}: ${pauses.length} engine pause(s) reported, ${systemPauses} SYSTEM pause row(s) written`);
    // finish, enqueue
    const finished = h.obs.finishes.filter((f) => f.campaignId === id).length;
    if (count(es, "marketing.campaign_finished") !== finished) failures.push(`${tag}: ${finished} finish(es) reported, ${count(es, "marketing.campaign_finished")} audit row(s)`);
    if (d.campaign.status === "DONE" && finished !== 1) failures.push(`${tag}: DONE with ${finished} finish row(s), not one`);
    const enq = h.obs.enqueueFinishes.filter((f) => f.campaignId === id).length;
    if (count(es, "marketing.campaign_enqueued") !== enq) failures.push(`${tag}: ${enq} enqueue finish(es) reported, ${count(es, "marketing.campaign_enqueued")} audit row(s)`);
    // reaper rows: counts coherent, and a reaped trail has its row
    const reapRows = es.filter((e) => e.action === "marketing.campaign_reaped");
    let reapedSum = 0;
    for (const e of reapRows) {
      const p = (e.payload ?? {}) as Record<string, number>;
      reapedSum += Number(p.reaped ?? 0);
      const parts = Number(p.toPending ?? 0) + Number(p.toSent ?? 0) + Number(p.toUnconfirmed ?? 0) + Number(p.toFailed ?? 0) + Number(p.toDelivered ?? 0);
      if (Number(p.reaped ?? 0) <= 0 || parts !== Number(p.reaped)) failures.push(`${tag}: a reaped row says ${p.reaped} with parts adding to ${parts}`);
    }
    const reapedRows = d.rows.filter((r) => r.gateTrail?.[0]?.check === "reaper").length;
    if (reapedRows > 0 && reapRows.length === 0) failures.push(`${tag}: ${reapedRows} row(s) settled by the reaper and no reaped audit row`);
    // nothing else on a campaign: no row per recipient, none per slice
    const stray = es.filter((e) => !KNOWN_CAMPAIGN_ACTIONS.has(e.action));
    if (stray.length > 0) failures.push(`${tag}: ${stray.length} audit row(s) of an action no event owns (${first([...new Set(stray.map((e) => e.action))], 3)})`);
    const total = es.length;
    const owned = acts.filter((a) => a.ok).length + refusedStarts + pauses.length + finished + enq + reapRows.length;
    if (total !== owned) failures.push(`${tag}: ${total} audit rows on the campaign, ${owned} events account for`);
  }
  // one RG line per RG refusal acted on
  const rgSkips = data.reduce((n, d) => n + d.rows.filter((r) => r.status === "SKIPPED" && (r.skipReason ?? "").startsWith("rg_")).length, 0);
  const rgRows = entries.filter((e) => e.action === "marketing.suppressed.rg");
  rgLines = rgRows.length;
  if (rgRows.length !== rgSkips + h.rgRegated) failures.push(`${rgSkips} RG refusal(s) settled${h.rgRegated > 0 ? ` (+${h.rgRegated} acted on twice after a crash)` : ""}, ${rgRows.length} RG audit line(s)`);
  if (rgRows.some((e) => e.category !== "COMPLIANCE" || e.actorId !== null || e.targetType !== "User")) failures.push("an RG audit line is not a COMPLIANCE row against an account with no actor");
  // ⛔ no phone number in any audit row, and none in any line the server printed
  const nines = new Set([...h.numbers].map((k) => k.slice(3)));
  let leaks = 0;
  for (const e of entries) {
    const hits = numbersIn(json({ a: e.action, p: e.payload, t: e.targetType, actor: e.actorId, ip: e.ip, ua: e.userAgent }), nines);
    if (hits.length > 0) {
      leaks += hits.length;
      failures.push(`audit row ${e.action} carries a phone number (${hits[0]})`);
    }
    // the target id may be an id the server made, never a number
    if (e.targetId && /^[0-9]{9,}$/.test(e.targetId) && nines.has(e.targetId.slice(-9))) {
      leaks += 1;
      failures.push(`audit row ${e.action} is aimed at a phone number`);
    }
  }
  let logLeaks = 0;
  for (const line of h.tap.lines) {
    const hits = numbersIn(line, nines);
    if (hits.length > 0) {
      logLeaks += hits.length;
      if (logLeaks <= 3) failures.push(`a printed line carries a phone number (${hits[0]}): ${line.slice(0, 60)}`);
    }
  }
  return {
    id: "INV5", name: INV_NAMES.INV5, ok: failures.length === 0,
    detail: failures.length === 0
      ? `${num(entries.length)} audit rows since the run began: ${actsLanded} officer acts and ${enginePauses} engine pauses each with their one row, ${rgLines} RG lines for ${rgSkips} RG refusals, nothing else on a campaign; no phone number in ${num(entries.length)} rows or ${num(h.tap.lines.length)} printed lines`
      : first(failures),
    numbers: { auditRows: entries.length, officerActsLanded: actsLanded, enginePauses, rgLines, phoneLeaksInAudit: leaks, phoneLeaksInLog: logLeaks, printedLines: h.tap.lines.length, violations: failures.length },
    failures,
  };
}

/* ══ INV6 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

function inv6(h: Harness): Inv {
  const bound = h.S.engine.CLAIM_SEND_MAX_AGE_MS;
  const failures: string[] = [];
  let messages = 0;
  let oldest = 0;
  let unclaimed = 0;
  for (const r of h.carrier.requests) {
    for (const m of r.messages) {
      if (m.recipientId === null) continue; // a code (OTP), not a campaign message
      messages += 1;
      if (m.claimAgeMs === null) {
        unclaimed += 1;
        failures.push(`request ${r.seq}: a campaign message left without a claim on its row (${m.campaignId?.slice(-12)})`);
        continue;
      }
      oldest = Math.max(oldest, m.claimAgeMs);
      if (!(m.claimAgeMs < bound)) failures.push(`request ${r.seq}: a message left from a claim ${Math.round(m.claimAgeMs / 1000)} s old (bound ${bound / 1000} s)`);
    }
  }
  return {
    id: "INV6", name: INV_NAMES.INV6, ok: failures.length === 0,
    detail: failures.length === 0
      ? `${num(messages)} campaign messages in ${num(h.carrier.requests.length)} requests: the oldest claim was ${(oldest / 1000).toFixed(1)} s old when its message reached the carrier, bound ${bound / 1000} s`
      : first(failures),
    numbers: { messages, requests: h.carrier.requests.length, oldestClaimMs: Math.round(oldest), boundMs: bound, unclaimed, violations: failures.length },
    failures,
  };
}

/* ══ ALL SIX ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Evaluate the six invariants over the whole store as it stands. Never throws: a check that cannot run is that invariant's failure. */
export async function evaluateInvariants(h: Harness): Promise<Inv[]> {
  let data: Data[];
  try {
    data = await gather(h);
  } catch (err) {
    const why = `the store could not be read: ${String((err as Error)?.message ?? err).slice(0, 200)}`;
    return INV_IDS.map((id) => ({ id, name: INV_NAMES[id], ok: false, detail: why, numbers: {}, failures: [why] }));
  }
  const run = async (id: InvId, f: () => Inv | Promise<Inv>): Promise<Inv> => {
    try {
      return await f();
    } catch (err) {
      const why = `the check threw: ${String((err as Error)?.message ?? err).slice(0, 200)}`;
      return { id, name: INV_NAMES[id], ok: false, detail: why, numbers: {}, failures: [why] };
    }
  };
  return [
    await run("INV1", () => inv1(h, data)),
    await run("INV2", () => inv2(h, data)),
    await run("INV3", () => inv3(h, data)),
    await run("INV4", () => inv4(h, data)),
    await run("INV5", () => inv5(h, data)),
    await run("INV6", () => inv6(h)),
  ];
}
