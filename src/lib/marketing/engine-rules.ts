/**
 * ⭐ U43b-2 · THE SLICE'S DECISIONS, PURE — what the campaign engine (`src/lib/server/marketing/engine.ts`) decides about
 * one slice's outcomes and one stranded claim, written as functions of their inputs so `test:marketing-engine` can TABLE
 * them (ENGINE-SPEC §4.13 decisions 2–4 and its "as built" note; E3 · E4 · E6 · E7 · E8 · E11 · E20 · DC-1 · DC-4 · DC-5).
 *
 * ── THE SETTLEMENT TABLE (`settlementFor`, `isShopWide`) ───────────────────────────────────────────────────────────────
 * One slice ends in one outcome per claimed row (`dispatchSlice`). Each becomes ONE patch of the settle door — or none:
 *   · `skipped`                  → SKIPPED (the gate's reason and its detail): the system working, never a failure.
 *   · `handed_over`              → SENT (the wire's reference, the hand-over instant, the token, the variant, the size).
 *   · `unconfirmed`              → UNCONFIRMED (the reference when the wire gave one) — E4: settled, never re-sent by itself.
 *   · `failed` BAD_MSISDN        → FAILED: this person's number cannot be dialled, whatever the gateway does.
 *   · `failed`, a row the shop-wide verdict touches (EVERY row that reached the wire failed with ONE other code — a
 *     `status:false` refusal, or a failure `sendBatch` met BEFORE its request) → PENDING (+1): neither reached anybody nor
 *     was charged, so a re-send after Resume is not a second message (E7). The pause names its cause truly: the gateway's
 *     own "no" (REJECTED) → `gateway_refused`; a transport that threw before its request (sendBatch's chunk catch: UNKNOWN)
 *     → `send_error`; a code that is itself a stop reason (`NOT_CONFIGURED` …) → that key. Failed with a code the whole
 *     batch does not share → FAILED with that code.
 *   · `held`, a shop-wide reason → PENDING (+0) — `BALANCE_FLOOR` · `NOT_CONFIGURED` · `PROVIDER_UNRECOGNISED` ·
 *     `MARKETING_FLOOR` and the engine's own vetoes before the wire — `list_over_confirmed_sending` ·
 *     `confirmation_unreadable` · `live_switch_closed` — PAUSE the campaign; `quiet_hours` · `window_unreadable` ·
 *     `not_running` · `before_send_unanswered` · `slice_too_slow` are a WAIT here — the engine PAUSES the last two after
 *     three in a row (its own counts: `BEFORE_SEND_UNANSWERED_MAX`; `SLICE_TOO_SLOW_MAX` by route, `tooSlowCounts` — the
 *     gate side at the smallest group, the send side at any size).
 *   · `held` about one person    → `gate_unanswered`, `prepare:<reason>` (and ⭐ ANY reason this table does not know — a
 *     reason added later is bounded, never a silent loop): attempts + 1 below `MAX_ROW_ATTEMPTS` → PENDING (+1); at it →
 *     HELD (E8). Outstanding either way.
 *   · `held` `claim_lost`        → NO PATCH: the row is someone else's now (a reaper, another slice).
 * ⛔ ONE shop-wide fact is never N failed rows, and the rows it did not touch keep their own verdicts: a row the gate refused
 * in the same slice is still SKIPPED (its refusal was acted on — `dispatchSlice` already wrote the RG line for it, so
 * releasing it would write a second one on the next slice), a per-person hold is still that person's.
 * ⭐ U43b-2 AS BUILT · AN UNANSWERED BATCH: when EVERY row that reached the wire came back `unconfirmed` (a lost reply, a
 * 5xx after the gateway took the batch, a body nobody could read — `sms.ts` reads each of those AMBIGUOUS), its rows are
 * still settled UNCONFIRMED (never released: the gateway may hold them and bill for them) and the campaign PAUSES
 * `gateway_unanswered` — so an outage turns ONE slice into "no answer", never the whole audience.
 * ⭐ U43b-2 REVIEW · A SEND THAT THREW (`thrownSend`): the slice cannot tell from the throw whether `sendBatch` reached its
 * request, so it reads the evidence — ⛔ never re-send what MIGHT have reached the network, release only what CERTAINLY
 * did not: a row no message of this claim names was never handed to the wire (`sendBatch` writes its rows BEFORE the wire,
 * P2) → PENDING (+1); a row a message names → UNCONFIRMED. The campaign pauses `send_error`, whose words are true of both.
 *
 * ── THE TRAIL (E20, `gateTrailFor`) ────────────────────────────────────────────────────────────────────────────────────
 * Every settled row carries, in order: the slice's own checks (the campaign, the switch, the window, the credit), the
 * gate's verdict (its reason and detail, or `ok` with the basis it gave), the render (the variant, the origin, whether the
 * account's own name printed) and the dispatch (its outcome and the reference). References, never copies of evidence.
 * ⛔ DC-5 · every string is scrubbed (`scrubPhoneRuns` — a run becomes four bullets and its last two digits) and cut to
 * what its column takes BEFORE it is handed in: the settle's rule set refuses, never scrubs, and one gateway message that
 * echoes a number would otherwise refuse the slice's whole settle. ⭐ A `source` is scrubbed the way the rule set reads it
 * (`cleanSource`): the words that hold a letter — a reference, an id — are kept whole, so a reference whose hex happens to
 * hold a phone-shaped run is never corrupted on the record a receipt is matched against.
 *
 * ── THE REAPER (E6, DC-1, `reapVerdict`) ───────────────────────────────────────────────────────────────────────────────
 * A claim older than `REAP_AFTER_MS` is settled from the EVIDENCE — the newest `SmsMessage` that names the row:
 *   no message, or one made BEFORE this claim (an earlier attempt's — DC-1) → PENDING (+1): provably never handed over
 *   by this claim, because `sendBatch` writes its rows BEFORE the wire (P2); QUEUED / UNKNOWN → UNCONFIRMED (the
 *   reference kept); ACCEPTED → SENT; DELIVERED → DELIVERED; FAILED with a receipt's token → FAILED `receipt:<token>`
 *   (it reached the network, and a handset never took it); ⭐ FAILED with NO receipt token → PENDING (+1) — `sms.ts`
 *   wrote it itself, for the gateway's own `status:false` or a throw before the request: it never reached a handset and
 *   nothing was charged, so settling it FAILED would turn ONE shop-wide fact into N terminal rows (E7, the U43b-2 review);
 *   the next slice meets the refusal again and pauses ONCE. ⛔ Every case where the wire may have been reached stays
 *   UNCONFIRMED — and so does a message whose own record cannot be read whole (an ACCEPTED row with no hand-over instant,
 *   a status this table does not know): the reaper never re-sends on evidence it cannot read. ⭐ A row that reached the
 *   wire keeps the opt-out token its message carried — the number's one reused token, read back by the engine (E30).
 *
 * ── THE SLICE SIZE (E11, `adaptSliceSize`) ─────────────────────────────────────────────────────────────────────────────
 * Start at `SLICE_START`, never above `SLICE_MAX` (= one `sendBatch` chunk, `BATCH_MAX`), never below `SLICE_MIN`, aimed
 * at `SLICE_GATE_BUDGET_MS` of gating from the measured per-recipient time — which, since U43b-1, includes the prepare
 * (the token and the render) and the engine's re-read before the wire: everything between the claim and the wire, the
 * window in which a person who says stop is still sent to. It moves at most by half or by double per slice.
 *
 * ⛔ PURE AND CLIENT-SAFE: type imports only from the server modules (erased), and ONE pure runtime import — the phone-run
 * scrubber of the contact book (`contact-fields.ts`, client-safe: the composer's own template module reads it). The
 * column bounds below are restated, never imported from the rule set (a server module); `test:marketing-engine` holds
 * them equal to `campaign-model.ts`'s.
 *
 * Guard: `npm run test:marketing-engine` §S · §R · §C · §T · Red: `npm run red:marketing-engine` (in memory).
 */
import type { SliceMeta, SliceOutcome } from "@/lib/server/marketing/dispatch";
import type {
  MessagingLocale, SmsCampaignGateTrail, SmsCampaignRecipientSettle, SmsRecipientSendRecord, StoredSmsCampaignRecipient,
  StoredSmsMessage,
} from "@/lib/server/store";
import type { SmsRailProblem } from "@/lib/server/sms";
import type { BalanceFigure } from "@/lib/marketing/campaign-estimate";
import { scrubPhoneRuns } from "@/lib/contacts/contact-fields";

/* ══ THE NUMBERS ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ E11 · the most rows one slice claims — one `sendBatch` chunk (`BATCH_MAX`, sms-blackball.ts) and the claim door's own
 *  ceiling (`SMS_RECIPIENT_CLAIM_MAX`, campaign-model.ts): `test:marketing-engine` holds the three equal. */
export const SLICE_MAX = 50;
/** E11 · the first slice of a process, before any gate time is measured. */
export const SLICE_START = 20;
/** E11 · a slow gate never shrinks a slice below this (`test:marketing-engine` S14). */
export const SLICE_MIN = 5;
/** E11 · the gating (and preparing) one slice aims at: the time between the claim and the wire. */
export const SLICE_GATE_BUDGET_MS = 10_000;
/** E8 · a person the engine could not check or prepare this many times is parked HELD (outstanding). */
export const MAX_ROW_ATTEMPTS = 3;
/** E11 · the weight of the newest measurement in the in-process moving average of the per-recipient gate time. */
export const GATE_TIME_WEIGHT = 0.3;
/** E12 · after a login or withdrawal code failed or went unknown, marketing steps aside this long. ⭐ Declared HERE (the
 *  U47b-1 review): the live view reads it to say "nobody driving" only when the engine is not waiting on purpose, and the
 *  view may not import the engine (`test:marketing-engine` S27) — `engine.ts` re-exports it, never written twice. */
export const OTP_FAILURE_WAIT_MS = 2 * 60_000;

/** ⭐ Does a `slice_too_slow` wait COUNT toward the pause? Two routes (the re-review of U43b-2's round 2, and the check of its
 *  fix): the GATE side — `beforeSend` found the claim too old, the time spent checking people — counts only at the SMALLEST
 *  group (`SLICE_MIN` people, or fewer left to claim): the gate time is measured, so the next slice IS smaller and tries
 *  again uncounted; the SEND side — `sendBatch`'s own deadline (`DEADLINE_PASSED`: its row writes stalled) — counts at ANY
 *  size: that time is not the gate's, a smaller group does not cure it, and left uncounted it would wait for ever. */
export function tooSlowCounts(claimed: number, sendSide: boolean): boolean {
  if (sendSide === true) return true;
  return Number.isSafeInteger(claimed) && claimed >= 1 && claimed <= SLICE_MIN;
}

/**
 * ⭐ THE ONE LOG LINE a `send_error` pause writes once it has LANDED (its sentence sends the officer to the developer and
 * the server log — the U43b-2 re-review; the check of its round-2 fix). ⛔ Never a phone number and never a transport's
 * words: the THROWN route (`threw`, the error's code or name as the engine read it) logs it MADE LAWFUL here and cut
 * (`cleanText` — a code that is a phone number is masked) and says that is all that is kept (no `sms.failed` row exists
 * when the send itself threw); the FAILED route (`threw` null) logs UNKNOWN alone and points to the batch's `sms.failed`
 * rows, which hold the words.
 */
export function sendErrorLog(campaignId: string, threw: string | null): string {
  const what = threw !== null
    ? `${cleanText(threw, AUDIT_DETAIL_MAX)} — the send threw; its code or name is all that is kept`
    : "UNKNOWN — the batch's sms.failed audit rows hold the transport's words";
  // The campaign's id is the server's own (`cmp_` + hex), never a person's: printed as it is, so the log can be searched.
  return `[marketing-engine] campaign ${campaignId} paused send_error: ${what}`;
}

/**
 * ⭐ WHAT THE CREDIT REALLY IS BEFORE THE NEXT SLICE (the engine's dry-fire, finding F-2, 2026-10-08). A send reply's balance
 * is PRE-CHARGE (BLACKBALL-SMS §1.4): read just after a slice, it still held that slice's charge, so the next slice's check
 * ran one batch behind and could go into the credit kept for login codes by one slice. The segments the reading has not
 * yet taken off (`SmsBalanceRead.pendingSegments` — 0 for the balance endpoint's true reading) are priced at today's price
 * per segment and taken off here. An unreadable figure stays unreadable; a price that is not a positive figure takes
 * nothing off (the settings' price is validated upstream).
 */
/**
 * ⭐ HOW MANY PEOPLE A SLICE IS PRICED FOR (the engine's dry-fire, finding F-1, 2026-10-08): those it can still CLAIM —
 * `min(size, PENDING)` — never a whole slice for nobody. A campaign whose list was all sent, with the credit exactly at the
 * reserve, priced a slice of 50, paused `marketing_floor` with nobody left and never reached DONE. A count that is not a
 * whole number prices the whole slice (the safe side, as before). 0 → the engine goes straight to its finish.
 */
export function owedForSlice(size: number, pending: number | null): number {
  if (pending === null || !Number.isSafeInteger(pending) || pending < 0) return size;
  return Math.min(size, pending);
}

export function spendableBalance(fig: BalanceFigure, pendingSegments: number | undefined, tzsPerSegment: number): BalanceFigure {
  if (fig.kind !== "live") return fig;
  const n = typeof pendingSegments === "number" && Number.isSafeInteger(pendingSegments) && pendingSegments > 0 ? pendingSegments : 0;
  const price = Number.isFinite(tzsPerSegment) && tzsPerSegment > 0 ? tzsPerSegment : 0;
  return n === 0 || price === 0 ? fig : { ...fig, tzs: fig.tzs - n * price };
}

/** ⭐ E12 · does marketing step aside for a login or withdrawal code that failed at `lastOtp`? Dated either side of now by
 *  less than the wait — a failure stamped ahead of the clock waits as one just behind it. THE ONE READING: the slice's
 *  step ④e and the live view's "nobody driving" both ask it (the U47b-1 re-review), so the two can never disagree. */
export function otpFailureWaiting(nowMs: number, lastOtp: number | null): boolean {
  return typeof lastOtp === "number" && Number.isFinite(lastOtp) && Number.isFinite(nowMs) && Math.abs(nowMs - lastOtp) < OTP_FAILURE_WAIT_MS;
}

/** The column bounds of the settle door, RESTATED here (the rule set is a server module): a trail string, free words, a
 *  code, the trail's length. `test:marketing-engine` holds each equal to `campaign-model.ts`'s. */
export const TRAIL_TEXT_MAX = 200;
export const WORDS_MAX = 500;
export const CODE_MAX = 100;
export const TRAIL_MAX = 24;
/** The longest detail an audit row carries — the gateway's words for `gateway_refused` (§4.13's audit rows). */
export const AUDIT_DETAIL_MAX = 200;

/* ══ THE VOCABULARY ═════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Why the engine PAUSES a campaign — each key has its sentence in `campaign-status.ts` (`STOP_REASON_SENTENCE`, §3.4), and
 * each sentence is TRUE of every way the engine writes its key.
 * ⭐ U43b-2 as built adds to the spec's list: `gateway_unanswered` (an unanswered batch), `before_send_unanswered` (the
 * engine could not re-check its own claims, three slices running), U42's `list_over_confirmed_sending` (a list longer than
 * confirmed, found by the slice — the U42 re-review); and, at the U43b-2 review, `confirmation_unreadable` (a confirmed
 * count that is not a count, mid-campaign — the word Resume answers it with; never U42's `audience_unreadable`, whose cause
 * and remedy are another's), `send_error` (a send that failed on our side), and — the credit check's causes each in its
 * own words, the words Resume refuses with — `settings_unreadable`, `sizes_unreadable`, `price_unknown` beside
 * `credit_unreadable` (now the credit read alone).
 */
export type EngineStopReason =
  | "live_switch_closed" | "NOT_CONFIGURED" | "PROVIDER_UNRECOGNISED" | "BALANCE_FLOOR" | "MARKETING_FLOOR" | "marketing_floor"
  | "credit_unreadable" | "settings_unreadable" | "sizes_unreadable" | "price_unknown"
  | "gateway_refused" | "gateway_unanswered" | "send_error" | "template_invalid" | "held_rows"
  | "list_over_confirmed_sending" | "confirmation_unreadable" | "before_send_unanswered" | "slice_too_slow";

/** Why a step WAITS (claims nobody, pauses nothing) — the page says when it tries again. ⭐ `slice_too_slow` (the U43b-2
 *  review): the slice took so long between its claim and the wire that its claim was too old to send (the engine's
 *  send-age bound) — its people went back as they were, and the next slice is smaller when it can be. */
export type SliceWait =
  | "busy" | "quiet_hours" | "window_unreadable" | "money_busy" | "otp_failing" | "before_send_unanswered" | "slice_too_slow";

/** The shop-wide holds that are a wait, never a pause: the rows go back as they were and the step tries again. */
export type ShopWideWait = "quiet_hours" | "window_unreadable" | "not_running" | "before_send_unanswered" | "slice_too_slow";

/** A row the slice no longer holds — `dispatchSlice`'s word for a row `beforeSend` did not keep. */
export const CLAIM_LOST = "claim_lost";
/** ⭐ The engine's veto when its claim is too old to reach the wire safely (`beforeSend`, the send-age bound — engine.ts). */
export const SLICE_TOO_SLOW = "slice_too_slow";

/** ⭐ The holds that PAUSE the campaign, each with its stop reason — `sendBatch`'s whole-batch refusals and the engine's own
 *  vetoes before the wire (the list longer than confirmed, a confirmed count that is not one, the owner's switch closed
 *  while the slice gated). */
const HOLD_PAUSES: Readonly<Record<string, EngineStopReason>> = Object.freeze({
  BALANCE_FLOOR: "BALANCE_FLOOR",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  PROVIDER_UNRECOGNISED: "PROVIDER_UNRECOGNISED",
  MARKETING_FLOOR: "MARKETING_FLOOR",
  list_over_confirmed_sending: "list_over_confirmed_sending",
  confirmation_unreadable: "confirmation_unreadable",
  live_switch_closed: "live_switch_closed",
});
/** The holds that are a WAIT. */
const HOLD_WAITS: readonly ShopWideWait[] = Object.freeze(
  ["quiet_hours", "window_unreadable", "not_running", "before_send_unanswered", "slice_too_slow"] as ShopWideWait[],
);
/** ⭐ The U43b-2 re-review · `sendBatch`'s own word for the send-age bound: a batch whose deadline (`notAfter` — the oldest
 *  claim plus `CLAIM_SEND_MAX_AGE_MS`) passed before its request. Refused whole (a hold) or its rows FAILED with no request
 *  (a failure that never reached the wire), it is the engine's `slice_too_slow` WAIT either way: its people go back as
 *  they were (+0), and nobody was messaged. */
export const DEADLINE_PASSED = "DEADLINE_PASSED";
/** A hold reason that is a WAIT under another name. */
const HOLD_WAIT_ALIASES: Readonly<Record<string, ShopWideWait>> = Object.freeze({ [DEADLINE_PASSED]: "slice_too_slow" });

/** ⭐ A failure code `sendBatch` writes for a failure BEFORE its request (its chunk catch: the transport's own `SmsError`
 *  code, or UNKNOWN for any other throw), each paused with its own true words; any other code the whole batch shares
 *  (REJECTED — the gateway's own "no") is the gateway refusing it: `gateway_refused`. */
const FAILED_PAUSES: Readonly<Record<string, EngineStopReason>> = Object.freeze({
  NOT_CONFIGURED: "NOT_CONFIGURED",
  PROVIDER_UNRECOGNISED: "PROVIDER_UNRECOGNISED",
  BALANCE_FLOOR: "BALANCE_FLOOR",
  MARKETING_FLOOR: "MARKETING_FLOOR",
  UNKNOWN: "send_error",
});

const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

/** Is this hold reason a pause, a wait, or about one person? ⭐ Anything this table does not know is about one person:
 *  bounded (three tries, then HELD — and a campaign of HELD rows pauses `held_rows`), never a silent loop. */
export function holdKind(reason: string): "pause" | "wait" | "person" | "lost" {
  if (reason === CLAIM_LOST) return "lost";
  if (own(HOLD_PAUSES, reason)) return "pause";
  if ((HOLD_WAITS as readonly string[]).includes(reason) || own(HOLD_WAIT_ALIASES, reason)) return "wait";
  return "person";
}

/** ⭐ A dead rail as the campaign's stop reason: an unrecognised provider is its own; every other dead rail (no keys, a
 *  sender ID the gateway refuses, the console stub in production) is "not configured". */
export function railStopReason(rail: SmsRailProblem): EngineStopReason {
  return rail === "provider-unrecognised" ? "PROVIDER_UNRECOGNISED" : "NOT_CONFIGURED";
}

/* ══ DC-5 · THE TEXT EVERY PATCH CARRIES ═════════════════════════════════════════════════════════════════════════════ */

/** ⛔ DC-5 · free text made LAWFUL for a column: every phone run masked (`scrubPhoneRuns`), trimmed, cut to `max` — and the
 *  final, cut text read by the scrubber AGAIN, as `cleanSource`'s is (the U43b-2 review): the guarantee is then about the
 *  words as they are handed in, not about the words before the cut. Masking never lengthens, so it stays within `max`. */
export function cleanText(raw: unknown, max: number): string {
  const once = scrubPhoneRuns(typeof raw === "string" ? raw : raw === null || raw === undefined ? "" : String(raw)).trim().slice(0, max);
  return scrubPhoneRuns(once).trim().slice(0, max).trim();
}
/** A word of a trail's `source` that holds a letter or a low line — an id, a reference, an instant's `T…Z` — taken out WHOLE,
 *  exactly as the rule set reads a source (`isTrailSource`, campaign-model.ts). */
const SOURCE_WORD = /[A-Za-z0-9_]*[A-Za-z_][A-Za-z0-9_]*/g;
/** Every piece BETWEEN the words of a source scrubbed, the words kept as they are. */
function scrubBetweenWords(s: string): string {
  let out = "";
  let at = 0;
  for (const m of s.matchAll(SOURCE_WORD)) {
    const from = m.index ?? at;
    out += scrubPhoneRuns(s.slice(at, from)) + m[0];
    at = from + m[0].length;
  }
  return out + scrubPhoneRuns(s.slice(at));
}
/**
 * ⛔ DC-5 · a trail's `source` made lawful THE WAY THE RULE SET READS ONE: piece by piece. An SMS reference is 24 hex
 * characters, which hold a phone-shaped digit run by chance often enough — so the words that hold a letter are kept whole
 * (scrubbing them would corrupt the very reference a receipt is matched on), and only what stands between them is
 * scrubbed; then cut, and the cut's own edge read again (a cut can strip a word's letter and leave its digits bare).
 */
export function cleanSource(raw: unknown, max: number): string {
  const s = typeof raw === "string" ? raw : raw === null || raw === undefined ? "" : String(raw);
  return scrubBetweenWords(scrubBetweenWords(s).trim().slice(0, max)).trim();
}
/** A code (a gate reason, a failure class): printable ASCII, trimmed, at most `CODE_MAX`, never a phone run — else
 *  `fallback`. */
export function codeOf(raw: unknown, fallback: string): string {
  const c = cleanText(raw, CODE_MAX);
  return /^[!-~]([ -~]*[!-~])?$/.test(c) && c === scrubPhoneRuns(c) ? c : fallback;
}
/** A key the system minted (an SMS reference, an opt-out token): printable, no space, 1–100 — else null. */
export function keyOf(raw: unknown): string | null {
  return typeof raw === "string" && /^[!-~]{1,100}$/.test(raw) ? raw : null;
}
/** An instant in `toISOString()`'s spelling — else null. */
export function instantOf(raw: unknown): string | null {
  if (typeof raw !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$/.test(raw)) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) && new Date(ms).toISOString() === raw ? raw : null;
}
const INT4_MAX = 2147483647;
const positiveOf = (n: unknown): number | null => (typeof n === "number" && Number.isSafeInteger(n) && n >= 1 && n <= INT4_MAX ? n : null);
const localeOf = (v: unknown): MessagingLocale | null => (v === "SW" || v === "EN" || v === "ZH" ? v : null);

/** One trail entry, every string of it lawful — `check` and `verdict` never empty. */
function entry(check: string, verdict: string, wording: string | null, source: string | null): SmsCampaignGateTrail[number] {
  const w = wording === null ? "" : cleanText(wording, TRAIL_TEXT_MAX);
  const s = source === null ? "" : cleanSource(source, TRAIL_TEXT_MAX);
  return {
    check: cleanText(check, TRAIL_TEXT_MAX) || "check",
    verdict: cleanText(verdict, TRAIL_TEXT_MAX) || "unknown",
    wording: w === "" ? null : w,
    source: s === "" ? null : s,
  };
}

/* ══ E20 · THE TRAIL ════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ A slice-wide check as a trail entry — the engine builds the slice's part of every trail through this. */
export function sliceCheck(check: string, verdict: string, source: string | null): SmsCampaignGateTrail[number] {
  return entry(check, verdict, null, source);
}

/**
 * ⭐ E20 · ONE ROW'S TRAIL: the slice's own checks, then the gate (its refusal and detail, or `ok` with the basis it gave),
 * the render (only for a row that was prepared: its variant, its origin, whose name printed), and the dispatch (the
 * outcome and the reference). ⛔ Never a phone number, never a copy of evidence: every string scrubbed and cut (DC-5),
 * and at most `TRAIL_MAX` entries.
 */
export function gateTrailFor(a: { slice: SmsCampaignGateTrail; outcome: SliceOutcome }): SmsCampaignGateTrail {
  const o = a.outcome;
  const out: SmsCampaignGateTrail = a.slice.map((g) => entry(g.check, g.verdict, g.wording, g.source));
  if (o.outcome === "skipped") out.push(entry("gate", o.skipReason, o.detail, null));
  else if (o.basis !== undefined) out.push(entry("gate", "ok", null, `${o.basis}:${o.basisRef ?? ""}`));
  const meta: SliceMeta | undefined = o.outcome === "skipped" ? undefined : o.meta;
  if (meta !== undefined) out.push(entry("render", "ok", String(meta.locale), `origin:${meta.origin};name:${meta.name}`));
  const reference = o.outcome === "handed_over" || o.outcome === "unconfirmed" ? keyOf(o.reference) : null;
  out.push(entry("dispatch", o.outcome, null, reference));
  return out.slice(0, TRAIL_MAX);
}

/* ══ E7 · THE SHOP-WIDE VERDICT ═════════════════════════════════════════════════════════════════════════════════════ */

/** Which outcomes a shop-wide verdict TOUCHES: rows held for its reason, rows that failed with its code, or (an
 *  unanswered batch) the rows the wire left unconfirmed. */
export type ShopWideMatch =
  | { outcome: "held"; reason: string }
  | { outcome: "failed"; code: string }
  | { outcome: "unconfirmed" };

/**
 * The slice's one shop-wide fact, or none. `reason` is the stop reason a pause is written with (an `EngineStopReason`)
 * or the wait the step answers (`ShopWideWait`); `detail` is scrubbed and cut, for the pause's audit row; `release` says
 * whether the touched rows go back to PENDING (by `attemptsDelta`) — or, false, are settled by their own outcome (an
 * unanswered batch: UNCONFIRMED). ⭐ The spec's `{ shopWide, reason, detail }`, widened (U43b-2 as built).
 */
export type ShopWide =
  | { shopWide: false }
  | {
      shopWide: true;
      reason: EngineStopReason | ShopWideWait;
      detail: string;
      pause: boolean;
      release: boolean;
      attemptsDelta: 0 | 1;
      match: ShopWideMatch;
    };

/** Did the row reach the wire? A hand-over, an unanswered one, or a failure the wire gave back — never `BAD_MSISDN`,
 *  which `sendBatch` refuses per message BEFORE the wire. */
const reachedWire = (o: SliceOutcome): boolean =>
  o.outcome === "handed_over" || o.outcome === "unconfirmed" || (o.outcome === "failed" && o.code !== "BAD_MSISDN" && o.code !== DEADLINE_PASSED);

/**
 * ⭐ E7 · IS THIS SLICE'S ENDING ONE FACT ABOUT THE SHOP, NOT ABOUT ITS PEOPLE? In this order:
 *   ① a hold that PAUSES (a whole-batch refusal; the engine's own vetoes before the wire: a list longer than confirmed, a
 *      confirmed count that is not one, the owner's switch closed while the slice gated);
 *   ② a hold that is a WAIT (the window, the campaign no longer running, `beforeSend` unanswered, a claim too old to send);
 *   ③ EVERY row that reached the wire failed with ONE code (not `BAD_MSISDN`) — the gateway's `status:false`, or a failure
 *      before the request: the rows back to PENDING (+1), and the pause named by the code (`FAILED_PAUSES`, else
 *      `gateway_refused`);
 *   ④ EVERY row that reached the wire came back `unconfirmed` — pause `gateway_unanswered`, the rows settled UNCONFIRMED.
 * Otherwise none: every row is settled by its own outcome. (A send that THREW is the engine's to read: `thrownSend`.)
 */
export function isShopWide(outcomes: readonly SliceOutcome[]): ShopWide {
  for (const o of outcomes) {
    if (o.outcome === "held" && holdKind(o.reason) === "pause") {
      return { shopWide: true, reason: HOLD_PAUSES[o.reason], detail: cleanText(o.reason, AUDIT_DETAIL_MAX), pause: true, release: true, attemptsDelta: 0, match: { outcome: "held", reason: o.reason } };
    }
  }
  for (const o of outcomes) {
    if (o.outcome === "held" && holdKind(o.reason) === "wait") {
      const reason: ShopWideWait = own(HOLD_WAIT_ALIASES, o.reason) ? HOLD_WAIT_ALIASES[o.reason] : (o.reason as ShopWideWait);
      return { shopWide: true, reason, detail: cleanText(o.reason, AUDIT_DETAIL_MAX), pause: false, release: true, attemptsDelta: 0, match: { outcome: "held", reason: o.reason } };
    }
  }
  // ⭐ The U43b-2 re-review · the deadline passed WHILE the rows were written: no request was made, so the rows (written FAILED
  // by sendBatch, no receipt token) go back as they were — the same `slice_too_slow` wait, never a failure of the wire.
  if (outcomes.some((o) => o.outcome === "failed" && o.code === DEADLINE_PASSED)) {
    return { shopWide: true, reason: "slice_too_slow", detail: DEADLINE_PASSED, pause: false, release: true, attemptsDelta: 0, match: { outcome: "failed", code: DEADLINE_PASSED } };
  }
  const wired = outcomes.filter(reachedWire);
  if (wired.length === 0) return { shopWide: false };
  const failed = wired.filter((o): o is Extract<SliceOutcome, { outcome: "failed" }> => o.outcome === "failed");
  if (failed.length === wired.length && new Set(failed.map((o) => o.code)).size === 1) {
    const code = failed[0].code;
    const words = failed.find((o) => typeof o.error === "string" && o.error.trim() !== "")?.error ?? code;
    return {
      shopWide: true,
      reason: own(FAILED_PAUSES, code) ? FAILED_PAUSES[code] : "gateway_refused",
      detail: cleanText(`${code}: ${words}`, AUDIT_DETAIL_MAX),
      pause: true,
      release: true,
      attemptsDelta: 1,
      match: { outcome: "failed", code },
    };
  }
  if (wired.every((o) => o.outcome === "unconfirmed")) {
    const codes = [...new Set(wired.map((o) => (o.outcome === "unconfirmed" && typeof o.code === "string" ? o.code : "no_answer")))].sort();
    return {
      shopWide: true,
      reason: "gateway_unanswered",
      detail: cleanText(`${wired.length} handed to the wire with no answer back (${codes.join(", ")})`, AUDIT_DETAIL_MAX),
      pause: true,
      release: false,
      attemptsDelta: 0,
      match: { outcome: "unconfirmed" },
    };
  }
  return { shopWide: false };
}

/**
 * ⭐ THE U43b-2 REVIEW · A SEND THAT THREW — one fact about the shop, and only the engine knows it (`dispatchSlice` answers
 * every row of a thrown send `unconfirmed`, as it must: it cannot tell either). Its rows are settled by their own outcome
 * (UNCONFIRMED) — except those the engine found no message for (`SettleContext.unsent`: certainly never on the wire) — and
 * the campaign pauses `send_error`. `detail` is the error's CODE or NAME (the engine hands no words — they can quote the
 * call: the U43b-2 re-review), made lawful and cut for the pause's audit row.
 */
export function thrownSend(detail: string): ShopWide {
  return {
    shopWide: true, reason: "send_error", detail: cleanText(detail, AUDIT_DETAIL_MAX), pause: true, release: false, attemptsDelta: 0,
    match: { outcome: "unconfirmed" },
  };
}

/** Does the shop-wide verdict touch this outcome? */
export function touchedBy(o: SliceOutcome, shop: ShopWide): boolean {
  if (!shop.shopWide) return false;
  const m = shop.match;
  if (m.outcome === "held") return o.outcome === "held" && o.reason === m.reason;
  if (m.outcome === "failed") return o.outcome === "failed" && o.code === m.code;
  return o.outcome === "unconfirmed";
}

/* ══ THE SETTLEMENT ═════════════════════════════════════════════════════════════════════════════════════════════════ */

/** What one slice's settle knows beside the outcome: the claim, the slice's own checks (every trail's first entries), the
 *  instant its one send came back (null when nothing was sent), and the slice's shop-wide verdict. */
export type SettleContext = {
  claimToken: string;
  slice: SmsCampaignGateTrail;
  /** ⛔ PE-08 · the instant the slice's own send came back — a hand-over and a wire refusal are dated by IT, never by the
   *  settle's clock. */
  wireAt: string | null;
  shop: ShopWide;
  /** ⭐ The U43b-2 review · after a send that THREW: the rows no message of this claim names — certainly never handed to
   *  the wire (P2), so released (+1) rather than settled UNCONFIRMED. Absent: nothing is known to be unsent. */
  unsent?: ReadonlySet<string>;
};

/**
 * ⭐ THE SETTLEMENT TABLE (the header) — one outcome, one patch, or null (`claim_lost`: the row is someone else's now).
 * `row` is the row as the slice CLAIMED it: its attempts (E8) and its own token (a nullable column the patch must name).
 * ⛔ Every patch is lawful as built: its strings scrubbed and cut (DC-5), its keys exactly its row of the settle table.
 */
export function settlementFor(
  o: SliceOutcome,
  row: Pick<StoredSmsCampaignRecipient, "id" | "attempts" | "optOutToken">,
  ctx: SettleContext,
): SmsCampaignRecipientSettle | null {
  const id = row.id;
  const claimToken = ctx.claimToken;
  const release = (attemptsDelta: 0 | 1): SmsCampaignRecipientSettle => ({ id, claimToken, to: "PENDING", attemptsDelta });
  const personHold = (reason: string): SmsCampaignRecipientSettle => {
    const tries = (Number.isSafeInteger(row.attempts) && row.attempts >= 0 ? row.attempts : 0) + 1;
    return tries < MAX_ROW_ATTEMPTS ? release(1) : { id, claimToken, to: "HELD", failureClass: codeOf(reason, "held"), attempts: tries };
  };
  if (touchedBy(o, ctx.shop) && ctx.shop.shopWide && ctx.shop.release) return release(ctx.shop.attemptsDelta);
  const trail = (): SmsCampaignGateTrail => gateTrailFor({ slice: ctx.slice, outcome: o });
  switch (o.outcome) {
    case "skipped":
      return { id, claimToken, to: "SKIPPED", skipReason: codeOf(o.skipReason, "refused"), skipDetail: cleanText(o.detail, WORDS_MAX), gateTrail: trail() };
    case "held": {
      const kind = holdKind(o.reason);
      if (kind === "lost") return null;
      // A shop-wide hold this slice's verdict did not name (two at once cannot happen with one send) goes back as it was.
      if (kind === "pause" || kind === "wait") return release(0);
      return personHold(o.reason);
    }
    case "handed_over": {
      const reference = keyOf(o.reference);
      const sentAt = instantOf(ctx.wireAt);
      const m = o.meta;
      const sent = {
        optOutToken: keyOf(m?.token) ?? keyOf(row.optOutToken), locale: localeOf(m?.locale), segments: positiveOf(m?.segments), bodyLen: positiveOf(m?.bodyLen),
      };
      // ⛔ No reference, or no instant to date it: the wire took it and nothing can tie a receipt to it — never SENT on a
      // record that cannot be read whole, never released (it may be on a handset): no answer.
      if (reference === null || sentAt === null) return { id, claimToken, to: "UNCONFIRMED", smsReference: reference, ...sent, gateTrail: trail() };
      return { id, claimToken, to: "SENT", smsReference: reference, sentAt, ...sent, gateTrail: trail() };
    }
    case "unconfirmed": {
      // ⭐ The U43b-2 review · a send that threw and no message of this claim names the row: certainly never on the wire.
      if (ctx.unsent !== undefined && ctx.unsent.has(o.ref)) return release(1);
      const m = o.meta;
      return {
        id, claimToken, to: "UNCONFIRMED", smsReference: keyOf(o.reference), optOutToken: keyOf(m?.token) ?? keyOf(row.optOutToken),
        locale: localeOf(m?.locale), segments: positiveOf(m?.segments), bodyLen: positiveOf(m?.bodyLen), gateTrail: trail(),
      };
    }
    case "failed": {
      // ⛔ The U43b-2 re-review · no request was made for it (its deadline passed first): back as it was, never FAILED.
      if (o.code === DEADLINE_PASSED) return release(0);
      const failedAt = instantOf(ctx.wireAt);
      // ⛔ A failure with no instant from the send is not a failure this slice can date: it goes back as it was.
      if (failedAt === null) return release(0);
      const words = cleanText(o.error, WORDS_MAX);
      return {
        id, claimToken, to: "FAILED", failureClass: codeOf(o.code, "UNKNOWN"), error: words === "" ? null : words, failedAt,
        smsReference: null, gateTrail: trail(),
      };
    }
  }
  return release(0);
}

/**
 * ⭐ DC-4 · THE SEND RECORD a lost patch still owes its row: when a receipt beat the slice's settle (U46a's door moved the
 * claimed row to DELIVERED or FAILED, keeping the claim), the SENT patch — or an UNCONFIRMED one, whose receipt is its
 * answer — comes back `lost`, and its trail, token, variant, size and hand-over instant are written by the narrow door
 * (`recordSend`) instead. null for any other patch: nothing else was handed to a receipt.
 */
export function sendRecordOf(p: SmsCampaignRecipientSettle): SmsRecipientSendRecord | null {
  if (p.to === "SENT") {
    return { claimToken: p.claimToken, gateTrail: p.gateTrail, optOutToken: p.optOutToken, locale: p.locale, segments: p.segments, bodyLen: p.bodyLen, sentAt: p.sentAt };
  }
  if (p.to === "UNCONFIRMED") {
    return { claimToken: p.claimToken, gateTrail: p.gateTrail, optOutToken: p.optOutToken, locale: p.locale, segments: p.segments, bodyLen: p.bodyLen, sentAt: null };
  }
  return null;
}

/* ══ E6 · THE REAPER ════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * The evidence a stranded claim is judged on: the newest message that names the row. ⭐ DC-1 · it keeps `createdAt` (a
 * message made before the claim is an earlier attempt's), and a receipt's own token and words (a FAILED a receipt wrote
 * reached the network and was not delivered; one `sms.ts` wrote itself never left — the U43b-2 review) — beyond the spec's
 * list (U43b-2 as built). `providerMsg` is kept for the record; no verdict reads it now.
 */
export type ReapEvidence = Pick<
  StoredSmsMessage,
  "reference" | "status" | "createdAt" | "sentAt" | "deliveredAt" | "failedAt" | "providerMsg" | "dlrStatus" | "dlrDesc"
> | null;

/** The receipt's class prefix (`SMS_RECEIPT_CLASS_PREFIX`, campaign-model.ts — held equal by `test:marketing-engine`). */
export const RECEIPT_CLASS_PREFIX = "receipt:";

/** A reaped row's trail: what the reaper read, and what it decided — references only. */
function reapTrail(row: Pick<StoredSmsCampaignRecipient, "claimedAt">, evidence: ReapEvidence, verdict: string): SmsCampaignGateTrail {
  return [
    entry("reaper", evidence === null ? "no_message" : String(evidence.status), null, `stranded-since:${row.claimedAt ?? "unknown"}`),
    entry("dispatch", verdict, null, evidence === null ? null : keyOf(evidence.reference)),
  ];
}

/**
 * ⭐ E6 · ONE STRANDED CLAIM, SETTLED FROM THE EVIDENCE (the header's table). The patch names the row's OWN claim, so it
 * lands only while that claim is still on the row. `at` is the reaper's instant — it dates nothing a message did (PE-08).
 */
export function reapVerdict(row: StoredSmsCampaignRecipient, evidence: ReapEvidence, at: string): SmsCampaignRecipientSettle {
  void at;
  const id = row.id;
  const claimToken = row.claimToken ?? "";
  const release: SmsCampaignRecipientSettle = { id, claimToken, to: "PENDING", attemptsDelta: 1 };
  if (evidence === null) return release;
  // ⛔ DC-1 · a message made BEFORE this claim belongs to an earlier attempt (a refused chunk E7 released): no evidence for
  // this claim. Only a PROVABLY earlier one is discounted — instants that cannot be read are read as this claim's own.
  const claimed = Date.parse(row.claimedAt ?? "");
  const made = Date.parse(evidence.createdAt);
  if (Number.isFinite(claimed) && Number.isFinite(made) && made < claimed) return release;
  const reference = keyOf(evidence.reference);
  const own_ = { optOutToken: keyOf(row.optOutToken), locale: localeOf(row.locale), segments: positiveOf(row.segments), bodyLen: positiveOf(row.bodyLen) };
  const unconfirmed = (): SmsCampaignRecipientSettle =>
    ({ id, claimToken, to: "UNCONFIRMED", smsReference: reference, ...own_, gateTrail: reapTrail(row, evidence, "unconfirmed") });
  switch (evidence.status) {
    case "QUEUED":
    case "UNKNOWN":
      return unconfirmed();
    case "ACCEPTED": {
      const sentAt = instantOf(evidence.sentAt);
      if (reference === null || sentAt === null) return unconfirmed();
      return { id, claimToken, to: "SENT", smsReference: reference, sentAt, ...own_, gateTrail: reapTrail(row, evidence, "handed_over") };
    }
    case "DELIVERED": {
      const deliveredAt = instantOf(evidence.deliveredAt);
      if (reference === null || deliveredAt === null) return unconfirmed();
      return {
        id, claimToken, to: "DELIVERED", smsReference: reference, sentAt: instantOf(evidence.sentAt), deliveredAt, ...own_,
        gateTrail: reapTrail(row, evidence, "delivered"),
      };
    }
    case "FAILED": {
      // ⭐ THE U43b-2 REVIEW · a FAILED row no receipt wrote is `sms.ts`'s own — the gateway's `status:false`, or a throw
      // before the request: it never reached a handset and nothing was charged. Settling it FAILED would turn ONE shop-wide
      // fact into N terminal rows (E7); released, the next slice meets the refusal again and the campaign pauses ONCE.
      const byReceipt = typeof evidence.dlrStatus === "string" && evidence.dlrStatus.trim() !== "";
      if (!byReceipt) return release;
      const failedAt = instantOf(evidence.failedAt) ?? instantOf(evidence.createdAt);
      if (failedAt === null) return unconfirmed();
      const failureClass = codeOf(`${RECEIPT_CLASS_PREFIX}${String(evidence.dlrStatus).trim().toUpperCase()}`, `${RECEIPT_CLASS_PREFIX}UNKNOWN`);
      const words = cleanText(evidence.dlrDesc ?? "", WORDS_MAX);
      return {
        id, claimToken, to: "FAILED", failureClass, error: words === "" ? null : words, failedAt, smsReference: reference,
        gateTrail: reapTrail(row, evidence, "failed"),
      };
    }
  }
  // ⛔ A status this table does not know: the wire may have been reached — never a re-send.
  return unconfirmed();
}

/* ══ E11 · THE SLICE SIZE ═══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ E11 · the next slice's size from the last one's and the measured per-recipient gate time (null = not measured yet):
 * aimed at `SLICE_GATE_BUDGET_MS`, moved at most by half or by double, never below `SLICE_MIN` nor above `SLICE_MAX`.
 */
export function adaptSliceSize(prev: number, perRecipientMs: number | null): number {
  const base = Number.isSafeInteger(prev) && prev >= SLICE_MIN && prev <= SLICE_MAX ? prev : SLICE_START;
  if (perRecipientMs === null || !Number.isFinite(perRecipientMs) || perRecipientMs < 0) return base;
  const target = perRecipientMs === 0 ? SLICE_MAX : Math.floor(SLICE_GATE_BUDGET_MS / perRecipientMs);
  const damped = Math.min(Math.max(target, Math.ceil(base / 2)), base * 2);
  return Math.min(SLICE_MAX, Math.max(SLICE_MIN, damped));
}

/** E11 · the in-process moving average of the per-recipient gate time, with one more measurement folded in. */
export function foldGateTime(avg: number | null, sampleMs: number): number | null {
  if (!Number.isFinite(sampleMs) || sampleMs < 0) return avg;
  if (avg === null || !Number.isFinite(avg)) return sampleMs;
  return avg + GATE_TIME_WEIGHT * (sampleMs - avg);
}
