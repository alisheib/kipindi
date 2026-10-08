/**
 * /api/dev-test/marketing-live-seed — the world of U47b-2's drive (`qa:marketing-live`): the live campaign page, driven.
 *
 * ⛔ 404 IN PRODUCTION, before anything else, like every route under `dev-test/` (`test:cert-devroutes`). It is reachable
 * only where `NODE_ENV` is not `production`, which on this platform means a developer's own machine. ⛔ 409 on a
 * database-backed dev server: the staged states below are written straight into the IN-MEMORY store (no DAL door settles a
 * row to a state a slice would have left), which a Postgres-backed server does not read.
 * ⛔ IT SENDS NOTHING AND CAN SEND NOTHING: no SMS module is imported, no message row is written, no purpose is named. The
 * one campaign it makes RUNNABLE (`?run=`) is sent by the page's own driver, through the engine, on the server's SMS rail —
 * and the drive refuses to start unless that rail is the console stub (messages go to the server log, never to a phone).
 *
 * ⭐ EVERY RECORD GOES IN THROUGH THE PLATFORM'S OWN WRITERS, so the gate answers each exactly as it will a real one: an
 * account through the user store, every yes through `recordPlayerMarketingChoice` (the profile switch's writer — the
 * ledger row with its pinned sentence), a stop through `ensureOptOutToken` + `stopMarketing` (the opt-out link's own
 * path), a contact through the ONE create builder and the ONE mirror, a campaign born a blank DRAFT through
 * `db.smsCampaign.create` and moved by the one conditional `transition` — the confirmation's keys written once on
 * DRAFT → CONFIRMED, as U40a leaves them. Only the STAGED campaigns' rows are given the state a slice would have left them
 * in, directly in the memory map (U36's seed does the same).
 *
 *   POST ?run=<id>            — a campaign the engine can really run: "Live drive <id>", CONFIRMED, ten people on tag
 *                               `u47live-<id>` — eight who will receive, one who stopped by their link (SKIPPED, `suppressed`)
 *                               and one who never said yes (SKIPPED, `no_consent`). Idempotent per id. Answers the ids and
 *                               the figures the drive asserts: every campaign is a fresh Start → PREPARING → RUNNING → DONE.
 *   POST ?stages=<id>         — the states the drive photographs, as rows (idempotent per id): CONFIRMED (1,604 people —
 *                               Start's dialog), CONFIRMED on an audience that can no longer be read (Start is refused),
 *                               PREPARING (600 of 1,604 written), RUNNING (1,604 people, every KPI, reasons
 *                               and chip), PAUSED by an engine reason, PAUSED by an officer (no audit row — the page says "an
 *                               officer"), DONE with a "No answer", CANCELLED (an officer's stop) and a RUNNING campaign of
 *                               five (E23's floor). ⛔ Their audiences are made up: the drive loads them with the window
 *                               pinned shut, or as a viewer who cannot act, so no step ever runs on them.
 *   POST ?busy=<ms>           — hold the platform's bet-admission gate full for <ms> (at most 60,000) so the engine reads
 *                               "money first" — the page's money-busy wait; 0 lets it go. The gate's limits are put back.
 *   POST ?words=1             — the page's own sentences, as `live-copy.ts` says them (the drive asserts against these).
 *
 * The window's clock is `/api/dev-test/marketing-send-window`'s; the read fault is `marketing-campaigns-seed`'s `?fault=`; the
 * view-only role is `marketing-contacts-seed`'s `?u23grant=view-only|reset`.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type {
  SmsCampaignRecipientStatus, SmsCampaignStatus, SmsCampaignTransitionPatch, StoredSmsCampaign, StoredSmsCampaignRecipient, StoredUser,
} from "@/lib/server/store";
import { hasDatabase } from "@/lib/server/prisma";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { recordPlayerMarketingChoice } from "@/lib/server/marketing/consent";
import { ensureOptOutToken, stopMarketing } from "@/lib/server/marketing/optout-service";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";
import { newContactRow } from "@/lib/server/contacts/contact-write";
import { WHOLE_BOOK, contactAudienceKey } from "@/lib/server/marketing/audience";
import { startRefusalSentence } from "@/lib/server/marketing/start-check";
import { liveSendWindow } from "@/lib/server/marketing/dispatch";
import { getAdmissionLimits, setAdmissionLimits, withAdmission } from "@/lib/server/admission";
import {
  LIVE_ACT_UNFINISHED, LIVE_BACK, LIVE_CONTROL_LABEL, LIVE_DIALOG_ACTIONS, LIVE_DISABLED, LIVE_DONE, LIVE_FLOOR, LIVE_HEADLINE,
  LIVE_KEEP_OPEN, LIVE_KPI, LIVE_MISSING, LIVE_OUT_OF_DATE, LIVE_RELOAD, LIVE_SW, LIVE_SWITCH_OFF, LIVE_TITLE, LIVE_TRY_AGAIN,
  LIVE_PAUSED_HIDDEN, LIVE_PAUSED_HIDDEN_VIEW, LIVE_WAIT_HIDDEN, NOT_SENT_EXTRA, copyDoneSentence, eatClock, startDialog, stopDialog,
  waitSentence,
} from "@/app/admin/campaigns/[id]/live-copy";
import { stopReasonLabel } from "@/lib/marketing/campaign-status";
import { AUDIENCE_REASON_LABEL } from "@/app/admin/campaigns/new/audience-copy";

const OFFICER_ID = "usr_u47live_officer";
const OFFICER_NAME = "Amina";
const JOINED = "2025-01-10T08:00:00.000Z";
const SOURCE_LINE = "Kutoka orodha ya 50pick.";
const BODY_SW = "50pick: Habari {jina}, ofa ya leo.";
const MIN = 60_000;
const BASE_MS = Date.now() - 6 * 60 * MIN;
const iso = (ms: number) => new Date(ms).toISOString();
const pad = (n: number, w: number) => String(n).padStart(w, "0");

/** The run id as the ids and the digits of the numbers use it: letters and digits only, five of them at most. */
const cleanRun = (v: string | null): string => (v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
/** Five digits from the run id, for the numbers (NDC 78 — no other seed uses it, so two runs never meet). */
const digitsOf = (run: string): string => pad([...run].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 100_000, 7), 5);

/* ── the ten people ── */
type Kind = "will" | "stopped" | "never";
const KINDS: readonly Kind[] = ["will", "will", "will", "will", "will", "will", "will", "will", "stopped", "never"];
const numberOf = (run: string, n: number) => `78${digitsOf(run)}${pad(n, 2)}`;

async function ensureOfficer(): Promise<void> {
  if (await db.user.findById(OFFICER_ID)) return;
  await db.user.create({
    id: OFFICER_ID, phoneE164: "+255780000001", email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "GROWTH", status: "ACTIVE", locale: "SW", displayName: OFFICER_NAME, dob: "1990-01-01", region: null, acceptedTermsVersion: "v1",
    acceptedTermsAt: JOINED, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, emailVerifiedAt: null,
    createdAt: JOINED, updatedAt: JOINED, lastLoginAt: JOINED, closedAt: null,
  } as StoredUser);
}

/** One person of the run's tag: a contact in the book, and — for a yes or a stop — the account that said it. */
async function seedPerson(run: string, tag: string, n: number, kind: Kind): Promise<void> {
  const raw = `0${numberOf(run, n)}`;
  const parsed = parseTzNumber(raw);
  if (parsed.verdict !== "ok" || !parsed.msisdn) throw new Error("seed: a made-up number did not parse");
  if (await db.marketingContact.findByMsisdn(parsed.msisdn)) return;
  const at = iso(BASE_MS);
  if (kind !== "never") {
    const id = `usr_u47live_${run}_${pad(n, 2)}`;
    await db.user.create({
      id, phoneE164: `+${parsed.msisdn}`, email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null, acceptedTermsVersion: "v1",
      acceptedTermsAt: JOINED, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, emailVerifiedAt: null,
      createdAt: JOINED, updatedAt: JOINED, lastLoginAt: JOINED, closedAt: null,
    } as StoredUser);
    await recordPlayerMarketingChoice({ userId: id, marketingOptIn: true, locale: "SW" });
    if (kind === "stopped") {
      const token = await ensureOptOutToken(`+${parsed.msisdn}`);
      if (token !== null) await stopMarketing(token, "SW");
    }
  }
  const row = await db.marketingContact.create(newContactRow({
    number: parsed, rawInput: raw, displayName: null, email: null, tags: [tag], notes: null,
    source: "OPERATOR", sourceRef: null, importId: null, officerId: OFFICER_ID, at,
  }, `mc_u47live_${run}_${pad(n, 2)}`));
  if (row) await mirrorContactCache(row.msisdn, at);
}

/* ── a campaign, through the one door ── */
type Step = "CONFIRMED" | "PREPARING" | "RUNNING" | "PAUSED" | "DONE" | "CANCELLED";

function draftRow(id: string, name: string, filter: string, at: string): StoredSmsCampaign {
  return {
    id, name, status: "DRAFT", bodySw: BODY_SW, bodyEn: null, codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: null,
    nameFallbackSw: "Rafiki", nameFallbackEn: null, sourcePhrase: SOURCE_LINE, draftRevision: 0, confirmTier: null,
    audienceFilter: filter, audienceCount: null, audienceWatermark: null, estimateSegments: null, estimateTzs: null, budgetTzs: null,
    enqueueCursor: null, enqueuedAt: null, stopReason: null, createdBy: OFFICER_ID, confirmedBy: null, confirmedAt: null, startedAt: null,
    pausedAt: null, finishedAt: null, createdAt: at, updatedAt: at,
  };
}

function patchFor(step: Step, o: { count: number; stopReason?: string | null }, at: string): SmsCampaignTransitionPatch {
  switch (step) {
    case "CONFIRMED":
      return {
        audienceCount: o.count, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: o.count, estimateTzs: o.count * 6,
        budgetTzs: 10_000, confirmedBy: OFFICER_ID, confirmedAt: at,
      };
    case "PREPARING":
      return { startedAt: at };
    case "RUNNING":
      return { enqueuedAt: at, enqueueCursor: "done" };
    case "PAUSED":
      return { pausedAt: at, stopReason: o.stopReason ?? null };
    case "DONE":
      return { finishedAt: at };
    case "CANCELLED":
      return { finishedAt: at, stopReason: "officer_stopped" };
  }
}

async function makeCampaign(id: string, name: string, filter: string, path: Step[], o: { count: number; stopReason?: string | null }): Promise<boolean> {
  if (await db.smsCampaign.find(id)) return false;
  const created = BASE_MS;
  await db.smsCampaign.create(draftRow(id, name, filter, iso(created)));
  let from: SmsCampaignStatus = "DRAFT";
  let t = created + 10 * MIN;
  for (const step of path) {
    const at = iso(t);
    const patch = patchFor(step, o, at);
    // A campaign paused or stopped before its list finished has no enqueuedAt: the staged PREPARING ones never reach RUNNING.
    const moved = await db.smsCampaign.transition(id, { from: [from], to: step, patch, draftRevision: step === "CONFIRMED" ? 0 : null, at });
    if (moved === null) throw new Error(`seed: ${id} could not move ${from} → ${step}`);
    from = step;
    t += 5 * MIN;
  }
  return true;
}

/* ── the staged rows (memory twin only) ── */
type Mix = Partial<Record<SmsCampaignRecipientStatus, number>>;
type Skips = Record<string, number>;

function memoryCampaigns(): Map<string, StoredSmsCampaign> {
  const s = (globalThis as unknown as { __50PICK_STORE?: { smsCampaigns?: Map<string, StoredSmsCampaign> } }).__50PICK_STORE;
  if (!s?.smsCampaigns) throw new Error("seed: the in-memory store has no campaign map");
  return s.smsCampaigns;
}

function memoryRecipients(): Map<string, StoredSmsCampaignRecipient> {
  const s = (globalThis as unknown as { __50PICK_STORE?: { smsCampaignRecipients?: Map<string, StoredSmsCampaignRecipient> } }).__50PICK_STORE;
  if (!s?.smsCampaignRecipients) throw new Error("seed: the in-memory store has no campaign recipient map");
  return s.smsCampaignRecipients;
}

/** Rows on a campaign through the ONE seed door, then given the states asked — SKIPPED rows split over `skips`' reasons. */
async function stageRows(run: string, id: string, slot: number, mix: Mix, skips: Skips = {}): Promise<number> {
  const entries = Object.entries(mix) as Array<[SmsCampaignRecipientStatus, number]>;
  const total = entries.reduce((n, [, k]) => n + k, 0);
  if (total === 0) return 0;
  const seeds = Array.from({ length: total }, (_, i) => ({
    id: `rcp_u47live_${run}_${pad(slot, 2)}_${pad(i, 5)}`,
    campaignId: id,
    msisdn: `25579${pad(slot, 2)}${pad(i, 5)}`,
    contactId: null, userId: null, optOutToken: null, createdAt: iso(BASE_MS + 12 * MIN),
  }));
  for (let i = 0; i < seeds.length; i += 1000) await db.smsCampaignRecipient.createMany(seeds.slice(i, i + 1000));
  const rows = memoryRecipients();
  const reasons = Object.entries(skips).flatMap(([reason, k]) => Array.from({ length: k }, () => reason));
  let k = 0;
  let skipped = 0;
  for (const [status, count] of entries) {
    for (let j = 0; j < count; j++, k++) {
      const row = rows.get(seeds[k].id);
      if (!row) continue;
      row.status = status;
      if (status === "SKIPPED") row.skipReason = reasons[skipped++] ?? "suppressed";
      if (status === "HELD") row.failureClass = "gate_unanswered";
    }
  }
  return total;
}

type Stage = { key: string; name: string; path: Step[]; count: number; stopReason?: string | null; mix: Mix; skips?: Skips; unreadableAudience?: boolean };
/** The staged set. Counts are the figures the drive asserts, written once. */
const STAGES: readonly Stage[] = [
  { key: "confirmed", name: "Derby week offer", path: ["CONFIRMED"], count: 1604, mix: {} },
  // Start is refused for this one, deterministically: the saved audience can no longer be read (the store writes a filter
  // it can read; the memory map is changed afterwards, as test:campaign-visuals S9 does).
  { key: "confirmed_bad", name: "Old audience", path: ["CONFIRMED"], count: 200, mix: {}, unreadableAudience: true },
  { key: "preparing", name: "Big match night", path: ["CONFIRMED", "PREPARING"], count: 1604, mix: { PENDING: 600 } },
  {
    key: "running", name: "Weekend kick-off", path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 1604,
    mix: { SENT: 700, DELIVERED: 120, FAILED: 8, SKIPPED: 60, UNCONFIRMED: 2, HELD: 5, PENDING: 709 },
    skips: { suppressed: 24, no_consent: 20, rg_self_excluded: 8, age_minor: 5, bad_msisdn: 3 },
  },
  {
    key: "paused_engine", name: "Payday special", path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 300, stopReason: "gateway_refused",
    mix: { SENT: 120, PENDING: 180 },
  },
  {
    key: "paused_officer", name: "Champions night", path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 300, stopReason: "officer_paused",
    mix: { SENT: 200, PENDING: 100 },
  },
  {
    key: "done", name: "Friday flash", path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], count: 40,
    mix: { SENT: 30, DELIVERED: 6, UNCONFIRMED: 2, FAILED: 1, SKIPPED: 1 }, skips: { suppressed: 1 },
  },
  {
    key: "stopped", name: "Rainy day promo", path: ["CONFIRMED", "PREPARING", "RUNNING", "CANCELLED"], count: 20,
    mix: { SENT: 8, PENDING: 12 },
  },
  {
    key: "floor", name: "Five friends", path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 5,
    mix: { SENT: 2, SKIPPED: 2, PENDING: 1 }, skips: { rg_self_excluded: 2 },
  },
  // Paused by an engine reason on a list of five: below E23's floor the reason is one neutral sentence (and a role that may
  // only look is not told to press Resume) — on this page and on the campaigns list.
  {
    key: "paused_floor", name: "Five friends, paused", path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 5, stopReason: "gateway_refused",
    mix: { SENT: 3, PENDING: 2 },
  },
];

const idOf = (run: string, key: string) => `cmp_u47live_${run}_${key}`;

/* ── money busy: the platform's own gate, held full ── */
let release: (() => void) | null = null;
let restoreLimits: (() => void) | null = null;

function holdBusy(ms: number): void {
  dropBusy();
  const was = getAdmissionLimits();
  setAdmissionLimits({ ...was, maxInFlight: 1 });
  let timer: ReturnType<typeof setTimeout> | null = null;
  const held = new Promise<void>((resolve) => {
    release = () => { if (timer) clearTimeout(timer); resolve(); };
    timer = setTimeout(resolve, ms);
  });
  restoreLimits = () => { setAdmissionLimits(was); };
  void withAdmission(() => held).catch(() => {}).finally(() => { restoreLimits?.(); release = null; restoreLimits = null; });
}
function dropBusy(): void {
  release?.();
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  if (hasDatabase() && process.env.USE_PRISMA_DAL !== "false") {
    return NextResponse.json({ ok: false, error: "This seed writes recipient states into the in-memory store; run next dev without a database." }, { status: 409 });
  }
  const url = new URL(req.url);

  // ⭐ THE PAGE'S SENTENCES, as live-copy.ts says them — stateless; the drive reads them first and asserts against them, so no
  // sentence is ever copied into the drive. The Start dialog is built from the staged CONFIRMED campaign's own figures and the
  // send window as the engine reads it now (the same function the view uses).
  if (url.searchParams.get("words") !== null) {
    const window = await liveSendWindow();
    const closes = eatClock(window.closesAt);
    const hours = window.opensAtTime !== "" && closes !== null ? { opens: window.opensAtTime, closes } : null;
    const staged = STAGES[0];
    const dialog = (money: { costTzs: number; limitTzs: number } | null) =>
      startDialog({ count: staged.count, segments: staged.count, window: hours, money });
    return NextResponse.json({
      ok: true,
      words: {
        title: LIVE_TITLE, sw: LIVE_SW, back: LIVE_BACK, missing: LIVE_MISSING,
        headline: LIVE_HEADLINE,
        disabled: LIVE_DISABLED,
        control: LIVE_CONTROL_LABEL,
        dialog: LIVE_DIALOG_ACTIONS,
        startDialog: { growth: dialog(null), admin: dialog({ costTzs: staged.count * 6, limitTzs: 10_000 }) },
        stopDialog: { none: stopDialog("none"), reached: stopDialog("reached"), hidden: stopDialog("hidden") },
        startRefusals: { audience_unreadable: startRefusalSentence({ reason: "audience_unreadable" }, { money: false, reads: false }) },
        kpi: LIVE_KPI,
        reasons: AUDIENCE_REASON_LABEL,
        notSentExtra: NOT_SENT_EXTRA,
        floor: LIVE_FLOOR,
        done: LIVE_DONE,
        // The quiet-hours wait names when the window opens, as the engine's step does (`until` = the window's next opening while it
        // is shut), so the drive asks again after it pins the window shut.
        waits: {
          quiet_hours: waitSentence("quiet_hours", window.open !== true && window.opensAt !== "" ? window.opensAt : null),
          money_busy: waitSentence("money_busy", null), busy: waitSentence("busy", null), hidden: LIVE_WAIT_HIDDEN,
        },
        // A pause below E23's floor: the one neutral sentence, and its form for a role that may only look (no "press Resume");
        // and the engine reason a reader of the split (or a campaign over the floor) is told, in the engine's words.
        pausedHidden: LIVE_PAUSED_HIDDEN, pausedHiddenView: LIVE_PAUSED_HIDDEN_VIEW,
        pausedList: { gateway_refused: stopReasonLabel("gateway_refused"), officer_paused: stopReasonLabel("officer_paused") },
        keepOpen: LIVE_KEEP_OPEN, switchOff: LIVE_SWITCH_OFF, outOfDate: LIVE_OUT_OF_DATE, reload: LIVE_RELOAD, tryAgain: LIVE_TRY_AGAIN,
        unfinished: LIVE_ACT_UNFINISHED,
        copy: { done: copyDoneSentence("none") },
      },
    });
  }

  const busy = url.searchParams.get("busy");
  if (busy !== null) {
    const ms = Math.max(0, Math.min(60_000, Math.floor(Number(busy) || 0)));
    if (ms === 0) dropBusy();
    else holdBusy(ms);
    return NextResponse.json({ ok: true, busyMs: ms });
  }

  const runParam = url.searchParams.get("run");
  if (runParam !== null) {
    const run = cleanRun(runParam);
    if (run === "") return NextResponse.json({ ok: false, error: "?run= wants letters and digits" }, { status: 400 });
    await ensureOfficer();
    const tag = `u47live-${run}`;
    for (const [i, kind] of KINDS.entries()) await seedPerson(run, tag, i + 1, kind);
    const filter = contactAudienceKey({ ...WHOLE_BOOK, tags: [tag] });
    const id = idOf(run, "run");
    const created = await makeCampaign(id, `Live drive ${run}`, filter, ["CONFIRMED"], { count: KINDS.length });
    return NextResponse.json({
      ok: true, run, created, campaignId: id, tag, officer: { id: OFFICER_ID, name: OFFICER_NAME },
      people: KINDS.length,
      // What a clean run ends on: every row has an answer, and the two who cannot be messaged are SKIPPED — the stop first.
      expected: { onCampaign: KINDS.length, handedOver: KINDS.filter((k) => k === "will").length, notSent: 2, reasons: { suppressed: 1, no_consent: 1 } },
    });
  }

  const stagesParam = url.searchParams.get("stages");
  if (stagesParam !== null) {
    const run = cleanRun(stagesParam);
    if (run === "") return NextResponse.json({ ok: false, error: "?stages= wants letters and digits" }, { status: 400 });
    await ensureOfficer();
    const tag = `u47live-stage-${run}`;
    const filter = contactAudienceKey({ ...WHOLE_BOOK, tags: [tag] });
    const out: Array<{ key: string; id: string; name: string; status: SmsCampaignStatus; people: number; rows: number }> = [];
    for (const [slot, s] of STAGES.entries()) {
      const id = idOf(run, s.key);
      const made = await makeCampaign(id, s.name, filter, s.path, { count: s.count, stopReason: s.stopReason });
      if (made && s.unreadableAudience === true) {
        const row = memoryCampaigns().get(id);
        if (row) row.audienceFilter = "{not json";
      }
      const rows = made ? await stageRows(run, id, slot, s.mix, s.skips) : Object.values(s.mix).reduce((n, k) => n + (k ?? 0), 0);
      out.push({ key: s.key, id, name: s.name, status: s.path[s.path.length - 1], people: s.count, rows });
    }
    return NextResponse.json({ ok: true, run, officer: { id: OFFICER_ID, name: OFFICER_NAME }, stages: out });
  }

  return NextResponse.json({ ok: false, error: "?run=<id> · ?stages=<id> · ?busy=<ms> · ?words=1" }, { status: 400 });
}

export async function GET(req: Request) {
  return POST(req);
}
