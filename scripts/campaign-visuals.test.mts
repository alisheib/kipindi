/**
 * test:campaign-visuals — U47b's suite: THE LIVE CAMPAIGN PAGE (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.15; decisions
 * E10 · E22 · E23 · E24 · E25 · OD24 · OD26 · OD34 · OD41 · OD65 · OD66, and §4.15 decision 1 AS AMENDED).
 *
 * ⭐ U47b-1 BUILDS §svc — the services (`campaign-control.ts`) and the view-model (`campaign-live.ts`), with the words both
 * return (`src/app/admin/campaigns/[id]/live-copy.ts`). Nothing is reachable yet (no action, no page), so every claim here is
 * DRIVEN on the memory twin, never read off a screen. U47b-2 adds the page's own claims — V1 and V4–V10 — to this file.
 *   C0  controls — the fixture world walks where it says, the ONE groupBy answers a seeded list exactly, the rail is the stub;
 *   V2  ⭐ HELD IS OUTSTANDING (the plan's RED) — 4 SENT + 6 HELD read "4 of 10"; an empty campaign paints NO bar;
 *   V3  ⭐ THE COUNTS FROZEN SERVER-SIDE (OD34, the plan's RED) — two views ten seconds apart give the same bar, byte for byte;
 *   S1  ONE GROUPBY (decision 8, OD26) — asked once per view; the KPIs and chips partition the rows;
 *   S2  U38b's FIVE WORDS under "Not sent" — protected ONE line, dominant first, adding up to "Not sent";
 *   S3  ⛔ E23 · THE FLOOR — a masked viewer under ten ROWS sees the count and no split;
 *   S4  ⛔ OD24 · MONEY only for a money reader — no "TZS" anywhere in a GROWTH view;
 *   S5  the headline for every status, and why it stopped — an officer's act named from its audit row;
 *   S6  the controls — always present, each disabled with its reason;
 *   S7  the standing facts — the switch through THE gate, the window, nobody driving, keep this page open;
 *   S8  ⛔ THE COPY ADVICE — once anybody was messaged, a copy messages them again; under the floor, a condition;
 *   S9  the audience in words through the list's ONE role-shaped describer (`campaignRowAudience`) and its words;
 *   T1  Start through the REAL check · T2 ⭐ every U49a Start refusal reaches its sentence · T3 ⭐ OD66 at Start ·
 *   T4  Pause · T5 ⭐ Resume's re-queue · T6 ⭐ Resume's count-based refusals · T7 Stop (E25) · T8 ⭐ Make a copy;
 *   D1  the step dispatcher (§3.3) · D2 ⭐ its single-flight per campaign · D3 act-gated · D4 ⭐ end to end on the memory
 *       twin (Start → enqueue → a slice on a stub wire → DONE) · D5 the reaper on mount;
 *   W1  the wiring — nothing reachable, no send named, the doors by identity; P1 ⛔ no phone number, no refusal object.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION (§5.11). `--prove-red` proves the baseline green first, then plants each defect IN MEMORY
 * (a dependency handed to a service or the view, a wrapper of a service, a source text replaced in memory) and requires
 * EXACTLY the claims it names to fail — red anywhere else is reported, never counted as a catch. No file on disk is
 * written. No database is touched: the database variables are removed below, before the first server module loads, so the
 * store picks its memory twin. ⛔ NO SMS LEAVES: the rail is the console stub, and every slice runs on a stub wire with the
 * send window FIXED open (`scripts/lib/send-window.mts`, ENGINE-SPEC §5 rule 9 — a battery at night must not see every
 * slice wait).
 * ⛔ This file holds no backslash (an editing tool decodes them): line breaks and patterns are built from codes and
 * character classes.
 *
 * Run: `npm run test:campaign-visuals` · Red: `npm run red:campaign-visuals`
 */
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.REDIS_ENABLED;
process.env.SMS_PROVIDER = "console";
process.exitCode = 1;

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const PROVE_RED = process.argv.includes("--prove-red");

const CTRL = await import("../src/lib/server/marketing/campaign-control.ts");
const LIVE = await import("../src/lib/server/marketing/campaign-live.ts");
const COPY = await import("../src/app/admin/campaigns/[id]/live-copy.ts");
const CS = await import("../src/lib/marketing/campaign-status.ts");
const SC = await import("../src/lib/server/marketing/start-check.ts");
const ENQ = await import("../src/lib/server/marketing/enqueue.ts");
const ENGINE = await import("../src/lib/server/marketing/engine.ts");
const AUD = await import("../src/lib/server/marketing/audience.ts");
const DRAFT = await import("../src/lib/server/marketing/campaign-draft.ts");
// U13 · every slice this suite drives is handed a FIXED window (ENGINE-SPEC §5 rule 9; `test:marketing-window` W6).
const WIN = await import("./lib/send-window.mts");
const { db } = await import("../src/lib/server/store.ts");
const { auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");
const { SMS_CONSENT_WORDINGS } = await import("../src/lib/marketing/consent-wording.ts");
const { AUDIENCE_REASON_LABEL } = await import("../src/app/admin/campaigns/new/audience-copy.ts");
const LIST_COPY = await import("../src/app/admin/campaigns/campaigns-copy.ts");
const { liveSendWindow } = await import("../src/lib/server/marketing/dispatch.ts");
const { marketingLiveGate } = await import("../src/lib/server/marketing/live-switch.ts");
const { smsProviderResolution } = await import("../src/lib/server/sms.ts");

type LiveViewer = import("../src/lib/server/marketing/campaign-live.ts").LiveViewer;
type LiveViewDeps = import("../src/lib/server/marketing/campaign-live.ts").LiveViewDeps;
type CampaignLiveView = import("../src/lib/server/marketing/campaign-live.ts").CampaignLiveView;
type ControlDeps = import("../src/lib/server/marketing/campaign-control.ts").ControlDeps;
type ControlActor = import("../src/lib/server/marketing/campaign-control.ts").ControlActor;
type StepFlights = import("../src/lib/server/marketing/campaign-control.ts").StepFlights;
type StartRefusal = import("../src/lib/server/marketing/start-check.ts").StartRefusal;
type ResumeRefusal = import("../src/lib/server/marketing/start-check.ts").ResumeRefusal;
type EngineDeps = import("../src/lib/server/marketing/engine.ts").EngineDeps;
type EngineProcessState = import("../src/lib/server/marketing/engine.ts").EngineProcessState;
type ReapResult = import("../src/lib/server/marketing/engine.ts").ReapResult;
type ContactAudienceFilter = import("../src/lib/server/marketing/audience.ts").ContactAudienceFilter;
type StoredSmsCampaign = import("../src/lib/server/store.ts").StoredSmsCampaign;
type StoredSmsCampaignRecipient = import("../src/lib/server/store.ts").StoredSmsCampaignRecipient;
type StoredSmsMessage = import("../src/lib/server/store.ts").StoredSmsMessage;
type StoredUser = import("../src/lib/server/store.ts").StoredUser;
type SmsCampaignStatus = import("../src/lib/server/store.ts").SmsCampaignStatus;
type SmsCampaignRecipientStatus = import("../src/lib/server/store.ts").SmsCampaignRecipientStatus;
type SmsOutbound = import("../src/lib/server/sms.ts").SmsOutbound;
type AuditEntry = import("../src/lib/server/audit.ts").AuditEntry;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CR = String.fromCharCode(13);
/** A line break built from its code — this file holds no backslash escape. */
const NL = String.fromCharCode(10);
const rawRead = (rel: string): string => readFileSync(join(ROOT, ...rel.split("/")), "utf8").split(CR).join("");
const code = (rel: string): string => decomment(rawRead(rel));
const relOf = (abs: string): string => abs.slice(ROOT.length + 1).split(sep).join("/");
const json = (v: unknown): string => JSON.stringify(v);

/* ══ THE LABELS — each once, so a red case names exactly the claims it must turn red ═════════════════════════════════ */

const L = {
  c0: "C0 · CONTROLS — the memory twin and the console rail; a fixture campaign walks DRAFT → CONFIRMED → PREPARING → RUNNING → PAUSED / DONE / CANCELLED through the ONE transition door; the ONE groupBy (countByOutcome) answers a seeded list as written here by hand — merged, none dropped, one order — and its sum per status is countByStatus's; a tag audience and a sub-minute window both read at the campaign's door, and only the tag can be written as an address",
  v2: "V2 · ⭐ HELD IS OUTSTANDING (the plan's RED) — a RUNNING campaign of 4 SENT and 6 HELD reads progress 4 of 10 and 'Sending — 4 of 10 done.', 6 waiting and 4 handed over — never 10 of 10; an empty RUNNING campaign paints NO bar (progress null, 'Sending.'), and a CONFIRMED one none either",
  v3: "V3 · ⭐ THE COUNTS FROZEN SERVER-SIDE (OD34, the plan's RED) — two views of an unchanged campaign ten seconds apart carry the same bar, KPIs, chips, reasons, headline and controls byte for byte (only readAt moved, by ten seconds); one more row settled moves the bar by exactly one",
  s1: "S1 · ONE GROUPBY (decision 8, OD26) — a view asks countByOutcome exactly ONCE and no other count; over a list holding every status the KPIs partition the rows (waiting = PENDING + HELD, handed over = SENT + DELIVERED, failed, not sent = SKIPPED, no answer = UNCONFIRMED — summing to On campaign) and the chips are each status with rows, in the schema's order, in RECIPIENT_STATUS_LABEL's words",
  s2: "S2 · U38b's FIVE WORDS — skipped rows across every gate reason read under 'Not sent' in AUDIENCE_REASON_LABEL's five words, PROTECTED ONE LINE (the six RG, age and account reasons together), no_basis beside no_consent, dominant first with ties in U38b's order, then 'Can't be sent to' and an unworded refusal only because there is one of each — adding up to 'Not sent', for a reader and a masked viewer alike above the floor — and no gate reason's key anywhere in the view",
  s3: "S3 · ⛔ E23 · THE FLOOR — a masked viewer on a campaign of 9 rows sees On campaign 9 and NOTHING split (every other KPI null, no reasons, no chips) and the floor's sentence; at 10 rows everything; a reader at 9 everything; and the floor counts ROWS — a campaign confirmed for 50 whose list holds 9 is floored",
  s4: "S4 · ⛔ OD24 · MONEY ONLY FOR A MONEY READER — a money reader's view carries the frozen estimate and limit and a Start dialog 'It can cost up to TZS 9,624 of the TZS 10,000 limit'; a GROWTH viewer's carries money null, a dialog 'It uses up to 1,604 SMS' and NO 'TZS' anywhere in the whole view",
  s5: "S5 · THE HEADLINES AND WHY IT STOPPED — every status in the spec's words (DRAFT, CONFIRMED, PREPARING 'N of M people written', RUNNING 'N of M done', PAUSED 'Paused.', DONE, CANCELLED 'Stopped by <name> at HH:MM EAT — N people were not messaged.' from the stop's own audit row and resumeOutstanding — a stop before Start leaves everyone confirmed unmessaged); an officer's pause names them and the time; an engine's pause says stopReasonLabel's words; the confirmation names its officer",
  s6: "S6 · THE CONTROLS — all five exist in every one of the seven statuses, each disabled with a reason and enabled exactly where §4.15 says (Start CONFIRMED · Pause PREPARING, RUNNING · Resume PAUSED · Stop any non-terminal · Make a copy any non-DRAFT); a view-only viewer has every one disabled with the role's reason; a closed switch disables Start 'Marketing SMS are switched off.' and drops its dialog; OD66 disables Start for a masked viewer on both populations; an audience no address can write disables Make a copy in its own words",
  s7: "S7 · THE STANDING FACTS — the switch through THE gate (the console stub open; a Blackball rail with the switch closed shut, with it open open until its closing time); the window is the view's window; lastStepAt the newest claim; nobody driving for a RUNNING campaign with no claim or one 91 s old, not at 89 s, never for a paused one; keep this page open only for an acting viewer of PREPARING or RUNNING",
  s9: "S9 · THE AUDIENCE IN WORDS, AS THE LIST SAYS IT — the list's ONE role-shaped describer (campaignRowAudience) and its words: a tag in describeAudience's phrase, the whole book 'Everyone in the contact book', a consent filter 'Consent: given' to a reader and hidden from a masked viewer, both populations hidden from a masked viewer, a stored filter that cannot be read said so — never a phone number",
  s8: "S8 · ⛔ THE COPY ADVICE — once anybody on a campaign was messaged, its copy-advising pause sentences (audience_unreadable, template_invalid) and the Stop dialog say a copy would message them again, as a FACT; with nobody messaged, the spec's own words; under the floor the SAME conditional words whether or not anybody was messaged; and a campaign that never ran reads the spec's words for every viewer",
  t1: "T1 · START through the REAL check (the console stub) — a confirmed tag audience moves CONFIRMED → PREPARING with startedAt; ONE ADMIN marketing.campaign_started row by the officer { count, estimateSegments, freshCount, shrunkBy }; the answer LIVE_DONE.start, recorded; no recipient row written (the enqueue is the step's) and no refusal row",
  t2: "T2 · ⭐ START'S REFUSALS WIRED — every U49a Start reason (the source's own case list, each answered by a stand-in check) is refused in EXACTLY startRefusalSentence(r, viewer) — TZS for a money reader, none for anyone else — the campaign still CONFIRMED, ONE start_refused row per refusal whose payload is the reason, plus the figures for the money reasons alone (the rail's problem for rail_dead) and never a count; and the REAL check refuses a RUNNING campaign not_confirmed",
  t3: "T3 · ⭐ OD66 AT START — a masked viewer on a book ∪ players campaign is refused audience_refused in START_AUDIENCE_REFUSED's words BEFORE anything is counted (the check never asked), ONE start_refused row { reason, param: pop }; a reader on the same campaign reaches the check, and so does a masked viewer on a book audience",
  t4: "T4 · PAUSE — PREPARING and RUNNING → PAUSED officer_paused with pausedAt, ONE ADMIN row of the engine's ONE spelling of marketing.campaign_paused { reason: officer_paused } by the officer, the answer LIVE_DONE.pause; CONFIRMED, DONE and a DRAFT refused in their words with no row; a second Pause 'already paused'",
  t5: "T5 · ⭐ RESUME'S RE-QUEUE (E8) — a paused campaign whose list finished, holding 3 HELD rows: they start over (PENDING, attempts 0, the hold's class cleared) BEFORE the one move to RUNNING (stopReason cleared), ONE ADMIN marketing.campaign_resumed row { requeuedHeld: 3, to: RUNNING }; a list that never finished resumes to PREPARING",
  t6: "T6 · ⭐ RESUME'S COUNT-BASED REFUSALS — U49a's refusal fed the store's COUNTS: a list longer than confirmed under an OFFICER's pause is refused list_over_confirmed (the switch closed and the console stub alike) with nothing re-queued, the campaign still PAUSED and no resumed row; with someone already messaged its words say a copy would message them again; ⛔ E23 · a masked viewer below the floor reads the SAME conditional words whether or not anybody was messaged; an engine's copy-only pause (audience_moved) is refused first, before the switch; a list within its count resumes",
  t7: "T7 · STOP (E25) — CONFIRMED, PREPARING, RUNNING and PAUSED each → CANCELLED officer_stopped with finishedAt, ONE ADMIN marketing.campaign_stopped row { outstanding } = what was left (resumeOutstanding), the answer LIVE_DONE.stop, and EVERY row untouched; DONE, CANCELLED and a DRAFT refused with no row",
  t8: "T8 · ⭐ MAKE A COPY — a NEW DRAFT by the officer through the composer's one save: the same message, the same audience (the same canonical key), the name '<name> (copy)', ONE marketing.campaign_created and ONE marketing.campaign_copied { from, to }, the composer's address; once anybody was messaged its answer says the copy messages them again; REFUSED in its own words with NOTHING made for an audience no address can write and for a masked viewer on both populations; a DRAFT refused",
  d1: "D1 · THE STEP DISPATCHER (§3.3) — PREPARING: the reaper, then ONE enqueue chunk; RUNNING: ONE slice; PAUSED, CANCELLED, DONE: the reaper alone (kind reaped); DRAFT and CONFIRMED: nothing (idle); each answer carries the view of that campaign, and a wait carries its own sentence",
  d2: "D2 · ⭐ SINGLE-FLIGHT PER CAMPAIGN (decision 1 as amended) — two steps of one PREPARING campaign at once never overlap: the second answers waiting busy and its enqueue never runs; two DIFFERENT campaigns step at once; the flight is released after a step and after a step that throws; a flight older than ten minutes no longer holds, a fresh one does; and production's flights live on globalThis",
  d3: "D3 · ACT-GATED — a view-only viewer's step is refused 'role' and runs nothing (no read, no enqueue, no slice, no reap); a campaign that is not there answers not_found",
  d4: "D4 · ⭐ END TO END on the memory twin — a confirmed tag audience of 6 (4 consenting players' book rows, 2 contacts with no consent): Start → a PREPARING step writes 6 rows and finishes RUNNING → a RUNNING step's slice hands 4 over on the STUB wire and refuses 2 (no consent) → the next step finishes DONE; each view says so (the bar 6 of 6, 'Not sent' 2 under 'No consent or recorded basis'); one wire call, no SmsMessage row for the campaign",
  d5: "D5 · THE REAPER ON MOUNT — a PAUSED campaign holding a claim stranded 11 minutes with no message: one step reaps it back to PENDING (attempts + 1, the claim cleared) — kind reaped 1 — and writes ONE SYSTEM marketing.campaign_reaped row",
  w1: "W1 · THE WIRING — CONTROL_DEPS and LIVE_VIEW_DEPS frozen and wired to the REAL doors by identity; the officer's pause writes the ONE spelling the engine and the enqueue write and the view reads; no directive and no exported *Action in the three files; nothing in src value-imports campaign-control (none until U47b-2), campaign-live only campaign-control, live-copy only the two; the services name no send; live-copy reaches the server for a type alone; test:/red:campaign-visuals resolve to this file",
  p2: "P2 · ⛔ THE STEP ANSWER CARRIES NO FIGURE AND NO CURSOR (the U47b-1 review's MAJOR) — every step answer of the run, for every role, holds only kind, reason, until and status: no count and no cursor, so a padded tag below the floor never reads one person's gate verdict off a step",
  p1: "P1 · ⛔ NO PHONE NUMBER AND NO REFUSAL OBJECT — no 255… key and no +255… number in any view, answer or audit payload of the run; every service answer holds only ok, reason, message, recorded (and a copy's id and href)",
} as const;
type Label = (typeof L)[keyof typeof L];

/* ══ THE HARNESS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

let pass = 0;
let fail = 0;
let quiet = false;
const failed: string[] = [];
const ok = (label: string, cond: boolean, detail = ""): void => {
  if (cond) pass++;
  else { fail++; failed.push(label); }
  if (!quiet) console.log(`${cond ? "PASS" : "FAIL"} ${label.slice(0, 160)}${detail ? ` — ${detail}` : ""}`);
};
/** One claim: its body answers [holds, detail]; a throw is a failure with its message, never a crash. ⛔ A detail never
 *  carries a phone number — counts, statuses and reasons only. */
async function claim(label: string, body: () => Promise<[boolean, string]>): Promise<void> {
  try {
    const [cond, detail] = await body();
    ok(label, cond, detail);
  } catch (err) {
    ok(label, false, `threw: ${String((err as Error)?.message ?? err).slice(0, 300)}`);
  }
}
async function silently(run: () => Promise<void>): Promise<void> {
  const log = console.log;
  const warn = console.warn;
  const was = quiet;
  console.log = () => {};
  console.warn = () => {};
  quiet = true;
  try {
    await run();
  } finally {
    console.log = log;
    console.warn = warn;
    quiet = was;
  }
}

/* ══ THE FIXTURE WORLD — on the memory twin, through the store's own doors ═══════════════════════════════════════════ */

type Mem = {
  smsCampaigns: Map<string, StoredSmsCampaign>;
  smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient>;
  smsMessages: Map<string, StoredSmsMessage>;
};
function mem(): Mem {
  const s = (globalThis as unknown as { __50PICK_STORE?: Mem }).__50PICK_STORE;
  if (!s || !s.smsCampaigns || !s.smsCampaignRecipients || !s.smsMessages) throw new Error("the memory store is not loaded — this suite runs on the memory twin only");
  return s;
}

/** 12:00 EAT on 7 October 2026 — every view's clock unless a claim moves it (deterministic, so a plant's red is too). */
const T_NOW = Date.UTC(2026, 9, 7, 9, 0, 0);
const iso = (ms: number): string => new Date(ms).toISOString();
const MIN = 60_000;
/** A bare gateway key on an NDC: `255`, the two NDC digits, seven more — made up, never a real person's. */
const keyOf = (ndc: string, n: number): string => `255${ndc}${String(n).padStart(7, "0")}`;
const PINNED_SW = SMS_CONSENT_WORDINGS.find((w) => w.site === "PROFILE" && w.locale === "SW")?.wording ?? "";
const SOURCE_LINE = "Kutoka orodha ya 50pick.";
const BODY_SW = "50pick: Habari {jina}, ofa ya leo.";
const BODY_EN = "50pick: Hi {jina}, today's offer.";
const OFFICER_NAME = "Amina";

let STAMP = 0;
type World = { run: number; officer: string; n: number; cid: (k: string) => string; tag: (k: string) => string };
/** A fresh world: its own run number in every id, and its own officer ("Amina", a GROWTH account). */
async function world(): Promise<World> {
  const run = ++STAMP;
  const officer = `usr_u47b1_off_${run}`;
  const at = iso(T_NOW - 86_400_000);
  await Promise.resolve(db.user.create({
    id: officer, phoneE164: `+${keyOf("68", 9_000_000 + run)}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "GROWTH", status: "ACTIVE", locale: "SW", displayName: OFFICER_NAME, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
  } as StoredUser));
  return { run, officer, n: 0, cid: (k) => `cmp_u47b1_r${run}_${k}`, tag: (k) => `u47b1-r${run}-${k}`.toLowerCase() };
}

type CShape = {
  /** The statuses after DRAFT, in order — each one conditional move through the ONE door. */
  path: SmsCampaignStatus[];
  count?: number;
  filter?: ContactAudienceFilter;
  /** The reason a PAUSED step writes (officer_paused unless said). */
  pausedFor?: string;
  name?: string;
  bodyEn?: string | null;
  estimateTzs?: number | null;
  budgetTzs?: number | null;
  estimateSegments?: number;
};
/** ⭐ A CAMPAIGN walked through the ONE transition door, exactly as U40a, Start, U42 and the engine leave one. */
async function campaign(w: World, key: string, s: CShape): Promise<StoredSmsCampaign> {
  const id = w.cid(key);
  const at = iso(T_NOW - 3_600_000);
  const filter = s.filter ?? { ...AUD.WHOLE_BOOK, tags: [w.tag(key)] };
  const bodyEn = s.bodyEn === undefined ? null : s.bodyEn;
  await Promise.resolve(db.smsCampaign.create({
    id, name: s.name ?? `Kampeni ${key}`, status: "DRAFT", bodySw: BODY_SW, bodyEn,
    codingSw: "GSM7", segmentsSw: 1, codingEn: bodyEn === null ? null : "GSM7", segmentsEn: bodyEn === null ? null : 1,
    nameFallbackSw: "Rafiki", nameFallbackEn: bodyEn === null ? null : "Friend", sourcePhrase: SOURCE_LINE, draftRevision: 0,
    confirmTier: null, audienceFilter: AUD.contactAudienceKey(filter), audienceCount: null, audienceWatermark: null,
    estimateSegments: null, estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null,
    createdBy: w.officer, confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null, createdAt: at, updatedAt: at,
  } as StoredSmsCampaign));
  let status: SmsCampaignStatus = "DRAFT";
  for (const to of s.path) {
    const t = iso(T_NOW - 30 * MIN);
    const n = s.count ?? 10;
    const patch: Record<string, unknown> =
      to === "CONFIRMED" ? {
        audienceCount: n, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: s.estimateSegments ?? n,
        estimateTzs: s.estimateTzs === undefined ? n * 6 : s.estimateTzs, budgetTzs: s.budgetTzs === undefined ? 10_000 : s.budgetTzs,
        confirmedBy: w.officer, confirmedAt: t,
      }
        : to === "PREPARING" ? (status === "PAUSED" ? { stopReason: null } : { startedAt: t })
          : to === "RUNNING" ? (status === "PAUSED" ? { stopReason: null } : { enqueuedAt: t, enqueueCursor: "done" })
            : to === "PAUSED" ? { pausedAt: t, stopReason: s.pausedFor ?? "officer_paused" }
              : to === "DONE" ? { finishedAt: t }
                : { finishedAt: t, stopReason: "officer_stopped" };
    const moved = await db.smsCampaign.transition(id, { from: [status], to, patch: patch as never, draftRevision: to === "CONFIRMED" ? 0 : null, at: t });
    if (moved === null) throw new Error(`fixture: ${key} did not move ${status} → ${to}`);
    status = to;
  }
  const row = await db.smsCampaign.find(id);
  if (row === null) throw new Error(`fixture: ${key} was not stored`);
  return row;
}

type RowShape = {
  status: SmsCampaignRecipientStatus; skipReason?: string; failureClass?: string; claimedAt?: string; claimToken?: string; attempts?: number;
};
/** Rows on a campaign through the ONE seed door, then set to the shapes asked (the store's own map — a fixture only). */
async function rows(w: World, campaignId: string, shapes: readonly RowShape[]): Promise<string[]> {
  const base = ++w.n * 1000;
  const at = iso(T_NOW - 20 * MIN);
  const seeds = shapes.map((_, i) => ({
    id: `rcp_u47b1_${w.run}_${base + i}`, campaignId, msisdn: keyOf("71", w.run * 100_000 + base + i), contactId: null, userId: null,
    optOutToken: null, createdAt: at,
  }));
  if (seeds.length > 0) {
    const r = await db.smsCampaignRecipient.createMany(seeds);
    if (r.inserted !== seeds.length) throw new Error(`fixture: ${seeds.length - r.inserted} row(s) on ${campaignId} were not inserted`);
  }
  shapes.forEach((s, i) => {
    const row = mem().smsCampaignRecipients.get(seeds[i].id);
    if (row === undefined) throw new Error("fixture: a seeded row is not in the store");
    Object.assign(row, {
      status: s.status, skipReason: s.skipReason ?? null, failureClass: s.failureClass ?? null, claimedAt: s.claimedAt ?? null,
      claimToken: s.claimToken ?? null, attempts: s.attempts ?? 0,
    });
  });
  return seeds.map((s) => s.id);
}
const many = (n: number, s: RowShape): RowShape[] => Array.from({ length: n }, () => ({ ...s }));
const rowsSnapshot = (campaignId: string): string =>
  json([...mem().smsCampaignRecipients.values()].filter((r) => r.campaignId === campaignId).sort((a, b) => (a.id < b.id ? -1 : 1)));

/** A book contact for a number, on one tag — linked to the account that holds it when `userId` is given. */
async function contact(id: string, key: string, tag: string, userId: string | null = null): Promise<void> {
  const at = iso(T_NOW - 86_400_000);
  const r = await Promise.resolve(db.marketingContact.create({
    id, msisdn: key, rawInput: key, displayName: null, email: null, ndc: key.slice(3, 5), operator: null, source: "IMPORT",
    sourceRef: null, userId, consentState: "UNKNOWN", suppressedAt: null, tags: [tag], notes: null, importId: null,
    createdAt: at, createdBy: null, updatedAt: at, updatedBy: null,
  } as never));
  if (r === null) throw new Error(`fixture: the book row ${id} collided`);
}
/** ⭐ A CONSENTING PLAYER, as the ONE gate clears one: an adult active account with the toggle on, an SMS-naming GIVEN ledger
 *  row for the number, and a wallet (`test:marketing-engine`'s own recipe). */
async function player(id: string, key: string): Promise<void> {
  const at = iso(T_NOW - 86_400_000);
  await Promise.resolve(db.user.create({
    id, phoneE164: `+${key}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: true, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
  } as StoredUser));
  await Promise.resolve(db.messagingConsent.create({
    id: `lc_${id}`, channel: "SMS", identifier: key, category: "MARKETING", status: "GIVEN", source: "PROFILE",
    wording: PINNED_SW, locale: "SW", evidence: "fixture", recordedBy: null, createdAt: "2024-06-01T00:00:00.000Z",
  }));
  await Promise.resolve(db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: at, updatedAt: at,
  } as never));
}

/** Every audit row of one action against one target. */
async function auditOf(action: string, targetId: string): Promise<AuditEntry[]> {
  await auditFlush();
  return getAuditPage({ limit: 10_000 }).filter((e) => e.action === action && e.targetId === targetId);
}

/* ── the viewers ── */
const READER: LiveViewer = { userId: "usr_u47b1_reader", mayAct: true, reads: true, money: true };
/** A GROWTH officer: may act, may not read a number, may not read money. */
const GROWTH: LiveViewer = { userId: "usr_u47b1_growth", mayAct: true, reads: false, money: false };
const WATCHER: LiveViewer = { userId: "usr_u47b1_watcher", mayAct: false, reads: true, money: false };
const actorOf = (w: World, o: { reads: boolean; money: boolean }): ControlActor => ({ userId: w.officer, reads: o.reads, money: o.money });

/* ── the engine on a stub wire ── */
type Wire = { calls: number; sent: SmsOutbound[]; send: EngineDeps["send"] };
/** A STUB WIRE that answers like `sendBatch` — accepted, keyed by target (in REVERSE order, so nothing settled by place can
 *  pass) — and writes nothing. ⛔ No SMS can leave from here. */
function stubWire(): Wire {
  const w: Wire = { calls: 0, sent: [], send: async () => ({ results: [], balanceTzs: null }) };
  w.send = async (messages) => {
    w.calls++;
    w.sent.push(...messages);
    return {
      results: messages.map((m) => ({ to: m.to, targetType: m.targetType ?? null, targetId: m.targetId ?? null, reference: `ref_u47b1_${m.targetId ?? "none"}`, ok: true })).reverse(),
      balanceTzs: 100,
    };
  };
  return w;
}
/** The engine's dependencies with every shop-wide read FIXED (the window open, money idle, no OTP failure, the console
 *  provider, the rail alive), the wire a stub, and a process state of its own. */
function engineDeps(wire: Wire): EngineDeps {
  const state: EngineProcessState = { flight: null, ticket: 0, sliceSize: ENGINE.SLICE_START, gateMsAvg: null, unanswered: {} };
  return {
    ...ENGINE.ENGINE_DEPS,
    window: WIN.ALWAYS_OPEN,
    moneyBusy: () => ({ busy: false, stale: [] }),
    otpLastFailureAt: () => null,
    provider: () => "console",
    liveSwitch: async () => ({ state: "closed", why: "absent" }),
    rail: () => null,
    send: wire.send,
    state: () => state,
  };
}
const freshFlights = (): StepFlights => ({ flights: new Map(), ticket: 0 });
const ZERO_REAP: ReapResult = { reaped: 0, toPending: 0, toSent: 0, toUnconfirmed: 0, toFailed: 0, toDelivered: 0 };

/* ══ THE IMPLEMENTATION UNDER TEST — swapped piece by piece by the plants ═══════════════════════════════════════════ */

type Sources = {
  control: string; live: string; copy: string; pkg: string;
  /** Every src file that names campaign-control, campaign-live or live-copy at all, decommented — W1's importer scan. */
  src: ReadonlyMap<string, string>;
};
function walkDir(abs: string): string[] {
  return readdirSync(abs, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkDir(join(abs, e.name)) : /[.]tsx?$/.test(e.name) ? [join(abs, e.name)] : []);
}
const NAMING = new Map<string, string>();
for (const abs of walkDir(join(ROOT, "src"))) {
  const raw = readFileSync(abs, "utf8");
  if (/campaign-control|campaign-live|live-copy/.test(raw)) NAMING.set(relOf(abs), decomment(raw.split(CR).join("")));
}
const CONTROL_REL = "src/lib/server/marketing/campaign-control.ts";
const LIVE_REL = "src/lib/server/marketing/campaign-live.ts";
const COPY_REL = "src/app/admin/campaigns/[id]/live-copy.ts";
const REAL_SOURCES: Sources = { control: code(CONTROL_REL), live: code(LIVE_REL), copy: code(COPY_REL), pkg: rawRead("package.json"), src: NAMING };

type Impl = {
  view: typeof LIVE.campaignLiveView;
  /** A plant's last word on the view's dependencies a claim assembled (identity when nothing is planted). */
  viewDeps: (d: LiveViewDeps) => LiveViewDeps;
  /** A plant's last word on the services' dependencies a claim assembled. */
  ctrlDeps: (d: ControlDeps) => ControlDeps;
  start: typeof CTRL.startCampaign;
  pause: typeof CTRL.pauseCampaign;
  resume: typeof CTRL.resumeCampaign;
  stop: typeof CTRL.stopCampaign;
  copy: typeof CTRL.copyCampaign;
  step: typeof CTRL.campaignStep;
  sources: Sources;
};
const REAL: Impl = {
  view: LIVE.campaignLiveView,
  viewDeps: (d) => d,
  ctrlDeps: (d) => d,
  start: CTRL.startCampaign,
  pause: CTRL.pauseCampaign,
  resume: CTRL.resumeCampaign,
  stop: CTRL.stopCampaign,
  copy: CTRL.copyCampaign,
  step: CTRL.campaignStep,
  sources: REAL_SOURCES,
};

/** Everything a run saw — views and answers — for P1's sweep. */
const SEEN: string[] = [];
const ANSWERS: Array<Record<string, unknown>> = [];

/** The view's dependencies for a claim: production's, the window FIXED open and the clock FIXED, then the plant's word. */
function viewDeps(impl: Impl, over: Partial<LiveViewDeps> = {}): LiveViewDeps {
  return impl.viewDeps({ ...LIVE.LIVE_VIEW_DEPS, window: WIN.ALWAYS_OPEN, now: () => new Date(T_NOW), ...over });
}
async function viewOf(impl: Impl, id: string, v: LiveViewer, over: Partial<LiveViewDeps> = {}): Promise<CampaignLiveView> {
  const view = await impl.view(id, v, viewDeps(impl, over));
  if (view === null) throw new Error("the view answered null for a stored campaign");
  SEEN.push(json(view));
  return view;
}
/** The services' dependencies for a claim: production's, the view through the claim's own view deps, a flight state of the
 *  claim's own, then the plant's word. */
function ctrlDeps(impl: Impl, over: Partial<ControlDeps> = {}): ControlDeps {
  return impl.ctrlDeps({
    ...CTRL.CONTROL_DEPS,
    view: (id: string, v: LiveViewer) => impl.view(id, v, viewDeps(impl)),
    flights: (() => { const f = freshFlights(); return () => f; })(),
    ...over,
  });
}
/** Keeps an answer for P1, and hands it back. */
function seen<T>(answer: T): T {
  SEEN.push(json(answer));
  if (answer !== null && typeof answer === "object") ANSWERS.push(answer as Record<string, unknown>);
  return answer;
}
const campaignOf = async (id: string): Promise<StoredSmsCampaign> => {
  const c = await db.smsCampaign.find(id);
  if (c === null) throw new Error("a fixture campaign is gone");
  return c;
};

/* ══ THE ASSERTIONS ══════════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl): Promise<void> {
  SEEN.length = 0;
  ANSWERS.length = 0;
  const w = await world();
  const reader = actorOf(w, { reads: true, money: true });
  const growth = actorOf(w, { reads: false, money: false });

  /* ── C0 · controls ── */
  await claim(L.c0, async () => {
    const rail = smsProviderResolution() === "console";
    const paths: SmsCampaignStatus[][] = [
      [], ["CONFIRMED"], ["CONFIRMED", "PREPARING"], ["CONFIRMED", "PREPARING", "RUNNING"],
      ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], ["CONFIRMED", "CANCELLED"],
    ];
    const walked: string[] = [];
    for (let i = 0; i < paths.length; i++) walked.push((await campaign(w, `c0w${i}`, { path: paths[i] })).status);
    const c = await campaign(w, "c0g", { path: ["CONFIRMED", "PREPARING", "RUNNING"] });
    await rows(w, c.id, [
      { status: "SENT" }, { status: "SKIPPED", skipReason: "suppressed" }, { status: "PENDING" }, { status: "SENT" },
      { status: "HELD", failureClass: "gate_unanswered" }, { status: "SKIPPED", skipReason: "rg_self_excluded" },
    ]);
    const groups = await db.smsCampaignRecipient.countByOutcome(c.id);
    const oracle = [
      { status: "PENDING", skipReason: null, failureClass: null, count: 1 },
      { status: "HELD", skipReason: null, failureClass: "gate_unanswered", count: 1 },
      { status: "SENT", skipReason: null, failureClass: null, count: 2 },
      { status: "SKIPPED", skipReason: "rg_self_excluded", failureClass: null, count: 1 },
      { status: "SKIPPED", skipReason: "suppressed", failureClass: null, count: 1 },
    ];
    const byStatus = await db.smsCampaignRecipient.countByStatus(c.id);
    const sums = json(byStatus.map((s) => ({ status: s.status, count: s.count }))) === json(Object.entries(CS.outcomeStatusCounts(groups)).map(([status, count]) => ({ status, count })));
    const tagRead = LIVE.copyTravel({ audienceFilter: AUD.contactAudienceKey({ ...AUD.WHOLE_BOOK, tags: [w.tag("c0t")] }) }, true).ok;
    const odd = AUD.contactAudienceKey({ ...AUD.WHOLE_BOOK, addedFrom: "2026-10-01T10:00:30.000Z" });
    const oddReads = (await import("../src/lib/server/marketing/audience-fence.ts")).readCampaignAudience(odd).ok;
    const oddTravels = LIVE.copyTravel({ audienceFilter: odd }, true).ok;
    const want = ["DRAFT", "CONFIRMED", "PREPARING", "RUNNING", "PAUSED", "DONE", "CANCELLED"];
    return [rail && json(walked) === json(want) && json(groups) === json(oracle) && sums && tagRead && oddReads && !oddTravels,
      `rail ${rail} · walked ${json(walked)} · groups ${json(groups)} · sums ${sums} · tag travels ${tagRead} · odd reads ${oddReads} travels ${oddTravels}`];
  });

  /* ── V2 · ⭐ HELD is outstanding ── */
  await claim(L.v2, async () => {
    const c = await campaign(w, "v2", { path: ["CONFIRMED", "PREPARING", "RUNNING"] });
    await rows(w, c.id, [...many(4, { status: "SENT" }), ...many(6, { status: "HELD", failureClass: "gate_unanswered", attempts: 3 })]);
    const v = await viewOf(impl, c.id, READER);
    const empty = await campaign(w, "v2e", { path: ["CONFIRMED", "PREPARING", "RUNNING"] });
    const e = await viewOf(impl, empty.id, READER);
    const conf = await viewOf(impl, (await campaign(w, "v2c", { path: ["CONFIRMED"] })).id, READER);
    const held = json(v.progress) === json({ phase: "sending", value: 4, max: 10 }) && v.headline === "Sending — 4 of 10 done."
      && v.kpis.waiting === 6 && v.kpis.handedOver === 4;
    const bare = e.progress === null && e.headline === "Sending." && conf.progress === null;
    return [held && bare, `progress ${json(v.progress)} · "${v.headline}" · waiting ${v.kpis.waiting} · empty ${json(e.progress)} "${e.headline}" · confirmed ${json(conf.progress)}`];
  });

  /* ── V3 · ⭐ the counts frozen server-side ── */
  await claim(L.v3, async () => {
    const c = await campaign(w, "v3", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 12 });
    const ids = await rows(w, c.id, [...many(5, { status: "SENT" }), ...many(2, { status: "SKIPPED", skipReason: "suppressed" }), ...many(5, { status: "PENDING" })]);
    const a = await viewOf(impl, c.id, READER, { now: () => new Date(T_NOW) });
    const b = await viewOf(impl, c.id, READER, { now: () => new Date(T_NOW + 10_000) });
    const part = (v: CampaignLiveView) => json([v.progress, v.kpis, v.chips, v.notSentReasons, v.headline, v.stopSentence, v.controls, v.audienceLines, v.confirmed, v.money, v.startDialog, v.stopDialog, v.floor]);
    const same = part(a) === part(b);
    const moved = Date.parse(b.readAt) - Date.parse(a.readAt) === 10_000;
    const row = mem().smsCampaignRecipients.get(ids[ids.length - 1]);
    if (row !== undefined) row.status = "SENT";
    const after = await viewOf(impl, c.id, READER, { now: () => new Date(T_NOW + 20_000) });
    const one = a.progress !== null && after.progress !== null && after.progress.value === a.progress.value + 1 && after.progress.max === a.progress.max;
    return [same && moved && one, `same ${same} · readAt +${Date.parse(b.readAt) - Date.parse(a.readAt)} ms · bar ${json(a.progress)} → ${json(after.progress)}`];
  });

  /* ── S1 · one groupBy ── */
  await claim(L.s1, async () => {
    const c = await campaign(w, "s1", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 12 });
    await rows(w, c.id, [
      ...many(2, { status: "PENDING" }), { status: "HELD", failureClass: "gate_unanswered", attempts: 3 }, ...many(3, { status: "SENT" }),
      ...many(2, { status: "DELIVERED" }), { status: "FAILED", failureClass: "BAD_MSISDN" },
      { status: "SKIPPED", skipReason: "suppressed" }, { status: "SKIPPED", skipReason: "no_consent" }, { status: "UNCONFIRMED" },
    ]);
    let asked = 0;
    let lastAsked = 0;
    const base = viewDeps(impl);
    const v = await viewOf(impl, c.id, READER, {
      recipients: {
        countByOutcome: async (id: string) => { asked++; return base.recipients.countByOutcome(id); },
        lastActivity: async (id: string) => { lastAsked++; return base.recipients.lastActivity(id); },
      },
    });
    const k = v.kpis;
    const sum = (k.handedOver ?? -99) + (k.failed ?? -99) + (k.notSent ?? -99) + (k.noAnswer ?? -99) + (k.waiting ?? -99);
    const kpis = k.onCampaign === 12 && k.waiting === 3 && k.handedOver === 5 && k.failed === 1 && k.notSent === 2 && k.noAnswer === 1 && sum === 12;
    const order = Object.keys(COPY.RECIPIENT_STATUS_LABEL) as SmsCampaignRecipientStatus[];
    const want = [["PENDING", 2], ["HELD", 1], ["SENT", 3], ["DELIVERED", 2], ["FAILED", 1], ["SKIPPED", 2], ["UNCONFIRMED", 1]]
      .map(([s, n]) => ({ status: s, label: COPY.RECIPIENT_STATUS_LABEL[s as SmsCampaignRecipientStatus], count: n }));
    const chips = json(v.chips) === json(want) && order.length === 7;
    return [asked === 1 && lastAsked === 1 && kpis && chips, `groupBy asked ${asked}× · KPIs ${json(k)} (sum ${sum}) · chips ${json(v.chips?.map((x) => `${x.status}:${x.count}`))}`];
  });

  /* ── S2 · the five words ── */
  await claim(L.s2, async () => {
    const c = await campaign(w, "s2", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 20 });
    const skip = (r: string, n = 1): RowShape[] => many(n, { status: "SKIPPED", skipReason: r });
    await rows(w, c.id, [
      ...skip("suppressed", 3), ...skip("no_consent"), ...skip("no_basis", 2), ...skip("consent_withdrawn"),
      ...skip("rg_self_excluded"), ...skip("rg_cooling_off"), ...skip("rg_harm_marker"), ...skip("rg_under25_history"),
      ...skip("age_minor"), ...skip("account_status"), ...skip("bad_msisdn"), ...skip("mystery_reason"), ...many(3, { status: "SENT" }),
    ]);
    const want = [
      { label: AUDIENCE_REASON_LABEL.protected, count: 6 }, { label: AUDIENCE_REASON_LABEL.suppressed, count: 3 },
      { label: AUDIENCE_REASON_LABEL.no_consent, count: 3 }, { label: AUDIENCE_REASON_LABEL.withdrawn, count: 1 },
      { label: COPY.NOT_SENT_EXTRA.unsendable, count: 1 }, { label: COPY.NOT_SENT_EXTRA.other, count: 1 },
      { label: AUDIENCE_REASON_LABEL.age_unknown, count: 0 },
    ];
    const r = await viewOf(impl, c.id, READER);
    const m = await viewOf(impl, c.id, GROWTH);
    const total = (r.notSentReasons ?? []).reduce((n, x) => n + x.count, 0);
    const RAW = new RegExp("rg_|age_minor|account_status|self_excluded|cooling|harm_marker|under25|mystery_reason|no_basis|bad_msisdn");
    const lines = json(r.notSentReasons) === json(want) && json(m.notSentReasons) === json(want) && total === r.kpis.notSent && total === 15;
    const raw = RAW.test(json(r)) || RAW.test(json(m));
    // without an unsendable or an unworded refusal, neither line is there
    const plain = await campaign(w, "s2p", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 12 });
    await rows(w, plain.id, [...skip("suppressed", 2), ...many(10, { status: "SENT" })]);
    const p = await viewOf(impl, plain.id, READER);
    const five = (p.notSentReasons ?? []).length === 5 && p.notSentReasons?.[0]?.label === AUDIENCE_REASON_LABEL.suppressed;
    return [lines && !raw && five, `reader ${json(r.notSentReasons)} · masked same ${json(m.notSentReasons) === json(r.notSentReasons)} · sum ${total} of ${r.kpis.notSent} · a raw reason in the view ${raw} · plain ${json(p.notSentReasons?.map((x) => x.count))}`];
  });

  /* ── S3 · ⛔ the floor ── */
  await claim(L.s3, async () => {
    const nine = await campaign(w, "s3a", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 9 });
    await rows(w, nine.id, [...many(5, { status: "SENT" }), ...many(4, { status: "SKIPPED", skipReason: "rg_self_excluded" })]);
    const ten = await campaign(w, "s3b", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 10 });
    await rows(w, ten.id, [...many(6, { status: "SENT" }), ...many(4, { status: "SKIPPED", skipReason: "rg_self_excluded" })]);
    const shrunk = await campaign(w, "s3c", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 50 });
    await rows(w, shrunk.id, [...many(5, { status: "SENT" }), ...many(4, { status: "SKIPPED", skipReason: "suppressed" })]);
    const m9 = await viewOf(impl, nine.id, GROWTH);
    const m10 = await viewOf(impl, ten.id, GROWTH);
    const r9 = await viewOf(impl, nine.id, READER);
    const ms = await viewOf(impl, shrunk.id, GROWTH);
    // ⭐ the U47b-1 review · NO list yet, nothing to hide: a CONFIRMED campaign of 1,604, and one stopped before Start
    const confirmed = await campaign(w, "s3d", { path: ["CONFIRMED"], count: 1604 });
    const stoppedEarly = await campaign(w, "s3e", { path: ["CONFIRMED", "CANCELLED"], count: 1604 });
    const mc = await viewOf(impl, confirmed.id, GROWTH);
    const mx = await viewOf(impl, stoppedEarly.id, GROWTH);
    const hiddenAll = (v: CampaignLiveView, n: number) => json(v.kpis) === json({ onCampaign: n, handedOver: null, failed: null, notSent: null, noAnswer: null, waiting: null })
      && v.notSentReasons === null && v.chips === null && v.floor === COPY.LIVE_FLOOR;
    const shownAll = (v: CampaignLiveView) => v.kpis.handedOver !== null && v.notSentReasons !== null && v.chips !== null && v.floor === null;
    const noFloorAtZero = mc.floor === null && mx.floor === null && !json(mc).includes("Fewer than") && !json(mx).includes("Fewer than");
    const aboutTheList = COPY.LIVE_FLOOR.includes("on this campaign's list");
    return [hiddenAll(m9, 9) && shownAll(m10) && shownAll(r9) && hiddenAll(ms, 9) && noFloorAtZero && aboutTheList,
      `masked 9 ${json(m9.kpis)} · masked 10 shown ${shownAll(m10)} · reader 9 shown ${shownAll(r9)} · confirmed 50 with 9 rows ${json(ms.kpis)} · no list yet: confirmed ${mc.floor === null ? "no floor" : "FLOOR"}, stopped early ${mx.floor === null ? "no floor" : "FLOOR"} · worded about the list ${aboutTheList}`];
  });

  /* ── S4 · ⛔ money only for a money reader ── */
  await claim(L.s4, async () => {
    const c = await campaign(w, "s4", { path: ["CONFIRMED"], count: 1604, estimateTzs: 9624, budgetTzs: 10_000 });
    const r = await viewOf(impl, c.id, READER);
    const g = await viewOf(impl, c.id, GROWTH);
    const rich = json(r.money) === json({ estimateTzs: 9624, budgetTzs: 10_000 }) && r.startDialog !== null
      && r.startDialog.title === "Start sending to up to 1,604 people?" && r.startDialog.body.includes("It can cost up to TZS 9,624 of the TZS 10,000 limit.");
    const poor = g.money === null && g.startDialog !== null && g.startDialog.body.includes("It uses up to 1,604 SMS.") && !json(g).includes("TZS");
    return [rich && poor, `reader money ${json(r.money)} · dialog "${r.startDialog?.body.slice(0, 60)}…" · GROWTH money ${json(g.money)} · TZS in the GROWTH view ${json(g).includes("TZS")}`];
  });

  /* ── S5 · the headlines and why it stopped ── */
  await claim(L.s5, async () => {
    const d = await ctrlDeps(impl);
    const draft = await viewOf(impl, (await campaign(w, "s5d", { path: [] })).id, READER);
    const conf = await viewOf(impl, (await campaign(w, "s5c", { path: ["CONFIRMED"], count: 12 })).id, READER);
    const prep = await campaign(w, "s5p", { path: ["CONFIRMED", "PREPARING"], count: 12 });
    await rows(w, prep.id, many(5, { status: "PENDING" }));
    const pv = await viewOf(impl, prep.id, READER);
    const run = await campaign(w, "s5r", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 12 });
    await rows(w, run.id, [...many(7, { status: "SENT" }), ...many(5, { status: "PENDING" })]);
    const rv = await viewOf(impl, run.id, READER);
    // an officer's pause, through the service — the view names who and when from its audit row
    const toPause = await campaign(w, "s5o", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 12 });
    seen(await impl.pause(toPause.id, reader, d));
    const paused = await campaignOf(toPause.id);
    const ov = await viewOf(impl, toPause.id, READER);
    const engine = await viewOf(impl, (await campaign(w, "s5e", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], pausedFor: "gateway_refused" })).id, READER);
    const done = await viewOf(impl, (await campaign(w, "s5n", { path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"] })).id, READER);
    // an officer's stop, through the service, of a running list: 8 left
    const toStop = await campaign(w, "s5s", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 12 });
    await rows(w, toStop.id, [...many(4, { status: "SENT" }), ...many(8, { status: "PENDING" })]);
    seen(await impl.stop(toStop.id, reader, d));
    const stopped = await campaignOf(toStop.id);
    const sv = await viewOf(impl, toStop.id, READER);
    // a stop before Start: everyone confirmed is left unmessaged
    const early = await campaign(w, "s5x", { path: ["CONFIRMED"], count: 12 });
    seen(await impl.stop(early.id, reader, d));
    const ev = await viewOf(impl, early.id, READER);
    const at = (c: StoredSmsCampaign, k: "pausedAt" | "finishedAt") => COPY.eatClock(c[k]);
    const checks = {
      draft: draft.headline === COPY.LIVE_HEADLINE.DRAFT && draft.confirmed === null && draft.stopSentence === null,
      confirmed: conf.headline === "Ready to start — nothing has been sent." && conf.confirmed?.count === 12 && conf.confirmed?.byName === OFFICER_NAME,
      preparing: pv.headline === "Preparing the list — 5 of 12 people written." && pv.stopSentence === null,
      running: rv.headline === "Sending — 7 of 12 done." && rv.stopSentence === null,
      officerPause: ov.headline === "Paused." && ov.stopSentence === `Paused by ${OFFICER_NAME} at ${at(paused, "pausedAt")} EAT.`,
      enginePause: engine.headline === "Paused." && engine.stopSentence === CS.stopReasonLabel("gateway_refused"),
      done: done.headline === "Finished — everyone on this campaign has an answer.",
      stopped: sv.headline === `Stopped by ${OFFICER_NAME} at ${at(stopped, "finishedAt")} EAT — 8 people were not messaged.`
        && sv.stopSentence === `Stopped by ${OFFICER_NAME} at ${at(stopped, "finishedAt")} EAT.`,
      early: ev.headline.endsWith("— 12 people were not messaged."),
    };
    return [Object.values(checks).every(Boolean), `${json(checks)} · "${ov.stopSentence}" · "${sv.headline}"`];
  });

  /* ── S6 · the controls ── */
  await claim(L.s6, async () => {
    const order: SmsCampaignStatus[] = ["DRAFT", "CONFIRMED", "PREPARING", "RUNNING", "PAUSED", "DONE", "CANCELLED"];
    const paths: Record<SmsCampaignStatus, SmsCampaignStatus[]> = {
      DRAFT: [], CONFIRMED: ["CONFIRMED"], PREPARING: ["CONFIRMED", "PREPARING"], RUNNING: ["CONFIRMED", "PREPARING", "RUNNING"],
      PAUSED: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], DONE: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], CANCELLED: ["CONFIRMED", "CANCELLED"],
    };
    const on: Record<SmsCampaignStatus, string> = {
      DRAFT: "", CONFIRMED: "start,stop,copy", PREPARING: "pause,stop,copy", RUNNING: "pause,stop,copy", PAUSED: "resume,stop,copy",
      DONE: "copy", CANCELLED: "copy",
    };
    const wrong: string[] = [];
    const NAMES = ["start", "pause", "resume", "stop", "copy"] as const;
    const shaped = (v: CampaignLiveView) => NAMES.every((k) => {
      const s = v.controls[k];
      return s !== undefined && typeof s.enabled === "boolean" && (s.enabled ? s.reason === null : typeof s.reason === "string" && s.reason.length > 0);
    });
    for (const s of order) {
      const v = await viewOf(impl, (await campaign(w, `s6${s.toLowerCase()}`, { path: paths[s] })).id, READER);
      const enabled = NAMES.filter((k) => v.controls[k].enabled).join(",");
      if (!shaped(v) || enabled !== on[s]) wrong.push(`${s}: [${enabled}]`);
      if (s === "DRAFT" && !NAMES.every((k) => v.controls[k].reason === COPY.LIVE_DISABLED.draft)) wrong.push("DRAFT reasons");
      if (s === "DONE" && v.controls.stop.reason !== COPY.LIVE_DISABLED.stop) wrong.push("DONE stop reason");
      if (s === "RUNNING" && (v.controls.start.reason !== COPY.LIVE_DISABLED.start || v.controls.resume.reason !== COPY.LIVE_DISABLED.resume)) wrong.push("RUNNING reasons");
      if (s === "CONFIRMED" && v.controls.pause.reason !== COPY.LIVE_DISABLED.pause) wrong.push("CONFIRMED pause reason");
    }
    const conf = await campaign(w, "s6v", { path: ["CONFIRMED"] });
    const watch = await viewOf(impl, conf.id, WATCHER);
    const roleOff = NAMES.every((k) => !watch.controls[k].enabled && watch.controls[k].reason === COPY.LIVE_DISABLED.role) && watch.startDialog === null;
    const shut = await viewOf(impl, conf.id, READER, { provider: () => "blackball", liveSwitch: async () => ({ state: "closed", why: "absent" }) });
    const switchOff = !shut.controls.start.enabled && shut.controls.start.reason === COPY.LIVE_DISABLED.startSwitchOff && shut.startDialog === null;
    const both = await campaign(w, "s6b", { path: ["CONFIRMED"], filter: { ...AUD.WHOLE_BOOK, population: "both" } });
    const od66 = await viewOf(impl, both.id, GROWTH);
    const bothReader = await viewOf(impl, both.id, READER);
    const refused = !od66.controls.start.enabled && od66.controls.start.reason === COPY.START_AUDIENCE_REFUSED && bothReader.controls.start.enabled;
    const odd = await campaign(w, "s6o", { path: ["CONFIRMED"], filter: { ...AUD.WHOLE_BOOK, addedFrom: "2026-10-01T10:00:30.000Z" } });
    const ov = await viewOf(impl, odd.id, READER);
    const copyOff = !ov.controls.copy.enabled && ov.controls.copy.reason === COPY.copyCantTravelSentence("none");
    return [wrong.length === 0 && roleOff && switchOff && refused && copyOff,
      `wrong [${wrong.join("; ")}] · role ${roleOff} · switch ${switchOff} · OD66 ${refused} · copy ${copyOff}`];
  });

  /* ── S7 · the standing facts ── */
  await claim(L.s7, async () => {
    const c = await campaign(w, "s7", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 12 });
    const stub = await viewOf(impl, c.id, READER);
    const shut = await viewOf(impl, c.id, READER, { provider: () => "blackball", liveSwitch: async () => ({ state: "closed", why: "absent" }) });
    const closesAt = iso(T_NOW + 60 * MIN);
    const open = await viewOf(impl, c.id, READER, {
      provider: () => "blackball", liveSwitch: async () => ({ state: "open", enabledBy: "usr_owner", enabledAt: iso(T_NOW - 10 * MIN), closesAt }),
    });
    const switchFacts = stub.standing.switchOpen && stub.standing.switchClosesAt === null && !shut.standing.switchOpen
      && open.standing.switchOpen && open.standing.switchClosesAt === closesAt;
    const windowFact = json(stub.standing.window) === json(WIN.ALWAYS_OPEN());
    const noClaim = stub.standing.nobodyDriving && stub.standing.lastStepAt === null;
    const ids = await rows(w, c.id, [{ status: "SENT", claimedAt: iso(T_NOW - 3 * MIN) }, { status: "PENDING" }]);
    const newest = mem().smsCampaignRecipients.get(ids[0]);
    if (newest !== undefined) newest.claimedAt = iso(T_NOW - 91_000);
    const old = await viewOf(impl, c.id, READER);
    if (newest !== undefined) newest.claimedAt = iso(T_NOW - 89_000);
    const fresh = await viewOf(impl, c.id, READER);
    const driving = old.standing.nobodyDriving && old.standing.lastStepAt === iso(T_NOW - 91_000) && !fresh.standing.nobodyDriving;
    const p = await campaign(w, "s7p", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"] });
    const pv = await viewOf(impl, p.id, READER);
    const watch = await viewOf(impl, c.id, WATCHER);
    const keep = stub.standing.keepOpen && !watch.standing.keepOpen && !pv.standing.keepOpen && !pv.standing.nobodyDriving;
    return [switchFacts && windowFact && noClaim && driving && keep,
      `switch ${switchFacts} · window ${windowFact} · no claim ${noClaim} · 91 s ${old.standing.nobodyDriving} / 89 s ${fresh.standing.nobodyDriving} · keep open ${keep}`];
  });

  /* ── S8 · ⛔ the copy advice ── */
  await claim(L.s8, async () => {
    const reached = await campaign(w, "s8r", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], pausedFor: "audience_unreadable", count: 12 });
    await rows(w, reached.id, [...many(3, { status: "SENT" }), ...many(9, { status: "PENDING" })]);
    const nobody = await campaign(w, "s8n", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], pausedFor: "audience_unreadable", count: 12 });
    await rows(w, nobody.id, [...many(3, { status: "SKIPPED", skipReason: "suppressed" }), ...many(9, { status: "PENDING" })]);
    const tmpl = await campaign(w, "s8t", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], pausedFor: "template_invalid", count: 12 });
    await rows(w, tmpl.id, [...many(2, { status: "UNCONFIRMED" }), ...many(10, { status: "PENDING" })]);
    const smallA = await campaign(w, "s8a", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], pausedFor: "audience_unreadable", count: 5 });
    await rows(w, smallA.id, [...many(2, { status: "SENT" }), ...many(3, { status: "PENDING" })]);
    const smallB = await campaign(w, "s8b", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], pausedFor: "audience_unreadable", count: 5 });
    await rows(w, smallB.id, many(5, { status: "PENDING" }));
    const never = await campaign(w, "s8v", { path: ["CONFIRMED", "PREPARING", "PAUSED"], pausedFor: "audience_unreadable", count: 5 });
    const rv = await viewOf(impl, reached.id, READER);
    const nv = await viewOf(impl, nobody.id, READER);
    const tv = await viewOf(impl, tmpl.id, READER);
    const av = await viewOf(impl, smallA.id, GROWTH);
    const bv = await viewOf(impl, smallB.id, GROWTH);
    const neverReader = await viewOf(impl, never.id, READER);
    const neverMasked = await viewOf(impl, never.id, GROWTH);
    const AGAIN = "would message them again";
    const facts = rv.stopSentence === COPY.pausedReasonSentence("audience_unreadable", "reached") && (rv.stopSentence ?? "").includes(AGAIN)
      && rv.stopDialog.body.includes("including the people this campaign already messaged")
      && tv.stopSentence === COPY.pausedReasonSentence("template_invalid", "reached") && (tv.stopSentence ?? "").includes("would message them again");
    const base = nv.stopSentence === CS.stopReasonLabel("audience_unreadable") && nv.stopDialog.body === COPY.stopDialog("none").body;
    const hidden = av.stopSentence === bv.stopSentence && json(av.stopDialog) === json(bv.stopDialog)
      && (av.stopSentence ?? "").includes("If anyone on it was already messaged") && av.stopDialog.body.includes("if anyone on it was already messaged");
    const neverRan = neverReader.stopSentence === CS.stopReasonLabel("audience_unreadable") && neverMasked.stopSentence === neverReader.stopSentence;
    return [facts && base && hidden && neverRan, `facts ${facts} · nobody ${base} · hidden alike ${hidden} · never ran ${neverRan} · "${av.stopSentence}"`];
  });

  /* ── S9 · the audience in words, as the list says it ── */
  await claim(L.s9, async () => {
    const tagged = await campaign(w, "s9t", { path: ["CONFIRMED"] });
    const whole = await campaign(w, "s9w", { path: ["CONFIRMED"], filter: AUD.WHOLE_BOOK });
    const consent = await campaign(w, "s9c", { path: ["CONFIRMED"], filter: { ...AUD.WHOLE_BOOK, consent: ["GIVEN"] } });
    const both = await campaign(w, "s9b", { path: ["CONFIRMED"], filter: { ...AUD.WHOLE_BOOK, population: "both" } });
    const broken = await campaign(w, "s9x", { path: ["CONFIRMED"] });
    const row = mem().smsCampaigns.get(broken.id);
    if (row !== undefined) row.audienceFilter = "{not json";
    const lines = async (id: string, v: LiveViewer) => (await viewOf(impl, id, v)).audienceLines;
    const checks = {
      tag: json(await lines(tagged.id, READER)) === json([`Tag: ${w.tag("s9t")}`]),
      whole: json(await lines(whole.id, GROWTH)) === json([LIST_COPY.CAMPAIGNS_AUDIENCE_EVERYONE]),
      consentReader: json(await lines(consent.id, READER)) === json(["Consent: given"]),
      consentMasked: json(await lines(consent.id, GROWTH)) === json([LIST_COPY.CAMPAIGNS_AUDIENCE_HIDDEN]),
      bothMasked: json(await lines(both.id, GROWTH)) === json([LIST_COPY.CAMPAIGNS_AUDIENCE_HIDDEN]),
      bothReader: json(await lines(both.id, READER)) === json(["Contact book and player accounts"]),
      broken: json(await lines(broken.id, READER)) === json([LIST_COPY.CAMPAIGNS_AUDIENCE_UNREADABLE]),
    };
    return [Object.values(checks).every(Boolean), json(checks)];
  });

  /* ── T1 · Start through the real check ── */
  await claim(L.t1, async () => {
    const tag = w.tag("t1");
    for (let i = 0; i < 3; i++) await contact(`mc_u47b1_${w.run}_t1_${i}`, keyOf("75", w.run * 1000 + i), tag);
    const c = await campaign(w, "t1", { path: ["CONFIRMED"], count: 3, filter: { ...AUD.WHOLE_BOOK, tags: [tag] } });
    const r = seen(await impl.start(c.id, reader, ctrlDeps(impl)));
    const after = await campaignOf(c.id);
    const started = await auditOf(CTRL.CAMPAIGN_STARTED_ACTION, c.id);
    const refusedRows = await auditOf(CTRL.CAMPAIGN_START_REFUSED_ACTION, c.id);
    const recipients = [...mem().smsCampaignRecipients.values()].filter((x) => x.campaignId === c.id).length;
    const row = started[0];
    const shape = started.length === 1 && row.category === "ADMIN" && row.actorId === w.officer
      && json(row.payload) === json({ count: 3, estimateSegments: 3, freshCount: 3, shrunkBy: 0 });
    return [r.ok && r.message === COPY.LIVE_DONE.start && r.recorded && after.status === "PREPARING" && typeof after.startedAt === "string"
      && shape && refusedRows.length === 0 && recipients === 0,
      `${json(r)} · ${after.status} · started rows ${started.length} ${json(row?.payload)} · refused rows ${refusedRows.length} · recipients ${recipients}`];
  });

  /* ── T2 · ⭐ Start's refusals wired ── */
  await claim(L.t2, async () => {
    const c = await campaign(w, "t2", { path: ["CONFIRMED"], count: 1604, estimateTzs: 9624 });
    const REFUSALS: StartRefusal[] = [
      { reason: "not_confirmed" }, { reason: "confirmation_unreadable" }, { reason: "switch_closed" }, { reason: "rail_dead", rail: "keys-not-set" },
      { reason: "needs_source_line" }, { reason: "audience_unreadable" }, { reason: "settings_unreadable" }, { reason: "settings_incomplete" },
      { reason: "price_unknown" }, { reason: "over_budget", costTzs: 10_800, budgetTzs: 10_000 }, { reason: "credit_unreadable" },
      { reason: "credit_low", balanceTzs: 24_000, costTzs: 9624, reserveTzs: 20_000 }, { reason: "audience_uncounted" },
      { reason: "audience_moved", freshCount: 1610, confirmedCount: 1604, population: "both" }, { reason: "members_unverified" },
      { reason: "members_changed" },
    ];
    // ⭐ the source's own list: every case of startRefusalSentence is here, and nothing else
    const src = code("src/lib/server/marketing/start-check.ts");
    const from = src.indexOf("export function startRefusalSentence(");
    const to = src.indexOf("export function resumeRefusalSentence(");
    const cases = Array.from(src.slice(from, to).matchAll(/case "([a-z_]+)":/g), (m) => m[1]).sort();
    const complete = from > 0 && to > from && json(cases) === json(REFUSALS.map((r) => r.reason).sort());
    const MONEY = new Set(["over_budget", "credit_low"]);
    const wrong: string[] = [];
    let calls = 0;
    for (const r of REFUSALS) {
      for (const who of [reader, growth]) {
        const viewer = { money: who.money, reads: who.reads };
        const before = (await auditOf(CTRL.CAMPAIGN_START_REFUSED_ACTION, c.id)).length;
        const res = seen(await impl.start(c.id, who, ctrlDeps(impl, { check: async () => ({ ok: false, refusal: r }) })));
        calls++;
        const want = SC.startRefusalSentence(r, viewer);
        if (res.ok || res.reason !== r.reason || res.message !== want) wrong.push(`${r.reason}/${who.money ? "money" : "growth"} said "${res.ok ? "ok" : res.message.slice(0, 50)}"`);
        if (!who.money && !res.ok && res.message.includes("TZS")) wrong.push(`${r.reason}: TZS for growth`);
        if (who.money && MONEY.has(r.reason) && !res.ok && !res.message.includes("TZS")) wrong.push(`${r.reason}: no TZS for money`);
        const rowsNow = await auditOf(CTRL.CAMPAIGN_START_REFUSED_ACTION, c.id);
        const last = rowsNow[0];
        const keys = Object.keys(last?.payload ?? {}).sort().join(",");
        const wantKeys = r.reason === "over_budget" ? "budgetTzs,costTzs,reason" : r.reason === "credit_low" ? "balanceTzs,costTzs,reason,reserveTzs"
          : r.reason === "rail_dead" ? "rail,reason" : "reason";
        if (rowsNow.length !== before + 1 || last?.payload?.reason !== r.reason || keys !== wantKeys || last?.actorId !== w.officer || last?.category !== "ADMIN") {
          wrong.push(`${r.reason}: row ${rowsNow.length - before} keys [${keys}]`);
        }
      }
    }
    const still = (await campaignOf(c.id)).status === "CONFIRMED";
    // the REAL check refuses a campaign that is not confirmed
    const running = await campaign(w, "t2r", { path: ["CONFIRMED", "PREPARING", "RUNNING"] });
    const real = seen(await impl.start(running.id, reader, ctrlDeps(impl)));
    const realOk = !real.ok && real.reason === "not_confirmed" && real.message === "Only a confirmed campaign can start."
      && (await auditOf(CTRL.CAMPAIGN_START_REFUSED_ACTION, running.id)).length === 1;
    return [complete && wrong.length === 0 && still && realOk && calls === REFUSALS.length * 2,
      `cases ${complete ? "complete" : `[${cases.join(",")}]`} · wrong [${wrong.slice(0, 4).join("; ")}] · still CONFIRMED ${still} · the real not_confirmed ${realOk}`];
  });

  /* ── T3 · ⭐ OD66 at Start ── */
  await claim(L.t3, async () => {
    const both = await campaign(w, "t3", { path: ["CONFIRMED"], filter: { ...AUD.WHOLE_BOOK, population: "both" } });
    let asked = 0;
    const spy = async () => { asked++; return { ok: false as const, refusal: { reason: "switch_closed" as const } }; };
    const masked = seen(await impl.start(both.id, growth, ctrlDeps(impl, { check: spy })));
    const maskedAsked = asked;
    const rowsNow = await auditOf(CTRL.CAMPAIGN_START_REFUSED_ACTION, both.id);
    const refused = !masked.ok && masked.reason === "audience_refused" && masked.message === COPY.START_AUDIENCE_REFUSED && maskedAsked === 0
      && rowsNow.length === 1 && json(rowsNow[0]?.payload) === json({ reason: "audience_refused", param: "pop" });
    const r = seen(await impl.start(both.id, reader, ctrlDeps(impl, { check: spy })));
    const readerReached = asked === 1 && !(!r.ok && r.reason === "audience_refused");
    const book = await campaign(w, "t3b", { path: ["CONFIRMED"] });
    const g = seen(await impl.start(book.id, growth, ctrlDeps(impl, { check: spy })));
    const bookReached = asked === 2 && !(!g.ok && g.reason === "audience_refused");
    return [refused && readerReached && bookReached, `masked ${json(masked)} asked ${maskedAsked} · rows ${json(rowsNow.map((x) => x.payload))} · reader reached ${readerReached} · masked on the book reached ${bookReached}`];
  });

  /* ── T4 · Pause ── */
  await claim(L.t4, async () => {
    const d = ctrlDeps(impl);
    const prep = await campaign(w, "t4p", { path: ["CONFIRMED", "PREPARING"] });
    const run = await campaign(w, "t4r", { path: ["CONFIRMED", "PREPARING", "RUNNING"] });
    const a = seen(await impl.pause(prep.id, reader, d));
    const b = seen(await impl.pause(run.id, reader, d));
    const pa = await campaignOf(prep.id);
    const pb = await campaignOf(run.id);
    const rowsA = await auditOf(ENGINE.ENGINE_PAUSED_ACTION, prep.id);
    const rowsB = await auditOf(ENGINE.ENGINE_PAUSED_ACTION, run.id);
    const landed = a.ok && b.ok && a.message === COPY.LIVE_DONE.pause && pa.status === "PAUSED" && pb.status === "PAUSED"
      && pa.stopReason === "officer_paused" && pb.stopReason === "officer_paused" && typeof pa.pausedAt === "string"
      && rowsA.length === 1 && rowsB.length === 1 && rowsA[0].category === "ADMIN" && rowsA[0].actorId === w.officer
      && json(rowsA[0].payload) === json({ reason: "officer_paused" });
    const again = seen(await impl.pause(run.id, reader, d));
    const conf = await campaign(w, "t4c", { path: ["CONFIRMED"] });
    const done = await campaign(w, "t4d", { path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"] });
    const draft = await campaign(w, "t4x", { path: [] });
    const c1 = seen(await impl.pause(conf.id, reader, d));
    const c2 = seen(await impl.pause(done.id, reader, d));
    const c3 = seen(await impl.pause(draft.id, reader, d));
    const refusals = !again.ok && again.message === COPY.LIVE_CHANGED.alreadyPaused && !c1.ok && c1.message === COPY.LIVE_DISABLED.pause
      && !c2.ok && c2.message === COPY.LIVE_DISABLED.stop && !c3.ok && c3.message === COPY.LIVE_DISABLED.draft
      && (await campaignOf(conf.id)).status === "CONFIRMED" && (await auditOf(ENGINE.ENGINE_PAUSED_ACTION, conf.id)).length === 0
      && (await auditOf(ENGINE.ENGINE_PAUSED_ACTION, run.id)).length === 1;
    return [landed && refusals, `landed ${landed} · refusals ${refusals} · ${json([a, again, c1, c2, c3].map((x) => (x.ok ? "ok" : x.reason)))}`];
  });

  /* ── T5 · ⭐ Resume's re-queue ── */
  await claim(L.t5, async () => {
    const c = await campaign(w, "t5", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 10 });
    const ids = await rows(w, c.id, [
      ...many(3, { status: "HELD", failureClass: "gate_unanswered", attempts: 3 }), ...many(4, { status: "SENT" }), ...many(3, { status: "PENDING" }),
    ]);
    const order: string[] = [];
    const base = ctrlDeps(impl);
    const d: ControlDeps = {
      ...base,
      campaigns: { ...base.campaigns, transition: async (id, t) => { order.push(`transition:${t.to}`); return base.campaigns.transition(id, t); } },
      recipients: { ...base.recipients, requeueHeld: async (id, at) => { order.push("requeue"); return base.recipients.requeueHeld(id, at); } },
    };
    const r = seen(await impl.resume(c.id, reader, d));
    const after = await campaignOf(c.id);
    const held = ids.slice(0, 3).map((id) => mem().smsCampaignRecipients.get(id));
    const restarted = held.every((x) => x !== undefined && x.status === "PENDING" && x.attempts === 0 && x.failureClass === null);
    const rowsNow = await auditOf(CTRL.CAMPAIGN_RESUMED_ACTION, c.id);
    const landed = r.ok && r.message === COPY.LIVE_DONE.resume && after.status === "RUNNING" && after.stopReason === null && restarted
      && json(order) === json(["requeue", "transition:RUNNING"]) && rowsNow.length === 1 && rowsNow[0].actorId === w.officer
      && json(rowsNow[0].payload) === json({ requeuedHeld: 3, to: "RUNNING" });
    const never = await campaign(w, "t5n", { path: ["CONFIRMED", "PREPARING", "PAUSED"], count: 10 });
    await rows(w, never.id, many(3, { status: "PENDING" }));
    const n = seen(await impl.resume(never.id, reader, ctrlDeps(impl)));
    const neverOk = n.ok && (await campaignOf(never.id)).status === "PREPARING";
    return [landed && neverOk, `${json(r)} · ${after.status} ${after.stopReason} · order ${json(order)} · HELD restarted ${restarted} · row ${json(rowsNow[0]?.payload)} · never finished → ${(await campaignOf(never.id)).status}`];
  });

  /* ── T6 · ⭐ Resume's count-based refusals ── */
  await claim(L.t6, async () => {
    const shutDeps = { ...SC.START_CHECK_DEPS, provider: () => "blackball" as const, liveSwitch: async () => ({ state: "closed" as const, why: "absent" as const }) };
    const over = await campaign(w, "t6o", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 3 });
    await rows(w, over.id, many(4, { status: "PENDING" }));
    const a = seen(await impl.resume(over.id, reader, ctrlDeps(impl)));
    const a2 = seen(await impl.resume(over.id, reader, ctrlDeps(impl, { resumeCheck: (c, counts) => SC.resumeRefusal(c, counts, shutDeps) })));
    const sentence = (r: ResumeRefusal) => SC.resumeRefusalSentence(r, { money: true, reads: true });
    const overOk = !a.ok && a.reason === "list_over_confirmed" && a.message === sentence({ reason: "list_over_confirmed", reached: false })
      && !a2.ok && a2.reason === "list_over_confirmed" && (await campaignOf(over.id)).status === "PAUSED"
      && (await auditOf(CTRL.CAMPAIGN_RESUMED_ACTION, over.id)).length === 0;
    const reached = await campaign(w, "t6r", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 3 });
    await rows(w, reached.id, [{ status: "SENT" }, ...many(3, { status: "PENDING" })]);
    const b = seen(await impl.resume(reached.id, reader, ctrlDeps(impl)));
    const reachedOk = !b.ok && b.reason === "list_over_confirmed" && b.message === sentence({ reason: "list_over_confirmed", reached: true })
      && b.message.includes("would message them again");
    // ⛔ E23 · below the floor a masked viewer cannot tell the reached list from the unreached one by the words
    const hm = seen(await impl.resume(reached.id, growth, ctrlDeps(impl)));
    const hn = seen(await impl.resume(over.id, growth, ctrlDeps(impl)));
    const hiddenOk = !hm.ok && !hn.ok && hm.message === hn.message && hm.message === COPY.resumeCopyOnlyHiddenSentence("list_over_confirmed")
      && hm.message.includes("if anyone on it was already messaged");
    const moved = await campaign(w, "t6m", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], pausedFor: "audience_moved", count: 10 });
    await rows(w, moved.id, many(3, { status: "PENDING" }));
    const m = seen(await impl.resume(moved.id, reader, ctrlDeps(impl, { resumeCheck: (c, counts) => SC.resumeRefusal(c, counts, shutDeps) })));
    const movedOk = !m.ok && m.reason === "audience_moved";
    const fine = await campaign(w, "t6f", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 10 });
    await rows(w, fine.id, many(3, { status: "PENDING" }));
    const f = seen(await impl.resume(fine.id, reader, ctrlDeps(impl)));
    const fineOk = f.ok && (await campaignOf(fine.id)).status === "RUNNING";
    return [overOk && reachedOk && hiddenOk && movedOk && fineOk,
      `over ${json(a)} / switch shut ${json(a2.ok ? "ok" : a2.reason)} · reached ${reachedOk} · masked alike ${hiddenOk} · moved ${json(m.ok ? "ok" : m.reason)} · within ${fineOk}`];
  });

  /* ── T7 · Stop (E25) ── */
  await claim(L.t7, async () => {
    const d = ctrlDeps(impl);
    const conf = await campaign(w, "t7c", { path: ["CONFIRMED"], count: 10 });
    const prep = await campaign(w, "t7p", { path: ["CONFIRMED", "PREPARING"], count: 10 });
    await rows(w, prep.id, many(3, { status: "PENDING" }));
    const run = await campaign(w, "t7r", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 10 });
    await rows(w, run.id, [...many(4, { status: "SENT" }), ...many(4, { status: "PENDING" }), { status: "PENDING", claimToken: "slc_u47b1_t7", claimedAt: iso(T_NOW - MIN) }, { status: "HELD", failureClass: "gate_unanswered", attempts: 3 }]);
    const pau = await campaign(w, "t7z", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 10 });
    await rows(w, pau.id, [...many(8, { status: "SENT" }), ...many(2, { status: "PENDING" })]);
    const want: Array<[StoredSmsCampaign, number]> = [[conf, 10], [prep, 10], [run, 6], [pau, 2]];
    const wrong: string[] = [];
    for (const [c, left] of want) {
      const before = rowsSnapshot(c.id);
      const r = seen(await impl.stop(c.id, reader, d));
      const after = await campaignOf(c.id);
      const rowsNow = await auditOf(CTRL.CAMPAIGN_STOPPED_ACTION, c.id);
      const okHere = r.ok && r.message === COPY.LIVE_DONE.stop && after.status === "CANCELLED" && after.stopReason === "officer_stopped"
        && typeof after.finishedAt === "string" && rowsSnapshot(c.id) === before && rowsNow.length === 1 && rowsNow[0].actorId === w.officer
        && rowsNow[0].category === "ADMIN" && json(rowsNow[0].payload) === json({ outstanding: left });
      if (!okHere) wrong.push(`${c.status}: ${json(r)} ${after.status} rows ${rowsNow.length} ${json(rowsNow[0]?.payload)} untouched ${rowsSnapshot(c.id) === before}`);
    }
    const done = await campaign(w, "t7d", { path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"] });
    const draft = await campaign(w, "t7x", { path: [] });
    const x1 = seen(await impl.stop(done.id, reader, d));
    const x2 = seen(await impl.stop(conf.id, reader, d));
    const x3 = seen(await impl.stop(draft.id, reader, d));
    const refusals = !x1.ok && x1.message === COPY.LIVE_DISABLED.stop && !x2.ok && x2.message === COPY.LIVE_DISABLED.stop && !x3.ok
      && x3.message === COPY.LIVE_DISABLED.draft && (await auditOf(CTRL.CAMPAIGN_STOPPED_ACTION, done.id)).length === 0
      && (await auditOf(CTRL.CAMPAIGN_STOPPED_ACTION, conf.id)).length === 1;
    return [wrong.length === 0 && refusals, `wrong [${wrong.join("; ")}] · refusals ${refusals}`];
  });

  /* ── T8 · ⭐ Make a copy ── */
  await claim(L.t8, async () => {
    const d = ctrlDeps(impl);
    const k = await campaign(w, "t8", { path: ["CONFIRMED", "PREPARING", "RUNNING"], name: "Ofa ya Oktoba", bodyEn: BODY_EN });
    const r = seen(await impl.copy(k.id, reader, d));
    const copy = r.ok ? await db.smsCampaign.find(r.id) : null;
    const created = r.ok ? await auditOf(DRAFT.CAMPAIGN_CREATED_ACTION, r.id) : [];
    const copied = await auditOf(CTRL.CAMPAIGN_COPIED_ACTION, k.id);
    const made = r.ok && copy !== null && copy.status === "DRAFT" && copy.createdBy === w.officer && copy.name === "Ofa ya Oktoba (copy)"
      && copy.bodySw === k.bodySw && copy.bodyEn === k.bodyEn && copy.nameFallbackSw === k.nameFallbackSw && copy.nameFallbackEn === k.nameFallbackEn
      && copy.audienceFilter === k.audienceFilter && r.href === CS.campaignDraftHref(r.id) && r.message === COPY.copyDoneSentence("none")
      && created.length === 1 && copied.length === 1 && copied[0].actorId === w.officer && json(copied[0].payload) === json({ from: k.id, to: r.ok ? r.id : "" });
    // once anybody was messaged, the copy's answer says the copy messages them again
    const sent = await campaign(w, "t8s", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 12 });
    await rows(w, sent.id, [...many(2, { status: "SENT" }), ...many(10, { status: "PENDING" })]);
    const s = seen(await impl.copy(sent.id, reader, d));
    const again = s.ok && s.message === COPY.copyDoneSentence("reached");
    // refused: an audience no address can write; a masked viewer on both; a draft — nothing made
    const before = mem().smsCampaigns.size;
    const odd = await campaign(w, "t8o", { path: ["CONFIRMED"], filter: { ...AUD.WHOLE_BOOK, addedFrom: "2026-10-01T10:00:30.000Z" } });
    const both = await campaign(w, "t8b", { path: ["CONFIRMED"], filter: { ...AUD.WHOLE_BOOK, population: "both" } });
    const draft = await campaign(w, "t8x", { path: [] });
    const made3 = mem().smsCampaigns.size;
    const o = seen(await impl.copy(odd.id, reader, d));
    const b = seen(await impl.copy(both.id, growth, d));
    const x = seen(await impl.copy(draft.id, reader, d));
    const refused = !o.ok && o.reason === "audience_cannot_travel" && o.message === COPY.copyCantTravelSentence("none")
      && !b.ok && b.reason === "audience_cannot_travel" && !x.ok && x.reason === "draft" && mem().smsCampaigns.size === made3 && made3 === before + 3
      && (await auditOf(CTRL.CAMPAIGN_COPIED_ACTION, odd.id)).length === 0;
    return [made && again && refused, `made ${made} (${r.ok ? copy?.name : r.message}) · reached ${again} · refused ${refused} · ${json([o, b, x].map((y) => (y.ok ? "ok" : y.reason)))}`];
  });

  /* ── D1 · the step dispatcher ── */
  await claim(L.d1, async () => {
    const calls: string[] = [];
    const until = iso(T_NOW + 5 * MIN);
    const d = ctrlDeps(impl, {
      enqueue: async () => { calls.push("enqueue"); return { kind: "wrote", inserted: 0, duplicates: 0, unusable: 0, next: "b:x" }; },
      slice: async () => { calls.push("slice"); return { kind: "waiting", reason: "quiet_hours", until }; },
      reap: async () => { calls.push("reap"); return { ...ZERO_REAP }; },
    });
    const paths: Array<[SmsCampaignStatus, SmsCampaignStatus[], string, string]> = [
      ["PREPARING", ["CONFIRMED", "PREPARING"], "reap,enqueue", "wrote"],
      ["RUNNING", ["CONFIRMED", "PREPARING", "RUNNING"], "slice", "waiting"],
      ["PAUSED", ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], "reap", "reaped"],
      ["CANCELLED", ["CONFIRMED", "CANCELLED"], "reap", "reaped"],
      ["DONE", ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], "reap", "reaped"],
      ["DRAFT", [], "", "idle"],
      ["CONFIRMED", ["CONFIRMED"], "", "idle"],
    ];
    const wrong: string[] = [];
    for (const [s, path, want, kind] of paths) {
      calls.length = 0;
      const c = await campaign(w, `d1${s.toLowerCase()}`, { path });
      const r = seen(await impl.step(c.id, READER, d));
      const said = r.ok && r.step.kind === "waiting" ? r.said === COPY.waitSentence("quiet_hours", until) : r.ok && r.said === null;
      if (!r.ok || calls.join(",") !== want || r.step.kind !== kind || r.view.id !== c.id || r.view.status !== s || !said) {
        wrong.push(`${s}: [${calls.join(",")}] ${r.ok ? r.step.kind : r.reason}`);
      }
    }
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── D2 · ⭐ single-flight per campaign ── */
  await claim(L.d2, async () => {
    const a = await campaign(w, "d2a", { path: ["CONFIRMED", "PREPARING"] });
    const b = await campaign(w, "d2b", { path: ["CONFIRMED", "PREPARING"] });
    let release: () => void = () => {};
    let gate = new Promise<void>((r) => { release = r; });
    const active: Record<string, number> = {};
    let enqueued: string[] = [];
    let most = 0;
    let throwNext = false;
    const flights = freshFlights();
    const d = ctrlDeps(impl, {
      flights: () => flights,
      reap: async () => ({ ...ZERO_REAP }),
      enqueue: async (id: string) => {
        enqueued.push(id);
        active[id] = (active[id] ?? 0) + 1;
        most = Math.max(most, Object.values(active).reduce((n, x) => n + x, 0));
        try {
          if (throwNext) { throwNext = false; throw new Error("enqueue died (stand-in)"); }
          await gate;
          return { kind: "wrote", inserted: 1, duplicates: 0, unusable: 0, next: "b:x" };
        } finally {
          active[id]--;
        }
      },
    });
    const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 1)); };
    // two steps of ONE campaign at once — observed while the first is still inside its enqueue (never awaited inside the
    // gate, so a bypassed flight shows as two entries instead of a hang)
    const p1 = impl.step(a.id, READER, d);
    const p2 = impl.step(a.id, READER, d);
    await settle();
    const entered = [...enqueued];
    const mostThen = most;
    release();
    const [r1, r2] = await Promise.all([p1, p2]);
    const kinds = [r1, r2].map((r) => (r.ok ? (r.step.kind === "waiting" ? `waiting:${r.step.reason}` : r.step.kind) : r.reason)).sort();
    const one = json(entered) === json([a.id]) && mostThen === 1 && json(kinds) === json(["waiting:busy", "wrote"]);
    // two DIFFERENT campaigns at once
    enqueued = [];
    most = 0;
    gate = new Promise<void>((r) => { release = r; });
    const q1 = impl.step(a.id, READER, d);
    const q2 = impl.step(b.id, READER, d);
    await settle();
    const bothIn = enqueued.length === 2 && most === 2;
    release();
    const [s1, s2] = await Promise.all([q1, q2]);
    const two = bothIn && s1.ok && s2.ok && s1.step.kind === "wrote" && s2.step.kind === "wrote";
    // released after a step, and after a step that throws
    const releasedAfter = flights.flights.size === 0;
    throwNext = true;
    let threw = false;
    try { await impl.step(a.id, READER, d); } catch { threw = true; }
    enqueued = [];
    const next = await impl.step(a.id, READER, d);
    const afterThrow = threw && flights.flights.size === 0 && next.ok && next.step.kind === "wrote" && enqueued.length === 1;
    // a stale flight no longer holds; a fresh one does
    enqueued = [];
    flights.flights.set(a.id, { since: T_NOW - 11 * MIN, ticket: 9_999 });
    const stale = await impl.step(a.id, { ...READER }, ctrlDeps(impl, { ...d, now: () => new Date(T_NOW), flights: () => flights }));
    flights.flights.set(a.id, { since: Date.now(), ticket: 9_998 });
    const held = await impl.step(a.id, READER, d);
    flights.flights.delete(a.id);
    const staleOk = stale.ok && stale.step.kind === "wrote" && held.ok && held.step.kind === "waiting" && enqueued.length === 1;
    const global = CTRL.campaignStepFlights() === globalThis.__50PICK_CAMPAIGN_STEPS && CTRL.CONTROL_DEPS.flights === CTRL.campaignStepFlights;
    return [one && two && releasedAfter && afterThrow && staleOk && global,
      `one campaign ${one} (entered ${entered.length}, most ${mostThen}, ${json(kinds)}) · two campaigns ${two} · released ${releasedAfter} · after a throw ${afterThrow} · stale ${staleOk} · globalThis ${global}`];
  });

  /* ── D3 · act-gated ── */
  await claim(L.d3, async () => {
    const c = await campaign(w, "d3", { path: ["CONFIRMED", "PREPARING", "RUNNING"] });
    const calls: string[] = [];
    const d = ctrlDeps(impl, {
      campaigns: { find: async (id: string) => { calls.push("find"); return db.smsCampaign.find(id); }, transition: async () => null },
      enqueue: async () => { calls.push("enqueue"); return { kind: "not_preparing", status: "RUNNING" }; },
      slice: async () => { calls.push("slice"); return { kind: "not_running", status: "RUNNING" }; },
      reap: async () => { calls.push("reap"); return { ...ZERO_REAP }; },
    });
    const r = seen(await impl.step(c.id, WATCHER, d));
    const refused = !r.ok && r.reason === "role" && r.error === COPY.LIVE_DISABLED.role && calls.length === 0;
    const gone = seen(await impl.step(w.cid("d3_missing"), READER, ctrlDeps(impl)));
    const missing = !gone.ok && gone.reason === "not_found" && gone.error === COPY.LIVE_MISSING;
    return [refused && missing, `${json(r)} · calls [${calls.join(",")}] · missing ${json(gone)}`];
  });

  /* ── D4 · ⭐ end to end on the memory twin ── */
  await claim(L.d4, async () => {
    const tag = w.tag("d4");
    for (let i = 0; i < 4; i++) {
      const key = keyOf("76", w.run * 1000 + i);
      await player(`usr_u47b1_${w.run}_d4_${i}`, key);
      await contact(`mc_u47b1_${w.run}_d4_${i}`, key, tag, `usr_u47b1_${w.run}_d4_${i}`);
    }
    for (let i = 4; i < 6; i++) await contact(`mc_u47b1_${w.run}_d4_${i}`, keyOf("76", w.run * 1000 + i), tag);
    const c = await campaign(w, "d4", { path: ["CONFIRMED"], count: 6, filter: { ...AUD.WHOLE_BOOK, tags: [tag] } });
    const wire = stubWire();
    const eng = engineDeps(wire);
    const d = ctrlDeps(impl, {
      slice: (id: string) => ENGINE.runCampaignSlice(id, eng),
      reap: (id: string) => ENGINE.reapStrandedClaims(id, eng),
    });
    const started = seen(await impl.start(c.id, reader, d));
    const s1 = seen(await impl.step(c.id, READER, d));
    const s2 = seen(await impl.step(c.id, READER, d));
    const s3 = seen(await impl.step(c.id, READER, d));
    const prepared = s1.ok && s1.step.kind === "done" && s1.view.status === "RUNNING" && s1.view.kpis.waiting === 6;
    const sent = s2.ok && s2.step.kind === "sent"
      && json(s2.view.progress) === json({ phase: "sending", value: 6, max: 6 }) && s2.view.kpis.handedOver === 4 && s2.view.kpis.notSent === 2
      && s2.view.notSentReasons?.[0]?.label === AUDIENCE_REASON_LABEL.no_consent && s2.view.notSentReasons?.[0]?.count === 2;
    const finished = s3.ok && s3.step.kind === "finished" && s3.view.status === "DONE" && s3.view.headline === COPY.LIVE_HEADLINE.DONE;
    const quietWire = wire.calls === 1 && wire.sent.length === 4
      && ![...mem().smsMessages.values()].some((m) => typeof m.targetId === "string" && m.targetId.startsWith(`rcp_`) && [...mem().smsCampaignRecipients.values()].some((r) => r.id === m.targetId && r.campaignId === c.id));
    return [started.ok && prepared && sent && finished && quietWire,
      `start ${started.ok} · ${json(s1.ok ? s1.step : s1)} · ${json(s2.ok ? s2.step.kind : s2)} handed ${s2.ok ? s2.view.kpis.handedOver : "-"} · ${json(s3.ok ? s3.step : s3)} · wire ${wire.calls} call(s), ${wire.sent.length} message(s)`];
  });

  /* ── D5 · the reaper on mount ── */
  await claim(L.d5, async () => {
    const c = await campaign(w, "d5", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"] });
    const ids = await rows(w, c.id, [{ status: "PENDING", claimToken: `slc_u47b1_d5_${w.run}`, claimedAt: iso(Date.now() - 11 * MIN), attempts: 0 }, ...many(9, { status: "SENT" })]);
    const eng = engineDeps(stubWire());
    const r = seen(await impl.step(c.id, READER, ctrlDeps(impl, { reap: (id: string) => ENGINE.reapStrandedClaims(id, eng) })));
    const row = mem().smsCampaignRecipients.get(ids[0]);
    const reapedRows = await auditOf(ENGINE.ENGINE_REAPED_ACTION, c.id);
    return [r.ok && r.step.kind === "reaped" && row?.status === "PENDING" && row.attempts === 1 && row.claimToken === null
      && reapedRows.length === 1 && reapedRows[0].category === "SYSTEM" && reapedRows[0].actorId === null && r.view.kpis.waiting === 1,
      `${json(r.ok ? r.step : r)} · the row ${row?.status} attempts ${row?.attempts} claim ${row?.claimToken === null ? "cleared" : "kept"} · reaped rows ${reapedRows.length}`];
  });

  /* ── W1 · the wiring ── */
  await claim(L.w1, async () => {
    const s = impl.sources;
    const D = CTRL.CONTROL_DEPS;
    const V = LIVE.LIVE_VIEW_DEPS;
    const doors = Object.isFrozen(D) && Object.isFrozen(D.campaigns) && Object.isFrozen(D.recipients) && D.check === SC.checkStart
      && D.resumeCheck === SC.resumeRefusal && D.startSentence === SC.startRefusalSentence && D.resumeSentence === SC.resumeRefusalSentence
      && D.outstanding === SC.resumeOutstanding && D.enqueue === ENQ.enqueueStep && D.slice === ENGINE.runCampaignSlice
      && D.reap === ENGINE.reapStrandedClaims && D.view === LIVE.campaignLiveView && D.saveDraft === DRAFT.saveCampaignDraft
      && D.travel === LIVE.copyTravel && D.audienceRefusal === LIVE.startAudienceRefusedFor && D.flights === CTRL.campaignStepFlights && D.shape === CTRL.driverStep
      && D.reach === LIVE.liveReach
      && Object.isFrozen(V) && Object.isFrozen(V.recipients) && Object.isFrozen(V.rules) && V.window === liveSendWindow && V.liveGate === marketingLiveGate
      && V.rules.progress === CS.campaignProgress && V.rules.breakdownHidden === LIVE.liveBreakdownHidden && V.rules.outstanding === SC.resumeOutstanding
      && s.live.includes("db.smsCampaignRecipient.countByOutcome(campaignId)") && s.control.includes("db.smsCampaignRecipient.requeueHeld(campaignId, at)");
    const spelling = CTRL.CAMPAIGN_PAUSED_ACTION === ENGINE.ENGINE_PAUSED_ACTION && ENGINE.ENGINE_PAUSED_ACTION === ENQ.CAMPAIGN_PAUSED_ACTION
      && LIVE.OFFICER_PAUSED_ACTION === CTRL.CAMPAIGN_PAUSED_ACTION && CTRL.CAMPAIGN_STOPPED_ACTION === LIVE.OFFICER_STOPPED_ACTION;
    const DIRECTIVE = new RegExp('^[ ]*["' + "'" + "]use (client|server)[" + '"' + "'" + "]", "m");
    const ACTION = new RegExp("export (async )?(function|const) [A-Za-z0-9_]*Action[ (=:<]");
    const files = [s.control, s.live, s.copy];
    const bare = files.every((f) => !DIRECTIVE.test(f) && !ACTION.test(f));
    // importers: a VALUE import of each module (a type-only one is erased, and allowed)
    const SPEC = new RegExp('^(import|export)( [^;]*?)? from "([^"]+)"', "gm");
    const importersOf = (name: string): string[] => [...s.src].filter(([rel, text]) => {
      if (rel.endsWith(`/${name}.ts`)) return false;
      return Array.from(text.matchAll(SPEC)).some((m) => !/^ type /.test(m[2] ?? "") && m[3].endsWith(`/${name}`));
    }).map(([rel]) => rel).sort();
    const controlIn = importersOf("campaign-control");
    const liveIn = importersOf("campaign-live");
    const copyIn = importersOf("live-copy");
    const reach = json(controlIn) === json([]) && json(liveIn) === json([CONTROL_REL]) && json(copyIn) === json([CONTROL_REL, LIVE_REL]);
    const SEND = new RegExp("sendBatch|dispatchSlice|blackballSend|sendCampaignTest|engineSend");
    const noSend = !SEND.test(s.control) && !SEND.test(s.live) && !SEND.test(s.copy);
    const copyImports = Array.from(s.copy.matchAll(/^import (type )?[{][^}]*[}] from "([^"]+)";/gm)).map((m) => `${m[1] ? "type " : ""}${m[2]}`).sort();
    const pureCopy = json(copyImports) === json(["@/lib/eat-day", "@/lib/marketing/campaign-status", "@/lib/utils", "type @/lib/server/store"]);
    let scripts: Record<string, string> = {};
    try { scripts = (JSON.parse(s.pkg) as { scripts?: Record<string, string> }).scripts ?? {}; } catch { scripts = {}; }
    const wired = scripts["test:campaign-visuals"] === "tsx scripts/campaign-visuals.test.mts" && scripts["red:campaign-visuals"] === "tsx scripts/campaign-visuals.test.mts --prove-red";
    return [doors && spelling && bare && reach && noSend && pureCopy && wired,
      `doors ${doors} · one spelling ${spelling} · bare ${bare} · importers control [${controlIn.join(",")}] live [${liveIn.join(",")}] copy [${copyIn.join(",")}] · no send ${noSend} · live-copy imports [${copyImports.join(", ")}] · scripts ${wired}`];
  });

  /* ── P1 · ⛔ no phone number, no refusal object ── */
  await claim(L.p1, async () => {
    await auditFlush();
    const prefix = `cmp_u47b1_r${w.run}_`;
    const payloads = getAuditPage({ limit: 10_000 }).filter((e) => typeof e.targetId === "string" && e.targetId.startsWith(prefix)).map((e) => json(e.payload ?? null));
    const text = [...SEEN, ...payloads].join(NL);
    const RAW = new RegExp("255[0-9]{9}");
    const PLUS = new RegExp("[+]255");
    const ALLOWED = new Set(["ok", "reason", "message", "recorded", "id", "href"]);
    const answers = ANSWERS.filter((a) => typeof a.ok === "boolean" && "message" in a);
    const leaked = answers.flatMap((a) => Object.keys(a).filter((k) => !ALLOWED.has(k)));
    return [!RAW.test(text) && !PLUS.test(text) && SEEN.length > 40 && payloads.length > 20 && answers.length > 40 && leaked.length === 0,
      `${SEEN.length} views and answers, ${payloads.length} audit payloads · a 255 key ${RAW.test(text)} · a +255 number ${PLUS.test(text)} · ${answers.length} service answers, extra keys [${[...new Set(leaked)].join(",")}]`];
  });

  /* ── P2 · ⛔ the step answer carries no figure and no cursor ── */
  await claim(L.p2, async () => {
    const SHAPE = new Set(["kind", "reason", "until", "status"]);
    const steps = ANSWERS.filter((a) => a.ok === true && typeof a.step === "object" && a.step !== null).map((a) => a.step as Record<string, unknown>);
    const bad = steps.flatMap((st) => Object.entries(st).filter(([k, v]) => !SHAPE.has(k) || typeof v === "number").map(([k]) => k));
    const kinds = [...new Set(steps.map((st) => String(st.kind)))].sort();
    return [steps.length >= 8 && kinds.includes("sent") && kinds.includes("wrote") && bad.length === 0,
      `${steps.length} step answers (kinds ${kinds.join(",")}) · a figure or extra key [${[...new Set(bad)].join(",")}]`];
  });
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL);
  console.log(`${NL}campaign-visuals: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const reset = (): void => { pass = 0; fail = 0; failed.length = 0; };
  quiet = true;
  /* ── THE BASELINE — a plant can only "hold" against claims the real code PASSES ── */
  await silently(() => runAssertions(REAL));
  if (fail > 0) {
    console.log(`RED CONTROL — NOT RUN: the baseline is not green (${fail} claim(s) fail for the REAL code):${NL}  ${failed.join(`${NL}  `)}`);
    process.exit(1);
  }
  console.log(`RED CONTROL — baseline green (${pass} claims pass for the real code)${NL}`);

  /** A source with one anchor replaced. ⛔ An anchor that is not there THROWS, so a plant can never pass as caught unchanged. */
  const plantIn = (src: string, from: string, to: string): string => {
    if (!src.includes(from)) throw new Error(`plant anchor not found: ${from.slice(0, 60)}`);
    return src.replace(from, to);
  };
  const withView = (f: (d: LiveViewDeps) => LiveViewDeps): Partial<Impl> => ({ viewDeps: f });
  const withCtrl = (f: (d: ControlDeps) => ControlDeps): Partial<Impl> => ({ ctrlDeps: f });
  const withSources = (patch: Partial<Sources>): Partial<Impl> => ({ sources: { ...REAL_SOURCES, ...patch } });

  type Plant = { name: string; expect: Label[]; impl: Partial<Impl> | (() => Partial<Impl>) };
  const plants: Plant[] = [
    { name: "R-S3b · the floor at 0 rows (the U47b-1 review's MAJOR) — every confirmed campaign tells a masked viewer it has fewer than ten people", expect: [L.s3],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, breakdownHidden: (reads: boolean, rows: number) => reads !== true && rows < 10 } })) },
    { name: "R-P2 · the step answered raw (the U47b-1 review's MAJOR) — its counts and its cursor reach every role, under the floor too", expect: [L.p2],
      impl: { ctrlDeps: (d: ControlDeps) => ({ ...d, shape: (st: CTRL.StepOutcome) => st as unknown as CTRL.DriverStep }) } },
    { name: "R-V2 (the plan's own) · HELD counted settled — 4 SENT and 6 HELD read 10 of 10", expect: [L.v2],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, progress: (c, counts) => d.rules.progress(c, { ...counts, SENT: counts.SENT + counts.HELD, HELD: 0 }) } })) },
    { name: "R-V3 (the plan's own) · a timer-driven bar — the bar moves on with the clock since the page opened", expect: [L.v3],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, progress: (c, counts) => {
        const p = d.rules.progress(c, counts);
        const drift = Math.max(0, Math.floor((d.now().getTime() - T_NOW) / 1000));
        return p === null ? p : { ...p, value: Math.min(p.max, p.value + drift) };
      } } })) },
    { name: "R-S1 · the groupBy loses a status (DELIVERED) — the KPIs no longer add up to the rows", expect: [L.s1],
      impl: withView((d) => ({ ...d, recipients: { ...d.recipients, countByOutcome: async (id: string) => (await d.recipients.countByOutcome(id)).filter((g) => g.status !== "DELIVERED") } })) },
    { name: "R-S2 · protected itemised — an RG reason keeps its own key instead of the protected line", expect: [L.s2],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, bucketOf: (r) => (typeof r === "string" && r.startsWith("rg_") ? (r as never) : d.rules.bucketOf(r)) } })) },
    { name: "R-S3 · the floor removed — a masked viewer under ten rows sees the split (and the copy advice says whether anybody was messaged)", expect: [L.s3, L.s8],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, breakdownHidden: () => false } })) },
    { name: "R-S4 · TZS for GROWTH — the view carries money whatever the decider said", expect: [L.s4],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, moneyVisible: () => true } })) },
    { name: "R-T2 · Start goes ahead whatever U49a's check refused", expect: [L.t2],
      impl: withCtrl((d) => ({ ...d, check: async (c) => { const r = await d.check(c); return r.ok ? r : { ok: true, freshCount: c.audienceCount ?? 0, shrunkBy: 0, costTzs: 0 }; } })) },
    { name: "R-T2b · a Start refusal said with money to every role (TZS for GROWTH)", expect: [L.t2],
      impl: withCtrl((d) => ({ ...d, startSentence: (r, v) => SC.startRefusalSentence(r, { ...v, money: true }) })) },
    { name: "R-T3 · OD66 skipped — a masked viewer's Start of both populations is counted", expect: [L.t3],
      impl: withCtrl((d) => ({ ...d, audienceRefusal: () => null })) },
    { name: "R-T5 · Resume forgets the re-queue — the HELD rows stay parked", expect: [L.t5],
      impl: withCtrl((d) => ({ ...d, recipients: { ...d.recipients, requeueHeld: async () => 0 } })) },
    { name: "R-T6 · Resume priced on a figure, not the counts — a list longer than confirmed resumes", expect: [L.t6],
      impl: withCtrl((d) => ({ ...d, resumeCheck: (c, counts) => d.resumeCheck(c, { ...CS.zeroRecipientStatusCounts(), PENDING: counts.PENDING + counts.HELD }) })) },
    { name: "R-T6b · Resume's copy advice ignores the floor — a masked viewer of a small list learns whether anybody was messaged", expect: [L.t6],
      impl: withCtrl((d) => ({ ...d, reach: (c, counts) => LIVE.liveReach(c, counts, true) })) },
    { name: "R-T8 · the copy widens to the whole book — the audience never travels, the address is empty", expect: [L.t8],
      impl: withCtrl((d) => ({ ...d, travel: () => ({ ok: true, params: {}, filter: AUD.WHOLE_BOOK }) })) },
    { name: "R-D1 · the dispatcher reaps nothing — a stranded claim stays stranded on mount", expect: [L.d1, L.d5],
      impl: withCtrl((d) => ({ ...d, reap: async () => ({ ...ZERO_REAP }) })) },
    { name: "R-D2 · the single-flight bypassed — every step takes a flight of its own", expect: [L.d2],
      impl: withCtrl((d) => ({ ...d, flights: () => freshFlights() })) },
    { name: "R-D3 · the step trusts the caller to have gated it — a view-only viewer's step runs", expect: [L.d3],
      impl: { step: (id, v, d) => CTRL.campaignStep(id, { ...v, mayAct: true }, d) } },
    { name: "R-W1 · a client component value-imports the services (U47b-2's client before its action exists)", expect: [L.w1],
      impl: withSources({ src: new Map([...REAL_SOURCES.src, ["src/app/admin/campaigns/[id]/live-client.tsx", `"use client";${NL}import { campaignStep } from "@/lib/server/marketing/campaign-control";${NL}export const s = campaignStep;`]]) }) },
    { name: "R-W1b · the services grow an action — an exported *Action in campaign-control.ts", expect: [L.w1],
      impl: () => withSources({ control: `${REAL_SOURCES.control}${NL}export async function startCampaignAction(id: string) { return id; }` }) },
    { name: "R-W1c · the services name a send of their own", expect: [L.w1],
      impl: () => withSources({ control: plantIn(REAL_SOURCES.control, "export async function stopCampaign(", "const viaWire = sendBatch;" + NL + "export async function stopCampaign(") }) },
    { name: "R-P1 · a Start refusal's object reaches the answer (its figures for every role)", expect: [L.p1],
      impl: { start: async (id, a, d) => { const r = await CTRL.startCampaign(id, a, d); return r.ok ? r : ({ ...r, refusal: { costTzs: 10_800 } } as typeof r); } } },
  ];

  console.log(`RED CONTROL — each defect planted in memory must fail EXACTLY the claims it names${NL}`);
  let held = 0;
  const missed: string[] = [];
  for (const plant of plants) {
    reset();
    let built: Impl;
    try {
      built = { ...REAL, ...(typeof plant.impl === "function" ? plant.impl() : plant.impl) };
    } catch (err) {
      missed.push(plant.name);
      console.log(`  FAIL  ${plant.name} — the plant could not be built: ${String((err as Error)?.message ?? err)}`);
      continue;
    }
    await silently(() => runAssertions(built));
    const got = [...new Set(failed)].sort();
    const want = [...new Set<string>(plant.expect)].sort();
    if (json(got) === json(want)) {
      held++;
      console.log(`  held  ${plant.name}`);
    } else {
      missed.push(plant.name);
      const extra = got.filter((x) => !want.includes(x));
      const absent = want.filter((x) => !got.includes(x));
      console.log(`  FAIL  ${plant.name}${absent.length ? `${NL}        did not fail: ${absent.map((x) => x.slice(0, 70)).join(" | ")}` : ""}${extra.length ? `${NL}        also failed: ${extra.map((x) => x.slice(0, 70)).join(" | ")}` : ""}`);
    }
  }
  console.log(`${NL}RED CONTROL — ${held} of ${plants.length} proofs held${missed.length ? `; ${missed.length} FAILED` : ""}`);
  process.exitCode = missed.length === 0 ? 0 : 1;
}
