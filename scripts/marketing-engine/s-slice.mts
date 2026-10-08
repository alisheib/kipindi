/**
 * test:marketing-engine §S — U43b-2's guard: THE SLICE (ENGINE-SPEC §4.13 decisions 2–4 and 6, and its "as built" note;
 * E1 · E3 · E4 · E7 · E8 · E9 · E10 · E11 · E12 · E16 · E17 · E20 · E24 · DC-4 · DC-5 — and the coordinator's U42
 * re-review requirement, the list no longer than confirmed, checked by the slice itself).
 *
 * ⚠️ A SECTION MODULE, NOT A SUITE: `scripts/marketing-engine.test.mts` runs it and hands it `ok` (the `EngineSection` shape
 * of §F). ⭐ DRIVEN, NOT READ: `runCampaignSlice` end to end on the memory twin — the REAL claim, settle and send-record
 * doors, the REAL `dispatchSlice` (the ONE loop), the REAL gate where the gate is the point (consenting players built as it
 * clears them; an opt-out, a self-exclusion, a pause landing mid-slice), the REAL renderer and token door, and — for S20 and
 * S28 — the REAL `sendBatch` behind a stubbed `fetch` (no network: the Blackball endpoint is a loopback port, and every
 * request is answered in-process). Then the source, for what only the source can show (S27).
 * ⛔ IN-PROCESS BY CONSTRUCTION: every plant is a dependency or a rule swapped in memory. No file is written, no SMS can
 * leave (the wire is a stub, or a stubbed fetch), no database is touched (the host removes its variables first).
 * ⛔ Every slice is handed a FIXED window (`scripts/lib/send-window.mts`): green at any hour. ⛔ No backslash in this file.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "../lib/decomment.mts";
import * as ENGINE from "../../src/lib/server/marketing/engine.ts";
import type { EngineDeps, EngineProcessState, SliceStepResult } from "../../src/lib/server/marketing/engine.ts";
import * as RULES from "../../src/lib/marketing/engine-rules.ts";
import * as CM from "../../src/lib/server/marketing/campaign-model.ts";
import { CAMPAIGN_PAUSED_ACTION } from "../../src/lib/server/marketing/enqueue.ts";
import { BATCH_MAX } from "../../src/lib/server/sms-blackball.ts";
import { dispatchSlice, MARKETING_RG_SUPPRESSED_ACTION, DISPATCH_TARGET_TYPE } from "../../src/lib/server/marketing/dispatch.ts";
import type { SliceOutcome } from "../../src/lib/server/marketing/dispatch.ts";
import { mayReceiveMarketingSms } from "../../src/lib/server/marketing/consent.ts";
import { currentOptOutToken, ensureOptOutToken } from "../../src/lib/server/marketing/optout-service.ts";
import { renderForRecipient } from "../../src/lib/marketing/campaign-template.ts";
import { creditVerdict } from "../../src/lib/marketing/credit-guard.ts";
import { marketingLiveGate } from "../../src/lib/server/marketing/live-switch.ts";
import { reloadMarketingSmsSettings } from "../../src/lib/server/marketing/sms-settings.ts";
import { MARKETING_SMS_SETTINGS_DEFAULTS } from "../../src/lib/marketing/sms-settings.ts";
import { sendWindowUnreadable } from "../../src/lib/marketing/window.ts";
import { stopReasonLabel, zeroRecipientStatusCounts } from "../../src/lib/marketing/campaign-status.ts";
import { resumeRefusal, resumeRefusalSentence } from "../../src/lib/server/marketing/start-check.ts";
import { selfExclude } from "../../src/lib/server/responsible-gambling.ts";
import { sendBatch, lastOtpFailureAt, smsProviderResolution, smsRailProblem } from "../../src/lib/server/sms.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";
import { db } from "../../src/lib/server/store.ts";
import type { StoredSmsCampaignRecipient } from "../../src/lib/server/store.ts";
// The suites' fixed windows, imported HERE as well as through the world: this file drives dispatchSlice
// (test:marketing-window W6 — SP-4).
import { ALWAYS_CLOSED, NOON_EAT_MS } from "../lib/send-window.mts";
import {
  CLEARS_ALL, SOURCE_LINE, auditFor, auditRows, bookContact, campaignOf, claim, drive,
  engineDeps, freshState, json, keyIn, mem, moveCampaign, nextRun, officerPause, player, rowOf, rowsOn, runningCampaign, said, saidAll,
  seat, stubWire,
} from "./engine-world.mts";
import type { Check, Seat, Wire } from "./engine-world.mts";
import type { EngineSection, EnginePlant } from "./f-credit.mts";

/* ══ THE LABELS — each once, so a plant names exactly the claims it must turn red ═══════════════════════════════════ */

const L = {
  s0: "S0 · CONTROLS — the fixture world: a consenting player is cleared by the REAL gate and one without consent refused no_consent; the stub wire answers by target in reverse; and the constants are the spec's — SLICE_MAX 50 = BATCH_MAX = the claim door's ceiling, SLICE_START 20, SLICE_MIN 5, a gate budget of 10 s, REAP_AFTER_MS 10 min, the reaper's page = the settle door's batch, MAX_ROW_ATTEMPTS 3, OTP_FAILURE_WAIT_MS 2 min, CLAIM_SEND_MAX_AGE_MS half of REAP_AFTER_MS and SLICE_FLIGHT_STALE_MS twice it; the rules' column bounds equal the rule set's; the paused action is U42's own spelling",
  s1: "S1 · ⭐ A RUNNING SLICE OVER CONSENTING PLAYERS settles every row SENT with its reference, its hand-over instant, its opt-out token, its variant, its size and its length, and a trail of 7 entries (campaign, live_switch, send_window, credit, the gate's ok with its basis, the render, the dispatch with the reference) — in ONE wire call, each message under the gate's key; the account's own first name printed for a usable one, the fallback for an unusable one; the step answers sent",
  s2: "S2 · ⭐ E3 · A TRANSPORT RESULT IS UNCONFIRMED, NEVER FAILED — the row whose reply was lost is UNCONFIRMED with the wire's reference kept (a late receipt can still find it), its token and size kept; the rows the wire answered are SENT; nothing is released or FAILED, and nothing pauses",
  s3: "S3 · ⭐ E7 · A status:false BATCH — every claimed row back to PENDING with attempts + 1 and its claim cleared, ZERO FAILED rows, ONE pause gateway_refused and ONE SYSTEM paused row whose detail is the gateway's words; the stop reason says nothing was charged",
  s4: "S4 · E7 · A WHOLE-BATCH HOLD (BALANCE_FLOOR, MARKETING_FLOOR) — every claimed row back to PENDING with attempts unchanged, ZERO FAILED, the campaign paused with that key and ONE paused row; the gateway was never asked twice",
  s5: "S5 · ⭐ E8 · A GATE THAT THROWS FOR ONE PERSON — that row PENDING with attempts 1 while the others are SENT; the same person three steps running is HELD (attempts 3, class gate_unanswered) — outstanding, never settled, never sent",
  s6: "S6 · ⭐ E17 · WHO HOLDS THE NUMBER NOW DECIDES THE ORIGIN — a registered player walked by their BOOK row renders as account (their own first name, NO source line) and, on a campaign with a BLANK source line, is SENT, not refused; a number no account holds renders book (the fallback, the source line, Swahili); an English-language account gets the English body",
  s7: "S7 · ⭐ E1 · THE TOKEN IS ENSURED AT SEND, AFTER THE GATE — a person the gate refuses gets NO token row (and is SKIPPED with the gate's reason); a cleared person who already holds a token is sent THAT token and no second row is minted; a cleared person with none gets exactly one, carried on the row",
  s8: "S8 · THE SWITCH CLOSING MID-CAMPAIGN — on a real carrier with the owner's switch closed, open but past its closing time, or unreadable (a read that throws), the next step pauses live_switch_closed BEFORE any claim, with one paused row; and its sentence is true of all three (switched off, ran out, couldn't be read)",
  s9: "S9 · ⭐ A PAUSE LANDING DURING GATING (the 3rd gate call pauses the campaign) — beforeSend vetoes the send: ZERO wire calls, every claimed row back to PENDING with its claim cleared and attempts unchanged, and the step answers not_running PAUSED",
  s10: "S10 · NOTHING OUTSTANDING → DONE with ONE finished row carrying the counts by status; only HELD rows left → paused held_rows (never DONE), with its sentence; PENDING rows another claim holds → waiting busy, nothing claimed",
  s11: "S11 · E9 · THE WINDOW CLOSED → waiting quiet_hours until it opens (08:00 EAT), ZERO claims and ZERO wire calls, the campaign still RUNNING; hours that cannot be read → waiting window_unreadable, nothing claimed",
  s12: "S12 · E12 · MONEY BUSY → waiting money_busy, ZERO claims, the campaign still RUNNING",
  s13: "S13 · E12 · AN OTP FAILURE 30 s AGO → waiting otp_failing until two minutes after it, ZERO claims; one 2 min 1 s ago is past, and the slice sends",
  s14: "S14 · E11 · THE SLICE SIZE ADAPTS — the pure rule: a slow gate halves it (20 → 10 → 5) and never below 5, a fast gate doubles it to 50 and never above, an unknown time keeps it, an unusable size restarts at 20; driven: a gate measured at a second a person shrinks the next claim from 20 to 10",
  s15: "S15 · E24 · NO AUDIT ROW PER RECIPIENT OR PER SLICE — a campaign run to DONE over three slices leaves exactly ONE row against the campaign (finished), NONE against any recipient row, and exactly ONE RG line for the one self-excluded player (dispatch's own, against the account)",
  s16: "S16 · ⭐ DC-4 · A RECEIPT BEATS THE SETTLE — the DELIVERED row still carries its gate trail, opt-out token, variant, size, length and hand-over instant, and so does the FAILED one; their status, reference and the receipt's own instant, class and words untouched, the claim kept; the row nobody receipted is SENT",
  s17: "S17 · ⭐ THE LIST NO LONGER THAN CONFIRMED, BEFORE ANY CLAIM (U42's re-review) — a RUNNING list with more rows than its confirmed count pauses list_over_confirmed_sending, and one whose confirmed count is not a count pauses confirmation_unreadable (its own key — never U42's audience_unreadable, whose cause and remedy are the enqueue's): NOTHING claimed, ZERO wire calls, one paused row each; neither sentence prescribes a copy as if it reached nobody — each says a copy would message people again; and Resume refuses the unreadable count with the same word, both saying ask the developer",
  s18: "S18 · ⭐ …AND AGAIN AT THE LAST WORD BEFORE THE WIRE — a row added past the confirmed count while the slice gates (or the count turned unreadable) is vetoed by beforeSend: ZERO wire calls, every claimed row back to PENDING unchanged, the campaign paused list_over_confirmed_sending (confirmation_unreadable), the late row never claimed",
  s19: "S19 · ⭐ AS BUILT · AN UNANSWERED BATCH — every row the wire left without a clear answer (TRANSPORT, or no result for it) is UNCONFIRMED (the reference kept where there was one), never released and never FAILED, and the campaign pauses gateway_unanswered with ONE paused row — so an outage costs one slice, never the audience",
  s20: "S20 · ⭐ THE REAL SEND PATH (sendBatch, a stubbed fetch, no network) — a 504 reply is ambiguous: the rows UNCONFIRMED under their SmsMessage references, those rows UNKNOWN (purpose MARKETING), the campaign paused gateway_unanswered; a status:false 400 is a refusal: the rows released with attempts 1, their SmsMessage rows FAILED, paused gateway_refused with the gateway's words; an accepted reply: the rows SENT under their ACCEPTED rows' references, the credit kept for codes handed to the batch",
  s21: "S21 · ⭐ E16 · THE CREDIT KEPT FOR CODES, PER SLICE — on a real carrier with TZS 100,000 the slice sends and hands the TZS 20,000 kept to the batch (its trail says so); TZS 20,050 against a slice of 20 at TZS 6 pauses marketing_floor; and each cause that cannot be read pauses in its OWN words, the words Resume refuses with — a failed credit read credit_unreadable, settings that cannot be read settings_unreadable, saved sizes that cannot be read sizes_unreadable, no price price_unknown — each BEFORE any claim, each with its sentence; on the console stub neither the settings nor the credit is read and no floor is handed on",
  s22: "S22 · AS BUILT · THE RE-CHECK BEFORE THE WIRE COULD NOT ANSWER — every cleared row back to PENDING unchanged, ZERO wire calls, waiting before_send_unanswered; three slices running pauses before_send_unanswered with one paused row and its sentence; a slice that answers resets the count",
  s23: "S23 · THE TEMPLATE'S OWN VERDICT — a stored message that no longer passes its own check pauses template_invalid BEFORE any claim, with a scrubbed detail and a sentence that never prescribes a copy as if it reached nobody (a copy would message people again — only if that is what you want); while a message refused for ONE person (a book number on a campaign with a blank source line) holds that person (+1) and pauses nothing",
  s24: "S24 · THE RAIL — a dead rail pauses NOT_CONFIGURED and an unrecognised provider pauses PROVIDER_UNRECOGNISED (never live_switch_closed, which the owner cannot fix) — BEFORE any claim",
  s25: "S25 · ⭐ E10 · ONE SLICE IN FLIGHT PER PROCESS — while one campaign's slice gates, a step of ANOTHER campaign answers waiting busy and claims nothing; once it has finished the other step runs; a flight eleven minutes old STILL holds (the flight is kept apart from REAP_AFTER_MS — twice it), one twenty-one minutes old no longer does",
  s26: "S26 · ⭐ DC-5 · NO PHONE NUMBER REFUSES A SETTLE — a gateway error and a gate detail that echo a number are settled with the number masked (four bullets and its last two digits), every trail string scrubbed — while a reference whose characters hold a phone-shaped run is kept WHOLE in the trail's source, as the rule set reads a source word by word; and a patch the rule set still refuses is SET ASIDE (its row keeps the claim, for the reaper) while the rest of the slice settles",
  s27: "S27 · THE WIRING — ENGINE_DEPS is frozen and wired to the REAL doors (the ONE loop, the ONE renderer, the token door, the ONE gate by default, the store's doors, the window, money-busy, the OTP mark, the settings, the credit rule, the pure rules) and its send is engineSend; engineSend stamps purpose MARKETING through sendBatch; engine.ts never imports the enqueue, names no book reader and asks dispatchSlice; engine-rules.ts takes types alone from the server and one pure module; no src file but engine.ts calls or value-imports the engine beyond ENGINE_CALLERS (U47b-1's step dispatcher, campaign-control.ts, alone); ⭐ and no src file but engine.ts names `insideFlight`, the reaper's pass beside a slice in flight (the re-review of round 2); the host runs §S, §R, §C and §T",
  s28: "S28 · E12 · THE OTP MARK — an OTP that FAILS through the REAL sendBatch stamps the process's mark at that moment and the next step, through the SHIPPED reader, waits otp_failing until two minutes after it; a MARKETING failure and an ACCEPTED OTP stamp nothing",
  s29: "S29 · ⭐ THE OWNER'S SWITCH, JUDGED AGAIN AT THE LAST WORD BEFORE THE WIRE (the U43b-2 review — marketingLiveGate's own rule: a state read earlier is no licence for later) — the switch closed while the slice gated: beforeSend vetoes, ZERO wire calls, every claimed row back to PENDING unchanged, the campaign paused live_switch_closed with ONE paused row",
  s30: "S30 · ⭐ A SKIPPED ROW STAYS SKIPPED INSIDE A SHOP-WIDE SLICE — a refused batch (status:false) releases the people it was refused for (+1) and pauses ONCE, while the self-excluded player the gate refused in the same slice stays SKIPPED (attempts 0); after Resume the next slice sends the two and the RG line stays ONE — never a second line per Resume",
  s31: "S31 · ⭐ A HOLD REASON THE TABLE DOES NOT KNOW IS ABOUT ONE PERSON — held for a reason nobody listed, the row goes back +1, then +2, and is HELD at the third (its class the reason) while the others are SENT: bounded, never a silent loop",
  s32: "S32 · E7 · A FAILURE BEFORE THE REQUEST, BATCH-WIDE — every row failed NOT_CONFIGURED (a transport that would not start) is released +1 and the campaign pauses NOT_CONFIGURED (the code's own key, never gateway_refused); every row failed UNKNOWN (a transport that threw before its request) is released +1 and pauses send_error — nothing in either was sent or charged, and neither sentence says the network refused",
  s33: "S33 · ⛔ THE LIST CHECK RUNS FIRST — a list longer than its confirmed count, on a real carrier whose switch is closed, with the window closed, pauses list_over_confirmed_sending (never live_switch_closed, never a wait: no Resume could fix it); a confirmed count that is not a count, with a dead rail, pauses confirmation_unreadable (never NOT_CONFIGURED)",
  s34: "S34 · ⭐ A SEND THAT THREW (the U43b-2 review — never re-send what might have reached the network, release only what certainly did not) — one that threw before writing anything: its rows released +1 (no message names them), the campaign paused send_error with ONE paused row carrying the error's CODE or NAME only, never its words (the U43b-2 re-review: words can quote the call); one that threw AFTER its message rows were written: its rows UNCONFIRMED, never released, paused send_error; the sentence true of both, and never that the network refused",
  s35: "S35 · ⭐ THE SEND'S DEADLINE (the U43b-2 re-review — sendBatch's notAfter) — on a FIXED clock the slice hands its send EXACTLY the oldest claim plus the send-age bound (never a deadline that slides with the clock — its re-review); a batch refused whole for a passed deadline, and one whose deadline passed while its rows were written (no request, the rows FAILED), each WAIT slice_too_slow with their people back as they were (+0), never a pause",
  s36: "S36 · ⭐ TOO SLOW THREE TIMES IN A ROW PAUSES (the U43b-2 re-review) — two slice_too_slow waits, then the third pauses slice_too_slow with ONE paused row, in words that say so; nothing ever sent",
  s37: "S37 · A FAILURE THAT NAMES NO CODE IS NO ANSWER (the U43b-2 re-review) — never read as certainly before the request: a failure with no code, and one whose code is EMPTY (the re-review of round 2), each leave the rows UNCONFIRMED, never released, the campaign paused gateway_unanswered",
  s38: "S38 · ⭐ TOO SLOW COUNTS AT THE SMALLEST GROUP ONLY (the re-review of round 2) — three slice_too_slow waits with eight people claimed never pause (the next slice is smaller, uncounted); at the smallest group (five) the third in a row pauses slice_too_slow — and a slice that settles its people starts the count over",
  s39: "S39 · ⭐ AN OFFICER'S PAUSE AND RESUME START THE STREAKS OVER (the re-review of round 2) — two slow waits at the smallest group, then a Pause and a Resume (a new pausedAt): two more slow waits do NOT pause, the third after the Resume does; the same for the check before the wire unanswered",
} as const;

/* ══ THE IMPLEMENTATION UNDER TEST — swapped piece by piece by the plants ══════════════════════════════════════════ */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CR = String.fromCharCode(13);
const NL = String.fromCharCode(10);
const code = (rel: string): string => decomment(readFileSync(join(ROOT, ...rel.split("/")), "utf8").split(CR).join(""));
const relOf = (abs: string): string => abs.slice(ROOT.length + 1).split(sep).join("/");
function walkDir(abs: string): string[] {
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkDir(join(abs, e.name)) : /[.]tsx?$/.test(e.name) ? [join(abs, e.name)] : []);
}
/** Every src file that spells the engine's module or its two exported steps, decommented — S27's caller scan. */
const NAMING = new Map<string, string>();
for (const abs of walkDir(join(ROOT, "src"))) {
  const raw = readFileSync(abs, "utf8");
  if (/runCampaignSlice|reapStrandedClaims|marketing[/]engine/.test(raw)) NAMING.set(relOf(abs), decomment(raw.split(CR).join("")));
}

type SSources = { engine: string; rules: string; host: string; src: ReadonlyMap<string, string> };
const REAL_SOURCES: SSources = {
  engine: code("src/lib/server/marketing/engine.ts"),
  rules: code("src/lib/marketing/engine-rules.ts"),
  host: readFileSync(join(ROOT, "scripts", "marketing-engine.test.mts"), "utf8").split(CR).join(""),
  src: NAMING,
};

export type SImpl = {
  step: typeof ENGINE.runCampaignSlice;
  /** A plant's last word on the dependencies a claim assembled (identity when nothing is planted). */
  deps: (d: EngineDeps) => EngineDeps;
  /** The SHIPPED dependencies, as S27 reads them. */
  shipped: Readonly<EngineDeps>;
  adapt: typeof RULES.adaptSliceSize;
  stopLabel: (key: string) => string;
  sources: SSources;
};
export const S_REAL: SImpl = {
  step: ENGINE.runCampaignSlice,
  deps: (d) => d,
  shipped: ENGINE.ENGINE_DEPS,
  adapt: RULES.adaptSliceSize,
  stopLabel: stopReasonLabel,
  sources: REAL_SOURCES,
};

/** ⛔ THE FILES ALLOWED TO CALL THE ENGINE — U47b-1's step dispatcher (`campaign-control.ts`, `campaignStep`: RUNNING → one
 *  slice; PAUSED · CANCELLED · DONE and PREPARING → the reaper — ENGINE-SPEC §3.3), declared in its own commit. */
export const ENGINE_CALLERS: readonly string[] = ["src/lib/server/marketing/campaign-control.ts"];
const ENGINE_REL = "src/lib/server/marketing/engine.ts";

/* ══ THE FIXTURE WORLD ═════════════════════════════════════════════════════════════════════════════════════════════ */

const MIN = 60_000;
const iso = (ms: number): string => new Date(ms).toISOString();
const pad = (n: number, w: number): string => String(n).padStart(w, "0");

/** One claim's own world: its run number, numbers, ids and campaign, never another's. */
function worldOf(prefix: string, ndc = "65") {
  const run = nextRun();
  return {
    run,
    key: (i: number) => keyIn(ndc, run * 1000 + i),
    cid: `cmp_${prefix}_${run}`,
    uid: (i: number) => `usr_${prefix}_${run}_${i}`,
    rid: (i: number) => `rcp_${prefix}_${pad(run, 5)}_${pad(i, 3)}`,
  };
}
type World = ReturnType<typeof worldOf>;

/** `n` consenting players seated on the world's campaign (confirmed at `count`, default n), in id order. */
async function playersOn(w: World, n: number, o: { count?: number; names?: (string | null)[]; campaign?: Parameters<typeof runningCampaign>[1] } = {}): Promise<Seat[]> {
  await runningCampaign(w.cid, { count: o.count ?? n, ...(o.campaign ?? {}) });
  const seats: Seat[] = [];
  for (let i = 0; i < n; i++) {
    const p = await player(w.uid(i), w.key(i), { displayName: o.names?.[i] ?? null });
    seats.push({ id: w.rid(i), key: p.key, userId: p.id });
  }
  await seat(w.cid, seats);
  return seats;
}

/** The step and its dependencies, through the plant's last word. */
const stepWith = (impl: SImpl, id: string, d: EngineDeps): Promise<SliceStepResult> => impl.step(id, impl.deps(d));
const driveWith = (impl: SImpl, id: string, d: EngineDeps, max = 30): Promise<SliceStepResult[]> => drive(impl.step, id, impl.deps(d), max);

const statusesOf = (rows: readonly (StoredSmsCampaignRecipient | null)[]): string => rows.map((r) => r?.status ?? "none").join(",");
const claimedNone = (cid: string): boolean => rowsOn(cid).every((r) => r.claimToken === null && r.claimedAt === null);
const wireKeys = (w: Wire): string[] => w.sent.map((m) => m.to);

/** A real carrier's reads, all answered in memory: the switch open for an hour, the rail alive, the settings and price
 *  read, and the credit at `credit` (a fresh reading) — `over` changes one of them. */
function carrier(credit: number, over: Partial<EngineDeps> = {}): Partial<EngineDeps> {
  const now = Date.now();
  return {
    provider: () => "blackball",
    liveSwitch: async () => ({ state: "open", enabledBy: "the owner", enabledAt: iso(now - MIN), closesAt: iso(now + 60 * MIN) }),
    rail: () => null,
    settings: async () => ({ ok: true, settings: { ...MARKETING_SMS_SETTINGS_DEFAULTS }, stored: true, readable: true }),
    cost: async (configured) => (configured === null ? { kind: "unknown", reason: "no-sends" } : { kind: "configured", tzsPerSegment: configured }),
    readBalance: async () => ({ tzs: credit, at: Date.now() - 1_000, outcome: "fresh", stale: false, error: null }),
    ...over,
  };
}

/* ── THE REAL SEND PATH, behind a stubbed fetch (S20, S28): Blackball selected with dummy keys at a loopback port that is
 *    never dialled — every request answered in-process, and everything put back after ── */
type FetchAnswer = (url: string, body: string) => Response;
async function realCarrier<T>(answer: FetchAnswer, run: () => Promise<T>): Promise<{ result: T; sends: number; reads: number }> {
  const ENV = ["SMS_PROVIDER", "BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET", "SMS_SENDER_ID", "BLACKBALL_API_URL"];
  const saved = ENV.map((k) => [k, process.env[k]] as const);
  const realFetch = globalThis.fetch;
  const balance = globalThis.__50PICK_SMS_BALANCE;
  process.env.SMS_PROVIDER = "blackball";
  process.env.BLACKBALL_CLIENT_ID = "dummy-not-a-key";
  process.env.BLACKBALL_CLIENT_SECRET = "dummy-not-a-key";
  process.env.SMS_SENDER_ID = "50PICK";
  process.env.BLACKBALL_API_URL = "http://127.0.0.1:9/api/sms/send";
  let sends = 0;
  let reads = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/account/balance")) {
      reads++;
      return new Response(JSON.stringify({ status: true, message: "Account balance", data: { currency: "TZS" }, balance: 100_000 }), { status: 200 });
    }
    sends++;
    return answer(url, String(init?.body ?? ""));
  }) as typeof fetch;
  globalThis.__50PICK_SMS_BALANCE = { tzs: 100_000, at: Date.now() };
  try {
    return { result: await run(), sends, reads };
  } finally {
    globalThis.fetch = realFetch;
    globalThis.__50PICK_SMS_BALANCE = balance;
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}
const accepted = (): Response =>
  new Response(JSON.stringify({ status: true, message: "Successfully submitted to broker.", data: null, balance: 99_000 }), { status: 200 });
const refusedReply = (): Response =>
  new Response(JSON.stringify({ status: false, message: "Invalid credentials", data: null, balance: 0 }), { status: 400 });
const proxy504 = (): Response => new Response("<html><body>504 Gateway Time-out</body></html>", { status: 504 });

/* ══ THE SECTION ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

async function runSectionS(impl: SImpl, ok: Check): Promise<void> {
  // ── S0 · controls — the real code alone, never the impl, so no plant can turn them ──
  await claim(ok, L.s0, async () => {
    const w = worldOf("s0");
    const yes = await player(w.uid(1), w.key(1));
    const no = await player(w.uid(2), w.key(2), {}, false);
    const vYes = await mayReceiveMarketingSms(yes.key);
    const vNo = await mayReceiveMarketingSms(no.key);
    const wire = stubWire({ answer: (m) => (m.targetId === "b" ? "rejected" : "ok") });
    const out = await wire.send([{ to: yes.key, body: "x", targetType: DISPATCH_TARGET_TYPE, targetId: "a" }, { to: no.key, body: "x", targetType: DISPATCH_TARGET_TYPE, targetId: "b" }], {});
    const constants = ENGINE.SLICE_MAX === 50 && ENGINE.SLICE_MAX === BATCH_MAX && ENGINE.SLICE_MAX === CM.SMS_RECIPIENT_CLAIM_MAX
      && ENGINE.SLICE_START === 20 && ENGINE.SLICE_MIN === 5 && ENGINE.SLICE_GATE_BUDGET_MS === 10_000 && ENGINE.REAP_AFTER_MS === 10 * MIN
      && ENGINE.REAP_BATCH === CM.SMS_RECIPIENT_BATCH_MAX && ENGINE.MAX_ROW_ATTEMPTS === 3 && ENGINE.OTP_FAILURE_WAIT_MS === 2 * MIN
      && ENGINE.CLAIM_SEND_MAX_AGE_MS === ENGINE.REAP_AFTER_MS / 2 && ENGINE.SLICE_FLIGHT_STALE_MS === 2 * ENGINE.REAP_AFTER_MS;
    const bounds = RULES.TRAIL_TEXT_MAX === CM.SMS_RECIPIENT_TRAIL_TEXT_MAX && RULES.WORDS_MAX === CM.SMS_RECIPIENT_TEXT_MAX
      && RULES.CODE_MAX === CM.SMS_RECIPIENT_CODE_MAX && RULES.TRAIL_MAX === CM.SMS_RECIPIENT_TRAIL_MAX
      && RULES.RECEIPT_CLASS_PREFIX === CM.SMS_RECEIPT_CLASS_PREFIX && ENGINE.ENGINE_PAUSED_ACTION === CAMPAIGN_PAUSED_ACTION;
    return [vYes.ok && !vNo.ok && vNo.skipReason === "no_consent" && out.results.map((r) => `${r.targetId}:${r.ok}`).join() === "b:false,a:true"
      && constants && bounds, `gate ${vYes.ok}/${vNo.ok ? "ok" : vNo.skipReason} · wire ${json(out.results.map((r) => r.targetId))} · constants ${constants} · bounds ${bounds}`];
  });

  // ── S1 · a slice over consenting players: SENT, every column, a 7-entry trail ──
  await claim(ok, L.s1, async () => {
    const w = worldOf("s1");
    const seats = await playersOn(w, 3, { names: ["Neema Joseph", "Ali99", null] });
    const wire = stubWire();
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire));
    const rows = await Promise.all(seats.map((s) => rowOf(s.id)));
    const whole = rows.every((x) => x !== null && x.status === "SENT" && x.smsReference === `ref_${x.id}` && typeof x.sentAt === "string"
      && typeof x.optOutToken === "string" && x.optOutToken.length === 8 && x.locale === "SW" && x.segments === 1 && (x.bodyLen ?? 0) > 40);
    const trail = rows[0]?.gateTrail ?? [];
    const shape = trail.map((g) => g.check).join(",") === "campaign,live_switch,send_window,credit,gate,render,dispatch"
      && trail[0]?.source === w.cid && trail[4]?.verdict === "ok" && (trail[4]?.source ?? "").startsWith("CONSENT:ledger:")
      && trail[5]?.source === "origin:account;name:account" && trail[6]?.verdict === "handed_over" && trail[6]?.source === `ref_${seats[0].id}`;
    const texts = new Map(wire.sent.map((m) => [m.targetId, m.body]));
    const names = (texts.get(seats[0].id) ?? "").startsWith("50pick: Habari Neema,") && (texts.get(seats[1].id) ?? "").startsWith("50pick: Habari Rafiki,")
      && rows[1]?.gateTrail?.[5]?.source === "origin:account;name:fallback";
    const keys = wire.calls === 1 && wire.sent.length === 3 && wire.sent.every((m, i) => m.to === seats.find((s) => s.id === m.targetId)?.key && i >= 0);
    return [r.kind === "sent" && r.handedOver === 3 && r.claimed === 3 && whole && shape && names && keys,
      `${said(r)} · rows ${statusesOf(rows)} whole ${whole} · trail [${trail.map((g) => `${g.check}:${g.verdict}:${g.source ?? "-"}`).join(",")}] shape ${shape} · names ${names} · wire ${wire.calls}/${wire.sent.length} keys ${keys} · first row ${json({ ref: rows[0]?.smsReference, token: rows[0]?.optOutToken, locale: rows[0]?.locale, segments: rows[0]?.segments, bodyLen: rows[0]?.bodyLen, sentAt: rows[0]?.sentAt })}`];
  });

  // ── S2 · TRANSPORT → UNCONFIRMED, the reference kept ──
  await claim(ok, L.s2, async () => {
    const w = worldOf("s2");
    const seats = await playersOn(w, 3);
    const lost = seats[1].id;
    const wire = stubWire({ answer: (m) => (m.targetId === lost ? "transport" : "ok") });
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire));
    const rows = await Promise.all(seats.map((s) => rowOf(s.id)));
    const u = rows[1];
    const c = await campaignOf(w.cid);
    return [u?.status === "UNCONFIRMED" && u.smsReference === `ref_${lost}` && typeof u.optOutToken === "string" && u.segments === 1
      && rows[0]?.status === "SENT" && rows[2]?.status === "SENT" && rows.every((x) => x?.attempts === 0) && c?.status === "RUNNING" && r.kind === "sent",
      `${said(r)} · rows ${statusesOf(rows)} · lost row ref ${u?.smsReference ?? "none"} · campaign ${c?.status}`];
  });

  // ── S3 · a status:false batch: released (+1), ONE pause gateway_refused, ONE row, zero FAILED ──
  await claim(ok, L.s3, async () => {
    const w = worldOf("s3");
    const seats = await playersOn(w, 4);
    const wire = stubWire({ answer: () => "rejected" });
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire));
    const rows = await Promise.all(seats.map((s) => rowOf(s.id)));
    const c = await campaignOf(w.cid);
    const paused = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, w.cid);
    const p = (paused[0]?.payload ?? {}) as Record<string, unknown>;
    return [r.kind === "paused" && r.reason === "gateway_refused" && rows.every((x) => x?.status === "PENDING" && x.attempts === 1 && x.claimToken === null)
      && c?.status === "PAUSED" && c.stopReason === "gateway_refused" && paused.length === 1 && paused[0].category === "SYSTEM" && paused[0].actorId === null
      && p.reason === "gateway_refused" && String(p.detail ?? "").includes("Invalid credentials")
      && impl.stopLabel("gateway_refused").includes("nothing in it was charged"),
      `${said(r)} · rows ${statusesOf(rows)} attempts ${rows.map((x) => x?.attempts).join(",")} · campaign ${c?.status}/${c?.stopReason} · paused rows ${paused.length} ${json(p)}`];
  });

  // ── S4 · a whole-batch hold: released (+0), paused with its key ──
  await claim(ok, L.s4, async () => {
    const out: string[] = [];
    let holds = true;
    for (const refused of ["BALANCE_FLOOR", "MARKETING_FLOOR"] as const) {
      const w = worldOf("s4");
      const seats = await playersOn(w, 3);
      const wire = stubWire({ refused });
      const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire));
      const rows = await Promise.all(seats.map((s) => rowOf(s.id)));
      const c = await campaignOf(w.cid);
      const paused = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, w.cid);
      holds = holds && r.kind === "paused" && r.reason === refused && rows.every((x) => x?.status === "PENDING" && x.attempts === 0 && x.claimToken === null)
        && c?.status === "PAUSED" && c.stopReason === refused && paused.length === 1 && wire.calls === 1;
      out.push(`${refused}: ${said(r)} rows ${statusesOf(rows)}/${rows.map((x) => x?.attempts).join("")} paused ${paused.length} calls ${wire.calls}`);
    }
    return [holds, out.join(" · ")];
  });

  // ── S5 · a gate that throws for one person: +1, then HELD at 3 ──
  await claim(ok, L.s5, async () => {
    const w = worldOf("s5");
    const seats = await playersOn(w, 3);
    const bad = seats[1].key;
    const gate: EngineDeps["gate"] = async (m) => {
      if (parseTzNumber(m).msisdn === bad) throw new Error("the consent store did not answer (fixture)");
      return mayReceiveMarketingSms(m);
    };
    const wire = stubWire();
    const d = engineDeps(freshState(), wire, { gate });
    const first = await stepWith(impl, w.cid, d);
    const after1 = await rowOf(seats[1].id);
    const others = await Promise.all([rowOf(seats[0].id), rowOf(seats[2].id)]);
    const second = await stepWith(impl, w.cid, d);
    const third = await stepWith(impl, w.cid, d);
    const held = await rowOf(seats[1].id);
    const c = await campaignOf(w.cid);
    return [after1?.status === "PENDING" && after1.attempts === 1 && after1.claimToken === null && others.every((x) => x?.status === "SENT")
      && held?.status === "HELD" && held.attempts === 3 && held.failureClass === "gate_unanswered" && !wireKeys(wire).includes(bad) && c?.status === "RUNNING",
      `${said(first)} → ${said(second)} → ${said(third)} · after one ${after1?.status}/${after1?.attempts} · after three ${held?.status}/${held?.attempts}/${held?.failureClass} · others ${statusesOf(others)}`];
  });

  // ── S6 · E17 — the origin by who holds the number now ──
  await claim(ok, L.s6, async () => {
    // ① a registered player walked by their BOOK row, on a campaign with NO source line
    const w = worldOf("s6");
    await runningCampaign(w.cid, { count: 1, sourcePhrase: null });
    const p = await player(w.uid(0), w.key(0), { displayName: "Neema" });
    const contact = await bookContact(`mc_s6_${w.run}`, p.key, p.id);
    await seat(w.cid, [{ id: w.rid(0), key: p.key, userId: p.id, contactId: contact }]);
    const wire = stubWire();
    const r1 = await stepWith(impl, w.cid, engineDeps(freshState(), wire));
    const row1 = await rowOf(w.rid(0));
    const text1 = wire.sent[0]?.body ?? "";
    const accountOk = row1?.status === "SENT" && text1.startsWith("50pick: Habari Neema,") && !text1.includes(SOURCE_LINE)
      && row1.gateTrail?.[5]?.source === "origin:account;name:account";
    // ② a number no account holds (cleared by a gate that clears all) renders book: the fallback, the source line, Swahili
    const v = worldOf("s6b");
    await runningCampaign(v.cid, { count: 1, bodyEn: "50pick: Hi {jina}, today's offer." });
    await seat(v.cid, [{ id: v.rid(0), key: v.key(0) }]);
    const wire2 = stubWire();
    const r2 = await stepWith(impl, v.cid, engineDeps(freshState(), wire2, { gate: CLEARS_ALL }));
    const row2 = await rowOf(v.rid(0));
    const text2 = wire2.sent[0]?.body ?? "";
    const bookOk = row2?.status === "SENT" && row2.locale === "SW" && text2.startsWith("50pick: Habari Rafiki,") && text2.includes(SOURCE_LINE)
      && row2.gateTrail?.[5]?.source === "origin:book;name:fallback";
    // ③ an English-language account gets the English body
    const e = worldOf("s6c");
    await runningCampaign(e.cid, { count: 1, bodyEn: "50pick: Hi {jina}, today's offer." });
    const en = await player(e.uid(0), e.key(0), { locale: "EN", displayName: "Grace" });
    await seat(e.cid, [{ id: e.rid(0), key: en.key, userId: en.id }]);
    const wire3 = stubWire();
    const r3 = await stepWith(impl, e.cid, engineDeps(freshState(), wire3));
    const row3 = await rowOf(e.rid(0));
    const englishOk = row3?.status === "SENT" && row3.locale === "EN" && (wire3.sent[0]?.body ?? "").startsWith("50pick: Hi Grace,");
    return [accountOk && bookOk && englishOk,
      `① ${said(r1)} ${row1?.status} account ${accountOk} · ② ${said(r2)} ${row2?.status} book ${bookOk} · ③ ${said(r3)} ${row3?.status}/${row3?.locale} english ${englishOk}`];
  });

  // ── S7 · E1 — no token for a refused person; a held token reused; one minted for a person with none ──
  await claim(ok, L.s7, async () => {
    const w = worldOf("s7");
    await runningCampaign(w.cid, { count: 3 });
    const refused = await player(w.uid(0), w.key(0), {}, false);
    const holder = await player(w.uid(1), w.key(1));
    const fresh = await player(w.uid(2), w.key(2));
    const held = await ensureOptOutToken(holder.key);
    await seat(w.cid, [refused, holder, fresh].map((p, i) => ({ id: w.rid(i), key: p.key, userId: p.id })));
    const tokens = async (k: string) => (await Promise.resolve(db.marketingOptOutToken.listFor(k))).length;
    const before = [await tokens(refused.key), await tokens(holder.key), await tokens(fresh.key)];
    const wire = stubWire();
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire));
    const after = [await tokens(refused.key), await tokens(holder.key), await tokens(fresh.key)];
    const rows = await Promise.all([0, 1, 2].map((i) => rowOf(w.rid(i))));
    const minted = (await Promise.resolve(db.marketingOptOutToken.listFor(fresh.key)))[0]?.token ?? null;
    return [json(before) === "[0,1,0]" && json(after) === "[0,1,1]" && rows[0]?.status === "SKIPPED" && rows[0].skipReason === "no_consent"
      && rows[0].optOutToken === null && rows[1]?.status === "SENT" && rows[1].optOutToken === held && rows[2]?.status === "SENT" && rows[2].optOutToken === minted
      && !wireKeys(wire).includes(refused.key),
      `${said(r)} · tokens ${json(before)} → ${json(after)} · rows ${statusesOf(rows)} · reused ${rows[1]?.optOutToken === held}`];
  });

  // ── S8 · the switch closing mid-campaign ──
  await claim(ok, L.s8, async () => {
    const out: string[] = [];
    let holds = true;
    const now = Date.now();
    const closed = { state: "closed" as const, why: "absent" as const };
    const expired = { state: "open" as const, enabledBy: "the owner", enabledAt: iso(now - 3 * 60 * MIN), closesAt: iso(now - MIN) };
    const readings: Array<[string, EngineDeps["liveSwitch"]]> = [
      ["closed", async () => closed],
      ["ran out", async () => expired],
      ["unreadable", async () => { throw new Error("the config row could not be read (fixture)"); }],
    ];
    for (const [name, liveSwitch] of readings) {
      const w = worldOf("s8");
      await playersOn(w, 2);
      const wire = stubWire();
      const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire, carrier(100_000, { liveSwitch })));
      const c = await campaignOf(w.cid);
      const paused = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, w.cid);
      holds = holds && r.kind === "paused" && r.reason === "live_switch_closed" && c?.stopReason === "live_switch_closed" && claimedNone(w.cid)
        && wire.calls === 0 && paused.length === 1;
      out.push(`${name}: ${said(r)} claimed none ${claimedNone(w.cid)} paused ${paused.length}`);
    }
    const sentence = impl.stopLabel("live_switch_closed");
    const words = sentence.includes("switched them off") && sentence.includes("ran out") && sentence.includes("couldn't be read") && sentence.includes("press Resume");
    return [holds && words, `${out.join(" · ")} · sentence true of all three ${words}`];
  });

  // ── S9 · a pause landing during gating: beforeSend vetoes, everything released, zero wire calls ──
  await claim(ok, L.s9, async () => {
    const w = worldOf("s9");
    const seats = await playersOn(w, 4);
    let calls = 0;
    const gate: EngineDeps["gate"] = async (m) => {
      calls++;
      if (calls === 3) await officerPause(w.cid);
      return mayReceiveMarketingSms(m);
    };
    const wire = stubWire();
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire, { gate }));
    const rows = await Promise.all(seats.map((s) => rowOf(s.id)));
    return [r.kind === "not_running" && r.status === "PAUSED" && wire.calls === 0
      && rows.every((x) => x?.status === "PENDING" && x.claimToken === null && x.attempts === 0 && x.claimedAt !== null),
      `${said(r)} · wire calls ${wire.calls} · rows ${statusesOf(rows)} attempts ${rows.map((x) => x?.attempts).join("")} · gate asked ${calls}`];
  });

  // ── S10 · DONE, held_rows, busy ──
  await claim(ok, L.s10, async () => {
    // ① everyone settled → DONE, one finished row with the counts
    const a = worldOf("s10a");
    await playersOn(a, 2);
    const wire = stubWire();
    const runA = await driveWith(impl, a.cid, engineDeps(freshState(), wire));
    const finished = await auditRows(ENGINE.ENGINE_FINISHED_ACTION, a.cid);
    const fp = (finished[0]?.payload ?? {}) as Record<string, unknown>;
    const cA = await campaignOf(a.cid);
    const doneOk = runA[runA.length - 1]?.kind === "finished" && cA?.status === "DONE" && typeof cA.finishedAt === "string"
      && finished.length === 1 && fp.SENT === 2 && fp.rows === 2 && fp.PENDING === 0;
    // ② only HELD left → paused held_rows
    const b = worldOf("s10b");
    const seatsB = await playersOn(b, 1);
    const blind: EngineDeps["gate"] = async () => { throw new Error("gate down (fixture)"); };
    const runB = await driveWith(impl, b.cid, engineDeps(freshState(), stubWire(), { gate: blind }), 6);
    const rowB = await rowOf(seatsB[0].id);
    const cB = await campaignOf(b.cid);
    const heldOk = rowB?.status === "HELD" && runB[runB.length - 1]?.kind === "paused" && cB?.status === "PAUSED" && cB.stopReason === "held_rows"
      && impl.stopLabel("held_rows") === "Paused — some people could not be checked or prepared. Resume to try them again, or Stop.";
    // ③ PENDING rows another claim holds → waiting busy
    const c = worldOf("s10c");
    await playersOn(c, 1);
    await db.smsCampaignRecipient.claim(c.cid, 1, `other_${c.run}_claimant`, new Date().toISOString());
    const rC = await stepWith(impl, c.cid, engineDeps(freshState(), stubWire()));
    const cC = await campaignOf(c.cid);
    const busyOk = rC.kind === "waiting" && rC.reason === "busy" && cC?.status === "RUNNING";
    return [doneOk && heldOk && busyOk,
      `① ${saidAll(runA)} finished rows ${finished.length} ${json(fp)} · ② ${saidAll(runB)} row ${rowB?.status} campaign ${cB?.status}/${cB?.stopReason} · ③ ${said(rC)}`];
  });

  // ── S11 · the window closed, and unreadable ──
  await claim(ok, L.s11, async () => {
    const w = worldOf("s11");
    await playersOn(w, 2);
    const wire = stubWire();
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire, { window: ALWAYS_CLOSED }));
    const c = await campaignOf(w.cid);
    const opens = ALWAYS_CLOSED().opensAt;
    const v = worldOf("s11b");
    await playersOn(v, 1);
    const r2 = await stepWith(impl, v.cid, engineDeps(freshState(), stubWire(), { window: () => sendWindowUnreadable() }));
    return [r.kind === "waiting" && r.reason === "quiet_hours" && r.until === opens && opens === "2026-10-07T05:00:00.000Z" && claimedNone(w.cid)
      && wire.calls === 0 && c?.status === "RUNNING" && r2.kind === "waiting" && r2.reason === "window_unreadable" && r2.until === null && claimedNone(v.cid),
      `${said(r)} · claimed none ${claimedNone(w.cid)} · wire ${wire.calls} · ${c?.status} · unreadable: ${said(r2)}`];
  });

  // ── S12 · money busy ──
  await claim(ok, L.s12, async () => {
    const w = worldOf("s12");
    await playersOn(w, 2);
    const wire = stubWire();
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire, { moneyBusy: () => ({ busy: true, why: "bets_waiting", stale: [] }) }));
    const c = await campaignOf(w.cid);
    return [r.kind === "waiting" && r.reason === "money_busy" && claimedNone(w.cid) && wire.calls === 0 && c?.status === "RUNNING",
      `${said(r)} · claimed none ${claimedNone(w.cid)} · wire ${wire.calls}`];
  });

  // ── S13 · an OTP failure 30 s ago, and 2 min 1 s ago ──
  await claim(ok, L.s13, async () => {
    const now = Date.parse("2026-10-07T09:00:00.000Z");
    const w = worldOf("s13");
    await playersOn(w, 1);
    const wire = stubWire();
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire, { now: () => new Date(now), otpLastFailureAt: () => now - 30_000 }));
    const v = worldOf("s13b");
    await playersOn(v, 1);
    const wire2 = stubWire();
    const r2 = await stepWith(impl, v.cid, engineDeps(freshState(), wire2, { now: () => new Date(now), otpLastFailureAt: () => now - 121_000 }));
    return [r.kind === "waiting" && r.reason === "otp_failing" && r.until === iso(now - 30_000 + 2 * MIN) && claimedNone(w.cid) && wire.calls === 0
      && r2.kind === "sent" && wire2.calls === 1,
      `30 s: ${said(r)} · 2 min 1 s: ${said(r2)}`];
  });

  // ── S14 · the slice size adapts ──
  await claim(ok, L.s14, async () => {
    const a = impl.adapt;
    const table: Array<[number, number | null, number]> = [
      [20, 2000, 10], [10, 2000, 5], [5, 2000, 5], [5, 100_000, 5], [20, 1, 40], [40, 1, 50], [50, 1, 50], [20, 0, 40], [20, null, 20], [99, null, 20], [3, null, 20],
    ];
    const misses = table.filter(([prev, ms, want]) => a(prev, ms) !== want).map(([prev, ms, want]) => `(${prev}, ${ms}) → ${a(prev, ms)}, want ${want}`);
    // driven: a gate that takes a second a person (a fake clock moved by the gate) — the next claim is 10, not 20
    const w = worldOf("s14");
    await playersOn(w, 30);
    let fake = 0;
    const gate: EngineDeps["gate"] = async (m) => { fake += 1_000; return CLEARS_ALL(m); };
    const state = freshState();
    const d = engineDeps(state, stubWire(), { gate, clock: () => fake });
    const first = await stepWith(impl, w.cid, d);
    const sizeAfter = state.sliceSize;
    const second = await stepWith(impl, w.cid, d);
    return [misses.length === 0 && first.kind === "sent" && first.claimed === 20 && sizeAfter === 10 && second.kind === "sent" && second.claimed === 10,
      `table misses [${misses.join(" | ")}] · driven: ${said(first)} → size ${sizeAfter} → ${said(second)}`];
  });

  // ── S15 · no audit row per recipient or per slice ──
  await claim(ok, L.s15, async () => {
    const w = worldOf("s15");
    await runningCampaign(w.cid, { count: 7 });
    const seats: Seat[] = [];
    for (let i = 0; i < 7; i++) {
      const p = await player(w.uid(i), w.key(i));
      seats.push({ id: w.rid(i), key: p.key, userId: p.id });
    }
    await selfExclude(seats[6].userId as string, "24h");
    const d = engineDeps(freshState(), stubWire());
    await seat(w.cid, seats.slice(0, 4));
    const first = await stepWith(impl, w.cid, d);
    await seat(w.cid, seats.slice(4));
    const run = [first, ...(await driveWith(impl, w.cid, d, 10))];
    const onCampaign = await auditFor(w.cid);
    const perRecipient = (await Promise.all(seats.map((s) => auditFor(s.id)))).flat();
    const rg = await auditRows(MARKETING_RG_SUPPRESSED_ACTION, seats[6].userId as string);
    return [run[run.length - 1]?.kind === "finished" && run.filter((x) => x.kind === "sent").length >= 2
      && onCampaign.length === 1 && onCampaign[0].action === ENGINE.ENGINE_FINISHED_ACTION && perRecipient.length === 0 && rg.length === 1,
      `${saidAll(run)} · rows on the campaign [${onCampaign.map((e) => e.action).join(",")}] · per recipient ${perRecipient.length} · RG lines ${rg.length}`];
  });

  // ── S16 · DC-4 · a receipt beats the settle ──
  await claim(ok, L.s16, async () => {
    const w = worldOf("s16");
    const seats = await playersOn(w, 3);
    const receiptAt = new Date().toISOString();
    const wire = stubWire({
      during: async (messages) => {
        for (const m of messages) {
          const id = m.targetId ?? "";
          if (id === seats[0].id) await db.smsCampaignRecipient.recordReceipt(id, { reference: `ref_${id}`, msisdn: m.to, status: "DELIVERED", rawStatus: "DELIVRD", desc: null, at: receiptAt });
          if (id === seats[1].id) await db.smsCampaignRecipient.recordReceipt(id, { reference: `ref_${id}`, msisdn: m.to, status: "FAILED", rawStatus: "UNDELIV", desc: "absent subscriber", at: receiptAt });
        }
      },
    });
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire));
    const [d, f, s] = await Promise.all(seats.map((x) => rowOf(x.id)));
    const carried = (x: StoredSmsCampaignRecipient | null): boolean => x !== null && (x.gateTrail?.length ?? 0) === 7 && typeof x.optOutToken === "string"
      && x.locale === "SW" && x.segments === 1 && (x.bodyLen ?? 0) > 0 && typeof x.sentAt === "string" && x.claimToken !== null;
    const deliveredOk = d?.status === "DELIVERED" && d.deliveredAt === receiptAt && d.smsReference === `ref_${seats[0].id}` && carried(d);
    const failedOk = f?.status === "FAILED" && f.failedAt === receiptAt && f.failureClass === "receipt:UNDELIV" && f.error === "absent subscriber"
      && f.smsReference === `ref_${seats[1].id}` && carried(f);
    return [deliveredOk && failedOk && s?.status === "SENT" && r.kind === "sent",
      `${said(r)} · delivered ${d?.status} trail ${d?.gateTrail?.length ?? 0} sentAt ${d?.sentAt ?? "null"} token ${d?.optOutToken ?? "null"} · failed ${f?.status}/${f?.failureClass} trail ${f?.gateTrail?.length ?? 0} · third ${s?.status}`];
  });

  // ── S17 · the list no longer than confirmed, before any claim ──
  await claim(ok, L.s17, async () => {
    const a = worldOf("s17a");
    await playersOn(a, 3, { count: 2 });
    const wire = stubWire();
    const rA = await stepWith(impl, a.cid, engineDeps(freshState(), wire));
    const cA = await campaignOf(a.cid);
    const pausedA = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, a.cid);
    const b = worldOf("s17b");
    await playersOn(b, 2);
    const stored = mem() as unknown as { smsCampaigns: Map<string, { audienceCount: number | null }> };
    const row = stored.smsCampaigns.get(b.cid);
    if (row) row.audienceCount = null;
    const wire2 = stubWire();
    const rB = await stepWith(impl, b.cid, engineDeps(freshState(), wire2));
    const cB = await campaignOf(b.cid);
    const pausedB = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, b.cid);
    const over = impl.stopLabel("list_over_confirmed_sending");
    const unread = impl.stopLabel("confirmation_unreadable");
    // ⭐ Resume agrees: the paused campaign's Resume is refused with the same word, and both say ask the developer
    const counts = zeroRecipientStatusCounts();
    for (const x of CM.fillRecipientCounts(await db.smsCampaignRecipient.countByStatus(b.cid))) counts[x.status] += x.count;
    const resume = cB === null ? null : await resumeRefusal(cB, counts);
    const agrees = resume?.reason === "confirmation_unreadable" && resumeRefusalSentence(resume, { money: false, reads: false }).includes("ask the developer");
    const words = over.includes("a copy would message them again") && !over.includes("confirm a new copy")
      && unread.includes("a copy would message them again") && unread.includes("ask the developer") && !unread.includes("confirm a new copy") && agrees;
    return [rA.kind === "paused" && rA.reason === "list_over_confirmed_sending" && cA?.stopReason === "list_over_confirmed_sending" && claimedNone(a.cid) && wire.calls === 0
      && pausedA.length === 1 && rB.kind === "paused" && rB.reason === "confirmation_unreadable" && cB?.stopReason === "confirmation_unreadable" && claimedNone(b.cid)
      && wire2.calls === 0 && pausedB.length === 1 && words,
      `over: ${said(rA)} claimed none ${claimedNone(a.cid)} wire ${wire.calls} paused ${pausedA.length} · no count: ${said(rB)} claimed none ${claimedNone(b.cid)} wire ${wire2.calls} · words ${words}`];
  });

  // ── S18 · …and again at the last word before the wire ──
  await claim(ok, L.s18, async () => {
    const a = worldOf("s18a");
    const seats = await playersOn(a, 3);
    let added = false;
    const gate: EngineDeps["gate"] = async (m) => {
      if (!added) {
        added = true;
        const late = await player(a.uid(9), a.key(9));
        await seat(a.cid, [{ id: a.rid(9), key: late.key, userId: late.id }]);
      }
      return CLEARS_ALL(m);
    };
    const wire = stubWire();
    const rA = await stepWith(impl, a.cid, engineDeps(freshState(), wire, { gate }));
    const rows = await Promise.all(seats.map((s) => rowOf(s.id)));
    const late = await rowOf(a.rid(9));
    const cA = await campaignOf(a.cid);
    const b = worldOf("s18b");
    await playersOn(b, 2);
    let nulled = false;
    const gate2: EngineDeps["gate"] = async (m) => {
      if (!nulled) {
        nulled = true;
        const stored = mem() as unknown as { smsCampaigns: Map<string, { audienceCount: number | null }> };
        const row = stored.smsCampaigns.get(b.cid);
        if (row) row.audienceCount = null;
      }
      return CLEARS_ALL(m);
    };
    const wire2 = stubWire();
    const rB = await stepWith(impl, b.cid, engineDeps(freshState(), wire2, { gate: gate2 }));
    const cB = await campaignOf(b.cid);
    return [rA.kind === "paused" && rA.reason === "list_over_confirmed_sending" && wire.calls === 0
      && rows.every((x) => x?.status === "PENDING" && x.claimToken === null && x.attempts === 0) && late?.claimedAt === null
      && cA?.stopReason === "list_over_confirmed_sending" && rB.kind === "paused" && rB.reason === "confirmation_unreadable" && wire2.calls === 0
      && cB?.stopReason === "confirmation_unreadable",
      `over: ${said(rA)} wire ${wire.calls} rows ${statusesOf(rows)} late claimed ${late?.claimedAt ?? "never"} · no count: ${said(rB)} wire ${wire2.calls}`];
  });

  // ── S19 · an unanswered batch: UNCONFIRMED, never released, paused gateway_unanswered ──
  await claim(ok, L.s19, async () => {
    const a = worldOf("s19a");
    const seats = await playersOn(a, 3);
    const rA = await stepWith(impl, a.cid, engineDeps(freshState(), stubWire({ answer: () => "transport" })));
    const rows = await Promise.all(seats.map((s) => rowOf(s.id)));
    const cA = await campaignOf(a.cid);
    const pausedA = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, a.cid);
    const b = worldOf("s19b");
    const seatsB = await playersOn(b, 2);
    const rB = await stepWith(impl, b.cid, engineDeps(freshState(), stubWire({ answer: () => "missing" })));
    const rowsB = await Promise.all(seatsB.map((s) => rowOf(s.id)));
    const words = impl.stopLabel("gateway_unanswered").includes("never sent again by themselves") && impl.stopLabel("gateway_unanswered").includes("no clear answer");
    return [rA.kind === "paused" && rA.reason === "gateway_unanswered" && rows.every((x) => x?.status === "UNCONFIRMED" && x.smsReference === `ref_${x.id}` && x.attempts === 0)
      && cA?.stopReason === "gateway_unanswered" && pausedA.length === 1 && rB.kind === "paused" && rB.reason === "gateway_unanswered"
      && rowsB.every((x) => x?.status === "UNCONFIRMED" && x.smsReference === null && x.attempts === 0) && words,
      `transport: ${said(rA)} rows ${statusesOf(rows)} paused ${pausedA.length} · no result: ${said(rB)} rows ${statusesOf(rowsB)} · words ${words}`];
  });

  // ── S20 · the REAL send path behind a stubbed fetch ──
  await claim(ok, L.s20, async () => {
    const live = carrier(100_000, { provider: smsProviderResolution, rail: smsRailProblem });
    const kinds: string[] = [];
    // ① a 504 after the gateway (perhaps) took the batch: ambiguous
    const a = worldOf("s20a");
    const seatsA = await playersOn(a, 2);
    const ra = await realCarrier(proxy504, () => stepWith(impl, a.cid, engineDeps(freshState(), stubWire(), { ...live, send: ENGINE.ENGINE_DEPS.send })));
    const rowsA = await Promise.all(seatsA.map((s) => rowOf(s.id)));
    const msgsA = await Promise.all(rowsA.map((x) => (x?.smsReference ? db.smsMessage.findByReference(x.smsReference) : null)));
    const ambiguous = ra.result.kind === "paused" && ra.result.reason === "gateway_unanswered" && rowsA.every((x) => x?.status === "UNCONFIRMED" && (x.smsReference ?? "").startsWith("sms_"))
      && msgsA.every((m) => m?.status === "UNKNOWN" && m.purpose === "MARKETING" && m.failedAt === null);
    kinds.push(`504: ${said(ra.result)} rows ${statusesOf(rowsA)} msgs ${msgsA.map((m) => m?.status).join(",")}`);
    // ② a status:false 400: a refusal — released, FAILED messages, paused gateway_refused
    const b = worldOf("s20b");
    const seatsB = await playersOn(b, 2);
    const rb = await realCarrier(refusedReply, () => stepWith(impl, b.cid, engineDeps(freshState(), stubWire(), { ...live, send: ENGINE.ENGINE_DEPS.send })));
    const rowsB = await Promise.all(seatsB.map((s) => rowOf(s.id)));
    const msgsB = [...mem().smsMessages.values()].filter((m) => seatsB.some((s) => s.id === m.targetId));
    const pausedB = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, b.cid);
    const refusal = rb.result.kind === "paused" && rb.result.reason === "gateway_refused" && rowsB.every((x) => x?.status === "PENDING" && x.attempts === 1)
      && msgsB.length === 2 && msgsB.every((m) => m.status === "FAILED") && String((pausedB[0]?.payload as Record<string, unknown> | undefined)?.detail ?? "").includes("Invalid credentials");
    kinds.push(`400: ${said(rb.result)} rows ${statusesOf(rowsB)}/${rowsB.map((x) => x?.attempts).join("")} msgs ${msgsB.map((m) => m.status).join(",")}`);
    // ③ accepted: SENT under the ACCEPTED rows' references, the credit kept for codes handed to the batch
    const c = worldOf("s20c");
    const seatsC = await playersOn(c, 2);
    let handed: unknown = null;
    const rc = await realCarrier(accepted, () => stepWith(impl, c.cid, engineDeps(freshState(), stubWire(), {
      ...live,
      send: async (m, o) => { handed = o.minimumBalanceTzs; return ENGINE.ENGINE_DEPS.send(m, o); },
    })));
    const rowsC = await Promise.all(seatsC.map((s) => rowOf(s.id)));
    const msgsC = await Promise.all(rowsC.map((x) => (x?.smsReference ? db.smsMessage.findByReference(x.smsReference) : null)));
    const sent = rc.result.kind === "sent" && rowsC.every((x) => x?.status === "SENT") && msgsC.every((m) => m?.status === "ACCEPTED" && m.purpose === "MARKETING")
      && handed === MARKETING_SMS_SETTINGS_DEFAULTS.codesReserveTzs && rc.sends === 1;
    kinds.push(`accepted: ${said(rc.result)} rows ${statusesOf(rowsC)} msgs ${msgsC.map((m) => m?.status).join(",")} floor ${String(handed)} sends ${rc.sends}`);
    return [ambiguous && refusal && sent, kinds.join(" · ")];
  });

  // ── S21 · the credit kept for codes, per slice ──
  await claim(ok, L.s21, async () => {
    const out: string[] = [];
    // ① enough credit: sends, and the floor handed to the batch
    const a = worldOf("s21a");
    const seatsA = await playersOn(a, 2);
    const wireA = stubWire();
    const rA = await stepWith(impl, a.cid, engineDeps(freshState(), wireA, carrier(100_000)));
    const rowA = await rowOf(seatsA[0].id);
    const okA = rA.kind === "sent" && wireA.opts[0]?.minimumBalanceTzs === 20_000 && rowA?.gateTrail?.[3]?.source === "kept-for-codes:20000";
    out.push(`100,000: ${said(rA)} floor ${wireA.opts[0]?.minimumBalanceTzs} trail ${rowA?.gateTrail?.[3]?.source}`);
    // ② too little: paused marketing_floor before any claim
    const b = worldOf("s21b");
    await playersOn(b, 2);
    const wireB = stubWire();
    const rB = await stepWith(impl, b.cid, engineDeps(freshState(), wireB, carrier(20_050)));
    const okB = rB.kind === "paused" && rB.reason === "marketing_floor" && claimedNone(b.cid) && wireB.calls === 0;
    out.push(`20,050: ${said(rB)}`);
    // ③ each cause that cannot be read, in its OWN words: the credit, the settings, the saved sizes, the price
    const causes: Array<[string, (cid: string) => Promise<void>, Partial<EngineDeps>]> = [
      ["credit_unreadable", async () => undefined, { readBalance: async () => ({ tzs: null, at: null, outcome: "failed", stale: false, error: "unreachable" }) }],
      ["settings_unreadable", async () => undefined, { settings: async () => ({ ok: false, error: "down" }) }],
      ["sizes_unreadable", async (cid) => {
        const stored = mem() as unknown as { smsCampaigns: Map<string, { segmentsSw: number | null }> };
        const row = stored.smsCampaigns.get(cid);
        if (row) row.segmentsSw = null;
      }, {}],
      ["price_unknown", async () => undefined, { cost: async () => ({ kind: "unknown", reason: "no-sends" }) }],
    ];
    let okC = true;
    for (const [want, spoil, over] of causes) {
      const c = worldOf("s21c");
      await playersOn(c, 1);
      await spoil(c.cid);
      const wireC = stubWire();
      const rC = await stepWith(impl, c.cid, engineDeps(freshState(), wireC, carrier(100_000, over)));
      const sentence = impl.stopLabel(want);
      okC = okC && rC.kind === "paused" && rC.reason === want && claimedNone(c.cid) && wireC.calls === 0
        && sentence.startsWith("Paused — ") && !sentence.startsWith("Engine reason");
      out.push(`${want}: ${said(rC)}`);
    }
    // ⑤ the console stub: no settings or credit read, no floor handed on
    const f = worldOf("s21f");
    await playersOn(f, 1);
    let reads = 0;
    const wireF = stubWire();
    const rF = await stepWith(impl, f.cid, engineDeps(freshState(), wireF, {
      settings: async () => { reads++; return reloadMarketingSmsSettings(); },
      readBalance: async () => { reads++; return { tzs: 1, at: Date.now(), outcome: "fresh", stale: false, error: null }; },
    }));
    const okF = rF.kind === "sent" && reads === 0 && wireF.opts[0]?.minimumBalanceTzs === undefined;
    out.push(`console: ${said(rF)} reads ${reads} floor ${String(wireF.opts[0]?.minimumBalanceTzs)}`);
    return [okA && okB && okC && okF, out.join(" · ")];
  });

  // ── S22 · the re-check before the wire could not answer ──
  await claim(ok, L.s22, async () => {
    const w = worldOf("s22");
    const seats = await playersOn(w, 2);
    const state = freshState();
    const wire = stubWire();
    const blind = engineDeps(state, wire, { gate: CLEARS_ALL, recipients: { ...ENGINE.ENGINE_DEPS.recipients, claimedBy: async () => { throw new Error("claims unreadable (fixture)"); } } });
    const r1 = await stepWith(impl, w.cid, blind);
    const rows1 = await Promise.all(seats.map((s) => rowOf(s.id)));
    const r2 = await stepWith(impl, w.cid, blind);
    const r3 = await stepWith(impl, w.cid, blind);
    const c = await campaignOf(w.cid);
    const paused = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, w.cid);
    // a slice that answers in between resets the count
    const v = worldOf("s22b");
    await playersOn(v, 2, { count: 2 });
    const stateV = freshState();
    const wireV = stubWire();
    const blindV = engineDeps(stateV, wireV, { gate: CLEARS_ALL, recipients: { ...ENGINE.ENGINE_DEPS.recipients, claimedBy: async () => { throw new Error("claims unreadable (fixture)"); } } });
    await stepWith(impl, v.cid, blindV);
    await stepWith(impl, v.cid, blindV);
    const answered = await stepWith(impl, v.cid, engineDeps(stateV, wireV, { gate: CLEARS_ALL }));
    const countAfter = stateV.unanswered[v.cid] ?? 0;
    return [r1.kind === "waiting" && r1.reason === "before_send_unanswered" && rows1.every((x) => x?.status === "PENDING" && x.claimToken === null && x.attempts === 0)
      && wire.calls === 0 && r2.kind === "waiting" && r3.kind === "paused" && r3.reason === "before_send_unanswered" && c?.stopReason === "before_send_unanswered"
      && paused.length === 1 && impl.stopLabel("before_send_unanswered").includes("three times running") && answered.kind === "sent" && countAfter === 0,
      `${said(r1)} → ${said(r2)} → ${said(r3)} · rows after one ${statusesOf(rows1)} · wire ${wire.calls} · paused ${paused.length} · reset: ${said(answered)} count ${countAfter}`];
  });

  // ── S23 · the template's own verdict, and a refusal about one person ──
  await claim(ok, L.s23, async () => {
    const a = worldOf("s23a");
    await playersOn(a, 2, { campaign: { count: 2, bodySw: "Habari {jina}, ofa ya leo." } });
    const wire = stubWire();
    const rA = await stepWith(impl, a.cid, engineDeps(freshState(), wire));
    const cA = await campaignOf(a.cid);
    const pausedA = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, a.cid);
    const detail = String((pausedA[0]?.payload as Record<string, unknown> | undefined)?.detail ?? "");
    const b = worldOf("s23b");
    await runningCampaign(b.cid, { count: 1, sourcePhrase: null });
    await seat(b.cid, [{ id: b.rid(0), key: b.key(0) }]);
    const rB = await stepWith(impl, b.cid, engineDeps(freshState(), stubWire(), { gate: CLEARS_ALL }));
    const rowB = await rowOf(b.rid(0));
    const cB = await campaignOf(b.cid);
    const sentence = impl.stopLabel("template_invalid");
    const words = sentence.includes("a copy would message them again") && sentence.includes("only if that is what you want");
    return [rA.kind === "paused" && rA.reason === "template_invalid" && claimedNone(a.cid) && wire.calls === 0 && pausedA.length === 1 && detail.length > 0
      && words && rB.kind === "sent" && rowB?.status === "PENDING" && rowB.attempts === 1 && cB?.status === "RUNNING",
      `stored: ${said(rA)} detail "${detail.slice(0, 60)}" · one person: ${said(rB)} row ${rowB?.status}/${rowB?.attempts} campaign ${cB?.status}`];
  });

  // ── S24 · the rail ──
  await claim(ok, L.s24, async () => {
    const a = worldOf("s24a");
    await playersOn(a, 1);
    const rA = await stepWith(impl, a.cid, engineDeps(freshState(), stubWire(), { rail: () => "keys-not-set" }));
    const b = worldOf("s24b");
    await playersOn(b, 1);
    const rB = await stepWith(impl, b.cid, engineDeps(freshState(), stubWire(), { provider: () => "unrecognised", rail: () => null }));
    return [rA.kind === "paused" && rA.reason === "NOT_CONFIGURED" && claimedNone(a.cid) && rB.kind === "paused" && rB.reason === "PROVIDER_UNRECOGNISED" && claimedNone(b.cid),
      `dead rail: ${said(rA)} · unrecognised: ${said(rB)}`];
  });

  // ── S25 · one slice in flight per process ──
  await claim(ok, L.s25, async () => {
    const a = worldOf("s25a");
    await playersOn(a, 1);
    const b = worldOf("s25b");
    await playersOn(b, 1);
    const state = freshState();
    let release: () => void = () => undefined;
    const held = new Promise<void>((r) => { release = r; });
    let entered: () => void = () => undefined;
    const inside = new Promise<void>((r) => { entered = r; });
    const slow: EngineDeps["gate"] = async (m) => { entered(); await held; return CLEARS_ALL(m); };
    const first = stepWith(impl, a.cid, engineDeps(state, stubWire(), { gate: slow }));
    await inside;
    const meanwhile = await stepWith(impl, b.cid, engineDeps(state, stubWire(), { gate: CLEARS_ALL }));
    const bUntouched = claimedNone(b.cid);
    release();
    const done = await first;
    const after = await stepWith(impl, b.cid, engineDeps(state, stubWire(), { gate: CLEARS_ALL }));
    // a flight eleven minutes old still holds (past REAP_AFTER_MS, inside twice it); one twenty-one minutes old does not
    const y = worldOf("s25y");
    await playersOn(y, 1);
    const young = freshState();
    young.flight = { campaignId: "cmp_slow", since: Date.now() - 11 * MIN, ticket: 6 };
    const rYoung = await stepWith(impl, y.cid, engineDeps(young, stubWire(), { gate: CLEARS_ALL }));
    const c = worldOf("s25c");
    await playersOn(c, 1);
    const stale = freshState();
    stale.flight = { campaignId: "cmp_lost", since: Date.now() - 21 * MIN, ticket: 7 };
    const rStale = await stepWith(impl, c.cid, engineDeps(stale, stubWire(), { gate: CLEARS_ALL }));
    return [meanwhile.kind === "waiting" && meanwhile.reason === "busy" && bUntouched && done.kind === "sent" && after.kind === "sent"
      && rYoung.kind === "waiting" && rYoung.reason === "busy" && claimedNone(y.cid) && rStale.kind === "sent",
      `meanwhile ${said(meanwhile)} (b untouched ${bUntouched}) · first ${said(done)} · after ${said(after)} · 11 min flight: ${said(rYoung)} · 21 min flight: ${said(rStale)}`];
  });

  // ── S26 · DC-5 ──
  await claim(ok, L.s26, async () => {
    const w = worldOf("s26");
    const seats = await playersOn(w, 3);
    const echo = seats[0].id;
    const wire = stubWire({ answer: (m) => (m.targetId === echo ? "rejected" : "ok") });
    const echoingSend: EngineDeps["send"] = async (messages, opts) => {
      const r = await wire.send(messages, opts);
      return { ...r, results: r.results.map((x) => (x.targetId === echo ? { ...x, error: "subscriber 0712 345 678 refused by the network" } : x)) };
    };
    const refuseWithNumber: EngineDeps["gate"] = async (m) =>
      (parseTzNumber(m).msisdn === seats[1].key ? { ok: false, skipReason: "suppressed", detail: "stopped by 0754 321 987 on the line" } : CLEARS_ALL(m));
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire, { send: echoingSend, gate: refuseWithNumber }));
    const rows = await Promise.all(seats.map((s) => rowOf(s.id)));
    const failedOk = rows[0]?.status === "FAILED" && (rows[0].error ?? "").includes("••••78") && !/0712|345 678/.test(rows[0].error ?? "");
    const skippedOk = rows[1]?.status === "SKIPPED" && rows[1].skipDetail.includes("••••87") && rows[1].gateTrail?.some((g) => (g.wording ?? "").includes("••••87")) === true;
    // ⭐ a reference whose characters hold a phone-shaped run is a WORD of the trail's source: kept whole, never masked
    const u = worldOf("s26c");
    await runningCampaign(u.cid, { count: 1 });
    const hexy = `rcp_s26c_${u.run}_0712345678_x`;
    await seat(u.cid, [{ id: hexy, key: u.key(0) }]);
    const r3 = await stepWith(impl, u.cid, engineDeps(freshState(), stubWire(), { gate: CLEARS_ALL }));
    const rowU = await rowOf(hexy);
    const kept = rowU?.status === "SENT" && rowU.smsReference === `ref_${hexy}` && rowU.gateTrail?.find((g) => g.check === "dispatch")?.source === `ref_${hexy}`;
    // a patch the rule set still refuses is set aside — its row keeps the claim — while the rest settles
    const v = worldOf("s26b");
    const seatsV = await playersOn(v, 2);
    const poison = seatsV[0].id;
    const r2 = await stepWith(impl, v.cid, engineDeps(freshState(), stubWire(), {
      gate: CLEARS_ALL,
      rules: {
        ...ENGINE.ENGINE_DEPS.rules,
        settlementFor: (o, row, ctx) => {
          const p = RULES.settlementFor(o, row, ctx);
          return p !== null && p.id === poison && p.to === "SENT" ? { ...p, smsReference: "x".repeat(150) } : p;
        },
      },
    }));
    const rowsV = await Promise.all(seatsV.map((s) => rowOf(s.id)));
    const asideOk = rowsV[0]?.status === "PENDING" && rowsV[0].claimToken !== null && rowsV[1]?.status === "SENT";
    return [r.kind === "sent" && failedOk && skippedOk && kept && asideOk,
      `${said(r)} · failed "${rows[0]?.error ?? ""}" · skipped "${rows[1]?.skipDetail ?? ""}" · reference kept whole ${kept} (${said(r3)}, source ${rowU?.gateTrail?.find((g) => g.check === "dispatch")?.source ?? "none"}) · set aside: ${said(r2)} rows ${statusesOf(rowsV)} claim kept ${rowsV[0]?.claimToken !== null}`];
  });

  // ── S27 · the wiring ──
  await claim(ok, L.s27, async () => {
    const sh = impl.shipped;
    const doors = Object.isFrozen(sh) && sh.dispatch === dispatchSlice && sh.render === renderForRecipient && sh.credit === creditVerdict
      && sh.liveGate === marketingLiveGate && sh.gate === undefined && sh.send === ENGINE.engineSend && sh.otpLastFailureAt === lastOtpFailureAt
      && sh.settings === reloadMarketingSmsSettings && sh.provider === smsProviderResolution && sh.rail === smsRailProblem
      && sh.state === ENGINE.engineProcessState && sh.rules.isShopWide === RULES.isShopWide && sh.rules.settlementFor === RULES.settlementFor
      && sh.rules.reapVerdict === RULES.reapVerdict && sh.rules.adaptSliceSize === RULES.adaptSliceSize && sh.rules.sendRecordOf === RULES.sendRecordOf
      && sh.rules.tooSlowCounts === RULES.tooSlowCounts && sh.tokenOf === currentOptOutToken;
    // engineSend through the console stub writes a MARKETING row for the recipient target
    const w = worldOf("s27");
    const target = `rcp_s27_probe_${w.run}`;
    const sentOut = await ENGINE.engineSend([{ to: w.key(1), body: "50pick: probe.", targetType: DISPATCH_TARGET_TYPE, targetId: target }], {});
    const probe = [...mem().smsMessages.values()].find((m) => m.targetId === target);
    const marketing = sentOut.results[0]?.ok === true && probe?.purpose === "MARKETING";
    const src = impl.sources;
    const engineSrc = src.engine;
    const shape = /purpose: "MARKETING"/.test(engineSrc) && !/marketing[/]enqueue/.test(engineSrc) && !/contactAudience|contactTagCounts/.test(engineSrc)
      && /from "@[/]lib[/]server[/]marketing[/]dispatch"/.test(engineSrc) && (engineSrc.match(/sendBatch[(]/g) ?? []).length === 1;
    const ruleImports = Array.from(src.rules.matchAll(/^import (type )?[{][^}]*[}] from "([^"]+)";/gm)).map((m) => `${m[1] ? "type " : ""}${m[2]}`);
    const pure = ruleImports.length > 0 && ruleImports.every((x) => x.startsWith("type ") || x === "@/lib/contacts/contact-fields")
      && ruleImports.includes("@/lib/contacts/contact-fields");
    const callers = [...src.src.entries()].filter(([rel, text]) => rel !== ENGINE_REL
      && (/runCampaignSlice|reapStrandedClaims/.test(text) || /^import [{][^}]*[}] from "[^"]*marketing[/]engine"/m.test(text) || /^import [*] as/m.test(text) && /marketing[/]engine"/.test(text)))
      .map(([rel]) => rel).filter((rel) => !ENGINE_CALLERS.includes(rel));
    const host = ["./marketing-engine/s-slice.mts", "./marketing-engine/r-reaper.mts", "./marketing-engine/c-concurrency.mts", "./marketing-engine/t-contract.mts"]
      .every((m) => src.host.includes(m));
    // ⭐ the re-review of round 2 · `insideFlight` lets a reap pass beside a slice in flight: the slice's own reap alone
    const bypass = [...src.src.entries()].filter(([rel, text]) => rel !== ENGINE_REL && /insideFlight/.test(text)).map(([rel]) => rel);
    return [doors && marketing && shape && pure && callers.length === 0 && host && bypass.length === 0,
      `doors ${doors} · engineSend MARKETING ${marketing} · engine.ts shape ${shape} · engine-rules imports [${ruleImports.join(", ")}] pure ${pure} · undeclared callers [${callers.join(", ")}] · host runs the four ${host} · insideFlight outside engine.ts [${bypass.join(", ")}]`];
  });

  // ── S28 · the OTP mark, through the real sendBatch ──
  await claim(ok, L.s28, async () => {
    const saved = globalThis.__50PICK_OTP_LAST_FAILURE_AT;
    try {
      globalThis.__50PICK_OTP_LAST_FAILURE_AT = undefined;
      const w = worldOf("s28");
      const before = Date.now();
      await realCarrier(refusedReply, () => sendBatch([{ to: w.key(1), body: "Msimbo 50pick: 123456. Dakika 5.", purpose: "OTP" }]));
      const after = Date.now();
      const mark = lastOtpFailureAt();
      const stamped = mark !== null && mark >= before && mark <= after;
      // a MARKETING failure and an accepted OTP stamp nothing
      globalThis.__50PICK_OTP_LAST_FAILURE_AT = 1_000;
      await realCarrier(refusedReply, () => sendBatch([{ to: w.key(2), body: "50pick: ofa.", purpose: "MARKETING" }]));
      await realCarrier(accepted, () => sendBatch([{ to: w.key(3), body: "Msimbo 50pick: 654321. Dakika 5.", purpose: "OTP" }]));
      const untouched = lastOtpFailureAt() === 1_000;
      // the next step, through the SHIPPED reader, waits two minutes from the mark
      globalThis.__50PICK_OTP_LAST_FAILURE_AT = mark ?? undefined;
      const v = worldOf("s28b");
      await playersOn(v, 1);
      const shipped = impl.deps(engineDeps(freshState(), stubWire(), { otpLastFailureAt: ENGINE.ENGINE_DEPS.otpLastFailureAt }));
      const r = await impl.step(v.cid, shipped);
      return [stamped && untouched && r.kind === "waiting" && r.reason === "otp_failing" && r.until === (mark === null ? "" : iso(mark + 2 * MIN)),
        `stamped ${stamped} · untouched by a marketing failure and an accepted code ${untouched} · ${said(r)}`];
    } finally {
      globalThis.__50PICK_OTP_LAST_FAILURE_AT = saved;
    }
  });

  // ── S29 · the owner's switch judged again just before the wire ──
  await claim(ok, L.s29, async () => {
    const w = worldOf("s29");
    const seats = await playersOn(w, 2);
    const now = Date.now();
    let open = true;
    const wire = stubWire();
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), wire, carrier(100_000, {
      liveSwitch: async () => (open ? { state: "open", enabledBy: "the owner", enabledAt: iso(now - MIN), closesAt: iso(now + 60 * MIN) } : { state: "closed", why: "absent" }),
      // the owner closes the switch while the slice gates
      gate: async (m) => { open = false; return CLEARS_ALL(m); },
    })));
    const rows = await Promise.all(seats.map((s) => rowOf(s.id)));
    const c = await campaignOf(w.cid);
    const paused = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, w.cid);
    return [r.kind === "paused" && r.reason === "live_switch_closed" && wire.calls === 0
      && rows.every((x) => x?.status === "PENDING" && x.claimToken === null && x.attempts === 0) && c?.stopReason === "live_switch_closed" && paused.length === 1,
      `${said(r)} · wire calls ${wire.calls} · rows ${statusesOf(rows)} attempts ${rows.map((x) => x?.attempts).join("")} · paused rows ${paused.length}`];
  });

  // ── S30 · a SKIPPED row stays SKIPPED inside a shop-wide slice (one RG line, whatever the Resumes) ──
  await claim(ok, L.s30, async () => {
    const w = worldOf("s30");
    const seats = await playersOn(w, 3);
    const excluded = seats[0].userId as string;
    await selfExclude(excluded, "24h");
    const r1 = await stepWith(impl, w.cid, engineDeps(freshState(), stubWire({ answer: () => "rejected" })));
    const rows1 = await Promise.all(seats.map((s) => rowOf(s.id)));
    const rg1 = (await auditRows(MARKETING_RG_SUPPRESSED_ACTION, excluded)).length;
    await moveCampaign(w.cid, ["PAUSED"], "RUNNING", { stopReason: null });
    const wire2 = stubWire();
    const r2 = await stepWith(impl, w.cid, engineDeps(freshState(), wire2));
    const rows2 = await Promise.all(seats.map((s) => rowOf(s.id)));
    const rg2 = (await auditRows(MARKETING_RG_SUPPRESSED_ACTION, excluded)).length;
    return [r1.kind === "paused" && r1.reason === "gateway_refused" && rows1[0]?.status === "SKIPPED" && rows1[0].attempts === 0
      && rows1.slice(1).every((x) => x?.status === "PENDING" && x.attempts === 1) && rg1 === 1
      && r2.kind === "sent" && wire2.sent.length === 2 && !wireKeys(wire2).includes(seats[0].key) && rows2[0]?.status === "SKIPPED"
      && rows2.slice(1).every((x) => x?.status === "SENT") && rg2 === 1,
      `refused: ${said(r1)} rows ${statusesOf(rows1)}/${rows1.map((x) => x?.attempts).join("")} RG ${rg1} · after Resume: ${said(r2)} rows ${statusesOf(rows2)} RG ${rg2}`];
  });

  // ── S31 · a hold reason the table does not know is about one person ──
  await claim(ok, L.s31, async () => {
    const w = worldOf("s31");
    const seats = await playersOn(w, 3);
    const odd = seats[1].id;
    // dispatch keeps one row back with a reason nobody listed, and runs the rest as ever
    const dispatch: EngineDeps["dispatch"] = async (rows, sd) => {
      const rest = rows.filter((r) => r.ref !== odd);
      const out = rest.length === 0 ? [] : await dispatchSlice(rest, sd);
      const kept: SliceOutcome[] = rows.filter((r) => r.ref === odd).map((r) => ({ ref: r.ref, outcome: "held", reason: "mystery_hold", basis: "CONSENT", basisRef: "ledger:fixture" }));
      return [...out, ...kept];
    };
    const d = engineDeps(freshState(), stubWire(), { gate: CLEARS_ALL, dispatch });
    const first = await stepWith(impl, w.cid, d);
    const after1 = await rowOf(odd);
    const second = await stepWith(impl, w.cid, d);
    const after2 = await rowOf(odd);
    const third = await stepWith(impl, w.cid, d);
    const held = await rowOf(odd);
    const others = await Promise.all([rowOf(seats[0].id), rowOf(seats[2].id)]);
    return [after1?.status === "PENDING" && after1.attempts === 1 && after2?.status === "PENDING" && after2.attempts === 2
      && held?.status === "HELD" && held.attempts === 3 && held.failureClass === "mystery_hold" && others.every((x) => x?.status === "SENT"),
      `${said(first)} → ${said(second)} → ${said(third)} · the row ${after1?.status}/${after1?.attempts} → ${after2?.status}/${after2?.attempts} → ${held?.status}/${held?.attempts}/${held?.failureClass} · others ${statusesOf(others)}`];
  });

  // ── S32 · a failure before the request, batch-wide: NOT_CONFIGURED and UNKNOWN ──
  await claim(ok, L.s32, async () => {
    const out: string[] = [];
    let holds = true;
    for (const [answer, want] of [["not_configured", "NOT_CONFIGURED"], ["unknown", "send_error"]] as const) {
      const w = worldOf("s32");
      const seats = await playersOn(w, 2);
      const r = await stepWith(impl, w.cid, engineDeps(freshState(), stubWire({ answer: () => answer })));
      const rows = await Promise.all(seats.map((s) => rowOf(s.id)));
      const c = await campaignOf(w.cid);
      const paused = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, w.cid);
      holds = holds && r.kind === "paused" && r.reason === want && rows.every((x) => x?.status === "PENDING" && x.attempts === 1 && x.claimToken === null)
        && c?.stopReason === want && paused.length === 1;
      out.push(`${answer}: ${said(r)} rows ${statusesOf(rows)}/${rows.map((x) => x?.attempts).join("")} paused ${paused.length}`);
    }
    const error = impl.stopLabel("send_error");
    const words = error.includes("on our side") && !error.includes("refused") && !impl.stopLabel("NOT_CONFIGURED").includes("refused");
    return [holds && words, `${out.join(" · ")} · words ${words}`];
  });

  // ── S33 · the list check runs FIRST ──
  await claim(ok, L.s33, async () => {
    const a = worldOf("s33a");
    await playersOn(a, 3, { count: 2 });
    const wire = stubWire();
    const rA = await stepWith(impl, a.cid, engineDeps(freshState(), wire, carrier(100_000, {
      liveSwitch: async () => ({ state: "closed", why: "absent" }),
      window: ALWAYS_CLOSED,
    })));
    const b = worldOf("s33b");
    await playersOn(b, 2);
    const stored = mem() as unknown as { smsCampaigns: Map<string, { audienceCount: number | null }> };
    const row = stored.smsCampaigns.get(b.cid);
    if (row) row.audienceCount = null;
    const rB = await stepWith(impl, b.cid, engineDeps(freshState(), stubWire(), { rail: () => "keys-not-set" }));
    return [rA.kind === "paused" && rA.reason === "list_over_confirmed_sending" && claimedNone(a.cid) && wire.calls === 0
      && rB.kind === "paused" && rB.reason === "confirmation_unreadable" && claimedNone(b.cid),
      `over the count, switch closed, window closed: ${said(rA)} · no count, a dead rail: ${said(rB)}`];
  });

  // ── S34 · a send that threw: the evidence decides ──
  await claim(ok, L.s34, async () => {
    // ① it threw before writing anything: no message names the rows — certainly never on the wire
    const a = worldOf("s34a");
    const seatsA = await playersOn(a, 2);
    const wireA = stubWire({ throwsBefore: true });
    const rA = await stepWith(impl, a.cid, engineDeps(freshState(), wireA));
    const rowsA = await Promise.all(seatsA.map((s) => rowOf(s.id)));
    const pausedA = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, a.cid);
    const detail = String((pausedA[0]?.payload as Record<string, unknown> | undefined)?.detail ?? "");
    // ② it threw AFTER its message rows were written: the batch may be on the network — never released
    const b = worldOf("s34b");
    const seatsB = await playersOn(b, 2);
    const rB = await stepWith(impl, b.cid, engineDeps(freshState(), stubWire({ throws: true })));
    const rowsB = await Promise.all(seatsB.map((s) => rowOf(s.id)));
    const sentence = impl.stopLabel("send_error");
    const words = sentence.includes("on our side") && sentence.includes("never sent again by themselves") && !sentence.includes("refused");
    return [rA.kind === "paused" && rA.reason === "send_error" && wireA.sent.length === 0
      && rowsA.every((x) => x?.status === "PENDING" && x.attempts === 1 && x.claimToken === null) && pausedA.length === 1 && detail === "Error" && !detail.includes("could not be written")
      && rB.kind === "paused" && rB.reason === "send_error" && rowsB.every((x) => x?.status === "UNCONFIRMED" && x.attempts === 0) && words,
      `before anything: ${said(rA)} rows ${statusesOf(rowsA)}/${rowsA.map((x) => x?.attempts).join("")} paused ${pausedA.length} "${detail.slice(0, 60)}" · after its rows: ${said(rB)} rows ${statusesOf(rowsB)} · words ${words}`];
  });

  // ── S35 · the send's deadline (the U43b-2 re-review) ──
  await claim(ok, L.s35, async () => {
    // ① the deadline handed to the send: the slice's oldest claim plus the send-age bound — ⭐ on a FIXED clock (the re-review
    // of round 2), so a deadline sliding with the real clock (`Date.now()` + the bound) cannot pass for the claim's own
    const a = worldOf("s35a");
    await playersOn(a, 2);
    const wireA = stubWire();
    const T = Date.parse("2026-10-07T09:00:00.000Z");
    const rA = await stepWith(impl, a.cid, { ...engineDeps(freshState(), wireA), now: () => new Date(T) });
    const naA = (wireA.opts[0] as { notAfter?: unknown } | undefined)?.notAfter;
    const handed = naA === T + ENGINE.CLAIM_SEND_MAX_AGE_MS;
    // ② refused whole for a passed deadline: a WAIT, its people back as they were
    const b = worldOf("s35b");
    const seatsB = await playersOn(b, 2);
    const rB = await stepWith(impl, b.cid, engineDeps(freshState(), stubWire({ refused: "DEADLINE_PASSED" })));
    const rowsB = await Promise.all(seatsB.map((x) => rowOf(x.id)));
    // ③ the deadline passed while the rows were written (no request; sendBatch wrote them FAILED): the same wait
    const c = worldOf("s35c");
    const seatsC = await playersOn(c, 2);
    const rC = await stepWith(impl, c.cid, engineDeps(freshState(), stubWire({ answer: () => "deadline" })));
    const rowsC = await Promise.all(seatsC.map((x) => rowOf(x.id)));
    const back = (rows: ReadonlyArray<Awaited<ReturnType<typeof rowOf>>>): boolean => rows.every((x) => x?.status === "PENDING" && x.attempts === 0 && x.claimToken === null);
    const pausedNone = (await auditRows(ENGINE.ENGINE_PAUSED_ACTION, b.cid)).length === 0 && (await auditRows(ENGINE.ENGINE_PAUSED_ACTION, c.cid)).length === 0;
    return [rA.kind === "sent" && handed && rB.kind === "waiting" && rB.reason === "slice_too_slow" && back(rowsB)
      && rC.kind === "waiting" && rC.reason === "slice_too_slow" && back(rowsC) && pausedNone,
      `deadline handed ${handed ? "yes" : `NO (${String(naA)})`} · refused whole: ${said(rB)} rows ${statusesOf(rowsB)} · failed in the write: ${said(rC)} rows ${statusesOf(rowsC)} · no paused row ${pausedNone}`];
  });

  // ── S36 · too slow three times in a row PAUSES ──
  await claim(ok, L.s36, async () => {
    const w = worldOf("s36");
    await playersOn(w, 2);
    const state = freshState();
    const wire = stubWire({ refused: "DEADLINE_PASSED" });
    const r1 = await stepWith(impl, w.cid, engineDeps(state, wire));
    const r2 = await stepWith(impl, w.cid, engineDeps(state, wire));
    const r3 = await stepWith(impl, w.cid, engineDeps(state, wire));
    const paused = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, w.cid);
    const sentence = impl.stopLabel("slice_too_slow");
    const words = sentence.includes("too long three times running") && sentence.includes("nothing more was sent");
    return [r1.kind === "waiting" && r1.reason === "slice_too_slow" && r2.kind === "waiting" && r2.reason === "slice_too_slow"
      && r3.kind === "paused" && r3.reason === "slice_too_slow" && paused.length === 1 && words && wire.sent.length === 0,
      `${said(r1)} · ${said(r2)} · ${said(r3)} · paused rows ${paused.length} · words ${words} · sent ${wire.sent.length}`];
  });

  // ── S37 · a failure that names no code is no answer ──
  await claim(ok, L.s37, async () => {
    const w = worldOf("s37");
    const seats = await playersOn(w, 2);
    const r = await stepWith(impl, w.cid, engineDeps(freshState(), stubWire({ answer: () => "nocode" })));
    const rows = await Promise.all(seats.map((x) => rowOf(x.id)));
    // ⭐ the re-review of round 2 · the `""` arm: a code that is there but EMPTY is no answer either
    const e = worldOf("s37e");
    const seatsE = await playersOn(e, 2);
    const rE = await stepWith(impl, e.cid, engineDeps(freshState(), stubWire({ answer: () => "emptycode" })));
    const rowsE = await Promise.all(seatsE.map((x) => rowOf(x.id)));
    return [rows.every((x) => x?.status === "UNCONFIRMED") && r.kind === "paused" && r.reason === "gateway_unanswered"
      && rowsE.every((x) => x?.status === "UNCONFIRMED") && rE.kind === "paused" && rE.reason === "gateway_unanswered",
      `no code: ${said(r)} · rows ${statusesOf(rows)} · empty code: ${said(rE)} · rows ${statusesOf(rowsE)}`];
  });

  // ── S38 · too slow counts at the smallest group only ──
  await claim(ok, L.s38, async () => {
    const w = worldOf("s38");
    await playersOn(w, 8);
    const state = freshState();
    const wire = stubWire({ refused: "DEADLINE_PASSED" });
    // eight people claimed at a time (the size held there, so the group never shrinks under the test's feet)
    const big = { ...engineDeps(state, wire), rules: { ...engineDeps(state, wire).rules, adaptSliceSize: () => 8 } };
    const b1 = await stepWith(impl, w.cid, big);
    const b2 = await stepWith(impl, w.cid, big);
    const b3 = await stepWith(impl, w.cid, big);
    const uncounted = [b1, b2, b3].every((x) => x.kind === "waiting" && x.reason === "slice_too_slow") && (state.tooSlow?.[w.cid] ?? 0) === 0;
    // the smallest group: five at a time — the third in a row pauses
    const small = { ...engineDeps(state, wire), rules: { ...engineDeps(state, wire).rules, adaptSliceSize: () => ENGINE.SLICE_MIN } };
    const s1 = await stepWith(impl, w.cid, small);
    const s2 = await stepWith(impl, w.cid, small);
    // …a slice that settles its people (an accepting wire) starts the count over
    const okWire = stubWire();
    const settledStep = await stepWith(impl, w.cid, { ...engineDeps(state, okWire), rules: { ...engineDeps(state, okWire).rules, adaptSliceSize: () => 1 } });
    const afterReset = state.tooSlow?.[w.cid] ?? 0;
    const s3 = await stepWith(impl, w.cid, small);
    const s4 = await stepWith(impl, w.cid, small);
    const s5 = await stepWith(impl, w.cid, small);
    const paused = await auditRows(ENGINE.ENGINE_PAUSED_ACTION, w.cid);
    return [uncounted && s1.kind === "waiting" && s2.kind === "waiting" && settledStep.kind === "sent" && afterReset === 0
      && s3.kind === "waiting" && s4.kind === "waiting" && s5.kind === "paused" && s5.reason === "slice_too_slow" && paused.length === 1,
      `eight at a time: ${[b1, b2, b3].map(said).join(" · ")} (count ${state.tooSlow?.[w.cid] ?? 0}) · five: ${said(s1)} · ${said(s2)} · settled ${said(settledStep)} (count ${afterReset}) · ${said(s3)} · ${said(s4)} · ${said(s5)} · paused rows ${paused.length}`];
  });

  // ── S39 · an officer's Pause and Resume start the streaks over ──
  await claim(ok, L.s39, async () => {
    const pauseResume = async (cid: string, at: string): Promise<void> => {
      await db.smsCampaign.transition(cid, { from: ["RUNNING"], to: "PAUSED", patch: { pausedAt: at, stopReason: "officer_paused" }, draftRevision: null, at });
      await db.smsCampaign.transition(cid, { from: ["PAUSED"], to: "RUNNING", patch: { stopReason: null }, draftRevision: null, at });
    };
    // too slow
    const w = worldOf("s39");
    await playersOn(w, 2);
    const state = freshState();
    const wire = stubWire({ refused: "DEADLINE_PASSED" });
    const d = engineDeps(state, wire);
    const a1 = await stepWith(impl, w.cid, d);
    const a2 = await stepWith(impl, w.cid, d);
    await pauseResume(w.cid, new Date(Date.now() - 1000).toISOString());
    const a3 = await stepWith(impl, w.cid, d);
    const a4 = await stepWith(impl, w.cid, d);
    const a5 = await stepWith(impl, w.cid, d);
    const slowOk = [a1, a2, a3, a4].every((x) => x.kind === "waiting" && x.reason === "slice_too_slow") && a5.kind === "paused" && a5.reason === "slice_too_slow";
    // the check before the wire unanswered
    // (S22's own way to blind the re-read: the claims cannot be read just before the wire)
    const u = worldOf("s39u");
    await playersOn(u, 2);
    const stateU = freshState();
    const blindU = engineDeps(stateU, stubWire(), { gate: CLEARS_ALL, recipients: { ...ENGINE.ENGINE_DEPS.recipients, claimedBy: async () => { throw new Error("claims unreadable (fixture)"); } } });
    const u1 = await stepWith(impl, u.cid, blindU);
    const u2 = await stepWith(impl, u.cid, blindU);
    await pauseResume(u.cid, new Date(Date.now() - 500).toISOString());
    const u3 = await stepWith(impl, u.cid, blindU);
    const u4 = await stepWith(impl, u.cid, blindU);
    const u5 = await stepWith(impl, u.cid, blindU);
    const unansweredOk = [u1, u2, u3, u4].every((x) => x.kind === "waiting" && x.reason === "before_send_unanswered") && u5.kind === "paused" && u5.reason === "before_send_unanswered";
    return [slowOk && unansweredOk,
      `too slow: ${[a1, a2, "· pause + resume ·", a3, a4, a5].map((x) => (typeof x === "string" ? x : said(x))).join(" · ")} · unanswered: ${[u1, u2, "· pause + resume ·", u3, u4, u5].map((x) => (typeof x === "string" ? x : said(x))).join(" · ")}`];
  });
}

/* ══ THE PLANTS — each a defect as somebody would write it, swapped in memory ══════════════════════════════════════ */

/** A deps transform as a plant: the claim's own deps, then the planted change. */
const withDeps = (f: (d: EngineDeps) => EngineDeps): (() => Partial<SImpl>) => () => ({ deps: f });
const outcomesMapped = (d: EngineDeps, f: (o: SliceOutcome) => SliceOutcome): EngineDeps => ({
  ...d, dispatch: async (rows, sd) => (await d.dispatch(rows, sd)).map(f),
});

export const S_PLANTS: ReadonlyArray<EnginePlant<SImpl>> = [
  {
    name: "R-S35 · the send's deadline not handed to sendBatch — a stalled row write sends to people a reaper has released",
    expect: [L.s35],
    impl: withDeps((d) => ({ ...d, send: (m, o) => d.send(m, o.minimumBalanceTzs === undefined ? {} : { minimumBalanceTzs: o.minimumBalanceTzs }) })),
  },
  {
    name: "R-S35b · a deadline failure read as the wire refusing it — the campaign paused and its people released, though nothing was sent",
    expect: [L.s35],
    impl: withDeps((d) => ({ ...d, rules: { ...d.rules, isShopWide: (outs) => d.rules.isShopWide(outs.map((o) => (o.outcome === "failed" && o.code === "DEADLINE_PASSED" ? { ...o, code: "REJECTED" } : o))) } })),
  },
  {
    name: "R-S36 · too slow never escalates — at the smallest group the same people are re-asked for ever (S38 and S39 count on the escalation too)",
    expect: [L.s36, L.s38, L.s39],
    impl: withDeps((d) => ({ ...d, state: () => { const st = d.state(); delete st.tooSlow; return st; } })),
  },
  {
    name: "R-S37 · a failure with no code read as certainly before the request — released, and sent again after a Resume",
    expect: [L.s37],
    impl: withDeps((d) => outcomesMapped(d, (o) => (o.outcome === "unconfirmed" && (o as { code?: unknown }).code === undefined && typeof (o as { reference?: unknown }).reference === "string"
      ? ({ ref: o.ref, outcome: "failed", code: "UNKNOWN", error: null } as SliceOutcome) : o))),
  },
  {
    name: "R-S37b · an EMPTY code taken for a code (the re-review of round 2) — the batch read as the network's refusal, its people released",
    expect: [L.s37],
    impl: withDeps((d) => outcomesMapped(d, (o) => (o.outcome === "unconfirmed" && (o as { code?: unknown }).code === undefined && typeof (o as { reference?: unknown }).reference === "string"
      ? ({ ref: o.ref, outcome: "failed", code: "", error: null } as unknown as SliceOutcome) : o))),
  },
  {
    name: "R-S35c · a deadline that slides with the clock (Date.now() + the bound, never the oldest claim's) — a stalled slice keeps its licence",
    expect: [L.s35],
    impl: withDeps((d) => ({ ...d, send: (m, o) => d.send(m, { ...o, notAfter: Date.now() + ENGINE.CLAIM_SEND_MAX_AGE_MS }) })),
  },
  {
    name: "R-S38 · every slow slice counted, at any size — eight people too slow three times pause a campaign whose next slice could still shrink",
    expect: [L.s38],
    impl: withDeps((d) => ({ ...d, rules: { ...d.rules, tooSlowCounts: () => true } })),
  },
  {
    name: "R-S39 · the streaks survive an officer's Pause and Resume — one slow slice after a Resume pauses the campaign at once",
    expect: [L.s39],
    impl: withDeps((d) => ({ ...d, campaigns: { ...d.campaigns, find: async (id: string) => {
      const c = await d.campaigns.find(id);
      if (c !== null) (d.state().runMark ??= {})[id] = c.pausedAt ?? "";
      return c;
    } } })),
  },
  {
    name: "R-S1 · the trail without its render entry (six entries — what went out is no longer on the record)",
    expect: [L.s1, L.s6, L.s16],
    impl: withDeps((d) => ({
      ...d,
      rules: { ...d.rules, settlementFor: (o, row, ctx) => {
        const p = d.rules.settlementFor(o, row, ctx);
        return p !== null && "gateTrail" in p ? { ...p, gateTrail: p.gateTrail.filter((g) => g.check !== "render") } as typeof p : p;
      } },
    })),
  },
  {
    name: "R-S2 (the spec's) · TRANSPORT mapped to failed — a lost reply settled as a refusal, which invites a retry",
    expect: [L.s2, L.s19, L.s20],
    impl: withDeps((d) => outcomesMapped(d, (o) => (o.outcome === "unconfirmed" && o.code === "TRANSPORT"
      ? { ref: o.ref, outcome: "failed", code: "TRANSPORT", error: "reply lost", basis: o.basis, basisRef: o.basisRef, ...(o.meta ? { meta: o.meta } : {}) }
      : o))),
  },
  {
    name: "R-S3 (the spec's) · a refused batch settled FAILED row by row (the shop-wide verdict blind to a status:false batch)",
    expect: [L.s3, L.s20, L.s30, L.s32, L.s35],
    impl: withDeps((d) => ({
      ...d,
      rules: { ...d.rules, isShopWide: (os) => { const v = d.rules.isShopWide(os); return v.shopWide && v.match.outcome === "failed" ? { shopWide: false } : v; } },
    })),
  },
  {
    name: "R-S4 · a whole-batch hold settled as one person's (+1 each, and no pause)",
    expect: [L.s4],
    impl: withDeps((d) => ({
      ...d,
      rules: { ...d.rules, isShopWide: (os) => { const v = d.rules.isShopWide(os); return v.shopWide && (v.reason === "BALANCE_FLOOR" || v.reason === "MARKETING_FLOOR") ? { shopWide: false } : v; } },
    })),
  },
  {
    name: "R-S5 · a per-person hold never parked — the 3rd failure released again (a person the gate cannot answer is retried for ever)",
    expect: [L.s5, L.s10, L.s31],
    impl: withDeps((d) => ({
      ...d,
      rules: { ...d.rules, settlementFor: (o, row, ctx) => { const p = d.rules.settlementFor(o, row, ctx); return p !== null && p.to === "HELD" ? { id: p.id, claimToken: p.claimToken, to: "PENDING", attemptsDelta: 1 } : p; } },
    })),
  },
  {
    // A registered player's number walked by their book row (contactId set) is read as a stranger: no account, so the
    // source line is required — and on a campaign without one, the player is refused.
    name: "R-S6 (the spec's) · the origin taken from the row kind — a book row read as the book, never the account that holds the number",
    expect: [L.s6],
    impl: withDeps((d) => ({
      ...d,
      users: {
        findByPhone: async (phone) => {
          const row = [...mem().smsCampaignRecipients.values()].find((r) => `+${r.msisdn}` === phone && r.status === "PENDING" && r.claimToken !== null);
          return row !== undefined && row.contactId !== null ? null : d.users.findByPhone(phone);
        },
      },
    })),
  },
  {
    name: "R-S7 (the spec's) · the token minted before the gate — every claimed number prepared (and minted a permanent link) before it is asked",
    expect: [L.s7],
    impl: withDeps((d) => ({
      ...d,
      dispatch: async (rows, sd) => {
        for (const r of rows) {
          const key = parseTzNumber(r.msisdn).msisdn;
          if (r.prepare !== undefined && key !== null) await r.prepare(key, { ok: true, basis: "CONSENT", basisRef: "ledger:planted" });
        }
        return d.dispatch(rows, sd);
      },
    })),
  },
  {
    name: "R-S8 · the switch never read — THE gate answered open whatever the switch says",
    expect: [L.s8, L.s29],
    impl: withDeps((d) => ({ ...d, liveGate: () => ({ ok: true, via: "open" }) })),
  },
  {
    name: "R-S9 (the spec's) · beforeSend removed — a campaign paused while it gated still sends (and S39's blinded re-read never fails)",
    expect: [L.s9, L.s18, L.s22, L.s29, L.s39],
    impl: withDeps((d) => ({ ...d, dispatch: (rows, sd) => d.dispatch(rows, { ...sd, beforeSend: undefined }) })),
  },
  {
    name: "R-S10 · HELD counted settled — a campaign whose people the engine could not check is finished DONE",
    expect: [L.s10],
    impl: withDeps((d) => ({
      ...d,
      recipients: {
        ...d.recipients,
        countByStatus: async (id) => (await d.recipients.countByStatus(id)).map((c) => (c.status === "HELD" ? { ...c, status: "SENT" as const } : c)),
      },
    })),
  },
  {
    name: "R-S11 · the window not asked before the claim — the slice claims people at night and only dispatch holds them",
    expect: [L.s11],
    impl: withDeps((d) => {
      let first = true;
      return { ...d, window: async () => { if (first) { first = false; return { ...ALWAYS_CLOSED(), open: true, reason: null }; } return d.window(); } };
    }),
  },
  {
    name: "R-S12 · money busy ignored",
    expect: [L.s12],
    impl: withDeps((d) => ({ ...d, moneyBusy: () => ({ busy: false, stale: [] }) })),
  },
  {
    name: "R-S13 · the OTP-failure wait ignored (the mark never read)",
    expect: [L.s13, L.s28],
    impl: withDeps((d) => ({ ...d, otpLastFailureAt: () => null })),
  },
  {
    name: "R-S14 · the slice size fixed at 20 (a slow gate never shrinks it — so S38's smallest group is never reached)",
    expect: [L.s14, L.s38],
    impl: () => ({ adapt: () => 20, deps: (d) => ({ ...d, rules: { ...d.rules, adaptSliceSize: () => 20 } }) }),
  },
  {
    name: "R-S15 · an audit row per slice (the chain grows with every step)",
    expect: [L.s15],
    impl: withDeps((d) => ({
      ...d,
      dispatch: async (rows, sd) => {
        const out = await d.dispatch(rows, sd);
        const cid = rows[0] === undefined ? null : [...mem().smsCampaignRecipients.values()].find((r) => r.id === rows[0].ref)?.campaignId ?? null;
        await d.audit({ category: "SYSTEM", action: "marketing.campaign_slice", actorId: null, targetType: "SmsCampaign", targetId: cid, payload: { rows: rows.length } });
        return out;
      },
    })),
  },
  {
    name: "R-S16 (the spec's) · the lost SENT patch dropped — a receipt's DELIVERED row keeps no trail and no hand-over instant",
    expect: [L.s16],
    impl: withDeps((d) => ({ ...d, recipients: { ...d.recipients, recordSend: async () => ({ written: false }) } })),
  },
  {
    // The pre-claim read sees a count that fits; only the re-read before the wire sees the real one — so the slice claims
    // the people of a list longer than confirmed before anything stops it.
    name: "R-S17 · the pre-claim count check removed (U42's re-review) — an over-count list is claimed before it is caught",
    expect: [L.s17, L.s33],
    impl: withDeps((d) => {
      let first = true;
      return {
        ...d,
        campaigns: {
          ...d.campaigns,
          find: async (id) => { const r = await d.campaigns.find(id); if (first && r !== null) { first = false; return { ...r, audienceCount: 1_000_000 }; } return r; },
        },
      };
    }),
  },
  {
    name: "R-S18 · the re-check before the wire blind to the count (U42's re-review) — a row added past the count while the slice gates is sent to",
    expect: [L.s18],
    impl: withDeps((d) => {
      let first = true;
      return {
        ...d,
        campaigns: {
          ...d.campaigns,
          find: async (id) => { const r = await d.campaigns.find(id); if (first) { first = false; return r; } return r === null ? r : { ...r, audienceCount: 1_000_000 }; },
        },
      };
    }),
  },
  {
    name: "R-S19 · an unanswered batch not paused — an outage turns the whole audience into no answer, slice after slice",
    expect: [L.s19, L.s20, L.s37],
    impl: withDeps((d) => ({
      ...d,
      rules: { ...d.rules, isShopWide: (os) => { const v = d.rules.isShopWide(os); return v.shopWide && v.reason === "gateway_unanswered" ? { shopWide: false } : v; } },
    })),
  },
  {
    // sms.ts before U43b-2 read a 5xx or an HTML reply as the gateway's refusal: REJECTED, and the row FAILED.
    name: "R-S20 · a 5xx reply read as a refusal (sms.ts before U43b-2) — the batch the gateway may have taken released and sent again after Resume",
    expect: [L.s2, L.s19, L.s20],
    impl: withDeps((d) => ({
      ...d,
      send: async (m, o) => { const r = await d.send(m, o); return { ...r, results: r.results.map((x) => (x.code === "TRANSPORT" ? { ...x, code: "REJECTED" as const } : x)) }; },
    })),
  },
  {
    name: "R-S21 · the per-slice credit check skipped (the reserve never judged)",
    expect: [L.s21],
    impl: withDeps((d) => ({ ...d, credit: () => ({ ok: true }) })),
  },
  {
    name: "R-S22 · the unanswered re-check never escalates — a hook that always fails is a silent, permanent stall (S39 counts on it too)",
    expect: [L.s22, L.s39],
    impl: withDeps((d) => {
      const inner = d.state();
      const forgetful = new Proxy(inner, {
        get: (t, k) => (k === "unanswered" ? {} : (t as unknown as Record<string | symbol, unknown>)[k]),
      }) as EngineProcessState;
      return { ...d, state: () => forgetful };
    }),
  },
  {
    name: "R-S23 · the stored template never dry-run (every person refused one by one instead of one pause)",
    expect: [L.s23],
    impl: withDeps((d) => ({
      ...d,
      render: (t, r) => { const m = d.render(t, r); return r.token === "xxxxxxxx" ? { ...m, ok: true, problems: [] } : m; },
    })),
  },
  {
    name: "R-S24 · an unrecognised provider judged by the switch (paused live_switch_closed, which the owner cannot fix)",
    expect: [L.s24],
    impl: withDeps((d) => ({ ...d, provider: () => { const p = d.provider(); return p === "unrecognised" ? "blackball" : p; } })),
  },
  {
    name: "R-S25 · the single-flight gone — the process's flight never recorded, so a second step runs beside the first",
    expect: [L.s25],
    impl: withDeps((d) => {
      const inner = d.state();
      const unflown = new Proxy(inner, {
        get: (t, k) => (k === "flight" ? null : (t as unknown as Record<string | symbol, unknown>)[k]),
        set: (t, k, v) => { if (k !== "flight") (t as unknown as Record<string | symbol, unknown>)[k] = v; return true; },
      }) as EngineProcessState;
      return { ...d, state: () => unflown };
    }),
  },
  {
    name: "R-S26 · DC-5's scrub removed — the gateway's words handed in raw",
    expect: [L.s26],
    impl: withDeps((d) => ({
      ...d,
      rules: { ...d.rules, settlementFor: (o, row, ctx) => {
        const p = d.rules.settlementFor(o, row, ctx);
        if (p !== null && p.to === "FAILED" && o.outcome === "failed") return { ...p, error: o.error };
        if (p !== null && p.to === "SKIPPED" && o.outcome === "skipped") return { ...p, skipDetail: o.detail };
        return p;
      } },
    })),
  },
  {
    // The trail's source scrubbed whole, as free words are: an SMS reference whose characters hold a phone-shaped run is
    // masked on the very record a receipt is matched against.
    name: "R-S26b · the trail's source scrubbed whole (a reference corrupted wherever its characters look like a number)",
    expect: [L.s1, L.s26],
    impl: withDeps((d) => ({
      ...d,
      rules: { ...d.rules, settlementFor: (o, row, ctx) => {
        const p = d.rules.settlementFor(o, row, ctx);
        return p !== null && "gateTrail" in p
          ? { ...p, gateTrail: p.gateTrail.map((g) => ({ ...g, source: g.source === null ? null : RULES.cleanText(g.source, RULES.TRAIL_TEXT_MAX) })) } as typeof p
          : p;
      } },
    })),
  },
  {
    name: "R-S27 · a second caller of the engine (an action calls runCampaignSlice before U47b declares itself)",
    expect: [L.s27],
    impl: () => ({ sources: { ...REAL_SOURCES, src: new Map([...REAL_SOURCES.src, ["src/app/admin/campaigns/[id]/actions.ts", `import { runCampaignSlice } from "@/lib/server/marketing/engine";${NL}export const step = runCampaignSlice;`]]) } }),
  },
  {
    name: "R-S27b · the engine's one send loses its purpose (sendBatch called with the messages as they came)",
    expect: [L.s27],
    impl: () => ({ sources: { ...REAL_SOURCES, engine: REAL_SOURCES.engine.split('purpose: "MARKETING"').join("purpose: m.purpose") } }),
  },
  {
    name: "R-S27c · a declared caller passes the reaper's bypass (the re-review of round 2: a reap-only step beside a slice in flight)",
    expect: [L.s27],
    impl: () => ({ sources: { ...REAL_SOURCES, src: new Map([...REAL_SOURCES.src, ["src/lib/server/marketing/campaign-control.ts", `${REAL_SOURCES.src.get("src/lib/server/marketing/campaign-control.ts") ?? ""}${NL}export const reapBeside = (id: string) => reapStrandedClaims(id, undefined, { insideFlight: 1 });`]]) } }),
  },
  {
    name: "R-S28 · the OTP mark read from a module of its own (a second instance never sees it)",
    expect: [L.s28],
    impl: withDeps((d) => (d.otpLastFailureAt === ENGINE.ENGINE_DEPS.otpLastFailureAt ? { ...d, otpLastFailureAt: () => null } : d)),
  },
  {
    // The switch read once, before the claim, and that reading reused at the last word before the wire.
    name: "R-S29 · the owner's switch judged before the claim only — a switch closed while the slice gates still sends",
    expect: [L.s29],
    impl: withDeps((d) => {
      let first: ReturnType<EngineDeps["liveSwitch"]> | null = null;
      return { ...d, liveSwitch: () => (first ??= d.liveSwitch()) };
    }),
  },
  {
    name: "R-S30 · a shop-wide verdict releases every claimed row, the skipped too (a second RG line on every Resume)",
    expect: [L.s30],
    impl: withDeps((d) => ({
      ...d,
      rules: { ...d.rules, settlementFor: (o, row, ctx) => (o.outcome === "skipped" && ctx.shop.shopWide && ctx.shop.release
        ? { id: row.id, claimToken: ctx.claimToken, to: "PENDING", attemptsDelta: ctx.shop.attemptsDelta }
        : d.rules.settlementFor(o, row, ctx)) },
    })),
  },
  {
    // holdKind's default flipped for a reason nobody listed: back as it was, every slice, for ever.
    name: "R-S31 · a hold reason the table does not know read as a wait — +0 every slice, a silent loop",
    expect: [L.s31],
    impl: withDeps((d) => {
      const listed = (reason: string): boolean => reason === "gate_unanswered" || reason.startsWith("prepare:");
      return {
        ...d,
        rules: { ...d.rules, settlementFor: (o, row, ctx) => (o.outcome === "held" && RULES.holdKind(o.reason) === "person" && !listed(o.reason)
          ? { id: row.id, claimToken: ctx.claimToken, to: "PENDING", attemptsDelta: 0 }
          : d.rules.settlementFor(o, row, ctx)) },
      };
    }),
  },
  {
    name: "R-S32 · the code-key branch removed — a failure before the request paused as the network's refusal",
    expect: [L.s32, L.s35],
    impl: withDeps((d) => ({
      ...d,
      rules: { ...d.rules, isShopWide: (os) => { const v = d.rules.isShopWide(os); return v.shopWide && v.match.outcome === "failed" ? { ...v, reason: "gateway_refused" } : v; } },
    })),
  },
  {
    // The switch judged ahead of the list: a list longer than confirmed is paused as a closed switch, which a Resume
    // would "fix" — and then send to the extra rows.
    name: "R-S33 · the switch judged before the list check — an over-count list paused as a closed switch",
    expect: [L.s33],
    impl: () => ({
      step: async (id, d) => {
        const c = await d.campaigns.find(id);
        const provider = d.provider();
        if (c !== null && c.status === "RUNNING" && provider !== "unrecognised") {
          let live: Awaited<ReturnType<EngineDeps["liveSwitch"]>>;
          try {
            live = await d.liveSwitch();
          } catch {
            live = { state: "closed", why: "unreadable" };
          }
          if (!d.liveGate(provider, live, d.now().getTime()).ok) {
            const at = d.now().toISOString();
            const moved = await d.campaigns.transition(id, { from: ["RUNNING"], to: "PAUSED", patch: { pausedAt: at, stopReason: "live_switch_closed" }, draftRevision: null, at });
            if (moved !== null) {
              await d.audit({ category: "SYSTEM", action: ENGINE.ENGINE_PAUSED_ACTION, actorId: null, targetType: "SmsCampaign", targetId: id, payload: { reason: "live_switch_closed" } });
              return { kind: "paused", reason: "live_switch_closed" };
            }
          }
        }
        return ENGINE.runCampaignSlice(id, d);
      },
    }),
  },
  {
    name: "R-S34 · a send that threw settled UNCONFIRMED whatever the evidence — people it never reached are never sent",
    expect: [L.s34],
    impl: withDeps((d) => ({
      ...d,
      rules: { ...d.rules, settlementFor: (o, row, ctx) => d.rules.settlementFor(o, row, { claimToken: ctx.claimToken, slice: ctx.slice, wireAt: ctx.wireAt, shop: ctx.shop }) },
    })),
  },
];

/** ⭐ §S, as a host runs it. */
export const SECTION_S: EngineSection<SImpl> = {
  id: "S",
  title: "§S · U43b-2 · the slice",
  labels: Object.values(L),
  real: S_REAL,
  run: runSectionS,
  plants: S_PLANTS,
};
