/**
 * test:marketing-engine §F — U49a's guard: THE CREDIT KEPT FOR CODES, AND THE REFUSAL AT START (ENGINE-SPEC §4.12; E15 ·
 * E16 · E18 · E19 · OD28 · OD63). `sendBatch`'s own last line (`minimumBalanceTzs`, MARKETING_FLOOR) is held by
 * `test:sms-cost-guard` §10, whose plants are in-place anchors (`scripts/anchors/sms-cost-guard.anchors.mjs`).
 *
 * ⚠️ A SECTION MODULE, NOT A SUITE. A host runs it (`scripts/marketing-engine.test.mts`) and hands it `ok`. It exports
 * `SECTION_F`: its labels, its assertions (`run(impl, ok)`), the shipped implementation (`real`) and its in-process plants,
 * so U42's host (§E, the enqueue) can fold it in beside its own sections without a line of it changing.
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script: `start-check.ts` end to end over a fixture world, each
 * read it makes handed in (the switch, the rail, the settings, the price, the credit) and the REAL `audienceFence` — its
 * members key the real keyed HMAC — over a fixture walk; the REAL `balanceFigureOf` inside the check; the pure rule
 * (`creditVerdict`); the estimate loader through its SHIPPED reserve over the live settings record; the stop-reason words.
 * Then the source, for what only the source can show.
 *   F0 controls · F1 every refusal by its fixture, in the documented order · F2 ⭐ the plan's RED, and nothing written ·
 *   F3 an unreadable balance refuses · F4 OD28 · F5 the sentences, no TZS for growth · F6 Resume prices only what is left ·
 *   F7 the stub and the provider · F8 the estimate's reserve · F9 the stop reasons · F10 the wiring.
 * F0 runs the real code alone, so no plant can turn it: a control is never a catch.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. Every plant is a dependency, a stand-in or a source string replaced IN MEMORY. No file is
 * written, no SMS can be sent (every credit read is handed in, and no wire is reachable from here), and no database is
 * touched: the host removes the database variables before any server module loads. ⛔ Nothing here saves the Marketing
 * SMS settings: `test:marketing-settings` S7 holds the setter to the card's action alone, and a section module is not
 * named a test (a section that must save them belongs in the host file). ⛔ This file holds no backslash: an editing tool
 * decodes them, so line breaks and patterns are built from codes and character classes.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "../lib/decomment.mts";
import * as SC from "../../src/lib/server/marketing/start-check.ts";
import type { StartCheck, StartCheckDeps, StartRefusal } from "../../src/lib/server/marketing/start-check.ts";
import { creditVerdict } from "../../src/lib/marketing/credit-guard.ts";
import { audienceFence, membersKeyOf, readCampaignAudience } from "../../src/lib/server/marketing/audience-fence.ts";
import type { FenceDeps } from "../../src/lib/server/marketing/audience-fence.ts";
import { contactAudienceKey, WHOLE_BOOK } from "../../src/lib/server/marketing/audience.ts";
import type { ContactAudienceFilter } from "../../src/lib/server/marketing/audience.ts";
import { canonicalMembers, startAudienceVerdict } from "../../src/lib/marketing/campaign-confirm.ts";
import { campaignEstimate, estimateView } from "../../src/lib/marketing/campaign-estimate.ts";
import type { BalanceFigure, EstimateAudience, VariantSize } from "../../src/lib/marketing/campaign-estimate.ts";
import { balanceFigureOf, loadEstimateInputsFor, loadSegmentCost } from "../../src/lib/server/marketing/estimate.ts";
import { stopReasonLabel } from "../../src/lib/marketing/campaign-status.ts";
import { MARKETING_SMS_SETTINGS_DEFAULTS } from "../../src/lib/marketing/sms-settings.ts";
import type { MarketingSmsSettings } from "../../src/lib/marketing/sms-settings.ts";
import { reloadMarketingSmsSettings } from "../../src/lib/server/marketing/sms-settings.ts";
import { marketingLiveGate, readMarketingLiveSwitch } from "../../src/lib/server/marketing/live-switch.ts";
import type { MarketingLiveSwitch } from "../../src/lib/server/marketing/live-switch.ts";
import { smsBalanceThresholds, smsProviderResolution, smsRailProblem } from "../../src/lib/server/sms.ts";
import type { SmsBalanceRead, SmsProviderResolution, SmsRailProblem } from "../../src/lib/server/sms.ts";
import type { SegmentCostMeasure } from "../../src/lib/marketing/segment-cost.ts";
import { db } from "../../src/lib/server/store.ts";
import type { StoredSmsCampaign } from "../../src/lib/server/store.ts";
import { auditFlush, getAuditPage } from "../../src/lib/server/audit.ts";

/* ══ WHAT A HOST CALLS ══════════════════════════════════════════════════════════════════════════════════════════════ */

/** The host's `ok`: one claim, by its label. */
export type Check = (label: string, cond: boolean, detail?: string) => void;
/** A defect planted in memory: the implementation it swaps in, and EXACTLY the labels it must turn red. */
export type EnginePlant<I> = { name: string; expect: readonly string[]; impl: () => Partial<I> };
/** One section of `test:marketing-engine` — U42's §E and U43b's §S/§R/§C/§T take the same shape. */
export type EngineSection<I> = {
  id: string;
  title: string;
  labels: readonly string[];
  real: I;
  run: (impl: I, ok: Check) => Promise<void>;
  plants: ReadonlyArray<EnginePlant<I>>;
};

/* ══ THE LABELS — each once, so a plant names exactly the claims it must turn red ═══════════════════════════════════ */

const L = {
  f0: "F0 · CONTROLS — the fixture filters read back at the campaign's door, the listed key is 32 hex for the confirmed row's own draft, 1,604 people at TZS 6 cost TZS 9,624, and the fixture world STARTS (1,600 counted now, shrunkBy 4) with startRefusal, the spec's API, agreeing with checkStart both ways",
  f1: "F1 · ⭐ EVERY START REFUSAL IS REACHED BY EXACTLY ITS FIXTURE, IN THE DOCUMENTED ORDER — a draft, a paused row, a confirmation missing its tier or budget or whose frozen segments disagree are not_confirmed; an off, expired or unreadable switch is switch_closed; no keys is rail_dead; the book or both with a blank source line is needs_source_line (players-only starts); a filter that is not JSON or a fence that cannot count is audience_unreadable; settings unanswered, half-read or thrown are settings_unreadable; no price is price_unknown; 1,800 at TZS 6 is over_budget (TZS 10,800 over 10,000; landing on the limit starts); a failed credit read is credit_unreadable and TZS 24,000 is credit_low; 1,610 is audience_moved; a swapped person on a list is members_changed — and with every later step broken too, the earliest still answers",
  f2: "F2 · ⭐ THE PLAN'S RED — a projection above the live credit minus the credit kept for codes refuses at Start: TZS 24,000 of credit, TZS 9,624 for this campaign and TZS 20,000 kept is credit_low with exactly those figures (TZS 40,000 starts; 29,624 lands on the line and starts; 29,623 refuses) — and NOTHING IS WRITTEN: the row handed in is unchanged, no audit row and no SMS row appears for the campaign, and start-check.ts names no writer",
  f3: "F3 · ⛔ AN UNREADABLE BALANCE REFUSES (FAIL CLOSED) — a refused, unanswered, unfinished, unavailable or stale read, and a read that throws, are each credit_unreadable with no figure in the refusal (a kept TZS 517 never leaks); creditVerdict: on the line goes ahead, a shilling under is credit_low with its three figures, and an unreadable credit or a cost, reserve or credit that is not a figure of 0 or more is credit_unreadable",
  f4: "F4 · ⭐ OD28 AT START, THROUGH THE ONE FENCE — typed: the confirmed 1,604 again starts (shrunkBy 0), 1,600 starts reporting shrunkBy 4, 1,605 refuses audience_moved (1,605 over 1,604); listed (3): the same three start, a swapped person and one fewer are members_changed, a fourth is audience_moved; the members key is the confirmed row's own draft's (a watermark keyed for the revision before is members_changed)",
  f5: "F5 · ⛔ A GROWTH SENTENCE CARRIES NO TZS — each refusal says the spec's words; for a viewer who may not read money none holds TZS or a figure of the money fixture (10,800 · 10,000 · 24,000 · 9,624 · 20,000), while a money reader's over_budget and credit_low carry them; every one but not_confirmed says Nothing was sent",
  f6: "F6 · ⭐ resumeRefusal PRICES ONLY THE OUTSTANDING ROWS — 604 of 1,604 left at TZS 6 is TZS 3,624, and TZS 24,000 of credit resumes it where the whole campaign (TZS 9,624) would be refused; 1,000 left (TZS 6,000) is credit_low with that figure; nothing left reads neither the credit nor the settings and resumes; a closed switch, a dead rail and an unreadable credit refuse it; Resume never counts the population; an outstanding that is not a count throws",
  f7: "F7 · THE STUB AND THE PROVIDER — on the console stub (no handset, no money) a campaign starts and resumes with the switch closed and NO credit read (U47b's local drive); an unrecognised provider is rail_dead (provider-unrecognised), never a closed switch, even when the rail reader says nothing; Blackball with the switch closed is switch_closed",
  f8: "F8 · THE ESTIMATE'S RESERVE IS THE CREDIT KEPT FOR CODES (decision 4) — through the shipped default it is the live Marketing SMS settings record's figure (TZS 20,000 kept, 20,000 reserved; never the platform floor of TZS 50, never the price); a reserve that cannot be read gives no coverage figure (no spendable, covers or shortfall) and the covers tile says why, never a reserve of TZS 0; the source re-reads the settings for codesReserveTzs, null on a record it cannot read, and names no platform floor",
  f9: "F9 · THE STOP REASONS (decision 5, §3.4) — MARKETING_FLOOR and marketing_floor say the credit reached what is kept for login and withdrawal codes, credit_unreadable says it could not be read, each in the spec's words, and an unknown key is still named",
  f10: "F10 · THE WIRING — Start's shipped reads are the real doors (the provider, the switch through THE gate, the rail, the settings re-read, the cost loader, the ONE fence, the credit rule, OD28's verdict); its credit is read at most a minute old (START_CREDIT_MAX_AGE_MS at most 60 s); credit-guard.ts stays pure: type imports alone, from the pure marketing modules",
} as const;

/* ══ THE IMPLEMENTATION UNDER TEST — swapped piece by piece by the plants ══════════════════════════════════════════ */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CR = String.fromCharCode(13);
const NL = String.fromCharCode(10);
/** A source file as CODE: comments removed by the shared scanner, line ends made plain. */
const code = (rel: string): string => decomment(readFileSync(join(ROOT, rel), "utf8").split(CR).join(""));

type Sources = { startCheck: string; creditGuard: string; estimate: string };
const REAL_SOURCES: Sources = {
  startCheck: code("src/lib/server/marketing/start-check.ts"),
  creditGuard: code("src/lib/marketing/credit-guard.ts"),
  estimate: code("src/lib/server/marketing/estimate.ts"),
};

export type FImpl = {
  start: (c: StoredSmsCampaign, deps: StartCheckDeps) => Promise<StartCheck>;
  resume: (c: StoredSmsCampaign, outstanding: number, deps: StartCheckDeps) => Promise<StartRefusal | null>;
  /** Every fixture world's reads pass through here first — the hook a plant uses to change one of them. */
  deps: (d: StartCheckDeps) => StartCheckDeps;
  sentence: (r: StartRefusal, money: boolean) => string;
  credit: typeof creditVerdict;
  loadEstimate: typeof loadEstimateInputsFor;
  estimate: typeof campaignEstimate;
  view: typeof estimateView;
  stopLabel: (key: string) => string;
  shipped: Readonly<StartCheckDeps>;
  sources: Sources;
};

export const F_REAL: FImpl = {
  start: (c, d) => SC.checkStart(c, d),
  resume: (c, n, d) => SC.resumeRefusal(c, n, d),
  deps: (d) => d,
  sentence: SC.startRefusalSentence,
  credit: creditVerdict,
  loadEstimate: loadEstimateInputsFor,
  estimate: campaignEstimate,
  view: estimateView,
  stopLabel: stopReasonLabel,
  shipped: SC.START_CHECK_DEPS,
  sources: REAL_SOURCES,
};

/* ══ THE FIXTURE WORLD ═════════════════════════════════════════════════════════════════════════════════════════════ */

const NOW = Date.parse("2026-10-07T09:00:00.000Z");
const MIN = 60_000;
const HOUR = 60 * MIN;
const iso = (t: number): string => new Date(t).toISOString();
const json = (v: unknown): string => JSON.stringify(v);

/** A bare gateway key (255, then 7, then eight digits) — made up, never a real person's. */
const keyOf = (n: number): string => `2557${String(90_000_000 + n).slice(-8)}`;
const KEYS6 = [1, 2, 3, 4, 5, 6].map(keyOf);
const K3 = [keyOf(11), keyOf(12), keyOf(13)];
const K3_SWAPPED = [keyOf(11), keyOf(12), keyOf(14)];
const K2 = [keyOf(11), keyOf(12)];
const K4 = [keyOf(11), keyOf(12), keyOf(13), keyOf(15)];

const filterKey = (over: Partial<ContactAudienceFilter>): string => contactAudienceKey({ ...WHOLE_BOOK, ...over });
/** A tag of the contact book (population null — the book), book ∪ players, and the player accounts alone. */
const BOOK = filterKey({ tags: ["vip"] });
const BOTH = filterKey({ population: "both" });
const PLAYERS = filterKey({ population: "players" });

const CAMPAIGN_ID = "cmp_u49a_start_check";
const REVISION = 7;
/** The figures of the spec's sentences: TZS 6 a segment, TZS 20,000 kept for codes, a limit of TZS 10,000. */
const PRICE = 6;
const KEPT = 20_000;
const LIMIT = 10_000;
const SETTINGS: MarketingSmsSettings = { ...MARKETING_SMS_SETTINGS_DEFAULTS, pricePerSegmentTzs: PRICE, codesReserveTzs: KEPT, campaignLimitTzs: LIMIT };
const SETTINGS_OK = { ok: true as const, settings: SETTINGS, stored: true, readable: true };

/** A campaign as U40a's confirmation leaves it: 1,604 people, typed, one segment each, TZS 9,624 within TZS 10,000. */
const confirmed = (over: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign => ({
  id: CAMPAIGN_ID, name: "U49a · the refusal at Start", status: "CONFIRMED",
  bodySw: "50pick: ofa ya leo.", bodyEn: null, codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: null,
  nameFallbackSw: null, nameFallbackEn: null, sourcePhrase: "Namba yako ilitoka kwenye fomu ya 50pick.",
  draftRevision: REVISION, confirmTier: "TYPED", audienceFilter: BOOK, audienceCount: 1604, audienceWatermark: null,
  estimateSegments: 1604, estimateTzs: 1604 * PRICE, budgetTzs: LIMIT, enqueueCursor: null, enqueuedAt: null, stopReason: null,
  createdBy: "usr_u49a_officer", confirmedBy: "usr_u49a_officer", confirmedAt: iso(NOW - HOUR), startedAt: null, pausedAt: null,
  finishedAt: null, createdAt: iso(NOW - 2 * HOUR), updatedAt: iso(NOW - HOUR), ...over,
});
/** The listed confirmation's members, and its key — for THIS row's draft, as U40a's confirmation stored it. */
const CANON3 = canonicalMembers(K3, 3) ?? "";
const LISTED_KEY = membersKeyOf({ campaignId: CAMPAIGN_ID, draftRevision: REVISION }, CANON3);
const OTHER_DRAFT_KEY = membersKeyOf({ campaignId: CAMPAIGN_ID, draftRevision: REVISION - 1 }, CANON3);
const listed = (over: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign =>
  confirmed({ confirmTier: "ENUMERATE", audienceCount: 3, estimateSegments: 3, estimateTzs: 3 * PRICE, audienceWatermark: LISTED_KEY, ...over });
const paused = (over: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign =>
  confirmed({ status: "PAUSED", startedAt: iso(NOW - 40 * MIN), enqueuedAt: iso(NOW - 35 * MIN), pausedAt: iso(NOW - 5 * MIN), ...over });

const OPEN: MarketingLiveSwitch = { state: "open", enabledBy: "the owner", enabledAt: iso(NOW - HOUR), closesAt: iso(NOW + HOUR) };
const CLOSED: MarketingLiveSwitch = { state: "closed", why: "absent" };
/** A credit read that landed five seconds ago. */
const credit = (tzs: number): SmsBalanceRead => ({ tzs, at: NOW - 5_000, outcome: "fresh", stale: false, error: null });
const UNANSWERED: SmsBalanceRead = { tzs: null, at: null, outcome: "failed", stale: false, error: "unreachable" };

type Audience = { count: number; keys: readonly string[] } | "throws";
/** Everything Start reads, as one value; `cost: "configured"` prices at whatever price the settings handed in. */
type World = {
  row: StoredSmsCampaign;
  provider: SmsProviderResolution;
  live: MarketingLiveSwitch;
  rail: SmsRailProblem | null;
  settings: { ok: true; settings: MarketingSmsSettings; stored: boolean; readable: boolean } | { ok: false; error: string } | "throws";
  cost: SegmentCostMeasure | "configured";
  balance: SmsBalanceRead | "throws";
  audience: Audience;
};
/** All is well: confirmed, the switch open, Blackball ready, TZS 40,000 of credit, 1,600 of the 1,604 still there. */
const W0 = (): World => ({
  row: confirmed(), provider: "blackball", live: OPEN, rail: null, settings: SETTINGS_OK, cost: "configured",
  balance: credit(40_000), audience: { count: 1600, keys: KEYS6 },
});
const withW = (over: Partial<World>): World => ({ ...W0(), ...over });

type Calls = { switch: number; settings: number; cost: number; balance: number; fence: number };
const blank = (): Calls => ({ switch: 0, settings: 0, cost: 0, balance: 0, fence: 0 });

/** The ONE fence's own reads over a fixture walk: `audienceFence` itself, and the real keyed members key, run on top. */
const fenceDepsOf = (a: Audience): FenceDeps => ({
  count: async () => {
    if (a === "throws") throw new Error("the walk could not be read");
    return a.count;
  },
  walk: async (_f, cursor, limit) => {
    if (a === "throws") throw new Error("the walk could not be read");
    const from = cursor === null ? 0 : Number(cursor.split(":")[1]);
    const rows = a.keys.slice(from, from + limit).map((msisdn, i) => ({ kind: "player" as const, msisdn, userId: `usr_u49a_${from + i}` }));
    return { rows, next: from + rows.length >= a.keys.length ? "done" : `f:${from + rows.length}` };
  },
  unfiltered: () => false,
  membersKey: membersKeyOf,
  now: () => new Date(NOW),
});

/** A world's reads, counted. ⛔ Nothing here can reach a wire or a store: each answer is the world's. */
const depsOf = (w: World, calls: Calls): StartCheckDeps => ({
  provider: () => w.provider,
  liveSwitch: async () => {
    calls.switch++;
    return w.live;
  },
  gate: marketingLiveGate,
  rail: () => w.rail,
  settings: async () => {
    calls.settings++;
    if (w.settings === "throws") throw new Error("the settings read threw");
    return w.settings;
  },
  cost: async (configured) => {
    calls.cost++;
    if (w.cost !== "configured") return w.cost;
    return configured === null ? { kind: "unknown", reason: "no-sends" } : { kind: "configured", tzsPerSegment: configured };
  },
  readBalance: async () => {
    calls.balance++;
    if (w.balance === "throws") throw new Error("the vendor did not answer");
    return w.balance;
  },
  fence: (c) => {
    calls.fence++;
    return audienceFence(c, fenceDepsOf(w.audience));
  },
  credit: creditVerdict,
  audienceVerdict: startAudienceVerdict,
  now: () => NOW,
});

async function startIn(impl: FImpl, w: World): Promise<{ check: StartCheck; calls: Calls }> {
  const calls = blank();
  const check = await impl.start(w.row, impl.deps(depsOf(w, calls)));
  return { check, calls };
}
async function resumeIn(impl: FImpl, w: World, outstanding: number): Promise<{ refusal: StartRefusal | null; calls: Calls }> {
  const calls = blank();
  const refusal = await impl.resume(w.row, outstanding, impl.deps(depsOf(w, calls)));
  return { refusal, calls };
}
const said = (c: StartCheck): string => (c.ok ? "START" : c.refusal.reason);

/** One claim: its body answers [holds, detail]; a body that throws is that claim's failure, never the section's end. */
async function claim(ok: Check, label: string, body: () => Promise<[boolean, string]>): Promise<void> {
  try {
    const [cond, detail] = await body();
    ok(label, cond, detail);
  } catch (err) {
    ok(label, false, `threw: ${String((err as Error)?.message ?? err)}`);
  }
}

/* ══ THE SPEC'S SENTENCES (§4.12 "Sentences") — [for a viewer who may not read money, for a money reader] ═══════════ */

const OVER: StartRefusal = { reason: "over_budget", costTzs: 10_800, budgetTzs: 10_000 };
const LOW: StartRefusal = { reason: "credit_low", balanceTzs: 24_000, costTzs: 9_624, reserveTzs: 20_000 };
const MOVED: StartRefusal = { reason: "audience_moved", freshCount: 1_610, confirmedCount: 1_604 };
const EVERY_REFUSAL: StartRefusal[] = [
  { reason: "not_confirmed" }, { reason: "switch_closed" }, { reason: "rail_dead", rail: "keys-not-set" }, { reason: "needs_source_line" },
  { reason: "audience_unreadable" }, { reason: "settings_unreadable" }, { reason: "price_unknown" }, OVER, { reason: "credit_unreadable" },
  LOW, MOVED, { reason: "members_changed" },
];
const both = (s: string): readonly [string, string] => [s, s];
const SPEC_WORDS: Readonly<Record<string, readonly [string, string]>> = {
  not_confirmed: both("Only a confirmed campaign can start."),
  switch_closed: both("Marketing SMS are switched off. The owner switches them on (Admin → System → Marketing SMS sending), then you can start. Nothing was sent."),
  rail_dead: both("No SMS can leave this server right now — Admin → System says why. Nothing was sent."),
  needs_source_line: both("This campaign can reach people from the contact book, and its message has no source line. Stop it and confirm a copy once the owner has set the source line. Nothing was sent."),
  audience_unreadable: both("The saved audience can't be read any more. Stop this campaign and confirm a new copy. Nothing was sent."),
  settings_unreadable: both("The Marketing SMS settings couldn't be read just now, so this campaign can't be checked before it starts. Try again in a moment. Nothing was sent."),
  price_unknown: both("The price per SMS isn't known, so the budget can't be checked. The owner sets it on Admin → System → Marketing SMS. Nothing was sent."),
  over_budget: [
    "At today's price this campaign could cost more than its limit. Stop it and confirm a smaller copy, or ask the owner. Nothing was sent.",
    "At today's price this campaign could cost TZS 10,800 — more than its limit of TZS 10,000. Stop it and confirm a smaller copy, or the owner raises the limit. Nothing was sent.",
  ],
  credit_unreadable: both("The SMS credit couldn't be read just now, so the campaign can't start safely. Try again in a minute. Nothing was sent."),
  credit_low: [
    "There isn't enough SMS credit to start this campaign and still keep what login and withdrawal codes need. Ask the owner to top up. Nothing was sent.",
    "Starting would leave less SMS credit than is kept for login and withdrawal codes — credit TZS 24,000, this campaign up to TZS 9,624, kept for codes TZS 20,000. Top up, or narrow the audience. Nothing was sent.",
  ],
  audience_moved: both("The audience grew since it was confirmed — now 1,610, confirmed 1,604. Nothing was sent. Stop this campaign and confirm a new copy."),
  members_changed: both("The people on this campaign changed since they were confirmed. Nothing was sent. Stop this campaign and confirm a new copy."),
};
const MONEY_FIGURES = ["10,800", "10,000", "24,000", "9,624", "20,000"];

/** §3.4's sentences for U49a's stop reasons. */
const FLOOR_SENTENCE = "Paused — the SMS credit reached what is kept for login and withdrawal codes. Top up, then Resume.";
const UNREADABLE_SENTENCE = "Paused — the SMS credit couldn't be read, so sending stopped to protect login codes. Resume when Admin → System shows the credit again.";

const AUD: EstimateAudience = { ok: true, population: 1604, forecast: 1604 };
const SW1: VariantSize = { locale: "SW", segments: 1, encoding: "GSM7" };

/* ══ THE ASSERTIONS ════════════════════════════════════════════════════════════════════════════════════════════════ */

async function runSectionF(impl: FImpl, ok: Check): Promise<void> {
  /* ── F0 · controls (the REAL code alone — no plant reaches here) ── */
  await claim(ok, L.f0, async () => {
    const reads = [BOOK, BOTH, PLAYERS].map((f) => readCampaignAudience(f).ok);
    const w = W0();
    const real = await SC.checkStart(w.row, depsOf(w, blank()));
    const spec = await SC.startRefusal(w.row, depsOf(w, blank()));
    const low = withW({ balance: credit(24_000) });
    const checkLow = await SC.checkStart(low.row, depsOf(low, blank()));
    const specLow = await SC.startRefusal(low.row, depsOf(low, blank()));
    const holds = reads.every(Boolean) && CANON3 !== "" && /^[0-9a-f]{32}$/.test(LISTED_KEY) && LISTED_KEY !== OTHER_DRAFT_KEY
      && Math.ceil(1604 * PRICE) === 9_624
      && real.ok && real.freshCount === 1600 && real.shrunkBy === 4 && real.costTzs === 9_624 && spec === null
      && !checkLow.ok && json(specLow) === json(checkLow.refusal);
    return [holds, `filters ${reads.join("/")} · W0 → ${said(real)}${real.ok ? ` shrunkBy ${real.shrunkBy}` : ""} · spec ${json(spec)} · at 24,000 ${json(specLow)}`];
  });

  /* ── F1 · each refusal by its fixture, and the order ── */
  await claim(ok, L.f1, async () => {
    const misses: string[] = [];
    const expect = async (name: string, w: World, want: string, also?: (c: StartCheck) => boolean): Promise<void> => {
      const { check } = await startIn(impl, w);
      if (said(check) !== want || (also !== undefined && !also(check))) misses.push(`${name} → ${check.ok ? "START" : json(check.refusal)} (want ${want})`);
    };
    await expect("a draft", withW({ row: confirmed({ status: "DRAFT" }) }), "not_confirmed");
    await expect("a paused row", withW({ row: confirmed({ status: "PAUSED" }) }), "not_confirmed");
    await expect("no tier", withW({ row: confirmed({ confirmTier: null }) }), "not_confirmed");
    await expect("no budget", withW({ row: confirmed({ budgetTzs: null }) }), "not_confirmed");
    await expect("frozen segments that disagree with the count", withW({ row: confirmed({ estimateSegments: 1700 }) }), "not_confirmed");
    await expect("the switch off", withW({ live: CLOSED }), "switch_closed");
    await expect("a switch past its closing time", withW({ live: { ...OPEN, closesAt: iso(NOW - 1) } }), "switch_closed");
    await expect("a switch that cannot be read", withW({ live: { state: "closed", why: "unreadable" } }), "switch_closed");
    await expect("no keys", withW({ rail: "keys-not-set" }), "rail_dead", (c) => !c.ok && c.refusal.reason === "rail_dead" && c.refusal.rail === "keys-not-set");
    await expect("the book with no source line", withW({ row: confirmed({ sourcePhrase: null }) }), "needs_source_line");
    await expect("the book with a blank one", withW({ row: confirmed({ sourcePhrase: "   " }) }), "needs_source_line");
    await expect("book and players with none", withW({ row: confirmed({ audienceFilter: BOTH, sourcePhrase: null }) }), "needs_source_line");
    await expect("players alone with none (control)", withW({ row: confirmed({ audienceFilter: PLAYERS, sourcePhrase: null }) }), "START");
    await expect("a filter that is not JSON", withW({ row: confirmed({ audienceFilter: "{not json" }) }), "audience_unreadable");
    await expect("a fence that cannot count", withW({ audience: "throws" }), "audience_unreadable");
    await expect("settings that did not answer", withW({ settings: { ok: false, error: "down" } }), "settings_unreadable");
    await expect("settings not read in full", withW({ settings: { ...SETTINGS_OK, readable: false } }), "settings_unreadable");
    await expect("a settings read that throws", withW({ settings: "throws" }), "settings_unreadable");
    await expect("a price nobody knows", withW({ cost: { kind: "unknown", reason: "no-sends" } }), "price_unknown");
    await expect("1,800 people at TZS 6", withW({ row: confirmed({ audienceCount: 1800, estimateSegments: 1800 }) }), "over_budget",
      (c) => !c.ok && c.refusal.reason === "over_budget" && c.refusal.costTzs === 10_800 && c.refusal.budgetTzs === 10_000);
    await expect("a limit the projection lands on (control)", withW({ row: confirmed({ budgetTzs: 9_624 }) }), "START");
    await expect("a credit read that failed", withW({ balance: UNANSWERED }), "credit_unreadable");
    await expect("TZS 24,000 of credit", withW({ balance: credit(24_000) }), "credit_low");
    await expect("1,610 people now", withW({ audience: { count: 1610, keys: KEYS6 } }), "audience_moved",
      (c) => !c.ok && c.refusal.reason === "audience_moved" && c.refusal.freshCount === 1610 && c.refusal.confirmedCount === 1604);
    await expect("a listed three with one swapped", withW({ row: listed(), audience: { count: 3, keys: K3_SWAPPED } }), "members_changed");
    await expect("all in order (control)", W0(), "START");

    // ⭐ THE ORDER: break step i AND every step after it — the earliest broken step must still be the answer.
    const STEPS: Array<{ reason: string; apply: (w: World) => World }> = [
      { reason: "not_confirmed", apply: (w) => ({ ...w, row: { ...w.row, status: "DRAFT" } }) },
      { reason: "switch_closed", apply: (w) => ({ ...w, live: CLOSED }) },
      { reason: "rail_dead", apply: (w) => ({ ...w, rail: "keys-not-set" }) },
      { reason: "needs_source_line", apply: (w) => ({ ...w, row: { ...w.row, sourcePhrase: null } }) },
      { reason: "audience_unreadable", apply: (w) => ({ ...w, row: { ...w.row, audienceFilter: "{not json" } }) },
      { reason: "settings_unreadable", apply: (w) => ({ ...w, settings: { ok: false, error: "down" } }) },
      { reason: "price_unknown", apply: (w) => ({ ...w, cost: { kind: "unknown", reason: "no-sends" } }) },
      { reason: "over_budget", apply: (w) => ({ ...w, row: { ...w.row, audienceCount: 1800, estimateSegments: 1800 } }) },
      { reason: "credit_unreadable", apply: (w) => ({ ...w, balance: UNANSWERED }) },
      { reason: "audience_moved", apply: (w) => ({ ...w, audience: { count: (w.row.audienceCount ?? 0) + 6, keys: KEYS6 } }) },
    ];
    const order: string[] = [];
    for (let i = 0; i < STEPS.length; i++) {
      let w = W0();
      for (let j = i; j < STEPS.length; j++) {
        // ④ is judged on a filter that can be read, so it is never broken beside ⑤'s unreadable one.
        if (STEPS[i].reason === "needs_source_line" && STEPS[j].reason === "audience_unreadable") continue;
        w = STEPS[j].apply(w);
      }
      order.push(said((await startIn(impl, w)).check));
    }
    const want = STEPS.map((s) => s.reason);
    return [misses.length === 0 && json(order) === json(want),
      `${misses.length ? `${misses.join(" | ")} · ` : ""}order ${order.join(" > ")}`];
  });

  /* ── F2 · ⭐ the plan's RED, and nothing written ── */
  await claim(ok, L.f2, async () => {
    const campaignRows = (): number => getAuditPage({ limit: 100_000 }).filter((e) => e.targetId === CAMPAIGN_ID).length;
    const marketingSms = async (): Promise<number> => (await db.smsMessage.listRecent(10_000)).filter((m) => m.purpose === "MARKETING").length;
    await auditFlush();
    const auditBefore = campaignRows();
    const smsBefore = await marketingSms();
    const low = withW({ balance: credit(24_000) });
    const rowBefore = json(low.row);
    const r24 = (await startIn(impl, low)).check;
    const r40 = (await startIn(impl, W0())).check;
    const onLine = (await startIn(impl, withW({ balance: credit(29_624) }))).check;
    const under = (await startIn(impl, withW({ balance: credit(29_623) }))).check;
    await auditFlush();
    const auditAfter = campaignRows();
    const smsAfter = await marketingSms();
    const WRITERS = /[.]transition[(]|[^A-Za-z_]audit[(]|createMany[(]|[.]create[(]|[.]update[(]|[.]settle[(]|[.]claim[(]|requeueHeld|sendBatch|dispatchSlice|ensureOptOutToken|saveConfig|deleteConfig|[^A-Za-z_]db[.]/;
    const writer = impl.sources.startCheck.match(WRITERS)?.[0] ?? null;
    const lowRight = !r24.ok && r24.refusal.reason === "credit_low"
      && r24.refusal.balanceTzs === 24_000 && r24.refusal.costTzs === 9_624 && r24.refusal.reserveTzs === 20_000;
    const holds = lowRight && r40.ok && onLine.ok && !under.ok && under.refusal.reason === "credit_low"
      && json(low.row) === rowBefore && auditAfter === auditBefore && smsAfter === smsBefore
      && impl.sources.startCheck.length > 2000 && writer === null;
    return [holds, `24,000 → ${r24.ok ? "START" : json(r24.refusal)} · 40,000 → ${said(r40)} · 29,624 → ${said(onLine)} · 29,623 → ${said(under)} · row ${json(low.row) === rowBefore ? "unchanged" : "CHANGED"} · audit rows ${auditBefore} → ${auditAfter} · marketing SMS rows ${smsBefore} → ${smsAfter} · a writer in the source: ${writer ?? "none"}`];
  });

  /* ── F3 · an unreadable balance refuses ── */
  await claim(ok, L.f3, async () => {
    const KEPT_FIGURE = 517;
    const READS: Array<[string, SmsBalanceRead | "throws"]> = [
      ["refused", { tzs: KEPT_FIGURE, at: NOW - 10 * MIN, outcome: "failed", stale: true, error: "refused" }],
      ["unanswered", UNANSWERED],
      ["unfinished", { tzs: KEPT_FIGURE, at: NOW - 10 * MIN, outcome: "pending", stale: true, error: null }],
      ["unavailable", { tzs: null, at: null, outcome: "unavailable", stale: false, error: null }],
      ["stale", { tzs: KEPT_FIGURE, at: NOW - 20 * MIN, outcome: "reused", stale: true, error: null }],
      ["thrown", "throws"],
    ];
    const misses: string[] = [];
    for (const [name, balance] of READS) {
      const { check } = await startIn(impl, withW({ balance }));
      const clean = !check.ok && check.refusal.reason === "credit_unreadable" && Object.keys(check.refusal).join(",") === "reason";
      if (!clean) misses.push(`${name} → ${check.ok ? "START" : json(check.refusal)}`);
    }
    const live = (tzs: number): BalanceFigure => ({ kind: "live", tzs, at: NOW });
    const UNREAD = json({ ok: false, reason: "credit_unreadable" });
    const table: Array<[string, string, string]> = [
      ["on the line", json(impl.credit({ balance: live(30_000), costTzs: 10_000, reserveTzs: 20_000 })), json({ ok: true })],
      ["a shilling under", json(impl.credit({ balance: live(29_999), costTzs: 10_000, reserveTzs: 20_000 })),
        json({ ok: false, reason: "credit_low", balanceTzs: 29_999, costTzs: 10_000, reserveTzs: 20_000 })],
      ["unreadable", json(impl.credit({ balance: { kind: "unreadable", why: "failed", error: "unreachable" }, costTzs: 10_000, reserveTzs: 20_000 })), UNREAD],
      ["a cost that is NaN", json(impl.credit({ balance: live(40_000), costTzs: Number.NaN, reserveTzs: 20_000 })), UNREAD],
      ["an endless cost", json(impl.credit({ balance: live(40_000), costTzs: Number.POSITIVE_INFINITY, reserveTzs: 20_000 })), UNREAD],
      ["a reserve below zero", json(impl.credit({ balance: live(40_000), costTzs: 1_000, reserveTzs: -1 })), UNREAD],
      ["an endless credit", json(impl.credit({ balance: live(Number.POSITIVE_INFINITY), costTzs: 1_000, reserveTzs: 20_000 })), UNREAD],
    ];
    for (const [name, got, want] of table) if (got !== want) misses.push(`${name}: ${got} (want ${want})`);
    return [misses.length === 0, misses.length ? misses.join(" | ") : "every unreadable read refused with no figure; the table holds"];
  });

  /* ── F4 · OD28 through the ONE fence ── */
  await claim(ok, L.f4, async () => {
    const typed = async (count: number): Promise<StartCheck> => (await startIn(impl, withW({ audience: { count, keys: KEYS6 } }))).check;
    const onList = async (keys: readonly string[], watermark: string = LISTED_KEY): Promise<StartCheck> =>
      (await startIn(impl, withW({ row: listed({ audienceWatermark: watermark }), audience: { count: keys.length, keys } }))).check;
    const t1604 = await typed(1604);
    const t1600 = await typed(1600);
    const t1605 = await typed(1605);
    const same = await onList(K3);
    const swapped = await onList(K3_SWAPPED);
    const fewer = await onList(K2);
    const more = await onList(K4);
    const otherDraft = await onList(K3, OTHER_DRAFT_KEY);
    const holds = t1604.ok && t1604.freshCount === 1604 && t1604.shrunkBy === 0
      && t1600.ok && t1600.shrunkBy === 4
      && !t1605.ok && json(t1605.refusal) === json({ reason: "audience_moved", freshCount: 1605, confirmedCount: 1604 })
      && same.ok && same.shrunkBy === 0
      && said(swapped) === "members_changed" && said(fewer) === "members_changed"
      && !more.ok && json(more.refusal) === json({ reason: "audience_moved", freshCount: 4, confirmedCount: 3 })
      && said(otherDraft) === "members_changed";
    const show = (c: StartCheck): string => (c.ok ? `START shrunkBy ${c.shrunkBy}` : json(c.refusal));
    return [holds, `typed 1,604 ${show(t1604)} · 1,600 ${show(t1600)} · 1,605 ${show(t1605)} · listed same ${show(same)} · swapped ${show(swapped)} · fewer ${show(fewer)} · more ${show(more)} · another draft's key ${show(otherDraft)}`];
  });

  /* ── F5 · the sentences ── */
  await claim(ok, L.f5, async () => {
    const misses: string[] = [];
    for (const r of EVERY_REFUSAL) {
      const words = SPEC_WORDS[r.reason];
      const growth = impl.sentence(r, false);
      const money = impl.sentence(r, true);
      if (!words) { misses.push(`${r.reason}: no spec words`); continue; }
      if (growth !== words[0]) misses.push(`${r.reason} (growth): "${growth}"`);
      if (money !== words[1]) misses.push(`${r.reason} (money): "${money}"`);
      if (growth.includes("TZS") || MONEY_FIGURES.some((f) => growth.includes(f))) misses.push(`${r.reason}: growth told money`);
      if (r.reason !== "not_confirmed" && (!growth.includes("Nothing was sent.") || !money.includes("Nothing was sent."))) misses.push(`${r.reason}: no Nothing was sent`);
    }
    const told = impl.sentence(OVER, true) + " " + impl.sentence(LOW, true);
    const control = ["TZS 10,800", "TZS 10,000", "TZS 24,000", "TZS 9,624", "TZS 20,000"].every((f) => told.includes(f));
    return [misses.length === 0 && control, misses.length ? misses.join(" | ") : `${EVERY_REFUSAL.length} refusals, each in the spec's words; a money reader is told the figures`];
  });

  /* ── F6 · Resume prices only the outstanding rows ── */
  await claim(ok, L.f6, async () => {
    const at24 = (over: Partial<World> = {}): World => withW({ row: paused(), balance: credit(24_000), ...over });
    const r604 = await resumeIn(impl, at24(), 604);
    const r1000 = await resumeIn(impl, at24(), 1000);
    const r0 = await resumeIn(impl, at24({ balance: "throws", settings: "throws" }), 0);
    const unread = await resumeIn(impl, at24({ balance: UNANSWERED }), 604);
    const closed = await resumeIn(impl, at24({ live: CLOSED }), 604);
    const dead = await resumeIn(impl, at24({ rail: "keys-not-set" }), 604);
    const whole = creditVerdict({ balance: { kind: "live", tzs: 24_000, at: NOW }, costTzs: 9_624, reserveTzs: 20_000 });
    const throwsOn = async (n: number): Promise<boolean> => {
      try {
        await impl.resume(paused(), n, impl.deps(depsOf(at24(), blank())));
        return false;
      } catch {
        return true;
      }
    };
    const throwsBad = (await throwsOn(-1)) && (await throwsOn(1.5));
    const fences = [r604, r1000, r0, unread, closed, dead].reduce((n, r) => n + r.calls.fence, 0);
    const holds = r604.refusal === null && !whole.ok
      && json(r1000.refusal) === json({ reason: "credit_low", balanceTzs: 24_000, costTzs: 6_000, reserveTzs: 20_000 })
      && r0.refusal === null && r0.calls.balance === 0 && r0.calls.settings === 0
      && unread.refusal?.reason === "credit_unreadable" && closed.refusal?.reason === "switch_closed" && dead.refusal?.reason === "rail_dead"
      && fences === 0 && throwsBad;
    return [holds, `604 left → ${json(r604.refusal)} (the whole: ${whole.ok ? "ok" : whole.reason}) · 1,000 → ${json(r1000.refusal)} · 0 → ${json(r0.refusal)} with ${r0.calls.balance} credit and ${r0.calls.settings} settings reads · unreadable → ${json(unread.refusal)} · switch off → ${json(closed.refusal)} · no keys → ${json(dead.refusal)} · fences ${fences} · bad counts throw ${throwsBad}`];
  });

  /* ── F7 · the stub and the provider ── */
  await claim(ok, L.f7, async () => {
    const UNAVAILABLE: SmsBalanceRead = { tzs: null, at: null, outcome: "unavailable", stale: false, error: null };
    const stub = await startIn(impl, withW({ provider: "console", live: CLOSED, balance: UNAVAILABLE }));
    const stubResume = await resumeIn(impl, withW({ row: paused(), provider: "console", live: CLOSED, balance: "throws" }), 604);
    const unknownRail = await startIn(impl, withW({ provider: "unrecognised", live: CLOSED, rail: "provider-unrecognised" }));
    const unknownSilent = await startIn(impl, withW({ provider: "unrecognised", live: OPEN, rail: null }));
    const carrierClosed = await startIn(impl, withW({ live: CLOSED }));
    const RAIL = json({ reason: "rail_dead", rail: "provider-unrecognised" });
    const holds = stub.check.ok && stub.calls.balance === 0
      && stubResume.refusal === null && stubResume.calls.balance === 0
      && !unknownRail.check.ok && json(unknownRail.check.refusal) === RAIL
      && !unknownSilent.check.ok && json(unknownSilent.check.refusal) === RAIL
      && said(carrierClosed.check) === "switch_closed";
    return [holds, `stub → ${said(stub.check)} (${stub.calls.balance} credit reads), resume → ${json(stubResume.refusal)} · unrecognised → ${unknownRail.check.ok ? "START" : json(unknownRail.check.refusal)}, with a silent rail reader → ${unknownSilent.check.ok ? "START" : json(unknownSilent.check.refusal)} · Blackball, switch off → ${said(carrierClosed.check)}`];
  });

  /* ── F8 · the estimate's reserve ── */
  await claim(ok, L.f8, async () => {
    const MONEY_DEPS = {
      moneyVisible: async () => true, readBalance: async () => credit(40_000), recentSends: async () => [],
      provider: () => "blackball", now: () => NOW,
    };
    // (a) through the SHIPPED reserve dep, against the live record as it stands. ⛔ It is never saved from here:
    //     `test:marketing-settings` S7 holds the setter to the card's action alone, and this module is not named a test.
    const cur = await reloadMarketingSmsSettings();
    if (!cur.ok || !cur.readable) return [false, "the live settings record could not be read"];
    const recorded = cur.settings.codesReserveTzs;
    const floor = smsBalanceThresholds().floorTzs;
    const reserved = (await impl.loadEstimate("ADMIN", AUD, MONEY_DEPS)).money?.reserveTzs;
    // (b) a reserve that cannot be read: no coverage, said in words.
    const unread = await impl.loadEstimate("ADMIN", AUD, { ...MONEY_DEPS, reserveTzs: () => null });
    const e = impl.estimate(unread, [SW1]);
    const view = impl.view(e, NOW);
    const covers = view.tiles.find((t) => t.key === "covers");
    const m = e.money;
    const noCoverage = unread.money?.reserveTzs === null && m !== null && m.reserveTzs === null
      && m.spendableTzs === null && m.covers === null && m.shortByTzs === null
      && covers?.value === "—" && (covers.note ?? "").includes("kept for login codes")
      && view.tiles.some((t) => t.key === "cost") && view.tiles.some((t) => t.key === "credit");
    // (c) the source: the settings' figure, fresh, or nothing — and no platform floor anywhere in the file.
    const src = impl.sources.estimate;
    const sourceRight = src.includes("reserveTzs: async () => {")
      && src.includes("return kept.ok && kept.readable ? kept.settings.codesReserveTzs : null;") && !src.includes("smsBalanceThresholds");
    const holds = reserved === recorded && recorded !== floor && recorded !== cur.settings.pricePerSegmentTzs && noCoverage && sourceRight;
    return [holds, `the record keeps ${recorded} · the estimate reserves ${reserved} (the platform floor is ${floor}) · unreadable → reserve ${json(m?.reserveTzs)}, covers ${json(covers ?? null)} · source ${sourceRight ? "right" : "WRONG"}`];
  });

  /* ── F9 · the stop reasons ── */
  await claim(ok, L.f9, async () => {
    const got = ["MARKETING_FLOOR", "marketing_floor", "credit_unreadable", "mystery_key"].map((k) => impl.stopLabel(k));
    return [got[0] === FLOOR_SENTENCE && got[1] === FLOOR_SENTENCE && got[2] === UNREADABLE_SENTENCE && got[3] === "Engine reason: mystery_key", json(got)];
  });

  /* ── F10 · the wiring ── */
  await claim(ok, L.f10, async () => {
    const d = impl.shipped;
    const wiring: Record<string, boolean> = {
      provider: d.provider === smsProviderResolution, liveSwitch: d.liveSwitch === readMarketingLiveSwitch, gate: d.gate === marketingLiveGate,
      rail: d.rail === smsRailProblem, settings: d.settings === reloadMarketingSmsSettings, cost: d.cost === loadSegmentCost,
      fence: d.fence === audienceFence, credit: d.credit === creditVerdict, audienceVerdict: d.audienceVerdict === startAudienceVerdict,
    };
    const off = Object.entries(wiring).filter(([, v]) => !v).map(([k]) => k);
    const fresh = impl.sources.startCheck.includes("readBalance: () => refreshSmsBalance({ maxAgeMs: START_CREDIT_MAX_AGE_MS }),")
      && SC.START_CREDIT_MAX_AGE_MS > 0 && SC.START_CREDIT_MAX_AGE_MS <= 60_000;
    const guard = impl.sources.creditGuard;
    const lines = guard.split(NL).map((l) => l.trim());
    const imports = lines.filter((l) => /^import[^A-Za-z0-9_$]/.test(l) || /^export[^;]*[ ]from[ ]*["']/.test(l));
    const typeOnlyPure = imports.length >= 1 && imports.every((l) => /^import type [{][^}]*[}] from "@[/]lib[/]marketing[/][^"]+";$/.test(l));
    const loadsAtRunTime = /[^A-Za-z0-9_$.]import[(]|require[(]/.test(guard);
    return [off.length === 0 && fresh && typeOnlyPure && !loadsAtRunTime && guard.length > 500,
      `not the real door: [${off.join(", ")}] · credit read at most ${SC.START_CREDIT_MAX_AGE_MS} ms, through the shipped dep ${fresh} · credit-guard imports ${json(imports)}${loadsAtRunTime ? " · LOADS A MODULE AT RUN TIME" : ""}`];
  });
}

/* ══ THE PLANTS — each a defect this unit could really ship, planted in memory ════════════════════════════════════ */

/** A source string with one anchor replaced — the plant fails to build (and says so) when the anchor is not found once. */
const plantIn = (src: string, from: string, to: string): string => {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`the plant's anchor is found ${n} times, not once: ${from.slice(0, 60)}`);
  return src.split(from).join(to);
};

export const F_PLANTS: ReadonlyArray<EnginePlant<FImpl>> = [
  {
    name: "R-F2 (the plan's RED) · the credit check skipped at Start",
    expect: [L.f1, L.f2, L.f3],
    impl: () => ({ start: (c, d) => SC.checkStart(c, { ...d, credit: () => ({ ok: true }) }) }),
  },
  {
    name: "R-F4 · OD28's > written >= (the confirmed number of people again is refused)",
    expect: [L.f4],
    impl: () => ({
      deps: (d) => ({
        ...d,
        audienceVerdict: (a) => (a.fresh.count >= a.confirmedCount
          ? { ok: false, reason: "audience_moved", freshCount: a.fresh.count, confirmedCount: a.confirmedCount }
          : startAudienceVerdict(a)),
      }),
    }),
  },
  {
    name: "R-F1 · the credit read before the switch and the rail (a closed switch answered as a credit problem)",
    expect: [L.f1],
    impl: () => ({
      start: async (c, d) => {
        if (d.provider() !== "console") {
          let read: SmsBalanceRead | null;
          try {
            read = await d.readBalance();
          } catch {
            read = null;
          }
          if (balanceFigureOf(read).kind !== "live") return { ok: false, refusal: { reason: "credit_unreadable" } };
        }
        return SC.checkStart(c, d);
      },
    }),
  },
  {
    name: "R-F1b · E18 skipped at Start (a book campaign with no source line starts)",
    expect: [L.f1],
    impl: () => ({ start: (c, d) => SC.checkStart({ ...c, sourcePhrase: "a planted source line" }, d) }),
  },
  {
    name: "R-F4b · the members key at Start keyed for another draft than the confirmed row's own",
    expect: [L.f4],
    impl: () => ({ deps: (d) => ({ ...d, fence: (c) => d.fence({ ...c, draftRevision: c.draftRevision + 1 }) }) }),
  },
  {
    name: "R-F3 · an unreadable credit taken as affordable (fail open)",
    expect: [L.f1, L.f3, L.f6],
    impl: () => ({ deps: (d) => ({ ...d, credit: (a) => (a.balance.kind === "live" ? creditVerdict(a) : { ok: true }) }) }),
  },
  {
    name: "R-F2c · the credit line read as at-or-below (landing on the line refused)",
    expect: [L.f2],
    impl: () => ({
      deps: (d) => ({
        ...d,
        credit: (a) => (a.balance.kind === "live" && a.balance.tzs - a.costTzs <= a.reserveTzs
          ? { ok: false, reason: "credit_low", balanceTzs: a.balance.tzs, costTzs: a.costTzs, reserveTzs: a.reserveTzs }
          : creditVerdict(a)),
      }),
    }),
  },
  {
    name: "R-F2b · Start writes: it moves the campaign itself",
    expect: [L.f2],
    impl: () => ({
      sources: {
        ...REAL_SOURCES,
        startCheck: `${REAL_SOURCES.startCheck}${NL}void db.smsCampaign.transition(c.id, { from: ["CONFIRMED"], to: "PREPARING", patch: {}, draftRevision: null, at: "" });`,
      },
    }),
  },
  {
    name: "R-F5 · a viewer who may not read money is told the figures",
    expect: [L.f5],
    impl: () => ({ sentence: (r) => SC.startRefusalSentence(r, true) }),
  },
  {
    name: "R-F6 · Resume prices the whole campaign, not the rows still owed a message",
    expect: [L.f6],
    impl: () => ({ resume: (c, n, d) => SC.resumeRefusal(c, c.audienceCount ?? n, d) }),
  },
  {
    name: "R-F7 · the console stub held to the switch (U47b's local drive could never start)",
    expect: [L.f7],
    impl: () => ({ deps: (d) => ({ ...d, gate: (p, live, now) => marketingLiveGate(p === "console" ? "blackball" : p, live, now) }) }),
  },
  {
    name: "R-F8 · the estimate's reserve is the platform floor again",
    expect: [L.f8],
    impl: () => ({ loadEstimate: (role, audience, deps) => loadEstimateInputsFor(role, audience, { ...deps, reserveTzs: () => smsBalanceThresholds().floorTzs }) }),
  },
  {
    name: "R-F8b · a reserve that could not be read counted as TZS 0 (the codes' credit offered to the campaign)",
    expect: [L.f8],
    impl: () => ({
      estimate: (i, v) => campaignEstimate(i.money && i.money.reserveTzs === null ? { ...i, money: { ...i.money, reserveTzs: 0 } } : i, v),
    }),
  },
  {
    name: "R-F9 · a stop reason of U49a's left without its sentence",
    expect: [L.f9],
    impl: () => ({ stopLabel: (k) => (k === "credit_unreadable" ? `Engine reason: ${k}` : stopReasonLabel(k)) }),
  },
  {
    name: "R-F10 · Start's credit read reuses a reading up to fifteen minutes old",
    expect: [L.f10],
    impl: () => ({
      sources: {
        ...REAL_SOURCES,
        startCheck: plantIn(REAL_SOURCES.startCheck, "refreshSmsBalance({ maxAgeMs: START_CREDIT_MAX_AGE_MS })", "refreshSmsBalance({ maxAgeMs: 15 * 60_000 })"),
      },
    }),
  },
  {
    name: "R-F10b · credit-guard.ts imports a server module",
    expect: [L.f10],
    impl: () => ({ sources: { ...REAL_SOURCES, creditGuard: `${REAL_SOURCES.creditGuard}${NL}import { db } from "@/lib/server/store";${NL}void db;` } }),
  },
];

/** ⭐ §F, as a host runs it. */
export const SECTION_F: EngineSection<FImpl> = {
  id: "F",
  title: "§F · U49a · the credit kept for codes, and the refusal at Start",
  labels: Object.values(L),
  real: F_REAL,
  run: runSectionF,
  plants: F_PLANTS,
};
