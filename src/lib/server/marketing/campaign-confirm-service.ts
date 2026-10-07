/**
 * ⭐ U40a · THE CONFIRMATION, SERVER — the view a confirmation is opened on (`campaignConfirmView`) and the ONE write that
 * confirms (`confirmCampaign`). ENGINE-SPEC §4.5 decision 2; OD27, X9, X13, X15, E15, E18, E27; OD60, OD65, OD66, OD67.
 *
 * ── THE ORDER (§4.5 decision 2) ──────────────────────────────────────────────────────────────────────────────────
 *   find (a DRAFT, else `not_found` / `not_draft`) → the stored audience read at the campaign's door → this viewer's role
 *   rule → a FRESH fence (`audienceFence`: the ONE walk's count, the members key for THIS draft) held to what this viewer
 *   may see (`fenceForViewer`, OD67) → `decideConfirm` (OD27) → E18 the source line, read fresh → the estimate frozen (the
 *   SAVED segments × the fresh count × the measured price, else the settings' price, X15) → E15 the limit → ONE
 *   `transition(DRAFT → CONFIRMED, draftRevision)` writing every confirm key → a null answer read back once to say why
 *   (`confirmWriteRefusal`).
 * ⛔ OD27 · THE GATE IS THE SERVER'S RECOUNT. The browser sends the text the modal armed on and the SIGNED claim it was
 * opened on (the watermark) — never a count (`ConfirmCampaignInput` has no such field). The typed text is checked against
 * the count made HERE, now; the claim proves only which draft (its id and revision) and which count the officer was shown.
 * The FILTER is bound through the draft, not inside the seal: it is a draft key, so changing it is a save, and a save moves
 * the revision. A list confirmation also compares its keyed members; a TYPED one compares the count alone, so a swap that
 * keeps the count is not noticed — by design: typing a number approves that many people, and Start refuses more (OD28).
 * ⛔ THE COUNT IS COUNTED OUTSIDE ANY LOCK (OD21). The race between the count and the write is settled by the write itself:
 * the transition is conditional on DRAFT and on the draft revision the officer saw, so of two officers ONE wins, and an
 * edit saved while the audience was being counted is caught by the same condition.
 *
 * ── THE REFUSALS BEYOND THE PURE TABLE (`CONFIRM_SERVICE_COPY`) ─────────────────────────────────────────────────
 * `CONFIRM_REFUSAL_COPY` stays the ONE table for the pure reasons. This service adds the ones only it can see:
 *   · `audience_unreadable` — the stored filter no longer reads at the campaign's door; nothing is counted.
 *   · `audience_refused` — ⛔ OD66 · a filter THIS viewer's role may not count (`campaignAudienceRefusal`): for a viewer
 *     who may not read a number, both populations at once, a search, a consent/source/player/stop axis. Refused BEFORE
 *     the count, so neither the view nor a refusal sentence ("Type 7 to confirm") can say a number the role rule hides.
 *   · `needs_source_line` — ⛔ E18 · an audience that can reach the contact book (the book, or both) whose stored message
 *     carries no source line. A players-only campaign needs none.
 *   · `unsaved` — the draft's stamped source line is not the one saved now (U37s; changed or cleared since): confirming
 *     freezes the SAVED message, so it is saved again first. `source_unreadable` — that fresh read could not answer.
 *   · `no_body` — the stored sizes cannot be priced (`savedVariantSizes`; the door never stores such a row — fail closed).
 *   · `settings_unreadable` — ⛔ OD63 · the Marketing SMS settings were re-read and could not be read in full: the limit is
 *     unknown, and a default standing in for the owner's value is never confirmed against.
 *   · `price_unknown`, `over_limit` — ⛔ E15 · the frozen estimate (`estimateTzs` — the population × the saved segments ×
 *     the price per segment, MEASURED from our own sends when there are enough, else the configured one) is checked against
 *     the most one campaign may spend, and `budgetTzs` freezes that LIMIT — the ceiling, not the estimate. Strictly above
 *     it refuses; at it confirms.
 * ⭐ MONEY WORDS ONLY FOR A MONEY READER (`viewer.money` — the caller asks `campaignMoneyVisible`): the view's figures and
 * the `over_limit` sentence carry TZS only then; anyone else reads the same refusal without a figure.
 *
 * ── WHAT A VIEWER WHO MAY NOT READ A NUMBER SEES (OD65 · OD67) ───────────────────────────────────────────────────
 * ⛔ THE COUNT ALONE, at every size, before a campaign sends: `split` is the count-alone view (`audienceCountView`) over the
 * FENCE's own count — the number they type — and the split door, which asks the gate about every number, is never called
 * for them, so no verdict exists to leak, not even through how long the answer takes. ⛔ OD67 · NO LIST, AND ALWAYS THE
 * TYPED TIER (`fenceForViewer`): they could not check a list of numbers they may not read, and a list is what lets two
 * drafts be set side by side to ask "is this contact a player?" — so they get no sample, their claim carries no members
 * key, and they confirm by typing the count, on the view AND in the confirmation (a list watermark they post is refused
 * the way a typed tier is refused without its number). A reader gets U38b's full view-model, the list (the walk's own
 * rows, masked, with no verdict and no player flag — D19) and both tiers, as built.
 *
 * ── AUDIT (E24: one row per event, COMPLIANCE) ─────────────────────────────────────────────────────────────────
 * `marketing.campaign_confirmed` `{ tier, count, describe, draftRevision, estimateSegments, budgetSet }` and
 * `marketing.campaign_confirm_refused` `{ reason, shownCount, freshCount, tier }`. ⛔ No phone number: the audience goes
 * in through `auditContactAudience` (masked), the typed text is never recorded, and a campaign id is recorded only when it
 * names a stored row (a posted id is text anyone can send). ⭐ ruling 543 · the confirmation SAYS BOTH HALVES: its answer
 * carries `recorded`, read from the audit's own result — the campaign is confirmed either way; when the record did not
 * land the caller says so too.
 *
 * ⛔ CONFIRMED SENDS NOTHING. No recipient row, no opt-out token, no message, no `dispatchSlice`: the first live send is
 * a separate Start (owner gate G2). ⛔ ONE OFFICER'S TYPED CONFIRMATION IS THE AUTHORISATION (OD60, U41): no second
 * officer is asked for here or anywhere on the campaign path.
 * ⭐ A WRITE WHOSE REPLY WAS LOST is looked at once: it is reported confirmed only when the row carries EVERY value this
 * write set (`confirmedByThisWrite`), and this write's instant is unique per campaign in this process (`confirmInstant`), so
 * neither another officer's confirmation nor the same officer's twin in the same millisecond is taken for it.
 * ⚠️ KNOWN RESIDUAL: if that look fails too, the error reaches the caller — and the campaign may be confirmed
 * (`confirmedBy`/`confirmedAt` on the row say by whom) with no `marketing.campaign_confirmed` row. Two PROCESSES (a deploy's
 * overlap) do not share the instants, so the same officer's twin there, in the same millisecond, with a thrown write, could
 * still be taken for this one.
 *
 * Guard: `npm run test:campaign-gates` · Red: `npm run red:campaign-gates` (in memory).
 */
import { db } from "@/lib/server/store";
import type { SmsCampaignTransition, StoredSmsCampaign } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import {
  campaignAudienceRefusal, describeAudience, auditContactAudience, contactAudienceKey,
} from "@/lib/server/marketing/audience";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { audienceSplit } from "@/lib/server/marketing/audience-split";
import type { AudienceSplitResult } from "@/lib/server/marketing/audience-split";
import { audienceFence, readCampaignAudience, signFence, verifyFence } from "@/lib/server/marketing/audience-fence";
import type { AudienceFence, FenceSampleRow } from "@/lib/server/marketing/audience-fence";
import { reloadMarketingSmsSettings } from "@/lib/server/marketing/sms-settings";
import type { SettingsReload } from "@/lib/server/marketing/sms-settings";
import { loadSegmentCost } from "@/lib/server/marketing/estimate";
import { CAMPAIGN_AUDIENCE_UNREADABLE, readSavedSourcePhrase } from "@/lib/server/marketing/campaign-draft";
import type { SourcePhraseRead } from "@/lib/server/marketing/campaign-draft";
import { CONFIRM_REFUSAL_COPY, CONFIRM_TIER_COLUMN, confirmWriteRefusal, decideConfirm } from "@/lib/marketing/campaign-confirm";
import type { ConfirmOutcomeReason, ConfirmTier } from "@/lib/marketing/campaign-confirm";
import { campaignEstimate, savedVariantSizes } from "@/lib/marketing/campaign-estimate";
import type { BalanceFigure } from "@/lib/marketing/campaign-estimate";
import type { SegmentCostMeasure } from "@/lib/marketing/segment-cost";
import { breakdownVisible } from "@/lib/marketing/campaign-status";
import { audienceCountView, audienceSplitView } from "@/app/admin/campaigns/new/audience-view-model";
import type { AudienceSplitView } from "@/app/admin/campaigns/new/audience-view-model";
import { formatTzs } from "@/lib/utils";

/* ══ THE ROWS IT WRITES ══════════════════════════════════════════════════════════════════════════════════════════ */

export const CAMPAIGN_CONFIRMED_ACTION = "marketing.campaign_confirmed";
export const CAMPAIGN_CONFIRM_REFUSED_ACTION = "marketing.campaign_confirm_refused";

/* ══ THE SHAPES ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Who is looking: may they read a number (`identity.contact` = read), may they read money (`campaignMoneyVisible`)?
 *  ⛔ Decided by the caller from the viewer's STORED role, every time — there is no default. */
export type ConfirmViewer = { reads: boolean; money: boolean };

/** The refusals only this service can see (the header). The pure ones are `ConfirmOutcomeReason`. */
export type ConfirmServiceRefusal =
  | "audience_unreadable" | "audience_refused" | "needs_source_line" | "unsaved" | "source_unreadable"
  | "no_body" | "settings_unreadable" | "price_unknown" | "over_limit";

/** Why the confirm trigger is disabled — the first refusal a correctly typed confirmation of this view would get, read
 *  from the same sources at the same moment (the source line too is read fresh, as the confirmation reads it). */
export type ConfirmBlocked = "not_draft" | "audience_empty" | ConfirmServiceRefusal;

/** The estimate a confirmation would freeze. `money` is null for a viewer who may not read money — no figure, no key. */
export type CampaignConfirmEstimate = {
  /** The billable segments: the population × the largest SAVED variant's segments (X15) — `estimateSegments`. */
  segments: number;
  perRecipient: number;
  money: null | {
    /** ceil(segments × price) — `estimateTzs`; null when no price is known. */
    costTzs: number | null;
    /** The most one campaign may spend — `budgetTzs`; null when the settings could not be read. */
    limitTzs: number | null;
    priceTzs: number | null;
    priceKind: "measured" | "configured" | "unknown";
  };
};

export type CampaignConfirmView = {
  campaignId: string;
  /** The signed claim the modal posts back — null when the confirmation is blocked before the audience is counted. */
  watermark: string | null;
  /** ⛔ Always `typed` for a viewer who may not read a number (OD67). */
  tier: ConfirmTier | null;
  /** The ONE walk's count, counted now — the number to type. ⛔ null, never 0, when nothing was counted. */
  count: number | null;
  countedAt: string | null;
  /** `describeAudience`'s phrases — only for a filter this viewer's role rule passes. */
  describe: string[];
  /** U38b's view-model: the full split for a reader (null when the split failed — never zeros), the count alone for anyone
   *  else (OD65); null when nothing was counted. */
  split: AudienceSplitView | null;
  /** The walk's first rows, masked — FOR A READER: every person on a listed (enumerate) audience, at most five otherwise.
   *  ⛔ Empty for a viewer who may not read a number (OD67). */
  sample: FenceSampleRow[];
  /** null when nothing was counted, or the stored sizes cannot be priced. */
  estimate: CampaignConfirmEstimate | null;
  blocked: ConfirmBlocked | null;
  /** The blocked reason in one sentence — money words only for a money reader. */
  message: string | null;
};

/** ⛔ NO COUNT FIELD: the browser never tells the server how many people there are (OD27). `typed` is the text the modal
 *  armed on; `watermark` the claim it was opened on; `actorId` the officer, from the session. */
export type ConfirmCampaignInput = { campaignId: string; typed: string | null; watermark: string | null; actorId: string };

/** ⭐ ruling 543 · `recorded` says whether the `marketing.campaign_confirmed` row is in the log: the campaign is confirmed
 *  either way, and a caller that tells an officer so says the second half too when it is false. */
export type ConfirmCampaignResult =
  | { ok: true; count: number; tier: ConfirmTier; recorded: boolean }
  | { ok: false; reason: ConfirmOutcomeReason | ConfirmServiceRefusal; freshCount: number | null; message: string };

/* ══ THE SENTENCES ═══════════════════════════════════════════════════════════════════════════════════════════════ */

/** What a money-aware sentence may say: the money only when the viewer may read it. */
export type ConfirmMoneyWords = { money: boolean; costTzs: number | null; limitTzs: number | null };

/**
 * ONE sentence per service refusal, in English (the console's chrome) — beside `CONFIRM_REFUSAL_COPY`, the pure reasons'
 * table. ⭐ Every one says that nothing was confirmed. ⛔ TZS appears only in `over_limit`, only for a money reader with
 * both figures known.
 */
export const CONFIRM_SERVICE_COPY: Readonly<Record<ConfirmServiceRefusal, (n: ConfirmMoneyWords) => string>> = Object.freeze({
  audience_unreadable: () => `${CAMPAIGN_AUDIENCE_UNREADABLE} Nothing was confirmed.`,
  audience_refused: () =>
    "Your role can't confirm this audience: it uses a filter your role can't count. An officer who may read phone numbers can confirm it. Nothing was confirmed.",
  needs_source_line: () =>
    "This audience can include people from the contact book, so the message must carry its source line — and this campaign has none yet. The owner sets it on Admin → System → Marketing wordings; then save this draft again. Nothing was confirmed.",
  unsaved: () =>
    "This draft was saved with a source line that has since been changed or cleared. Save the draft again, then confirm. Nothing was confirmed.",
  source_unreadable: () => "The saved source line couldn't be read just now — try again in a moment. Nothing was confirmed.",
  no_body: () => "This draft has no saved message to price. Save the Swahili message first. Nothing was confirmed.",
  settings_unreadable: () =>
    "The Marketing SMS settings couldn't be read just now, so this campaign's cost can't be checked against its limit. Try again in a moment. Nothing was confirmed.",
  price_unknown: () =>
    "The price per SMS isn't known, so this campaign's cost can't be checked against its limit. The owner sets it on Admin → System → Marketing SMS. Nothing was confirmed.",
  over_limit: (n) =>
    n.money && n.costTzs !== null && n.limitTzs !== null
      ? `This campaign could cost up to ${formatTzs(n.costTzs)} — more than the ${formatTzs(n.limitTzs)} one campaign may spend. Narrow the audience, or the owner raises the limit on Admin → System → Marketing SMS. Nothing was confirmed.`
      : "This campaign could cost more than one campaign may spend. Narrow the audience, or ask the owner to raise the limit. Nothing was confirmed.",
});

/* ══ THE RULES — exported, and handed in, so the suite can plant each one's absence ══════════════════════════════ */

/**
 * ⛔ E18 · THE SOURCE LINE, AS A CONFIRMATION READS IT. An audience that can reach the contact book (the book, or both)
 * confirms only when its STORED message carries a source line, and only the line saved now: a blank stamp is
 * `needs_source_line`; a stamp the owner has since changed or cleared is `unsaved` (the composer's own test,
 * `composerSourceLineStale` — `test:campaign-gates` holds the two equal); a saved line that could not be read is
 * `source_unreadable`. A players-only campaign prints no source line (E17), so it needs none.
 */
export function sourceLineRefusal(
  row: Pick<StoredSmsCampaign, "sourcePhrase">,
  filter: Pick<ContactAudienceFilter, "population">,
  saved: SourcePhraseRead,
): "needs_source_line" | "unsaved" | "source_unreadable" | null {
  if (filter.population === "players") return null;
  const stamped = typeof row.sourcePhrase === "string" ? row.sourcePhrase.trim() : "";
  if (stamped === "") return "needs_source_line";
  if (!saved || saved.ok !== true) return "source_unreadable";
  const now = typeof saved.phrase === "string" ? saved.phrase.trim() : "";
  return stamped !== now ? "unsaved" : null;
}

/** ⛔ E15 · THE SPEND CEILING: no price is `price_unknown`; strictly above the limit is `over_limit`; at it confirms. */
export function spendRefusal(costTzs: number | null, limitTzs: number): "price_unknown" | "over_limit" | null {
  if (costTzs === null || !Number.isFinite(costTzs)) return "price_unknown";
  return costTzs > limitTzs ? "over_limit" : null;
}

/**
 * ⛔ OD67 · THE FENCE AS THIS VIEWER MAY SEE IT. A viewer who may not read a number sees the COUNT ALONE before a campaign
 * sends, at every size — OD65's one rule, `breakdownVisible`: so no list (they could not check numbers they may not read)
 * and therefore always the TYPED tier — their claim is held to typed, with no members key, and their sample is empty. A
 * reader keeps the fence as counted: both tiers, the list.
 * ⭐ The confirmation holds its FRESH claim to the same shape, so a list watermark posted by such a viewer is refused
 * exactly as a typed tier is refused without its number (`typed_required`); and their confirmation freezes TYPED.
 */
export function fenceForViewer(f: AudienceFence, viewerReads: boolean): AudienceFence {
  if (breakdownVisible(viewerReads)) return f;
  return { claim: { ...f.claim, tier: "typed", membersKey: null }, countedAt: f.countedAt, sample: [] };
}

/**
 * ⛔ DID THIS WRITE LAND? — asked only when the write threw (its reply may have been lost after it committed). The row is
 * this write's only when it holds EVERY value the write's patch set — who and when, the count, the tier, the watermark,
 * the segments, the estimate, the budget — on the revision the write was conditional on. Not its status: the confirm keys
 * are written once, and the campaign may have moved on since. With `confirmInstant`, neither another officer's
 * confirmation nor the same officer's twin in the same millisecond reads as this one.
 */
export function confirmedByThisWrite(after: StoredSmsCampaign | null, t: SmsCampaignTransition): boolean {
  if (after === null) return false;
  if (t.draftRevision !== null && after.draftRevision !== t.draftRevision) return false;
  const row = after as unknown as Record<string, unknown>;
  const set = Object.entries(t.patch).filter(([, v]) => v !== undefined);
  return set.length > 0 && set.every(([k, v]) => row[k] === v);
}

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_CONFIRM_INSTANTS: Map<string, number> | undefined;
}
/** The last confirmation instant handed out per campaign in this process — on globalThis, so a hot reload keeps it. */
const LAST_CONFIRM_MS: Map<string, number> = globalThis.__50PICK_CONFIRM_INSTANTS ?? (globalThis.__50PICK_CONFIRM_INSTANTS = new Map());
/** Campaigns remembered at once — the oldest is forgotten first (a twin is milliseconds apart, never this many apart). */
const CONFIRM_INSTANTS_KEPT = 1000;

/**
 * ⭐ THIS CONFIRMATION'S INSTANT — `now`, moved on by a millisecond when another attempt on the SAME campaign in this
 * process already took that millisecond or a later one. So two attempts never stamp the same `confirmedAt`, and a lost
 * reply's read-back (`confirmedByThisWrite`) tells its own write from a twin's. ⚠️ Per process (the header's residual).
 */
export function confirmInstant(campaignId: string, now: Date): string {
  const last = LAST_CONFIRM_MS.get(campaignId);
  const ms = last !== undefined && now.getTime() <= last ? last + 1 : now.getTime();
  LAST_CONFIRM_MS.delete(campaignId);
  LAST_CONFIRM_MS.set(campaignId, ms);
  if (LAST_CONFIRM_MS.size > CONFIRM_INSTANTS_KEPT) {
    const oldest = LAST_CONFIRM_MS.keys().next().value;
    if (oldest !== undefined) LAST_CONFIRM_MS.delete(oldest);
  }
  return new Date(ms).toISOString();
}

/* ══ THE DEPENDENCIES ════════════════════════════════════════════════════════════════════════════════════════════ */

/** Every read, rule and write the confirmation makes — swappable for the suite's in-process red plants; production never
 *  passes them. */
export type ConfirmDeps = {
  /** The campaign door's two members this needs — the read, and the ONE conditional status write. */
  campaigns: {
    find: (id: string) => Promise<StoredSmsCampaign | null>;
    transition: (id: string, t: SmsCampaignTransition) => Promise<StoredSmsCampaign | null>;
  };
  /** The fresh count and the members key for this draft (`audienceFence`). */
  fence: (c: Pick<StoredSmsCampaign, "id" | "draftRevision" | "audienceFilter">) => Promise<AudienceFence>;
  /** OD67 · the fence as this viewer may see it (`fenceForViewer`). */
  shape: typeof fenceForViewer;
  sign: typeof signFence;
  verify: typeof verifyFence;
  /** OD27 (`decideConfirm`). */
  decide: typeof decideConfirm;
  /** The campaign door's role rule (`campaignAudienceRefusal`, X25 · OD66). */
  refusal: typeof campaignAudienceRefusal;
  /** May this viewer see a breakdown before the campaign sends? (`breakdownVisible`, OD65 — the read cell alone.) */
  breakdown: typeof breakdownVisible;
  /** The split door, asked for a reader only (`audienceSplit`). */
  split: (f: ContactAudienceFilter, viewerReads: boolean) => Promise<AudienceSplitResult>;
  /** E18 (`sourceLineRefusal`). */
  sourceRule: typeof sourceLineRefusal;
  /** The saved source line READ FRESH (`readSavedSourcePhrase`) — by the view and by the confirmation alike. */
  freshLine: () => Promise<SourcePhraseRead> | SourcePhraseRead;
  /** The Marketing SMS settings, re-read (`reloadMarketingSmsSettings`) — the price and the limit. */
  settings: () => Promise<SettingsReload>;
  /** The price of one segment — `estimate.ts`'s ONE cost loader (`loadSegmentCost`): measured from our own delivered sends,
   *  else the configured price handed in, else unknown. */
  cost: typeof loadSegmentCost;
  /** E15 (`spendRefusal`). */
  spendRule: typeof spendRefusal;
  /** This confirmation's instant (`confirmInstant`). */
  stamp: typeof confirmInstant;
  /** A lost reply's read-back (`confirmedByThisWrite`). */
  ownWrite: typeof confirmedByThisWrite;
  audit: (entry: Parameters<typeof audit>[0]) => unknown;
  now: () => Date;
};

/** Frozen: production's confirmation — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const CONFIRM_DEPS: Readonly<ConfirmDeps> = Object.freeze({
  campaigns: Object.freeze({
    find: async (id: string) => db.smsCampaign.find(id),
    transition: async (id: string, t: SmsCampaignTransition) => db.smsCampaign.transition(id, t),
  }),
  fence: audienceFence,
  shape: fenceForViewer,
  sign: signFence,
  verify: verifyFence,
  decide: decideConfirm,
  refusal: campaignAudienceRefusal,
  breakdown: breakdownVisible,
  split: (f: ContactAudienceFilter, viewerReads: boolean) => audienceSplit(f, { viewerReads }),
  sourceRule: sourceLineRefusal,
  freshLine: readSavedSourcePhrase,
  settings: reloadMarketingSmsSettings,
  cost: loadSegmentCost,
  spendRule: spendRefusal,
  stamp: confirmInstant,
  ownWrite: confirmedByThisWrite,
  audit,
  now: () => new Date(),
});

/**
 * ⭐ ruling 543 · whether an awaited audit call left its row — a stand-in that throws, or a result without
 * `recorded: true`, did not (`live-switch.ts`'s `recordedBy`: the same measurement, never a default).
 */
async function recordedBy(deps: ConfirmDeps, entry: Parameters<typeof audit>[0]): Promise<boolean> {
  try {
    const r = await deps.audit(entry);
    return r !== null && typeof r === "object" && (r as { recorded?: unknown }).recorded === true;
  } catch {
    return false;
  }
}

/** The saved source line read fresh — or a read that could not answer (a throw is one). */
async function freshLineOf(deps: ConfirmDeps): Promise<SourcePhraseRead> {
  try {
    return await deps.freshLine();
  } catch {
    return { ok: false };
  }
}

/* ══ THE ESTIMATE ════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⛔ The confirmation reads no credit — that is Start's (E16). The estimate is handed this, so no balance figure exists. */
const NO_BALANCE_READ: BalanceFigure = { kind: "unreadable", why: "never", error: null };

type Spend =
  | { refusal: null; segments: number; perRecipient: number; costTzs: number; limitTzs: number; priceTzs: number | null; priceKind: SegmentCostMeasure["kind"] }
  | { refusal: "no_body"; segments: null; perRecipient: null; costTzs: null; limitTzs: null; priceTzs: null; priceKind: "unknown" }
  | {
      refusal: "settings_unreadable" | "price_unknown" | "over_limit";
      segments: number; perRecipient: number; costTzs: number | null; limitTzs: number | null; priceTzs: number | null;
      priceKind: SegmentCostMeasure["kind"];
    };

/**
 * ⭐ THE ESTIMATE A CONFIRMATION FREEZES (X15): U39's ONE arithmetic (`campaignEstimate`) over the STORED segment counts
 * (`savedVariantSizes`, M16 — never the composer's live counter) × the fresh population × the price; then E15. The
 * settings are re-read (OD63): a row that cannot be read in full is `settings_unreadable`, never its defaults.
 */
async function spendOf(row: StoredSmsCampaign, population: number, deps: ConfirmDeps): Promise<Spend> {
  const variants = savedVariantSizes(row);
  if (variants === null) {
    return { refusal: "no_body", segments: null, perRecipient: null, costTzs: null, limitTzs: null, priceTzs: null, priceKind: "unknown" };
  }
  let reload: SettingsReload;
  try {
    reload = await deps.settings();
  } catch {
    reload = { ok: false, error: "the settings read threw" };
  }
  const readable = reload.ok && reload.readable;
  const configured = reload.ok && reload.readable ? reload.settings.pricePerSegmentTzs : null;
  const limitTzs = reload.ok && reload.readable ? reload.settings.campaignLimitTzs : null;
  let cost: SegmentCostMeasure;
  try {
    cost = await deps.cost(configured);
  } catch {
    cost = configured !== null ? { kind: "configured", tzsPerSegment: configured } : { kind: "unknown", reason: "history-unreadable" };
  }
  const e = campaignEstimate({ audience: { ok: true, population, forecast: null }, pace: null, money: { cost, balance: NO_BALANCE_READ, reserveTzs: 0 } }, variants);
  if (e.billableSegments === null || e.segmentsPerRecipient === null) {
    return { refusal: "no_body", segments: null, perRecipient: null, costTzs: null, limitTzs: null, priceTzs: null, priceKind: "unknown" };
  }
  const base = {
    segments: e.billableSegments, perRecipient: e.segmentsPerRecipient,
    costTzs: e.money?.costTzs ?? null, priceTzs: e.money?.tzsPerSegment ?? null, priceKind: cost.kind,
  };
  if (!readable || limitTzs === null) return { ...base, refusal: "settings_unreadable", limitTzs };
  const over = deps.spendRule(base.costTzs, limitTzs);
  if (over !== null || base.costTzs === null) return { ...base, refusal: over ?? "price_unknown", limitTzs };
  return { ...base, refusal: null, costTzs: base.costTzs, limitTzs };
}

const moneyWords = (viewer: ConfirmViewer, s: Pick<Spend, "costTzs" | "limitTzs">): ConfirmMoneyWords =>
  ({ money: viewer.money, costTzs: s.costTzs, limitTzs: s.limitTzs });

/* ══ THE VIEW ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ OD65 · THE AUDIENCE AS THIS VIEWER MAY SEE IT. A viewer who may not read a number: the count alone, over the FENCE's
 * count — the gate is never asked (the split door is not called). A reader: U38b's ONE view-model over the split door,
 * or null when the split failed — never zeros.
 */
async function audienceViewFor(filter: ContactAudienceFilter, count: number, viewer: ConfirmViewer, deps: ConfirmDeps): Promise<AudienceSplitView | null> {
  if (!deps.breakdown(viewer.reads)) return audienceCountView(contactAudienceKey(filter), count);
  try {
    const r = await deps.split(filter, viewer.reads);
    return r.ok ? audienceSplitView(r.split, viewer.reads) : null;
  } catch {
    return null;
  }
}

/**
 * ⭐ WHAT A CONFIRMATION IS OPENED ON — counted fresh, every call: the watermark the modal posts back, the tier, the number
 * to type, the audience in words and as this viewer may see it, the list (a reader's), the estimate it would freeze, and
 * why it is blocked: the first refusal a correctly typed confirmation of this view would get, in its own words — read
 * from the same sources, the source line included (fresh, as the confirmation reads it; never this process's cache, which
 * would say `unsaved` for every book draft before the wordings have loaded, and stale things on a stale instance).
 * ⛔ null when the campaign does not exist; a failed read THROWS (the host says so — never a zero).
 */
export async function campaignConfirmView(campaignId: string, viewer: ConfirmViewer, deps: ConfirmDeps = CONFIRM_DEPS): Promise<CampaignConfirmView | null> {
  const row = await deps.campaigns.find(campaignId);
  if (row === null) return null;
  const uncounted = (blocked: ConfirmBlocked, message: string): CampaignConfirmView => ({
    campaignId: row.id, watermark: null, tier: null, count: null, countedAt: null, describe: [], split: null, sample: [],
    estimate: null, blocked, message,
  });
  if (row.status !== "DRAFT") return uncounted("not_draft", CONFIRM_REFUSAL_COPY.not_draft({ fresh: null, shown: null }));
  const read = readCampaignAudience(row.audienceFilter);
  const none: ConfirmMoneyWords = { money: viewer.money, costTzs: null, limitTzs: null };
  if (!read.ok) return uncounted("audience_unreadable", CONFIRM_SERVICE_COPY.audience_unreadable(none));
  const filter = read.filter;
  // ⛔ OD66 · BEFORE THE COUNT: a filter this viewer's role may not count is never counted for them.
  if (deps.refusal(filter, viewer.reads) !== null) return uncounted("audience_refused", CONFIRM_SERVICE_COPY.audience_refused(none));

  // ⛔ OD67 · what this viewer may see of the fence — a viewer who may not read a number: typed, no key, no list.
  const seen = deps.shape(await deps.fence(row), viewer.reads);
  const count = seen.claim.count;
  const split = await audienceViewFor(filter, count, viewer, deps);
  const spend = await spendOf(row, count, deps);
  const line = deps.sourceRule(row, filter, await freshLineOf(deps));
  // The order is the confirmation's: nobody (the gate's first answer), then E18, then the estimate.
  const blocked: Exclude<ConfirmBlocked, "not_draft"> | null = count === 0 ? "audience_empty" : line ?? spend.refusal;
  const message = blocked === null ? null
    : blocked === "audience_empty" ? CONFIRM_REFUSAL_COPY.audience_empty({ fresh: count, shown: null })
      : CONFIRM_SERVICE_COPY[blocked](moneyWords(viewer, spend));
  const estimate: CampaignConfirmEstimate | null = spend.segments === null ? null : {
    segments: spend.segments,
    perRecipient: spend.perRecipient,
    // ⛔ No money key at all for a viewer who may not read money.
    money: viewer.money ? { costTzs: spend.costTzs, limitTzs: spend.limitTzs, priceTzs: spend.priceTzs, priceKind: spend.priceKind } : null,
  };
  return {
    campaignId: row.id,
    watermark: deps.sign(seen.claim),
    tier: seen.claim.tier,
    count,
    countedAt: seen.countedAt,
    describe: describeAudience(filter),
    split,
    sample: seen.sample,
    estimate,
    blocked,
    message,
  };
}

/* ══ THE CONFIRMATION ════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ CONFIRM ONE DRAFT — in the header's order, with ONE write. Every answer is audited once (COMPLIANCE), and a
 * confirmation's answer says whether its row was recorded.
 * ⛔ The freeze is ALWAYS the fresh count (`decideConfirm`'s), never the claim the browser carried.
 */
export async function confirmCampaign(
  input: ConfirmCampaignInput,
  viewer: ConfirmViewer,
  deps: ConfirmDeps = CONFIRM_DEPS,
): Promise<ConfirmCampaignResult> {
  const actorId = typeof input?.actorId === "string" ? input.actorId.trim() : "";
  if (actorId === "") throw new Error("confirmCampaign: no officer — nothing was confirmed");
  const id = typeof input?.campaignId === "string" ? input.campaignId : "";
  const typed = typeof input?.typed === "string" ? input.typed : null;
  const shown = deps.verify(typeof input?.watermark === "string" ? input.watermark : null);

  const refuse = async (
    reason: ConfirmOutcomeReason | ConfirmServiceRefusal,
    at: { targetId: string | null; freshCount: number | null; tier: ConfirmTier | null; message: string },
  ): Promise<ConfirmCampaignResult> => {
    await recordedBy(deps, {
      category: "COMPLIANCE",
      action: CAMPAIGN_CONFIRM_REFUSED_ACTION,
      actorId,
      targetType: "SmsCampaign",
      targetId: at.targetId,
      payload: { reason, shownCount: shown?.count ?? null, freshCount: at.freshCount, tier: at.tier },
    });
    return { ok: false, reason, freshCount: at.freshCount, message: at.message };
  };

  // ── find: a DRAFT ──
  const row = id === "" ? null : await deps.campaigns.find(id);
  if (row === null) return refuse("not_found", { targetId: null, freshCount: null, tier: null, message: CONFIRM_REFUSAL_COPY.not_found({ fresh: null, shown: null }) });
  if (row.status !== "DRAFT") {
    return refuse("not_draft", { targetId: row.id, freshCount: null, tier: null, message: CONFIRM_REFUSAL_COPY.not_draft({ fresh: null, shown: null }) });
  }
  const none: ConfirmMoneyWords = { money: viewer.money, costTzs: null, limitTzs: null };

  // ── the stored audience, and this viewer's role rule — before anything is counted (OD66) ──
  const read = readCampaignAudience(row.audienceFilter);
  if (!read.ok) {
    return refuse("audience_unreadable", { targetId: row.id, freshCount: null, tier: null, message: CONFIRM_SERVICE_COPY.audience_unreadable(none) });
  }
  const filter = read.filter;
  if (deps.refusal(filter, viewer.reads) !== null) {
    return refuse("audience_refused", { targetId: row.id, freshCount: null, tier: null, message: CONFIRM_SERVICE_COPY.audience_refused(none) });
  }

  // ── a fresh fence, held to what this viewer may see (OD67), and the gate (OD27) ──
  const seen = deps.shape(await deps.fence(row), viewer.reads);
  const decision = deps.decide({ fresh: seen.claim, shown, typed });
  if (!decision.ok) {
    return refuse(decision.reason, {
      targetId: row.id, freshCount: decision.freshCount, tier: decision.freshTier,
      message: CONFIRM_REFUSAL_COPY[decision.reason]({ fresh: decision.freshCount, shown: decision.shownCount }),
    });
  }
  const freeze = decision.freeze;

  // ── E18 · the source line, read fresh — this acts on it ──
  const line = deps.sourceRule(row, filter, await freshLineOf(deps));
  if (line !== null) {
    return refuse(line, { targetId: row.id, freshCount: freeze.count, tier: freeze.tier, message: CONFIRM_SERVICE_COPY[line](none) });
  }

  // ── the estimate frozen (X15), and E15 · the limit ──
  const spend = await spendOf(row, freeze.count, deps);
  if (spend.refusal !== null) {
    return refuse(spend.refusal, { targetId: row.id, freshCount: freeze.count, tier: freeze.tier, message: CONFIRM_SERVICE_COPY[spend.refusal](moneyWords(viewer, spend)) });
  }

  // ── ONE conditional write: DRAFT → CONFIRMED, on the revision the officer saw, every confirm key at once ──
  const at = deps.stamp(row.id, deps.now());
  const t: SmsCampaignTransition = {
    from: ["DRAFT"],
    to: "CONFIRMED",
    patch: {
      audienceCount: freeze.count,
      confirmTier: CONFIRM_TIER_COLUMN[freeze.tier],
      audienceWatermark: freeze.audienceWatermark,
      estimateSegments: spend.segments,
      estimateTzs: spend.costTzs,
      budgetTzs: spend.limitTzs,
      confirmedBy: actorId,
      confirmedAt: at,
    },
    draftRevision: freeze.draftRevision,
    at,
  };
  let moved: StoredSmsCampaign | null;
  try {
    moved = await deps.campaigns.transition(row.id, t);
  } catch (err) {
    // ⛔ A write whose reply was lost may have committed — look once before answering, and claim only THIS write.
    const after = await deps.campaigns.find(row.id).catch(() => null);
    if (!deps.ownWrite(after, t)) throw err;
    moved = after;
  }
  if (moved === null) {
    const why = confirmWriteRefusal(await deps.campaigns.find(row.id));
    return refuse(why, {
      targetId: row.id, freshCount: freeze.count, tier: freeze.tier,
      message: CONFIRM_REFUSAL_COPY[why]({ fresh: freeze.count, shown: shown?.count ?? null }),
    });
  }
  const recorded = await recordedBy(deps, {
    category: "COMPLIANCE",
    action: CAMPAIGN_CONFIRMED_ACTION,
    actorId,
    targetType: "SmsCampaign",
    targetId: row.id,
    // ⛔ The audience as the chain may hold it (masked, a name search by its length), the counts as numbers — no person.
    payload: {
      tier: freeze.tier,
      count: freeze.count,
      describe: auditContactAudience(filter),
      draftRevision: freeze.draftRevision,
      estimateSegments: spend.segments,
      budgetSet: true,
    },
  });
  return { ok: true, count: freeze.count, tier: freeze.tier, recorded };
}
