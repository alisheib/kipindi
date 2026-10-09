/**
 * ⭐ U49a · THE ONE LIST OF START REFUSALS, AND RESUME'S — every reason a confirmed campaign may not start, or a paused one
 * may not send again, checked in ONE order and said in ONE sentence each (ENGINE-SPEC §4.12 decision 3 and its "as built"
 * note; E15 · E16 · E18 · E19 · OD28 · OD63 · OD65 · OD66).
 *
 * ⛔ NOTHING CALLS THIS YET. Its callers are U47b's Start (`checkStart`/`startRefusal` → `transition(CONFIRMED →
 * PREPARING)` → the started row) and Resume (`resumeRefusal` → the held rows re-queued → `transition(PAUSED → …)`), and
 * neither exists, so the module ships inert. ⛔ IT READS AND DECIDES — IT WRITES NOTHING: no transition, no audit row, no
 * recipient row, no token, no message. A refusal's own row (`marketing.campaign_start_refused`) is U47b's to write.
 *
 * ── START, IN ORDER — the cheap reads first, the walk last ──────────────────────────────────────────────────────────────
 *   ①  not_confirmed — the row is not CONFIRMED.
 *       confirmation_unreadable — it is, but its frozen confirmation cannot be read whole: the tier, the count, the
 *       segments, the budget, the saved sizes (the count × the largest saved variant must BE `estimateSegments`, as the
 *       confirmation froze them from one arithmetic) and, for a list confirmation, its 32-hex members key.
 *   ②  switch_closed — THE gate (`marketingLiveGate`): a real carrier needs the owner's switch open NOW. ⭐ The console
 *       stub passes it (no handset, no money — U47b's local drive starts a campaign on it). ⚠️ An unrecognised provider is
 *       not a closed switch — the gate can pass it whatever the switch says — so ③ names it.
 *   ③  rail_dead — `smsRailProblem`: no SMS can leave this server at all.
 *   ④  needs_source_line — E18: an audience that can reach the contact book (the book, or both) whose frozen message has no
 *       source line; a players-only campaign needs none. Judged on the stored filter, so a filter that cannot be read is
 *       ⑤'s.
 *   ⑤  audience_unreadable — the stored filter no longer reads at the campaign's door. ⛔ THE ONLY STEP THAT SAYS SO:
 *       "confirm a new copy" is a true remedy only for a filter that cannot be read.
 *   ⑥  settings_unreadable — the Marketing SMS settings re-read did not answer (or threw): try again.
 *       settings_incomplete — the stored record cannot be read in full (`readable: false`): a developer's repair, never
 *       "try again". ⛔ OD63: neither a configured price nor the credit kept for codes is ever taken from the defaults.
 *   ⑦  price_unknown — today's price is unknown: MEASURED from our own delivered sends, else the configured one, through the
 *       confirmation's own cost loader (`loadSegmentCost`). (With the settings read, a price is always configured, so this
 *       answers a cost loader that knows none — defence in depth, as in U40a.)
 *   ⑧  over_budget — E15: today's price × the frozen segments, through U39's ONE arithmetic (`campaignEstimate`, never
 *       rounded down), STRICTLY above the frozen `budgetTzs`; at it, the campaign starts. ⛔ Never the frozen `estimateTzs`:
 *       the price may have moved since the confirmation.
 *   ⑨  credit_unreadable · credit_low — E16: the credit read fresh (at most `START_CREDIT_MAX_AGE_MS` old, waited for — no
 *       render budget) and held to `creditVerdict` against that same projection and the credit kept for codes. It must be
 *       LIVE: anything else refuses (fail closed). ⭐ The console stub has no credit and spends none: not read.
 *   ⑩  OD28 (E19): the population counted fresh through the ONE fence (`audienceFence` — `campaignAudienceCount`, and the
 *       members key scoped `{ campaignId: row.id, draftRevision: row.draftRevision }`, the confirmed row's own id and frozen
 *       revision, so it names the draft the confirmation keyed) → `startAudienceVerdict`:
 *         audience_uncounted — the fence could not count (a read that failed, a count that is not one): RETRYABLE. The
 *           filter already read at ⑤, so a blip here is never told to confirm a new copy;
 *         audience_moved — more people than were confirmed;
 *         members_unverified — a list confirmation whose fresh walk could not name its people (the count and the walk
 *           disagree — somebody joined or left between the two reads — or a number that cannot be listed came in): never
 *           told "the members changed", which it cannot know;
 *         members_changed — a list confirmation whose people differ: a swap, fewer, nobody.
 *       The same or fewer go ahead, reporting how many fewer (`shrunkBy`).
 *
 * ── RESUME — what only a new copy can fix, ② · ③, then the credit for what is left ──────────────────────────────────────
 *   ⛔ FIRST, WITH NO READ:
 *     · confirmation_unreadable — a confirmed count that is not one, for ANY campaign (as Start reads it): the list's length
 *       cannot be judged against it (U49a's re-review closed the module's one fail-open path here).
 *     · WHAT ONLY A NEW COPY CAN FIX (U42's review; ENGINE-SPEC §4.15 decision 1 as amended, built at the U42 + U49a merge —
 *       `copyOnlyRefusal`): list_over_confirmed — a list LONGER than its confirmed count, read off the counts themselves and
 *       WHATEVER the stop reason (an officer's Pause can land before the enqueue's own, and a Resume of a list that already
 *       ran goes back to RUNNING and would send to the extra rows); then audience_moved · audience_unreadable ·
 *       list_over_confirmed — a campaign the enqueue PAUSED for one of its `EnqueuePauseReason`s, even with its list within
 *       its count. ⭐ Each carries `reached` — whether anyone on the list was already handed a message (SENT, DELIVERED,
 *       UNCONFIRMED): a copy has the same filter and nothing de-duplicates across campaigns, so it would message them
 *       AGAIN, and the sentence says so and leaves the choice honest (U42's re-review).
 *   Neither the switch nor the credit is read for them, so neither can hide them, and the console stub is refused them too.
 *   ⭐ WHAT IS LEFT (`resumeOutstanding` — the ONE definition; Resume takes the recipient COUNTS, so no caller can hand it
 *   another figure):
 *     · the list finished (`enqueuedAt` set): PENDING + HELD — the rows still owed a message;
 *     · the list never finished (`enqueuedAt` null — paused while PREPARING; Resume returns it to PREPARING, §3.1): the
 *       confirmed count (`audienceCount`) minus the rows already settled — everyone confirmed who has no answer yet,
 *       written or not. Never the rows written so far alone, which would price a 1,604-person campaign at nothing.
 *   Then ② · ③; then NOTHING LEFT (`resumeOutstanding` 0 — every row settled, say paused just after the last slice)
 *   resumes with no price and no credit read: the step finds nothing owed and finishes DONE, and a refusal "up to TZS 0 …
 *   Top up" would be false (U49a's re-review). Otherwise sizes_unreadable (the saved sizes cannot be read, so what is left
 *   cannot be priced) → ⑥ settings → ⑦ price → ⑨ the credit — nothing skipped while anything is left. The console stub
 *   has no credit and spends none: after ② · ③ it resumes.
 *
 * ── WHO MAY READ WHAT ───────────────────────────────────────────────────────────────────────────────────────────────────
 * ⛔ A REFUSAL OBJECT (`StartRefusal`, `ResumeRefusal`) CARRIES MONEY AND COUNT FIGURES FOR EVERY ROLE — for the caller's
 * audit row and decisions. ONLY THE SENTENCE FUNCTIONS MAY REACH A VIEWER: the object is never sent to a browser.
 * `startRefusalSentence` and `resumeRefusalSentence` take the viewer (`RefusalViewer`): `money` is the caller's
 * `campaignMoneyVisible`, `reads` is "the viewer's `identity.contact` cell is `read`". TZS and money figures only for
 * `money`; ⛔ OD66 · the count of a book ∪ players campaign (`audience_moved` on `pop=both`) only for `reads` — anyone else
 * reads that refusal without its figures, as the composer never counts both arms for them. A one-arm count is OD65's
 * count alone, said to every role.
 * Start's sentences end "Nothing was sent." where nothing was; Resume's end "Nobody more was messaged." — a paused campaign
 * may already have sent.
 *
 * ⛔ FAILS CLOSED, every way: a dependency that throws is the refusal of its own step (a switch that cannot be read is
 * closed, settings that cannot be read are unreadable, a credit that cannot be read is unreadable, a fence that cannot
 * count is an uncounted audience).
 *
 * Guard: `npm run test:marketing-engine` §F (F0–F16) · Red: `npm run red:marketing-engine` (in memory).
 */
import type { SmsCampaignRecipientStatusCounts, StoredSmsCampaign } from "@/lib/server/store";
import type { EnqueuePauseReason } from "@/lib/server/marketing/enqueue";
import { refreshSmsBalance, smsProviderResolution, smsRailProblem } from "@/lib/server/sms";
import type { SmsBalanceRead, SmsProviderResolution, SmsRailProblem } from "@/lib/server/sms";
import { marketingLiveGate, readMarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import type { MarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import { reloadMarketingSmsSettings } from "@/lib/server/marketing/sms-settings";
import type { SettingsReload } from "@/lib/server/marketing/sms-settings";
import { balanceFigureOf, loadSegmentCost } from "@/lib/server/marketing/estimate";
import { audienceFence, readCampaignAudience } from "@/lib/server/marketing/audience-fence";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { MEMBERS_KEY_HEX_CHARS, confirmTierFromColumn, startAudienceVerdict } from "@/lib/marketing/campaign-confirm";
import type { ConfirmTier } from "@/lib/marketing/campaign-confirm";
import { campaignEstimate, savedVariantSizes } from "@/lib/marketing/campaign-estimate";
import type { BalanceFigure, VariantSize } from "@/lib/marketing/campaign-estimate";
import {
  OUTSTANDING_RECIPIENT_STATUSES, SETTLED_RECIPIENT_STATUSES, outstandingRows, recipientRows, settledRows,
} from "@/lib/marketing/campaign-status";
import type { SegmentCostMeasure } from "@/lib/marketing/segment-cost";
import { creditVerdict } from "@/lib/marketing/credit-guard";
import { spendableBalance } from "@/lib/marketing/engine-rules";
import { formatNumber, formatTzs } from "@/lib/utils";

/* ══ THE SHAPES ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Who a campaign's audience is drawn from, as a refusal names it: the contact book, the player accounts, or both. */
export type CampaignPopulation = "book" | "players" | "both";

/** Every reason Start may refuse, in the header's order. ⛔ The object carries figures for EVERY role (the header). */
export type StartRefusal =
  | {
      reason:
        | "not_confirmed" | "confirmation_unreadable" | "switch_closed" | "needs_source_line" | "audience_unreadable"
        | "settings_unreadable" | "settings_incomplete" | "price_unknown" | "credit_unreadable" | "audience_uncounted"
        | "members_unverified" | "members_changed";
    }
  | { reason: "rail_dead"; rail: SmsRailProblem }
  | { reason: "over_budget"; costTzs: number; budgetTzs: number }
  | { reason: "credit_low"; balanceTzs: number; costTzs: number; reserveTzs: number }
  | { reason: "audience_moved"; freshCount: number; confirmedCount: number; population: CampaignPopulation };

/** Every reason Resume may refuse, in its order. ⛔ The object carries money figures for EVERY role (the header). */
export type ResumeRefusal =
  | {
      reason:
        | "switch_closed" | "confirmation_unreadable" | "sizes_unreadable" | "settings_unreadable" | "settings_incomplete"
        | "price_unknown" | "credit_unreadable";
    }
  /** What only a new copy can fix (`copyOnlyRefusal`). `reached` — was anyone on the list already handed a message? Then a
   *  copy (the same filter, nothing de-duplicated across campaigns) would message them AGAIN, and the sentence says so. */
  | { reason: CopyOnlyReason; reached: boolean }
  | { reason: "rail_dead"; rail: SmsRailProblem }
  | { reason: "credit_low"; balanceTzs: number; costTzs: number; reserveTzs: number };

/** Who reads a refusal sentence: `money` — `campaignMoneyVisible`; `reads` — `identity.contact` is `read`. No default. */
export type RefusalViewer = { money: boolean; reads: boolean };

/** The whole answer: a refusal, or what Start checked and found — the fresh count, how many fewer than were confirmed
 *  (`shrunkBy`, OD28 reports it) and the projection the credit and the budget were held to. */
export type StartCheck =
  | { ok: true; freshCount: number; shrunkBy: number; costTzs: number }
  | { ok: false; refusal: StartRefusal };

/** ⭐ E16 · how old a credit reading Start may act on: one minute — the platform's own reuse window, never longer. */
export const START_CREDIT_MAX_AGE_MS = 60_000;

/** Every read and rule the check makes — swappable for the suite's in-process plants; production never passes them. */
export type StartCheckDeps = {
  /** Which rail would carry the campaign (`smsProviderResolution`). */
  provider: () => SmsProviderResolution;
  /** The owner's switch, read now (`readMarketingLiveSwitch`). */
  liveSwitch: () => Promise<MarketingLiveSwitch>;
  /** THE gate over the rail and the switch (`marketingLiveGate`) — the one the test send asks. */
  gate: typeof marketingLiveGate;
  /** Why no SMS can leave this server, or null (`smsRailProblem`). */
  rail: () => SmsRailProblem | null;
  /** The Marketing SMS settings, RE-READ (`reloadMarketingSmsSettings`, OD63) — the price and the credit kept for codes. */
  settings: () => Promise<SettingsReload>;
  /** Today's price of one segment (`loadSegmentCost`): measured, else the configured price handed in, else unknown. */
  cost: (configuredTzs: number | null) => Promise<SegmentCostMeasure>;
  /** The credit, read at most `START_CREDIT_MAX_AGE_MS` old (`refreshSmsBalance`). */
  readBalance: () => Promise<SmsBalanceRead>;
  /** The ONE fence, counted now — the population and, for a list, the members key for this row's draft (`audienceFence`). */
  fence: typeof audienceFence;
  /** E16 (`creditVerdict`). */
  credit: typeof creditVerdict;
  /** ⭐ F-2 · the credit a check may count on: a send reply's pre-charge figure less its pending segments
   *  (`spendableBalance` — the engine's own slice check reads it the same way). */
  spendable: typeof spendableBalance;
  /** OD28 (`startAudienceVerdict`). */
  audienceVerdict: typeof startAudienceVerdict;
  now: () => number;
};

/** Frozen: production's check — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const START_CHECK_DEPS: Readonly<StartCheckDeps> = Object.freeze({
  provider: smsProviderResolution,
  liveSwitch: readMarketingLiveSwitch,
  gate: marketingLiveGate,
  rail: smsRailProblem,
  settings: reloadMarketingSmsSettings,
  cost: loadSegmentCost,
  readBalance: () => refreshSmsBalance({ maxAgeMs: START_CREDIT_MAX_AGE_MS }),
  fence: audienceFence,
  credit: creditVerdict,
  spendable: spendableBalance,
  audienceVerdict: startAudienceVerdict,
  now: () => Date.now(),
});

/* ══ THE PIECES ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

const isCount = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;

/** A list confirmation's members key, as U40a's fence writes it: lowercase hex of the one fixed length. */
const MEMBERS_KEY = new RegExp("^[0-9a-f]{" + MEMBERS_KEY_HEX_CHARS + "}$");

/** Every recipient status, outstanding and settled — a count must be given for each. */
const RECIPIENT_STATUSES: readonly string[] = [...OUTSTANDING_RECIPIENT_STATUSES, ...SETTLED_RECIPIENT_STATUSES];

/** ⛔ A projection reads no credit: `campaignEstimate` is handed this, so no balance figure exists inside it. */
const NO_CREDIT_READ: BalanceFigure = { kind: "unreadable", why: "never", error: null };

/**
 * U39's ONE arithmetic (`campaignEstimate`) over `population` people and the campaign's SAVED sizes: the billable segments
 * and, when a price is known, their cost (`ceil(segments × price)` — never rounded down). The confirmation froze its
 * estimate the same way, so a projection here can never be priced a second way.
 */
function projection(population: number, variants: readonly VariantSize[], cost: SegmentCostMeasure | null): { segments: number | null; costTzs: number | null } {
  const e = campaignEstimate(
    { audience: { ok: true, population, forecast: null }, pace: null, money: cost === null ? null : { cost, balance: NO_CREDIT_READ, reserveTzs: null } },
    variants,
  );
  return { segments: e.billableSegments, costTzs: e.money?.costTzs ?? null };
}

/** The confirmation as the row froze it. */
type Frozen = { tier: ConfirmTier; count: number; budgetTzs: number; variants: VariantSize[] };

/** ① A CONFIRMED row's frozen confirmation, read whole — or null: one Start cannot trust (`confirmation_unreadable`). */
function frozenOf(c: StoredSmsCampaign): Frozen | null {
  const tier = confirmTierFromColumn(c.confirmTier);
  const variants = savedVariantSizes(c);
  if (tier === null || variants === null) return null;
  if (!isCount(c.audienceCount) || c.audienceCount < 1 || !isCount(c.estimateSegments) || c.estimateSegments < 1) return null;
  if (typeof c.budgetTzs !== "number" || !Number.isFinite(c.budgetTzs) || c.budgetTzs < 0) return null;
  // A list confirmation stands on its keyed members: a watermark that is not one cannot be compared, so it is unreadable —
  // never told "the people changed".
  if (tier === "enumerate" && !(typeof c.audienceWatermark === "string" && MEMBERS_KEY.test(c.audienceWatermark))) return null;
  // Two frozen figures that disagree are not a confirmation anybody approved.
  if (projection(c.audienceCount, variants, null).segments !== c.estimateSegments) return null;
  return { tier, count: c.audienceCount, budgetTzs: c.budgetTzs, variants };
}

type Shut = { reason: "switch_closed" } | { reason: "rail_dead"; rail: SmsRailProblem };

/** ② · ③ The owner's switch through THE gate, then the rail. A switch that cannot be read is closed. */
async function shutOf(provider: SmsProviderResolution, deps: StartCheckDeps): Promise<Shut | null> {
  if (provider !== "unrecognised") {
    let live: MarketingLiveSwitch;
    try {
      live = await deps.liveSwitch();
    } catch {
      live = { state: "closed", why: "unreadable" };
    }
    if (!deps.gate(provider, live, deps.now()).ok) return { reason: "switch_closed" };
  }
  // ⛔ An unrecognised provider is a dead rail whatever the rail reader answers.
  const rail = deps.rail() ?? (provider === "unrecognised" ? "provider-unrecognised" : null);
  return rail === null ? null : { reason: "rail_dead", rail };
}

/** ⛔ E18 · an audience that can reach the contact book (the book, or both) whose frozen message carries no source line.
 *  A players-only campaign prints none (E17) — the same rule the confirmation applies to a blank stamp. */
function sourceLineMissing(c: Pick<StoredSmsCampaign, "sourcePhrase">, filter: Pick<ContactAudienceFilter, "population">): boolean {
  if (filter.population === "players") return false;
  return (typeof c.sourcePhrase === "string" ? c.sourcePhrase.trim() : "") === "";
}

const populationOf = (filter: Pick<ContactAudienceFilter, "population">): CampaignPopulation =>
  filter.population === "players" ? "players" : filter.population === "both" ? "both" : "book";

type Priced =
  | { ok: false; refusal: { reason: "settings_unreadable" | "settings_incomplete" } }
  | { ok: true; cost: SegmentCostMeasure; reserveTzs: number };

/** ⑥ · ⑦ The settings re-read (OD63) and today's price. A read that did not answer is retryable; a record that cannot be
 *  read in full is not. A cost loader that throws prices at the owner's configured price, as the confirmation's does. */
async function pricedOf(deps: StartCheckDeps): Promise<Priced> {
  let reload: SettingsReload;
  try {
    reload = await deps.settings();
  } catch {
    reload = { ok: false, error: "the settings read threw" };
  }
  if (!reload.ok) return { ok: false, refusal: { reason: "settings_unreadable" } };
  if (!reload.readable) return { ok: false, refusal: { reason: "settings_incomplete" } };
  const configured = reload.settings.pricePerSegmentTzs;
  let cost: SegmentCostMeasure;
  try {
    cost = await deps.cost(configured);
  } catch {
    cost = { kind: "configured", tzsPerSegment: configured };
  }
  return { ok: true, cost, reserveTzs: reload.settings.codesReserveTzs };
}

type CreditRefusal = { reason: "credit_unreadable" } | { reason: "credit_low"; balanceTzs: number; costTzs: number; reserveTzs: number };

/** ⑨ E16 · the credit, read fresh, held to `creditVerdict`. A read that throws is unreadable — never a figure. ⭐ F-2 (the
 *  engine's dry-fire, 2026-10-08): a send reply's figure is pre-charge, so its pending segments come off first at today's
 *  price — as the engine's slice check takes them off, so a Resume never lets through what the next slice pauses at once. */
async function creditRefusal(costTzs: number, reserveTzs: number, cost: SegmentCostMeasure, deps: StartCheckDeps): Promise<CreditRefusal | null> {
  let read: SmsBalanceRead | null;
  try {
    read = await deps.readBalance();
  } catch {
    read = null;
  }
  const perSegment = cost.kind === "unknown" ? 0 : cost.tzsPerSegment;
  const v = deps.credit({ balance: deps.spendable(balanceFigureOf(read), read?.pendingSegments, perSegment), costTzs, reserveTzs });
  if (v.ok) return null;
  return v.reason === "credit_low"
    ? { reason: "credit_low", balanceTzs: v.balanceTzs, costTzs: v.costTzs, reserveTzs: v.reserveTzs }
    : { reason: "credit_unreadable" };
}

/* ══ START ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ MAY THIS CAMPAIGN START NOW? — the header's ten steps, in order; the first that refuses answers. On success it says
 * what it found: the fresh count, how many fewer than were confirmed (`shrunkBy`) and the projection it was held to.
 * ⛔ Writes nothing (the header).
 */
export async function checkStart(c: StoredSmsCampaign, deps: StartCheckDeps = START_CHECK_DEPS): Promise<StartCheck> {
  const refuse = (refusal: StartRefusal): StartCheck => ({ ok: false, refusal });

  // ① a confirmed campaign, and a confirmation Start can trust
  if (!c || c.status !== "CONFIRMED") return refuse({ reason: "not_confirmed" });
  const frozen = frozenOf(c);
  if (frozen === null) return refuse({ reason: "confirmation_unreadable" });

  // ② the owner's switch · ③ the rail
  const provider = deps.provider();
  const shut = await shutOf(provider, deps);
  if (shut !== null) return refuse(shut);

  // ④ E18 the source line · ⑤ the stored audience
  const read = readCampaignAudience(c.audienceFilter);
  if (read.ok && sourceLineMissing(c, read.filter)) return refuse({ reason: "needs_source_line" });
  if (!read.ok) return refuse({ reason: "audience_unreadable" });
  const population = populationOf(read.filter);

  // ⑥ the settings · ⑦ today's price · ⑧ E15 the frozen budget
  const priced = await pricedOf(deps);
  if (!priced.ok) return refuse(priced.refusal);
  const { costTzs } = projection(frozen.count, frozen.variants, priced.cost);
  if (costTzs === null) return refuse({ reason: "price_unknown" });
  if (costTzs > frozen.budgetTzs) return refuse({ reason: "over_budget", costTzs, budgetTzs: frozen.budgetTzs });

  // ⑨ E16 the credit kept for codes — the console stub has no credit, and spends none
  if (provider !== "console") {
    const credit = await creditRefusal(costTzs, priced.reserveTzs, priced.cost, deps);
    if (credit !== null) return refuse(credit);
  }

  // ⑩ OD28 — the population counted now, last: the walk is the costliest read here. A count that fails is RETRYABLE.
  let fresh: number;
  let freshKey: string | null;
  try {
    const fence = await deps.fence(c);
    fresh = fence.claim.count;
    freshKey = fence.claim.membersKey;
  } catch {
    return refuse({ reason: "audience_uncounted" });
  }
  if (!isCount(fresh)) return refuse({ reason: "audience_uncounted" });
  const verdict = deps.audienceVerdict({
    confirmedCount: frozen.count,
    confirmedTier: frozen.tier,
    confirmedWatermark: c.audienceWatermark,
    fresh: { count: fresh, membersKey: freshKey },
  });
  if (!verdict.ok) {
    if (fresh > frozen.count) return refuse({ reason: "audience_moved", freshCount: fresh, confirmedCount: frozen.count, population });
    // A list whose fresh walk named nobody it could key (the count and the walk disagree, or a number that cannot be listed
    // came in) cannot be said to have changed: it could not be checked. Nobody at all is a change.
    if (frozen.tier === "enumerate" && freshKey === null && fresh >= 1) return refuse({ reason: "members_unverified" });
    return refuse({ reason: "members_changed" });
  }
  return { ok: true, freshCount: fresh, shrunkBy: verdict.shrunkBy, costTzs };
}

/** ⭐ The spec's API: Start's refusal, or null when it may go ahead (`checkStart` says what it found). */
export async function startRefusal(c: StoredSmsCampaign, deps: StartCheckDeps = START_CHECK_DEPS): Promise<StartRefusal | null> {
  const r = await checkStart(c, deps);
  return r.ok ? null : r.refusal;
}

/* ══ RESUME ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Recipient counts as Resume needs them: a whole number of 0 or more for EVERY status — a missing one is not 0. */
function countsReadable(counts: unknown): counts is SmsCampaignRecipientStatusCounts {
  if (counts === null || typeof counts !== "object") return false;
  const o = counts as Record<string, unknown>;
  return RECIPIENT_STATUSES.every((s) => isCount(o[s]));
}

/**
 * ⭐ WHAT IS LEFT TO SEND — the ONE definition Resume prices (the header): PENDING + HELD once the list is finished
 * (`enqueuedAt` set); while it is not, the confirmed count minus the rows already settled (never fewer than the rows still
 * outstanding). null when that cannot be counted: the list never finished and the row holds no confirmed count.
 * ⛔ Counts that are not counts THROW — a programming error; nothing is resumed on a figure nobody counted.
 */
export function resumeOutstanding(
  c: Pick<StoredSmsCampaign, "enqueuedAt" | "audienceCount">,
  counts: SmsCampaignRecipientStatusCounts,
): number | null {
  if (!countsReadable(counts)) throw new Error("resumeOutstanding: the recipient counts must give a count for every status — nothing was resumed");
  const owed = outstandingRows(counts);
  if (typeof c.enqueuedAt === "string" && c.enqueuedAt !== "") return owed;
  if (!isCount(c.audienceCount)) return null;
  return Math.max(owed, c.audienceCount - settledRows(counts));
}

/** The Resume refusals only a new copy can fix. */
export type CopyOnlyReason = "audience_moved" | "audience_unreadable" | "list_over_confirmed";

/** ⭐ EVERY stop reason U42's enqueue pauses a campaign for, and the Resume refusal each one is — a Record over the enqueue's
 *  own type, so a reason added to it without a refusal here is a compile error, never a campaign Resume does not know. */
const COPY_ONLY_STOP_REASONS: Readonly<Record<EnqueuePauseReason, CopyOnlyReason>> = {
  audience_moved: "audience_moved",
  audience_unreadable: "audience_unreadable",
  list_over_confirmed: "list_over_confirmed",
  list_over_confirmed_sending: "list_over_confirmed",
};

/** Rows HANDED to the network — SENT, DELIVERED, UNCONFIRMED: people a copy would message AGAIN. (A SKIPPED person was
 *  never messaged; a FAILED message never reached its person.) */
const messagedRows = (counts: SmsCampaignRecipientStatusCounts): number => counts.SENT + counts.DELIVERED + counts.UNCONFIRMED;

/**
 * ⛔ WHAT ONLY A NEW COPY CAN FIX (the header; U42's review, ENGINE-SPEC §4.15 decision 1 as amended) — asked with no read:
 * a list LONGER than its confirmed count, by the counts themselves and whatever the stop reason; then a campaign the enqueue
 * paused for one of its reasons. Each says whether anyone on the list was already messaged (`reached`). null for anything
 * else. `counts` must already have been read whole (`resumeOutstanding` throws first on counts that are not counts).
 */
export function copyOnlyRefusal(
  c: Pick<StoredSmsCampaign, "audienceCount" | "stopReason">,
  counts: SmsCampaignRecipientStatusCounts,
): ResumeRefusal | null {
  const reached = messagedRows(counts) > 0;
  if (isCount(c.audienceCount) && recipientRows(counts) > c.audienceCount) return { reason: "list_over_confirmed", reached };
  const k = typeof c.stopReason === "string" ? c.stopReason : "";
  return Object.prototype.hasOwnProperty.call(COPY_ONLY_STOP_REASONS, k)
    ? { reason: COPY_ONLY_STOP_REASONS[k as EnqueuePauseReason], reached }
    : null;
}

/**
 * ⭐ MAY THIS PAUSED CAMPAIGN SEND AGAIN? — FIRST, with no read, a confirmed count that is not one and what only a new copy
 * can fix (`copyOnlyRefusal`); then ② the switch, ③ the rail; then NOTHING LEFT resumes (the step finds nothing owed and
 * finishes); then what is left (`resumeOutstanding`), its sizes, ⑥ the settings, ⑦ the price and ⑨ the credit for it.
 * `counts` are the campaign's recipient rows by status, as stored now. ⛔ While anything is left, nothing is skipped; the
 * console stub, which has no credit, resumes after ② · ③. ⛔ The status is the caller's conditional transition, not this
 * check's. Counts that are not counts THROW.
 */
export async function resumeRefusal(
  c: StoredSmsCampaign,
  counts: SmsCampaignRecipientStatusCounts,
  deps: StartCheckDeps = START_CHECK_DEPS,
): Promise<ResumeRefusal | null> {
  const left = resumeOutstanding(c, counts);
  // ⛔ A confirmed count that is not one, for ANY campaign — as Start reads it: the list's length cannot be judged against it.
  if (!isCount(c.audienceCount) || c.audienceCount < 1) return { reason: "confirmation_unreadable" };
  const forGood = copyOnlyRefusal(c, counts);
  if (forGood !== null) return forGood;
  const provider = deps.provider();
  const shut = await shutOf(provider, deps);
  if (shut !== null) return shut;
  // Nothing left — every row settled: nothing to price and no credit to keep; the step finds nothing owed and finishes.
  if (provider === "console" || left === 0) return null;
  if (left === null) return { reason: "confirmation_unreadable" };
  const variants = savedVariantSizes(c);
  if (variants === null) return { reason: "sizes_unreadable" };
  const priced = await pricedOf(deps);
  if (!priced.ok) return priced.refusal;
  const { costTzs } = projection(left, variants, priced.cost);
  if (costTzs === null) return { reason: "price_unknown" };
  return creditRefusal(costTzs, priced.reserveTzs, priced.cost, deps);
}

/* ══ THE SENTENCES ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ONE sentence per Start refusal, in English (the console's chrome) — §4.12's words, and its "as built" note's for the
 * reasons added since. ⛔ Money only for `viewer.money`; ⛔ OD66 · a book ∪ players count only for `viewer.reads`.
 */
export function startRefusalSentence(r: StartRefusal, viewer: RefusalViewer): string {
  const money = viewer?.money === true;
  const reads = viewer?.reads === true;
  switch (r.reason) {
    case "not_confirmed":
      return "Only a confirmed campaign can start.";
    case "confirmation_unreadable":
      return "This campaign's confirmation can't be read in full, so it can't start. Stop it and confirm a new copy. Nothing was sent.";
    case "switch_closed":
      return "Marketing SMS are switched off. The owner switches them on (Admin → System → Marketing SMS sending), then you can start. Nothing was sent.";
    case "rail_dead":
      return "No SMS can leave this server right now — Admin → System says why. Nothing was sent.";
    case "needs_source_line":
      return "This campaign can reach people from the contact book, and its message has no source line. Stop it and confirm a copy once the owner has set the source line. Nothing was sent.";
    case "audience_unreadable":
      // A copy carries the same stored filter, and U47b's copy refuses one it cannot read: the other way out is said too.
      return "The saved audience can't be read any more. Stop this campaign and confirm a new copy — or write a new campaign if the copy is refused. Nothing was sent.";
    case "settings_unreadable":
      return "The Marketing SMS settings couldn't be read just now, so this campaign can't be checked before it starts. Try again in a moment. Nothing was sent.";
    case "settings_incomplete":
      return "The saved Marketing SMS settings can't be read in full, so this campaign can't be checked before it starts. The developer must repair them first. Nothing was sent.";
    case "price_unknown":
      return "The price per SMS isn't known, so the budget can't be checked. The owner sets it on Admin → System → Marketing SMS. Nothing was sent.";
    case "over_budget":
      return money
        ? `At today's price this campaign could cost ${formatTzs(r.costTzs)} — more than its limit of ${formatTzs(r.budgetTzs)}. Stop it and confirm a smaller copy, or the owner raises the limit. Nothing was sent.`
        : "At today's price this campaign could cost more than its limit. Stop it and confirm a smaller copy, or ask the owner. Nothing was sent.";
    case "credit_low":
      return money
        ? `Starting would leave less SMS credit than is kept for login and withdrawal codes — credit ${formatTzs(r.balanceTzs)}, this campaign up to ${formatTzs(r.costTzs)}, kept for codes ${formatTzs(r.reserveTzs)}. Top up, or narrow the audience. Nothing was sent.`
        : "There isn't enough SMS credit to start this campaign and still keep what login and withdrawal codes need. Ask the owner to top up. Nothing was sent.";
    case "credit_unreadable":
      return "The SMS credit couldn't be read just now, so the campaign can't start safely. Try again in a minute. Nothing was sent.";
    case "audience_uncounted":
      return "The audience couldn't be counted just now. Try again in a minute. Nothing was sent.";
    case "audience_moved":
      return r.population === "both" && !reads
        ? "The audience grew since it was confirmed. Nothing was sent. Stop this campaign and confirm a new copy."
        : `The audience grew since it was confirmed — now ${formatNumber(r.freshCount)}, confirmed ${formatNumber(r.confirmedCount)}. Nothing was sent. Stop this campaign and confirm a new copy.`;
    case "members_unverified":
      return "The people on this campaign couldn't be matched to the confirmed list just now. Try again in a minute; if it happens again, stop this campaign and confirm a new copy. Nothing was sent.";
    case "members_changed":
      return "The people on this campaign changed since they were confirmed. Nothing was sent. Stop this campaign and confirm a new copy.";
  }
  // Unreachable while every reason has its case. A reason added without one is named, never a blank (`stopReasonLabel`'s rule).
  return `Engine reason: ${(r as { reason: string }).reason}`;
}

/** What a Resume refusal says once anyone on the list was messaged: a copy would reach them again, and the choice is theirs. */
const REACHED_AGAIN =
  "Some people on it have already been messaged, and a copy would message them again: stop it, and confirm a copy only if that is what you want.";

/**
 * ONE sentence per Resume refusal — its own words: a paused campaign's audience is frozen, it may already have sent, and
 * it resumes rather than starts. ⛔ Money only for `viewer.money`.
 */
export function resumeRefusalSentence(r: ResumeRefusal, viewer: RefusalViewer): string {
  const money = viewer?.money === true;
  switch (r.reason) {
    // ⭐ What only a new copy can fix. A copy has the same filter and nothing de-duplicates across campaigns, so once anyone
    // on the list has been messaged (`reached`) the sentence says a copy would message them AGAIN, and leaves the choice
    // honest — never "confirm a new copy" as if it reached nobody twice (U42's re-review).
    case "list_over_confirmed":
      return r.reached
        ? `More people are on this campaign's list than were confirmed, so it can't resume. ${REACHED_AGAIN} Nobody more was messaged.`
        : "More people are on this campaign's list than were confirmed, so it can't resume. Stop it and confirm a new copy. Nobody more was messaged.";
    case "audience_moved":
      return r.reached
        ? `The people on this campaign changed after it was confirmed, so it can't resume. ${REACHED_AGAIN} Nobody more was messaged.`
        : "The people on this campaign changed after it was confirmed, so it can't resume. Stop it and confirm a new copy. Nobody more was messaged.";
    case "audience_unreadable":
      return r.reached
        ? "The saved audience can't be read any more, so this campaign can't resume. Some people on it have already been messaged, and a new campaign to the same people would message them again: stop it, and send another only if that is what you want. Nobody more was messaged."
        : "The saved audience can't be read any more, so this campaign can't resume. Stop it and confirm a new copy — or write a new campaign if the copy is refused. Nobody more was messaged.";
    case "switch_closed":
      return "Marketing SMS are switched off. The owner switches them on (Admin → System → Marketing SMS sending), then you can resume. Nobody more was messaged.";
    case "rail_dead":
      return "No SMS can leave this server right now — Admin → System says why. The campaign stays paused. Nobody more was messaged.";
    case "confirmation_unreadable":
      // Before the list finished, what is left cannot be counted without the confirmed count; after, the list's length
      // cannot be judged without it — "checked" is true of both.
      return "This campaign's confirmation can't be read in full, so what is left to send can't be checked, and it can't resume. Stop it, or ask the developer. Nobody more was messaged.";
    case "sizes_unreadable":
      return "This campaign's saved message size can't be read, so what is left to send can't be priced, and it can't resume. Stop it, or ask the developer. Nobody more was messaged.";
    case "settings_unreadable":
      return "The Marketing SMS settings couldn't be read just now, so what is left to send can't be checked. Try again in a moment. Nobody more was messaged.";
    case "settings_incomplete":
      return "The saved Marketing SMS settings can't be read in full, so what is left to send can't be checked. The developer must repair them first. Nobody more was messaged.";
    case "price_unknown":
      return "The price per SMS isn't known, so what is left to send can't be priced. The owner sets it on Admin → System → Marketing SMS. Nobody more was messaged.";
    case "credit_unreadable":
      return "The SMS credit couldn't be read just now, so the campaign can't resume safely. Try again in a minute. Nobody more was messaged.";
    case "credit_low":
      return money
        ? `Resuming would leave less SMS credit than is kept for login and withdrawal codes — credit ${formatTzs(r.balanceTzs)}, the rest of this campaign up to ${formatTzs(r.costTzs)}, kept for codes ${formatTzs(r.reserveTzs)}. Top up, then resume. Nobody more was messaged.`
        : "There isn't enough SMS credit to finish this campaign and still keep what login and withdrawal codes need. Ask the owner to top up, then resume. Nobody more was messaged.";
  }
  return `Engine reason: ${(r as { reason: string }).reason}`;
}
