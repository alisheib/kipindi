/**
 * ⭐ U49a · THE ONE LIST OF START REFUSALS — every reason a confirmed campaign may not start, checked in ONE order and said
 * in ONE sentence each (ENGINE-SPEC §4.12 decision 3; E15 · E16 · E18 · E19 · OD28 · OD63).
 *
 * ⛔ NOTHING CALLS THIS YET. Its callers are U47b's Start (`startRefusal` → `transition(CONFIRMED → PREPARING)` → the
 * started row) and Resume (`resumeRefusal` → the held rows re-queued → `transition(PAUSED → …)`), and neither exists, so
 * the module ships inert. ⛔ IT READS AND DECIDES — IT WRITES NOTHING: no transition, no audit row, no recipient row, no
 * token, no message. A refusal's own row (`marketing.campaign_start_refused`) is written by U47b's Start action.
 *
 * ── THE ORDER (§4.12 decision 3) — the cheap reads first, the walk last ────────────────────────────────────────────────
 *   ①  not_confirmed — the row is not CONFIRMED, or its frozen confirmation cannot be read whole: the tier, the count, the
 *       segments, the budget and the saved sizes, which must agree (the count × the largest saved variant IS
 *       `estimateSegments`, as the confirmation froze them from one arithmetic).
 *   ②  switch_closed — THE gate (`marketingLiveGate`): a real carrier needs the owner's switch open NOW. ⭐ The console
 *       stub passes it (no handset, no money — U47b's local drive starts a campaign on it). ⚠️ An unrecognised provider
 *       is not a closed switch — the gate can pass it whatever the switch says — so ③ names it.
 *   ③  rail_dead — `smsRailProblem`: no SMS can leave this server at all.
 *   ④  needs_source_line — E18: an audience that can reach the contact book (the book, or both) whose frozen message has
 *       no source line; a players-only campaign needs none. Judged on the stored filter, so a filter that cannot be read
 *       is ⑤'s.
 *   ⑤  audience_unreadable — the stored filter no longer reads at the campaign's door.
 *   ⑥  settings_unreadable — ⛔ OD63, beyond §4.12's list as U40a's confirmation is: the Marketing SMS settings re-read
 *       could not be read in full, so neither a configured price nor the credit kept for codes may be acted on — never
 *       their defaults standing in for the owner's figures.
 *   ⑦  price_unknown — today's price is unknown: MEASURED from our own delivered sends, else the configured one, through
 *       the confirmation's own cost loader (`loadSegmentCost`). (With the settings read, a price is always configured, so
 *       this answers a cost loader that knows none — defence in depth, as in U40a.)
 *   ⑧  over_budget — E15: today's price × the frozen segments, through U39's ONE arithmetic (`campaignEstimate`,
 *       never rounded down), STRICTLY above the frozen `budgetTzs`; at it, the campaign starts.
 *   ⑨  credit_unreadable · credit_low — E16: the credit read fresh (at most `START_CREDIT_MAX_AGE_MS` old, waited for —
 *       no render budget) and held to `creditVerdict` against that same projection and the credit kept for codes. It
 *       must be LIVE: anything else refuses (fail closed). ⭐ The console stub has no credit and spends none: not read.
 *   ⑩  audience_moved · members_changed — OD28 (E19): the population counted fresh through the ONE fence
 *       (`audienceFence` — `campaignAudienceCount`, and the members key scoped `{ campaignId: row.id, draftRevision:
 *       row.draftRevision }`, the confirmed row's own id and frozen revision, so it names the draft the confirmation keyed)
 *       → `startAudienceVerdict`. More people than were confirmed is `audience_moved`; any other change of people (a list
 *       confirmation whose people differ, even fewer) is `members_changed`; the same or fewer go ahead, reporting how many
 *       fewer (`shrunkBy`). A fence that cannot count is `audience_unreadable`.
 * `resumeRefusal` is ② · ③ · ⑨ for the OUTSTANDING rows only (pricing them needs ⑥ and ⑦ first); nothing outstanding
 * prices nothing, and so does the stub.
 *
 * ── THE SENTENCES (`startRefusalSentence`) ─────────────────────────────────────────────────────────────────────────────
 * The spec's words, one per refusal; each one that refuses before anything went out says "Nothing was sent.". ⛔ TZS and
 * money figures only for a viewer the CALLER says may read them (`campaignMoneyVisible`); a growth officer reads the same
 * refusal without a figure. The counts of people are not money and are said to every role.
 *
 * ⛔ FAILS CLOSED, every way: a dependency that throws is the refusal of its own step (a switch that cannot be read is
 * closed, a credit that cannot be read is unreadable, a fence that cannot count is an unreadable audience).
 *
 * Guard: `npm run test:marketing-engine` §F (F1–F7, F10) · Red: `npm run red:marketing-engine` (in memory).
 */
import type { StoredSmsCampaign } from "@/lib/server/store";
import { refreshSmsBalance, smsProviderResolution, smsRailProblem } from "@/lib/server/sms";
import type { SmsBalanceRead, SmsProviderResolution, SmsRailProblem } from "@/lib/server/sms";
import { marketingLiveGate, readMarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import type { MarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import { reloadMarketingSmsSettings } from "@/lib/server/marketing/sms-settings";
import type { SettingsReload } from "@/lib/server/marketing/sms-settings";
import { balanceFigureOf, loadSegmentCost } from "@/lib/server/marketing/estimate";
import { audienceFence, readCampaignAudience } from "@/lib/server/marketing/audience-fence";
import type { AudienceFence } from "@/lib/server/marketing/audience-fence";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { confirmTierFromColumn, startAudienceVerdict } from "@/lib/marketing/campaign-confirm";
import type { ConfirmTier } from "@/lib/marketing/campaign-confirm";
import { campaignEstimate, savedVariantSizes } from "@/lib/marketing/campaign-estimate";
import type { BalanceFigure, VariantSize } from "@/lib/marketing/campaign-estimate";
import type { SegmentCostMeasure } from "@/lib/marketing/segment-cost";
import { creditVerdict } from "@/lib/marketing/credit-guard";
import { formatNumber, formatTzs } from "@/lib/utils";

/* ══ THE SHAPES ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Every reason Start (or Resume) may refuse — §4.12's list, plus `settings_unreadable` (OD63, see the header). */
export type StartRefusal =
  | { reason: "not_confirmed" | "switch_closed" | "needs_source_line" | "audience_unreadable" | "settings_unreadable" | "price_unknown" | "credit_unreadable" | "members_changed" }
  | { reason: "rail_dead"; rail: SmsRailProblem }
  | { reason: "over_budget"; costTzs: number; budgetTzs: number }
  | { reason: "credit_low"; balanceTzs: number; costTzs: number; reserveTzs: number }
  | { reason: "audience_moved"; freshCount: number; confirmedCount: number };

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
  fence: (c: Pick<StoredSmsCampaign, "id" | "draftRevision" | "audienceFilter">) => Promise<AudienceFence>;
  /** E16 (`creditVerdict`). */
  credit: typeof creditVerdict;
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
  audienceVerdict: startAudienceVerdict,
  now: () => Date.now(),
});

/* ══ THE PIECES ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

const isCount = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;

/** ⛔ A projection reads no credit: `campaignEstimate` is handed this, so no balance figure exists inside it. */
const NO_CREDIT_READ: BalanceFigure = { kind: "unreadable", why: "never", error: null };

/**
 * U39's ONE arithmetic (`campaignEstimate`) over `population` people and the campaign's SAVED sizes: the billable segments
 * and, when a price is known, their cost (`ceil(segments × price)` — never rounded down). The confirmation froze its
 * estimate the same way, so a projection here can never be priced a second way.
 */
function projection(population: number, variants: readonly VariantSize[], cost: SegmentCostMeasure | null): { segments: number | null; costTzs: number | null } {
  const e = campaignEstimate(
    { audience: { ok: true, population, forecast: null }, pace: null, money: cost === null ? null : { cost, balance: NO_CREDIT_READ, reserveTzs: 0 } },
    variants,
  );
  return { segments: e.billableSegments, costTzs: e.money?.costTzs ?? null };
}

/** The confirmation as the row froze it. */
type Frozen = { tier: ConfirmTier; count: number; budgetTzs: number; variants: VariantSize[] };

/** ① The confirmation, read whole — or null: a CONFIRMED row without its frozen keys is not one Start can trust. */
function frozenOf(c: StoredSmsCampaign): Frozen | null {
  if (!c || c.status !== "CONFIRMED") return null;
  const tier = confirmTierFromColumn(c.confirmTier);
  const variants = savedVariantSizes(c);
  if (tier === null || variants === null) return null;
  if (!isCount(c.audienceCount) || c.audienceCount < 1 || !isCount(c.estimateSegments) || c.estimateSegments < 1) return null;
  if (typeof c.budgetTzs !== "number" || !Number.isFinite(c.budgetTzs) || c.budgetTzs < 0) return null;
  // Two frozen figures that disagree are not a confirmation anybody approved.
  if (projection(c.audienceCount, variants, null).segments !== c.estimateSegments) return null;
  return { tier, count: c.audienceCount, budgetTzs: c.budgetTzs, variants };
}

/** ② · ③ The owner's switch through THE gate, then the rail. A switch that cannot be read is closed. */
async function shutOf(provider: SmsProviderResolution, deps: StartCheckDeps): Promise<StartRefusal | null> {
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

type Priced = { ok: false; refusal: StartRefusal } | { ok: true; cost: SegmentCostMeasure; reserveTzs: number };

/** ⑥ · ⑦ The settings re-read (OD63) and today's price. A cost loader that throws prices at the owner's configured price,
 *  as the confirmation's does. */
async function pricedOf(deps: StartCheckDeps): Promise<Priced> {
  let reload: SettingsReload;
  try {
    reload = await deps.settings();
  } catch {
    reload = { ok: false, error: "the settings read threw" };
  }
  if (!reload.ok || !reload.readable) return { ok: false, refusal: { reason: "settings_unreadable" } };
  const configured = reload.settings.pricePerSegmentTzs;
  let cost: SegmentCostMeasure;
  try {
    cost = await deps.cost(configured);
  } catch {
    cost = { kind: "configured", tzsPerSegment: configured };
  }
  return { ok: true, cost, reserveTzs: reload.settings.codesReserveTzs };
}

/** ⑨ E16 · the credit, read fresh, held to `creditVerdict`. A read that throws is unreadable — never a figure. */
async function creditRefusal(costTzs: number, reserveTzs: number, deps: StartCheckDeps): Promise<StartRefusal | null> {
  let read: SmsBalanceRead | null;
  try {
    read = await deps.readBalance();
  } catch {
    read = null;
  }
  const v = deps.credit({ balance: balanceFigureOf(read), costTzs, reserveTzs });
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

  // ① a confirmation Start can trust
  const frozen = frozenOf(c);
  if (frozen === null) return refuse({ reason: "not_confirmed" });

  // ② the owner's switch · ③ the rail
  const provider = deps.provider();
  const shut = await shutOf(provider, deps);
  if (shut !== null) return refuse(shut);

  // ④ E18 the source line · ⑤ the stored audience
  const read = readCampaignAudience(c.audienceFilter);
  if (read.ok && sourceLineMissing(c, read.filter)) return refuse({ reason: "needs_source_line" });
  if (!read.ok) return refuse({ reason: "audience_unreadable" });

  // ⑥ the settings · ⑦ today's price · ⑧ E15 the frozen budget
  const priced = await pricedOf(deps);
  if (!priced.ok) return refuse(priced.refusal);
  const { costTzs } = projection(frozen.count, frozen.variants, priced.cost);
  if (costTzs === null) return refuse({ reason: "price_unknown" });
  if (costTzs > frozen.budgetTzs) return refuse({ reason: "over_budget", costTzs, budgetTzs: frozen.budgetTzs });

  // ⑨ E16 the credit kept for codes — the console stub has no credit, and spends none
  if (provider !== "console") {
    const credit = await creditRefusal(costTzs, priced.reserveTzs, deps);
    if (credit !== null) return refuse(credit);
  }

  // ⑩ OD28 — the population counted now, last: the walk is the costliest read here
  let fence: AudienceFence;
  try {
    fence = await deps.fence(c);
  } catch {
    return refuse({ reason: "audience_unreadable" });
  }
  const fresh = fence.claim.count;
  if (!isCount(fresh)) return refuse({ reason: "audience_unreadable" });
  const verdict = deps.audienceVerdict({
    confirmedCount: frozen.count,
    confirmedTier: frozen.tier,
    confirmedWatermark: c.audienceWatermark,
    fresh: { count: fresh, membersKey: fence.claim.membersKey },
  });
  if (!verdict.ok) {
    return refuse(fresh > frozen.count
      ? { reason: "audience_moved", freshCount: fresh, confirmedCount: frozen.count }
      : { reason: "members_changed" });
  }
  return { ok: true, freshCount: fresh, shrunkBy: verdict.shrunkBy, costTzs };
}

/** ⭐ The spec's API: Start's refusal, or null when it may go ahead (`checkStart` says what it found). */
export async function startRefusal(c: StoredSmsCampaign, deps: StartCheckDeps = START_CHECK_DEPS): Promise<StartRefusal | null> {
  const r = await checkStart(c, deps);
  return r.ok ? null : r.refusal;
}

/* ══ RESUME ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ MAY THIS PAUSED CAMPAIGN SEND AGAIN? — ② the switch, ③ the rail, ⑨ the credit for the `outstanding` rows only (the
 * rows still owed a message — PENDING and HELD — × the saved segments × today's price; ⑥ and ⑦ come first, as they must
 * to price them). ⭐ Nothing outstanding prices nothing, and the console stub has no credit: neither reads the credit.
 * ⛔ The status is the caller's conditional transition, not this check's. An `outstanding` that is not a count is a
 * programming error and THROWS — nothing is resumed on a figure nobody counted.
 */
export async function resumeRefusal(
  c: StoredSmsCampaign,
  outstanding: number,
  deps: StartCheckDeps = START_CHECK_DEPS,
): Promise<StartRefusal | null> {
  if (!isCount(outstanding)) throw new Error("resumeRefusal: the outstanding rows must be a count — nothing was resumed");
  const provider = deps.provider();
  const shut = await shutOf(provider, deps);
  if (shut !== null) return shut;
  if (provider === "console" || outstanding === 0) return null;
  const variants = savedVariantSizes(c);
  if (variants === null) return { reason: "price_unknown" };
  const priced = await pricedOf(deps);
  if (!priced.ok) return priced.refusal;
  const { costTzs } = projection(outstanding, variants, priced.cost);
  if (costTzs === null) return { reason: "price_unknown" };
  return creditRefusal(costTzs, priced.reserveTzs, deps);
}

/* ══ THE SENTENCES ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ONE sentence per refusal (§4.12 "Sentences"), in English (the console's chrome). ⛔ `money` is the caller's answer to
 * `campaignMoneyVisible` for the viewer: TZS and the figures only when it is true.
 */
export function startRefusalSentence(r: StartRefusal, money: boolean): string {
  switch (r.reason) {
    case "not_confirmed":
      return "Only a confirmed campaign can start.";
    case "switch_closed":
      return "Marketing SMS are switched off. The owner switches them on (Admin → System → Marketing SMS sending), then you can start. Nothing was sent.";
    case "rail_dead":
      return "No SMS can leave this server right now — Admin → System says why. Nothing was sent.";
    case "needs_source_line":
      return "This campaign can reach people from the contact book, and its message has no source line. Stop it and confirm a copy once the owner has set the source line. Nothing was sent.";
    case "audience_unreadable":
      return "The saved audience can't be read any more. Stop this campaign and confirm a new copy. Nothing was sent.";
    case "settings_unreadable":
      return "The Marketing SMS settings couldn't be read just now, so this campaign can't be checked before it starts. Try again in a moment. Nothing was sent.";
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
    case "audience_moved":
      return `The audience grew since it was confirmed — now ${formatNumber(r.freshCount)}, confirmed ${formatNumber(r.confirmedCount)}. Nothing was sent. Stop this campaign and confirm a new copy.`;
    case "members_changed":
      return "The people on this campaign changed since they were confirmed. Nothing was sent. Stop this campaign and confirm a new copy.";
  }
  // Unreachable while every reason has its case. A reason added without one is named, never a blank (`stopReasonLabel`'s rule).
  return `Engine reason: ${(r as { reason: string }).reason}`;
}
