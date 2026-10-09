/**
 * ⭐ U47b-1 · THE LIVE CAMPAIGN PAGE'S ONE VIEW-MODEL — `campaignLiveView`, what `/admin/campaigns/[id]` renders first AND
 * what every step and every poll hands back, so the browser never computes a figure (ENGINE-SPEC §4.15 decisions 2 and 8;
 * E22 · E23 · E25 · OD24 · OD26 · OD34 · OD41 · OD65 · OD66).
 *
 * ── ONE READ OF THE ROWS (decision 8, OD26) ─────────────────────────────────────────────────────────────────────────────
 * Every figure about the people on the campaign — the KPIs, the chips, the bar, the headline's counts, "not sent" by reason
 * and what was left when it stopped — comes from ONE groupBy over the recipient rows by (status, skipReason, failureClass)
 * (`countByOutcome`, both twins), asked ONCE per view. No figure is a counter, none is read a second time, and none is
 * worked out from another view's: two figures on one page can never disagree.
 * ⛔ NO CLOCK IN A FIGURE (OD34): the bar is `campaignProgress` over those counts and nothing else — two views of an
 * unchanged campaign ten seconds apart are the same bar, byte for byte. The clock decides only `readAt`, whether the send
 * window is open now, and whether nobody has claimed anything for 90 s.
 *
 * ── THE KPIS (decision 8) — the rows split five ways, each status in exactly one ────────────────────────────────────────
 *   waiting = PENDING + HELD (⛔ HELD still owes a message — 4 SENT and 6 HELD read "4 of 10", never 10 of 10) · handed over =
 *   SENT + DELIVERED (the network took it; a receipt said delivered of some — U48a splits them) · failed = FAILED · not
 *   sent = SKIPPED (the checks refused them — the system working, never a failure, OD40) · no answer = UNCONFIRMED.
 * "Not sent", by reason: U38b's FIVE words (`AUDIENCE_BUCKET_OF` → `AUDIENCE_REASON_LABEL`; ⛔ PROTECTED IS ONE LINE for
 * every role — a self-exclusion, a break, a harm marker, an age, the account's status are never named apart), dominant
 * first, ties in U38b's order — then "Can't be sent to" (an unsendable number) and a refusal this code has no word for,
 * each only when there is one, so the lines always add up to "Not sent".
 *
 * ── U48a · THE RESULTS (`results`, filled by campaign-results.ts) ──────────────────────────────────────────────────────────
 * The receipts' half of the same rows (ENGINE-SPEC §4.16): "Delivered" is what a receipt said and nothing else, "handed over,
 * no receipt yet" is the rest of what the network took, the failed split by where they failed, "not sent" by the SAME five
 * words, "no answer", what is still to be messaged (or was not, once stopped), the people it reached who have stopped offers
 * since — and the honesty lines rendered from the data (OD41). It reads the ONE groupBy's groups and counts, handed in, and
 * the "not sent" list this file words; it asks only the three things the groupBy cannot answer (a count of the SENT rows handed
 * over before the 15-minute cutoff, the stop walk, and — for a money reader — the price). ⛔ Below E23's floor there are NO
 * results: `null`, so the floor's sentence stands alone and nothing can name a split.
 *
 * ── WHO SEES WHAT ──────────────────────────────────────────────────────────────────────────────────────────────────────
 * ⛔ E23 · THE FLOOR — a viewer whose `identity.contact` cell is not `read` (`viewer.reads` false), on a campaign with fewer
 * than `MASKED_BREAKDOWN_MIN` (10) rows, sees the count on the campaign and the bar, and NO per-state split: every KPI but
 * "On campaign" is null, and the reasons and the chips are null (`floor` says why). The floor counts the ROWS — the people
 * whose messages were actually decided — never the confirmed count, which a shrunken list can sit far above. A reader sees
 * everything (OD65 keeps this floor for the surfaces that count messages actually sent; the count alone, at every size,
 * is for the screens before a campaign sends).
 * ⛔ AND THE WORDING NEVER LEAKS WHAT THE FLOOR HIDES: a sentence that advises a copy says "a copy would message them
 * again" as a FACT only when the viewer may see whether anybody was messaged; under the floor it says it as a CONDITION,
 * whatever the counts are (`liveReach`). A campaign that never ran (`enqueuedAt` null) reached nobody by construction.
 * ⛔ NOR DOES WHY IT PAUSED (the U47b-1 review): below the floor every engine reason reads ONE sentence
 * (`pausedReasonSentenceFor` — some reasons can only be written once somebody on the list passed the checks for the wire);
 * the reasons found before anybody is checked keep their words.
 * ⛔ OD24 · MONEY only for `viewer.money` (the caller's `campaignMoneyVisible`): `money` is null, and the Start dialog
 * carries no TZS, for anyone else — no figure exists in their view for a render to leak.
 * ⛔ OD66 · A STORED AUDIENCE THIS VIEWER'S ROLE MAY NOT COUNT (`campaignAudienceRefusal` — both populations, a search, a
 * consent, source, player or stop filter) is never described to them (`audienceLines` says so instead), Start is disabled
 * for them with Start's own refusal (`campaign-control.ts` refuses it too, before anything is counted), and Make a copy is
 * disabled (the draft door would refuse the copy's audience for them).
 * ⛔ No phone number anywhere in the view: the audience in words is `describeAudience` (a whole number masked), the people
 * are counts, the officers are their display names.
 *
 * ── THE STANDING FACTS ─────────────────────────────────────────────────────────────────────────────────────────────────
 * The switch (through THE gate — the console stub passes), the send window (`liveSendWindow`, failing closed), the last
 * claim (`lastActivity`), "nobody driving" (RUNNING, no claim for 90 s — the page shows it to a viewer who cannot act, or
 * before its own driver has run) and "keep this page open" (an acting viewer, PREPARING or RUNNING).
 * The controls (decision 4) are ALWAYS present, each with its reason when disabled — the role's first, then a draft's,
 * then the status's, then Start's switch and OD66, Make a copy's audience.
 *
 * ⛔ IT READS AND WRITES NOTHING ELSE: no transition, no audit row, no claim. A read that FAILS throws (the page says it
 * could not load; the driver stops) — except the switch (unreadable = closed), the window (unreadable = closed) and the
 * names of the officers who acted (unread = "an officer").
 *
 * Guard: `npm run test:campaign-visuals` §svc (V2 · V3 · S1–S9 · W1 · P1) · Red: `npm run red:campaign-visuals` (in memory).
 */
import { db } from "@/lib/server/store";
import type {
  SmsCampaignRecipientOutcomeCount, SmsCampaignRecipientStatus, SmsCampaignRecipientStatusCounts, SmsCampaignStatus,
  StoredSmsCampaign,
} from "@/lib/server/store";
import { getAuditForTargetDurable } from "@/lib/server/audit";
import type { AuditEntry } from "@/lib/server/audit";
import { officerLabel } from "@/lib/server/actor-label";
import { lastOtpFailureAt, smsProviderResolution } from "@/lib/server/sms";
import { moneyBusy } from "@/lib/server/money-busy";
import type { MoneyBusy } from "@/lib/server/money-busy";
import { otpFailureWaiting } from "@/lib/marketing/engine-rules";
import type { SmsProviderResolution } from "@/lib/server/sms";
import { marketingLiveGate, readMarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import type { MarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import { liveSendWindow } from "@/lib/server/marketing/dispatch";
import { sendWindowUnreadable } from "@/lib/marketing/window";
import type { SendWindowState } from "@/lib/marketing/window";
import { readCampaignAudience } from "@/lib/server/marketing/audience-fence";
import { campaignAudienceParams, campaignAudienceRefusal } from "@/lib/server/marketing/audience";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { AUDIENCE_BUCKETS, AUDIENCE_BUCKET_OF } from "@/lib/server/marketing/audience-split";
import type { AudienceBucket } from "@/lib/server/marketing/audience-split";
import type { MarketingSkipReason } from "@/lib/server/marketing/consent";
import { resumeOutstanding } from "@/lib/server/marketing/start-check";
import { RESULTS_DEPS, campaignResults } from "@/lib/server/marketing/campaign-results";
import type { ResultsDeps } from "@/lib/server/marketing/campaign-results";
import {
  CAMPAIGN_STATUS_VIEW, MASKED_BREAKDOWN_MIN, campaignProgress, outcomeStatusCounts, outstandingRows, recipientRows,
} from "@/lib/marketing/campaign-status";
import type { CampaignChipVariant, CampaignProgress } from "@/lib/marketing/campaign-status";
import { AUDIENCE_REASON_LABEL } from "@/app/admin/campaigns/new/audience-copy";
import { campaignRowAudience } from "@/app/admin/campaigns/campaigns-loader";
import {
  CAMPAIGNS_AUDIENCE_EVERYONE, CAMPAIGNS_AUDIENCE_HIDDEN, CAMPAIGNS_AUDIENCE_UNREADABLE,
} from "@/app/admin/campaigns/campaigns-copy";
import {
  FLOOR_SAFE_STOP_REASONS, LIVE_DISABLED, LIVE_FLOOR, LIVE_HEADLINE, LIVE_PAUSED_HIDDEN, LIVE_PAUSED_HIDDEN_VIEW, LIVE_SOMEBODY, NOT_SENT_EXTRA,
  RECIPIENT_STATUS_LABEL, START_AUDIENCE_REFUSED, copyCantTravelSentence, eatClock, officerPausedSentence, pausedReasonSentence,
  preparingHeadline, sendingHeadline, startDialog, stopDialog, stoppedHeadline,
} from "@/app/admin/campaigns/[id]/live-copy";
import type { LiveReach } from "@/app/admin/campaigns/[id]/live-copy";

/* ══ THE NUMBERS ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** "Nobody is driving": a RUNNING campaign with no claim this long — or a PREPARING one with no chunk written this long, the
 *  review's MINOR 5 (§4.15 "Standing callouts"). */
export const NOBODY_DRIVING_AFTER_MS = 90_000;
/** How many of the campaign's newest audit rows are read to name who paused or stopped it. */
export const LIVE_ACTS_READ = 50;

/** The audit actions the view reads to name an officer's act — the spellings `campaign-control.ts` writes. */
export const OFFICER_PAUSED_ACTION = "marketing.campaign_paused";
export const OFFICER_STOPPED_ACTION = "marketing.campaign_stopped";

/* ══ THE SHAPES (§4.15 "APIs") ══════════════════════════════════════════════════════════════════════════════════════ */

/** A control: always present; disabled with its reason (decision 4). */
export type ControlState = { enabled: boolean; reason: string | null };

/** Who is looking — decided by the CALLER from the viewer's STORED role, every time; there is no default. `mayAct`: the
 *  growth act grant (decision 7); `reads`: the `identity.contact` cell is `read`; `money`: `campaignMoneyVisible`. */
export type LiveViewer = { userId: string; mayAct: boolean; reads: boolean; money: boolean };

/**
 * ⭐ U48a · WHAT BECAME OF THE MESSAGES (ENGINE-SPEC §4.16; campaign-results.ts builds it, results-card.tsx prints it). Counts
 * of PEOPLE, summed on the server from the view's one groupBy — the browser adds nothing. `null` where the viewer is below
 * E23's floor, and for a campaign with nobody on its list. ⛔ `delivered` is the rows a RECEIPT moved to DELIVERED and nothing
 * else (OD41). A `null` count is a read that failed — said by the card, never drawn as a zero.
 */
export type CampaignResultsView = {
  /** DELIVERED — a receipt said so. */
  delivered: number;
  /** SENT — handed over to the network; no receipt has moved them. */
  handedOver: number;
  /** …of them, handed over more than 15 minutes ago (E5); null when it could not be counted. */
  noReceiptAfter15: number | null;
  /** FAILED, split by where: the network refused them (`wire`) or reported them undelivered by a receipt (`receipt`). */
  failed: { total: number; wire: number; receipt: number };
  /** SKIPPED, by U38b's five words (+ the unsendable and the unworded, only when there are any) — the same list as the figures. */
  notSent: { total: number; reasons: Array<{ label: string; count: number }> };
  /** UNCONFIRMED — handed to the network with no answer back. */
  noAnswer: number;
  /** PENDING + HELD still to be messaged — or, once the campaign was stopped, everybody it did not message (the headline's figure). */
  left: { count: number; stopped: boolean };
  /** E30 · people this campaign reached who have stopped offers since its message, whatever way (the stop list, the ledger's
   *  latest word) — erasure-blind by design (X22: an erasure adds nobody and takes nobody out); null when it could not be
   *  counted. */
  stoppedSince: number | null;
  /** OD41 · which honesty lines stand, decided from the data. */
  honesty: { noReceiptYet: boolean; notSetUp: boolean };
  /** OD24 · handed over × the configured price — for a viewer who may read money ONLY, and null while nothing was handed over. */
  spend: null | { tzs: number; handedOver: number; perSmsTzs: number };
};

/** "Not sent", by reason: one of U38b's five, an unsendable number, or a refusal this code has no word for. */
export type NotSentBucket = AudienceBucket | "unsendable" | "other";

export type CampaignLiveView = {
  id: string;
  name: string;
  status: SmsCampaignStatus;
  statusLabel: string;
  chip: CampaignChipVariant;
  /** The one sentence for the status. */
  headline: string;
  /** Why it is paused or stopped: an officer's act with who and when (from its audit row), else the engine's reason. */
  stopSentence: string | null;
  /** The stored audience in words — or that this viewer's role may not see it, or that it cannot be read. */
  audienceLines: string[];
  confirmed: { count: number; at: string; byName: string | null } | null;
  progress: CampaignProgress | null;
  /** null under the floor — all but `onCampaign`. */
  kpis: { onCampaign: number; handedOver: number | null; failed: number | null; notSent: number | null; noAnswer: number | null; waiting: number | null };
  /** U38b's five words, dominant first (then the unsendable and the unworded, only when there are any); null under the floor. */
  notSentReasons: Array<{ label: string; count: number }> | null;
  /** Each status with rows, in the schema's order; null under the floor. */
  chips: Array<{ status: SmsCampaignRecipientStatus; label: string; count: number }> | null;
  standing: {
    switchOpen: boolean; switchClosesAt: string | null; window: SendWindowState; lastStepAt: string | null; nobodyDriving: boolean;
    keepOpen: boolean;
  };
  controls: { start: ControlState; pause: ControlState; resume: ControlState; stop: ControlState; copy: ControlState };
  /** ⭐ As built (beyond §4.15's APIs): the Start dialog's words — null while Start is disabled — with the frozen estimate
   *  and limit for a money reader only; and the Stop dialog's, whose copy advice follows `liveReach`. */
  startDialog: { title: string; body: string } | null;
  stopDialog: { title: string; body: string };
  /** ⭐ As built: the floor's sentence when the breakdown is hidden from this viewer, else null. */
  floor: string | null;
  /** OD24 · null unless `viewer.money`. */
  money: null | { estimateTzs: number | null; budgetTzs: number | null };
  results: CampaignResultsView | null;
  readAt: string;
};

/* ══ THE RULES — pure, exported, and handed in, so the suite can plant each one's absence ═══════════════════════════════ */

/** ⛔ E23 · is the breakdown hidden from this viewer? Only from one who may not read a number, below the floor of ROWS —
 *  and ⭐ only when there IS a split to hide (the U47b-1 review): a list not written yet (0 rows — a CONFIRMED campaign, or one
 *  paused or stopped before its first chunk) has nothing in it to reveal, and zero KPIs leak nothing. */
export function liveBreakdownHidden(viewerReads: boolean, rows: number): boolean {
  return viewerReads !== true && rows > 0 && rows < MASKED_BREAKDOWN_MIN;
}

/** OD24 · may this view carry money? Exactly the caller's decider (`campaignMoneyVisible`), never a default. */
export function liveMoneyVisible(viewer: Pick<LiveViewer, "money">): boolean {
  return viewer?.money === true;
}

/** A skipped row's line under "Not sent": U38b's bucket for a gate reason (protected one line), else unworded. */
export function notSentBucketOf(skipReason: string | null): NotSentBucket {
  if (typeof skipReason === "string" && Object.prototype.hasOwnProperty.call(AUDIENCE_BUCKET_OF, skipReason)) {
    return AUDIENCE_BUCKET_OF[skipReason as MarketingSkipReason];
  }
  return "other";
}

/** Rows HANDED to the network — SENT, DELIVERED, UNCONFIRMED: people a copy would message again (start-check's own). */
const messagedRows = (counts: SmsCampaignRecipientStatusCounts): number => counts.SENT + counts.DELIVERED + counts.UNCONFIRMED;

/**
 * ⭐ WHAT A COPY-ADVISING SENTENCE MAY SAY (the header): `none` when nobody on the list was handed a message — or the
 * campaign never ran (`enqueuedAt` null: no slice ever claimed anyone); otherwise, ⛔ for a viewer below the floor,
 * `hidden` WHATEVER the counts (the wording would otherwise say whether anybody was messaged); else `reached` or `none`.
 */
export function liveReach(
  c: Pick<StoredSmsCampaign, "enqueuedAt">,
  counts: SmsCampaignRecipientStatusCounts,
  viewerReads: boolean,
  hidden: (viewerReads: boolean, rows: number) => boolean = liveBreakdownHidden,
): LiveReach {
  if (typeof c.enqueuedAt !== "string" || c.enqueuedAt === "") return "none";
  if (hidden(viewerReads, recipientRows(counts))) return "hidden";
  return messagedRows(counts) > 0 ? "reached" : "none";
}

/**
 * ⭐ COULD A GROUP BE ON ITS WAY? (the U47b-2 review's NIT) — only a campaign that has begun SENDING: RUNNING, or PAUSED after
 * its list was finished (`enqueuedAt`). A confirmed campaign, or one still writing its list, has no slice that could be past
 * its last check, so a Stop dialog and a Stop toast that warned of "a group already being sent" were saying something false.
 */
export function sendingStarted(c: Pick<StoredSmsCampaign, "status" | "enqueuedAt">): boolean {
  if (c.status === "RUNNING") return true;
  return c.status === "PAUSED" && typeof c.enqueuedAt === "string" && c.enqueuedAt !== "";
}

/**
 * ⛔ E23 · WHY A CAMPAIGN PAUSED, AS THIS VIEWER MAY READ IT — the ONE function every surface says a paused campaign's
 * reason through (the live page here; U47b-2 routes the campaigns LIST's line through it too — the U47b-1 review). Below
 * the floor (`hidden`) every ENGINE reason reads ONE sentence (`LIVE_PAUSED_HIDDEN`): some can only be written once
 * somebody on the list passed the checks for the wire, and a sentence kept for those alone would say so by being said. The
 * reasons that read no person keep their words (`FLOOR_SAFE_STOP_REASONS` — the copy advice then as a condition,
 * `liveReach`). Above the floor, and for a reader: `pausedReasonSentence` by reach. ⭐ Its re-review: a viewer who may
 * only VIEW reads the neutral sentence without "press Resume" (`LIVE_PAUSED_HIDDEN_VIEW`).
 */
export function pausedReasonSentenceFor(
  viewer: Pick<LiveViewer, "reads" | "mayAct">,
  c: Pick<StoredSmsCampaign, "stopReason" | "enqueuedAt">,
  counts: SmsCampaignRecipientStatusCounts,
  hidden: (viewerReads: boolean, rows: number) => boolean = liveBreakdownHidden,
): string {
  const reads = viewer?.reads === true;
  const key = typeof c.stopReason === "string" ? c.stopReason.trim() : "";
  if (hidden(reads, recipientRows(counts)) && !FLOOR_SAFE_STOP_REASONS.includes(key)) {
    return viewer?.mayAct === true ? LIVE_PAUSED_HIDDEN : LIVE_PAUSED_HIDDEN_VIEW;
  }
  return pausedReasonSentence(key, liveReach(c, counts, reads, hidden));
}

/** The stored audience, as a copy carries it: read at the campaign's door, allowed to THIS viewer (the draft door holds a
 *  posted filter to the viewer's role rule), and writable as the composer's address exactly (`campaignAudienceParams`). */
export type CopyTravel = { ok: true; params: Record<string, string>; filter: ContactAudienceFilter } | { ok: false };

/** ⛔ Can this campaign's audience be carried into a copy by this viewer? (Make a copy is refused when it cannot.) */
export function copyTravel(c: Pick<StoredSmsCampaign, "audienceFilter">, viewerReads: boolean): CopyTravel {
  const read = readCampaignAudience(c.audienceFilter);
  if (!read.ok) return { ok: false };
  if (campaignAudienceRefusal(read.filter, viewerReads === true) !== null) return { ok: false };
  const params = campaignAudienceParams(read.filter);
  return params === null ? { ok: false } : { ok: true, params, filter: read.filter };
}

/** ⛔ OD66 at Start: does this viewer's role refuse to count the stored audience? (A reader is refused nothing here; a
 *  filter that cannot be read is Start's own `audience_unreadable`.) Asked without the ticked selection, which every role
 *  is refused and which says nothing about a role (the composer's own reading). */
export function startAudienceRefusedFor(c: Pick<StoredSmsCampaign, "audienceFilter">, viewerReads: boolean): { param: string } | null {
  if (viewerReads === true) return null;
  const read = readCampaignAudience(c.audienceFilter);
  if (!read.ok) return null;
  const refused = campaignAudienceRefusal({ ...read.filter, ids: null }, false);
  return refused === null ? null : { param: refused.param };
}

/* ══ THE DOORS ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Every read and rule the view makes — swappable for the suite's in-process plants; production passes none. */
export type LiveViewDeps = {
  campaigns: { find: (id: string) => Promise<StoredSmsCampaign | null> };
  recipients: {
    /** ⭐ THE ONE GROUPBY (decision 8). */
    countByOutcome: (campaignId: string) => Promise<SmsCampaignRecipientOutcomeCount[]>;
    /** The newest claim's instant (U43a), for "nobody driving". */
    lastActivity: (campaignId: string) => Promise<string | null>;
  };
  provider: () => SmsProviderResolution;
  liveSwitch: () => Promise<MarketingLiveSwitch>;
  liveGate: typeof marketingLiveGate;
  /** U13 · the send window (`liveSendWindow` — fails closed). */
  window: () => SendWindowState | Promise<SendWindowState>;
  /** ⭐ The U47b-1 review · the engine's own two waits a page cannot see from the rows — money first (E12, `moneyBusy`) and
   *  a login code failed in the last `OTP_FAILURE_WAIT_MS` (`lastOtpFailureAt`) — so "nobody driving" is never said while
   *  an officer's page is correctly waiting. */
  moneyBusy: () => MoneyBusy;
  otpLastFailureAt: () => number | null;
  /** An officer's display name, or null (the page then says "an officer"). */
  officerName: (userId: string) => Promise<string | null>;
  /** The campaign's newest audit rows, newest first — to name who paused or stopped it. */
  actsOn: (campaignId: string) => Promise<AuditEntry[]>;
  rules: {
    progress: typeof campaignProgress;
    breakdownHidden: typeof liveBreakdownHidden;
    moneyVisible: typeof liveMoneyVisible;
    bucketOf: typeof notSentBucketOf;
    outstanding: typeof resumeOutstanding;
    /** ⛔ E23 · a paused reason as this viewer may read it (`pausedReasonSentenceFor`). */
    pausedReason: typeof pausedReasonSentenceFor;
    /** E12 · the engine's ONE reading of a code failure (`otpFailureWaiting`, step ④e's own). */
    otpWaiting: typeof otpFailureWaiting;
  };
  /** ⭐ U48a · the results' own three reads and rules (campaign-results.ts). */
  results: ResultsDeps;
  now: () => Date;
};

/** Frozen: production's view — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const LIVE_VIEW_DEPS: Readonly<LiveViewDeps> = Object.freeze({
  campaigns: Object.freeze({ find: async (id: string) => db.smsCampaign.find(id) }),
  recipients: Object.freeze({
    countByOutcome: async (campaignId: string) => db.smsCampaignRecipient.countByOutcome(campaignId),
    lastActivity: async (campaignId: string) => db.smsCampaignRecipient.lastActivity(campaignId),
  }),
  provider: smsProviderResolution,
  liveSwitch: () => readMarketingLiveSwitch(),
  liveGate: marketingLiveGate,
  window: liveSendWindow,
  moneyBusy: () => moneyBusy(),
  otpLastFailureAt: lastOtpFailureAt,
  officerName: async (userId: string) => {
    const name = await officerLabel(userId, { fallback: () => "" });
    return typeof name === "string" && name.trim() !== "" ? name.trim() : null;
  },
  actsOn: async (campaignId: string) => (await getAuditForTargetDurable("SmsCampaign", campaignId, { limit: LIVE_ACTS_READ })).entries,
  rules: Object.freeze({
    progress: campaignProgress, breakdownHidden: liveBreakdownHidden, moneyVisible: liveMoneyVisible, bucketOf: notSentBucketOf,
    outstanding: resumeOutstanding, pausedReason: pausedReasonSentenceFor, otpWaiting: otpFailureWaiting,
  }),
  results: RESULTS_DEPS,
  now: () => new Date(),
});

/* ══ THE PIECES ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

const isCount = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
const off = (reason: string): ControlState => ({ enabled: false, reason });
const ON: ControlState = Object.freeze({ enabled: true, reason: null }) as ControlState;

/** The window, read through the deps. ⛔ A read that throws, or answers anything but a window, is CLOSED. */
async function windowOf(deps: LiveViewDeps): Promise<SendWindowState> {
  try {
    const w = await deps.window();
    return w !== null && typeof w === "object" ? w : sendWindowUnreadable();
  } catch {
    return sendWindowUnreadable();
  }
}

/** The switch, read through the deps. ⛔ A read that throws is a CLOSED switch. */
async function switchOf(deps: LiveViewDeps): Promise<MarketingLiveSwitch> {
  try {
    return await deps.liveSwitch();
  } catch {
    return { state: "closed", why: "unreadable" };
  }
}

/** An officer's name — never a throw: an unread name is "an officer". */
async function nameOf(userId: string | null, deps: LiveViewDeps): Promise<string | null> {
  if (typeof userId !== "string" || userId.trim() === "") return null;
  try {
    return await deps.officerName(userId);
  } catch {
    return null;
  }
}

/** ⭐ WHO did an officer's act — the newest audit row of that action WITH an actor (an engine's row has none), named.
 *  ⛔ The U47b-1 review · only a row written AT OR AFTER the act it names (`since`: the row's `pausedAt`, or `finishedAt` for a
 *  stop — a second's grace for the stamp): when the current act's row did not land, an OLDER officer's row would otherwise
 *  name the wrong person. No row that fits → "an officer". */
const ACT_GRACE_MS = 1_000;
async function actorOfAct(campaignId: string, action: string, deps: LiveViewDeps, since: string | null): Promise<string> {
  const sinceMs = typeof since === "string" ? Date.parse(since) : Number.NaN;
  if (!Number.isFinite(sinceMs)) return LIVE_SOMEBODY;
  try {
    const acts = await deps.actsOn(campaignId);
    const act = acts.find((e) => e.action === action && typeof e.actorId === "string" && e.actorId !== ""
      && Number.isFinite(Date.parse(e.createdAt)) && Date.parse(e.createdAt) >= sinceMs - ACT_GRACE_MS);
    return (act ? await nameOf(act.actorId, deps) : null) ?? LIVE_SOMEBODY;
  } catch {
    return LIVE_SOMEBODY;
  }
}

/** The stored audience in words, as this viewer may read it — through the list's ONE role-shaped describer
 *  (`campaignRowAudience`: the composer's own reading — A1.1, X25, OD66) and the list's words, so a campaign never reads
 *  one way on the list and another on its own page. */
function audienceLinesOf(c: StoredSmsCampaign, viewerReads: boolean): string[] {
  const a = campaignRowAudience(c, viewerReads === true);
  if (a.kind === "hidden") return [CAMPAIGNS_AUDIENCE_HIDDEN];
  if (a.kind === "unreadable") return [CAMPAIGNS_AUDIENCE_UNREADABLE];
  return a.lines.length === 0 ? [CAMPAIGNS_AUDIENCE_EVERYONE] : a.lines;
}

/** "Not sent", by reason, from the ONE groupBy's SKIPPED groups — the five always, dominant first (ties in U38b's order),
 *  then the unsendable and the unworded only when there are any. */
function notSentReasonsOf(groups: readonly SmsCampaignRecipientOutcomeCount[], bucketOf: LiveViewDeps["rules"]["bucketOf"]): Array<{ label: string; count: number }> {
  const by: Record<NotSentBucket, number> = { suppressed: 0, no_consent: 0, withdrawn: 0, age_unknown: 0, protected: 0, unsendable: 0, other: 0 };
  for (const g of groups) {
    if (g.status !== "SKIPPED") continue;
    const b = bucketOf(g.skipReason);
    by[Object.prototype.hasOwnProperty.call(by, b) ? b : "other"] += g.count;
  }
  const five = AUDIENCE_BUCKETS.map((b, i) => ({ label: AUDIENCE_REASON_LABEL[b], count: by[b], i }));
  const rest = [
    { label: NOT_SENT_EXTRA.unsendable, count: by.unsendable, i: AUDIENCE_BUCKETS.length },
    { label: NOT_SENT_EXTRA.other, count: by.other, i: AUDIENCE_BUCKETS.length + 1 },
  ].filter((r) => r.count > 0);
  return [...five, ...rest].sort((a, b) => b.count - a.count || a.i - b.i).map(({ label, count }) => ({ label, count }));
}

/** The window's two times for the Start dialog — null when the hours cannot be read. */
function windowTimes(w: SendWindowState): { opens: string; closes: string } | null {
  const closes = eatClock(w.closesAt);
  return w.opensAtTime !== "" && closes !== null ? { opens: w.opensAtTime, closes } : null;
}

/* ══ THE VIEW ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ ONE CAMPAIGN, AS THIS VIEWER MAY SEE IT, NOW (the header). null when there is no such campaign; a read that fails
 * THROWS (the page says it could not load, and a step's driver stops — never a zero).
 */
export async function campaignLiveView(id: string, viewer: LiveViewer, deps: LiveViewDeps = LIVE_VIEW_DEPS): Promise<CampaignLiveView | null> {
  const c = await deps.campaigns.find(id);
  if (c === null) return null;
  const nowMs = deps.now().getTime();
  const reads = viewer?.reads === true;
  const mayAct = viewer?.mayAct === true;
  const money = deps.rules.moneyVisible(viewer);

  // ── THE ONE GROUPBY — every figure below is read off it ──
  const groups = await deps.recipients.countByOutcome(c.id);
  const counts = outcomeStatusCounts(groups);
  const rows = recipientRows(counts);
  const hidden = deps.rules.breakdownHidden(reads, rows);
  const reach = liveReach(c, counts, reads, deps.rules.breakdownHidden);
  const progress = deps.rules.progress(c, counts);
  const status = c.status;
  // What a stopped campaign did not message — the headline's figure, and the results' (U48a): ONE definition (`resumeOutstanding`).
  let stoppedBeforeSending = outstandingRows(counts);
  const view = CAMPAIGN_STATUS_VIEW[status];

  // ── the headline and why it stopped ──
  let headline: string;
  let stopSentence: string | null = null;
  const reasonKey = typeof c.stopReason === "string" ? c.stopReason.trim() : "";
  switch (status) {
    case "DRAFT":
      headline = LIVE_HEADLINE.DRAFT;
      break;
    case "CONFIRMED":
      headline = LIVE_HEADLINE.CONFIRMED;
      break;
    case "PREPARING": {
      // Rows WRITTEN over the confirmed count — the bar's own two figures (`campaignProgress`, which paints no bar until the
      // first row is written; the sentence can say "0 of 1,604" because it is words, not a bar).
      const confirmedCount = isCount(c.audienceCount) && c.audienceCount >= 1 ? c.audienceCount : null;
      headline = preparingHeadline(confirmedCount === null ? rows : Math.min(rows, confirmedCount), confirmedCount);
      break;
    }
    case "RUNNING":
      headline = sendingHeadline(progress);
      break;
    case "PAUSED":
      headline = LIVE_HEADLINE.PAUSED;
      stopSentence = reasonKey === "officer_paused"
        ? officerPausedSentence(await actorOfAct(c.id, OFFICER_PAUSED_ACTION, deps, c.pausedAt), c.pausedAt)
        : deps.rules.pausedReason({ reads, mayAct }, c, counts, deps.rules.breakdownHidden);
      break;
    case "DONE":
      headline = LIVE_HEADLINE.DONE;
      break;
    case "CANCELLED": {
      const who = await actorOfAct(c.id, OFFICER_STOPPED_ACTION, deps, c.finishedAt);
      stoppedBeforeSending = deps.rules.outstanding(c, counts) ?? outstandingRows(counts);
      headline = stoppedHeadline(who, c.finishedAt, stoppedBeforeSending);
      // ⭐ The U47b-1 review · an officer's Stop is said ONCE — the headline names who and when; any other reason is said as a
      // paused one is, through the floor.
      stopSentence = reasonKey === "officer_stopped" ? null : deps.rules.pausedReason({ reads, mayAct }, c, counts, deps.rules.breakdownHidden);
      break;
    }
    default:
      headline = view?.label ?? String(status);
  }

  // ── the standing facts ──
  const provider = deps.provider();
  const live = await switchOf(deps);
  const switchOpen = deps.liveGate(provider, live, nowMs).ok;
  const sendWindow = await windowOf(deps);
  const lastStepAt = await deps.recipients.lastActivity(c.id);
  const lastMs = lastStepAt === null ? Number.NaN : Date.parse(lastStepAt);
  // ⭐ The U47b-1 review · "nobody driving" only while the engine would be SENDING: the window open, money not busy, no login
  // code failed in the last two minutes — else an officer's page that is correctly waiting (every night, for one) reads as
  // nobody sending.
  // ⛔ Its re-review: a money signal that THROWS is busy, as the engine reads it (④d — waiting costs only time), never a
  // view that fails for every viewer; a code failure through the engine's ONE reading (④e, `otpFailureWaiting`).
  let moneyWaits: boolean;
  try {
    moneyWaits = deps.moneyBusy().busy === true;
  } catch {
    moneyWaits = true;
  }
  const engineWaits = sendWindow.open !== true || moneyWaits || deps.rules.otpWaiting(nowMs, deps.otpLastFailureAt());
  // ⭐ The U47b-2 review's MINOR 5 · a PREPARING campaign is "driven" by chunks, not claims (nothing is claimed before RUNNING):
  // its newest chunk is the instant the enqueue last moved its cursor — the campaign row's `updatedAt` (Start's own move
  // before the first). The same 90 s as RUNNING's. The enqueue waits for nothing (no window, no money), so no exemption.
  const chunkMs = Date.parse(c.updatedAt);
  const stale = (ms: number): boolean => !Number.isFinite(ms) || nowMs - ms >= NOBODY_DRIVING_AFTER_MS;
  const nobodyDriving = status === "RUNNING" ? !engineWaits && stale(lastMs) : status === "PREPARING" ? stale(chunkMs) : false;

  // ── the controls — always present, each disabled with its reason (decision 4) ──
  const draft = status === "DRAFT";
  const terminal = status === "DONE" || status === "CANCELLED";
  const travel = copyTravel(c, reads);
  const startRefused = startAudienceRefusedFor(c, reads);
  const gate = (s: () => ControlState): ControlState => (!mayAct ? off(LIVE_DISABLED.role) : draft ? off(LIVE_DISABLED.draft) : s());
  const controls = {
    start: gate(() => (status !== "CONFIRMED" ? off(LIVE_DISABLED.start) : startRefused !== null ? off(START_AUDIENCE_REFUSED)
      : !switchOpen ? off(LIVE_DISABLED.startSwitchOff) : { ...ON })),
    pause: gate(() => (status === "PREPARING" || status === "RUNNING" ? { ...ON } : off(LIVE_DISABLED.pause))),
    resume: gate(() => (status === "PAUSED" ? { ...ON } : off(LIVE_DISABLED.resume))),
    stop: gate(() => (terminal ? off(LIVE_DISABLED.stop) : { ...ON })),
    copy: gate(() => (travel.ok ? { ...ON } : off(copyCantTravelSentence(reach)))),
  };

  // ── the confirmation, and the money (OD24) ──
  const confirmed = status !== "DRAFT" && isCount(c.audienceCount) && c.audienceCount >= 1 && typeof c.confirmedAt === "string"
    ? { count: c.audienceCount, at: c.confirmedAt, byName: await nameOf(c.confirmedBy, deps) }
    : null;
  const moneyView = money ? { estimateTzs: c.estimateTzs, budgetTzs: c.budgetTzs } : null;
  // ── "not sent" by reason: ONE list, worded once — the figures card prints it, and the results hand it on (U48a) ──
  const notSentReasons = hidden ? null : notSentReasonsOf(groups, deps.rules.bucketOf);

  return {
    id: c.id,
    name: c.name,
    status,
    statusLabel: view?.label ?? String(status),
    chip: view?.chip ?? "neutral",
    headline,
    stopSentence,
    audienceLines: audienceLinesOf(c, reads),
    confirmed,
    progress,
    kpis: hidden
      ? { onCampaign: rows, handedOver: null, failed: null, notSent: null, noAnswer: null, waiting: null }
      : {
          onCampaign: rows,
          handedOver: counts.SENT + counts.DELIVERED,
          failed: counts.FAILED,
          notSent: counts.SKIPPED,
          noAnswer: counts.UNCONFIRMED,
          waiting: counts.PENDING + counts.HELD,
        },
    notSentReasons,
    chips: hidden ? null : (Object.keys(RECIPIENT_STATUS_LABEL) as SmsCampaignRecipientStatus[])
      .filter((s) => counts[s] > 0)
      .map((s) => ({ status: s, label: RECIPIENT_STATUS_LABEL[s], count: counts[s] })),
    standing: {
      switchOpen,
      switchClosesAt: live.state === "open" ? live.closesAt : null,
      window: sendWindow,
      // RUNNING: the newest claim. PREPARING: the newest chunk (the row's `updatedAt` — see `nobodyDriving`).
      lastStepAt: status === "PREPARING" ? (Number.isFinite(chunkMs) ? c.updatedAt : null) : lastStepAt,
      nobodyDriving,
      keepOpen: mayAct && (status === "PREPARING" || status === "RUNNING"),
    },
    controls,
    startDialog: controls.start.enabled && isCount(c.audienceCount)
      ? startDialog({
          count: c.audienceCount,
          segments: isCount(c.estimateSegments) ? c.estimateSegments : null,
          window: windowTimes(sendWindow),
          money: money ? { costTzs: c.estimateTzs, limitTzs: c.budgetTzs } : null,
        })
      : null,
    stopDialog: stopDialog(reach, sendingStarted(c)),
    floor: hidden ? LIVE_FLOOR : null,
    money: moneyView,
    // ⭐ U48a · the results — the same rows, the same reasons, the same floor; null below it (campaign-results.ts).
    results: await campaignResults({
      campaignId: c.id, status, groups, counts, hidden, money, notSentReasons: notSentReasons ?? [], stoppedBeforeSending, nowMs,
    }, deps.results),
    readAt: new Date(nowMs).toISOString(),
  };
}
