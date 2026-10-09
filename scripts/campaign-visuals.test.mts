/**
 * test:campaign-visuals — U47b's suite: THE LIVE CAMPAIGN PAGE (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.15; decisions
 * E10 · E22 · E23 · E24 · E25 · OD24 · OD26 · OD34 · OD41 · OD65 · OD66, and §4.15 decision 1 AS AMENDED).
 *
 * ⭐ U47b-1 BUILDS §svc — the services (`campaign-control.ts`) and the view-model (`campaign-live.ts`), with the words both
 * return (`src/app/admin/campaigns/[id]/live-copy.ts`); every claim there is DRIVEN on the memory twin, never read off a
 * screen. ⭐ U47b-2 BUILDS §page — the live page itself: its client, driver, six actions' guards and loads. Its claims
 * (V1 · V4–V11 · L2, below the list) are written in `scripts/lib/campaign-visuals-page.mts` and run HERE, in the same run, on
 * the same world with the same viewers, so one run and one red run cover both halves. ⭐ ITS REVIEW'S FIX ROUND adds §live —
 * V12–V16, in `scripts/lib/campaign-visuals-live.mts`, which EXECUTE what §page only read: the step door and its route, the
 * driver's and the presses' hooks (on `scripts/lib/hooks-host.mts`, a minimal hooks host with a fake clock), the page's
 * decisions and its one live region, and the dev seed. A hook's plant is its file's SOURCE with one defect, compiled and run.
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
 *   S10 ⛔ E23 · WHY IT PAUSED, BELOW THE FLOOR — one sentence for every engine reason (the U47b-1 review);
 *   S11 ⛔ E23 · THE WAITS AS SAID — every wait in its own words; below the floor one sentence (its re-review);
 *   T1  Start through the REAL check · T2 ⭐ every U49a Start refusal reaches its sentence · T3 ⭐ OD66 at Start ·
 *   T4  Pause · T5 ⭐ Resume's re-queue, inside the step flight · T6 ⭐ Resume's count-based refusals · T7 Stop (E25) ·
 *   T8  ⭐ Make a copy · T9 the lost races and the record (ruling 543);
 *   D1  the step dispatcher (§3.3) · D2 ⭐ its single-flight per campaign, for every step · D3 act-gated, every act too ·
 *       D4 ⭐ end to end on the memory twin (Start → enqueue → a slice on a stub wire → DONE) · D5 the reaper on mount;
 *   §page (U47b-2, `scripts/lib/campaign-visuals-page.mts`):
 *   V1  ⛔ every figure on the page is a view-model field — no arithmetic on a count in the browser, no timer-driven bar;
 *   V4  ⭐ the controls exist in every state — all five drawn in all seven statuses, each disabled WITH its reason;
 *   V5  ⭐ every action's guard is its first statement (the poll's is the VIEW grant), the view guard executed on the roles;
 *   V6  ⭐ the driver, executed — every gap, the mount's one step, a thrown call ends the loop and is never retried;
 *   V7  ⛔ E23 · the floor hides the split on the page · V8 ⛔ OD24 · no TZS on a GROWTH page · V9 the screens flag is the page ·
 *   V10 the page gate's shape (admin-section-gate §0b′) · V11 the load and every act's answer, Resume's one retry after busy ·
 *   L2  the viewer is the STORED role's, failing closed;
 *   §live (the review's fix round, `scripts/lib/campaign-visuals-live.mts`):
 *   V12 ⭐ the step DOOR (POST /api/admin/campaigns/<id>/step) — POST only, never cross-site, the guard first, the stored role,
 *       the service's own answer as JSON, a typed answer for every failure, no-store — and the route that wraps it;
 *   V13 ⭐ the driver's HOOK executed — the cadence, the development double-run's one step, a page that left, a flip, Try again;
 *   V14 ⭐ the PRESSES executed — no double press, Stop pressable beside a pending Pause, a warning's toast that stays, a copy
 *       that never takes a driving page away;
 *   V15 ⭐ what the page says and when — the decisions, every disabled control described in words, one live region;
 *   V16 ⭐ the dev seed — the busy hold re-entrant, the rail guard, every sentence the drive asserts served;
 *   W1  the wiring — who imports the services (the actions alone), no send named, the doors by identity; P1 ⛔ no phone number,
 *       no refusal object (the page's markup too); P2 ⛔ no figure and no cursor in a step answer (the U47b-1 review);
 *   §R (U48a, `scripts/lib/campaign-visuals-results.mts`) — THE RESULTS ON THE LIVE PAGE (ENGINE-SPEC §4.16):
 *   R1  ⭐ `accepted` is never delivered — only a receipt, through the real DLR route, moves "Delivered" (OD41);
 *   R2  the honesty line, rendered from the data — present with no receipt, gone after one; R3 the 15-minute figure counts the rows
 *       still SENT and handed over before the cutoff and nothing else (E5); R4 ⭐ stopped-since attribution (E30);
 *   R5  the reasons are U38b's five buckets, protected one line, for every role; R6 ⛔ E23 · the floor — no results below it;
 *   R7  whether receipts are set up is the DLR route's own rule; R8 ⛔ OD24 · the price line for a money reader only;
 *   R9  the failed split, no answer and what is left, agreeing with the figures; R10 the stop walk and its cost;
 *   R11 the card; R12 the wiring; R13 the reasons are printed once (the results card's, never the figures card's as well);
 *   R14 ⭐ every way a person stops counts, a number once, only a stop in force, and erasure-blind (E30 as re-ruled
 *       2026-10-09; X22); R15 ⭐ the platform's own writers move it, and the real erasure adds nobody and takes nobody out.
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
/** `--only=<text>` runs the plants whose name holds the text — a SUBSET, said as one on the verdict line; the full run is the proof. */
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice("--only=".length);

const CTRL = await import("../src/lib/server/marketing/campaign-control.ts");
const LIVE = await import("../src/lib/server/marketing/campaign-live.ts");
const COPY = await import("../src/app/admin/campaigns/[id]/live-copy.ts");
const CS = await import("../src/lib/marketing/campaign-status.ts");
const SC = await import("../src/lib/server/marketing/start-check.ts");
const ENQ = await import("../src/lib/server/marketing/enqueue.ts");
const ENGINE = await import("../src/lib/server/marketing/engine.ts");
const RULES = await import("../src/lib/marketing/engine-rules.ts");
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
// U47b-2 · THE PAGE'S CLAIMS (V1 · V4–V11 · L2) live in a library beside this suite and run in this run — on this world, with
// these viewers — so one run and one red run cover both halves. ⛔ Imported here, after the store is chosen above, never
// statically: a static import would load the store before this file's first line ran.
const PAGE = await import("./lib/campaign-visuals-page.mts");
// U47b-2 · THE REVIEW'S FIX ROUND (V12–V16): the step door, the driver's and the presses' hooks executed on a minimal hooks host,
// the page's decisions and live region, the dev seed — `scripts/lib/campaign-visuals-live.mts`, run in this run as well.
const LV = await import("./lib/campaign-visuals-live.mts");
// U48a · THE RESULTS' CLAIMS (R1–R12) live beside the page's, for the same reason, and run in this run too.
const RESULTS = await import("./lib/campaign-visuals-results.mts");

type PageImpl = import("./lib/campaign-visuals-page.mts").PageImpl;
type ResultsImpl = import("./lib/campaign-visuals-results.mts").ResultsImpl;
type LiveViewer =import("../src/lib/server/marketing/campaign-live.ts").LiveViewer;
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
  ...PAGE.LABELS,
  ...LV.LIVE_LABELS,
  ...RESULTS.LABELS,
  c0: "C0 · CONTROLS — the memory twin and the console rail; a fixture campaign walks DRAFT → CONFIRMED → PREPARING → RUNNING → PAUSED / DONE / CANCELLED through the ONE transition door; the ONE groupBy (countByOutcome) answers a seeded list as written here by hand — merged, none dropped, one order — and its sum per status is countByStatus's; a tag audience and a sub-minute window both read at the campaign's door, and only the tag can be written as an address",
  v2: "V2 · ⭐ HELD IS OUTSTANDING (the plan's RED) — a RUNNING campaign of 4 SENT and 6 HELD reads progress 4 of 10 and 'Sending — 4 of 10 done.', 6 waiting and 4 handed over — never 10 of 10; an empty RUNNING campaign paints NO bar (progress null, 'Sending.'), and a CONFIRMED one none either",
  v3: "V3 · ⭐ THE COUNTS FROZEN SERVER-SIDE (OD34, the plan's RED) — two views of an unchanged campaign ten seconds apart carry the same bar, KPIs, chips, reasons, headline and controls byte for byte (only readAt moved, by ten seconds); one more row settled moves the bar by exactly one",
  s1: "S1 · ONE GROUPBY (decision 8, OD26) — a view asks countByOutcome exactly ONCE and no other count; over a list holding every status the KPIs partition the rows (waiting = PENDING + HELD, handed over = SENT + DELIVERED, failed, not sent = SKIPPED, no answer = UNCONFIRMED — summing to On campaign) and the chips are each status with rows, in the schema's order, in RECIPIENT_STATUS_LABEL's words",
  s2: "S2 · U38b's FIVE WORDS — skipped rows across every gate reason read under 'Not sent' in AUDIENCE_REASON_LABEL's five words, PROTECTED ONE LINE (the six RG, age and account reasons together), no_basis beside no_consent, dominant first with ties in U38b's order, then 'Can't be sent to' and an unworded refusal only because there is one of each — adding up to 'Not sent', for a reader and a masked viewer alike above the floor — and no gate reason's key anywhere in the view",
  s3: "S3 · ⛔ E23 · THE FLOOR — a masked viewer on a campaign of 9 rows sees On campaign 9 and NOTHING split (every other KPI null, no reasons, no chips) and the floor's sentence; at 10 rows everything; a reader at 9 everything; and the floor counts ROWS — a campaign confirmed for 50 whose list holds 9 is floored",
  s4: "S4 · ⛔ OD24 · MONEY ONLY FOR A MONEY READER — a money reader's view carries the frozen estimate and limit and a Start dialog 'It can cost up to TZS 9,624 of the TZS 10,000 limit'; a GROWTH viewer's carries money null, a dialog 'It uses up to 1,604 SMS' and NO 'TZS' anywhere in the whole view",
  s5: "S5 · THE HEADLINES AND WHY IT STOPPED — every status in the spec's words (DRAFT, CONFIRMED, PREPARING 'N of M people written', RUNNING 'N of M done', PAUSED 'Paused.', DONE 'Finished — nobody on this campaign is left to message.' — true beside a 'No answer' too, CANCELLED 'Stopped by <name> at HH:MM EAT — N people were not messaged.' from the stop's own audit row and resumeOutstanding, said ONCE with no stop sentence beside it — a stop before Start leaves everyone confirmed unmessaged, a stop with nobody left reads '— nobody on it was left to message.'); an officer's pause names them and the time — from ITS row, never an older one by a real officer of another name (the re-review); an engine's pause says stopReasonLabel's words; the confirmation names its officer",
  s6: "S6 · THE CONTROLS — all five exist in every one of the seven statuses, each disabled with a reason and enabled exactly where §4.15 says (Start CONFIRMED · Pause PREPARING, RUNNING · Resume PAUSED · Stop any non-terminal · Make a copy any non-DRAFT); a view-only viewer has every one disabled with the role's reason; a closed switch disables Start 'Marketing SMS are switched off.' and drops its dialog; OD66 disables Start for a masked viewer on both populations; an audience no address can write disables Make a copy in its own words",
  s7: "S7 · THE STANDING FACTS — the switch through THE gate (the console stub open; a Blackball rail with the switch closed shut, with it open open until its closing time); the window is the view's window; lastStepAt the newest claim; nobody driving for a RUNNING campaign with no claim or one 91 s old, not at 89 s, never for a paused one, never while the engine waits — the window shut, money busy or a money signal that throws, a code failed within two minutes either side of now (the engine's ONE reading, otpFailureWaiting); ⭐ the U47b-2 review's MINOR 5: a PREPARING campaign is driven by CHUNKS — no chunk written for 91 s (the row's updatedAt, which is also its last step) is nobody preparing, 89 s is not, and a shut window excuses nothing; keep this page open only for an acting viewer of PREPARING or RUNNING",
  s9: "S9 · THE AUDIENCE IN WORDS, AS THE LIST SAYS IT — the list's ONE role-shaped describer (campaignRowAudience) and its words: a tag in describeAudience's phrase, the whole book 'Everyone in the contact book', a consent filter 'Consent: given' to a reader and hidden from a masked viewer, both populations hidden from a masked viewer, a stored filter that cannot be read said so — never a phone number",
  s8: "S8 · ⛔ THE COPY ADVICE — once anybody on a campaign was messaged, its copy-advising pause sentences (audience_unreadable, template_invalid) and the Stop dialog say a copy would message them again, as a FACT; with nobody messaged, the spec's own words; under the floor the SAME conditional words whether or not anybody was messaged; and a campaign that never ran reads the spec's words for every viewer",
  s10: "S10 · ⛔ E23 · WHY IT PAUSED, BELOW THE FLOOR (the U47b-1 review) — a masked viewer of a campaign of 9 rows reads ONE sentence (LIVE_PAUSED_HIDDEN) for EVERY engine reason — the network's no and its silence, a send failed on our side, the last check unanswered, too slow to send, both credit floors, the provider unset, held rows, the switch, the credit unread, a list longer than confirmed found while sending, the confirmation unreadable, the settings, the sizes or the price unread, the provider unrecognised, an unknown key — while the four copy-advising reasons keep their conditional words and an officer's pause names who; FLOOR_SAFE_STOP_REASONS is exactly those six keys; a viewer who may only VIEW reads the sentence without 'press Resume' (LIVE_PAUSED_HIDDEN_VIEW); a reader at 9 rows and a masked viewer at 10 read each reason's own words; and the view says it through the ONE function the list will use (pausedReasonSentenceFor)",
  s11: "S11 · ⛔ E23 · THE WAITS AS SAID (the U47b-1 re-review) — every wait the engine answers (SliceWait, read from its own type) has its OWN sentence, never 'engine reason:' — slice_too_slow included; a step answer's wait carries busy and until alone; below the floor a masked viewer reads ONE sentence (LIVE_WAIT_HIDDEN) for every wait but busy, while a reader at 5 rows and a masked viewer at 10 read each wait's own",
  t1: "T1 · START through the REAL check (the console stub) — a confirmed tag audience moves CONFIRMED → PREPARING with startedAt; ONE ADMIN marketing.campaign_started row by the officer { count, estimateSegments, freshCount, shrunkBy }; the answer LIVE_DONE.start, recorded; no recipient row written (the enqueue is the step's) and no refusal row",
  t2: "T2 · ⭐ START'S REFUSALS WIRED — every U49a Start reason (the source's own case list, each answered by a stand-in check) is refused in EXACTLY startRefusalSentence(r, viewer) — TZS for a money reader, none for anyone else — the campaign still CONFIRMED, ONE start_refused row per refusal whose payload is the reason, plus the figures for the money reasons alone (the rail's problem for rail_dead) and never a count; and the REAL check refuses a RUNNING campaign not_confirmed",
  t3: "T3 · ⭐ OD66 AT START — a masked viewer on a book ∪ players campaign is refused audience_refused in START_AUDIENCE_REFUSED's words BEFORE anything is counted (the check never asked), ONE start_refused row { reason, param: pop }; a reader on the same campaign reaches the check, and so does a masked viewer on a book audience",
  t4: "T4 · PAUSE — PREPARING and RUNNING → PAUSED officer_paused with pausedAt, ONE ADMIN row of the engine's ONE spelling of marketing.campaign_paused { reason: officer_paused } by the officer, the answer LIVE_DONE.pause for a RUNNING campaign (a group already being sent may still go out) and LIVE_DONE.pauseBeforeSending for one still PREPARING (nothing has been sent, so no group can be on its way); CONFIRMED, DONE and a DRAFT refused in their words with no row; a second Pause 'already paused'",
  t5: "T5 · ⭐ RESUME'S RE-QUEUE (E8), INSIDE THE STEP FLIGHT (the U47b-1 review) — a paused campaign whose list finished, holding 3 HELD rows: ONE move to RUNNING (stopReason cleared), THEN they start over (PENDING, attempts 0, the hold's class cleared), ONE ADMIN marketing.campaign_resumed row { requeuedHeld: 3, to: RUNNING } and 'Sending again.'; a step asked while Resume works answers busy and runs nothing; a Resume while another step holds the flight is refused busy with nothing read or changed; a Resume that loses its race to a Stop touches no row; a re-queue that fails still answers the Resume that landed (requeuedHeld null) and says the held people stay parked; a Stop landing between the move and the re-queue is said (resumed, then stopped), never 'Sending again.'; a list that never finished resumes to PREPARING with its own toast; ⭐ the check of 980e2ee7: a Pause or the end landing after the move is said in its own words (resumed, then paused · resumed and finished); a read after the move that fails still answers the Resume that landed, in its own words; the held people's failure is said only when some are HELD, and below the floor as a condition for HELD and none alike (E23) — the plain words at ten rows",
  t6: "T6 · ⭐ RESUME'S COUNT-BASED REFUSALS — U49a's refusal fed the store's COUNTS: a list longer than confirmed under an OFFICER's pause is refused list_over_confirmed (the switch closed and the console stub alike) with nothing re-queued, the campaign still PAUSED and no resumed row; with someone already messaged its words say a copy would message them again; ⛔ E23 · a masked viewer below the floor reads the SAME conditional words whether or not anybody was messaged; an engine's copy-only pause (audience_moved) is refused first, before the switch; a list within its count resumes",
  t7: "T7 · STOP (E25) — CONFIRMED, PREPARING, RUNNING and PAUSED each → CANCELLED officer_stopped with finishedAt, ONE ADMIN marketing.campaign_stopped row { outstanding } = what was left (resumeOutstanding), the answer LIVE_DONE.stop for a campaign that had begun sending (RUNNING, or PAUSED after its list was finished) and LIVE_DONE.stopBeforeSending — no group to warn of — for one that had not (the U47b-2 review's NIT), and EVERY row untouched; DONE, CANCELLED and a DRAFT refused with no row",
  t8: "T8 · ⭐ MAKE A COPY — a NEW DRAFT by the officer through the composer's one save: the same message, the same audience (the same canonical key), the name '<name> (copy)', ONE marketing.campaign_created and ONE marketing.campaign_copied { from, to }, the composer's address; once anybody was messaged its answer says the copy messages them again; REFUSED in its own words with NOTHING made for an audience no address can write and for a masked viewer on both populations; a DRAFT refused; ⭐ the name at the composer's 80 characters — one that fits takes ' (copy)', one that would not keeps itself, an untitled one reads 'Untitled campaign (copy)'; the draft door's refusal of the MESSAGE (message_cannot_travel, its problem in words) and a source line it could not read (source_unreadable, the door's words) each make nothing",
  t9: "T9 · THE LOST RACES AND THE RECORD — a Start that loses to another officer's Start says it was started a moment ago, one that loses to a Stop says it was stopped (each ONE start_refused row { reason: not_confirmed }, no started row); a Pause that loses to the engine's own pause says already paused and writes no row; a Stop that loses to another Stop says it has already finished or stopped and writes no row; a Start of a campaign that is not there writes ONE start_refused row with NO target; and ruling 543 — a Pause whose audit row cannot be written (the door throws, or answers not recorded) still lands, answered recorded false with LIVE_NOT_RECORDED beside its sentence",
  d1: "D1 · THE STEP DISPATCHER (§3.3) — PREPARING: the reaper, then ONE enqueue chunk; RUNNING: ONE slice; PAUSED, CANCELLED, DONE: the reaper alone (kind reaped); DRAFT and CONFIRMED: nothing (idle); each answer carries the view of that campaign, and a wait carries its own sentence",
  d2: "D2 · ⭐ SINGLE-FLIGHT PER CAMPAIGN (decision 1 as amended) — two steps of one PREPARING campaign at once never overlap: the second answers waiting busy and its enqueue never runs; ⭐ the same for a RUNNING campaign's slice and a PAUSED campaign's reap; two DIFFERENT campaigns step at once; the flight is released after a step and after a step that throws; a flight older than ten minutes, or dated ten minutes AHEAD, no longer holds — a fresh one, or one a minute ahead, does; and production's flights live on globalThis",
  d3: "D3 · ACT-GATED — a view-only viewer's step is refused 'role' and runs nothing (no read, no enqueue, no slice, no reap); ⭐ so is every ACT of a view-only actor — Start, Pause, Resume, Stop and Make a copy each refused 'role' in the role's words before anything is read (no campaign read, nothing moved, no row); a campaign that is not there answers not_found",
  d4: "D4 · ⭐ END TO END on the memory twin — a confirmed tag audience of 6 (4 consenting players' book rows, 2 contacts with no consent): Start → a PREPARING step writes 6 rows and finishes RUNNING → a RUNNING step's slice hands 4 over on the STUB wire and refuses 2 (no consent) → the next step finishes DONE; each view says so (the bar 6 of 6, 'Not sent' 2 under 'No consent or recorded basis'); one wire call, no SmsMessage row for the campaign",
  d5: "D5 · THE REAPER ON MOUNT — a PAUSED campaign holding a claim stranded 11 minutes with no message: one step reaps it back to PENDING (attempts + 1, the claim cleared) — kind reaped 1 — and writes ONE SYSTEM marketing.campaign_reaped row",
  w1: "W1 · THE WIRING — CONTROL_DEPS and LIVE_VIEW_DEPS frozen and wired to the REAL doors by identity; the officer's pause writes the ONE spelling the engine and the enqueue write and the view reads; no directive and no exported *Action in the three files; campaign-control is value-imported by the two doors that call it — the actions file and the step door (the driver's step is a guarded route since the U47b-2 review's MAJOR) — and nothing else, campaign-live by those actions, their loader and act runner, the services and the campaigns list, live-copy by the readers of its words (the page's decisions, the door and the drive's dev seed among them) and nothing else; the services name no send; live-copy reaches the server for a type alone; test:/red:campaign-visuals resolve to this file, and predeploy runs the suite exactly once",
  p2: "P2 · ⛔ THE STEP ANSWER CARRIES NO FIGURE AND NO CURSOR (the U47b-1 review's MAJOR) — every step answer of the run, for every role, holds only kind, busy, until and status: no count, no cursor and ⭐ no reason (its re-review — a pause's or a wait's key named what the floor hides), so a padded tag below the floor never reads one person's gate verdict off a step",
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
/** ⭐ A recipient row's bare key, unique per (run, row): `2557`, the run in three digits, the row in five. (The first build wrote
 *  `keyOf("71", run * 100_000 + row)`, which grew a 13th digit at run 100 — and a red run is one run per plant plus the baseline,
 *  so the suite ran out of runs once it held ~100 plants. Three digits hold 999.) */
const rowKeyOf = (run: number, row: number): string => `2557${String(run).padStart(3, "0")}${String(row).padStart(5, "0")}`;
/** ⭐ U48a · THE ROW PART COUNTS THE WORLD'S ROWS, not its calls × 1000. With the results' claims a world seeds well over a hundred
 *  lists, and `base + i` (the call's number times a thousand) grew a sixth digit at the hundredth call — a 13-digit number that
 *  `isGatewayMsisdn` refuses. A dense per-world counter keeps every row of a world unique and well inside the five digits. */
const ROWS_SEEDED = new Map<number, number>();
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
  /** U48a · the hand-over instant, the gateway's reference and the person's number — what the results' claims read. */
  sentAt?: string; smsReference?: string; msisdn?: string;
};
/** Rows on a campaign through the ONE seed door, then set to the shapes asked (the store's own map — a fixture only). */
async function rows(w: World, campaignId: string, shapes: readonly RowShape[]): Promise<string[]> {
  const base = ++w.n * 1000;
  const first = ROWS_SEEDED.get(w.run) ?? 0;
  ROWS_SEEDED.set(w.run, first + shapes.length);
  const at = iso(T_NOW - 20 * MIN);
  const seeds = shapes.map((_, i) => ({
    id: `rcp_u47b1_${w.run}_${base + i}`, campaignId, msisdn: shapes[i].msisdn ?? rowKeyOf(w.run, first + i), contactId: null, userId: null,
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
      claimToken: s.claimToken ?? null, attempts: s.attempts ?? 0, sentAt: s.sentAt ?? null, smsReference: s.smsReference ?? null,
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
const actorOf = (w: World, o: { reads: boolean; money: boolean }): ControlActor => ({ userId: w.officer, mayAct: true, reads: o.reads, money: o.money });

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
  if (/campaign-control|campaign-live|live-copy|live-step-door/.test(raw)) NAMING.set(relOf(abs), decomment(raw.split(CR).join("")));
}
const CONTROL_REL = "src/lib/server/marketing/campaign-control.ts";
const LIVE_REL = "src/lib/server/marketing/campaign-live.ts";
const COPY_REL = "src/app/admin/campaigns/[id]/live-copy.ts";
const ACTIONS_REL = "src/app/admin/campaigns/[id]/actions.ts";
const LIVE_RUN_REL = "src/app/admin/campaigns/[id]/live-run.ts";
const LIVE_LOADER_REL = "src/app/admin/campaigns/[id]/live-loader.ts";
const LIVE_CLIENT_REL = "src/app/admin/campaigns/[id]/live-client.tsx";
const RESULTS_CARD_REL = "src/app/admin/campaigns/[id]/results-card.tsx";
const LIVE_PAGE_REL = "src/app/admin/campaigns/[id]/page.tsx";
const LIST_PAGE_REL = "src/app/admin/campaigns/page.tsx";
const LIVE_SEED_REL = "src/app/api/dev-test/marketing-live-seed/route.ts";
const LIVE_DOOR_REL = "src/app/admin/campaigns/[id]/live-step-door.ts";
const STEP_ROUTE_REL = "src/app/api/admin/campaigns/[id]/step/route.ts";
const LIVE_DECIDE_REL = "src/app/admin/campaigns/[id]/live-decide.ts";
const LIVE_PRESSES_REL = "src/app/admin/campaigns/[id]/live-presses.ts";
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
  /** U47b-2 · the page — its client, driver, actions' guards and loads (`scripts/lib/campaign-visuals-page.mts`). */
  page: PageImpl;
  /** U48a · the results — the card, the walk, the receipts' rule (`scripts/lib/campaign-visuals-results.mts`). */
  results: ResultsImpl;
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
  page: PAGE.REAL_PAGE,
  results: RESULTS.REAL_RESULTS,
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
    // ⭐ the U47b-1 re-review · the older row is a REAL officer's, with a name of their own — a vacuous pin read "an officer"
    // for a user who did not exist, whatever the `since` rule did.
    const juma = `usr_u47b1_juma_${w.run}`;
    const atJ = iso(T_NOW - 86_400_000);
    await Promise.resolve(db.user.create({
      id: juma, phoneE164: `+${keyOf("69", 8_000_000 + w.run)}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: "GROWTH", status: "ACTIVE", locale: "SW", displayName: "Juma", dob: "1990-01-01", region: null,
      acceptedTermsVersion: "v1", acceptedTermsAt: atJ, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      createdAt: atJ, updatedAt: atJ, lastLoginAt: atJ, closedAt: null,
    } as StoredUser));
    const olderAct = { id: "aud_u47b1_old", category: "ADMIN", action: LIVE.OFFICER_PAUSED_ACTION, actorId: juma, targetType: "SmsCampaign",
      targetId: toPause.id, payload: { reason: "officer_paused" }, createdAt: iso(Date.parse(paused.pausedAt ?? "") - 2 * 60 * MIN), prevHash: "x", entryHash: "y" };
    const lost = await viewOf(impl, toPause.id, READER, { actsOn: async () => [olderAct] as never });
    // …and the CONTROL: dated at the act, the same row names Juma (the pin can see a name)
    const current = await viewOf(impl, toPause.id, READER, { actsOn: async () => [{ ...olderAct, createdAt: paused.pausedAt }] as never });
    // ⭐ the U47b-1 review · DONE beside a "No answer", and a stop with nobody left: words true of both
    const doneUnanswered = await campaign(w, "s5u", { path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], count: 10 });
    await rows(w, doneUnanswered.id, [...many(8, { status: "SENT" }), ...many(2, { status: "UNCONFIRMED" })]);
    const duv = await viewOf(impl, doneUnanswered.id, READER);
    const settledStop = await campaign(w, "s5z", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 4 });
    await rows(w, settledStop.id, [...many(3, { status: "SENT" }), { status: "UNCONFIRMED" }]);
    seen(await impl.stop(settledStop.id, reader, d));
    const zv = await viewOf(impl, settledStop.id, READER);
    const checks = {
      draft: draft.headline === COPY.LIVE_HEADLINE.DRAFT && draft.confirmed === null && draft.stopSentence === null,
      confirmed: conf.headline === "Ready to start — nothing has been sent." && conf.confirmed?.count === 12 && conf.confirmed?.byName === OFFICER_NAME,
      preparing: pv.headline === "Preparing the list — 5 of 12 people written." && pv.stopSentence === null,
      running: rv.headline === "Sending — 7 of 12 done." && rv.stopSentence === null,
      officerPause: ov.headline === "Paused." && ov.stopSentence === `Paused by ${OFFICER_NAME} at ${at(paused, "pausedAt")} EAT.`,
      enginePause: engine.headline === "Paused." && engine.stopSentence === CS.stopReasonLabel("gateway_refused"),
      done: done.headline === "Finished — nobody on this campaign is left to message."
        && duv.headline === done.headline && duv.kpis.noAnswer === 2,
      stopped: sv.headline === `Stopped by ${OFFICER_NAME} at ${at(stopped, "finishedAt")} EAT — 8 people were not messaged.`
        && sv.stopSentence === null,
      early: ev.headline.endsWith("— 12 people were not messaged.") && ev.stopSentence === null,
      nobodyLeft: zv.headline.endsWith("— nobody on it was left to message.") && zv.headline.startsWith(`Stopped by ${OFFICER_NAME}`),
      // ⭐ the U47b-1 review · the current pause's row LOST, an older officer's row there: never that officer's name — and
      // (its re-review) the control: the same row dated at the act names Juma, so the pin can tell
      lostRow: lost.stopSentence === COPY.officerPausedSentence(COPY.LIVE_SOMEBODY, paused.pausedAt) && !(lost.stopSentence ?? "").includes("Juma")
        && current.stopSentence === COPY.officerPausedSentence("Juma", paused.pausedAt),
    };
    return [Object.values(checks).every(Boolean), `${json(checks)} · "${ov.stopSentence}" · "${sv.headline}" · lost row: "${lost.stopSentence}" · at the act: "${current.stopSentence}"`];
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
    // ⭐ the U47b-1 review · never "nobody driving" while the engine would be WAITING: the window shut (every night), money
    // busy, a login code failed in the last two minutes — the same 91 s of quiet, each wait on its own
    if (newest !== undefined) newest.claimedAt = iso(T_NOW - 91_000);
    const night = await viewOf(impl, c.id, READER, { window: () => ({ ...WIN.ALWAYS_OPEN(), open: false }) });
    const busy = await viewOf(impl, c.id, READER, { moneyBusy: () => ({ busy: true, stale: [] }) });
    const otp = await viewOf(impl, c.id, READER, { otpLastFailureAt: () => T_NOW - 30_000 });
    const otpOld = await viewOf(impl, c.id, READER, { otpLastFailureAt: () => T_NOW - 3 * MIN });
    // ⭐ the U47b-1 re-review · the engine's ONE reading (④e): a failure dated AHEAD of the clock waits within two minutes
    // and not past them; and a money signal that THROWS is busy (the view still renders), as the engine reads it
    const otpAhead = await viewOf(impl, c.id, READER, { otpLastFailureAt: () => T_NOW + 30_000 });
    const otpFarAhead = await viewOf(impl, c.id, READER, { otpLastFailureAt: () => T_NOW + 3 * MIN });
    const moneyDown = await viewOf(impl, c.id, READER, { moneyBusy: () => { throw new Error("the money signal is down (fixture)"); } });
    const waits = !night.standing.nobodyDriving && !busy.standing.nobodyDriving && !otp.standing.nobodyDriving && otpOld.standing.nobodyDriving
      && !otpAhead.standing.nobodyDriving && otpFarAhead.standing.nobodyDriving && !moneyDown.standing.nobodyDriving;
    const p = await campaign(w, "s7p", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"] });
    const pv = await viewOf(impl, p.id, READER);
    const watch = await viewOf(impl, c.id, WATCHER);
    const keep = stub.standing.keepOpen && !watch.standing.keepOpen && !pv.standing.keepOpen && !pv.standing.nobodyDriving;
    // ⭐ The U47b-2 review's MINOR 5 · a PREPARING campaign is driven by CHUNKS (nothing is claimed before RUNNING): no chunk for
    // 90 s is "nobody preparing", as RUNNING's no claim for 90 s is "nobody sending", and its last step is the last chunk. The
    // engine's waits do not excuse it — the enqueue waits for nothing, so a shut window changes no answer here.
    const prep = await campaign(w, "s7q", { path: ["CONFIRMED", "PREPARING"], count: 12 });
    const prepRow = mem().smsCampaigns.get(prep.id);
    if (prepRow !== undefined) prepRow.updatedAt = iso(T_NOW - 91_000);
    const prepOld = await viewOf(impl, prep.id, READER);
    const prepNight = await viewOf(impl, prep.id, READER, { window: () => ({ ...WIN.ALWAYS_OPEN(), open: false }) });
    if (prepRow !== undefined) prepRow.updatedAt = iso(T_NOW - 89_000);
    const prepFresh = await viewOf(impl, prep.id, READER);
    const preparing = prepRow !== undefined && prepOld.standing.nobodyDriving && prepOld.standing.lastStepAt === iso(T_NOW - 91_000)
      && prepNight.standing.nobodyDriving && !prepFresh.standing.nobodyDriving && prepFresh.standing.lastStepAt === iso(T_NOW - 89_000);
    return [switchFacts && windowFact && noClaim && driving && keep && waits && preparing,
      `switch ${switchFacts} · window ${windowFact} · no claim ${noClaim} · 91 s ${old.standing.nobodyDriving} / 89 s ${fresh.standing.nobodyDriving} · keep open ${keep} · PREPARING: no chunk for 91 s ${prepOld.standing.nobodyDriving} (window shut ${prepNight.standing.nobodyDriving}) / 89 s ${prepFresh.standing.nobodyDriving} · the engine's waits: night ${night.standing.nobodyDriving}, money ${busy.standing.nobodyDriving}, a code 30 s ago ${otp.standing.nobodyDriving}, 3 min ago ${otpOld.standing.nobodyDriving}, 30 s ahead ${otpAhead.standing.nobodyDriving}, 3 min ahead ${otpFarAhead.standing.nobodyDriving}, money signal down ${moneyDown.standing.nobodyDriving}`];
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
      && rv.stopDialog.body.includes("everyone it reaches — including, again, the people this campaign already messaged")
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

  /* ── S10 · ⛔ why it paused, below the floor ── */
  await claim(L.s10, async () => {
    const PAUSED_PATH: SmsCampaignStatus[] = ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"];
    // ⭐ its re-review: every engine reason §3.4 lists, the credit check's causes and the confirmation included
    const ENGINE_REASONS = [
      "gateway_refused", "gateway_unanswered", "send_error", "before_send_unanswered", "slice_too_slow", "BALANCE_FLOOR", "MARKETING_FLOOR",
      "NOT_CONFIGURED", "held_rows", "live_switch_closed", "credit_unreadable", "list_over_confirmed_sending", "an_unknown_reason",
      "confirmation_unreadable", "settings_unreadable", "sizes_unreadable", "price_unknown", "marketing_floor", "PROVIDER_UNRECOGNISED",
    ];
    const wrong: string[] = [];
    for (const [i, reason] of ENGINE_REASONS.entries()) {
      const small = await campaign(w, `s10s${i}`, { path: PAUSED_PATH, pausedFor: reason, count: 9 });
      await rows(w, small.id, [...many(4, { status: "SENT" }), ...many(5, { status: "PENDING" })]);
      const big = await campaign(w, `s10b${i}`, { path: PAUSED_PATH, pausedFor: reason, count: 10 });
      await rows(w, big.id, [...many(4, { status: "SENT" }), ...many(6, { status: "PENDING" })]);
      const own = CS.stopReasonLabel(reason);
      const masked = await viewOf(impl, small.id, GROWTH);
      const reader9 = await viewOf(impl, small.id, READER);
      const masked10 = await viewOf(impl, big.id, GROWTH);
      if (masked.stopSentence !== COPY.LIVE_PAUSED_HIDDEN) wrong.push(`${reason}: masked under the floor "${(masked.stopSentence ?? "null").slice(0, 36)}"`);
      if (reader9.stopSentence !== own || masked10.stopSentence !== own) wrong.push(`${reason}: not its own words for a reader or at ten`);
    }
    // the reasons found before anybody is checked keep their words under the floor (the copy advice as a condition)
    for (const [i, reason] of COPY.COPY_ADVISING_STOP_REASONS.entries()) {
      const small = await campaign(w, `s10c${i}`, { path: PAUSED_PATH, pausedFor: reason, count: 9 });
      await rows(w, small.id, [...many(4, { status: "SENT" }), ...many(5, { status: "PENDING" })]);
      const masked = await viewOf(impl, small.id, GROWTH);
      if (masked.stopSentence !== COPY.pausedReasonSentence(reason, "hidden")) wrong.push(`${reason}: lost its conditional words under the floor`);
    }
    const officer = await campaign(w, "s10o", { path: PAUSED_PATH, count: 9 });
    await rows(w, officer.id, [...many(4, { status: "SENT" }), ...many(5, { status: "PENDING" })]);
    const ov = await viewOf(impl, officer.id, GROWTH);
    const named = (ov.stopSentence ?? "").startsWith("Paused by ");
    // the ONE function the list will say it through: the view's sentence is its own, and production's deps hold it
    const probe = await campaignOf(`${w.cid("s10s0")}`);
    const counts = CS.outcomeStatusCounts(await db.smsCampaignRecipient.countByOutcome(probe.id));
    const one = LIVE.pausedReasonSentenceFor({ reads: false, mayAct: true }, probe, counts) === COPY.LIVE_PAUSED_HIDDEN
      && LIVE.pausedReasonSentenceFor({ reads: true, mayAct: true }, probe, counts) === CS.stopReasonLabel("gateway_refused")
      && LIVE.LIVE_VIEW_DEPS.rules.pausedReason === LIVE.pausedReasonSentenceFor;
    // ⭐ its re-review · a viewer who may only VIEW is never told to press Resume — through the view and the function alike
    const MASKED_WATCHER: LiveViewer = { userId: "usr_u47b1_masked_watcher", mayAct: false, reads: false, money: false };
    const watcherView = await viewOf(impl, probe.id, MASKED_WATCHER);
    const viewOnly = watcherView.stopSentence === COPY.LIVE_PAUSED_HIDDEN_VIEW && !COPY.LIVE_PAUSED_HIDDEN_VIEW.includes("Resume")
      && LIVE.pausedReasonSentenceFor({ reads: false, mayAct: false }, probe, counts) === COPY.LIVE_PAUSED_HIDDEN_VIEW;
    // ⭐ its re-review · the keys that keep their words are EXACTLY these six — a seventh needs a reason written in live-copy
    const six = json([...COPY.FLOOR_SAFE_STOP_REASONS].sort())
      === json(["audience_moved", "audience_unreadable", "list_over_confirmed", "officer_paused", "officer_stopped", "template_invalid"]);
    const neutral = [COPY.LIVE_PAUSED_HIDDEN, COPY.LIVE_PAUSED_HIDDEN_VIEW].every((x) => !/network|batch|credit|check|slow|switch/i.test(x));
    return [wrong.length === 0 && named && one && viewOnly && six && neutral,
      `wrong [${wrong.slice(0, 4).join("; ")}] · an officer's pause named ${named} · the one function ${one} · view-only ${viewOnly} · six safe keys ${six} · the sentences name no cause ${neutral}`];
  });

  /* ── S11 · ⛔ the waits as said ── */
  await claim(L.s11, async () => {
    // every wait the engine can answer, read from its own type — a wait added there without a sentence here is red
    const union = (code("src/lib/marketing/engine-rules.ts").match(/export type SliceWait =([^;]+);/) ?? ["", ""])[1];
    const WAITS = [...union.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
    const until = iso(T_NOW + 5 * MIN);
    const unworded = WAITS.filter((x) => COPY.waitSentence(x, until).startsWith("Waiting — engine reason:"));
    const small = await campaign(w, "s11s", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 5 });
    await rows(w, small.id, many(5, { status: "PENDING" }));
    const big = await campaign(w, "s11b", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 10 });
    await rows(w, big.id, many(10, { status: "PENDING" }));
    const wrong: string[] = [];
    for (const x of WAITS) {
      const d = ctrlDeps(impl, { slice: async () => ({ kind: "waiting", reason: x, until }) as never });
      const masked = seen(await impl.step(small.id, GROWTH, d));
      const reader5 = seen(await impl.step(small.id, READER, d));
      const masked10 = seen(await impl.step(big.id, GROWTH, d));
      const mine = COPY.waitSentence(x, until);
      const below = x === "busy" ? mine : COPY.LIVE_WAIT_HIDDEN;
      if (!masked.ok || masked.said !== below) wrong.push(`${x}: masked under the floor "${masked.ok ? (masked.said ?? "null").slice(0, 30) : masked.reason}"`);
      if (!reader5.ok || reader5.said !== mine || !masked10.ok || masked10.said !== mine) wrong.push(`${x}: not its own words for a reader or at ten`);
      if (masked.ok && json(masked.step) !== json({ kind: "waiting", busy: x === "busy", until })) wrong.push(`${x}: step ${json(masked.step)}`);
    }
    const neutral = !/network|batch|credit|check|slow|switch|window|money|code/i.test(COPY.LIVE_WAIT_HIDDEN);
    return [WAITS.length === 7 && unworded.length === 0 && wrong.length === 0 && neutral,
      `waits [${WAITS.join(",")}] · without their own words [${unworded.join(",")}] · wrong [${wrong.slice(0, 3).join("; ")}] · the hidden wait names no cause ${neutral}`];
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
    const landed = a.ok && b.ok && a.message === COPY.LIVE_DONE.pauseBeforeSending && b.message === COPY.LIVE_DONE.pause && pa.status === "PAUSED" && pb.status === "PAUSED"
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
    let meanwhile: Awaited<ReturnType<typeof CTRL.campaignStep>> | null = null;
    const stepCalls: string[] = [];
    const d: ControlDeps = {
      ...base,
      campaigns: { ...base.campaigns, transition: async (id, t) => { order.push(`transition:${t.to}`); return base.campaigns.transition(id, t); } },
      recipients: { ...base.recipients, requeueHeld: async (id, at) => { order.push("requeue"); return base.recipients.requeueHeld(id, at); } },
      // ⭐ a driver's step asked WHILE Resume works (between its read and its move): it must find the flight taken
      resumeCheck: async (cc, counts) => {
        meanwhile = await impl.step(cc.id, READER, { ...d, reap: async () => { stepCalls.push("reap"); return { ...ZERO_REAP }; }, slice: async () => { stepCalls.push("slice"); return { kind: "not_running", status: "PAUSED" }; } });
        return base.resumeCheck(cc, counts);
      },
    };
    const r = seen(await impl.resume(c.id, reader, d));
    const after = await campaignOf(c.id);
    const held = ids.slice(0, 3).map((id) => mem().smsCampaignRecipients.get(id));
    const restarted = held.every((x) => x !== undefined && x.status === "PENDING" && x.attempts === 0 && x.failureClass === null);
    const rowsNow = await auditOf(CTRL.CAMPAIGN_RESUMED_ACTION, c.id);
    const landed = r.ok && r.message === COPY.LIVE_DONE.resume && after.status === "RUNNING" && after.stopReason === null && restarted
      && json(order) === json(["transition:RUNNING", "requeue"]) && rowsNow.length === 1 && rowsNow[0].actorId === w.officer
      && json(rowsNow[0].payload) === json({ requeuedHeld: 3, to: "RUNNING" });
    const m = meanwhile as Awaited<ReturnType<typeof CTRL.campaignStep>> | null;
    const heldOff = m !== null && m.ok && m.step.kind === "waiting" && m.step.busy === true && stepCalls.length === 0;
    // a Resume while ANOTHER step holds the campaign's flight: busy — nothing read, nothing changed
    const busyC = await campaign(w, "t5b", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 10 });
    await rows(w, busyC.id, [...many(2, { status: "HELD", failureClass: "gate_unanswered", attempts: 3 }), ...many(8, { status: "SENT" })]);
    const shared = freshFlights();
    shared.flights.set(busyC.id, { since: Date.now(), ticket: 4_242 });
    const busyRows = rowsSnapshot(busyC.id);
    const b = seen(await impl.resume(busyC.id, reader, ctrlDeps(impl, { flights: () => shared })));
    const busyOk = !b.ok && b.reason === "busy" && b.message === COPY.LIVE_CHANGED.resumeBusy && (await campaignOf(busyC.id)).status === "PAUSED"
      && rowsSnapshot(busyC.id) === busyRows && (await auditOf(CTRL.CAMPAIGN_RESUMED_ACTION, busyC.id)).length === 0 && shared.flights.get(busyC.id)?.ticket === 4_242;
    // a Resume that loses its race to a Stop (landed between its check and its move): no row touched
    const raced = await campaign(w, "t5r", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 10 });
    await rows(w, raced.id, [...many(3, { status: "HELD", failureClass: "gate_unanswered", attempts: 3 }), ...many(7, { status: "SENT" })]);
    const racedRows = rowsSnapshot(raced.id);
    const stopFirst = ctrlDeps(impl, {
      resumeCheck: async (cc, counts) => {
        const t = iso(T_NOW - MIN);
        await db.smsCampaign.transition(cc.id, { from: ["PAUSED"], to: "CANCELLED", patch: { finishedAt: t, stopReason: "officer_stopped" }, draftRevision: null, at: t });
        return CTRL.CONTROL_DEPS.resumeCheck(cc, counts);
      },
    });
    const lost = seen(await impl.resume(raced.id, reader, stopFirst));
    const lostOk = !lost.ok && lost.message === COPY.LIVE_DISABLED.stop && (await campaignOf(raced.id)).status === "CANCELLED"
      && rowsSnapshot(raced.id) === racedRows && (await auditOf(CTRL.CAMPAIGN_RESUMED_ACTION, raced.id)).length === 0;
    // a re-queue that fails after the move LANDED: answered landed, recorded null
    const broken = await campaign(w, "t5x", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 10 });
    await rows(w, broken.id, [...many(2, { status: "HELD", failureClass: "gate_unanswered", attempts: 3 }), ...many(8, { status: "SENT" })]);
    const x = seen(await impl.resume(broken.id, reader, ctrlDeps(impl, { recipients: { ...CTRL.CONTROL_DEPS.recipients, requeueHeld: async () => { throw new Error("the re-queue is down (fixture)"); } } })));
    const xRows = await auditOf(CTRL.CAMPAIGN_RESUMED_ACTION, broken.id);
    // ⭐ the U47b-1 re-review · and it SAYS so: the held people stay parked until the next Resume
    const survives = x.ok && x.message === `${COPY.LIVE_DONE.resume} ${COPY.LIVE_REQUEUE_FAILED}` && (await campaignOf(broken.id)).status === "RUNNING"
      && xRows.length === 1 && json(xRows[0].payload) === json({ requeuedHeld: null, to: "RUNNING" });
    // ⭐ the U47b-1 re-review · a Stop landing BETWEEN the move and the re-queue (a Stop waits for no flight): the answer says
    // the campaign was stopped, never "Sending again." beside "Stopped by …"
    const late = await campaign(w, "t5l", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count: 10 });
    await rows(w, late.id, [...many(2, { status: "HELD", failureClass: "gate_unanswered", attempts: 3 }), ...many(8, { status: "SENT" })]);
    const stopBetween = ctrlDeps(impl, {
      recipients: {
        ...CTRL.CONTROL_DEPS.recipients,
        requeueHeld: async (id: string, at: string) => {
          const t = iso(T_NOW - MIN);
          await db.smsCampaign.transition(id, { from: ["RUNNING"], to: "CANCELLED", patch: { finishedAt: t, stopReason: "officer_stopped" }, draftRevision: null, at: t });
          return CTRL.CONTROL_DEPS.recipients.requeueHeld(id, at);
        },
      },
    });
    const l = seen(await impl.resume(late.id, reader, stopBetween));
    const stoppedSaid = l.ok && l.message === COPY.LIVE_CHANGED.stoppedAfterResume && (await campaignOf(late.id)).status === "CANCELLED";
    const never = await campaign(w, "t5n", { path: ["CONFIRMED", "PREPARING", "PAUSED"], count: 10 });
    await rows(w, never.id, many(3, { status: "PENDING" }));
    const n = seen(await impl.resume(never.id, reader, ctrlDeps(impl)));
    const neverOk = n.ok && n.message === COPY.LIVE_DONE.resumePreparing && (await campaignOf(never.id)).status === "PREPARING";
    // ⭐ The check of 980e2ee7 · each later state in its own words, and the held people's failure said only where it is true
    const resumeWith = async (key: string, shape: readonly RowShape[], over: Partial<ControlDeps>, who: ControlActor = reader, count = 10) => {
      const cc = await campaign(w, key, { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], count });
      await rows(w, cc.id, shape);
      const a = seen(await impl.resume(cc.id, who, ctrlDeps(impl, over)));
      return { a, status: (await campaignOf(cc.id)).status, row: (await auditOf(CTRL.CAMPAIGN_RESUMED_ACTION, cc.id))[0]?.payload };
    };
    const twoHeld = (sent: number): RowShape[] => [...many(2, { status: "HELD", failureClass: "gate_unanswered", attempts: 3 }), ...many(sent, { status: "SENT" })];
    const movedOn = (to: "PAUSED" | "DONE"): Partial<ControlDeps> => ({
      recipients: {
        ...CTRL.CONTROL_DEPS.recipients,
        requeueHeld: async (id: string, at: string) => {
          const t = iso(T_NOW - MIN);
          const patch = to === "PAUSED" ? { pausedAt: t, stopReason: "officer_paused" } : { finishedAt: t };
          await db.smsCampaign.transition(id, { from: ["RUNNING"], to, patch: patch as never, draftRevision: null, at: t });
          return CTRL.CONTROL_DEPS.recipients.requeueHeld(id, at);
        },
      },
    });
    const pausedLater = await resumeWith("t5p", twoHeld(8), movedOn("PAUSED"));
    const doneLater = await resumeWith("t5d", twoHeld(8), movedOn("DONE"));
    const laterOk = pausedLater.a.ok && pausedLater.a.message === COPY.LIVE_CHANGED.pausedAfterResume && pausedLater.status === "PAUSED"
      && doneLater.a.ok && doneLater.a.message === COPY.LIVE_CHANGED.finishedAfterResume && doneLater.status === "DONE";
    // the read after the move fails: the move landed and the held people were put back — its own words, never a failure
    let landedYet = false;
    const rereadDown: Partial<ControlDeps> = {
      campaigns: {
        ...CTRL.CONTROL_DEPS.campaigns,
        transition: async (id, t) => { const m = await CTRL.CONTROL_DEPS.campaigns.transition(id, t); if (m !== null) landedYet = true; return m; },
        find: async (id) => { if (landedYet) throw new Error("the read after the move is down (fixture)"); return CTRL.CONTROL_DEPS.campaigns.find(id); },
      },
    };
    const reread = await resumeWith("t5t", twoHeld(8), rereadDown);
    const rereadOk = reread.a.ok && reread.a.message === COPY.LIVE_DONE.resume && reread.status === "RUNNING" && json(reread.row) === json({ requeuedHeld: 2, to: "RUNNING" });
    // a re-queue that fails with nobody HELD says nothing of held people; below the floor the words are a condition, HELD or not
    const down: Partial<ControlDeps> = { recipients: { ...CTRL.CONTROL_DEPS.recipients, requeueHeld: async () => { throw new Error("the re-queue is down (fixture)"); } } };
    const noneHeld = await resumeWith("t5z", [...many(5, { status: "PENDING" }), ...many(5, { status: "SENT" })], down);
    const noneHeldOk = noneHeld.a.ok && noneHeld.a.message === COPY.LIVE_DONE.resume && json(noneHeld.row) === json({ requeuedHeld: null, to: "RUNNING" });
    const hiddenSaid = `${COPY.LIVE_DONE.resume} ${COPY.LIVE_REQUEUE_FAILED_HIDDEN}`;
    const maskedHeld = await resumeWith("t5m", twoHeld(7), down, growth, 9);
    const maskedNone = await resumeWith("t5k", [...many(3, { status: "PENDING" }), ...many(6, { status: "SENT" })], down, growth, 9);
    const maskedTen = await resumeWith("t5j", twoHeld(8), down, growth, 10);
    const floorOk = maskedHeld.a.ok && maskedHeld.a.message === hiddenSaid && maskedNone.a.ok && maskedNone.a.message === hiddenSaid
      && maskedTen.a.ok && maskedTen.a.message === `${COPY.LIVE_DONE.resume} ${COPY.LIVE_REQUEUE_FAILED}`;
    const told = (x: { a: { ok: boolean; message?: string } }): string => (x.a.ok ? `"${(x.a.message ?? "").slice(-34)}"` : "refused");
    return [landed && heldOff && busyOk && lostOk && survives && stoppedSaid && neverOk && laterOk && rereadOk && noneHeldOk && floorOk,
      `${json(r)} · ${after.status} ${after.stopReason} · order ${json(order)} · HELD restarted ${restarted} · row ${json(rowsNow[0]?.payload)} · a step meanwhile ${m === null ? "never asked" : m.ok ? `${m.step.kind}${m.step.kind === "waiting" ? `:${m.step.busy ? "busy" : "other"}` : ""}` : m.reason} ran [${stepCalls.join(",")}] · busy ${busyOk} · lost to a Stop ${lostOk} · re-queue down ${survives} · stopped between ${stoppedSaid} · never finished → ${(await campaignOf(never.id)).status} "${n.ok ? n.message.slice(0, 30) : n.reason}" · paused after → ${pausedLater.status} ${told(pausedLater)} · finished after → ${doneLater.status} ${told(doneLater)} · the read after the move down ${rereadOk} ${json(reread.row)} · re-queue down, none held ${told(noneHeld)} · masked nine, held ${told(maskedHeld)} · none ${told(maskedNone)} · ten ${told(maskedTen)}`];
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
    // ⭐ The U47b-2 review's NIT · a campaign paused BEFORE its list finished has never sent: no group to warn of.
    const pre = await campaign(w, "t7q", { path: ["CONFIRMED", "PREPARING", "PAUSED"], count: 10 });
    await rows(w, pre.id, many(3, { status: "PENDING" }));
    const want: Array<[StoredSmsCampaign, number]> = [[conf, 10], [prep, 10], [run, 6], [pau, 2], [pre, 10]];
    const wrong: string[] = [];
    for (const [c, left] of want) {
      const before = rowsSnapshot(c.id);
      const r = seen(await impl.stop(c.id, reader, d));
      const after = await campaignOf(c.id);
      const rowsNow = await auditOf(CTRL.CAMPAIGN_STOPPED_ACTION, c.id);
      // "A group already being sent may still go out" is said only of a campaign that had begun sending: RUNNING, or PAUSED
      // after its list was finished — the rule written out here, not read back from the service.
      const began = c.status === "RUNNING" || (c.status === "PAUSED" && c.enqueuedAt !== null);
      const okHere = r.ok && r.message === (began ? COPY.LIVE_DONE.stop : COPY.LIVE_DONE.stopBeforeSending) && after.status === "CANCELLED" && after.stopReason === "officer_stopped"
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
    // ⭐ the U47b-1 review · a Stop that LANDED survives a count that cannot be read: stopped, recorded, outstanding not counted
    const blind = await campaign(w, "t7b", { path: ["CONFIRMED", "PREPARING", "RUNNING"], count: 10 });
    const dBlind = ctrlDeps(impl, { recipients: { ...CTRL.CONTROL_DEPS.recipients, countByStatus: async () => { throw new Error("the count is down (fixture)"); } } });
    const rb = seen(await impl.stop(blind.id, reader, dBlind));
    const afterBlind = await campaignOf(blind.id);
    const rowsBlind = await auditOf(CTRL.CAMPAIGN_STOPPED_ACTION, blind.id);
    const survives = rb.ok && afterBlind.status === "CANCELLED" && rowsBlind.length === 1 && json(rowsBlind[0].payload) === json({ outstanding: null });
    return [wrong.length === 0 && refusals && survives,
      `wrong [${wrong.join("; ")}] · refusals ${refusals} · a landed stop with its count down: ${rb.ok ? "stopped" : "FAILED"}, ${afterBlind.status}, rows ${rowsBlind.length} ${json(rowsBlind[0]?.payload)}`];
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
    // ⭐ the U47b-1 review · the name at the composer's 80 characters, and an untitled campaign's
    const n73 = "N".repeat(73);
    const n75 = "M".repeat(75);
    const named = async (key: string, name: string): Promise<string> => {
      const src = await campaign(w, key, { path: ["CONFIRMED"], name });
      const y = seen(await impl.copy(src.id, reader, d));
      return y.ok ? (await db.smsCampaign.find(y.id))?.name ?? "(gone)" : `refused:${y.reason}`;
    };
    const names = { fits: await named("t8l", n73), long: await named("t8m", n75), blank: await named("t8u", "") };
    const namesOk = names.fits === `${n73} (copy)` && names.long === n75 && names.blank === `${LIST_COPY.CAMPAIGNS_UNTITLED} (copy)`;
    // ⭐ the draft door's OTHER refusals: the message (its problem in words) and a source line it could not read — nothing made
    const made4 = mem().smsCampaigns.size;
    const PROBLEM = "the Swahili message is longer than its limit";
    const SOURCE = "The source line couldn't be read just now — try again in a moment.";
    const pm = seen(await impl.copy(k.id, reader, ctrlDeps(impl, { saveDraft: async () => ({ ok: false, reason: "invalid", error: PROBLEM, problems: { bodySw: [PROBLEM] } }) as never })));
    const su = seen(await impl.copy(k.id, reader, ctrlDeps(impl, { saveDraft: async () => ({ ok: false, reason: "source_unreadable", error: SOURCE }) })));
    const door = !pm.ok && pm.reason === "message_cannot_travel" && pm.message === COPY.copyMessageRefusedSentence(PROBLEM)
      && !su.ok && su.reason === "source_unreadable" && su.message === SOURCE && mem().smsCampaigns.size === made4
      && (await auditOf(CTRL.CAMPAIGN_COPIED_ACTION, k.id)).length === 1;
    return [made && again && refused && namesOk && door,
      `made ${made} (${r.ok ? copy?.name : r.message}) · reached ${again} · refused ${refused} · ${json([o, b, x].map((y) => (y.ok ? "ok" : y.reason)))} · names: fits ${names.fits.length} chars, long ${names.long === n75 ? "kept" : names.long.slice(0, 20)}, untitled "${names.blank}" · the door's refusals ${door} (${json([pm, su].map((y) => (y.ok ? "ok" : y.reason)))})`];
  });

  /* ── T9 · the lost races and the record ── */
  await claim(L.t9, async () => {
    type Transition = Parameters<ControlDeps["campaigns"]["transition"]>[1];
    const at = iso(T_NOW - MIN);
    /** The services' door with ANOTHER writer's move landing just before the service's own (its one conditional move). */
    const beaten = (from: SmsCampaignStatus[], to: SmsCampaignStatus, patch: Record<string, unknown>): Partial<ControlDeps> => {
      let first = true;
      return {
        campaigns: {
          find: (id: string) => db.smsCampaign.find(id),
          transition: async (id: string, t: Transition) => {
            if (first) {
              first = false;
              await db.smsCampaign.transition(id, { from, to, patch: patch as never, draftRevision: null, at });
            }
            return db.smsCampaign.transition(id, t);
          },
        },
      };
    };
    // a Start that loses to another officer's Start, and one that loses to a Stop
    const s1 = await campaign(w, "t9a", { path: ["CONFIRMED"] });
    const s2 = await campaign(w, "t9b", { path: ["CONFIRMED"] });
    const a = seen(await impl.start(s1.id, reader, ctrlDeps(impl, beaten(["CONFIRMED"], "PREPARING", { startedAt: at }))));
    const b = seen(await impl.start(s2.id, reader, ctrlDeps(impl, beaten(["CONFIRMED"], "CANCELLED", { finishedAt: at, stopReason: "officer_stopped" }))));
    const rowsA = await auditOf(CTRL.CAMPAIGN_START_REFUSED_ACTION, s1.id);
    const rowsB = await auditOf(CTRL.CAMPAIGN_START_REFUSED_ACTION, s2.id);
    const startLost = !a.ok && a.reason === "not_confirmed" && a.message === COPY.LIVE_CHANGED.startedElsewhere
      && !b.ok && b.reason === "not_confirmed" && b.message === COPY.LIVE_CHANGED.stoppedElsewhere
      && rowsA.length === 1 && json(rowsA[0].payload) === json({ reason: "not_confirmed" }) && rowsB.length === 1
      && (await auditOf(CTRL.CAMPAIGN_STARTED_ACTION, s1.id)).length === 0;
    // a Pause that loses to the engine's own pause; a Stop that loses to another Stop
    const p = await campaign(w, "t9p", { path: ["CONFIRMED", "PREPARING", "RUNNING"] });
    const s = await campaign(w, "t9s", { path: ["CONFIRMED", "PREPARING", "RUNNING"] });
    const pr = seen(await impl.pause(p.id, reader, ctrlDeps(impl, beaten(["RUNNING"], "PAUSED", { pausedAt: at, stopReason: "gateway_refused" }))));
    const sr = seen(await impl.stop(s.id, reader, ctrlDeps(impl, beaten(["RUNNING"], "CANCELLED", { finishedAt: at, stopReason: "officer_stopped" }))));
    const othersLost = !pr.ok && pr.reason === "already_paused" && pr.message === COPY.LIVE_CHANGED.alreadyPaused
      && (await campaignOf(p.id)).stopReason === "gateway_refused" && (await auditOf(ENGINE.ENGINE_PAUSED_ACTION, p.id)).length === 0
      && !sr.ok && sr.reason === "finished" && sr.message === COPY.LIVE_DISABLED.stop && (await auditOf(CTRL.CAMPAIGN_STOPPED_ACTION, s.id)).length === 0;
    // a Start of a campaign that is not there: ONE row, and NO target (a posted id is text anyone can send)
    const orphanRows = async (): Promise<AuditEntry[]> => {
      await auditFlush();
      return getAuditPage({ limit: 10_000 }).filter((e) => e.action === CTRL.CAMPAIGN_START_REFUSED_ACTION && e.actorId === w.officer && (e.targetId ?? null) === null);
    };
    const before = (await orphanRows()).length;
    const gone = seen(await impl.start(w.cid("t9_missing"), reader, ctrlDeps(impl)));
    const after = await orphanRows();
    const missing = !gone.ok && gone.reason === "not_found" && gone.message === COPY.LIVE_MISSING && after.length === before + 1
      && json(after[0]?.payload) === json({ reason: "not_found" });
    // ruling 543 · the act lands and its row does not: recorded false, and the second half beside its sentence
    const r1 = await campaign(w, "t9r", { path: ["CONFIRMED", "PREPARING", "RUNNING"] });
    const r2 = await campaign(w, "t9q", { path: ["CONFIRMED", "PREPARING", "RUNNING"] });
    const thrown = seen(await impl.pause(r1.id, reader, ctrlDeps(impl, { audit: () => { throw new Error("the audit log is down (fixture)"); } })));
    const declined = seen(await impl.pause(r2.id, reader, ctrlDeps(impl, { audit: async () => ({ recorded: false }) })));
    const unrecorded = [thrown, declined].every((y) => y.ok && y.recorded === false && y.message === `${COPY.LIVE_DONE.pause} ${COPY.LIVE_NOT_RECORDED}`)
      && (await campaignOf(r1.id)).status === "PAUSED" && (await campaignOf(r2.id)).status === "PAUSED";
    return [startLost && othersLost && missing && unrecorded,
      `start lost ${startLost} ${json([a, b].map((y) => (y.ok ? "ok" : y.message.slice(0, 40))))} · pause and stop lost ${othersLost} ${json([pr, sr].map((y) => (y.ok ? "ok" : y.reason)))} · not found ${missing} (+${after.length - before} row, ${json(after[0]?.payload)}) · unrecorded ${unrecorded}`];
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
    const kinds = [r1, r2].map((r) => (r.ok ? (r.step.kind === "waiting" ? `waiting:${r.step.busy ? "busy" : "other"}` : r.step.kind) : r.reason)).sort();
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
    // ⭐ the U47b-1 review · a flight dated AHEAD (a clock that jumped back) holds no longer than an old one
    enqueued = [];
    flights.flights.set(a.id, { since: Date.now() + 11 * MIN, ticket: 9_997 });
    const ahead = await impl.step(a.id, READER, d);
    flights.flights.set(a.id, { since: Date.now() + MIN, ticket: 9_996 });
    const nearAhead = await impl.step(a.id, READER, d);
    flights.flights.delete(a.id);
    const aheadOk = ahead.ok && ahead.step.kind === "wrote" && nearAhead.ok && nearAhead.step.kind === "waiting" && enqueued.length === 1;
    // ⭐ the U47b-1 review · EVERY step: a RUNNING campaign's slice and a PAUSED campaign's reap, two at once, never overlap.
    // ⭐ Its re-review: the steps that took the flight are counted at the campaign READ inside it (a step that finds the
    // flight taken reads nothing) — never by the slice or the reap, so a plant that swaps those (R-D1) leaves the count true.
    const pairOnce = async (key: string, path: SmsCampaignStatus[]): Promise<boolean> => {
      const c = await campaign(w, key, { path });
      let open: () => void = () => {};
      const hold = new Promise<void>((res) => { open = res; });
      let inside = 0;
      const own = freshFlights();
      const dd = ctrlDeps(impl, {
        flights: () => own,
        campaigns: {
          find: async (id: string) => { inside++; await hold; return db.smsCampaign.find(id); },
          transition: CTRL.CONTROL_DEPS.campaigns.transition,
        },
        slice: async () => ({ kind: "waiting", reason: "quiet_hours", until: null }),
        reap: async () => ({ ...ZERO_REAP }),
      });
      const x1 = impl.step(c.id, READER, dd);
      const x2 = impl.step(c.id, READER, dd);
      await settle();
      const entered2 = inside;
      open();
      const ys = await Promise.all([x1, x2]);
      const busy = ys.filter((y) => y.ok && y.step.kind === "waiting" && y.step.busy === true).length;
      return entered2 === 1 && busy === 1 && own.flights.size === 0;
    };
    const runningOnce = await pairOnce("d2r", ["CONFIRMED", "PREPARING", "RUNNING"]);
    const pausedOnce = await pairOnce("d2p", ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"]);
    const global = CTRL.campaignStepFlights() === globalThis.__50PICK_CAMPAIGN_STEPS && CTRL.CONTROL_DEPS.flights === CTRL.campaignStepFlights;
    return [one && two && releasedAfter && afterThrow && staleOk && aheadOk && runningOnce && pausedOnce && global,
      `one campaign ${one} (entered ${entered.length}, most ${mostThen}, ${json(kinds)}) · two campaigns ${two} · released ${releasedAfter} · after a throw ${afterThrow} · stale ${staleOk} · dated ahead ${aheadOk} · a slice once ${runningOnce} · a reap once ${pausedOnce} · globalThis ${global}`];
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
    // ⭐ the U47b-1 review · every ACT of a view-only actor, refused before anything is read
    const viewOnly: ControlActor = { userId: w.officer, mayAct: false, reads: true, money: true };
    const paused = await campaign(w, "d3p", { path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"] });
    const conf = await campaign(w, "d3c", { path: ["CONFIRMED"] });
    calls.length = 0;
    const acts = [
      seen(await impl.start(conf.id, viewOnly, d)), seen(await impl.pause(c.id, viewOnly, d)), seen(await impl.resume(paused.id, viewOnly, d)),
      seen(await impl.stop(c.id, viewOnly, d)), seen(await impl.copy(c.id, viewOnly, d)),
    ];
    const actsRefused = acts.every((x) => !x.ok && x.reason === "role" && x.message === COPY.LIVE_DISABLED.role) && calls.length === 0
      && (await campaignOf(c.id)).status === "RUNNING" && (await campaignOf(paused.id)).status === "PAUSED" && (await campaignOf(conf.id)).status === "CONFIRMED"
      && (await auditOf(CTRL.CAMPAIGN_START_REFUSED_ACTION, conf.id)).length === 0;
    return [refused && missing && actsRefused, `${json(r)} · calls [${calls.join(",")}] · missing ${json(gone)} · the acts ${json(acts.map((x) => (x.ok ? "ok" : x.reason)))}`];
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

  /* ── §page · U47b-2's claims — V1 · V4–V11 · L2 (scripts/lib/campaign-visuals-page.mts), on this world and these viewers ── */
  const pageHarness: import("./lib/campaign-visuals-page.mts").PageHarness = {
    claim, run: w.run, READER, GROWTH, WATCHER,
    view: (id, v) => viewOf(impl, id, v),
    campaign: (key, shape) => campaign(w, key, shape as CShape),
    rows: (id, shapes) => rows(w, id, shapes as RowShape[]),
    many: (n, s) => many(n, s as RowShape),
    see: (text) => { SEEN.push(text); },
    // the services' dependencies as a claim assembles them: production's, the view on the claim's fixed clock and open window
    ctrlDeps: () => ctrlDeps(impl),
  };
  await PAGE.pageClaims(impl.page, pageHarness);
  /* ── §live · the review's fix round — V12 the step door · V13 the driver's hook · V14 the presses · V15 what the page says ·
   *    V16 the dev seed (scripts/lib/campaign-visuals-live.mts): executed, with the compiled real source as each one's control ── */
  await LV.liveClaims(impl.page, pageHarness);

  /* ── §R · U48a's claims — R1–R12 (scripts/lib/campaign-visuals-results.mts), on this world and these viewers ── */
  await RESULTS.resultsClaims(impl.results, {
    claim, run: w.run, READER, GROWTH, WATCHER,
    view: (id, v, over) => viewOf(impl, id, v, over),
    campaign: (key, shape) => campaign(w, key, shape as CShape),
    rows: (id, shapes) => rows(w, id, shapes as RowShape[]),
    many: (n, s) => many(n, s as RowShape),
    see: (text) => { SEEN.push(text); },
    mem: () => mem(),
    at: T_NOW,
    key: keyOf,
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
      && D.reach === LIVE.liveReach && D.flightStale === CTRL.stepFlightStale && D.said === CTRL.stepSaid
      && Object.isFrozen(V) && Object.isFrozen(V.recipients) && Object.isFrozen(V.rules) && V.window === liveSendWindow && V.liveGate === marketingLiveGate
      && V.rules.progress === CS.campaignProgress && V.rules.breakdownHidden === LIVE.liveBreakdownHidden && V.rules.outstanding === SC.resumeOutstanding
      && V.rules.pausedReason === LIVE.pausedReasonSentenceFor && V.rules.otpWaiting === RULES.otpFailureWaiting
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
    // ⭐ the review's MAJOR · the step door is reached by its ROUTE and by nothing else: no page, action or helper calls the step
    // service around the route's guard, its same-origin check and its typed answers
    const doorIn = importersOf("live-step-door");
    // U47b-2 · the reach, pinned: the services are imported by the TWO doors that call them — the actions file (the five presses)
    // and the step door (the driver's step, since the review's MAJOR) — and by nothing else; the view by those actions, their
    // loader and act runner, the services themselves and the campaigns list (its paused line — one function); the words by the
    // readers of them (the decisions the page makes, the door, and the drive's dev seed route among them: it hands the drive the
    // page's sentences, so the drive asserts against live-copy and never against a copy of it) — and nothing else, so a new
    // importer is a decision someone makes here.
    const reach = json(controlIn) === json([ACTIONS_REL, LIVE_DOOR_REL].sort()) && json(doorIn) === json([STEP_ROUTE_REL])
      && json(liveIn) === json([CONTROL_REL, ACTIONS_REL, LIVE_LOADER_REL, LIVE_RUN_REL, LIST_PAGE_REL].sort())
      && json(copyIn) === json([CONTROL_REL, LIVE_REL, ACTIONS_REL, LIVE_CLIENT_REL, RESULTS_CARD_REL, LIVE_DECIDE_REL, LIVE_PRESSES_REL, LIVE_RUN_REL, LIVE_DOOR_REL, LIVE_PAGE_REL, LIVE_SEED_REL].sort());
    const SEND = new RegExp("sendBatch|dispatchSlice|blackballSend|sendCampaignTest|engineSend");
    const noSend = !SEND.test(s.control) && !SEND.test(s.live) && !SEND.test(s.copy);
    const copyImports = Array.from(s.copy.matchAll(/^import (type )?[{][^}]*[}] from "([^"]+)";/gm)).map((m) => `${m[1] ? "type " : ""}${m[2]}`).sort();
    // U48a · the price line formats the owner's price with the settings module's own pure formatter (pinned client-safe)
    const pureCopy = json(copyImports) === json(["@/lib/eat-day", "@/lib/marketing/campaign-status", "@/lib/marketing/sms-settings", "@/lib/utils", "type @/lib/server/store"]);
    let scripts: Record<string, string> = {};
    try { scripts = (JSON.parse(s.pkg) as { scripts?: Record<string, string> }).scripts ?? {}; } catch { scripts = {}; }
    // ⭐ the U47b-2 builder's hand-over · on the deploy chain, once (it was in none: a deploy shipped whatever it would catch)
    const chain = (scripts.predeploy ?? "").split("&&").map((x) => x.trim());
    const wired = scripts["test:campaign-visuals"] === "tsx scripts/campaign-visuals.test.mts" && scripts["red:campaign-visuals"] === "tsx scripts/campaign-visuals.test.mts --prove-red"
      && chain.filter((x) => x === "npm run test:campaign-visuals").length === 1;
    return [doors && spelling && bare && reach && noSend && pureCopy && wired,
      `doors ${doors} · one spelling ${spelling} · bare ${bare} · importers control [${controlIn.join(",")}] door [${doorIn.join(",")}] live [${liveIn.join(",")}] copy [${copyIn.join(",")}] · no send ${noSend} · live-copy imports [${copyImports.join(", ")}] · scripts ${wired}`];
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
    const SHAPE = new Set(["kind", "busy", "until", "status"]);
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
  PAGE.setPhoneLabel(L.p1);
  const plants: Plant[] = [
    { name: "R-S7b · nobody driving blind to the engine's waits (the U47b-1 review) — every night a waiting page reads as nobody sending", expect: [L.s7],
      impl: withView((d) => ({ ...d, window: () => ({ ...WIN.ALWAYS_OPEN() }), moneyBusy: () => ({ busy: false, stale: [] }), otpLastFailureAt: () => null })) },
    { name: "R-S3b · the floor at 0 rows (the U47b-1 review's MAJOR) — every confirmed campaign tells a masked viewer it has fewer than ten people", expect: [L.s3],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, breakdownHidden: (reads: boolean, rows: number) => reads !== true && rows < 10 } })) },
    { name: "R-P2 · the step answered raw (the U47b-1 review's MAJOR) — its counts, its cursor and its reason reach every role, under the floor too (and with no `busy`, the driver's timing reads every wait as not busy — D2, T5 and S11 see it)", expect: [L.p2, L.d2, L.t5, L.s11],
      impl: { ctrlDeps: (d: ControlDeps) => ({ ...d, shape: (st: CTRL.StepOutcome) => st as unknown as CTRL.DriverStep }) } },
    { name: "R-V2 (the plan's own) · HELD counted settled — 4 SENT and 6 HELD read 10 of 10", expect: [L.v2],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, progress: (c, counts) => d.rules.progress(c, { ...counts, SENT: counts.SENT + counts.HELD, HELD: 0 }) } })) },
    { name: "R-V3 (the plan's own) · a timer-driven bar — the bar moves on with the clock since the page opened", expect: [L.v3],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, progress: (c, counts) => {
        const p = d.rules.progress(c, counts);
        const drift = Math.max(0, Math.floor((d.now().getTime() - T_NOW) / 1000));
        return p === null ? p : { ...p, value: Math.min(p.max, p.value + drift) };
      } } })) },
    { name: "R-S1 · the groupBy loses a status (DELIVERED) — the KPIs no longer add up to the rows (and every results claim that reads a DELIVERED row sees it)", expect: [L.s1, L.r1, L.r2, L.r8, L.r11],
      impl: withView((d) => ({ ...d, recipients: { ...d.recipients, countByOutcome: async (id: string) => (await d.recipients.countByOutcome(id)).filter((g) => g.status !== "DELIVERED") } })) },
    { name: "R-S2 · protected itemised — an RG reason keeps its own key instead of the protected line (the results' list is the same one — R5 sees it too)", expect: [L.s2, L.r5],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, bucketOf: (r) => (typeof r === "string" && r.startsWith("rg_") ? (r as never) : d.rules.bucketOf(r)) } })) },
    { name: "R-S3 · the floor removed — a masked viewer under ten rows sees the split (and the copy advice says whether anybody was messaged, why it paused, and why it waits) — on the page too (V7)", expect: [L.s3, L.s8, L.s10, L.s11, L.v7, L.r6, L.r11, L.r13],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, breakdownHidden: () => false } })) },
    { name: "R-S5 · who paused read from ANY row however old (the re-review: the `since` rule removed) — Juma named for Amina's pause", expect: [L.s5],
      impl: withView((d) => ({ ...d, actsOn: async (id: string) => (await d.actsOn(id)).map((e) => ({ ...e, createdAt: "2999-01-01T00:00:00.000Z" })) })) },
    { name: "R-S7c · the view's own reading of a code failure (no Math.abs) — one dated three minutes ahead reads as the engine waiting, and nobody driving is never said", expect: [L.s7],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, otpWaiting: (nowMs: number, at: number | null) => typeof at === "number" && nowMs - at < RULES.OTP_FAILURE_WAIT_MS } })) },
    { name: "R-S11 · the waits said blind to the floor (its re-review) — a masked viewer of five reads 'the last check before sending couldn't be made'", expect: [L.s11],
      impl: withCtrl((d) => ({ ...d, said: (step: CTRL.StepOutcome) => CTRL.stepSaid(step, false) })) },
    { name: "R-S10 · the floor forgets why it paused — a masked viewer under ten reads the network's 'no' and every engine reason in its own words", expect: [L.s10],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, pausedReason: (v, c, counts, h) => COPY.pausedReasonSentence(c.stopReason ?? "", LIVE.liveReach(c, counts, v.reads === true, h)) } })) },
    { name: "R-S10b · the floor kept for the batch reasons alone — the switch, the unread credit and held rows still say themselves, so the one sentence would say a batch was built", expect: [L.s10],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, pausedReason: (v, c, counts, h) => {
        const BATCH = ["gateway_refused", "gateway_unanswered", "send_error", "before_send_unanswered", "slice_too_slow", "BALANCE_FLOOR", "MARKETING_FLOOR", "NOT_CONFIGURED"];
        const key = (c.stopReason ?? "").trim();
        const under = (h ?? LIVE.liveBreakdownHidden)(v.reads === true, CS.recipientRows(counts));
        return under && BATCH.includes(key) ? COPY.LIVE_PAUSED_HIDDEN : COPY.pausedReasonSentence(key, LIVE.liveReach(c, counts, v.reads === true, h));
      } } })) },
    { name: "R-S4 · TZS for GROWTH — the view carries money whatever the decider said (the page prints it, V8, so does the step door, V12, and the price line, R8)", expect: [L.s4, L.v8, L.v12, L.r8],
      impl: withView((d) => ({ ...d, rules: { ...d.rules, moneyVisible: () => true } })) },
    { name: "R-T2 · Start goes ahead whatever U49a's check refused", expect: [L.t2],
      impl: withCtrl((d) => ({ ...d, check: async (c) => { const r = await d.check(c); return r.ok ? r : { ok: true, freshCount: c.audienceCount ?? 0, shrunkBy: 0, costTzs: 0 }; } })) },
    { name: "R-T2b · a Start refusal said with money to every role (TZS for GROWTH)", expect: [L.t2],
      impl: withCtrl((d) => ({ ...d, startSentence: (r, v) => SC.startRefusalSentence(r, { ...v, money: true }) })) },
    { name: "R-T3 · OD66 skipped — a masked viewer's Start of both populations is counted", expect: [L.t3],
      impl: withCtrl((d) => ({ ...d, audienceRefusal: () => null })) },
    { name: "R-T5 · Resume forgets the re-queue — the HELD rows stay parked", expect: [L.t5],
      impl: withCtrl((d) => ({ ...d, recipients: { ...d.recipients, requeueHeld: async () => 0 } })) },
    { name: "R-T5b · Resume outside the step flight (the U47b-1 review) — a driver's step runs beside it, and a Resume goes ahead while another step holds the campaign", expect: [L.t5],
      impl: { resume: (id, a, d) => CTRL.resumeCampaign(id, a, { ...d, flights: () => freshFlights() }) } },
    { name: "R-T5c · the HELD rows re-queued BEFORE the move (as first built) — a Resume that loses to a Stop has rewritten a stopped campaign's rows", expect: [L.t5],
      impl: { resume: async (id, a, d) => { await d.recipients.requeueHeld(id, d.now().toISOString()); return CTRL.resumeCampaign(id, a, d); } } },
    { name: "R-T5d · the read after the move unguarded (the check of 980e2ee7) — a Resume that landed throws when that read fails", expect: [L.t5],
      impl: { resume: async (id, a, d) => {
        let landed = false;
        let escaped: unknown = null;
        const r = await CTRL.resumeCampaign(id, a, { ...d, campaigns: { ...d.campaigns,
          transition: async (cid, t) => { const m = await d.campaigns.transition(cid, t); if (m !== null) landed = true; return m; },
          find: async (cid) => { try { return await d.campaigns.find(cid); } catch (e) { if (landed) escaped = e; throw e; } } } });
        if (escaped !== null) throw escaped;
        return r;
      } } },
    { name: "R-T5e · only a Stop said after the move (the check of 980e2ee7) — a Pause or the end landing after a Resume reads 'Sending again.'", expect: [L.t5],
      impl: withCtrl((d) => {
        let resumed = false;
        return { ...d, campaigns: { ...d.campaigns,
          transition: async (cid, t) => { const m = await d.campaigns.transition(cid, t); if (m !== null && t.from.includes("PAUSED") && (t.to === "RUNNING" || t.to === "PREPARING")) resumed = true; return m; },
          find: async (cid) => { const c = await d.campaigns.find(cid); return resumed && c !== null && (c.status === "PAUSED" || c.status === "DONE") ? { ...c, status: "RUNNING" as const } : c; } } };
      }) },
    { name: "R-T5f · the held people's failure said whatever the counts (the check of 980e2ee7) — a Resume with nobody held says some held people could not be put back", expect: [L.t5],
      impl: { resume: async (id, a, d) => {
        let down = false;
        const r = await CTRL.resumeCampaign(id, a, { ...d, recipients: { ...d.recipients,
          requeueHeld: async (cid, at) => { try { return await d.recipients.requeueHeld(cid, at); } catch (e) { down = true; throw e; } } } });
        return r.ok && down && r.message === COPY.LIVE_DONE.resume ? { ...r, message: `${r.message} ${COPY.LIVE_REQUEUE_FAILED}` } : r;
      } } },
    { name: "R-T5g · the held people's failure said blind to the floor (the check of 980e2ee7) — a masked viewer of nine learns whether anybody was held", expect: [L.t5],
      impl: withCtrl((d) => {
        let resumed = false;
        return { ...d,
          campaigns: { ...d.campaigns, transition: async (cid, t) => { const m = await d.campaigns.transition(cid, t); if (m !== null && t.from.includes("PAUSED") && (t.to === "RUNNING" || t.to === "PREPARING")) resumed = true; return m; } },
          reach: (c, counts, reads) => (resumed ? LIVE.liveReach(c, counts, true) : d.reach(c, counts, reads)) };
      }) },
    { name: "R-T6 · Resume priced on a figure, not the counts — a list longer than confirmed resumes", expect: [L.t6],
      impl: withCtrl((d) => ({ ...d, resumeCheck: (c, counts) => d.resumeCheck(c, { ...CS.zeroRecipientStatusCounts(), PENDING: counts.PENDING + counts.HELD }) })) },
    { name: "R-T6b · Resume's copy advice ignores the floor — a masked viewer of a small list learns whether anybody was messaged (and, the same `reach` deciding it, whether anybody is held — T5)", expect: [L.t5, L.t6],
      impl: withCtrl((d) => ({ ...d, reach: (c, counts) => LIVE.liveReach(c, counts, true) })) },
    { name: "R-T8 · the copy widens to the whole book — the audience never travels, the address is empty", expect: [L.t8],
      impl: withCtrl((d) => ({ ...d, travel: () => ({ ok: true, params: {}, filter: AUD.WHOLE_BOOK }) })) },
    { name: "R-T8b · the draft door's refusals said as the audience's — the message's own problem and the unread source line lost", expect: [L.t8],
      impl: { copy: async (id, a, d) => {
        const r = await CTRL.copyCampaign(id, a, d);
        return !r.ok && (r.reason === "message_cannot_travel" || r.reason === "source_unreadable") ? { ok: false, reason: "audience_cannot_travel", message: COPY.copyCantTravelSentence("none") } : r;
      } } },
    { name: "R-T8c · ' (copy)' added whatever the length — the copy of a 75-character name runs past the composer's 80", expect: [L.t8],
      impl: withCtrl((d) => ({ ...d, saveDraft: (input, officer, options) => d.saveDraft({ ...input, name: input.name.endsWith(" (copy)") ? input.name : `${input.name} (copy)` }, officer, options) })) },
    { name: "R-T9 · a lost Start said in U49a's not_confirmed words — the officer never learns the campaign moved on", expect: [L.t9],
      impl: { start: async (id, a, d) => {
        const r = await CTRL.startCampaign(id, a, d);
        return !r.ok && (r.message === COPY.LIVE_CHANGED.startedElsewhere || r.message === COPY.LIVE_CHANGED.stoppedElsewhere)
          ? { ...r, message: SC.startRefusalSentence({ reason: "not_confirmed" }, { money: a.money, reads: a.reads }) } : r;
      } } },
    { name: "R-T9b · a posted campaign id recorded as the refusal's target — text anyone can send, in the audit log", expect: [L.t9],
      impl: withCtrl((d) => ({ ...d, audit: (e) => d.audit({ ...e, targetId: e.targetId ?? "cmp_posted_by_anyone" }) })) },
    { name: "R-T9c · ruling 543 forgotten — a Pause says it was recorded whatever the audit door answered", expect: [L.t9],
      impl: { pause: async (id, a, d) => { const r = await CTRL.pauseCampaign(id, a, d); return r.ok ? { ...r, recorded: true, message: r.message.split(` ${COPY.LIVE_NOT_RECORDED}`).join("") } : r; } } },
    { name: "R-T4b · a Pause of a campaign still PREPARING warns that a group already being sent may still go out — nothing has been sent", expect: [L.t4],
      impl: { pause: async (id, a, d) => { const r = await CTRL.pauseCampaign(id, a, d); return r.ok ? { ...r, message: r.message.split(COPY.LIVE_DONE.pauseBeforeSending).join(COPY.LIVE_DONE.pause) } : r; } } },
    { name: "R-D1 · the dispatcher reaps nothing — a stranded claim stays stranded on mount", expect: [L.d1, L.d5],
      impl: withCtrl((d) => ({ ...d, reap: async () => ({ ...ZERO_REAP }) })) },
    { name: "R-D2 · the single-flight bypassed — every step (and Resume) takes a flight of its own", expect: [L.d2, L.t5],
      impl: withCtrl((d) => ({ ...d, flights: () => freshFlights() })) },
    { name: "R-D2b · the flight taken for PREPARING alone — a slice and a reap of one campaign run side by side", expect: [L.d2, L.t5],
      impl: { step: async (id, v, d) => {
        const c = await db.smsCampaign.find(id);
        return CTRL.campaignStep(id, v, c !== null && c.status === "PREPARING" ? d : { ...d, flights: () => freshFlights() });
      } } },
    { name: "R-D2c · a flight dated ahead holds for ever — a clock that jumped back stalls the campaign", expect: [L.d2],
      impl: withCtrl((d) => ({ ...d, flightStale: (nowMs: number, since: number) => !(nowMs - since < CTRL.STEP_FLIGHT_STALE_MS) })) },
    { name: "R-D3 · the step trusts the caller to have gated it — a view-only viewer's step runs", expect: [L.d3],
      impl: { step: (id, v, d) => CTRL.campaignStep(id, { ...v, mayAct: true }, d) } },
    { name: "R-D3b · the acts trust the guard (the U47b-1 review) — a view-only actor's Stop lands", expect: [L.d3],
      impl: { stop: (id, a, d) => CTRL.stopCampaign(id, { ...a, mayAct: true }, d) } },
    { name: "R-W1 · the page's client value-imports the services — it reaches the server's door around the actions", expect: [L.w1],
      impl: withSources({ src: new Map([...REAL_SOURCES.src, [LIVE_CLIENT_REL, `${REAL_SOURCES.src.get(LIVE_CLIENT_REL) ?? ""}${NL}import { campaignStep } from "@/lib/server/marketing/campaign-control";`]]) }) },
    { name: "R-W1e · a second caller of the step door (the review's MAJOR) — the page's client calls the door in-process, around the route's guard, same-origin check and typed answers", expect: [L.w1],
      impl: withSources({ src: new Map([...REAL_SOURCES.src, [LIVE_CLIENT_REL, `${REAL_SOURCES.src.get(LIVE_CLIENT_REL) ?? ""}${NL}import { campaignStepDoor } from "@/app/admin/campaigns/[id]/live-step-door";`]]) }) },
    { name: "R-W1b · the services grow an action — an exported *Action in campaign-control.ts", expect: [L.w1],
      impl: () => withSources({ control: `${REAL_SOURCES.control}${NL}export async function startCampaignAction(id: string) { return id; }` }) },
    { name: "R-W1c · the services name a send of their own", expect: [L.w1],
      impl: () => withSources({ control: plantIn(REAL_SOURCES.control, "export async function stopCampaign(", "const viaWire = sendBatch;" + NL + "export async function stopCampaign(") }) },
    { name: "R-W1d · the suite off the deploy chain (as it was before the U47b-2 hand-over) — a deploy ships whatever these claims would catch", expect: [L.w1],
      impl: () => withSources({ pkg: plantIn(REAL_SOURCES.pkg, " && npm run test:campaign-visuals", "") }) },
    { name: "R-P1 · a Start refusal's object reaches the answer (its figures for every role)", expect: [L.p1],
      impl: { start: async (id, a, d) => { const r = await CTRL.startCampaign(id, a, d); return r.ok ? r : ({ ...r, refusal: { costTzs: 10_800 } } as typeof r); } } },
    /* ── U47b-2 · the page's own defects (scripts/lib/campaign-visuals-page.mts) ── */
    ...PAGE.pagePlants().map((p): Plant => ({ name: p.name, expect: [...p.expect, ...LV.alsoFails(p.name)] as Label[], impl: p.impl })),
    /* ── U47b-2 · the review's fix round: each defect written into the file it lives in, compiled and run (V12–V16) ── */
    ...LV.livePlants().map((p): Plant => ({ name: p.name, expect: p.expect as Label[], impl: p.impl })),
    /* ── U48a · the results' own defects (scripts/lib/campaign-visuals-results.mts) ── */
    ...RESULTS.resultsPlants(L.p1).map((p): Plant => ({ name: p.name, expect: p.expect as Label[], impl: p.impl as Partial<Impl> })),
  ];

  console.log(`RED CONTROL — each defect planted in memory must fail EXACTLY the claims it names${NL}`);
  let held = 0;
  const missed: string[] = [];
  for (const plant of plants.filter((p) => ONLY === "" || p.name.includes(ONLY))) {
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
  const ran = held + missed.length;
  console.log(`${NL}RED CONTROL — ${held} of ${ran} proofs held${ONLY !== "" ? ` (a SUBSET: --only=${ONLY}; ${plants.length} plants in all — not the proof)` : ""}${missed.length ? `; ${missed.length} FAILED` : ""}`);
  process.exitCode = missed.length === 0 ? 0 : 1;
}
