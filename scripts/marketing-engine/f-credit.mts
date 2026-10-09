/**
 * test:marketing-engine §F — U49a's guard: THE CREDIT KEPT FOR CODES, AND THE REFUSALS AT START AND AT RESUME
 * (ENGINE-SPEC §4.12 and its "as built" note; E15 · E16 · E18 · E19 · OD28 · OD63 · OD65 · OD66). `sendBatch`'s own last
 * line (`minimumBalanceTzs`, MARKETING_FLOOR) is held by `test:sms-cost-guard` §10, whose plants are in-place anchors
 * (`scripts/anchors/sms-cost-guard.anchors.mjs`).
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
 *   F0 controls · F1 every Start refusal by its fixture, in the documented order · F2 ⭐ the plan's RED, priced at
 *   today's price, and nothing written · F3 an unreadable balance refuses · F4 OD28 · F5 the Start sentences, no TZS for
 *   growth · F6 Resume prices only what is left, and never skips its reads · F7 the stub and the provider · F8 the
 *   estimate's reserve · F9 the stop reasons · F10 the wiring · F11 a count that fails is retryable · F12 Resume before
 *   the list finished · F13 Resume's own reasons and words · F14 ⛔ OD66 no both-arms count for a viewer who may not read
 *   numbers · F15 ⛔ OD63 settings never priced from their defaults · F16 ⛔ Resume refuses what only a new copy can fix
 *   (U42's review, ENGINE-SPEC §4.15 decision 1 as amended — added at the U42 + U49a merge) · F17 ⭐ F-2 a send reply's
 *   pending segments come off first, at Start and at Resume (the engine's dry-fire, 2026-10-08).
 * F0 runs the real code alone, so no plant can turn it: a control is never a catch.
 * ⭐ The fixtures' frozen `estimateTzs` was priced at TZS 5 a segment, and today's price is TZS 6: a check that priced
 * Start from the frozen figure instead of today's would read every money fixture differently (R-F2d).
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
import type {
  RefusalViewer, ResumeRefusal, StartCheck, StartCheckDeps, StartRefusal,
} from "../../src/lib/server/marketing/start-check.ts";
import { creditVerdict } from "../../src/lib/marketing/credit-guard.ts";
import { spendableBalance } from "../../src/lib/marketing/engine-rules.ts";
import { audienceFence, membersKeyOf, readCampaignAudience } from "../../src/lib/server/marketing/audience-fence.ts";
import type { FenceDeps } from "../../src/lib/server/marketing/audience-fence.ts";
import { contactAudienceKey, WHOLE_BOOK } from "../../src/lib/server/marketing/audience.ts";
import type { ContactAudienceFilter } from "../../src/lib/server/marketing/audience.ts";
import { canonicalMembers, startAudienceVerdict } from "../../src/lib/marketing/campaign-confirm.ts";
import { campaignEstimate, estimateView } from "../../src/lib/marketing/campaign-estimate.ts";
import type { BalanceFigure, EstimateAudience, EstimateInputs, VariantSize } from "../../src/lib/marketing/campaign-estimate.ts";
import { balanceFigureOf, loadEstimateInputsFor, loadSegmentCost } from "../../src/lib/server/marketing/estimate.ts";
import { stopReasonLabel, zeroRecipientStatusCounts } from "../../src/lib/marketing/campaign-status.ts";
import { MARKETING_SMS_SETTINGS_DEFAULTS } from "../../src/lib/marketing/sms-settings.ts";
import type { MarketingSmsSettings } from "../../src/lib/marketing/sms-settings.ts";
import { reloadMarketingSmsSettings } from "../../src/lib/server/marketing/sms-settings.ts";
import type { SettingsReload } from "../../src/lib/server/marketing/sms-settings.ts";
import { marketingLiveGate, readMarketingLiveSwitch } from "../../src/lib/server/marketing/live-switch.ts";
import type { MarketingLiveSwitch } from "../../src/lib/server/marketing/live-switch.ts";
import { smsBalanceThresholds, smsProviderResolution, smsRailProblem } from "../../src/lib/server/sms.ts";
import type { SmsBalanceRead, SmsProviderResolution, SmsRailProblem } from "../../src/lib/server/sms.ts";
import type { SegmentCostMeasure } from "../../src/lib/marketing/segment-cost.ts";
import { db } from "../../src/lib/server/store.ts";
import type { SmsCampaignRecipientStatusCounts, StoredSmsCampaign } from "../../src/lib/server/store.ts";
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
  f0: "F0 · CONTROLS — the fixture filters read back at the campaign's door, the listed key is 32 hex for the confirmed row's own draft, 1,604 people at today's TZS 6 cost TZS 9,624 (the frozen estimate, priced at TZS 5, is 8,020), and the fixture world STARTS (1,600 counted now, shrunkBy 4, costTzs 9,624) with startRefusal, the spec's API, agreeing with checkStart both ways",
  f1: "F1 · ⭐ EVERY START REFUSAL IS REACHED BY EXACTLY ITS FIXTURE, IN THE DOCUMENTED ORDER — a draft or a paused row is not_confirmed; a confirmation missing its tier or budget, whose frozen segments disagree, or a list whose members key is corrupt or missing is confirmation_unreadable; an off, expired or unreadable switch is switch_closed; no keys is rail_dead; the book or both with no source line STARTS, as players-only does (④ is gone — the owner's ruling of 2026-10-09: nothing is appended, so no line is required); a filter that is not JSON is audience_unreadable; settings unanswered or thrown are settings_unreadable and half-read settings_incomplete; no price is price_unknown; 1,800 at today's TZS 6 is over_budget (TZS 10,800 over 10,000 — frozen at TZS 5 it would have been 9,000; landing on the limit starts); a failed credit read is credit_unreadable and TZS 24,000 is credit_low; a fence that cannot count is audience_uncounted; 1,610 is audience_moved; a swapped person on a list is members_changed and a list the walk cannot name members_unverified — and with every later step broken too, the earliest still answers",
  f2: "F2 · ⭐ THE PLAN'S RED — a projection above the live credit minus the credit kept for codes refuses at Start, priced at TODAY's price (TZS 6, never the confirmation's frozen TZS 5): TZS 24,000 of credit, TZS 9,624 for this campaign and TZS 20,000 kept is credit_low with exactly those figures (TZS 40,000 starts; 29,624 lands on the line and starts; 29,623 refuses) — and NOTHING IS WRITTEN: the row handed in is unchanged, no audit row and no SMS row appears for the campaign, and start-check.ts names no writer",
  f3: "F3 · ⛔ AN UNREADABLE BALANCE REFUSES (FAIL CLOSED) — a refused, unanswered, unfinished, unavailable or stale read, and a read that throws, are each credit_unreadable with no figure in the refusal (a kept TZS 517 never leaks); creditVerdict: on the line goes ahead, a shilling under is credit_low with its three figures, and an unreadable credit, a cost or a credit that is not a figure of 0 or more, or a reserve that is not a figure ABOVE 0 (NaN, negative, 0) is credit_unreadable",
  f4: "F4 · ⭐ OD28 AT START, THROUGH THE ONE FENCE — typed: the confirmed 1,604 again starts (shrunkBy 0), 1,600 starts reporting shrunkBy 4, 1,605 refuses audience_moved (1,605 over 1,604, the book); listed (3): the same three start, a swapped person, one fewer and nobody are members_changed, a fourth is audience_moved; a watermark keyed for the revision before is members_changed; a walk that cannot name the people it counted is members_unverified, never members_changed; a list whose stored watermark is not a members key is confirmation_unreadable, never members_changed",
  f5: "F5 · ⛔ A GROWTH SENTENCE CARRIES NO TZS — each Start refusal says its words (§4.12's, and the as-built note's for the reasons added); for a viewer who may not read money none holds TZS or a figure of the money fixture (10,800 · 10,000 · 24,000 · 9,624 · 20,000), while a money reader's over_budget and credit_low carry them; every one but not_confirmed says Nothing was sent",
  f6: "F6 · ⭐ RESUME PRICES ONLY WHAT IS LEFT, AND NEVER SKIPS ITS READS — the list finished: 604 owed (600 pending, 4 held) of 1,604 at TZS 6 is TZS 3,624, and TZS 24,000 of credit resumes it where the whole campaign (TZS 9,624) would be refused; 1,000 owed (TZS 6,000) is credit_low with that figure; NOTHING OWED (every row settled — paused just after the last slice) resumes only AFTER the switch and the rail (switched off, it is switch_closed) with no settings, price or credit read, at TZS 24,000 and at TZS 15,000 alike: the step finds nothing owed and finishes, and a refusal 'up to TZS 0 … Top up' would be false (U49a's re-review); with rows owed, a closed switch, a dead rail and an unreadable credit refuse it; Resume never counts the population; counts that are not counts throw",
  f7: "F7 · THE STUB AND THE PROVIDER — on the console stub (no handset, no money) a campaign starts and resumes with the switch closed and NO credit read (U47b's local drive); an unrecognised provider is rail_dead (provider-unrecognised), never a closed switch, even when the rail reader says nothing; Blackball with the switch closed is switch_closed",
  f8: "F8 · THE ESTIMATE'S RESERVE IS THE CREDIT KEPT FOR CODES (decision 4) — through the shipped default it is the live Marketing SMS settings record's figure (TZS 20,000 kept, 20,000 reserved; never the platform floor of TZS 50, never the price); a reserve that cannot be read — null, NaN, negative or 0 — is UNREADABLE: no coverage figure (no spendable, covers or shortfall) and the covers tile says why, in the words of the credit kept for login and withdrawal codes, never a reserve of TZS 0; the source re-reads the settings for codesReserveTzs, null on a record it cannot read, and names no platform floor",
  f9: "F9 · THE STOP REASONS (decision 5, §3.4) — MARKETING_FLOOR and marketing_floor say the credit reached what is kept for login and withdrawal codes, credit_unreadable says it could not be read, each in the spec's words, and an unknown key is still named",
  f10: "F10 · THE WIRING — Start's shipped reads are the real doors (the provider, the switch through THE gate, the rail, the settings re-read, the cost loader, the ONE fence, the credit rule, the pending-segment rule, OD28's verdict); its credit is read at most a minute old (START_CREDIT_MAX_AGE_MS at most 60 s); credit-guard.ts stays pure: type imports alone, from the pure marketing modules",
  f11: "F11 · A COUNT THAT FAILS IS RETRYABLE — a fence that throws, or answers a count that is not one, is audience_uncounted (Try again in a minute; never confirm a new copy), while ONLY a stored filter that cannot be read is audience_unreadable",
  f12: "F12 · ⭐ RESUME BEFORE THE LIST FINISHED (enqueuedAt null) PRICES EVERYONE STILL OWED — paused at 0 rows written of 1,604 confirmed is credit_low with the whole price (TZS 9,624 against TZS 24,000), and so is 600 rows written; TZS 40,000 resumes it; resumeOutstanding is the confirmed count minus the settled rows there and PENDING + HELD once the list is finished; no confirmed count to start from is confirmation_unreadable — and so is a FINISHED list with no confirmed count, before any read (as Start reads it: the list's length cannot be judged without one — U49a's re-review)",
  f13: "F13 · RESUME'S OWN REASONS AND WORDS — saved sizes that cannot be read are sizes_unreadable (never price_unknown, which the owner could not fix); every Resume refusal says its own words, money only for a money reader, none says start, narrow the audience or Nothing was sent, and each ends Nobody more was messaged; and once anyone on the list was messaged, what only a new copy can fix says a copy would message them AGAIN and never prescribes one (U42's re-review)",
  f14: "F14 · ⛔ OD66 · NO BOTH-ARMS COUNT FOR A VIEWER WHO MAY NOT READ NUMBERS — audience_moved on a book ∪ players campaign says the audience grew with NO figure to such a viewer, and the figures to a reader; on a book or a players campaign the figures are OD65's count alone and go to every role; the refusal OBJECT names its population",
  f15: "F15 · ⛔ OD63 · SETTINGS THAT CANNOT BE READ ARE NEVER PRICED FROM THEIR DEFAULTS — a read that did not answer or threw is settings_unreadable and a record not read in full (its gaps holding the defaults) settings_incomplete, at Start and at Resume, with no price and no credit read, in a world where the defaults would START; settings_unreadable says try again, settings_incomplete names the developer and never says try again",
  f17: "F17 · ⭐ F-2 · A SEND REPLY'S FIGURE IS PRE-CHARGE: ITS PENDING SEGMENTS COME OFF FIRST, AT START AND AT RESUME (the engine's dry-fire, 2026-10-08) — TZS 40,000 read from a send reply with 1,800 segments not yet taken off (TZS 10,800 at today's TZS 6) is credit_low with the TZS 29,200 left (29,200 · 9,624 · 20,000), where the same TZS 40,000 with none pending starts; 1,729 pending (TZS 29,626 left) starts and 1,730 (TZS 29,620) refuses; at Resume, 604 owed (TZS 3,624) at TZS 24,000 resumes with 62 pending (TZS 23,628 left) and is credit_low with 63 (TZS 23,622 left); at a MEASURED TZS 8 they are priced at TZS 8 — 604 owed (TZS 4,832) at TZS 30,000 resumes with 646 pending and is credit_low with 647 (TZS 24,824 left) — the line the engine's next slice holds, so a Resume never lets through what that slice would pause at once",
  f16: "F16 · ⛔ RESUME REFUSES WHAT ONLY A NEW COPY CAN FIX (U42's review; ENGINE-SPEC §4.15 decision 1 as amended) — a list LONGER than its confirmed count (1,605 rows of 1,604) is list_over_confirmed WHATEVER the stop reason (an officer's pause, none, the credit's own) and BEFORE ANY READ — with the switch closed and on the console stub too, the switch, the settings, the price and the credit never read; a campaign the enqueue paused audience_moved, audience_unreadable, list_over_confirmed or list_over_confirmed_sending is refused for that reason (list_over_confirmed for the last two) with its list within its count, again with nothing read; each refusal says whether anyone on the list was already messaged (reached: true after 1,000 SENT, false with nothing handed over); and the same row paused by an officer within its count resumes (the control)",
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
  resume: (c: StoredSmsCampaign, counts: SmsCampaignRecipientStatusCounts, deps: StartCheckDeps) => Promise<ResumeRefusal | null>;
  /** Every fixture world's reads pass through here first — the hook a plant uses to change one of them. */
  deps: (d: StartCheckDeps) => StartCheckDeps;
  sentence: (r: StartRefusal, v: RefusalViewer) => string;
  resumeSentence: (r: ResumeRefusal, v: RefusalViewer) => string;
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
  resumeSentence: SC.resumeRefusalSentence,
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
/** Three counted, but the walk names one person twice: the count and the walk disagree, so nobody can be keyed. */
const K3_UNNAMED = [keyOf(11), keyOf(12), keyOf(12)];
const K2 = [keyOf(11), keyOf(12)];
const K4 = [keyOf(11), keyOf(12), keyOf(13), keyOf(15)];

const filterKey = (over: Partial<ContactAudienceFilter>): string => contactAudienceKey({ ...WHOLE_BOOK, ...over });
/** A tag of the contact book (population null — the book), book ∪ players, and the player accounts alone. */
const BOOK = filterKey({ tags: ["vip"] });
const BOTH = filterKey({ population: "both" });
const PLAYERS = filterKey({ population: "players" });

const CAMPAIGN_ID = "cmp_u49a_start_check";
const REVISION = 7;
/** The figures of the spec's sentences: TZS 6 a segment today, TZS 20,000 kept for codes, a limit of TZS 10,000. */
const PRICE = 6;
/** ⭐ The price the confirmation froze its estimate at — NOT today's: Start must price at today's (R-F2d). */
const FROZEN_PRICE = 5;
const KEPT = 20_000;
const LIMIT = 10_000;
const SETTINGS: MarketingSmsSettings = { ...MARKETING_SMS_SETTINGS_DEFAULTS, pricePerSegmentTzs: PRICE, codesReserveTzs: KEPT, campaignLimitTzs: LIMIT };
const SETTINGS_OK: SettingsReload = { ok: true, settings: SETTINGS, stored: true, readable: true };
/** A stored record read only in part: the reader fills its gaps with the defaults, and says so. */
const SETTINGS_HALF: SettingsReload = { ok: true, settings: { ...MARKETING_SMS_SETTINGS_DEFAULTS }, stored: true, readable: false };
const SETTINGS_DOWN: SettingsReload = { ok: false, error: "the database did not answer" };

/** A campaign as U40a's confirmation leaves it: 1,604 people, typed, one segment each, estimated at the TZS 5 then measured. */
const confirmed = (over: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign => ({
  id: CAMPAIGN_ID, name: "U49a · the refusal at Start", status: "CONFIRMED",
  bodySw: "50pick: ofa ya leo.", bodyEn: null, codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: null,
  nameFallbackSw: null, nameFallbackEn: null, sourcePhrase: "Namba yako ilitoka kwenye fomu ya 50pick.",
  draftRevision: REVISION, confirmTier: "TYPED", audienceFilter: BOOK, audienceCount: 1604, audienceWatermark: null,
  estimateSegments: 1604, estimateTzs: 1604 * FROZEN_PRICE, budgetTzs: LIMIT, enqueueCursor: null, enqueuedAt: null, stopReason: null,
  createdBy: "usr_u49a_officer", confirmedBy: "usr_u49a_officer", confirmedAt: iso(NOW - HOUR), startedAt: null, pausedAt: null,
  finishedAt: null, createdAt: iso(NOW - 2 * HOUR), updatedAt: iso(NOW - HOUR), ...over,
});
/** 1,800 people: TZS 10,800 at today's price, over the TZS 10,000 limit — frozen at TZS 5 it read 9,000, within it. */
const over1800 = (): StoredSmsCampaign => confirmed({ audienceCount: 1800, estimateSegments: 1800, estimateTzs: 1800 * FROZEN_PRICE });
/** The listed confirmation's members, and its key — for THIS row's draft, as U40a's confirmation stored it. */
const CANON3 = canonicalMembers(K3, 3) ?? "";
const LISTED_KEY = membersKeyOf({ campaignId: CAMPAIGN_ID, draftRevision: REVISION }, CANON3);
const OTHER_DRAFT_KEY = membersKeyOf({ campaignId: CAMPAIGN_ID, draftRevision: REVISION - 1 }, CANON3);
const listed = (over: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign =>
  confirmed({ confirmTier: "ENUMERATE", audienceCount: 3, estimateSegments: 3, estimateTzs: 3 * FROZEN_PRICE, audienceWatermark: LISTED_KEY, ...over });
/** Paused after its list finished (`enqueuedAt` set). */
const paused = (over: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign =>
  confirmed({ status: "PAUSED", startedAt: iso(NOW - 40 * MIN), enqueuedAt: iso(NOW - 35 * MIN), pausedAt: iso(NOW - 5 * MIN), ...over });
/** Paused while PREPARING: its list never finished (`enqueuedAt` null) — Resume returns it to PREPARING (§3.1). */
const pausedEarly = (over: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign => paused({ enqueuedAt: null, ...over });
/** Recipient rows by status, zero-filled. */
const rows = (over: Partial<SmsCampaignRecipientStatusCounts> = {}): SmsCampaignRecipientStatusCounts => ({ ...zeroRecipientStatusCounts(), ...over });
const LEFT_604 = rows({ PENDING: 600, HELD: 4, SENT: 1000 });

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
  settings: SettingsReload | "throws";
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
/** Nothing read at all: no switch, settings, price, credit or fence. */
const nothingRead = (c: Calls): boolean => c.switch === 0 && c.settings === 0 && c.cost === 0 && c.balance === 0 && c.fence === 0;

/** The ONE fence's own reads over a fixture walk: `audienceFence` itself, and the real keyed members key, run on top. */
const fenceDepsOf = (a: Audience): FenceDeps => ({
  count: async () => {
    if (a === "throws") throw new Error("the walk could not be read");
    return a.count;
  },
  walk: async (_f, cursor, limit) => {
    if (a === "throws") throw new Error("the walk could not be read");
    const from = cursor === null ? 0 : Number(cursor.split(":")[1]);
    const page = a.keys.slice(from, from + limit).map((msisdn, i) => ({ kind: "player" as const, msisdn, userId: `usr_u49a_${from + i}` }));
    return { rows: page, next: from + page.length >= a.keys.length ? "done" : `f:${from + page.length}` };
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
  spendable: spendableBalance,
  audienceVerdict: startAudienceVerdict,
  now: () => NOW,
});

async function startIn(impl: FImpl, w: World): Promise<{ check: StartCheck; calls: Calls }> {
  const calls = blank();
  const check = await impl.start(w.row, impl.deps(depsOf(w, calls)));
  return { check, calls };
}
async function resumeIn(impl: FImpl, w: World, counts: SmsCampaignRecipientStatusCounts): Promise<{ refusal: ResumeRefusal | null; calls: Calls }> {
  const calls = blank();
  const refusal = await impl.resume(w.row, counts, impl.deps(depsOf(w, calls)));
  return { refusal, calls };
}
const said = (c: StartCheck): string => (c.ok ? "START" : c.refusal.reason);
const resumed = (r: ResumeRefusal | null): string => (r === null ? "RESUME" : r.reason);

/** One claim: its body answers [holds, detail]; a body that throws is that claim's failure, never the section's end. */
async function claim(ok: Check, label: string, body: () => Promise<[boolean, string]>): Promise<void> {
  try {
    const [cond, detail] = await body();
    ok(label, cond, detail);
  } catch (err) {
    ok(label, false, `threw: ${String((err as Error)?.message ?? err)}`);
  }
}

/* ══ THE WORDS — [for a viewer who may not read money, for a money reader]; both read numbers ═══════════════════════ */

const READER: RefusalViewer = { money: false, reads: true };
const MONEY_READER: RefusalViewer = { money: true, reads: true };
const MASKED: RefusalViewer = { money: false, reads: false };

const OVER: StartRefusal = { reason: "over_budget", costTzs: 10_800, budgetTzs: 10_000 };
const LOW: StartRefusal = { reason: "credit_low", balanceTzs: 24_000, costTzs: 9_624, reserveTzs: 20_000 };
const MOVED = (population: "book" | "players" | "both"): StartRefusal =>
  ({ reason: "audience_moved", freshCount: 1_610, confirmedCount: 1_604, population });
const EVERY_START_REFUSAL: StartRefusal[] = [
  { reason: "not_confirmed" }, { reason: "confirmation_unreadable" }, { reason: "switch_closed" }, { reason: "rail_dead", rail: "keys-not-set" },
  { reason: "audience_unreadable" }, { reason: "settings_unreadable" }, { reason: "settings_incomplete" },
  { reason: "price_unknown" }, OVER, { reason: "credit_unreadable" }, LOW, { reason: "audience_uncounted" }, MOVED("book"),
  { reason: "members_unverified" }, { reason: "members_changed" },
];
const both = (s: string): readonly [string, string] => [s, s];
const START_WORDS: Readonly<Record<string, readonly [string, string]>> = {
  not_confirmed: both("Only a confirmed campaign can start."),
  confirmation_unreadable: both("This campaign's confirmation can't be read in full, so it can't start. Stop it and confirm a new copy. Nothing was sent."),
  switch_closed: both("Marketing SMS are switched off. The owner switches them on (Admin → System → Marketing SMS sending), then you can start. Nothing was sent."),
  rail_dead: both("No SMS can leave this server right now — Admin → System says why. Nothing was sent."),
  // A copy carries the same stored filter and U47b's copy refuses one it cannot read: the other way out is said too.
  audience_unreadable: both("The saved audience can't be read any more. Stop this campaign and confirm a new copy — or write a new campaign if the copy is refused. Nothing was sent."),
  settings_unreadable: both("The Marketing SMS settings couldn't be read just now, so this campaign can't be checked before it starts. Try again in a moment. Nothing was sent."),
  settings_incomplete: both("The saved Marketing SMS settings can't be read in full, so this campaign can't be checked before it starts. The developer must repair them first. Nothing was sent."),
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
  audience_uncounted: both("The audience couldn't be counted just now. Try again in a minute. Nothing was sent."),
  audience_moved: both("The audience grew since it was confirmed — now 1,610, confirmed 1,604. Nothing was sent. Stop this campaign and confirm a new copy."),
  members_unverified: both("The people on this campaign couldn't be matched to the confirmed list just now. Try again in a minute; if it happens again, stop this campaign and confirm a new copy. Nothing was sent."),
  members_changed: both("The people on this campaign changed since they were confirmed. Nothing was sent. Stop this campaign and confirm a new copy."),
};
/** ⛔ OD66 · audience_moved on a book ∪ players campaign, to a viewer who may not read a number. */
const MOVED_WITHOUT_FIGURES = "The audience grew since it was confirmed. Nothing was sent. Stop this campaign and confirm a new copy.";

const RESUME_LOW: ResumeRefusal = { reason: "credit_low", balanceTzs: 24_000, costTzs: 9_624, reserveTzs: 20_000 };
const EVERY_RESUME_REFUSAL: ResumeRefusal[] = [
  { reason: "list_over_confirmed", reached: false }, { reason: "list_over_confirmed", reached: true },
  { reason: "audience_moved", reached: false }, { reason: "audience_moved", reached: true },
  { reason: "audience_unreadable", reached: false }, { reason: "audience_unreadable", reached: true },
  { reason: "switch_closed" }, { reason: "rail_dead", rail: "keys-not-set" }, { reason: "confirmation_unreadable" }, { reason: "sizes_unreadable" },
  { reason: "settings_unreadable" }, { reason: "settings_incomplete" }, { reason: "price_unknown" }, { reason: "credit_unreadable" }, RESUME_LOW,
];
/** A Resume refusal's key in `RESUME_WORDS`: its reason, and `+reached` once anyone on the list was messaged. */
const wordsKeyOf = (r: ResumeRefusal): string => ("reached" in r && r.reached ? `${r.reason}+reached` : r.reason);
/** ⭐ A copy has the same filter and nothing de-duplicates across campaigns (U42's re-review). */
const AGAIN = "Some people on it have already been messaged, and a copy would message them again: stop it, and confirm a copy only if that is what you want.";
const RESUME_WORDS: Readonly<Record<string, readonly [string, string]>> = {
  // ⭐ What only a new copy can fix (F16): never "then resume"; nothing reached → Stop and confirm a new copy; anyone
  //    already messaged → a copy would message them again, and the choice is the officer's.
  list_over_confirmed: both("More people are on this campaign's list than were confirmed, so it can't resume. Stop it and confirm a new copy. Nobody more was messaged."),
  "list_over_confirmed+reached": both(`More people are on this campaign's list than were confirmed, so it can't resume. ${AGAIN} Nobody more was messaged.`),
  audience_moved: both("The people on this campaign changed after it was confirmed, so it can't resume. Stop it and confirm a new copy. Nobody more was messaged."),
  "audience_moved+reached": both(`The people on this campaign changed after it was confirmed, so it can't resume. ${AGAIN} Nobody more was messaged.`),
  audience_unreadable: both("The saved audience can't be read any more, so this campaign can't resume. Stop it and confirm a new copy — or write a new campaign if the copy is refused. Nobody more was messaged."),
  "audience_unreadable+reached": both("The saved audience can't be read any more, so this campaign can't resume. Some people on it have already been messaged, and a new campaign to the same people would message them again: stop it, and send another only if that is what you want. Nobody more was messaged."),
  switch_closed: both("Marketing SMS are switched off. The owner switches them on (Admin → System → Marketing SMS sending), then you can resume. Nobody more was messaged."),
  rail_dead: both("No SMS can leave this server right now — Admin → System says why. The campaign stays paused. Nobody more was messaged."),
  confirmation_unreadable: both("This campaign's confirmation can't be read in full, so what is left to send can't be checked, and it can't resume. Stop it, or ask the developer. Nobody more was messaged."),
  sizes_unreadable: both("This campaign's saved message size can't be read, so what is left to send can't be priced, and it can't resume. Stop it, or ask the developer. Nobody more was messaged."),
  settings_unreadable: both("The Marketing SMS settings couldn't be read just now, so what is left to send can't be checked. Try again in a moment. Nobody more was messaged."),
  settings_incomplete: both("The saved Marketing SMS settings can't be read in full, so what is left to send can't be checked. The developer must repair them first. Nobody more was messaged."),
  price_unknown: both("The price per SMS isn't known, so what is left to send can't be priced. The owner sets it on Admin → System → Marketing SMS. Nobody more was messaged."),
  credit_unreadable: both("The SMS credit couldn't be read just now, so the campaign can't resume safely. Try again in a minute. Nobody more was messaged."),
  credit_low: [
    "There isn't enough SMS credit to finish this campaign and still keep what login and withdrawal codes need. Ask the owner to top up, then resume. Nobody more was messaged.",
    "Resuming would leave less SMS credit than is kept for login and withdrawal codes — credit TZS 24,000, the rest of this campaign up to TZS 9,624, kept for codes TZS 20,000. Top up, then resume. Nobody more was messaged.",
  ],
};
const MONEY_FIGURES = ["10,800", "10,000", "24,000", "9,624", "20,000"];

/** §3.4's sentences for U49a's stop reasons. */
const FLOOR_SENTENCE = "Paused — the SMS credit reached what is kept for login and withdrawal codes. Top up, then Resume.";
const UNREADABLE_SENTENCE = "Paused — the SMS credit couldn't be read, so sending stopped to protect login codes. Resume when Admin → System shows the credit again.";

const AUD: EstimateAudience = { ok: true, population: 1604, forecast: 1604 };
const SW1: VariantSize = { locale: "SW", segments: 1, encoding: "GSM7" };
const COVERS_UNREAD = "needs the credit kept for login and withdrawal codes, which couldn't be read";

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
      && Math.ceil(1604 * PRICE) === 9_624 && confirmed().estimateTzs === 8_020
      && real.ok && real.freshCount === 1600 && real.shrunkBy === 4 && real.costTzs === 9_624 && spec === null
      && !checkLow.ok && json(specLow) === json(checkLow.refusal);
    return [holds, `filters ${reads.join("/")} · W0 → ${said(real)}${real.ok ? ` shrunkBy ${real.shrunkBy} cost ${real.costTzs}` : ""} · spec ${json(spec)} · at 24,000 ${json(specLow)}`];
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
    await expect("no tier", withW({ row: confirmed({ confirmTier: null }) }), "confirmation_unreadable");
    await expect("no budget", withW({ row: confirmed({ budgetTzs: null }) }), "confirmation_unreadable");
    await expect("frozen segments that disagree with the count", withW({ row: confirmed({ estimateSegments: 1700 }) }), "confirmation_unreadable");
    await expect("a list whose members key is corrupt", withW({ row: listed({ audienceWatermark: "not-a-members-key" }), audience: { count: 3, keys: K3 } }), "confirmation_unreadable");
    await expect("a list with no members key", withW({ row: listed({ audienceWatermark: null }), audience: { count: 3, keys: K3 } }), "confirmation_unreadable");
    await expect("the switch off", withW({ live: CLOSED }), "switch_closed");
    await expect("a switch past its closing time", withW({ live: { ...OPEN, closesAt: iso(NOW - 1) } }), "switch_closed");
    await expect("a switch that cannot be read", withW({ live: { state: "closed", why: "unreadable" } }), "switch_closed");
    await expect("no keys", withW({ rail: "keys-not-set" }), "rail_dead", (c) => !c.ok && c.refusal.reason === "rail_dead" && c.refusal.rail === "keys-not-set");
    // ⭐ ④ GONE (the owner's ruling of 2026-10-09): a campaign that can reach the contact book starts with no source line.
    await expect("the book with no source line", withW({ row: confirmed({ sourcePhrase: null }) }), "START");
    await expect("the book with a blank one", withW({ row: confirmed({ sourcePhrase: "   " }) }), "START");
    await expect("book and players with none", withW({ row: confirmed({ audienceFilter: BOTH, sourcePhrase: null }) }), "START");
    await expect("players alone with none", withW({ row: confirmed({ audienceFilter: PLAYERS, sourcePhrase: null }) }), "START");
    await expect("a filter that is not JSON", withW({ row: confirmed({ audienceFilter: "{not json" }) }), "audience_unreadable");
    await expect("settings that did not answer", withW({ settings: SETTINGS_DOWN }), "settings_unreadable");
    await expect("a settings read that throws", withW({ settings: "throws" }), "settings_unreadable");
    await expect("settings not read in full", withW({ settings: SETTINGS_HALF }), "settings_incomplete");
    await expect("a price nobody knows", withW({ cost: { kind: "unknown", reason: "no-sends" } }), "price_unknown");
    await expect("1,800 people at today's TZS 6", withW({ row: over1800() }), "over_budget",
      (c) => !c.ok && c.refusal.reason === "over_budget" && c.refusal.costTzs === 10_800 && c.refusal.budgetTzs === 10_000);
    await expect("a limit the projection lands on (control)", withW({ row: confirmed({ budgetTzs: 9_624 }) }), "START");
    await expect("a credit read that failed", withW({ balance: UNANSWERED }), "credit_unreadable");
    await expect("TZS 24,000 of credit", withW({ balance: credit(24_000) }), "credit_low");
    await expect("a fence that cannot count", withW({ audience: "throws" }), "audience_uncounted");
    await expect("1,610 people now", withW({ audience: { count: 1610, keys: KEYS6 } }), "audience_moved",
      (c) => !c.ok && c.refusal.reason === "audience_moved" && c.refusal.freshCount === 1610 && c.refusal.confirmedCount === 1604);
    await expect("a listed three with one swapped", withW({ row: listed(), audience: { count: 3, keys: K3_SWAPPED } }), "members_changed");
    await expect("a listed three the walk cannot name", withW({ row: listed(), audience: { count: 3, keys: K3_UNNAMED } }), "members_unverified");
    await expect("all in order (control)", W0(), "START");

    // ⭐ THE ORDER: break step i AND every step after it — the earliest broken step must still be the answer.
    const STEPS: Array<{ reason: string; apply: (w: World) => World }> = [
      { reason: "not_confirmed", apply: (w) => ({ ...w, row: { ...w.row, status: "DRAFT" } }) },
      { reason: "confirmation_unreadable", apply: (w) => ({ ...w, row: { ...w.row, confirmTier: null } }) },
      { reason: "switch_closed", apply: (w) => ({ ...w, live: CLOSED }) },
      { reason: "rail_dead", apply: (w) => ({ ...w, rail: "keys-not-set" }) },
      { reason: "audience_unreadable", apply: (w) => ({ ...w, row: { ...w.row, audienceFilter: "{not json" } }) },
      { reason: "settings_unreadable", apply: (w) => ({ ...w, settings: SETTINGS_DOWN }) },
      { reason: "price_unknown", apply: (w) => ({ ...w, cost: { kind: "unknown", reason: "no-sends" } }) },
      { reason: "over_budget", apply: (w) => ({ ...w, row: { ...w.row, audienceCount: 1800, estimateSegments: 1800 } }) },
      { reason: "credit_unreadable", apply: (w) => ({ ...w, balance: UNANSWERED }) },
      { reason: "audience_moved", apply: (w) => ({ ...w, audience: { count: (w.row.audienceCount ?? 0) + 6, keys: KEYS6 } }) },
    ];
    const order: string[] = [];
    for (let i = 0; i < STEPS.length; i++) {
      let w = W0();
      for (let j = i; j < STEPS.length; j++) w = STEPS[j].apply(w);
      order.push(said((await startIn(impl, w)).check));
    }
    const want = STEPS.map((s) => s.reason);
    return [misses.length === 0 && json(order) === json(want),
      `${misses.length ? `${misses.join(" | ")} · ` : ""}order ${order.join(" > ")}`];
  });

  /* ── F2 · ⭐ the plan's RED, at today's price, and nothing written ── */
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
    const holds = lowRight && r40.ok && r40.costTzs === 9_624 && onLine.ok && !under.ok && under.refusal.reason === "credit_low"
      && json(low.row) === rowBefore && auditAfter === auditBefore && smsAfter === smsBefore
      && impl.sources.startCheck.length > 2000 && writer === null;
    return [holds, `24,000 → ${r24.ok ? "START" : json(r24.refusal)} · 40,000 → ${said(r40)}${r40.ok ? ` at ${r40.costTzs}` : ""} · 29,624 → ${said(onLine)} · 29,623 → ${said(under)} · row ${json(low.row) === rowBefore ? "unchanged" : "CHANGED"} · audit rows ${auditBefore} → ${auditAfter} · marketing SMS rows ${smsBefore} → ${smsAfter} · a writer in the source: ${writer ?? "none"}`];
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
      ["a reserve of 0", json(impl.credit({ balance: live(40_000), costTzs: 1_000, reserveTzs: 0 })), UNREAD],
      ["a reserve that is NaN", json(impl.credit({ balance: live(40_000), costTzs: 1_000, reserveTzs: Number.NaN })), UNREAD],
      ["an endless credit", json(impl.credit({ balance: live(Number.POSITIVE_INFINITY), costTzs: 1_000, reserveTzs: 20_000 })), UNREAD],
      ["nothing to spend (control)", json(impl.credit({ balance: live(40_000), costTzs: 0, reserveTzs: 20_000 })), json({ ok: true })],
    ];
    for (const [name, got, want] of table) if (got !== want) misses.push(`${name}: ${got} (want ${want})`);
    return [misses.length === 0, misses.length ? misses.join(" | ") : "every unreadable read refused with no figure; the table holds"];
  });

  /* ── F4 · OD28 through the ONE fence ── */
  await claim(ok, L.f4, async () => {
    const typed = async (count: number): Promise<StartCheck> => (await startIn(impl, withW({ audience: { count, keys: KEYS6 } }))).check;
    const onList = async (keys: readonly string[], watermark: string | null = LISTED_KEY, count = keys.length): Promise<StartCheck> =>
      (await startIn(impl, withW({ row: listed({ audienceWatermark: watermark }), audience: { count, keys } }))).check;
    const t1604 = await typed(1604);
    const t1600 = await typed(1600);
    const t1605 = await typed(1605);
    const same = await onList(K3);
    const swapped = await onList(K3_SWAPPED);
    const fewer = await onList(K2);
    const nobody = await onList([]);
    const more = await onList(K4);
    const otherDraft = await onList(K3, OTHER_DRAFT_KEY);
    const unnamed = await onList(K3_UNNAMED, LISTED_KEY, 3);
    const corrupt = await onList(K3, "zz-not-a-members-key");
    const missing = await onList(K3, null);
    const holds = t1604.ok && t1604.freshCount === 1604 && t1604.shrunkBy === 0
      && t1600.ok && t1600.shrunkBy === 4
      && !t1605.ok && json(t1605.refusal) === json({ reason: "audience_moved", freshCount: 1605, confirmedCount: 1604, population: "book" })
      && same.ok && same.shrunkBy === 0
      && said(swapped) === "members_changed" && said(fewer) === "members_changed" && said(nobody) === "members_changed"
      && !more.ok && json(more.refusal) === json({ reason: "audience_moved", freshCount: 4, confirmedCount: 3, population: "book" })
      && said(otherDraft) === "members_changed" && said(unnamed) === "members_unverified"
      && said(corrupt) === "confirmation_unreadable" && said(missing) === "confirmation_unreadable";
    const show = (c: StartCheck): string => (c.ok ? `START shrunkBy ${c.shrunkBy}` : json(c.refusal));
    return [holds, `typed 1,604 ${show(t1604)} · 1,600 ${show(t1600)} · 1,605 ${show(t1605)} · listed same ${show(same)} · swapped ${show(swapped)} · fewer ${show(fewer)} · nobody ${show(nobody)} · more ${show(more)} · another draft's key ${show(otherDraft)} · unnamed ${show(unnamed)} · corrupt key ${show(corrupt)} · no key ${show(missing)}`];
  });

  /* ── F5 · the Start sentences, money only for a money reader ── */
  await claim(ok, L.f5, async () => {
    const misses: string[] = [];
    for (const r of EVERY_START_REFUSAL) {
      const words = START_WORDS[r.reason];
      const growth = impl.sentence(r, READER);
      const money = impl.sentence(r, MONEY_READER);
      if (!words) { misses.push(`${r.reason}: no words to hold it to`); continue; }
      if (growth !== words[0]) misses.push(`${r.reason} (growth): "${growth}"`);
      if (money !== words[1]) misses.push(`${r.reason} (money): "${money}"`);
      if (growth.includes("TZS") || MONEY_FIGURES.some((f) => growth.includes(f))) misses.push(`${r.reason}: growth told money`);
      if (r.reason !== "not_confirmed" && (!growth.includes("Nothing was sent.") || !money.includes("Nothing was sent."))) misses.push(`${r.reason}: no Nothing was sent`);
    }
    const told = impl.sentence(OVER, MONEY_READER) + " " + impl.sentence(LOW, MONEY_READER);
    const control = ["TZS 10,800", "TZS 10,000", "TZS 24,000", "TZS 9,624", "TZS 20,000"].every((f) => told.includes(f));
    return [misses.length === 0 && control, misses.length ? misses.join(" | ") : `${EVERY_START_REFUSAL.length} refusals, each in its words; a money reader is told the figures`];
  });

  /* ── F6 · Resume prices only what is left, and never skips its reads ── */
  await claim(ok, L.f6, async () => {
    const at = (tzs: number, over: Partial<World> = {}): World => withW({ row: paused(), balance: credit(tzs), ...over });
    const r604 = await resumeIn(impl, at(24_000), LEFT_604);
    const r1000 = await resumeIn(impl, at(24_000), rows({ PENDING: 1000, SENT: 604 }));
    const r0 = await resumeIn(impl, at(24_000), rows({ SENT: 1604 }));
    const r0low = await resumeIn(impl, at(15_000), rows({ SENT: 1604 }));
    const r0closed = await resumeIn(impl, at(24_000, { live: CLOSED }), rows({ SENT: 1604 }));
    const unread = await resumeIn(impl, at(24_000, { balance: UNANSWERED }), LEFT_604);
    const closed = await resumeIn(impl, at(24_000, { live: CLOSED }), LEFT_604);
    const dead = await resumeIn(impl, at(24_000, { rail: "keys-not-set" }), LEFT_604);
    const whole = creditVerdict({ balance: { kind: "live", tzs: 24_000, at: NOW }, costTzs: 9_624, reserveTzs: 20_000 });
    const throwsOn = async (counts: unknown): Promise<boolean> => {
      try {
        await impl.resume(paused(), counts as SmsCampaignRecipientStatusCounts, impl.deps(depsOf(at(24_000), blank())));
        return false;
      } catch {
        return true;
      }
    };
    const badCounts = [rows({ PENDING: -1 }), rows({ PENDING: 1.5 }), { PENDING: 604 }, null];
    const throwsBad = (await Promise.all(badCounts.map(throwsOn))).every(Boolean);
    const fences = [r604, r1000, r0, r0low, r0closed, unread, closed, dead].reduce((n, r) => n + r.calls.fence, 0);
    const holds = r604.refusal === null && !whole.ok
      && json(r1000.refusal) === json({ reason: "credit_low", balanceTzs: 24_000, costTzs: 6_000, reserveTzs: 20_000 })
      // ⭐ nothing owed resumes with nothing priced and no credit read, whatever the credit (U49a's re-review)
      && [r0, r0low].every((x) => x.refusal === null && x.calls.settings === 0 && x.calls.cost === 0 && x.calls.balance === 0 && x.calls.switch === 1)
      // ... and only AFTER ② the switch and ③ the rail: switched off, it is switch_closed
      && r0closed.refusal?.reason === "switch_closed" && r0closed.calls.balance === 0
      && unread.refusal?.reason === "credit_unreadable" && closed.refusal?.reason === "switch_closed" && dead.refusal?.reason === "rail_dead"
      && fences === 0 && throwsBad;
    return [holds, `604 owed → ${resumed(r604.refusal)} (the whole: ${whole.ok ? "ok" : whole.reason}) · 1,000 → ${json(r1000.refusal)} · nothing owed at 24,000 → ${resumed(r0.refusal)} with ${r0.calls.settings} settings and ${r0.calls.balance} credit reads · at 15,000 → ${resumed(r0low.refusal)} with ${r0low.calls.balance} credit reads · nothing owed, switched off → ${resumed(r0closed.refusal)} · unreadable → ${resumed(unread.refusal)} · switch off → ${resumed(closed.refusal)} · no keys → ${resumed(dead.refusal)} · fences ${fences} · bad counts throw ${throwsBad}`];
  });

  /* ── F7 · the stub and the provider ── */
  await claim(ok, L.f7, async () => {
    const UNAVAILABLE: SmsBalanceRead = { tzs: null, at: null, outcome: "unavailable", stale: false, error: null };
    const stub = await startIn(impl, withW({ provider: "console", live: CLOSED, balance: UNAVAILABLE }));
    const stubResume = await resumeIn(impl, withW({ row: paused(), provider: "console", live: CLOSED, balance: "throws" }), LEFT_604);
    const unknownRail = await startIn(impl, withW({ provider: "unrecognised", live: CLOSED, rail: "provider-unrecognised" }));
    const unknownSilent = await startIn(impl, withW({ provider: "unrecognised", live: OPEN, rail: null }));
    const carrierClosed = await startIn(impl, withW({ live: CLOSED }));
    const RAIL = json({ reason: "rail_dead", rail: "provider-unrecognised" });
    const holds = stub.check.ok && stub.calls.balance === 0
      && stubResume.refusal === null && stubResume.calls.balance === 0
      && !unknownRail.check.ok && json(unknownRail.check.refusal) === RAIL
      && !unknownSilent.check.ok && json(unknownSilent.check.refusal) === RAIL
      && said(carrierClosed.check) === "switch_closed";
    return [holds, `stub → ${said(stub.check)} (${stub.calls.balance} credit reads), resume → ${resumed(stubResume.refusal)} · unrecognised → ${unknownRail.check.ok ? "START" : json(unknownRail.check.refusal)}, with a silent rail reader → ${unknownSilent.check.ok ? "START" : json(unknownSilent.check.refusal)} · Blackball, switch off → ${said(carrierClosed.check)}`];
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
    // (b) a reserve that cannot be read — not read at all, or not a figure above 0: no coverage, said in words.
    const unread = await impl.loadEstimate("ADMIN", AUD, { ...MONEY_DEPS, reserveTzs: () => null });
    const noCoverage = (inputs: EstimateInputs): string | null => {
      const e = impl.estimate(inputs, [SW1]);
      const m = e.money;
      const covers = impl.view(e, NOW).tiles.find((t) => t.key === "covers");
      const right = m !== null && m.reserveTzs === null && m.spendableTzs === null && m.covers === null && m.shortByTzs === null
        && covers?.value === "—" && covers.note === COVERS_UNREAD;
      return right ? null : `reserve ${json(m?.reserveTzs)} covers ${json(covers ?? null)}`;
    };
    const withReserve = (r: number): EstimateInputs =>
      ({ audience: AUD, pace: null, money: { cost: { kind: "configured", tzsPerSegment: PRICE }, balance: { kind: "live", tzs: 40_000, at: NOW }, reserveTzs: r } });
    const bad = [
      ["null", noCoverage(unread)], ["NaN", noCoverage(withReserve(Number.NaN))], ["negative", noCoverage(withReserve(-5))], ["0", noCoverage(withReserve(0))],
    ].filter(([, why]) => why !== null);
    // (c) a reserve that is a figure: coverage, said in the words of the credit kept for login AND withdrawal codes.
    const good = impl.view(impl.estimate(withReserve(KEPT), [SW1]), NOW).tiles.find((t) => t.key === "covers");
    const goodWords = good?.value === "Everyone" && (good.note ?? "").endsWith("kept for login and withdrawal codes");
    // (d) the source: the settings' figure, fresh, or nothing — and no platform floor anywhere in the file.
    const src = impl.sources.estimate;
    const sourceRight = src.includes("reserveTzs: async () => {")
      && src.includes("return kept.ok && kept.readable ? kept.settings.codesReserveTzs : null;") && !src.includes("smsBalanceThresholds");
    const holds = reserved === recorded && recorded !== floor && recorded !== cur.settings.pricePerSegmentTzs
      && bad.length === 0 && goodWords && sourceRight;
    return [holds, `the record keeps ${recorded} · the estimate reserves ${reserved} (the platform floor is ${floor}) · unreadable reserves: ${bad.length === 0 ? "no coverage, said why" : json(bad)} · a good reserve: ${json(good ?? null)} · source ${sourceRight ? "right" : "WRONG"}`];
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
      spendable: d.spendable === spendableBalance,
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

  /* ── F11 · a count that fails is retryable ── */
  await claim(ok, L.f11, async () => {
    const threw = (await startIn(impl, withW({ audience: "throws" }))).check;
    const notACount = (await startIn(impl, withW({ audience: { count: Number.NaN, keys: KEYS6 } }))).check;
    const badFilter = (await startIn(impl, withW({ row: confirmed({ audienceFilter: "{not json" }) }))).check;
    const words = impl.sentence({ reason: "audience_uncounted" }, READER);
    const retryable = words.includes("Try again in a minute") && !/confirm a new copy/i.test(words);
    const holds = said(threw) === "audience_uncounted" && said(notACount) === "audience_uncounted" && said(badFilter) === "audience_unreadable" && retryable;
    return [holds, `a fence that throws → ${said(threw)} · a count that is not one → ${said(notACount)} · a filter that is not JSON → ${said(badFilter)} · "${words}"`];
  });

  /* ── F12 · Resume before the list finished ── */
  await claim(ok, L.f12, async () => {
    const early = (tzs: number, over: Partial<StoredSmsCampaign> = {}): World => withW({ row: pausedEarly(over), balance: credit(tzs) });
    const WHOLE = json({ reason: "credit_low", balanceTzs: 24_000, costTzs: 9_624, reserveTzs: 20_000 });
    const none = await resumeIn(impl, early(24_000), rows());
    const some = await resumeIn(impl, early(24_000), rows({ PENDING: 600 }));
    const topped = await resumeIn(impl, early(40_000), rows({ PENDING: 600 }));
    const noCount = await resumeIn(impl, early(40_000, { audienceCount: null }), rows());
    const finishedNoCount = await resumeIn(impl, withW({ row: paused({ audienceCount: null }), balance: credit(40_000) }), LEFT_604);
    const defs = [
      SC.resumeOutstanding(pausedEarly(), rows()), SC.resumeOutstanding(pausedEarly(), rows({ PENDING: 600 })),
      SC.resumeOutstanding(pausedEarly(), rows({ PENDING: 590, SENT: 10 })), SC.resumeOutstanding(paused(), LEFT_604),
      SC.resumeOutstanding(pausedEarly({ audienceCount: null }), rows()),
    ];
    const holds = json(none.refusal) === WHOLE && json(some.refusal) === WHOLE && topped.refusal === null
      && noCount.refusal?.reason === "confirmation_unreadable"
      && finishedNoCount.refusal?.reason === "confirmation_unreadable" && nothingRead(finishedNoCount.calls)
      && json(defs) === json([1604, 1604, 1594, 604, null]);
    return [holds, `0 written → ${json(none.refusal)} · 600 written → ${json(some.refusal)} · at TZS 40,000 → ${resumed(topped.refusal)} · no confirmed count → ${resumed(noCount.refusal)} · finished, no confirmed count → ${resumed(finishedNoCount.refusal)}${nothingRead(finishedNoCount.calls) ? "" : " (read)"} · resumeOutstanding ${json(defs)}`];
  });

  /* ── F13 · Resume's own reasons and words ── */
  await claim(ok, L.f13, async () => {
    const sizes = await resumeIn(impl, withW({ row: paused({ segmentsSw: 0 }), balance: credit(40_000) }), LEFT_604);
    const misses: string[] = [];
    for (const r of EVERY_RESUME_REFUSAL) {
      const key = wordsKeyOf(r);
      const words = RESUME_WORDS[key];
      const growth = impl.resumeSentence(r, READER);
      const money = impl.resumeSentence(r, MONEY_READER);
      if (!words) { misses.push(`${key}: no words to hold it to`); continue; }
      if (growth !== words[0]) misses.push(`${key} (growth): "${growth}"`);
      if (money !== words[1]) misses.push(`${key} (money): "${money}"`);
      for (const s of [growth, money]) {
        if (/start|narrow|Nothing was sent/i.test(s) || !s.endsWith("Nobody more was messaged.")) misses.push(`${key}: "${s}"`);
        // ⛔ Once anyone was messaged, a copy is never prescribed as if it reached nobody twice (U42's re-review).
        if (key.endsWith("+reached") && (!/again/.test(s) || /Stop it and confirm a new copy/.test(s))) misses.push(`${key}: a copy prescribed — "${s}"`);
      }
      if (growth.includes("TZS") || MONEY_FIGURES.some((f) => growth.includes(f))) misses.push(`${key}: growth told money`);
    }
    const told = impl.resumeSentence(RESUME_LOW, MONEY_READER);
    const control = ["TZS 24,000", "TZS 9,624", "TZS 20,000"].every((f) => told.includes(f));
    const holds = sizes.refusal?.reason === "sizes_unreadable" && misses.length === 0 && control;
    return [holds, `unreadable sizes → ${resumed(sizes.refusal)} · ${misses.length ? misses.join(" | ") : `${EVERY_RESUME_REFUSAL.length} refusals in their own words`}`];
  });

  /* ── F14 · OD66: no both-arms count for a viewer who may not read numbers ── */
  await claim(ok, L.f14, async () => {
    const grown = async (audienceFilter: string): Promise<StartCheck> =>
      (await startIn(impl, withW({ row: confirmed({ audienceFilter }), audience: { count: 1610, keys: KEYS6 } }))).check;
    const onBoth = await grown(BOTH);
    const onBook = await grown(BOOK);
    const onPlayers = await grown(PLAYERS);
    const populations = [onBoth, onBook, onPlayers].map((c) => (!c.ok && c.refusal.reason === "audience_moved" ? c.refusal.population : said(c)));
    const sentenceOf = (c: StartCheck, v: RefusalViewer): string => (c.ok ? "START" : impl.sentence(c.refusal, v));
    const masked = { both: sentenceOf(onBoth, MASKED), book: sentenceOf(onBook, MASKED), players: sentenceOf(onPlayers, MASKED) };
    const reader = sentenceOf(onBoth, READER);
    const holds = json(populations) === json(["both", "book", "players"])
      && masked.both === MOVED_WITHOUT_FIGURES && !/[0-9]/.test(masked.both)
      && reader === START_WORDS.audience_moved[0] && masked.book === START_WORDS.audience_moved[0] && masked.players === START_WORDS.audience_moved[0];
    return [holds, `populations ${json(populations)} · masked on both: "${masked.both}" · reader on both: "${reader}" · masked on the book: "${masked.book}"`];
  });

  /* ── F15 · OD63: settings never priced from their defaults ── */
  await claim(ok, L.f15, async () => {
    const control = await startIn(impl, W0());
    const startOn = async (settings: World["settings"]) => startIn(impl, withW({ settings }));
    const resumeOn = async (settings: World["settings"]) => resumeIn(impl, withW({ row: paused(), settings, balance: credit(40_000) }), LEFT_604);
    const starts = [await startOn(SETTINGS_DOWN), await startOn("throws"), await startOn(SETTINGS_HALF)];
    const resumes = [await resumeOn(SETTINGS_DOWN), await resumeOn("throws"), await resumeOn(SETTINGS_HALF)];
    const WANT = ["settings_unreadable", "settings_unreadable", "settings_incomplete"];
    const unpriced = [...starts, ...resumes].every((x) => x.calls.cost === 0 && x.calls.balance === 0);
    const retry = impl.sentence({ reason: "settings_unreadable" }, READER);
    const repair = impl.sentence({ reason: "settings_incomplete" }, READER);
    const honest = /try again/i.test(retry) && !/try again/i.test(repair) && repair.includes("developer");
    const holds = control.check.ok && json(starts.map((x) => said(x.check))) === json(WANT)
      && json(resumes.map((x) => resumed(x.refusal))) === json(WANT) && unpriced && honest;
    return [holds, `the defaults' world → ${said(control.check)} · Start ${json(starts.map((x) => said(x.check)))} · Resume ${json(resumes.map((x) => resumed(x.refusal)))} · never priced ${unpriced} · "${repair}"`];
  });

  /* ── F16 · Resume refuses what only a new copy can fix (U42's review, §4.15 decision 1 as amended) ── */
  await claim(ok, L.f16, async () => {
    /** 1,605 rows on a list of 1,604 confirmed — a list longer than confirmed. */
    const OVER_LIST = rows({ PENDING: 605, SENT: 1000 });
    const at = (row: Partial<StoredSmsCampaign>, over: Partial<World> = {}): World => withW({ row: paused(row), balance: credit(40_000), ...over });
    const longer = [
      await resumeIn(impl, at({ stopReason: "officer_paused" }), OVER_LIST),
      await resumeIn(impl, at({ stopReason: null }), OVER_LIST),
      await resumeIn(impl, at({ stopReason: "credit_unreadable" }), OVER_LIST),
      await resumeIn(impl, at({ stopReason: "officer_paused" }, { live: CLOSED }), OVER_LIST),
      await resumeIn(impl, at({ stopReason: "officer_paused" }, { provider: "console", live: CLOSED }), OVER_LIST),
    ];
    // ⭐ 1,000 of them already SENT: the refusal says so (reached), so its words never prescribe a copy as if it reached nobody
    const longerOk = longer.every((x) => json(x.refusal) === json({ reason: "list_over_confirmed", reached: true }) && nothingRead(x.calls));
    // ... and with nothing handed over yet (all 1,605 PENDING), reached is false
    const unsent = await resumeIn(impl, at({ stopReason: "officer_paused" }), rows({ PENDING: 1605 }));
    const unsentOk = json(unsent.refusal) === json({ reason: "list_over_confirmed", reached: false }) && nothingRead(unsent.calls);
    const ENQUEUE_REASONS = ["audience_moved", "audience_unreadable", "list_over_confirmed", "list_over_confirmed_sending"];
    const paused4: Array<{ refusal: ResumeRefusal | null; calls: Calls }> = [];
    for (const stopReason of ENQUEUE_REASONS) paused4.push(await resumeIn(impl, at({ stopReason }), LEFT_604));
    const reasonsOk = json(paused4.map((x) => x.refusal)) === json(["audience_moved", "audience_unreadable", "list_over_confirmed", "list_over_confirmed"].map((reason) => ({ reason, reached: true })))
      && paused4.every((x) => nothingRead(x.calls));
    // The enqueue paused it before a row was written (the list unfinished, nobody handed over): reached is false
    const early = await resumeIn(impl, at({ stopReason: "audience_moved", enqueuedAt: null }), rows());
    const earlyOk = json(early.refusal) === json({ reason: "audience_moved", reached: false }) && nothingRead(early.calls);
    const control = await resumeIn(impl, at({ stopReason: "officer_paused" }), LEFT_604);
    const holds = longerOk && unsentOk && reasonsOk && earlyOk && control.refusal === null;
    const shown = (x: { refusal: ResumeRefusal | null; calls: Calls }): string => `${json(x.refusal)}${nothingRead(x.calls) ? "" : " (read)"}`;
    return [holds, `1,605 of 1,604 → ${longer.map(shown).join(", ")} · none handed over → ${shown(unsent)} · the enqueue's reasons → ${paused4.map(shown).join(", ")} · paused before a row was written → ${shown(early)} · an officer's pause within its count → ${resumed(control.refusal)}`];
  });

  /* ── F17 · ⭐ F-2 · a send reply's pending segments come off first, at Start and at Resume (the engine's dry-fire) ── */
  await claim(ok, L.f17, async () => {
    /** A send reply's figure, as the snapshot keeps it: pre-charge, with the segments it has not yet taken off. */
    const replied = (tzs: number, pendingSegments: number): SmsBalanceRead => ({ ...credit(tzs), outcome: "reused", pendingSegments });
    const s1800 = (await startIn(impl, withW({ balance: replied(40_000, 1_800) }))).check;
    const s0 = (await startIn(impl, withW({ balance: replied(40_000, 0) }))).check;
    const s1729 = (await startIn(impl, withW({ balance: replied(40_000, 1_729) }))).check;
    const s1730 = (await startIn(impl, withW({ balance: replied(40_000, 1_730) }))).check;
    const at = (pending: number): World => withW({ row: paused(), balance: replied(24_000, pending) });
    const r62 = await resumeIn(impl, at(62), LEFT_604);
    const r63 = await resumeIn(impl, at(63), LEFT_604);
    // ⭐ the review's MINOR-5 (Mutant G) · the pending are priced at TODAY's price — a measured TZS 8 here, never a fixed 6
    const MEASURED_8: SegmentCostMeasure = { kind: "measured", tzsPerSegment: 8, sends: 12, pairs: 6, spread: { min: 8, max: 8 }, since: new Date(NOW - 24 * HOUR).toISOString() };
    const at8 = (pending: number): World => withW({ row: paused(), balance: replied(30_000, pending), cost: MEASURED_8 });
    const m646 = await resumeIn(impl, at8(646), LEFT_604);
    const m647 = await resumeIn(impl, at8(647), LEFT_604);
    const startOk = !s1800.ok && json(s1800.refusal) === json({ reason: "credit_low", balanceTzs: 29_200, costTzs: 9_624, reserveTzs: 20_000 })
      && s0.ok && s1729.ok && !s1730.ok && s1730.refusal.reason === "credit_low";
    const resumeOk = r62.refusal === null && json(r63.refusal) === json({ reason: "credit_low", balanceTzs: 23_622, costTzs: 3_624, reserveTzs: 20_000 })
      && m646.refusal === null && json(m647.refusal) === json({ reason: "credit_low", balanceTzs: 24_824, costTzs: 4_832, reserveTzs: 20_000 });
    return [startOk && resumeOk,
      `40,000 with 1,800 pending → ${s1800.ok ? "START" : json(s1800.refusal)} · none pending → ${said(s0)} · 1,729 → ${said(s1729)} · 1,730 → ${said(s1730)} · Resume, 604 owed at 24,000: 62 pending → ${resumed(r62.refusal)} · 63 → ${json(r63.refusal)} · at a measured TZS 8 and 30,000: 646 → ${resumed(m646.refusal)} · 647 → ${json(m647.refusal)}`];
  });
}

/* ══ THE PLANTS — each a defect this unit could really ship, planted in memory ════════════════════════════════════ */

/** A source string with one anchor replaced — the plant fails to build (and says so) when the anchor is not found once. */
const plantIn = (src: string, from: string, to: string): string => {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`the plant's anchor is found ${n} times, not once: ${from.slice(0, 60)}`);
  return src.split(from).join(to);
};

/** Start, with one refusal answered as another — the shape of every "told the wrong thing" plant below. */
const startSaying = (from: StartRefusal["reason"], to: StartRefusal, when: (c: StoredSmsCampaign) => boolean = () => true) =>
  async (c: StoredSmsCampaign, d: StartCheckDeps): Promise<StartCheck> => {
    const r = await SC.checkStart(c, d);
    return !r.ok && r.refusal.reason === from && when(c) ? { ok: false, refusal: to } : r;
  };

/** A reserve that is not a figure above 0, turned into a sliver of one: coverage computed as if nothing were kept. */
const SLIVER = Number.MIN_VALUE;
const isUsableReserve = (r: number | null): boolean => typeof r === "number" && Number.isFinite(r) && r > 0;

export const F_PLANTS: ReadonlyArray<EnginePlant<FImpl>> = [
  {
    name: "R-F2 (the plan's RED) · the credit check skipped at Start",
    expect: [L.f1, L.f2, L.f3, L.f17],
    impl: () => ({ start: (c, d) => SC.checkStart(c, { ...d, credit: () => ({ ok: true }) }) }),
  },
  {
    name: "R-F2d · Start priced from the confirmation's frozen estimate, not today's price",
    expect: [L.f1, L.f2, L.f17],
    impl: () => ({
      start: (c, d) => SC.checkStart(c, {
        ...d,
        cost: async () => ({ kind: "configured", tzsPerSegment: (c.estimateTzs ?? 0) / Math.max(1, c.estimateSegments ?? 1) }),
      }),
    }),
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
    // F15 sees the same defect from its side: a credit read made before settings that could not be read refused Start.
    name: "R-F1 · the credit read before the switch and the rail (a closed switch answered as a credit problem)",
    expect: [L.f1, L.f15],
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
    // ⭐ The owner's ruling of 2026-10-09 undone: ④ back, refusing a campaign that can reach the contact book while its
    // message carries no source line — F1's book fixtures, which now START, are refused again.
    name: "R-F1b · E18 put back at Start (a book campaign with no source line refused needs_source_line)",
    expect: [L.f1],
    impl: () => ({
      start: async (c, d) => {
        const read = readCampaignAudience(c.audienceFilter);
        const blank = (typeof c.sourcePhrase === "string" ? c.sourcePhrase.trim() : "") === "";
        if (c.status === "CONFIRMED" && read.ok && read.filter.population !== "players" && blank) {
          return { ok: false, refusal: { reason: "needs_source_line" } as unknown as StartRefusal };
        }
        return SC.checkStart(c, d);
      },
    }),
  },
  {
    name: "R-F1c · a confirmation that cannot be read whole answered “Only a confirmed campaign can start”",
    expect: [L.f1, L.f4],
    impl: () => ({ start: startSaying("confirmation_unreadable", { reason: "not_confirmed" }) }),
  },
  {
    name: "R-F4b · the members key at Start keyed for another draft than the confirmed row's own",
    expect: [L.f4],
    impl: () => ({ deps: (d) => ({ ...d, fence: (c) => d.fence({ ...c, draftRevision: c.draftRevision + 1 }) }) }),
  },
  {
    name: "R-F4c · a corrupt list watermark taken on trust and told “the people changed”",
    expect: [L.f1, L.f4],
    impl: () => ({
      start: (c, d) => SC.checkStart(c.confirmTier === "ENUMERATE" && !/^[0-9a-f]{32}$/.test(c.audienceWatermark ?? "")
        ? { ...c, audienceWatermark: "0".repeat(32) }
        : c, d),
    }),
  },
  {
    name: "R-F4d · a list the walk could not name told “the people changed”",
    expect: [L.f1, L.f4],
    impl: () => ({ start: startSaying("members_unverified", { reason: "members_changed" }) }),
  },
  {
    name: "R-F3 · an unreadable credit taken as affordable (fail open)",
    expect: [L.f1, L.f3, L.f6],
    impl: () => ({ deps: (d) => ({ ...d, credit: (a) => (a.balance.kind === "live" ? creditVerdict(a) : { ok: true }) }) }),
  },
  {
    name: "R-F3b · creditVerdict takes a reserve of 0 as a figure (nothing kept for codes)",
    expect: [L.f3],
    impl: () => ({ credit: (a) => creditVerdict(a.reserveTzs === 0 ? { ...a, reserveTzs: SLIVER } : a) }),
  },
  {
    name: "R-F2c · the credit line read as at-or-below (landing on the line refused)",
    expect: [L.f2, L.f17],
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
    impl: () => ({ sentence: (r, v) => SC.startRefusalSentence(r, { ...v, money: true }) }),
  },
  {
    // It also hands Resume a count of its own, so a list longer than confirmed is never seen (F16).
    name: "R-F6 · Resume prices the whole campaign, not the rows still owed a message",
    expect: [L.f6, L.f16, L.f17],
    impl: () => ({ resume: (c, counts, d) => SC.resumeRefusal(c, rows({ PENDING: c.audienceCount ?? outstandingOf(counts) }), d) }),
  },
  {
    // One settled row counted as owed whenever nothing is: TZS 6 priced and checked against the line — at TZS 15,000 a
    // campaign with nothing left to send is told to top up, and every nothing-owed Resume reads the settings and the credit.
    name: "R-F6c · nothing owed still priced and checked against the credit line (a refusal 'up to TZS 6 … Top up' for nothing to send)",
    expect: [L.f6],
    impl: () => ({
      resume: (c, counts, d) =>
        SC.resumeRefusal(c, SC.resumeOutstanding(c, counts) === 0 ? { ...counts, SENT: counts.SENT - 1, PENDING: counts.PENDING + 1 } : counts, d),
    }),
  },
  {
    // (R-F6b's old shortcut, kept for what it still breaks: the switch and the rail are asked before nothing-left resumes.)
    name: "R-F6d · nothing owed resumes before the switch and the rail are asked (switched off, it resumes anyway)",
    expect: [L.f6],
    impl: () => ({ resume: async (c, counts, d) => (SC.resumeOutstanding(c, counts) === 0 ? null : SC.resumeRefusal(c, counts, d)) }),
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
    name: "R-F8b · a reserve that could not be read counted as kept-nothing (the codes' credit offered to the campaign)",
    expect: [L.f8],
    impl: () => ({
      estimate: (i, v) => campaignEstimate(i.money && i.money.reserveTzs === null ? { ...i, money: { ...i.money, reserveTzs: SLIVER } } : i, v),
    }),
  },
  {
    name: "R-F8c · a NaN, negative or 0 reserve turned into a reserve instead of unreadable",
    expect: [L.f8],
    impl: () => ({
      estimate: (i, v) => campaignEstimate(i.money && i.money.reserveTzs !== null && !isUsableReserve(i.money.reserveTzs)
        ? { ...i, money: { ...i.money, reserveTzs: SLIVER } }
        : i, v),
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
    name: "R-F10c · Start's shipped check takes a send reply's figure whole (the pending-segment rule not wired)",
    expect: [L.f10],
    impl: () => ({ shipped: Object.freeze({ ...SC.START_CHECK_DEPS, spendable: (fig: BalanceFigure) => fig }) }),
  },
  {
    name: "R-F17 · Start and Resume take a send reply's pre-charge figure whole (F-2 — its pending segments never priced)",
    expect: [L.f17],
    impl: () => ({ deps: (d) => ({ ...d, spendable: (fig) => fig }) }),
  },
  {
    name: "R-F10b · credit-guard.ts imports a server module",
    expect: [L.f10],
    impl: () => ({ sources: { ...REAL_SOURCES, creditGuard: `${REAL_SOURCES.creditGuard}${NL}import { db } from "@/lib/server/store";${NL}void db;` } }),
  },
  {
    name: "R-F11 · a count that failed answered “the saved audience can't be read any more — confirm a new copy”",
    expect: [L.f1, L.f11],
    impl: () => ({ start: startSaying("audience_uncounted", { reason: "audience_unreadable" }) }),
  },
  {
    name: "R-F12 · Resume before the list finished prices only the rows written (0 of 1,604 resumes for nothing)",
    expect: [L.f12],
    impl: () => ({ resume: (c, counts, d) => SC.resumeRefusal({ ...c, enqueuedAt: c.enqueuedAt ?? iso(NOW) }, counts, d) }),
  },
  {
    // The list's own length stands in for the count that was lost — the very length the count is there to judge.
    name: "R-F12b · a finished list with no confirmed count resumes, the list's own length taken as what was confirmed",
    expect: [L.f12],
    impl: () => ({
      resume: (c, counts, d) =>
        SC.resumeRefusal(c.audienceCount === null && typeof c.enqueuedAt === "string" ? { ...c, audienceCount: rowsIn(counts) } : c, counts, d),
    }),
  },
  {
    name: "R-F13 · Resume borrows Start's sentences (“Starting would leave…”, “narrow the audience”)",
    expect: [L.f13],
    impl: () => ({ resumeSentence: (r, v) => SC.startRefusalSentence(r as unknown as StartRefusal, v) }),
  },
  {
    name: "R-F13c · the words drop reached — people already messaged told to “Stop it and confirm a new copy” (a copy messages them again)",
    expect: [L.f13],
    impl: () => ({ resumeSentence: (r, v) => SC.resumeRefusalSentence("reached" in r ? { ...r, reached: false } : r, v) }),
  },
  {
    name: "R-F13b · unreadable message sizes answered price_unknown (“the owner sets it”, which the owner cannot fix)",
    expect: [L.f13],
    impl: () => ({
      resume: async (c, counts, d) => {
        const r = await SC.resumeRefusal(c, counts, d);
        return r?.reason === "sizes_unreadable" ? { reason: "price_unknown" } : r;
      },
    }),
  },
  {
    name: "R-F14 · a viewer who may not read numbers is told a book ∪ players count (OD66)",
    expect: [L.f14],
    impl: () => ({ sentence: (r, v) => SC.startRefusalSentence(r, { ...v, reads: true }) }),
  },
  {
    name: "R-F15 · settings that cannot be read priced from their defaults (OD63, fail open)",
    expect: [L.f1, L.f15],
    impl: () => ({
      deps: (d) => ({
        ...d,
        settings: async () => {
          let r: SettingsReload;
          try {
            r = await d.settings();
          } catch {
            r = { ok: false, error: "threw" };
          }
          return r.ok && r.readable ? r : { ok: true, settings: { ...MARKETING_SMS_SETTINGS_DEFAULTS }, stored: false, readable: true };
        },
      }),
    }),
  },
  {
    name: "R-F15b · a record that cannot be read in full told “try again in a moment”",
    expect: [L.f1, L.f15],
    impl: () => ({
      start: startSaying("settings_incomplete", { reason: "settings_unreadable" }),
      resume: async (c, counts, d) => {
        const r = await SC.resumeRefusal(c, counts, d);
        return r?.reason === "settings_incomplete" ? { reason: "settings_unreadable" } : r;
      },
    }),
  },
  {
    // An officer's Pause landed before the enqueue's own: Resume reads only the stop reason, never the list's length.
    name: "R-F16 · Resume blind to the list's length — a list longer than confirmed, paused by an officer, resumes",
    expect: [L.f16],
    impl: () => ({ resume: (c, counts, d) => SC.resumeRefusal(c, clippedTo(counts, c.audienceCount), d) }),
  },
  {
    name: "R-F16b · Resume blind to the enqueue's stop reasons — a campaign paused audience_moved resumes",
    expect: [L.f16],
    impl: () => ({
      resume: (c, counts, d) => SC.resumeRefusal(COPY_ONLY_STOPS.includes(c.stopReason ?? "") ? { ...c, stopReason: "officer_paused" } : c, counts, d),
    }),
  },
  {
    // Asked last, the refusal hides behind whatever is read first: a closed switch says "switch them on, then you can resume".
    name: "R-F16c · what only a new copy can fix asked AFTER the reads — a closed switch answers first",
    expect: [L.f16],
    impl: () => ({
      resume: async (c, counts, d) => {
        const r = await SC.resumeRefusal({ ...c, stopReason: null }, clippedTo(counts, c.audienceCount), d);
        return r ?? SC.copyOnlyRefusal(c, counts);
      },
    }),
  },
  {
    name: "R-F16d · the refusal forgets who was already messaged (reached always false — the words would prescribe a copy)",
    expect: [L.f16],
    impl: () => ({
      resume: async (c, counts, d) => {
        const r = await SC.resumeRefusal(c, counts, d);
        return r !== null && "reached" in r ? { ...r, reached: false } : r;
      },
    }),
  },
];

/** PENDING + HELD, for a plant that needs a figure when the row has no confirmed count. */
function outstandingOf(counts: SmsCampaignRecipientStatusCounts): number {
  return counts.PENDING + counts.HELD;
}

/** Every row the list holds, whatever its status (R-F12b). */
function rowsIn(counts: SmsCampaignRecipientStatusCounts): number {
  return Object.values(counts).reduce((n: number, x) => n + (typeof x === "number" ? x : 0), 0);
}

/** The stop reasons the enqueue (U42) pauses a campaign for — what R-F16b hides. */
const COPY_ONLY_STOPS = ["audience_moved", "audience_unreadable", "list_over_confirmed", "list_over_confirmed_sending"];

/** The counts with PENDING cut back until the list is no longer than `cap` — the list's length hidden (R-F16, R-F16c). Counts
 *  that are not a record of numbers are handed on as they are, so Resume still throws on them. */
function clippedTo(counts: SmsCampaignRecipientStatusCounts, cap: number | null): SmsCampaignRecipientStatusCounts {
  if (counts === null || typeof counts !== "object" || typeof cap !== "number") return counts;
  const total = Object.values(counts).reduce((n: number, x) => n + (typeof x === "number" ? x : 0), 0);
  const extra = total - cap;
  return extra > 0 && typeof counts.PENDING === "number" ? { ...counts, PENDING: Math.max(0, counts.PENDING - extra) } : counts;
}

/** ⭐ §F, as a host runs it. */
export const SECTION_F: EngineSection<FImpl> = {
  id: "F",
  title: "§F · U49a · the credit kept for codes, and the refusals at Start and at Resume",
  labels: Object.values(L),
  real: F_REAL,
  run: runSectionF,
  plants: F_PLANTS,
};
