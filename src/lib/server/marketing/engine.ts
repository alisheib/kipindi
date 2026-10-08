/**
 * ⭐ U43b-2 · THE CAMPAIGN SEND ENGINE — one step of a RUNNING campaign: reap → the slice-wide checks → claim → gate EVERY
 * recipient → prepare (token + render) → re-check the claims → ONE send → settle (ENGINE-SPEC §4.13 decisions 2–4 and 6
 * and its "as built" note; E1 · E3 · E4 · E6 · E7 · E8 · E9 · E10 · E11 · E12 · E16 · E17 · E20 · E24 · DC-1 · DC-4 · DC-5).
 *
 * ── ONE STEP (`runCampaignSlice`, decision 2) ──────────────────────────────────────────────────────────────────────────
 *   ①  E10 · ONE SLICE IN FLIGHT PER PROCESS, across every campaign (`MAX_SLICES_IN_FLIGHT` = 1): another in flight →
 *       `waiting busy`. Across processes (a deploy's overlap) the claim's compare-and-set keeps every send single.
 *   ②  the campaign, read now: not RUNNING → `not_running` (U47b's step dispatcher reaps for the other statuses).
 *   ③  E6 · THE REAPER: claims older than `REAP_AFTER_MS` settled from the evidence (`reapStrandedClaims`).
 *   ④  THE SLICE-WIDE CHECKS — each a PAUSE (one conditional move, one SYSTEM audit row) or a WAIT, BEFORE ANY CLAIM:
 *       a  ⛔ FIRST — the list no longer than confirmed (U42's re-review): a confirmed count that is not a count → pause
 *          `confirmation_unreadable`; rows on the list > `audienceCount` → pause `list_over_confirmed_sending`;
 *       b  the owner's switch (through THE gate; the console stub passes; a switch that cannot be read is closed) → pause
 *          `live_switch_closed`; the rail → pause `NOT_CONFIGURED` / `PROVIDER_UNRECOGNISED` (an unrecognised provider is a
 *          dead rail, never a closed switch);
 *       c  E9 · the send window → WAIT `quiet_hours` until it opens (`window_unreadable` when the hours cannot be read);
 *       d  E12 · money first (`money-busy.ts`) → WAIT `money_busy`;
 *       e  E12 · a login or withdrawal code failed or went unknown in the last `OTP_FAILURE_WAIT_MS` → WAIT `otp_failing`;
 *       f  the template's own verdict (a dry render per variant with the measurement token) → pause `template_invalid`;
 *       g  E16 · the credit kept for codes, for THIS slice (`creditVerdict`, read at most a minute old) → pause, each cause
 *          in its own words (the words Resume refuses with): `settings_unreadable` · `sizes_unreadable` · `price_unknown` ·
 *          `credit_unreadable` (fail closed) · `marketing_floor`. ⭐ The console stub has no credit and spends none.
 *   ⑤  THE CLAIM: `adaptSliceSize`'s rows under a fresh token. Nobody to claim → nobody PENDING: HELD left → pause
 *       `held_rows`, else the campaign is DONE (one row, the counts); PENDING rows held by another claim → `waiting busy`.
 *   ⑥  `dispatchSlice` — THE ONE LOOP, called, never rewritten (the U9 contract): the gate per recipient immediately before
 *       the wire; E1/E17 `prepare` (below) only for a number the gate has just cleared; E6 `beforeSend` (`verifyClaims`)
 *       is the last word before the wire — it re-reads the campaign (a campaign paused while it was gating sends nothing),
 *       ⛔ the list's length and its confirmed count again, ⛔ the owner's switch again (a state read earlier is not a
 *       licence for later — `marketingLiveGate`'s own rule), and THIS claim: only the rows still under it (a stalled
 *       claimant whose claims were reaped sends nothing), and ⛔ only while the claim is young enough to send (the send-age
 *       bound, below); the ONE send (`engineSend` — `sendBatch`, purpose MARKETING, the credit kept for codes as its last
 *       line).
 *   ⑦  THE SETTLE: every outcome through the pure table (`engine-rules.ts` — `isShopWide`, `settlementFor`) with its E20
 *       trail; ONE shop-wide fact pauses ONCE (E7) or waits; each patch made lawful before it is handed in (DC-5) — one that
 *       still cannot be is set aside for the reaper, never allowed to refuse the slice's whole settle; ⭐ DC-4 · a SENT (or
 *       UNCONFIRMED) patch a receipt beat is written through the narrow send record. ⭐ A send that THREW (the U43b-2
 *       review): the evidence is read — a row no message of this claim names was certainly never on the wire and goes back
 *       (+1); the rest are UNCONFIRMED; the campaign pauses `send_error` (`thrownSend`).
 *   ⑧  E11 · the gate time (now including the prepare and the re-read: everything between the claim and the wire) folded
 *       into the in-process slice size.
 *
 * ── ⛔ THE SEND-AGE INVARIANT (E6's double-send guard — the U43b-2 review, its re-review, and the re-review of round 2) ──
 * A reaper — this process's or another's (a deploy's overlap) — judges a claim stranded at `REAP_AFTER_MS` (10 min), and
 * releases its people only when no message of the claim can have reached a handset — no message row, or one that failed
 * with no receipt (`sendBatch` failed it before its request, or the gateway refused it outright): `sendBatch` writes its
 * message rows BEFORE the wire (P2), so a claim whose rows were handed on is settled from them (UNCONFIRMED at worst) and
 * never released, never sent twice. The
 * one gap was a claim whose rows did not exist yet when a reaper looked; a claim is therefore sendable only while it is
 * YOUNGER than `CLAIM_SEND_MAX_AGE_MS` (5 min, half of the reaper's age), checked THREE times on its way:
 *   1. `beforeSend` (`verifyClaims`) reads the claim's own stored instant: an older one is a WAIT `slice_too_slow`, every
 *      row back as it was, nothing written or sent, the slow gate measured (the next slice smaller when it can be; at the
 *      smallest group, three such waits in a row PAUSE `slice_too_slow` — `SLICE_TOO_SLOW_MAX`);
 *   2. `sendBatch`'s deadline (`notAfter` = the slice's OLDEST claim + 5 min; all-MARKETING batches only — a login code
 *      never meets one), read before its rows are written: past it, the batch is refused whole, nothing written
 *      (`DEADLINE_PASSED`, the same wait);
 *   3. …and again before each chunk's request: past it, the rows just written are FAILED with no request made.
 *   Checks 2 and 3 are the SEND side: a stall in `sendBatch` that no smaller group cures, so three such waits in a row
 *   PAUSE `slice_too_slow` at ANY size (`tooSlowCounts`).
 * So rows that a reaper could have missed are never followed by a request: a stall before them ends at check 3. In THIS
 * process the reaper is also held off a campaign whose slice is in flight (`insideFlight` — U47b's step is a second place
 * it reaps: a PREPARING campaign before its enqueue, a PAUSED · CANCELLED · DONE one alone) while the flight holds
 * (`SLICE_FLIGHT_STALE_MS`, 20 min);
 * never across processes, where the three checks alone stand.
 * ⚠️ WHAT IS LEFT (none of it a second message on a healthy server): (a) a process frozen after check 3 sends LATE — its
 * rows already exist, so a reaper meanwhile settles them UNCONFIRMED and nobody is released; the one message still goes,
 * and reads "no answer" until a receipt; (b) the request itself is bounded only by the transport's own timeout
 * (`BLACKBALL_TIMEOUT_MS`, 8 s by default) — the same late case if an operator sets it near minutes; (c) every check reads
 * a clock: a wall clock stepped back, or two hosts' clocks skewed (DC-1), moves the claim's age against the reaper's.
 *
 * ── E1 · E17 · THE PREPARE ─────────────────────────────────────────────────────────────────────────────────────────────
 * Run by `dispatchSlice` right after THAT row's clear, under the gate's key. WHO HOLDS THE NUMBER NOW decides the origin
 * (E17), never the row's kind (F5): an account → `account` (its own first name may print, no source line, its language
 * through OD42's `variantFor`); otherwise `book` (the fallback, the source line, Swahili). The opt-out token is ensured
 * here and only here (E1: reused, else minted) — a refused person never gets a permanent link. A token that cannot be made
 * holds the row `prepare:token_unavailable`; a message the renderer refuses holds it `prepare:template_invalid`, its first
 * problem scrubbed (DC-5). Either is about one person (E8).
 *
 * ── E24 · THE AUDIT ROWS (SYSTEM, actor null — one per event, never per recipient or per slice) ─────────────────────────
 * `marketing.campaign_paused` `{ reason, detail? }` (the gateway's words, scrubbed and cut to 200 — and for `send_error`
 * a thrown error's CODE or NAME only, never its words, which can quote the call) ·
 * `marketing.campaign_finished` (the rows by status) · `marketing.campaign_reaped` (the five reap counts, only when > 0).
 * The RG line per refusal is `dispatchSlice`'s own (unchanged). ⛔ No phone number in any row, result or error.
 *
 * ── WHO CALLS IT ──────────────────────────────────────────────────────────────────────────────────────────────────────
 * U47b's step dispatcher ALONE (`campaign-control.ts`, §3.3: RUNNING → `runCampaignSlice`; PREPARING · PAUSED · CANCELLED ·
 * DONE → `reapStrandedClaims`, PREPARING before its enqueue chunk). `test:marketing-engine` S27 holds the callers to `ENGINE_CALLERS`, and ⛔ `insideFlight` — the
 * reaper's pass beside a slice in flight — is named in this file only (the slice's own reap). SERVER-ONLY.
 *
 * Guard: `npm run test:marketing-engine` §S · §R · §C · §T · `npm run test:marketing-consent` U9 (the second driver) ·
 * Red: `npm run red:marketing-engine` · `npm run red:marketing-consent` (in memory).
 */
import { db } from "@/lib/server/store";
import type {
  SmsCampaignGateTrail, SmsCampaignRecipientCount, SmsCampaignRecipientSettle, SmsCampaignRecipientStatusCounts,
  SmsCampaignSettleResult, SmsCampaignStatus, SmsCampaignTransition, SmsRecipientSendRecord, SmsRecipientSendRecordResult,
  StoredSmsCampaign, StoredSmsCampaignRecipient, StoredSmsMessage, StoredUser,
} from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { DISPATCH_TARGET_TYPE, dispatchSlice, liveSendWindow } from "@/lib/server/marketing/dispatch";
import type { SliceCleared, SliceDeps, SliceOutcome, SlicePrepared, SliceRecipient, SliceSendVerdict } from "@/lib/server/marketing/dispatch";
import { lastOtpFailureAt, refreshSmsBalance, sendBatch, smsProviderResolution, smsRailProblem } from "@/lib/server/sms";
import type { SmsBalanceRead, SmsBatchOptions, SmsBatchOutcome, SmsOutbound, SmsProviderResolution, SmsRailProblem } from "@/lib/server/sms";
import { marketingLiveGate, readMarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import type { MarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import { sendWindowUnreadable } from "@/lib/marketing/window";
import type { SendWindowState } from "@/lib/marketing/window";
import { moneyBusy } from "@/lib/server/money-busy";
import type { MoneyBusy } from "@/lib/server/money-busy";
import { reloadMarketingSmsSettings } from "@/lib/server/marketing/sms-settings";
import type { SettingsReload } from "@/lib/server/marketing/sms-settings";
import { balanceFigureOf, loadSegmentCost } from "@/lib/server/marketing/estimate";
import type { SegmentCostMeasure } from "@/lib/marketing/segment-cost";
import { creditVerdict } from "@/lib/marketing/credit-guard";
import { campaignEstimate, savedVariantSizes } from "@/lib/marketing/campaign-estimate";
import type { BalanceFigure, VariantSize } from "@/lib/marketing/campaign-estimate";
import { currentOptOutToken, ensureOptOutToken } from "@/lib/server/marketing/optout-service";
import { firstNameFor, renderForRecipient, variantFor } from "@/lib/marketing/campaign-template";
import type { CampaignTemplate, CampaignVariant, RecipientOrigin } from "@/lib/marketing/campaign-template";
import { footerMeasurementToken } from "@/lib/marketing/footer";
import { ledgerStamp } from "@/lib/server/marketing/ledger-stamp";
import { assertSettle, fillRecipientCounts } from "@/lib/server/marketing/campaign-model";
import { recipientRows, zeroRecipientStatusCounts } from "@/lib/marketing/campaign-status";
import {
  AUDIT_DETAIL_MAX, DEADLINE_PASSED, MAX_ROW_ATTEMPTS, OTP_FAILURE_WAIT_MS, SLICE_GATE_BUDGET_MS, SLICE_MAX, SLICE_MIN, SLICE_START,
  SLICE_TOO_SLOW, TRAIL_TEXT_MAX,
  adaptSliceSize, cleanText, foldGateTime, isShopWide, otpFailureWaiting, railStopReason, reapVerdict, sendErrorLog, sendRecordOf,
  tooSlowCounts, spendableBalance, owedForSlice,
  settlementFor, sliceCheck, thrownSend,
} from "@/lib/marketing/engine-rules";
import type { EngineStopReason, ReapEvidence, SettleContext, ShopWide, SliceWait } from "@/lib/marketing/engine-rules";

/* ══ THE NUMBERS ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ The slice's constants — declared in the pure rules (`engine-rules.ts`, which sizes the slice and settles it) and
 *  re-exported here, never written twice. */
export { SLICE_MAX, SLICE_START, SLICE_MIN, SLICE_GATE_BUDGET_MS, MAX_ROW_ATTEMPTS, OTP_FAILURE_WAIT_MS };
export type { EngineStopReason, SliceWait };

/** E6 · a claim older than this is stranded: settled from the evidence by the next step of its campaign. */
export const REAP_AFTER_MS = 10 * 60_000;
/** E6 · the most stranded claims one step settles — the reaper's page (the settle door's own batch ceiling). */
export const REAP_BATCH = 200;
/** E16 · how old a credit reading a slice may act on: one minute, as Start. */
export const SLICE_CREDIT_MAX_AGE_MS = 60_000;
/** ⭐ As built · after this many slices running whose re-check before the wire could not answer, the campaign PAUSES
 *  `before_send_unanswered` — a hook that always fails is a silent, permanent stall otherwise (U43b-1's hand-over). */
export const BEFORE_SEND_UNANSWERED_MAX = 3;
/** ⛔ E6 · THE SEND-AGE BOUND (the header's invariant; the U43b-2 review and its re-review): a claim reaches the wire only
 *  while YOUNGER than this — half of `REAP_AFTER_MS` — judged three times: `beforeSend` (a `slice_too_slow` wait), then
 *  `sendBatch`'s deadline before its rows are written and again before its request (`DEADLINE_PASSED`, the same wait). */
export const CLAIM_SEND_MAX_AGE_MS = REAP_AFTER_MS / 2;
/** ⭐ The U43b-2 re-review · after this many `slice_too_slow` waits IN A ROW the campaign PAUSES `slice_too_slow` — counted
 *  (`tooSlowCounts`) on the gate side only at the SMALLEST group (`SLICE_MIN` people, or fewer left), on the send side
 *  (`sendBatch`'s own deadline) at any size: either way, left uncounted, the same people are re-asked for ever and nothing
 *  is ever sent. */
export const SLICE_TOO_SLOW_MAX = 3;
/** E10 · a slice in flight longer than this is taken to be lost, so it no longer holds every campaign of the process off,
 *  nor holds the reaper off its campaign (`insideFlight`). ⛔ Kept clearly APART from `REAP_AFTER_MS` — TWICE it (the U43b-2
 *  review): no reap of this process — the slice's own, or U47b's reap-only step — runs beside a slice that could still
 *  send, and a claim stops being sendable at a QUARTER of it. */
export const SLICE_FLIGHT_STALE_MS = 2 * REAP_AFTER_MS;

/** The audit actions (E24). ⭐ `marketing.campaign_paused` is the SAME action U42's enqueue writes (`enqueue.ts` — which
 *  this file must never import: `test:marketing-engine` E13); `test:marketing-engine` holds the two spellings equal. */
export const ENGINE_PAUSED_ACTION = "marketing.campaign_paused";
export const ENGINE_FINISHED_ACTION = "marketing.campaign_finished";
export const ENGINE_REAPED_ACTION = "marketing.campaign_reaped";

/* ══ THE SHAPES ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * What one step did. `sent` — a slice ran (every claimed row settled, released, parked or left to its new holder);
 * `finished` — nobody is left and the campaign is DONE; `paused` — this step paused it (and why); `waiting` — nobody was
 * claimed and nothing paused, with when it is worth trying again (null: soon); `not_running` — the campaign is not (or no
 * longer) RUNNING.
 */
export type SliceStepResult =
  | {
      kind: "sent"; claimed: number; handedOver: number; skipped: number; failed: number; unconfirmed: number; held: number;
      reaped: number; gateMs: number; sendMs: number;
    }
  | { kind: "finished"; status: "DONE" }
  | { kind: "paused"; reason: EngineStopReason }
  | { kind: "waiting"; reason: SliceWait; until: string | null }
  | { kind: "not_running"; status: SmsCampaignStatus };

/** What the reaper did — the five reap counts (E24's row) and their sum. */
export type ReapResult = { reaped: number; toPending: number; toSent: number; toUnconfirmed: number; toFailed: number; toDelivered: number };

/** The audit door as the engine uses it. */
export type AuditFn = (entry: Parameters<typeof audit>[0]) => unknown;

/** E10 · E11 · the engine's per-PROCESS state — on `globalThis`, so every module instance (a server action's, a route's)
 *  shares one flight and one measurement. */
export type EngineProcessState = {
  /** The one slice in flight in this process: its campaign, when it began, and its ticket (so only it releases it). */
  flight: { campaignId: string; since: number; ticket: number } | null;
  ticket: number;
  /** E11 · the next slice's size, and the moving average of the per-recipient gate time (null: not measured yet). */
  sliceSize: number;
  gateMsAvg: number | null;
  /** By campaign: how many slices running `beforeSend` could not answer. */
  unanswered: Record<string, number>;
  /** By campaign: how many slices running waited `slice_too_slow` as `tooSlowCounts` counts them — the gate side at the
   *  smallest group, the send side at any size (the U43b-2 re-review; the check of 980e2ee7). Optional:
   *  a state made by an older build in a hot-reloaded process has none yet. */
  tooSlow?: Record<string, number>;
  /** By campaign: the `pausedAt` the two streaks above were counted under (the re-review of round 2) — a new one, an
   *  officer's Pause and Resume between two slices, starts them over. Optional, as `tooSlow`. */
  runMark?: Record<string, string>;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MARKETING_ENGINE: EngineProcessState | undefined;
}

/** The process's own engine state (created on first use). */
export function engineProcessState(): EngineProcessState {
  return (globalThis.__50PICK_MARKETING_ENGINE ??= { flight: null, ticket: 0, sliceSize: SLICE_START, gateMsAvg: null, unanswered: {}, tooSlow: {} });
}

/** Every read, rule and write one step makes — swappable for the suites' in-process plants; production passes none. */
export type EngineDeps = {
  campaigns: {
    find: (id: string) => Promise<StoredSmsCampaign | null>;
    transition: (id: string, t: SmsCampaignTransition) => Promise<StoredSmsCampaign | null>;
  };
  recipients: {
    claim: (campaignId: string, limit: number, token: string, at: string) => Promise<StoredSmsCampaignRecipient[]>;
    claimedBy: (campaignId: string, token: string) => Promise<StoredSmsCampaignRecipient[]>;
    settle: (patches: SmsCampaignRecipientSettle[], at: string) => Promise<SmsCampaignSettleResult>;
    /** DC-4 · the send record a lost patch still owes its row. */
    recordSend: (id: string, s: SmsRecipientSendRecord, at: string) => Promise<SmsRecipientSendRecordResult>;
    countByStatus: (campaignId: string) => Promise<SmsCampaignRecipientCount[]>;
    findStranded: (campaignId: string, cutoff: string, limit: number) => Promise<StoredSmsCampaignRecipient[]>;
  };
  /** E6 · the reaper's evidence: the newest message per target. */
  messages: { findByTargets: (targetType: string, targetIds: readonly string[]) => Promise<StoredSmsMessage[]> };
  /** E17 · who holds a number NOW. */
  users: { findByPhone: (phone: string) => Promise<StoredUser | null> };
  provider: () => SmsProviderResolution;
  /** The owner's switch, read now (`readMarketingLiveSwitch`). */
  liveSwitch: () => Promise<MarketingLiveSwitch>;
  /** THE gate over the rail and the switch (`marketingLiveGate`). */
  liveGate: typeof marketingLiveGate;
  rail: () => SmsRailProblem | null;
  /** U13 · the send window — `liveSendWindow` (fails closed); also handed to `dispatchSlice`, which reads it again. */
  window: () => SendWindowState | Promise<SendWindowState>;
  /** E12 · money first (`moneyBusy()`, ⛔ asked with no argument: the flags are stamped by this process's clock). */
  moneyBusy: () => MoneyBusy;
  /** E12 · the newest OTP failure this process saw (`lastOtpFailureAt`, sms.ts), or null. */
  otpLastFailureAt: () => number | null;
  /** E16 · the Marketing SMS settings, RE-READ (OD63): the price and the credit kept for codes. */
  settings: () => Promise<SettingsReload>;
  /** Today's price of one segment (`loadSegmentCost`). */
  cost: (configuredTzs: number | null) => Promise<SegmentCostMeasure>;
  /** E16 · the credit, at most `SLICE_CREDIT_MAX_AGE_MS` old. */
  readBalance: () => Promise<SmsBalanceRead>;
  credit: typeof creditVerdict;
  /** E1 · the number's opt-out token: reused, else minted (`ensureOptOutToken`). */
  ensureToken: (key: string) => Promise<string | null>;
  /** E30 · the number's CURRENT opt-out token, read and never minted (`currentOptOutToken` — the one `ensureOptOutToken`
   *  reuses): the reaper gives a row that reached the wire the token its message carried (the U43b-2 review). Optional, so
   *  a dependency set written before it still type-checks; production's sets it, and a set without it recovers nothing. */
  tokenOf?: (key: string) => Promise<string | null>;
  /** THE ONE renderer (`renderForRecipient`). */
  render: typeof renderForRecipient;
  /** THE ONE loop (`dispatchSlice`) — called, never rewritten. */
  dispatch: typeof dispatchSlice;
  /** Undefined = THE ONE gate (`dispatchSlice`'s own default, `mayReceiveMarketingSms`). A suite may hand its own. */
  gate?: SliceDeps["gate"];
  /** THE ONE send (`engineSend`). */
  send: (messages: SmsOutbound[], opts: SmsBatchOptions) => Promise<SmsBatchOutcome>;
  /** The pure decisions (`engine-rules.ts`). */
  rules: {
    isShopWide: typeof isShopWide;
    settlementFor: typeof settlementFor;
    reapVerdict: typeof reapVerdict;
    adaptSliceSize: typeof adaptSliceSize;
    sendRecordOf: typeof sendRecordOf;
    /** ⭐ Does a `slice_too_slow` wait count toward the pause (by route: `tooSlowCounts`)? */
    tooSlowCounts: typeof tooSlowCounts;
    /** The ONE log line a landed `send_error` pause writes (`sendErrorLog`). */
    sendErrorLog: typeof sendErrorLog;
    /** ⭐ F-2 · the credit a slice may spend: a send reply's pre-charge figure less its pending segments (`spendableBalance`). */
    spendableBalance: typeof spendableBalance;
    /** ⭐ F-1 · how many people a slice is priced for: those it can still claim (`owedForSlice`). */
    owedForSlice: typeof owedForSlice;
  };
  audit: AuditFn;
  now: () => Date;
  /** A monotonic clock in milliseconds, for the durations (E11). */
  clock: () => number;
  /** A fresh claim token for each claim (D16). */
  newToken: () => string;
  /** E10 · E11 · the process state (`engineProcessState`). */
  state: () => EngineProcessState;
};

/* ══ THE ONE SEND ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ THE ENGINE'S ONE SEND — `sendBatch`, the platform's one send path, with the purpose MARKETING stamped on every message
 * (declared in `test:campaign-models` §3.1, MARKETING_WRITERS) and the credit kept for codes as the batch's last line
 * (`minimumBalanceTzs`, U49a — the slice already checked it before it claimed anyone).
 */
export function engineSend(messages: SmsOutbound[], opts: SmsBatchOptions): Promise<SmsBatchOutcome> {
  return sendBatch(messages.map((m): SmsOutbound => ({ ...m, purpose: "MARKETING" })), opts);
}

/** Frozen: production's step — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const ENGINE_DEPS: Readonly<EngineDeps> = Object.freeze({
  campaigns: Object.freeze({
    find: async (id: string) => db.smsCampaign.find(id),
    transition: async (id: string, t: SmsCampaignTransition) => db.smsCampaign.transition(id, t),
  }),
  recipients: Object.freeze({
    claim: async (campaignId: string, limit: number, token: string, at: string) => db.smsCampaignRecipient.claim(campaignId, limit, token, at),
    claimedBy: async (campaignId: string, token: string) => db.smsCampaignRecipient.claimedBy(campaignId, token),
    settle: async (patches: SmsCampaignRecipientSettle[], at: string) => db.smsCampaignRecipient.settle(patches, at),
    recordSend: async (id: string, s: SmsRecipientSendRecord, at: string) => db.smsCampaignRecipient.recordSend(id, s, at),
    countByStatus: async (campaignId: string) => db.smsCampaignRecipient.countByStatus(campaignId),
    findStranded: async (campaignId: string, cutoff: string, limit: number) => db.smsCampaignRecipient.findStranded(campaignId, cutoff, limit),
  }),
  messages: Object.freeze({
    findByTargets: async (targetType: string, targetIds: readonly string[]) => db.smsMessage.findByTargets(targetType, targetIds),
  }),
  users: Object.freeze({ findByPhone: async (phone: string) => db.user.findByPhone(phone) }),
  provider: smsProviderResolution,
  liveSwitch: () => readMarketingLiveSwitch(),
  liveGate: marketingLiveGate,
  rail: smsRailProblem,
  window: () => liveSendWindow(),
  moneyBusy: () => moneyBusy(),
  otpLastFailureAt: lastOtpFailureAt,
  settings: reloadMarketingSmsSettings,
  cost: (configuredTzs: number | null) => loadSegmentCost(configuredTzs),
  readBalance: () => refreshSmsBalance({ maxAgeMs: SLICE_CREDIT_MAX_AGE_MS }),
  credit: creditVerdict,
  ensureToken: (key: string) => ensureOptOutToken(key),
  tokenOf: currentOptOutToken,
  render: renderForRecipient,
  dispatch: dispatchSlice,
  gate: undefined,
  send: engineSend,
  rules: Object.freeze({ isShopWide, settlementFor, reapVerdict, adaptSliceSize, sendRecordOf, tooSlowCounts, sendErrorLog, spendableBalance, owedForSlice }),
  audit,
  now: () => new Date(),
  clock: () => performance.now(),
  newToken: () => `slc_${ledgerStamp().id}`,
  state: engineProcessState,
});

/* ══ THE PIECES ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

const isCount = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
const iso = (ms: number): string => new Date(ms).toISOString();

/** One audit row; an audit that throws never turns a write that landed into a failed step. */
async function record(deps: EngineDeps, entry: Parameters<typeof audit>[0]): Promise<void> {
  try {
    await deps.audit(entry);
  } catch {
    // ⚠️ `audit()` itself never rejects (ruling 543); a stand-in that throws records nothing, and the step stands.
  }
}

/** The campaign's rows by status, every status present — the ONE count (a groupBy, OD26). */
async function countsOf(campaignId: string, deps: EngineDeps): Promise<SmsCampaignRecipientStatusCounts> {
  const out = zeroRecipientStatusCounts();
  for (const c of fillRecipientCounts(await deps.recipients.countByStatus(campaignId))) out[c.status] += c.count;
  return out;
}

/** The stored row as the renderer reads it (U35's nullable columns as blank text) — the test send's own reading. */
function templateOf(c: StoredSmsCampaign): CampaignTemplate {
  return {
    bodySw: c.bodySw ?? "",
    bodyEn: c.bodyEn ?? "",
    nameFallbackSw: c.nameFallbackSw ?? "",
    nameFallbackEn: c.nameFallbackEn ?? "",
    sourcePhrase: c.sourcePhrase ?? "",
  };
}

/** A conditional write that found the campaign gone from RUNNING: say where it is now. */
async function notRunning(campaignId: string, deps: EngineDeps): Promise<SliceStepResult> {
  const now = await deps.campaigns.find(campaignId);
  if (now === null) throw new Error("runCampaignSlice: the campaign is no longer there — nothing more was claimed");
  return { kind: "not_running", status: now.status };
}

/** ⛔ PAUSE — one conditional move RUNNING → PAUSED with the reason, and its ONE SYSTEM row, only when the move landed. */
async function pauseFor(c: StoredSmsCampaign, reason: EngineStopReason, detail: string | null, deps: EngineDeps): Promise<SliceStepResult> {
  const at = deps.now().toISOString();
  const paused = await deps.campaigns.transition(c.id, {
    from: ["RUNNING"], to: "PAUSED", patch: { pausedAt: at, stopReason: reason }, draftRevision: null, at,
  });
  if (paused === null) return notRunning(c.id, deps);
  const said = detail === null ? "" : cleanText(detail, AUDIT_DETAIL_MAX);
  await record(deps, {
    category: "SYSTEM", action: ENGINE_PAUSED_ACTION, actorId: null, targetType: "SmsCampaign", targetId: c.id,
    payload: said === "" ? { reason } : { reason, detail: said },
  });
  return { kind: "paused", reason };
}

/** U13 · the window, read through the deps. ⛔ A read that throws, or answers anything but a window, is CLOSED. */
async function windowOf(deps: EngineDeps): Promise<SendWindowState> {
  try {
    const w = await deps.window();
    return w !== null && typeof w === "object" ? w : sendWindowUnreadable();
  } catch {
    return sendWindowUnreadable();
  }
}

/** ⛔ A projection reads no credit: `campaignEstimate` is handed this, so no balance figure exists inside it. */
const NO_CREDIT_READ: BalanceFigure = { kind: "unreadable", why: "never", error: null };

/** U39's ONE arithmetic over `population` people and the campaign's saved sizes: their cost, or NaN when it cannot be
 *  priced (`creditVerdict` reads NaN as unreadable — never as affordable). */
function projectedCostTzs(population: number, variants: readonly VariantSize[] | null, cost: SegmentCostMeasure): number {
  if (variants === null) return Number.NaN;
  const e = campaignEstimate(
    { audience: { ok: true, population, forecast: null }, pace: null, money: { cost, balance: NO_CREDIT_READ, reserveTzs: null } },
    variants,
  );
  return e.money?.costTzs ?? Number.NaN;
}

type CreditCheck =
  | { ok: true; reserveTzs: number }
  | {
      ok: false;
      reason: "settings_unreadable" | "sizes_unreadable" | "price_unknown" | "credit_unreadable" | "marketing_floor";
      detail: string | null;
    };

/** ④g · E16 · may THIS slice spend its cost and still leave the credit kept for codes? The settings re-read (OD63 — never
 *  the defaults), the campaign's saved sizes, today's price, the credit read fresh, the ONE rule. ⛔ Fail closed, and each
 *  cause in its OWN words — the words Resume refuses with (the U43b-2 review): settings that cannot be read in full →
 *  `settings_unreadable`; saved sizes that cannot be read → `sizes_unreadable`; no price for a segment →
 *  `price_unknown`; a credit read that fails → `credit_unreadable`; too little → `marketing_floor`. */
async function creditFor(c: StoredSmsCampaign, size: number, deps: EngineDeps): Promise<CreditCheck> {
  let reload: SettingsReload;
  try {
    reload = await deps.settings();
  } catch {
    reload = { ok: false, error: "the settings read threw" };
  }
  if (!reload.ok || !reload.readable) return { ok: false, reason: "settings_unreadable", detail: "the Marketing SMS settings could not be read in full" };
  const variants = savedVariantSizes(c);
  if (variants === null) return { ok: false, reason: "sizes_unreadable", detail: "the campaign's saved message sizes could not be read" };
  const configured = reload.settings.pricePerSegmentTzs;
  let cost: SegmentCostMeasure;
  try {
    cost = await deps.cost(configured);
  } catch {
    cost = { kind: "configured", tzsPerSegment: configured };
  }
  const costTzs = projectedCostTzs(size, variants, cost);
  // The settings' price is validated, so this is a price measure with no figure in it — never read as affordable.
  if (!Number.isFinite(costTzs)) return { ok: false, reason: "price_unknown", detail: "no price per segment could be read" };
  let read: SmsBalanceRead | null;
  try {
    read = await deps.readBalance();
  } catch {
    read = null;
  }
  // ⭐ F-2 (the engine's dry-fire, 2026-10-08) · a send reply's figure is pre-charge: its pending segments are priced at
  // today's price and taken off FIRST, so this slice never goes into the credit kept for codes on a one-batch-old figure.
  const perSegment = cost.kind === "unknown" ? configured : cost.tzsPerSegment;
  const balance = deps.rules.spendableBalance(balanceFigureOf(read), read?.pendingSegments, perSegment);
  const v = deps.credit({ balance, costTzs, reserveTzs: reload.settings.codesReserveTzs });
  if (v.ok) return { ok: true, reserveTzs: reload.settings.codesReserveTzs };
  return v.reason === "credit_low"
    ? { ok: false, reason: "marketing_floor", detail: `credit ${v.balanceTzs}, this slice up to ${v.costTzs}, kept for codes ${v.reserveTzs}` }
    : { ok: false, reason: "credit_unreadable", detail: null };
}

/** The variants this campaign sends: Swahili always, English when it has an English body. */
function variantsOf(t: CampaignTemplate): CampaignVariant[] {
  return t.bodyEn.trim().length > 0 ? ["SW", "EN"] : ["SW"];
}

/**
 * ⭐ E1 · E17 · ONE PERSON'S MESSAGE — asked by `dispatchSlice` only after the gate cleared this number, under its key (the
 * header). ⛔ A read that fails throws: `dispatchSlice` holds that row alone (`prepare:unanswered`).
 */
async function prepareFor(t: CampaignTemplate, key: string, deps: EngineDeps): Promise<SlicePrepared> {
  const user = await deps.users.findByPhone(`+${key}`);
  const origin: RecipientOrigin = user !== null ? "account" : "book";
  const variant: CampaignVariant = user !== null ? variantFor(t, user.locale) : "SW";
  const name = user !== null ? firstNameFor({ userDisplayName: user.displayName }) : null;
  const token = await deps.ensureToken(key);
  if (token === null) return { ok: false, reason: "token_unavailable", detail: "the opt-out link for this number could not be made" };
  const m = deps.render(t, { variant, name, token, origin });
  if (!m.ok) return { ok: false, reason: "template_invalid", detail: cleanText(m.problems[0] ?? "the message failed its own check", TRAIL_TEXT_MAX) };
  return {
    ok: true,
    body: m.text,
    meta: { locale: variant, segments: m.size.segments, bodyLen: m.text.length, token, origin, name: origin === "account" && name !== null ? "account" : "fallback" },
  };
}

/** ④b · ⑥ · THE owner's switch, judged NOW through THE gate (`marketingLiveGate`; the console stub passes it). ⛔ A read
 *  that throws is a closed switch — never a licence. The reading is returned for the trail. */
async function switchNow(provider: SmsProviderResolution, deps: EngineDeps): Promise<{ ok: boolean; live: MarketingLiveSwitch; via: string | null }> {
  let live: MarketingLiveSwitch;
  try {
    live = await deps.liveSwitch();
  } catch {
    live = { state: "closed", why: "unreadable" };
  }
  const g = deps.liveGate(provider, live, deps.now().getTime());
  return g.ok ? { ok: true, live, via: g.via } : { ok: false, live, via: null };
}

/** ⛔ The send-age bound (the header's invariant): may a claim stored at `claimedAt` still reach the wire at `nowMs`? An
 *  instant that cannot be read is too old — the bound fails closed. */
function sendable(claimedAt: string | null, nowMs: number): boolean {
  const at = Date.parse(claimedAt ?? "");
  return Number.isFinite(at) && nowMs - at < CLAIM_SEND_MAX_AGE_MS;
}

/**
 * ⭐ E6 · THE LAST WORD BEFORE THE WIRE (`beforeSend`) — the campaign, the shop and THIS claim, re-read: a campaign no longer
 * RUNNING sends nothing (`not_running`); ⛔ nor does one whose confirmed count cannot be read (`confirmation_unreadable`)
 * or whose list is longer than confirmed (`list_over_confirmed_sending`) — U42's re-review; ⛔ nor does one whose owner's
 * switch closed while the slice gated (`live_switch_closed` — a state read before the claim is no licence now, the U43b-2
 * review); then only the rows still PENDING under this token go (a stalled claimant whose claims were reaped keeps none),
 * and ⛔ only while the claim is young enough to send (`slice_too_slow` otherwise — the send-age bound).
 */
async function verifyClaims(c: StoredSmsCampaign, token: string, provider: SmsProviderResolution, deps: EngineDeps): Promise<SliceSendVerdict> {
  const now = await deps.campaigns.find(c.id);
  if (now === null || now.status !== "RUNNING") return { proceed: false, reason: "not_running" };
  if (!isCount(now.audienceCount) || now.audienceCount < 1) return { proceed: false, reason: "confirmation_unreadable" };
  if (recipientRows(await countsOf(c.id, deps)) > now.audienceCount) return { proceed: false, reason: "list_over_confirmed_sending" };
  if (provider !== "unrecognised" && !(await switchNow(provider, deps)).ok) return { proceed: false, reason: "live_switch_closed" };
  const held = await deps.recipients.claimedBy(c.id, token);
  const nowMs = deps.now().getTime();
  if (held.some((r) => !sendable(r.claimedAt, nowMs))) return { proceed: false, reason: SLICE_TOO_SLOW };
  return { proceed: true, keep: held.map((r) => r.id) };
}

/** A whole trail replaced by one lawful mark — what a patch whose own words the rule set still refuses keeps (DC-5). */
const WITHHELD_TRAIL: SmsCampaignGateTrail = [{ check: "trail", verdict: "withheld", wording: null, source: null }];

/**
 * ⛔ DC-5 · A PATCH IS LAWFUL BEFORE IT IS HANDED IN. The rule set refuses the WHOLE batch for one unlawful patch, so each
 * is asked alone first; one refused is retried with its free words replaced by a lawful mark; one STILL refused is set
 * aside (null) — its row keeps the claim and the reaper settles it from the evidence — never forced, and never released
 * (a row that reached the wire released is a second message).
 */
function lawfulPatch(p: SmsCampaignRecipientSettle, at: string): SmsCampaignRecipientSettle | null {
  const asks = (x: SmsCampaignRecipientSettle): boolean => {
    try {
      assertSettle([x], at);
      return true;
    } catch {
      return false;
    }
  };
  if (asks(p)) return p;
  const plain = { ...p } as Record<string, unknown>;
  if ("gateTrail" in plain) plain.gateTrail = WITHHELD_TRAIL.map((g) => ({ ...g }));
  if ("skipDetail" in plain) plain.skipDetail = "";
  if ("error" in plain) plain.error = null;
  const degraded = plain as SmsCampaignRecipientSettle;
  return asks(degraded) ? degraded : null;
}

/** E10 · take the process's one slice flight, or say it is taken. A flight older than `SLICE_FLIGHT_STALE_MS` (or dated
 *  ahead by as much) is a lost one and no longer holds. JavaScript runs this to its end before any other step can. */
function takeFlight(state: EngineProcessState, campaignId: string, nowMs: number): number | null {
  const f = state.flight;
  if (f !== null && Math.abs(nowMs - f.since) < SLICE_FLIGHT_STALE_MS) return null;
  const ticket = (state.ticket = (Number.isSafeInteger(state.ticket) ? state.ticket : 0) + 1);
  state.flight = { campaignId, since: nowMs, ticket };
  return ticket;
}
function dropFlight(state: EngineProcessState, ticket: number): void {
  if (state.flight !== null && state.flight.ticket === ticket) state.flight = null;
}

/* ══ E6 · THE REAPER ════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The evidence fields the reaper reads — the newest message for the row, or none. */
function evidenceOf(m: StoredSmsMessage | undefined): ReapEvidence {
  if (m === undefined) return null;
  return {
    reference: m.reference, status: m.status, createdAt: m.createdAt, sentAt: m.sentAt, deliveredAt: m.deliveredAt,
    failedAt: m.failedAt, providerMsg: m.providerMsg, dlrStatus: m.dlrStatus, dlrDesc: m.dlrDesc,
  };
}

/**
 * ⭐ E6 · THE REAPER — every claim of this campaign older than `REAP_AFTER_MS` (at most `REAP_BATCH` a step), settled from
 * the evidence through `reapVerdict` (the pure table: none, an earlier attempt's, or a FAILED no receipt wrote → PENDING +1;
 * QUEUED/UNKNOWN → UNCONFIRMED; ACCEPTED → SENT; DELIVERED → DELIVERED; FAILED by a receipt → FAILED). Each patch names the
 * row's own claim, so a row that moved meanwhile is `lost`, never forced. ⭐ A row whose message reached the wire is given
 * the opt-out token that message carried — the number's one reused token, READ (`tokenOf`, never minted: E1) — so E30 and
 * the access export keep it (the U43b-2 review; its variant and size are not recoverable and stay empty). Runs for a
 * campaign in ANY status (§3.3: a PAUSED, CANCELLED or DONE campaign is only reaped, so a stranded claim never shows "not
 * sent" for a message that went). ONE SYSTEM row, only when it settled anybody.
 */
export async function reapStrandedClaims(campaignId: string, deps: EngineDeps = ENGINE_DEPS, opts?: { insideFlight?: number }): Promise<ReapResult> {
  const counts: ReapResult = { reaped: 0, toPending: 0, toSent: 0, toUnconfirmed: 0, toFailed: 0, toDelivered: 0 };
  const nowMs = deps.now().getTime();
  // ⛔ The U43b-2 re-review · NEVER BESIDE THIS PROCESS'S OWN SLICE OF THE SAME CAMPAIGN. A reap-only step (U47b's, for a
  // PAUSED / CANCELLED / DONE campaign — an officer's Pause lands while a slice is mid-send) must not release a claim the
  // slice in flight here is still sending: that slice settles its own rows. Only the slice itself, reaping first inside its
  // own flight (`insideFlight` = its ticket), passes. A lost flight (older than SLICE_FLIGHT_STALE_MS) no longer holds.
  const f = deps.state().flight;
  if (f !== null && f.campaignId === campaignId && f.ticket !== opts?.insideFlight && Math.abs(nowMs - f.since) < SLICE_FLIGHT_STALE_MS) return counts;
  const at = iso(nowMs);
  const stranded = await deps.recipients.findStranded(campaignId, iso(nowMs - REAP_AFTER_MS), REAP_BATCH);
  if (stranded.length === 0) return counts;
  const evidence = await deps.messages.findByTargets(DISPATCH_TARGET_TYPE, stranded.map((r) => r.id));
  const byTarget = new Map(evidence.filter((m) => typeof m.targetId === "string").map((m) => [m.targetId as string, m]));
  const patches: SmsCampaignRecipientSettle[] = [];
  for (const row of stranded) {
    const ev = evidenceOf(byTarget.get(row.id));
    let p = deps.rules.reapVerdict(row, ev, at);
    // A row whose message reached the wire, holding no token: read the one that message carried, and settle it with that.
    if ((p.to === "SENT" || p.to === "DELIVERED" || p.to === "UNCONFIRMED") && row.optOutToken === null && deps.tokenOf !== undefined) {
      // ⛔ A failed read settles the row without its token — never the whole reap (it only serves E30's record).
      const token = await deps.tokenOf(row.msisdn).catch(() => null);
      if (token !== null) p = deps.rules.reapVerdict({ ...row, optOutToken: token }, ev, at);
    }
    const lawful = lawfulPatch(p, at);
    if (lawful !== null) patches.push(lawful);
  }
  if (patches.length === 0) return counts;
  const result = await deps.recipients.settle(patches, at);
  const lost = new Set(result.lost);
  for (const p of patches) {
    if (lost.has(p.id)) continue;
    counts.reaped++;
    if (p.to === "PENDING") counts.toPending++;
    else if (p.to === "SENT") counts.toSent++;
    else if (p.to === "UNCONFIRMED") counts.toUnconfirmed++;
    else if (p.to === "FAILED") counts.toFailed++;
    else if (p.to === "DELIVERED") counts.toDelivered++;
  }
  if (counts.reaped > 0) {
    await record(deps, {
      category: "SYSTEM", action: ENGINE_REAPED_ACTION, actorId: null, targetType: "SmsCampaign", targetId: campaignId,
      payload: { ...counts },
    });
  }
  return counts;
}

/* ══ THE STEP ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ ONE STEP OF A RUNNING CAMPAIGN (the header). ⛔ A read or a write that FAILS throws — nothing more is claimed, and a
 * claim already taken is the reaper's after `REAP_AFTER_MS`.
 */
export async function runCampaignSlice(campaignId: string, deps: EngineDeps = ENGINE_DEPS): Promise<SliceStepResult> {
  const state = deps.state();
  const ticket = takeFlight(state, campaignId, deps.now().getTime());
  if (ticket === null) return { kind: "waiting", reason: "busy", until: null };
  try {
    return await sliceStep(campaignId, state, deps);
  } finally {
    dropFlight(state, ticket);
  }
}

async function sliceStep(campaignId: string, state: EngineProcessState, deps: EngineDeps): Promise<SliceStepResult> {
  // ② the campaign, read now
  const c = await deps.campaigns.find(campaignId);
  if (c === null) throw new Error("runCampaignSlice: no such campaign — nothing was claimed");
  if (c.status !== "RUNNING") return { kind: "not_running", status: c.status };

  // ③ E6 · the reaper first
  const reaped = await reapStrandedClaims(campaignId, deps, { insideFlight: state.flight?.ticket });

  // ④a ⛔ FIRST — the list no longer than confirmed, before anything else is read: no Resume can fix either
  if (!isCount(c.audienceCount) || c.audienceCount < 1) return pauseFor(c, "confirmation_unreadable", "the confirmed count cannot be read", deps);
  if (recipientRows(await countsOf(campaignId, deps)) > c.audienceCount) {
    return pauseFor(c, "list_over_confirmed_sending", `more rows on the list than the ${c.audienceCount} confirmed`, deps);
  }

  // ④b the owner's switch through THE gate (the console stub passes it), then the rail
  const provider = deps.provider();
  let switchCheck = sliceCheck("live_switch", "stub", "console");
  if (provider !== "unrecognised") {
    const s = await switchNow(provider, deps);
    if (!s.ok) return pauseFor(c, "live_switch_closed", s.live.state === "closed" ? `switch ${s.live.why}` : "the switch's on-until time has passed or cannot be read", deps);
    if (s.via === "open") switchCheck = sliceCheck("live_switch", "open", `until:${s.live.state === "open" ? s.live.closesAt : "unknown"}`);
  }
  // ⛔ An unrecognised provider is a dead rail whatever the rail reader answers — never a closed switch.
  const rail = deps.rail() ?? (provider === "unrecognised" ? "provider-unrecognised" : null);
  if (rail !== null) return pauseFor(c, railStopReason(rail), rail, deps);

  // ④c E9 · the send window — a WAIT, never a pause
  const sendWindow = await windowOf(deps);
  if (sendWindow.open !== true) {
    return sendWindow.reason === "quiet_hours"
      ? { kind: "waiting", reason: "quiet_hours", until: sendWindow.opensAt === "" ? null : sendWindow.opensAt }
      : { kind: "waiting", reason: "window_unreadable", until: null };
  }

  // ④d E12 · money first — a WAIT (a signal that cannot be read is busy: waiting costs only time)
  let busy: MoneyBusy;
  try {
    busy = deps.moneyBusy();
  } catch {
    busy = { busy: true, why: "lifecycle", stale: [] };
  }
  if (busy.busy) return { kind: "waiting", reason: "money_busy", until: null };

  // ④e E12 · a login or withdrawal code failed in the last two minutes — a WAIT
  const lastOtp = deps.otpLastFailureAt();
  const nowMs = deps.now().getTime();
  if (lastOtp !== null && otpFailureWaiting(nowMs, lastOtp)) {
    return { kind: "waiting", reason: "otp_failing", until: iso(lastOtp + OTP_FAILURE_WAIT_MS) };
  }

  // ④f the template's own verdict — a dry render per variant with the measurement token, origin account
  const template = templateOf(c);
  for (const variant of variantsOf(template)) {
    const dry = deps.render(template, { variant, name: null, token: footerMeasurementToken(), origin: "account" });
    if (!dry.ok) return pauseFor(c, "template_invalid", dry.problems[0] ?? "the saved message failed its own check", deps);
  }

  // ④g E16 · the credit kept for codes, for this slice — the console stub has no credit and spends none. ⭐ F-1 (the
  // engine's dry-fire, 2026-10-08): priced for the people this slice can still CLAIM, never a whole slice for nobody — a
  // campaign whose list was all sent, with the credit exactly at the reserve, priced a slice of 50 and paused
  // `marketing_floor` with nobody left, so it never reached DONE (and Resume paused it again). Nobody PENDING → the finish
  // (DONE, `held_rows`, or a wait). A count that cannot be read prices the whole slice, the safe side, as before.
  const size = deps.rules.adaptSliceSize(state.sliceSize, null);
  let creditCheck = sliceCheck("credit", "not_read", "console");
  let keptForCodes: number | undefined;
  if (provider !== "console") {
    let pending: number | null = null;
    try {
      pending = (await countsOf(c.id, deps)).PENDING;
    } catch {
      pending = null;
    }
    const owed = deps.rules.owedForSlice(size, pending);
    if (owed <= 0) return finishOrWait(c, deps);
    const credit = await creditFor(c, owed, deps);
    if (!credit.ok) return pauseFor(c, credit.reason, credit.detail, deps);
    keptForCodes = credit.reserveTzs;
    creditCheck = sliceCheck("credit", "ok", `kept-for-codes:${credit.reserveTzs}`);
  }

  // ⑤ THE CLAIM — a fresh token for this claim (D16)
  const token = deps.newToken();
  const claimed = await deps.recipients.claim(campaignId, size, token, deps.now().toISOString());
  if (claimed.length === 0) return finishOrWait(c, deps);

  // ⑥ THE ONE LOOP — the gate per recipient immediately before the wire; prepare and the re-read inside it
  const slice: SmsCampaignGateTrail = [
    sliceCheck("campaign", "RUNNING", campaignId), switchCheck, sliceCheck("send_window", "open", sendWindow.label), creditCheck,
  ];
  const rows: SliceRecipient[] = claimed.map((r) => ({ ref: r.id, msisdn: r.msisdn, prepare: (key: string) => prepareFor(template, key, deps) }));
  /** What the slice learns inside the loop's two hooks: when its one send began and came back, whether it THREW (and its
   *  words), and whether the re-read before the wire answered. */
  const seen: {
    sendStartedAt: number | null; sendMs: number; wireAt: string | null; hookAnswered: boolean; threw: string | null;
  } = { sendStartedAt: null, sendMs: 0, wireAt: null, hookAnswered: false, threw: null };
  const started = deps.clock();
  // ⛔ The U43b-2 re-review · THE SEND'S DEADLINE: the slice's OLDEST claim plus `CLAIM_SEND_MAX_AGE_MS` — after it a reaper may
  // judge the claim stranded, so `sendBatch` writes nothing and asks nothing past it (checked before its rows and again before
  // its request). An instant that cannot be read makes it NaN, which sendBatch refuses: fail closed.
  const claimMs = claimed.map((r) => Date.parse(r.claimedAt ?? ""));
  const notAfter = claimMs.length > 0 && claimMs.every(Number.isFinite) ? Math.min(...claimMs) + CLAIM_SEND_MAX_AGE_MS : Number.NaN;
  const sliceDeps: SliceDeps = {
    send: async (messages) => {
      const t0 = deps.clock();
      seen.sendStartedAt = t0;
      try {
        return await deps.send(messages, { ...(keptForCodes === undefined ? {} : { minimumBalanceTzs: keptForCodes }), notAfter });
      } catch (err) {
        // `dispatchSlice` answers every row of a thrown send `unconfirmed`, as it must; the slice reads the evidence (⑦).
        // ⛔ The error's CODE or NAME only — never its words, which can quote the call (the DLR route's precedent).
        const e = err as { code?: unknown; name?: unknown } | null;
        seen.threw = typeof e?.code === "string" && e.code !== "" ? e.code : typeof e?.name === "string" && e.name !== "" ? e.name : "Error";
        throw err;
      } finally {
        seen.sendMs = deps.clock() - t0;
        seen.wireAt = deps.now().toISOString();
      }
    },
    beforeSend: async (_cleared: readonly SliceCleared[]) => {
      const verdict = await verifyClaims(c, token, provider, deps);
      seen.hookAnswered = true;
      return verdict;
    },
    window: deps.window,
  };
  if (deps.gate !== undefined) sliceDeps.gate = deps.gate;
  const outcomes: SliceOutcome[] = await deps.dispatch(rows, sliceDeps);
  const gateMs = Math.max(0, (seen.sendStartedAt ?? deps.clock()) - started);

  // ⑦ THE SETTLE — the pure table, each patch lawful first (DC-5), one shop-wide fact paused or waited once (E7)
  // ⭐ A send that THREW (the U43b-2 review): never re-send what MIGHT have reached the network, release only what
  // CERTAINLY did not — a row no message of THIS claim names was never handed to the wire (sendBatch writes its rows before
  // the wire, P2; a message made before the claim is an earlier attempt's, DC-1); the rest stay UNCONFIRMED; one pause.
  let unsent: ReadonlySet<string> | undefined;
  if (seen.threw !== null) {
    const asked = outcomes.filter((o) => o.outcome === "unconfirmed").map((o) => o.ref);
    const named = asked.length === 0 ? [] : await deps.messages.findByTargets(DISPATCH_TARGET_TYPE, asked);
    const claimedMs = new Map(claimed.map((r) => [r.id, Date.parse(r.claimedAt ?? "")]));
    const ofThisClaim = new Set(named.filter((m) => {
      const at = Date.parse(m.createdAt);
      const since = claimedMs.get(m.targetId ?? "") ?? Number.NaN;
      return !(Number.isFinite(at) && Number.isFinite(since) && at < since);
    }).map((m) => m.targetId ?? ""));
    unsent = new Set(asked.filter((id) => !ofThisClaim.has(id)));
  }
  const shop: ShopWide = seen.threw !== null ? thrownSend(seen.threw) : deps.rules.isShopWide(outcomes);
  const ctx: SettleContext = unsent === undefined
    ? { claimToken: token, slice, wireAt: seen.wireAt, shop }
    : { claimToken: token, slice, wireAt: seen.wireAt, shop, unsent };
  const byId = new Map(claimed.map((r) => [r.id, r]));
  const settledAt = deps.now().toISOString();
  const patches: SmsCampaignRecipientSettle[] = [];
  for (const o of outcomes) {
    const row = byId.get(o.ref);
    if (row === undefined) continue;
    const p = deps.rules.settlementFor(o, row, ctx);
    const lawful = p === null ? null : lawfulPatch(p, settledAt);
    if (lawful !== null) patches.push(lawful);
  }
  const settled = patches.length === 0 ? { settled: 0, lost: [] as string[] } : await deps.recipients.settle(patches, settledAt);
  // ⭐ DC-4 · a SENT (or UNCONFIRMED) patch a receipt beat: the narrow door writes what it carried, never the status.
  for (const id of settled.lost) {
    const p = patches.find((x) => x.id === id);
    const owed = p === undefined ? null : deps.rules.sendRecordOf(p);
    if (owed !== null) await deps.recipients.recordSend(id, owed, settledAt);
  }

  // ⑧ E11 · the gate time (and the prepare and the re-read in it) folded into the next slice's size — when the gate ran
  const gated = outcomes.some((o) => !(o.outcome === "held" && (o.reason === "quiet_hours" || o.reason === "window_unreadable") && o.basis === undefined));
  if (gated && claimed.length > 0) {
    state.gateMsAvg = foldGateTime(state.gateMsAvg, gateMs / claimed.length);
    state.sliceSize = deps.rules.adaptSliceSize(state.sliceSize, state.gateMsAvg);
  }

  // ⭐ The re-review of round 2 · a streak counts slices IN A ROW of ONE run of the campaign: an officer's Pause and Resume
  // between two of them (a new `pausedAt`) starts both counts over, as the engine's own pause does.
  const tooSlow = (state.tooSlow ??= {});
  const runs = (state.runMark ??= {});
  const runMark = c.pausedAt ?? "";
  if (runs[campaignId] !== runMark) {
    delete state.unanswered[campaignId];
    delete tooSlow[campaignId];
    runs[campaignId] = runMark;
  }
  // The re-check before the wire that could not answer — a WAIT, and after BEFORE_SEND_UNANSWERED_MAX in a row a PAUSE
  if (shop.shopWide && shop.reason === "before_send_unanswered") state.unanswered[campaignId] = (state.unanswered[campaignId] ?? 0) + 1;
  else if (seen.hookAnswered) delete state.unanswered[campaignId];
  // ⭐ The U43b-2 re-review · a slice too slow to send, counted IN A ROW (`tooSlowCounts`): the gate side only at the smallest
  // group (the gate time is measured, so the next slice is smaller), the send side — `sendBatch`'s own DEADLINE_PASSED, a
  // stall a smaller group does not cure — at any size (the check of round 2's fix: uncounted, it waited for ever). ⭐ Reset
  // only by a slice that reached the check before the wire and got past it — never by one whose people were all refused,
  // which never met the bound (the same rule as the unanswered streak's).
  if (shop.shopWide && shop.reason === SLICE_TOO_SLOW) {
    if (deps.rules.tooSlowCounts(claimed.length, shop.detail === DEADLINE_PASSED)) tooSlow[campaignId] = (tooSlow[campaignId] ?? 0) + 1;
  } else if (seen.hookAnswered) delete tooSlow[campaignId];

  if (shop.shopWide && shop.pause) {
    const paused = await pauseFor(c, shop.reason as EngineStopReason, shop.detail, deps);
    // ⭐ `send_error`'s sentence sends the officer to the developer and the server log: once the pause has LANDED, the log
    // holds the fact — the campaign and the error's code or name only (the re-review of round 2: never the transport's
    // words, which the failed route carries), and where the words are: the batch's `sms.failed` audit rows.
    if (shop.reason === "send_error" && paused.kind === "paused") {
      console.error(deps.rules.sendErrorLog(campaignId, seen.threw));
    }
    return paused;
  }
  if (shop.shopWide && !shop.pause) {
    if (shop.reason === "not_running") return notRunning(campaignId, deps);
    if (shop.reason === "before_send_unanswered") {
      if ((state.unanswered[campaignId] ?? 0) >= BEFORE_SEND_UNANSWERED_MAX) {
        delete state.unanswered[campaignId];
        return pauseFor(c, "before_send_unanswered", `${BEFORE_SEND_UNANSWERED_MAX} slices running`, deps);
      }
      return { kind: "waiting", reason: "before_send_unanswered", until: null };
    }
    if (shop.reason === "quiet_hours") {
      const w = await windowOf(deps);
      return { kind: "waiting", reason: "quiet_hours", until: w.open !== true && w.opensAt !== "" ? w.opensAt : null };
    }
    // ⛔ The send-age bound: the claim grew too old to send — its people went back as they were. On the GATE side the slow
    // gate was measured above, so the next slice is smaller when it can be; three in a row pause at the smallest group, and
    // on the SEND side (`sendBatch`'s own deadline — a stall no smaller group cures) three in a row pause at any size.
    if (shop.reason === SLICE_TOO_SLOW) {
      if ((tooSlow[campaignId] ?? 0) >= SLICE_TOO_SLOW_MAX) {
        delete tooSlow[campaignId];
        return pauseFor(c, "slice_too_slow", `${SLICE_TOO_SLOW_MAX} slices running too slow to send at size ${state.sliceSize}`, deps);
      }
      return { kind: "waiting", reason: "slice_too_slow", until: null };
    }
    return { kind: "waiting", reason: "window_unreadable", until: null };
  }
  return {
    kind: "sent",
    claimed: claimed.length,
    handedOver: outcomes.filter((o) => o.outcome === "handed_over").length,
    skipped: outcomes.filter((o) => o.outcome === "skipped").length,
    failed: patches.filter((p) => p.to === "FAILED").length,
    unconfirmed: outcomes.filter((o) => o.outcome === "unconfirmed").length,
    // Still owed a message: released to PENDING or parked HELD (a row `claim_lost` is another claim's, and not counted).
    held: patches.filter((p) => p.to === "PENDING" || p.to === "HELD").length,
    reaped: reaped.reaped,
    gateMs: Math.round(gateMs),
    sendMs: Math.round(seen.sendMs),
  };
}

/** ⑤ Nobody to claim: the list counted again now — nobody PENDING and HELD left → pause `held_rows` (E8); nobody
 *  outstanding → DONE, with its one row; PENDING rows another claim holds (another process's slice, or a stranded claim the
 *  reaper will settle) → `waiting busy`. */
async function finishOrWait(c: StoredSmsCampaign, deps: EngineDeps): Promise<SliceStepResult> {
  const counts = await countsOf(c.id, deps);
  if (counts.PENDING > 0) return { kind: "waiting", reason: "busy", until: null };
  if (counts.HELD > 0) return pauseFor(c, "held_rows", `${counts.HELD} held`, deps);
  const at = deps.now().toISOString();
  const done = await deps.campaigns.transition(c.id, { from: ["RUNNING"], to: "DONE", patch: { finishedAt: at }, draftRevision: null, at });
  if (done === null) return notRunning(c.id, deps);
  await record(deps, {
    category: "SYSTEM", action: ENGINE_FINISHED_ACTION, actorId: null, targetType: "SmsCampaign", targetId: c.id,
    payload: { ...counts, rows: recipientRows(counts) },
  });
  return { kind: "finished", status: "DONE" };
}
