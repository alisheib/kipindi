/**
 * /api/dev-test/marketing-campaigns-seed — fill the SMS campaign list, for the U36 visual drive.
 *
 * ⛔ 404 IN PRODUCTION, like every other route under `dev-test/` (`test:cert-devroutes`): the refusal is the handler's
 * first statement. And ⛔ 409 on a database-backed dev server: the recipient states below are written straight into
 * the IN-MEMORY store (nothing settles a recipient row before U43's slice exists, so no DAL door can), which a
 * Postgres-backed server does not read.
 * ⛔ IT SENDS NOTHING AND CAN SEND NOTHING: no SMS module is imported, no message row is written, no purpose is named.
 * The campaigns are rows in the two campaign tables and nothing else — the list's whole subject.
 *
 * ⭐ THE CAMPAIGNS GO IN THROUGH THE ONE DOOR. Each is born a blank DRAFT through `db.smsCampaign.create` and moved by
 * `db.smsCampaign.transition` — the conditional moves the rule set allows, the confirmation's keys written once on
 * DRAFT → CONFIRMED (no money: the estimate is null, the budget null) — and recipients through
 * `db.smsCampaignRecipient.createMany`, born PENDING. Only then are some rows given the state a slice would have left
 * them in (SENT, DELIVERED, FAILED, SKIPPED, HELD), directly in the memory map — dev only, the memory twin only.
 *
 *   POST ?set=base    — 22 campaigns (idempotent: deterministic ids, a re-run creates nothing): six drafts, three
 *                       confirmed, ten finished or stopped, and three in flight — a PREPARING list (600 of 2,400
 *                       written), a RUNNING campaign (1,847 of 5,912 settled, 165 of the rest HELD) and a RUNNING
 *                       campaign with no rows yet. Zero PAUSED, so `?status=paused` is the no-match state. Wants
 *                       attention: 3.
 *   POST ?set=paused  — two PAUSED campaigns: one held by the credit floor with work left (wants attention → 4), one
 *                       with every row settled and an engine reason this code does not know ("Engine reason: …").
 *   POST ?fault=1|0   — switch the MEMORY twin's campaign read fault on/off, to photograph the error state.
 * The answer carries what the drive asserts against: the rail's counts, the attention count, and per campaign its
 * final status, rows, settled rows and the stop-reason sentence the list must print.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type {
  SmsCampaignRecipientStatus, SmsCampaignStatus, SmsCampaignTransitionPatch, StoredSmsCampaign, StoredSmsCampaignRecipient,
} from "@/lib/server/store";
import { hasDatabase } from "@/lib/server/prisma";
import { SETTLED_RECIPIENT_STATUSES, campaignTotal, railCount, stopReasonLabel } from "@/lib/marketing/campaign-status";

const SEED_OFFICER = "usr_seed_campaigns";
const BASE_MS = Date.parse("2026-09-20T07:00:00.000Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const iso = (ms: number) => new Date(ms).toISOString();
const pad = (n: number, w: number) => String(n).padStart(w, "0");

type Step = "CONFIRMED" | "PREPARING" | "RUNNING" | "PAUSED" | "DONE" | "CANCELLED";
type Mix = Partial<Record<SmsCampaignRecipientStatus, number>>;
type Recipe = { n: number; name: string; path: Step[]; audience: number | null; mix: Mix; stopReason?: string; english?: boolean };

/** ⭐ The base set: newest first on the list, so the three in flight (20, 21, 22) head page 1 and two rows fall on page 2. */
const BASE: Recipe[] = [
  { n: 1, name: "Derby day reminder", path: [], audience: null, mix: {} },
  { n: 2, name: "Welcome back offer", path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], audience: 40, mix: { SENT: 30, DELIVERED: 6, FAILED: 3, SKIPPED: 1 } },
  { n: 3, name: "Old test draft", path: ["CANCELLED"], audience: null, mix: {} },
  { n: 4, name: "Weekend bonus", path: [], audience: null, mix: {}, english: true },
  { n: 5, name: "Champions night", path: ["CONFIRMED"], audience: 1200, mix: {} },
  { n: 6, name: "Asubuhi njema", path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], audience: 25, mix: { SENT: 20, DELIVERED: 4, SKIPPED: 1 } },
  { n: 7, name: "Ijumaa special", path: [], audience: null, mix: {} },
  { n: 8, name: "Goal rush", path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], audience: 60, mix: { SENT: 50, DELIVERED: 8, FAILED: 2 } },
  { n: 9, name: "Early bird", path: ["CONFIRMED"], audience: 800, mix: {}, english: true },
  { n: 10, name: "Halftime quiz", path: ["CONFIRMED", "CANCELLED"], audience: 300, mix: {} },
  { n: 11, name: "Jumamosi derby", path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], audience: 30, mix: { SENT: 25, DELIVERED: 5 } },
  { n: 12, name: "Simba vs Yanga", path: [], audience: null, mix: {} },
  { n: 13, name: "Friday flash", path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], audience: 20, mix: { SENT: 18, FAILED: 2 } },
  { n: 14, name: "Rainy day promo", path: ["CONFIRMED", "PREPARING", "RUNNING", "CANCELLED"], audience: 20, mix: { SENT: 8, PENDING: 12 } },
  { n: 15, name: "Midweek boost", path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], audience: 15, mix: { DELIVERED: 15 } },
  { n: 16, name: "Cup final", path: [], audience: null, mix: {} },
  { n: 17, name: "New season", path: ["CONFIRMED"], audience: 2000, mix: {} },
  { n: 18, name: "Thank you", path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], audience: 10, mix: { SENT: 10 } },
  // A draft nobody has named yet — the list reads "Untitled campaign".
  { n: 19, name: "", path: [], audience: null, mix: {} },
  { n: 20, name: "Big match night", path: ["CONFIRMED", "PREPARING"], audience: 2400, mix: { PENDING: 600 } },
  { n: 21, name: "Weekend kick-off", path: ["CONFIRMED", "PREPARING", "RUNNING"], audience: 5912, english: true,
    mix: { SENT: 1500, DELIVERED: 200, FAILED: 80, SKIPPED: 67, HELD: 165, PENDING: 3900 } },
  { n: 22, name: "Late kick-off", path: ["CONFIRMED", "PREPARING", "RUNNING"], audience: 150, mix: {} },
];

/** Two paused campaigns: work left behind the credit floor, and a finished-in-all-but-name one with an unknown reason. */
const PAUSED_SET: Recipe[] = [
  { n: 23, name: "Payday special", path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], audience: 300, mix: { SENT: 120, PENDING: 180 }, stopReason: "BALANCE_FLOOR" },
  { n: 24, name: "Late night replay", path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], audience: 50, mix: { SENT: 50 }, stopReason: "carrier_window_closed" },
];

const idOf = (n: number) => `cmp_seed_${pad(n, 2)}`;

/** A campaign as U37's save will leave it: a blank DRAFT with its body's SAVED verdicts, and nothing a later step writes. */
function draftRow(r: Recipe, createdAt: string): StoredSmsCampaign {
  return {
    id: idOf(r.n), name: r.name, status: "DRAFT", bodySw: "50pick: Habari! Mechi kubwa leo.", bodyEn: r.english ? "50pick: Big match today." : null,
    codingSw: "GSM7", segmentsSw: 1, codingEn: r.english ? "GSM7" : null, segmentsEn: r.english ? 1 : null,
    nameFallbackSw: null, nameFallbackEn: null, sourcePhrase: null, draftRevision: 0, confirmTier: null,
    audienceFilter: '{"consent":["GIVEN"]}', audienceCount: null, audienceWatermark: null, estimateSegments: null,
    estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null, createdBy: SEED_OFFICER,
    confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null, createdAt, updatedAt: createdAt,
  };
}

/** What each move writes — the engine's own stamps, and the confirmation's keys all at once (no money, X15 null). */
function patchFor(step: Step, r: Recipe, at: string): SmsCampaignTransitionPatch {
  switch (step) {
    case "CONFIRMED":
      return {
        audienceCount: r.audience ?? 1, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: r.audience ?? 1,
        estimateTzs: null, budgetTzs: null, confirmedBy: SEED_OFFICER, confirmedAt: at,
      };
    case "PREPARING":
      return { startedAt: at };
    case "RUNNING":
      return { enqueuedAt: at, enqueueCursor: "done" };
    case "PAUSED":
      return { pausedAt: at, stopReason: r.stopReason ?? null };
    case "DONE":
    case "CANCELLED":
      return { finishedAt: at };
  }
}

/** The memory twin's recipient map — dev only. */
function memoryRecipients(): Map<string, StoredSmsCampaignRecipient> {
  const s = (globalThis as unknown as { __50PICK_STORE?: { smsCampaignRecipients?: Map<string, StoredSmsCampaignRecipient> } }).__50PICK_STORE;
  if (!s?.smsCampaignRecipients) throw new Error("seed: the in-memory store has no campaign recipient map");
  return s.smsCampaignRecipients;
}

async function seedOne(r: Recipe): Promise<boolean> {
  const id = idOf(r.n);
  if (await db.smsCampaign.find(id)) return false;
  const created = BASE_MS + r.n * HOUR;
  await db.smsCampaign.create(draftRow(r, iso(created)));
  let from: SmsCampaignStatus = "DRAFT";
  let t = created + 30 * MINUTE;
  for (const step of r.path) {
    const at = iso(t);
    const moved = await db.smsCampaign.transition(id, { from: [from], to: step, patch: patchFor(step, r, at), draftRevision: step === "CONFIRMED" ? 0 : null, at });
    if (moved === null) throw new Error(`seed: ${id} could not move ${from} → ${step}`);
    from = step;
    t += 20 * MINUTE;
  }
  const entries = Object.entries(r.mix) as Array<[SmsCampaignRecipientStatus, number]>;
  const rows = entries.reduce((n, [, k]) => n + k, 0);
  const seeds = Array.from({ length: rows }, (_, i) => ({
    id: `rcp_seed_${pad(r.n, 2)}_${pad(i, 6)}`,
    campaignId: id,
    msisdn: `2557${pad(r.n, 2)}${pad(i, 6)}`,
    contactId: null,
    userId: null,
    optOutToken: null,
    createdAt: iso(created + 40 * MINUTE),
  }));
  for (let i = 0; i < seeds.length; i += 1000) await db.smsCampaignRecipient.createMany(seeds.slice(i, i + 1000));
  // ⛔ DEV ONLY · the states a slice would have left, set in the memory map (no DAL door settles a row before U43).
  const recipients = memoryRecipients();
  let k = 0;
  for (const [status, count] of entries) {
    for (let j = 0; j < count; j++, k++) {
      const row = recipients.get(seeds[k].id);
      if (row) row.status = status;
    }
  }
  return true;
}

/** What the drive asserts against, per campaign. */
function fixtureOf(r: Recipe) {
  const rows = Object.values(r.mix).reduce((n, k) => n + (k ?? 0), 0);
  const settled = SETTLED_RECIPIENT_STATUSES.reduce((n, s) => n + (r.mix[s] ?? 0), 0);
  return {
    id: idOf(r.n),
    name: r.name,
    status: (r.path.length === 0 ? "DRAFT" : r.path[r.path.length - 1]) as SmsCampaignStatus,
    audience: r.audience,
    rows,
    settled,
    stopReason: r.stopReason ?? null,
    stopSentence: r.stopReason ? stopReasonLabel(r.stopReason) : null,
  };
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  if (hasDatabase() && process.env.USE_PRISMA_DAL !== "false") {
    return NextResponse.json({ ok: false, error: "This seed writes recipient states into the in-memory store; run next dev without a database." }, { status: 409 });
  }
  const url = new URL(req.url);
  const fault = url.searchParams.get("fault");
  if (fault !== null) {
    globalThis.__50PICK_CAMPAIGNS_READ_FAULT = fault === "1";
    return NextResponse.json({ ok: true, fault: globalThis.__50PICK_CAMPAIGNS_READ_FAULT });
  }
  const set = url.searchParams.get("set") ?? "base";
  const recipes = set === "base" ? BASE : set === "paused" ? PAUSED_SET : null;
  if (recipes === null) return NextResponse.json({ ok: false, error: "set is base or paused" }, { status: 400 });
  let created = 0;
  for (const r of recipes) if (await seedOne(r)) created++;
  if (globalThis.__50PICK_CAMPAIGNS_READ_FAULT) return NextResponse.json({ ok: true, set, created, fault: true });
  const counts = await db.smsCampaign.statusCounts();
  return NextResponse.json({
    ok: true,
    set,
    created,
    total: campaignTotal(counts),
    rail: { drafts: railCount(counts, "drafts"), sending: railCount(counts, "sending"), paused: railCount(counts, "paused"), finished: railCount(counts, "finished") },
    attention: await db.smsCampaign.attentionCount(),
    fixtures: recipes.map(fixtureOf),
  });
}

export async function GET(req: Request) {
  return POST(req);
}
