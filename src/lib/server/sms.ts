/**
 * SMS — the front door. One real provider (Blackball) and one dev stub (`console`).
 *
 * Pick the active provider with `SMS_PROVIDER`: `console` (default) or `blackball`.
 * The transport lives in `sms-blackball.ts`; this file owns everything that is true
 * of an SMS regardless of who carries it — the reference, the persisted row, the
 * cost gate, the health counters, the audit trail and the message templates.
 *
 * ── ⛔ WHAT WAS DELETED, AND WHY IT HAD TO BE ────────────────────────────────
 * `selcom`, `beem` and `africas-talking` are gone. Beem and Africa's Talking were
 * one-line stubs that threw. The Selcom adapter was worse: a complete, plausible
 * HTTP body written against a **guessed endpoint on an unsigned contract**, which
 * read as a working integration to anyone scanning the file. A provider the
 * platform cannot actually reach must not look like one it can.
 * ⚠️ `selcom.ts` — the PAYMENTS client — is a different subsystem and is untouched.
 *
 * ── 🔴 E-330, BOTH HALVES, FIXED HERE ────────────────────────────────────────
 * Measured on production 2026-09-10: 0 Otp rows, 0 `sms.delivered`, 0 `sms.failed`.
 * Nothing had ever attempted an SMS, and two things were waiting to lie about it:
 *
 *  ① `consoleSms.send()` logged "NOT delivered" and then RETURNED NORMALLY, so the
 *     facade took the success branch and wrote a delivery row into the **HMAC audit
 *     chain** for a message that never left the building. ⛔ A false row in the one
 *     record designed to be incorruptible is worse than the outage it conceals. It
 *     now THROWS in production, so a dropped message counts as failed and audits as
 *     `sms.failed`.
 *  ② `successRate` returned `1` when nothing had ever been attempted, making "never
 *     tried" indistinguishable from "perfect". It now returns `null` for no traffic
 *     — the shape `payment-ops.ts:66` already uses for exactly this reason.
 *
 * ── ⭐ "ACCEPTED" IS NOT "DELIVERED", AND THE AUDIT TRAIL NOW SAYS SO ─────────
 * The old success action was `sms.delivered`, written the instant the gateway
 * returned. A gateway accepting a message is not a handset receiving one. The
 * action is now `sms.accepted`; only a delivery receipt writes DELIVERED, and it
 * does so on the `SmsMessage` row, not here.
 *
 * Compliance:
 *  - TCRA-licensed sender ID required (`SMS_SENDER_ID`, ⛔ max 12 characters)
 *  - Every attempt persists to `SmsMessage`; receipts land on it by reference
 *  - Rate-limited per phone by the CALLER (`rate-limit.ts`, `otp.send` / `otp.resend`)
 */
import { audit, getAuditByActionsDurable } from "./audit";
import { db, type SmsPurpose, type StoredSmsMessage } from "./store";
import { randomId } from "./crypto";
import { toMsisdn255, isGatewayMsisdn, maskPhone } from "@/lib/phone-normalize";
import { sizeSms } from "@/lib/sms-compose";
import { appUrl } from "@/lib/app-url";
import { formatTzs } from "@/lib/utils";
import {
  BATCH_MAX,
  REFERENCE_MIN_CHARS,
  blackballConfigured,
  blackballBalance,
  blackballEnv,
  blackballSend,
  describeBlackball,
  senderIdProblem,
} from "./sms-blackball";

/* ══ PROVIDER RESOLUTION ═════════════════════════════════════════════════════ */

export type SmsProviderId = "blackball" | "console";
/** ⛔ TRI-STATE. `unrecognised` is a FAILED choice, not a default. */
export type SmsProviderResolution = SmsProviderId | "unrecognised";

/**
 * Which provider the environment actually selected.
 *
 * ⛔ AN UNRECOGNISED VALUE RESOLVES TO `unrecognised`, NEVER TO `console`. The old
 * `switch` had `default: return consoleSms`, so `SMS_PROVIDER=blackbal` — one
 * missing letter in a Railway variable — would have silently selected the stub on a
 * production box: every message dropped, `smsConfigured()` cheerfully true in dev
 * terms, and nothing anywhere saying so. This is `payment-control.ts`'s tri-state
 * lesson applied to the rail that will carry login codes.
 */
export function smsProviderResolution(): SmsProviderResolution {
  const raw = (process.env.SMS_PROVIDER ?? "console").trim().toLowerCase();
  if (raw === "blackball") return "blackball";
  if (raw === "console" || raw === "") return "console";
  return "unrecognised";
}

/**
 * Whether SMS will ACTUALLY deliver right now — read by invite campaigns before
 * promising anything, and by the OTP path before issuing a code nobody can receive.
 *
 * ⛔ IT NO LONGER READS `SMS_API_KEY`. That env belonged to the deleted Selcom stub.
 * A Blackball deployment sets `BLACKBALL_CLIENT_ID` / `BLACKBALL_CLIENT_SECRET` and
 * no `SMS_API_KEY` at all, so the old body reported a fully-configured rail as dead
 * — and `invite-service.ts` answers "dead" by silently leaving every phone invite
 * QUEUED. The env that is NOT read here is as load-bearing as the ones that are.
 */
export function smsConfigured(): boolean {
  return smsRailProblem() === null;
}

/** Why SMS cannot deliver on this box, or null when it can. `smsConfigured()` is exactly `smsRailProblem() === null`,
 *  so the two can never disagree. ⭐ The admin tile names the one that applies (2026-09-27): the balance read needs only
 *  the keys, so a box with no sender ID answered a balance and was captioned "Healthy" while every send was refused. */
export type SmsRailProblem = "provider-unrecognised" | "console-in-production" | "keys-not-set" | "sender-id";

export function smsRailProblem(): SmsRailProblem | null {
  switch (smsProviderResolution()) {
    case "blackball":
      if (!blackballConfigured()) return "keys-not-set";
      return senderIdProblem(process.env.SMS_SENDER_ID) ? "sender-id" : null;
    case "console":
      // The stub is a working channel in dev and a black hole in production.
      return process.env.NODE_ENV === "production" ? "console-in-production" : null;
    case "unrecognised":
      return "provider-unrecognised";
  }
}

/* ══ HEALTH AND BALANCE ══════════════════════════════════════════════════════ */

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_SMS_HEALTH: { sent: number; failed: number } | undefined;
  // eslint-disable-next-line no-var
  /** `pendingSegments`: what a send reply's PRE-CHARGE figure (BLACKBALL-SMS §1.4) has not yet taken off — 0 for a reading
   *  of the balance endpoint (see `recordBalance`). */
  var __50PICK_SMS_BALANCE: { tzs: number; at: number; pendingSegments?: number } | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_SMS_BALANCE_READ: { inflight: Promise<boolean> | null; failedAt: number | null; error: SmsBalanceError | null } | undefined;
  /** U43b-2 · the newest instant (epoch ms) an OTP-purpose `SmsMessage` row went FAILED or UNKNOWN in this process. */
  // eslint-disable-next-line no-var
  var __50PICK_OTP_LAST_FAILURE_AT: number | undefined;
}

/**
 * ⭐ U43b-2 · THE OTP-FAILURE MARK (ENGINE-SPEC §4.13, E12): login and withdrawal codes share the rail with marketing, so
 * the campaign slice WAITS two minutes after a code failed or went unknown. Stamped where an OTP row is written FAILED or
 * UNKNOWN, on `globalThis` (the slice runs in a server action's module instance, the OTP path in another — the money-busy
 * lesson). ⛔ NO BEHAVIOUR CHANGE: one assignment that cannot throw, and nothing in this file reads it.
 */
function noteOtpFailure(purpose: SmsPurpose | undefined): void {
  if (purpose === "OTP") globalThis.__50PICK_OTP_LAST_FAILURE_AT = Date.now();
}

/** U43b-2 · the newest OTP failure this process saw (epoch ms), or null — the campaign slice's one reader. */
export function lastOtpFailureAt(): number | null {
  const at = globalThis.__50PICK_OTP_LAST_FAILURE_AT;
  return typeof at === "number" && Number.isFinite(at) ? at : null;
}

/** ⛔ ON `globalThis`, NOT A MODULE-SCOPE `let`. Every other counter in this repo is
 *  (`retry.ts`, `__50PICK_LAST_SMS`, the audit queue); this one was the exception, so
 *  a hot reload or a cold start silently reset it and `/admin/system` read a fresh
 *  zero as though nothing had ever been sent. */
const health = () => (globalThis.__50PICK_SMS_HEALTH ??= { sent: 0, failed: 0 });

/** Below this, non-OTP traffic is refused. TZS. */
const balanceFloor = () => Number(process.env.SMS_BALANCE_FLOOR_TZS) || 50;
/** At or below this, ONE `sms.balance_low` audit row is written and every officer who can open Admin → System gets a
 *  bell row and an email (`notifyAdminsSmsCreditLow`) — on a downward crossing of this line or of the floor, and once
 *  for a balance a restart finds already low (see `recordBalance`). ⛔ Never an SMS: the rail it warns about is the one
 *  running out. TZS. */
const balanceAlert = () => Number(process.env.SMS_BALANCE_ALERT_TZS) || 150;

/** The two lines the admin card names in words ("alert at TZS 150"). Read from the same env as the gate. */
export function smsBalanceThresholds(): { floorTzs: number; alertTzs: number } {
  return { floorTzs: balanceFloor(), alertTzs: balanceAlert() };
}

/** A balance reading older than this is treated as UNKNOWN, never as low. */
const balanceTtlMs = () => Number(process.env.SMS_BALANCE_TTL_MS) || 15 * 60_000;

/** After a FAILED balance read, callers are answered "failed" without a new request for this long, so a reload
 *  or a burst of renders cannot re-pay a hanging vendor's timeout on every hit. */
const balanceRetryMs = () => Number(process.env.SMS_BALANCE_RETRY_MS) || 30_000;

/** How long `/admin/system` waits for a balance read before rendering what it has; the read carries on. */
export const SMS_BALANCE_RENDER_BUDGET_MS = 2_500;
/** The same for `/api/health`, which a deploy gate waits on — shorter. */
export const SMS_BALANCE_HEALTH_BUDGET_MS = 1_000;
/** A reading older than this is re-read before the floor may REFUSE on it (see `sendBatch`). */
const LOW_READING_RECHECK_MS = 60_000;
/** A restart that finds the balance already low alarms at most once in this window (see `recordBalance`). */
const BOOT_ALARM_REPEAT_MS = 24 * 60 * 60_000;

/** One low-balance alarm: the audit row, then the officers. ⛔ Best-effort; never throws into a send.
 *  `level` names the line the reading is under: the floor's copy says "paused", the alert line's "top up soon". */
function raiseLowBalance(from: number | null, tzs: number, threshold: number): void {
  const floor = balanceFloor();
  audit({
    category: "SYSTEM",
    action: "sms.balance_low",
    actorId: null,
    targetType: null,
    targetId: null,
    payload: { from, to: tzs, threshold, floor, level: tzs < floor ? "floor" : "alert" },
  });
  // ⭐ THE ALARM REACHES A PERSON (2026-09-26). It used to be the audit row alone, which nothing read, under a
  // comment saying officers were alarmed. Lazy import: no static sms ↔ notification edge.
  void import("./notification-service")
    .then((m) => m.notifyAdminsSmsCreditLow({ tzs, alertTzs: threshold, floorTzs: floor }))
    .catch(() => {});
}

/** A low episode opens with `sms.balance_low` and closes with `sms.balance_recovered`; the newer of the two says which
 *  side of the alert line the account was last seen on. */
const LOW_EPISODE_ACTIONS = ["sms.balance_low", "sms.balance_recovered"];

/** The balance climbed back over the alert line: close the low episode, durably, so a restart can tell a NEW low spell
 *  from the one already announced (the re-arm itself lives in the process and dies with it). One row per episode. */
function recordRecovery(from: number | null, tzs: number, threshold: number): void {
  audit({
    category: "SYSTEM",
    action: "sms.balance_recovered",
    actorId: null,
    targetType: null,
    targetId: null,
    payload: { from, to: tzs, threshold },
  });
}

/** The first reading after a restart is already at or below the alert line. Alarm unless THIS low episode alarmed
 *  within a day: a restart is not a crossing, and every push to main is a restart.
 *  ⭐ ONE EPISODE, NOT ANY ROW (2026-09-27). It used to stay silent for any `sms.balance_low` under a day old, so a
 *  second low spell after a top-up, found by a restart, was never announced. A newer `sms.balance_recovered` ends the
 *  episode; and an episode that alarmed at the alert line and is now below the FLOOR alarms again, because invites
 *  have paused since. ⚠️ Fails OPEN — a duplicate beats silence. */
async function raiseLowBalanceFoundAtBoot(tzs: number, threshold: number): Promise<void> {
  try {
    const { entries } = await getAuditByActionsDurable(LOW_EPISODE_ACTIONS, { category: "SYSTEM", limit: 1 });
    const last = entries[0];
    const at = last ? Date.parse(last.createdAt) : NaN;
    const sameEpisode = last?.action === "sms.balance_low" && Number.isFinite(at) && Date.now() - at < BOOT_ALARM_REPEAT_MS;
    const floor = balanceFloor();
    const lastTo = Number(last?.payload?.to);
    const newlyBelowFloor = tzs < floor && !(Number.isFinite(lastTo) && lastTo < floor);
    if (sameEpisode && !newlyBelowFloor) return;
  } catch { /* fail open */ }
  raiseLowBalance(null, tzs, threshold);
}

/** The first reading after a restart is ABOVE the alert line while the newest episode row still says low: the account
 *  recovered while no process watched. Close the episode, or the next low reading's boot check would take a new low
 *  spell for the old one and stay silent. One durable read per restart; a row only when an episode is open. */
async function closeLowEpisodeFoundAtBoot(tzs: number, threshold: number): Promise<void> {
  try {
    const { entries } = await getAuditByActionsDurable(LOW_EPISODE_ACTIONS, { category: "SYSTEM", limit: 1 });
    if (entries[0]?.action !== "sms.balance_low") return;
  } catch { return; }
  recordRecovery(null, tzs, threshold);
}

/**
 * Record the balance from an ACCEPTED reply. ⛔ ONLY an accepted one.
 *
 * 🔴 A REFUSED REPLY'S `balance` IS NOT THE ACCOUNT'S BALANCE. Blackball validates a
 * request BEFORE it authenticates it (measured 2026-09-16), so a refusal for bad
 * credentials or a schema complaint never identifies the account and answers
 * `balance: 0.0`. This function used to record every reply's figure — so a single
 * auth failure would store TZS 0, trip the cost floor, and refuse every INVITE send.
 * Those sends are refused BEFORE a request is made, so no fresh reading could ever
 * arrive to clear it: a latch, set by an outage that had already ended.
 *
 * ⚠️ AN ACCEPTED REPLY'S FIGURE IS PRE-CHARGE. The first live send reported TZS 250
 * and the portal then showed 244: the TZS 6 is applied after the reply. So a reading
 * lags by one batch, which is harmless for a floor — and is why no price is ever read
 * off ONE reply. ⭐ The DIFFERENCE between two consecutive replies is a different
 * quantity: when every message of the earlier chunk was DELIVERED (Blackball bills per
 * delivered message) and nothing else was sent or delivered in between, it is that
 * chunk's charge. `measureSegmentCost` (`lib/marketing/segment-cost.ts`, U39) walks
 * exactly those pairs; the portal stays the authority it is checked against.
 *
 * ⛔ THE ALARM IS EDGE-TRIGGERED, NOT LEVEL-TRIGGERED. A level check writes one
 * `sms.balance_low` row per send once the balance is low, burying the hash-chained
 * compliance log under precisely the condition that most needs reading. This audits
 * only on a downward crossing, and re-arms when the balance recovers.
 *
 * ⚠️ …AND A RESTART MUST NOT SWALLOW IT (2026-09-26). The reading lives in the process, so after every deploy
 * `prev` is null, and a balance that crossed the line while no process was watching (a send reply is pre-charge,
 * so the old process can record 154 while the account holds 148) never alarmed at all. A first reading at or below
 * the line now alarms too, at most once per low episode a day.
 *
 * ⭐ THE FLOOR IS A CROSSING TOO (2026-09-27). Only the alert line alarmed, so the usual drain 160 → 140 → 40 told the
 * officers "top up soon" once and then paused invites in silence. Crossing the floor now raises its own alarm (the
 * "paused … top up now" copy), once per crossing; a single jump over both lines is one alarm, with the floor's copy.
 *
 * ⛔ A LATE READING NEVER OVERWRITES A NEWER ONE (2026-09-27). A balance read can land seconds after it was asked, and a
 * send reply recorded meanwhile is newer. A reading is stamped with when it was ASKED (`readAt`) and dropped if the
 * snapshot already holds a later one — otherwise an old figure re-armed the alarm, or undid a top-up.
 *
 * ⭐ A SEND REPLY'S FIGURE IS PRE-CHARGE (BLACKBALL-SMS §1.4), so it is kept with the segments it has not yet taken off
 * (`pendingSegments` — this batch's chunks so far; the balance endpoint's true figure carries 0). The campaign engine
 * prices them before its next slice: without it, the credit kept for login codes could be gone into by one slice (the
 * engine's dry-fire, finding F-2, 2026-10-08). The alarms read the figure as it is — one chunk early at worst.
 */
function recordBalance(tzs: number | null, readAt = Date.now(), pendingSegments = 0): void {
  if (tzs === null) return;
  const cur = globalThis.__50PICK_SMS_BALANCE;
  if (cur && cur.at > readAt) return;
  const prev = cur?.tzs ?? null;
  globalThis.__50PICK_SMS_BALANCE = { tzs, at: readAt, pendingSegments: Number.isSafeInteger(pendingSegments) && pendingSegments > 0 ? pendingSegments : 0 };
  const threshold = balanceAlert();
  const floor = balanceFloor();
  if (prev !== null && prev > threshold && tzs <= threshold) {
    raiseLowBalance(prev, tzs, threshold);
  } else if (prev !== null && prev >= floor && tzs < floor) {
    raiseLowBalance(prev, tzs, threshold);
  } else if (prev === null && tzs <= threshold) {
    void raiseLowBalanceFoundAtBoot(tzs, threshold);
  } else if (prev !== null && prev <= threshold && tzs > threshold) {
    recordRecovery(prev, tzs, threshold);
  } else if (prev === null) {
    void closeLowEpisodeFoundAtBoot(tzs, threshold);
  }
}

export function smsBalanceSnapshot(): {
  tzs: number | null;
  at: number | null;
  /** Segments a send reply's pre-charge figure has not yet taken off (0 for the balance endpoint's reading). */
  pendingSegments: number;
  stale: boolean;
  belowAlert: boolean;
  belowFloor: boolean;
} {
  const b = globalThis.__50PICK_SMS_BALANCE ?? null;
  // ⛔ A STALE READING IS UNKNOWN, NOT LOW. The floor refuses INVITE sends before any
  // request is made, so while it holds no new reading can arrive — only OTP traffic
  // refreshes it. Without an expiry, a genuine low reading followed by a top-up would
  // keep campaigns refused until somebody happened to log in by phone code.
  const stale = b !== null && Date.now() - b.at > balanceTtlMs();
  const live = b !== null && !stale;
  return {
    tzs: b?.tzs ?? null,
    at: b?.at ?? null,
    pendingSegments: b?.pendingSegments ?? 0,
    stale,
    // ⛔ UNKNOWN IS NOT LOW. Before the first reply we have no reading, and refusing
    // traffic on an absence would take the rail down on every cold start.
    belowAlert: live && b!.tzs <= balanceAlert(),
    belowFloor: live && b!.tzs < balanceFloor(),
  };
}

/** Why a balance read produced no figure: `refused` — the vendor turned our CREDENTIALS down (a status:false
 *  400/401/403; its measured bad-credentials reply is a 400); `unreachable` — no response, our timeout, a rate limit
 *  (429) or the vendor's own 5xx; `unexpected` — any other reply (a moved endpoint's 404 page, a 200 whose balance we
 *  cannot read), which says nothing about the keys; `not-configured` — the provider's keys are not set on this box. */
export type SmsBalanceError = "refused" | "unreachable" | "unexpected" | "not-configured";

/** What one `refreshSmsBalance` call knows. `tzs`/`at` are the ONE snapshot after the call.
 *  · `fresh` — this call's read landed · `reused` — a reading younger than `maxAgeMs`, no request
 *  · `pending` — the budget ran out first; the read carries on and records itself when it lands
 *  · `failed` — the endpoint refused or did not answer (or did so under `SMS_BALANCE_RETRY_MS` ago); `error` says which
 *  · `unavailable` — this provider has no balance endpoint (the console stub, an unrecognised provider).
 *  ⛔ `stale` is true when `tzs` is a figure this call could NOT confirm — an earlier reading kept after a
 *  failed or unfinished read, or one past the TTL. Show it with its time, never as today's credit. */
export type SmsBalanceRead = {
  tzs: number | null;
  at: number | null;
  outcome: "fresh" | "reused" | "pending" | "failed" | "unavailable";
  stale: boolean;
  /** Set only with `failed`. The read is the platform's one free live credential check, so its verdict is kept. */
  error: SmsBalanceError | null;
  /** ⭐ Segments `tzs` has not yet taken off: a send reply's figure is pre-charge (§1.4); the endpoint's reading is 0.
   *  A caller deciding what it may still SPEND prices these first (the campaign engine's credit check, F-2). */
  pendingSegments?: number;
};

const balanceReadState = () => (globalThis.__50PICK_SMS_BALANCE_READ ??= { inflight: null, failedAt: null, error: null });

/** ONE request to the balance endpoint, shared by every concurrent caller (two tabs, a render and a send). It
 *  records the figure ITSELF when it lands, so a caller that stopped waiting still gets it into the snapshot.
 *  Resolves true when a figure was recorded. */
function readBalanceShared(read: () => Promise<BalanceReply>): Promise<boolean> {
  const st = balanceReadState();
  if (st.inflight) return st.inflight;
  // Stamped with when it was ASKED, so a reading that lands after a newer one cannot overwrite it (see recordBalance).
  const askedAt = Date.now();
  const p: Promise<boolean> = read()
    .catch((): BalanceReply => ({ tzs: null, error: "unreachable" }))
    .then((r) => {
      if (r.tzs === null) { st.failedAt = Date.now(); st.error = r.error; return false; }
      st.failedAt = null;
      st.error = null;
      recordBalance(r.tzs, askedAt);
      return true;
    })
    .finally(() => { if (st.inflight === p) st.inflight = null; });
  st.inflight = p;
  return p;
}

/** Wait for `p` at most `budgetMs` (no budget = wait for it). The promise itself is never cancelled. */
async function withinBudget<T>(p: Promise<T>, budgetMs: number | undefined): Promise<T | "pending"> {
  if (budgetMs === undefined) return p;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<"pending">((resolve) => { timer = setTimeout(() => resolve("pending"), budgetMs); });
  try {
    return await Promise.race([p, late]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ⭐ READ THE ACCOUNT BALANCE NOW — `POST /api/account/balance`: authenticated, sends nothing, costs
 * nothing — and record it in the ONE snapshot. THE ONLY REFRESH PATH: the admin card, `/api/health` and
 * `sendBatch`'s floor decision all call this (Ali, 2026-09-26: "check the app — you can know how much we
 * have now"). A reading younger than `maxAgeMs` is reused, so a page render cannot hammer the vendor.
 *
 * 🔴 THE PAGE USED TO WAIT FOR THE VENDOR (2026-09-26). `/admin/system` — the page with the maintenance
 * kill-switch — awaited this before rendering, a failed read was not remembered, and each render paid the
 * vendor's full 8 s timeout again. Now: `budgetMs` bounds the wait (the read carries on), one request is
 * shared by every concurrent caller, and a failure is remembered for `SMS_BALANCE_RETRY_MS`.
 *
 * ⛔ Never throws. A failed read records nothing; an earlier reading, if any, comes back with `stale: true`.
 * Unknown is never treated as low.
 */
export async function refreshSmsBalance(opts: { maxAgeMs?: number; budgetMs?: number } = {}): Promise<SmsBalanceRead> {
  const answer = (outcome: SmsBalanceRead["outcome"]): SmsBalanceRead => {
    const s = smsBalanceSnapshot();
    const confirmed = outcome === "fresh" || outcome === "reused";
    const error = outcome === "failed" ? (balanceReadState().error ?? "unreachable") : null;
    return { tzs: s.tzs, at: s.at, outcome, stale: s.tzs !== null && (s.stale || !confirmed), error, pendingSegments: s.pendingSegments };
  };
  const before = smsBalanceSnapshot();
  if (before.tzs !== null && before.at !== null && Date.now() - before.at < (opts.maxAgeMs ?? 60_000)) return answer("reused");
  const transport = pickTransport();
  if (!transport?.balance) return answer("unavailable");
  const st = balanceReadState();
  if (!st.inflight && st.failedAt !== null && Date.now() - st.failedAt < balanceRetryMs()) return answer("failed");
  const landed = await withinBudget(readBalanceShared(() => transport.balance!()), opts.budgetMs);
  return answer(landed === "pending" ? "pending" : landed ? "fresh" : "failed");
}

export function smsHealthSnapshot(): { sent: number; failed: number; successRate: number | null } {
  const h = health();
  const total = h.sent + h.failed;
  return {
    ...h,
    // 🔴 E-330 ② — `null`, not `1`. "Never tried" and "perfect" are different facts.
    successRate: total === 0 ? null : h.sent / total,
  };
}

/* ══ THE DEV TEST RING ═══════════════════════════════════════════════════════ */

/** Dev-only ring buffer of the last few outgoing SMS bodies, keyed by phone.
 *  Read by /api/dev-test/last-otp so end-to-end tests can complete the OTP step
 *  without scraping stdout. Disabled in production.
 *
 *  ⛔ FED BY THE FACADE, NOT BY `consoleSms`. It used to be written only by the
 *  console stub, so the six E2E drives that read it would all have broken the moment
 *  a QA box pointed `SMS_PROVIDER` at a real gateway — a class of breakage that only
 *  appears once someone is testing the thing this whole change exists to enable. */
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_LAST_SMS: Map<string, { body: string; at: number }[]> | undefined;
}
function recordTestSms(to: string, body: string) {
  if (process.env.NODE_ENV === "production") return;
  const m = (globalThis.__50PICK_LAST_SMS ??= new Map<string, { body: string; at: number }[]>());
  const arr = m.get(to) ?? [];
  arr.push({ body, at: Date.now() });
  if (arr.length > 5) arr.splice(0, arr.length - 5);
  m.set(to, arr);
}

/* ══ THE TRANSPORTS ══════════════════════════════════════════════════════════ */

/** One chunk's verdict, whoever carried it. */
/** One chunk's verdict, whoever carried it.
 *  ⭐ `ambiguous` IS A FIELD, NOT AN INFERENCE. It used to be derived here by regex-matching
 *  the transport's own message text for "transport failure" — a magic string crossing a
 *  module boundary. Reword that message in `sms-blackball.ts` and every lost reply would
 *  silently become FAILED instead of UNKNOWN, and FAILED invites a retry: a second SMS at a
 *  second charge. The transport knows whether the request completed, so it says so. */
type ChunkOutcome = { ok: boolean; ambiguous: boolean; detail: string; message: string; balance: number | null };
/** A balance read: the account's figure, or why there is none. */
type BalanceReply = { tzs: number; error: null } | { tzs: null; error: SmsBalanceError };
type SmsTransport = {
  name: SmsProviderId;
  sendChunk(msgs: { msisdn: string; text: string; reference: string }[]): Promise<ChunkOutcome>;
  /** The account's true balance, or why it cannot be read. Optional: the console stub has none. */
  balance?(): Promise<BalanceReply>;
};

const consoleTransport: SmsTransport = {
  name: "console",
  async sendChunk(msgs) {
    // 🔴 E-330 ① — NEVER PRINT THE BODY IN PRODUCTION, AND NEVER RETURN AS THOUGH
    // IT WENT. If the console provider is somehow active in prod it is a
    // misconfiguration: log a loud, code-free warning and THROW, so the attempt
    // counts as failed and audits as failed. Returning normally is what wrote a
    // false delivery row into the audit chain.
    if (process.env.NODE_ENV === "production") {
      const to = msgs[0]?.msisdn ?? "";
      // ⛔ ONE LINE, AND THE TEMPLATE SITS DIRECTLY INSIDE THE CALL. `pii-in-logs`
      // §4 matches this exact shape as source text, so wrapping the argument onto
      // its own line silently disarms the guard that keeps the OTP out of the logs.
      // Reformatting here is a real change, not a cosmetic one.
      console.error(`[SMS] console provider active in PRODUCTION — set SMS_PROVIDER=blackball. ${msgs.length} message(s) to ${to.slice(0, 4)}***${to.slice(-2)} NOT delivered.`);
      throw new SmsError("NOT_CONFIGURED", "the console provider delivers nothing in production");
    }
    for (const m of msgs) console.log(`\n[SMS → ${m.msisdn}]\n  ${m.text}\n  (ref: ${m.reference})\n`);
    return { ok: true, ambiguous: false, detail: "console", message: "console", balance: null };
  },
};

/** The HTTP statuses a credential refusal comes with. The measured bad-credentials reply is a 400. */
const CREDENTIAL_REFUSALS = new Set([400, 401, 403]);

const blackballTransport: SmsTransport = {
  name: "blackball",
  async sendChunk(msgs) {
    const env = blackballEnv();
    if (!env) throw new SmsError("NOT_CONFIGURED", "blackball: BLACKBALL_CLIENT_ID / BLACKBALL_CLIENT_SECRET not set");
    const problem = senderIdProblem(env.senderId);
    if (problem) throw new SmsError("NOT_CONFIGURED", `blackball: sender ID ${problem}`);
    const r = await blackballSend(env, msgs);
    // ⛔ U43b-2 · A REFUSAL IS THE GATEWAY'S OWN `status:false`, ON A STATUS LINE BELOW 500 — measured: every refusal the
    // gateway makes (bad keys, a schema complaint) is a 400 carrying the boolean, decided before anything is queued, so it
    // charged nothing and a re-send is not a second charge. Anything else that is not an acceptance is AMBIGUOUS: no
    // response (`transport`), a body that died, a 5xx (a proxy's 504 can arrive AFTER the gateway took the batch), an HTML
    // page or an empty body, JSON without the boolean — we do not know whether the gateway has the batch, so the row is
    // UNKNOWN (a late receipt can still settle it) and the result TRANSPORT, never a refusal a caller may re-send.
    const refusedByGateway = r.verdict === false && r.httpStatus < 500;
    return { ok: r.ok, ambiguous: !r.ok && !refusedByGateway, detail: describeBlackball(r), message: r.message, balance: r.balance };
  },
  async balance(): Promise<BalanceReply> {
    const env = blackballEnv();
    if (!env) return { tzs: null, error: "not-configured" };
    const r = await blackballBalance(env);
    // ⛔ Only an authenticated reply carries the account's balance; a refusal's 0.0 is not one.
    const tzs = r.ok ? r.balance : null;
    if (tzs !== null) return { tzs, error: null };
    // No response at all, a rate limit, or the vendor's own 5xx is "did not answer".
    if (r.transport !== null || r.httpStatus >= 500 || r.httpStatus === 429) return { tzs: null, error: "unreachable" };
    // ⛔ "refused" is a verdict on our KEYS, and the operator answers it by rotating them (2026-09-27): only a
    // status:false 400/401/403 earns it. A moved endpoint's 404 page, or a 200 whose balance we cannot read, is not one.
    if (!r.ok && CREDENTIAL_REFUSALS.has(r.httpStatus)) return { tzs: null, error: "refused" };
    return { tzs: null, error: "unexpected" };
  },
};

function pickTransport(): SmsTransport | null {
  switch (smsProviderResolution()) {
    case "blackball":
      return blackballTransport;
    case "console":
      return consoleTransport;
    case "unrecognised":
      return null;
  }
}

/* ══ ERRORS ══════════════════════════════════════════════════════════════════ */

export type SmsFailureCode =
  | "NOT_CONFIGURED"
  | "PROVIDER_UNRECOGNISED"
  | "BALANCE_FLOOR"
  /** U49a · an all-MARKETING batch held at the credit kept for login and withdrawal codes — only when its caller set
   *  `minimumBalanceTzs` (`SmsBatchOptions`). Whole batch, before any row or request, like `BALANCE_FLOOR`. */
  | "MARKETING_FLOOR"
  /** The number is not one a gateway can dial — refused here, before a row exists. See `sendBatch`. */
  | "BAD_MSISDN"
  | "REJECTED"
  | "TRANSPORT"
  | "UNKNOWN"
  /** U43b-2 review · an all-MARKETING batch whose caller's deadline (`SmsBatchOptions.notAfter`) passed before its
   *  request: refused whole before any row is written, or — when it passed while the rows were being written — those rows
   *  FAILED with no request made. Never an OTP: an OTP never meets a deadline. */
  | "DEADLINE_PASSED";

/** A typed failure, so a caller can branch without regex-ing prose. */
export class SmsError extends Error {
  constructor(
    readonly code: SmsFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "SmsError";
  }
}

/* ══ THE REFERENCE ═══════════════════════════════════════════════════════════ */

/**
 * The correlation key, minted HERE and never by a caller.
 *
 * ⭐ IT IS THE ONLY THING A DELIVERY RECEIPT CARRIES. Blackball's callback sends
 * `{status, reference, description, msisdn}` — no message id, no timestamp we
 * chose. So the reference is the join key between a send and its outcome, and
 * minting it in the facade is what guarantees every send has one.
 *
 * `sms_` + 24 hex = 28 characters, comfortably over the gateway's 20-char floor
 * (`randomId` takes BYTES and returns hex, so 12 → 24). Asserted, not assumed.
 */
export function mintSmsReference(): string {
  const ref = `sms_${randomId(12)}`;
  if (ref.length < REFERENCE_MIN_CHARS) {
    throw new Error(`sms: minted a ${ref.length}-char reference; the gateway floor is ${REFERENCE_MIN_CHARS}`);
  }
  return ref;
}

/* ══ THE ONE SEND PATH ═══════════════════════════════════════════════════════ */

export type SmsOutbound = {
  to: string;
  body: string;
  purpose?: SmsPurpose;
  targetType?: string;
  targetId?: string;
};

export type SmsResult = {
  reference: string;
  to: string;
  ok: boolean;
  error?: string;
  code?: SmsFailureCode;
  /** ⭐ THE CALLER'S OWN KEY, HANDED BACK. Results come out in input order, but a
   *  caller that zips them by INDEX breaks silently the day anything reorders or
   *  drops one — and the failure mode is an invite marked SENT because a different
   *  invite succeeded. Carrying the target through removes the coupling entirely. */
  targetType?: string | null;
  targetId?: string | null;
};

export type SmsBatchOutcome = {
  results: SmsResult[];
  balanceTzs: number | null;
  /** Set when the batch never reached the gateway at all. Every row stays QUEUED. */
  refused?: SmsFailureCode;
};

/**
 * ⭐ U49a · WHAT A CALLER MAY ASK OF ONE BATCH BEYOND ITS MESSAGES (ENGINE-SPEC §4.12 decision 1, E16).
 * Leave it out and `sendBatch` behaves exactly as it always has: every existing caller (the OTP path, invites, the
 * campaign test send) passes nothing.
 */
export type SmsBatchOptions = {
  /**
   * The credit kept for login and withdrawal codes, in TZS — the campaign engine's LAST line (its slice checks the
   * credit before it claims anyone). It judges ONLY a batch whose every message is MARKETING, after the platform floor,
   * and holds the whole batch `MARKETING_FLOOR` on a CONFIRMED reading below it. ⛔ An OTP never passes it.
   */
  minimumBalanceTzs?: number;
  /**
   * ⛔ U43b-2 review · THE CALLER'S DEADLINE, in epoch milliseconds — the campaign engine's send-age bound: the oldest claim
   * of its slice plus `CLAIM_SEND_MAX_AGE_MS`, after which a reaper may release that claim (it finds no row) and a second
   * slice would send the same people again. It judges ONLY a batch whose every message is MARKETING (an OTP, an invite or a
   * test never passes it, and a batch carrying one is never held by it), checked TWICE: just before the rows are written
   * — passed: the whole batch refused `DEADLINE_PASSED`, nothing written, no request — and just before each request —
   * passed (the write itself stalled): no request, those rows FAILED (no receipt token, so the reaper releases them).
   * ⛔ A deadline that is not a finite figure holds the batch: a malformed option never opens the rail.
   */
  notAfter?: number;
};

/** U43b-2 review · has the caller's deadline passed (a malformed one has)? Only ever asked for an all-MARKETING batch. */
function deadlinePassed(notAfter: number): boolean {
  return !Number.isFinite(notAfter) || Date.now() >= notAfter;
}

/** U49a · a CONFIRMED reading under the credit kept for codes: a live figure (one past the TTL is stale) strictly
 *  below it. ⛔ UNKNOWN IS NOT LOW — no reading, or a stale one, never holds a batch here (the engine fails closed). */
function belowKeptForCodes(keptTzs: number): boolean {
  const s = smsBalanceSnapshot();
  return s.tzs !== null && !s.stale && s.tzs < keptTzs;
}

const chunk = <T,>(xs: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};

/**
 * Send many messages. ⛔ NEVER THROWS — it reports per-message verdicts so a caller
 * can do per-entry accounting without a try/catch around each one. `send()` below is
 * this with one message plus a throw, so there is exactly ONE code path that mints
 * references, persists rows, gates on cost and parses the verdict.
 *
 * ── THE ATTRIBUTION RULE, AND ITS HONEST LIMIT ───────────────────────────────
 * The gateway answers once per REQUEST, not once per message, so a chunk's verdict
 * is all there is at this layer. `status:true` marks every message in that chunk
 * ACCEPTED; a refusal marks every message in it FAILED with the same reason. ⛔ Do
 * not invent finer attribution — there is no per-message data in the reply, and
 * per-message truth is exactly what the delivery receipt is for.
 *
 * ⚠️ A TRANSPORT FAILURE LEAVES THE ROW `UNKNOWN`, NOT `FAILED`. The gateway may
 * hold the batch and bill for it; we simply lost the reply. Calling that a failure
 * invites a retry, and a retry is a second SMS at a second charge.
 *
 * ⭐ U49a · `opts.minimumBalanceTzs` (`SmsBatchOptions`) adds ONE check after the platform
 * floor, for an all-MARKETING batch only. With no option this function is what it was.
 */
export async function sendBatch(messages: SmsOutbound[], opts?: SmsBatchOptions): Promise<SmsBatchOutcome> {
  if (messages.length === 0) return { results: [], balanceTzs: smsBalanceSnapshot().tzs };

  const transport = pickTransport();
  const refuse = (code: SmsFailureCode, error: string): SmsBatchOutcome => ({
    results: messages.map((m) => ({ reference: "", to: m.to, ok: false, error, code, targetType: m.targetType ?? null, targetId: m.targetId ?? null })),
    balanceTzs: smsBalanceSnapshot().tzs,
    refused: code,
  });

  if (!transport) {
    return refuse("PROVIDER_UNRECOGNISED", `SMS_PROVIDER="${process.env.SMS_PROVIDER}" is not a provider this build knows`);
  }
  if (!smsConfigured()) return refuse("NOT_CONFIGURED", "the SMS provider is not configured");

  // ══ 🔴 D2 · THE REFUSAL COMES BEFORE THE ROW, AND BEFORE THE MONEY ═══════════
  //
  // Until 2026-09-25 `sendBatch` normalised whatever it was handed, wrote the `SmsMessage` row and
  // POSTed it. A malformed number therefore cost a request, a row, and a charge, and came back as
  // the SAME undifferentiated HTTP 400 every other gateway failure returns — so nobody could tell a
  // bad number from a bad credential. Measured before this change: a Kenyan `+254…`, a Dar es
  // Salaam landline, a truncated nine-digit string and D1's sixteen-digit output all reached the
  // wire.
  //
  // ⭐ IT REFUSES PER MESSAGE, NOT PER BATCH. A campaign of ten thousand must not be killed by one
  // bad row in an imported list — that is the whole reason this sits here rather than in a caller.
  // `refused` (the whole-batch field) stays what it always was: the batch never left the building.
  //
  // ⭐ RESULTS ARE PLACED BY INDEX, NOT PUSHED. `invite-service` reads results back positionally as
  // well as by `targetId`, and dropping a message from the middle of a pushed array shifts every
  // later one — an invite marked SENT because a DIFFERENT invite succeeded. Assigning by the input
  // index makes that impossible to reintroduce.
  //
  // ⚠️ AND IT RUNS BEFORE THE COST FLOOR, SO THE FLOOR JUDGES ONLY WHAT WILL ACTUALLY BE SENT. A
  // batch of [good OTP, bad INVITE] is now an OTP-only send and keeps the OTP floor exemption,
  // which is the safe direction: the floor exists to protect login codes, never to refuse one.
  const results: SmsResult[] = new Array(messages.length);
  const prepared: Array<{ out: SmsOutbound; index: number; reference: string; msisdn: string }> = [];
  const badMasked: string[] = [];

  messages.forEach((m, index) => {
    const msisdn = toMsisdn255(m.to);
    if (isGatewayMsisdn(msisdn)) return; // keep it; it is prepared below, in order
    badMasked.push(maskPhone(msisdn));
    results[index] = {
      reference: "",
      to: m.to,
      ok: false,
      // ⛔ The message names the SHAPE, never the number — §5.14, and this string reaches logs.
      error: `not a number this gateway can dial: expected 255 then 6 or 7 and eight more digits, got ${msisdn.length} digits`,
      code: "BAD_MSISDN",
      targetType: m.targetType ?? null,
      targetId: m.targetId ?? null,
    };
  });
  messages.forEach((m, index) => {
    if (results[index]) return;
    prepared.push({ out: m, index, reference: mintSmsReference(), msisdn: toMsisdn255(m.to) });
  });

  if (badMasked.length > 0) {
    // ⭐ THE REFUSAL IS AUDITED, NOT ONLY THE SEND. Eleven days of chasing a silent webhook were
    // ended by a row recording a REFUSED attempt, not a successful one; the same rule applies here.
    // ⛔ `maskPhone` or nothing — a marketing list inside the unprunable HMAC chain is one nobody
    // can ever delete.
    audit({
      category: "SYSTEM",
      action: "sms.refused",
      actorId: null,
      targetType: null,
      targetId: null,
      payload: { reason: "BAD_MSISDN", count: badMasked.length, masked: badMasked.slice(0, 20) },
    });
  }

  // Nothing survivable left: no balance read, no row, no request.
  if (prepared.length === 0) return { results, balanceTzs: smsBalanceSnapshot().tzs };

  // ⛔ THE COST FLOOR EXEMPTS OTP, DELIBERATELY. The floor exists to stop a CAMPAIGN
  // eating the float the login path needs. Once OTP is the login path, refusing a
  // login code to conserve a few shillings is a self-inflicted outage — the opposite of
  // what the floor is for. An OTP batch therefore never waits on a balance read either.
  // ⚠️ IT READS `prepared`, NOT `messages` (2026-09-25): the floor judges what will actually be
  // sent, so a refused INVITE beside a good OTP can no longer drag the login code under the floor.
  const everyMessageIsOtp = prepared.every((p) => (p.out.purpose ?? "OPS") === "OTP");
  if (!everyMessageIsOtp) {
    // ⭐ ASK, DON'T GUESS. With no reading, or a stale one, the floor would otherwise judge a
    // campaign on nothing — and a campaign held by the floor makes no request that could
    // refresh it. `POST /api/account/balance` is free and authenticated, so a missing or stale
    // reading is replaced with the account's true balance before the decision is made. If the
    // read fails the reading stays unknown, and unknown is never treated as low.
    // ⛔ THROUGH `refreshSmsBalance`, NOT A SECOND INLINE COPY (2026-09-26): one path, so the shared
    // request and the remembered failure apply here too.
    await refreshSmsBalance({ maxAgeMs: balanceTtlMs() });
    // ⭐ A LOW READING IS RE-CHECKED BEFORE IT REFUSES (2026-09-26). The admin card now writes this snapshot,
    // so "TZS 30 on the card → top up → send" was refused for up to 15 minutes on a figure the top-up had
    // already made false. Refusing is the costly outcome and a read is free.
    if (smsBalanceSnapshot().belowFloor) await refreshSmsBalance({ maxAgeMs: LOW_READING_RECHECK_MS });
    if (smsBalanceSnapshot().belowFloor) {
      // ⚠️ The whole batch is held, INCLUDING any message already refused BAD_MSISDN above. Nothing
      // was attempted either way, and `refuse()` reports one reason per batch by contract.
      return refuse(
        "BALANCE_FLOOR",
        `SMS credit is below the TZS ${balanceFloor()} floor — non-critical messages are held so login codes keep sending`,
      );
    }
    // ⛔ U49a · THE CREDIT KEPT FOR LOGIN AND WITHDRAWAL CODES (ENGINE-SPEC §4.12 decision 1, E16) — ADDITIVE, judged
    // after the platform floor above, and ONLY when the caller set `minimumBalanceTzs` AND every prepared message is
    // MARKETING: a batch that carries a login code beside marketing is never held by it, and an OTP-only batch never
    // reaches this block at all. A CONFIRMED reading below it holds the WHOLE batch, as the floor does — re-checked first
    // when it is over a minute old (a top-up is honoured, exactly as the floor's re-check honours one).
    // ⛔ UNKNOWN STAYS "NOT LOW" HERE, as everywhere in this file: failing closed on an unreadable credit is the ENGINE's
    // rule (its slice pauses `credit_unreadable` before it claims anyone), never the shared send path's.
    // ⛔ A floor that is not a figure of 0 or more (NaN, a string, a negative) holds the batch: a malformed option never
    // opens the rail.
    const keptForCodes = opts?.minimumBalanceTzs;
    if (keptForCodes !== undefined && prepared.every((p) => p.out.purpose === "MARKETING")) {
      if (!Number.isFinite(keptForCodes) || keptForCodes < 0) {
        return refuse("MARKETING_FLOOR", "the credit kept for login and withdrawal codes is not a usable figure, so marketing messages are held");
      }
      if (belowKeptForCodes(keptForCodes)) await refreshSmsBalance({ maxAgeMs: LOW_READING_RECHECK_MS });
      if (belowKeptForCodes(keptForCodes)) {
        return refuse(
          "MARKETING_FLOOR",
          `SMS credit is below the ${formatTzs(keptForCodes)} kept for login and withdrawal codes — marketing messages are held so codes keep sending`,
        );
      }
    }
  }

  // ⛔ U43b-2 review · THE CALLER'S DEADLINE (`notAfter`) — CHECK 1 OF 2, before any row is written. Judged ONLY when the
  // caller set it AND every prepared message is MARKETING (an OTP, an invite or a test never passes it, and a batch carrying
  // one is never held by it). Passed — or not a figure: the WHOLE batch refused `DEADLINE_PASSED`, nothing written, no
  // request (the engine reads it as its `slice_too_slow` wait: its people go back as they were).
  const notAfter = opts?.notAfter;
  const deadlineApplies = notAfter !== undefined && prepared.every((p) => p.out.purpose === "MARKETING");
  if (deadlineApplies && notAfter !== undefined && deadlinePassed(notAfter)) {
    return refuse("DEADLINE_PASSED", "the deadline for this batch passed before it was written — nothing was written or sent");
  }

  const nowIso = new Date().toISOString();
  const senderId = (process.env.SMS_SENDER_ID ?? "").trim();
  // 🔴 THE STORED MSISDN MUST BE THE WIRE FORM, NOT THE STORED E.164.
  // `User.phoneE164` holds `+255760000006`; the gateway is sent `255760000006`, and its
  // delivery receipt quotes THAT back. Persisting the `+` form here meant the DLR route's
  // identity cross-check (`row.msisdn !== msisdn.replace(/\D/g, "")`) could never match,
  // so EVERY real receipt would have been discarded as a mismatch — and audited as a
  // SECURITY event, turning correct vendor behaviour into a wall of false alarms. Found by
  // `test:otp-delivery` §6, not by the DLR suite, which had seeded its own rows in the
  // right shape and so could not see it.
  // ⭐ ROWS FIRST, HTTP SECOND. A crash between the two leaves QUEUED rows carrying
  // real references, so a receipt that arrives anyway still lands, and a sweep can
  // see exactly what we do not know the fate of. The reverse order loses both.
  const rows: StoredSmsMessage[] = prepared.map((p) => ({
    reference: p.reference,
    msisdn: p.msisdn,
    purpose: p.out.purpose ?? "OPS",
    provider: transport.name,
    senderId,
    bodyLen: p.out.body.length,
    status: "QUEUED",
    providerMsg: null,
    dlrStatus: null,
    dlrDesc: null,
    balanceTzs: null,
    attempts: 1,
    targetType: p.out.targetType ?? null,
    targetId: p.out.targetId ?? null,
    createdAt: nowIso,
    sentAt: null,
    deliveredAt: null,
    failedAt: null,
  }));
  await db.smsMessage.createMany(rows);

  let balance = smsBalanceSnapshot().tzs;
  // ⭐ F-2 · the segments THIS batch has handed over so far — what each accepted reply's pre-charge figure has not yet
  // taken off (see recordBalance). A batch starts at 0: an earlier batch's charges have landed by its first reply.
  let sentSegments = 0;

  for (const group of chunk(prepared, BATCH_MAX)) {
    // ⛔ U43b-2 review · THE CALLER'S DEADLINE — CHECK 2 OF 2, immediately before the request: the row write itself may have
    // stalled past it (an INSERT waiting on a lock or a half-open socket — the one wait here with no bound of its own), and a
    // request made now could reach people a reaper has meanwhile released for another slice to send. So NO request: those
    // rows FAILED with no receipt token — nothing left the building, and the reaper's rule releases such a row (+1).
    // ⛔ No health count and no OTP-failure mark: the network was never asked, and the batch is MARKETING only.
    if (deadlineApplies && notAfter !== undefined && deadlinePassed(notAfter)) {
      const detail = "the deadline for this batch passed while its rows were written — no request was made";
      const failedAt = new Date().toISOString();
      for (const p of group) {
        await db.smsMessage.update(p.reference, { status: "FAILED", providerMsg: detail, failedAt });
        results[p.index] = { reference: p.reference, to: p.out.to, ok: false, error: detail, code: "DEADLINE_PASSED", targetType: p.out.targetType ?? null, targetId: p.out.targetId ?? null };
      }
      audit({
        category: "SYSTEM",
        action: "sms.failed",
        actorId: null,
        targetType: null,
        targetId: null,
        payload: { provider: transport.name, count: group.length, code: "DEADLINE_PASSED", detail },
      });
      continue;
    }
    let outcome: ChunkOutcome;
    // The reply's balance is as of this request, so it is stamped with when it was asked (see recordBalance).
    const askedAt = Date.now();
    try {
      outcome = await transport.sendChunk(
        group.map((p) => ({ msisdn: p.msisdn, text: p.out.body, reference: p.reference })),
      );
    } catch (err) {
      // ⛔ U43b-2 · A THROW IS A FAILURE BEFORE THE WIRE, AND ITS ROW AND ITS CODE SAY THE SAME THING. The transports throw
      // only before a request is made — an `SmsError` they raise on purpose (NOT_CONFIGURED), or `blackballSend`'s own
      // programming-error guards (an empty or oversized batch, a short reference); a reply that is lost or dies comes back
      // as `transport` and is the AMBIGUOUS path below, never this one. So the row is FAILED and the code is the error's own
      // — or UNKNOWN for a throw that is not an `SmsError`. ⛔ Never TRANSPORT here: that code means "the gateway may have it"
      // (`dispatchSlice` settles it UNCONFIRMED, never re-sent), while this row says FAILED and no receipt can ever move it.
      const code = err instanceof SmsError ? err.code : "UNKNOWN";
      const detail = String((err as Error)?.message ?? err).slice(0, 200);
      for (const p of group) {
        health().failed++;
        noteOtpFailure(p.out.purpose);
        await db.smsMessage.update(p.reference, { status: "FAILED", providerMsg: detail, failedAt: new Date().toISOString() });
        results[p.index] = { reference: p.reference, to: p.out.to, ok: false, error: detail, code, targetType: p.out.targetType ?? null, targetId: p.out.targetId ?? null };
      }
      audit({
        category: "SYSTEM",
        action: "sms.failed",
        actorId: null,
        targetType: null,
        targetId: null,
        payload: { provider: transport.name, count: group.length, code, detail },
      });
      continue;
    }

    // Only an ACCEPTED reply identifies the account — see recordBalance for why a
    // refusal's `balance: 0.0` must never reach the floor.
    if (outcome.ok) {
      for (const p of group) sentSegments += sizeSms(p.out.body).segments;
      recordBalance(outcome.balance, askedAt, sentSegments);
      if (outcome.balance !== null) balance = outcome.balance;
    }
    const settledAt = new Date().toISOString();
    // A reply we could not complete is AMBIGUOUS; a reply that said no is a refusal.
    const ambiguous = !outcome.ok && outcome.ambiguous;

    for (const p of group) {
      if (outcome.ok) {
        health().sent++;
        if (process.env.NODE_ENV !== "production") recordTestSms(p.out.to, p.out.body);
        await db.smsMessage.update(p.reference, {
          status: "ACCEPTED",
          providerMsg: outcome.message.slice(0, 200),
          balanceTzs: outcome.balance,
          sentAt: settledAt,
        });
        results[p.index] = { reference: p.reference, to: p.out.to, ok: true, targetType: p.out.targetType ?? null, targetId: p.out.targetId ?? null };
      } else {
        health().failed++;
        noteOtpFailure(p.out.purpose);
        await db.smsMessage.update(p.reference, {
          status: ambiguous ? "UNKNOWN" : "FAILED",
          providerMsg: outcome.message.slice(0, 200),
          // A refusal's `balance` is not the account's (it reads 0.0 before auth) — no figure beats a false one.
          balanceTzs: null,
          ...(ambiguous ? {} : { failedAt: settledAt }),
        });
        results[p.index] = {
          reference: p.reference,
          to: p.out.to,
          ok: false,
          error: outcome.message,
          code: ambiguous ? "TRANSPORT" : "REJECTED",
          targetType: p.out.targetType ?? null,
          targetId: p.out.targetId ?? null,
        };
      }
    }

    audit({
      category: "SYSTEM",
      // ⭐ `sms.accepted`, NOT `sms.delivered`. The gateway taking a message is not a
      // handset receiving one, and this row goes into the HMAC chain. Only the
      // delivery receipt may claim delivery, and it says so on the SmsMessage row.
      action: outcome.ok ? "sms.accepted" : "sms.failed",
      actorId: null,
      targetType: null,
      targetId: group[0]?.reference ?? null,
      payload: {
        provider: transport.name,
        count: group.length,
        purposes: [...new Set(group.map((p) => p.out.purpose ?? "OPS"))],
        detail: outcome.detail,
        balanceTzs: outcome.ok ? outcome.balance : null,
      },
    });
  }

  return { results, balanceTzs: balance };
}

/* ══ THE ONE-MESSAGE FACADE ══════════════════════════════════════════════════ */

export type SmsProvider = {
  name: string;
  send(
    to: string,
    body: string,
    opts?: { purpose?: SmsPurpose; targetType?: string; targetId?: string },
  ): Promise<{ id: string; reference: string; cost?: number }>;
};

/**
 * Send one message. ⛔ THROWS an `SmsError` on failure — `invite-service.ts`'s
 * per-entry `try/catch` and the OTP path both depend on that contract.
 */
export const sms: SmsProvider = {
  get name() {
    return smsProviderResolution();
  },
  async send(to, body, opts) {
    const { results, refused } = await sendBatch([{ to, body, ...opts }]);
    const r = results[0];
    if (!r || !r.ok) {
      throw new SmsError(refused ?? r?.code ?? "UNKNOWN", r?.error ?? "sms send failed");
    }
    return { id: r.reference, reference: r.reference };
  },
};

/* ══ TEMPLATES ═══════════════════════════════════════════════════════════════ */

/** Templated OTP message — keeps it ≤ 160 GSM-7 chars. EN + SW + ZH. */
export function otpMessage(code: string, locale: "EN" | "SW" | "ZH" = "SW"): string {
  switch (locale) {
    case "SW": return `Msimbo 50pick: ${code}. Dakika 5. Usishirikishe.`;
    case "ZH": return `50pick验证码：${code}。有效期5分钟。请勿分享。`;
    case "EN":
    default:   return `50pick code: ${code}. Valid 5 min. Don't share.`;
  }
}

const SMS_BASE_URL = appUrl();

/** Invite SMS: the campaign's short message + the bonus + a register link with
 *  the campaign code. Kept compact to fit a single SMS segment where possible. */
export function inviteMessage(opts: { message: string; code: string; bonusTzs: number }): string {
  const base = opts.message.trim();
  const bonus = `Bonus ${formatTzs(opts.bonusTzs)}`;
  const link = `${SMS_BASE_URL}/auth/register?invite=${encodeURIComponent(opts.code)}`;
  return `${base ? base + " " : ""}${bonus}. 50pick: ${link}`;
}
