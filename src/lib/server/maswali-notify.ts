/**
 * MASWALI MILLIONEA — WHO IS TOLD WHAT, ONCE (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 2, MB-68, OD-25, MB-11, MB-24,
 * MB-28, MB-44, MB-93).
 *
 * The registered set (`MILLIONEA_NOTICES`, comms-registry.ts) is sent from here and from nowhere else: a purchase's
 * receipt and a free cancel to the buyer; the close, a moved close, a question voided, a correction and the week void's
 * refund to every holder of the week; and the week's result to every holder — the win to its winners (the bell, the letter,
 * the one service SMS), the loss or the rollover to the rest.
 *
 * ⭐ AFTER THE MONEY COMMITS, NEVER INSIDE IT. Every caller is a money file's `afterCommit(tx, …)` or a call after its outer
 *    lock has returned, and it loads this module only when it fires — so no notice rides, slows or can roll back a money
 *    transaction. Nothing here takes a lock: each run starts outside every lock (`runOutsideLock`) and reads committed rows.
 *    The run records whether its caller held a lock or a transaction (`calledInLock`, `calledInTx`) — the witness
 *    `test:maswali-notify` §11 reads, so a trigger moved inside a transaction is seen. A trigger that is an `afterCommit`
 *    hook reads it in the hook itself, before the hook escapes every lock (`hookContext`; read only at launch, after the
 *    escape, it saw no lock at those three call sites whatever they did — round 3); every other trigger is read at launch.
 * ⭐ EXACTLY ONCE, EACH PART ON ITS OWN KEY. A notice is triggered only by the call that WON its transition (the close's
 *    stamp, a seal, a correction, the settlement's stamp, the refund's settled market, a purchase, a cancel). Then:
 *    · the bell row's link is its key (`millioneaNoticeHref`), asked of `existsWithHref` before it is written — the Up & Down
 *      digest's mechanism, unbounded in time;
 *    · the letter goes with the bell (a letter is not proof, MB-93: the bell is the record) — and for the two money notices
 *      it rides its own record too (`maswali.notice.letter`, on the week and the account, the same for the letter's whole
 *      life — round 13): a run that
 *      stopped between a bell and its letter, or a letter the provider definitely refused, is sent by the reconcile, once
 *      (round 3, A8). ⛔ A letter the provider MAY have delivered is searched for before it is called gone — found, it is
 *      done; absent, it is sent once more and never again; unread, it is listed for an officer and searched again by a later
 *      run (rounds 7 and 8) — until an officer records the check, which closes it for good: never searched for, never sent
 *      again (`closeUnresolvedLetters`, round 17, M5). The integrity card says why each listed letter is open, one sentence
 *      a cause, and lists the holders whose records could not be read (S6-NOTICES L-2, L-3; `millioneaOpenLetters` hands
 *      it each open letter with its holder, provider tag and attempts). One that can never go (no address, a hard bounce)
 *      completes with its reason (round 4, M6); its attempt is recorded BEFORE it is sent, so a run that dies mid-send never
 *      sends it twice (round 5, LOW 12). ⭐ M-2 (the lead's ruling 2): a letter the provider definitely refused
 *      `LETTER_REFUSALS_CAP` times is sent by no run again — the run counts it `capped` and is complete, the integrity card
 *      lists it, and the officer's check closes it; and while the email provider is DOWN (`emailHealth()`) a run sends one
 *      letter that would reach it (its probe) and holds every other back — no attempt written, none of its refusals used,
 *      the run owed — so the reconcile sends each once the provider answers;
 *    · ⛔ RUNBOOK · ROTATING `OTP_PEPPER` NEVER RESENDS A MONEY LETTER (round 13, the lead's ruling): the letters' records
 *      stay readable, a confirmed letter and a completed run stay done, and a letter the provider may have taken whose
 *      attempt was made under the old pepper is listed on the integrity card ("Letters not known to have gone") for an
 *      officer — never searched for, never resent (one the provider definitely refused is sent as before). After a
 *      rotation, an officer checks that card and records each check, which closes those letters (round 17, M5);
 *    · the winner's SMS rides its own target (`MaswaliWinner`, `maswali-winner-sms.ts`) — never the bell's: a bell already
 *      written, or one whose write failed, never stops it, and a target that has a message is never sent again — one that
 *      did not go included (M-1, the lead's ruling 1: counted `notResent`, the run complete, the desk list calls them).
 *    Winners go first, each SMS right after its winner, and a result or refund run that stopped part-way (a deploy, a
 *    failed write, a held batch) is finished by the reconcile (`reconcileMillioneaNotices`, the tick and the heal): it
 *    re-runs a recently terminal week whose last record is not complete, and only what is missing goes. A refusal that can
 *    never clear (a number the gateway cannot dial, no SMS rail, the channel closed, an account that does not exist) is
 *    counted with its reason and leaves the run complete; and a re-run that changed nothing writes no record (round 3, A12).
 *    ⛔ The other notices — the receipt, the cancel, the close, a moved close, a void, a correction — are AT MOST ONCE: the
 *    ticket page always shows the truth; a write that fails raises an ALARM log line and is not retried.
 * ⭐ ONE PROCESS TELLS A WEEK (round 3, A5). The timer runs on every instance and the heal forces a pass, so a result or
 *    refund run first takes its week's LEASE (the house's own, `acquireLeadership`: a claim with an expiry, written
 *    strictly), renews it as it goes and gives it up at its end; a run that cannot take it skips. And the winner's SMS is
 *    RESERVED by its own row: the batch writes it before its request, under a unique index on its target, so a second
 *    process's batch for the same winner fails its write and sends nothing (`@/lib/sms-targets`). A run that found the
 *    week's lease held is not counted as reconciled: the next tick tries it again (round 4, M5); and a lease that cannot
 *    be READ is not taken (round 4, L3).
 * ⛔ HOLDERS ONLY (OD-25): every recipient is read from the week's own tickets; nobody else is told anything here.
 * ⛔ NO MONEY MOVES HERE, and no figure is computed afresh: each comes from a row the money already wrote — the week's
 *    settlement mirror, the tickets' shares, the frozen price.
 */
import { createHash } from "node:crypto";
import { audit, auditFlush, getAuditForTargetsDurable } from "./audit";
import { pepperedLetters } from "./crypto";
import { acquireLeadership, releaseLeadership } from "./leader";
import { currentLockTx, inLock, runOutsideLock } from "./locks";
import { db, type StoredNotification, type StoredUser } from "./store";
import { questionStore, ticketStore, weekStore, type StoredQuestion, type StoredTicket, type StoredWeek } from "./maswali-dal";
import { readMaswaliRulesSnapshot } from "./maswali-config";
import { calendarStartMs, gradable } from "./maswali-service";
import { millioneaCancelUntil } from "./maswali-player";
import { WITHDRAW_MAX_TZS } from "./validators";
import {
  millioneaNoticeHref, notifyMillioneaCloseMoved, notifyMillioneaNotWon, notifyMillioneaQuestionCorrected, notifyMillioneaQuestionVoided,
  notifyMillioneaSalesClosed, notifyMillioneaTicketCancelled, notifyMillioneaTicketsCut, notifyMillioneaWeekRefunded, notifyMillioneaWon,
  notifyMillioneaWonHeld, type MillioneaNoticeKey, type MillioneaWinShares,
} from "./notification-service";
import {
  CANNOT_SIGN_IN, emailHealth, findOutboundLetter, letterAddressOf, millioneaNotWonHtml, millioneaWeekRefundedHtml, millioneaWinHtml,
  sendEmailToUser, type SendResult,
} from "./email";
import { isSuppressed } from "./email-suppression";
import { sendMillioneaWinnerSms, type WinnerSmsLine, type WinnerSmsOutcome } from "./maswali-winner-sms";
import { breakStateOf } from "@/lib/break-end";
import { DEFAULT_WITHDRAWAL_FEE_RATE } from "@/lib/payout";
import { millioneaTicketHref } from "@/lib/position-permalink";
import { isMaswaliVoidReason } from "@/lib/maswali-void-reason";
import { weekVoidCertain, type MaswaliOutcome } from "@/lib/maswali-score";
import { eatWeekNumberOf } from "@/lib/eat-day";
import { formatTzs } from "@/lib/utils";

const SYSTEM = "system_maswali";
const DAY_MS = 86_400_000;
const EPOCH = "1970-01-01T00:00:00.000Z";

/** The records this module reads and writes (the run's own, a letter's own, and the question's and week's own). */
const RUN_ACTION = "maswali.notices.sent";
const LETTER_ACTION = "maswali.notice.letter";
const SEALED_ACTION = "maswali.question.sealed";
const CORRECTED_ACTION = "maswali.question.corrected";
const CONFIRMED_ACTION = "maswali.question.confirmed";
const CLOSE_MOVED_ACTION = "maswali.week.close_moved";

/** The winner SMS refusals that can never clear as things stand: counted with their reason, and never retried. */
const PERMANENT_SMS: ReadonlySet<string> = new Set(["channel_closed", "BAD_MSISDN", "NOT_CONFIGURED", "PROVIDER_UNRECOGNISED"]);

/** The winners' SMS of one run, counted: each winner's own outcome (`sendMillioneaWinnerSms` on one line). */
export type WinnerSmsTally = {
  sent: number;
  /** A winner whose target already had a message: never sent again. */
  already: number;
  /** ⭐ M-1 (the lead's ruling 1, 2026-10-22) · winners whose one message did not go — refused by the gateway, or lost in
   *  transport: counted, never sent again (once per player-week). The run is complete, and the desk list names them for
   *  a call (no DELIVERED receipt). */
  notResent: number;
  /** Winners whose message was held, by why (a credit that would go below the codes' credit, an unread read, …). */
  held: Partial<Record<Extract<WinnerSmsOutcome, { kind: "held" }>["reason"], number>>;
  /** Winners whose message can never go as things stand, by why (`PERMANENT_SMS`): counted, and the run is complete. */
  permanent: Partial<Record<string, number>>;
  /** Winners with no number to send to. */
  none: number;
};

/** What one notice run did — returned to the suites, and recorded for a week's close, moved close, result and refund. */
export type NoticeRun = {
  notice: "receipt" | "cancel" | "closed" | "closeMoved" | "void" | "correction" | "result" | "refund";
  weekId: string;
  /** Recipients this run considered; bell rows it wrote; recipients it found already told; writes that failed. */
  recipients: number;
  sent: number;
  alreadySent: number;
  failed: number;
  /** Holders this run could never tell, by why (an account that does not exist): counted, never retried. */
  permanent: Partial<Record<string, number>>;
  /** Letters by outcome (`LetterOutcome`: the send's own reason, and for a failure its kind — round 4, M6) — and, for a win's
   *  or a refund's letter the provider may have taken, `confirmed` (its search found it) or `unresolved` (not yet known:
   *  the run is not complete; round 7, M2) — and `unread`: holders whose own letter records could not be read, so nothing
   *  was sent to them now and the run is not complete (round 17, B2). ⭐ S6-NOTICES (L-3) · of the `unresolved`, those whose
   *  search cannot be asked because the account's address or the pepper changed since the attempt (`unmatched`); and
   *  `resendOwed`, letters whose search found no such message and whose one resend did not go in this run — what the
   *  integrity card says, one sentence a cause (`maswali-console.ts` `unresolvedLetters`). ⭐ M-2 (the lead's ruling 2) ·
   *  `capped`, letters the provider definitely refused `LETTER_REFUSALS_CAP` times, which no run sends again (the run is
   *  complete, the card lists them); and `deferred`, letters not sent because the email rail is DOWN — no attempt written,
   *  no refusal used, and the run stays owed. */
  letters: Partial<Record<LetterOutcome | "confirmed" | "unresolved" | "unread" | "unmatched" | "resendOwed" | "capped" | "deferred", number>>;
  /** ⭐ M-2 · whether this run has sent its one letter while the email rail was DOWN (its probe). Never recorded. */
  probed: boolean;
  /** The winners' SMS, on a result run. */
  sms: WinnerSmsTally | null;
  /** ⭐ THE WITNESS, taken as the run was launched — in the caller's own context, before it escapes every lock. */
  calledInLock: boolean;
  calledInTx: boolean;
  /** A result or refund run that told nobody because another process holds its week's lease, or an officer's check of its
   *  letters holds the week in this process (`lease` — round 17, M5), or that stopped because its lease could not be renewed
   *  (`lease_lost`); null for every run that went. */
  skipped: "lease" | "lease_lost" | null;
};

/** Where an `afterCommit` trigger ran, read in the hook itself (`hookContext`, locks.ts) and handed to its run. */
export type NoticeCallSite = { inLock: boolean; inTx: boolean };

/**
 * ⭐ A LETTER'S OUTCOME, as a run counts and records it (round 4, M6): the send's own reason — and a failure by its kind:
 * `failed` only for a definite refusal (sent again by the reconcile — ⭐ M-2, the lead's ruling 2: until the provider has
 * refused it `LETTER_REFUSALS_CAP` times; then no run sends it again and the integrity card lists it), `ambiguous` for one
 * the provider may have delivered (never sent again), `bounced` for one that can never go (complete, with its reason).
 * Every outcome but `failed` is done.
 */
export type LetterOutcome = SendResult["reason"] | "ambiguous" | "bounced";

/** ⚠️ FOR THE SUITES (and the run): a send's result as a letter's outcome. ⭐ Round 15 · for a money letter, the provider's
 *  own 5xx is a letter it may have taken: searched for before any resend. */
export function letterOutcome(res: SendResult, money = false): LetterOutcome {
  if (res.reason !== "failed") return res.reason;
  if (money && res.serverError) return "ambiguous";
  return res.failure === "ambiguous" ? "ambiguous" : res.failure === "permanent" ? "bounced" : "failed";
}

/** The one letter door (`sendEmailToUser`) — a suite may stand in for it (`withMillioneaLetterSender`); production never does. */
const LETTERS: { send: typeof sendEmailToUser } = { send: sendEmailToUser };

/** ⚠️ FOR THE SUITES: send this module's letters through `send` until the returned function puts the real door back. */
export function withMillioneaLetterSender(send: typeof sendEmailToUser): () => void {
  const previous = LETTERS.send;
  LETTERS.send = send;
  return () => { LETTERS.send = previous; };
}

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MLN_NOTICE_INFLIGHT: Set<Promise<NoticeRun>> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MLN_NOTICE_LOG: NoticeRun[] | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MLN_NOTICE_RUNNING: Map<string, Promise<NoticeRun>> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MLN_RECONCILED: Map<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MLN_RECONCILING: Promise<NoticeReconcileReport> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MLN_LETTER_CHECKS: Set<string> | undefined;
}
/** On `globalThis`, as every cross-module counter here is: a route and an action are separate module instances.
 *  ⛔ Round 17 (B1) · under a name of its own: the data layer's seen-notice store already lives on globalThis (maswali-dal.ts),
 *  and a launch that finds another module's object here cannot record its run — then no week's run is shared in this
 *  process, and a second launch of a week's result or refund sends every letter again. */
const inflight = (globalThis.__50PICK_MLN_NOTICE_INFLIGHT ??= new Set<Promise<NoticeRun>>());
/** The newest runs of this process (bounded), each with its witness — what a suite reads. */
const LOG_MAX = 512;
const runLog = () => (globalThis.__50PICK_MLN_NOTICE_LOG ??= []);
/** A week's result or refund run already in flight in this process: a second launch shares it, so no SMS goes twice. */
const running = () => (globalThis.__50PICK_MLN_NOTICE_RUNNING ??= new Map<string, Promise<NoticeRun>>());
/** ⭐ Round 17 (M5) · a week's result or refund letters an officer's check is closing in this process (`closeUnresolvedLetters`):
 *  a launch meanwhile tells nobody and is tried again by the next tick, and a second check is refused. Under a name of its
 *  own, never another module's (round 17, B1). */
const checks = () => (globalThis.__50PICK_MLN_LETTER_CHECKS ??= new Set<string>());

/** ⚠️ FOR THE SUITES: the runs launched so far in this process (the newest few hundred), each with its witness. */
export function millioneaNoticeRuns(): readonly NoticeRun[] {
  return runLog();
}

/** Run a notice outside every lock, tracked so a suite can wait for it. A failure is logged — never thrown at money. */
function launch(notice: NoticeRun["notice"], weekId: string, body: (r: NoticeRun) => Promise<void>, at?: NoticeCallSite): Promise<NoticeRun> {
  // ⭐ The witness is read HERE, in the caller's context (`runOutsideLock` below hides the lock from the run itself) — and
  // an `afterCommit` trigger's own reading, taken in its hook before that hook escaped, is added to it.
  const r: NoticeRun = {
    notice, weekId, recipients: 0, sent: 0, alreadySent: 0, failed: 0, permanent: {}, letters: {}, probed: false, sms: null,
    calledInLock: (at?.inLock ?? false) || inLock(), calledInTx: (at?.inTx ?? false) || currentLockTx() !== null, skipped: null,
  };
  const log = runLog();
  log.push(r);
  if (log.length > LOG_MAX) log.splice(0, log.length - LOG_MAX);
  const p = runOutsideLock(async (): Promise<NoticeRun> => {
    try {
      await body(r);
    } catch (err) {
      console.error(`[maswali-notify] the ${notice} notice for ${weekId} stopped:`, (err as Error)?.message ?? err);
    }
    return r;
  });
  inflight.add(p);
  void p.finally(() => { inflight.delete(p); });
  return p;
}

/** How long a result or refund run's claim on its week holds; the run renews it at a third of this as it goes. */
export const NOTICE_LEASE_MS = 5 * 60_000;

/** The lease's task: one per week and money notice. */
export function noticeLeaseTask(notice: "result" | "refund", weekId: string): string {
  return `maswali-notices:${notice}:${weekId}`;
}

/**
 * ⭐ THE WEEK'S LEASE (round 3, A5) — take it, or answer null when another process holds a live one; the answer is the
 * renewer the run calls before each holder (false: the lease could not be kept, so the run stops and records nothing — the
 * process that holds it now, or the reconcile, finishes the week).
 */
async function claimWeek(r: NoticeRun, notice: "result" | "refund", weekId: string): Promise<(() => Promise<boolean>) | null> {
  const task = noticeLeaseTask(notice, weekId);
  // ⛔ Round 4, L3 · a lease whose read or write FAILS is not taken: the run skips (fail closed).
  if (!(await acquireLeadership(task, { leaseMs: NOTICE_LEASE_MS, strictWrite: true, strictRead: true }))) {
    r.skipped = "lease";
    return null;
  }
  let renewedAt = Date.now();
  return async () => {
    if (Date.now() - renewedAt < NOTICE_LEASE_MS / 3) return true;
    renewedAt = Date.now();
    if (await acquireLeadership(task, { leaseMs: NOTICE_LEASE_MS, strictWrite: true, strictRead: true })) return true;
    r.skipped = "lease_lost";
    return false;
  };
}

/**
 * A week's run that must never overlap itself (the result, the refund): in this process the second caller shares the
 * first; across processes the week's lease lets one of them run and the others skip. ⭐ Round 17 (M5) · while an officer's
 * check is closing the week's letters in this process, a launch tells nobody — skipped as a held lease is, so the next
 * tick runs it again.
 */
function launchOnce(notice: "result" | "refund", weekId: string, body: (r: NoticeRun, keep: () => Promise<boolean>) => Promise<void>): Promise<NoticeRun> {
  const key = `${notice}:${weekId}`;
  const now = running().get(key);
  if (now) return now;
  if (checks().has(key)) return launch(notice, weekId, async (r) => { r.skipped = "lease"; });
  const p = launch(notice, weekId, async (r) => {
    const keep = await claimWeek(r, notice, weekId);
    if (!keep) return;
    try {
      await body(r, keep);
    } finally {
      await releaseLeadership(noticeLeaseTask(notice, weekId));
    }
  });
  running().set(key, p);
  void p.finally(() => { if (running().get(key) === p) running().delete(key); });
  return p;
}

/**
 * ⚠️ FOR THE SUITES: wait until every notice launched so far has finished. A money call returns before its notices — the
 * trigger loads this module when it fires — so a few quiet ticks are waited for before the set counts as drained.
 */
export async function settleMillioneaNotices(): Promise<void> {
  for (let quiet = 0; quiet < 3;) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (inflight.size === 0) { quiet++; continue; }
    quiet = 0;
    await Promise.allSettled([...inflight]);
  }
}

/** A money notice — recovered by the reconcile; every other notice is at most once. */
const isMoney = (r: NoticeRun): boolean => r.notice === "result" || r.notice === "refund";

/**
 * ⭐ ONE PLAYER, ONE BELL ROW: written unless this player was ever sent this link (`existsWithHref`, unbounded in time — the
 * digest's key). `wrote` only when THIS call wrote the row; `seen` when the row was already there; `failed` when it could
 * not be written (an ALARM: a money notice's reconcile retries it, any other notice is not retried).
 * ⚠️ `notify()` answers a repeat inside its 90-second window with the EARLIER row; a row created before this call began is
 * that earlier row, so it counts as already sent, never as this run's. No second run of a week's result or refund races the
 * first: one run per process (`launchOnce`), one process per week (the lease).
 */
async function once(r: NoticeRun, userId: string, key: MillioneaNoticeKey, write: () => Promise<StoredNotification | null>): Promise<"wrote" | "seen" | "failed"> {
  r.recipients++;
  let seen = false;
  try {
    seen = await db.notification.existsWithHref(userId, millioneaNoticeHref(key));
  } catch {
    seen = false; // fail open, as `notify()` does: a missed notice is worse than a repeated one
  }
  if (seen) { r.alreadySent++; return "seen"; }
  const startedMs = Date.now();
  const row = await write().catch(() => null);
  if (!row) {
    r.failed++;
    console.error(`[maswali-notify] ALARM: the ${r.notice} notice for ${r.weekId} could not be written for a holder — ${isMoney(r)
      ? "the reconcile retries it" : "it is not retried (the ticket page shows the truth)"}.`);
    return "failed";
  }
  if (Date.parse(row.createdAt) < startedMs) { r.alreadySent++; return "seen"; }
  r.sent++;
  return "wrote";
}

/** The letters' own records' target type: each record sits on its holder's own target, so one holder's can be read alone. */
const LETTER_TARGET = "MaswaliLetter";

/** ⭐ Round 13 (the lead's ruling) · a holder's target for one week's letters: the week and the account, the same for the
 *  letter's whole life. ⛔ Never keyed with a pepper: a rotated pepper would hide every record a letter has, and its next
 *  run would send it again. The audit table is staff-only, and the target never leaves for the provider (`letterMetadata`). */
function letterTarget(weekId: string, userId: string): string {
  return `${weekId}:${userId}`;
}

/** ⭐ Round 14 (the lead's ruling) · what names a letter to the provider: a one-way digest of its target — unkeyed, so no
 *  rotation touches it, the same for the letter's whole life — so no account id and no address leaves in it. A letter is
 *  sent with it and searched for by it. */
function letterMetadata(target: string): string {
  return createHash("sha256").update(`maswali-letter-metadata:v1:${target}`, "utf8").digest("hex").slice(0, 32);
}

/** ⚠️ FOR THE SUITES: the metadata one holder's letter is sent and searched with. */
export function millioneaLetterMetadata(weekId: string, userId: string): string {
  return letterMetadata(letterTarget(weekId, userId));
}

/** How many holders' targets one read of the letters' records asks for. */
const LETTER_READ_HOLDERS = 500;
/** How many records one such read takes (a suite lowers it through `__50PICK_MLN_LETTER_READ_LIMIT` to cut a read short). */
const letterReadLimit = (): number => {
  const planted = (globalThis as { __50PICK_MLN_LETTER_READ_LIMIT?: unknown }).__50PICK_MLN_LETTER_READ_LIMIT;
  // ⛔ A suite's seam (round 5, LOW 15): production never honours it.
  if (process.env.NODE_ENV === "production") return 5_000;
  return typeof planted === "number" && Number.isSafeInteger(planted) && planted > 0 ? planted : 5_000;
};

/**
 * True when a holder's own records say the letter is done (round 5, LOW 12; round 6, L2) — decided by the records' own
 * ORDER, newest first as the read returns them, never by their instants (two records can share one): the newest record
 * for this notice decides. An attempt may have gone, so it is never sent twice; an outcome is done unless it was a
 * definite refusal — or the provider's own search found no such letter, and its one resend has not gone yet (round 7).
 * ⭐ Round 17 (M5) · an officer's recorded check ("cleared") is an outcome like any other: done, for good.
 */
function doneIn(entries: readonly { payload?: Record<string, unknown> }[], notice: "result" | "refund"): boolean {
  for (const e of entries) {
    if (e.payload?.notice !== notice) continue;
    return e.payload?.outcome !== "failed" && e.payload?.outcome !== LETTER_ABSENT;
  }
  return false;
}

/** A letter's attempt, as its record says it — written before the send. */
const LETTER_ATTEMPT = "attempt";

/**
 * ⭐ M-2 (the lead's ruling 2, 2026-10-22) · A LETTER THE PROVIDER DEFINITELY REFUSED THIS MANY TIMES IS SENT AGAIN BY NO RUN:
 * the run counts it `capped` and stays complete, the integrity card lists it for an officer, and the officer's recorded
 * check closes it (`closeUnresolvedLetters`). Until then each definite refusal is sent again by the reconcile. Counted from
 * the letter's own records, so every process and every run counts the same refusals (recorded in docs/FAILURE-INVENTORY.md
 * §9b). ⛔ Without it a refused letter (a wrong provider key, say) was sent again every hour for fourteen days, with two
 * audit rows for each holder each time.
 */
export const LETTER_REFUSALS_CAP = 3;

/** How many definite refusals ("failed") one holder's own records hold for this notice. */
function refusalsIn(entries: readonly { payload?: Record<string, unknown> }[], notice: "result" | "refund"): number {
  return entries.filter((e) => e.payload?.notice === notice && e.payload?.outcome === "failed").length;
}

/**
 * ⭐ M-2 · THE EMAIL RAIL DOWN (`emailHealth()`: this process's last sends all failed): a run sends ONE letter that would reach
 * the provider — its probe — and DEFERS every other: a deferred letter writes no attempt and uses none of its refusals, and
 * the run stays owed, so the reconcile sends it once the rail answers again. A probe that goes brings the rail back up for
 * the letters after it. A letter that would reach no provider (no address on file, a suppressed address) is never a probe.
 */
function railAllowsLetter(r: NoticeRun): boolean {
  if (emailHealth().status !== "DOWN") return true;
  if (r.probed) return false;
  r.probed = true;
  return true;
}

/** Whether a letter to this address would reach the provider at all — `sendEmail`'s own skips: no address, a stub address,
 *  a suppressed one (a hard bounce, a complaint). */
const reachesProvider = (to: string | null): to is string =>
  !!to && !to.endsWith("@stub") && !to.endsWith("@none") && !isSuppressed(to);

/** ⚠️ FOR THE SUITES: whether one holder's own letter records (newest first) say the letter is done, as a run reads them. */
export const millioneaLetterDone = doneIn;

/** A letter's resolution, as its record says it (round 7, M2): the provider's search found it, or found none — or ⭐ round
 *  17 (M5) an officer checked the provider's activity and closed it (`closeUnresolvedLetters`). */
const LETTER_CONFIRMED = "confirmed";
const LETTER_ABSENT = "absent";
const LETTER_CLEARED = "cleared";

/** One of a holder's letter records, as the reads return them (newest first). */
type LetterRecord = { createdAt: string; payload?: Record<string, unknown> };

/** The search a run asks before it calls a money letter the provider may have taken gone (`findOutboundLetter`) — a suite
 *  may stand in for it (`withMillioneaLetterSearch`); production never does. */
const SEARCH: { find: typeof findOutboundLetter } = { find: findOutboundLetter };

/** ⚠️ FOR THE SUITES: ask this module's letter searches through `find` until the returned function puts the real one back. */
export function withMillioneaLetterSearch(find: typeof findOutboundLetter): () => void {
  const previous = SEARCH.find;
  SEARCH.find = find;
  return () => { SEARCH.find = previous; };
}

/** The read of the letters' own records (`getAuditForTargetsDurable`) — a suite may stand in for it
 *  (`withMillioneaLetterRecordsRead`, to make one holder's read fail); production never does. */
const RECORDS: { read: typeof getAuditForTargetsDurable } = { read: getAuditForTargetsDurable };

/** ⚠️ FOR THE SUITES: read this module's letter records through `read` until the returned function puts the real one back. */
export function withMillioneaLetterRecordsRead(read: typeof getAuditForTargetsDurable): () => void {
  const previous = RECORDS.read;
  RECORDS.read = read;
  return () => { RECORDS.read = previous; };
}

/**
 * The holders (by target) whose letter for this week's money notice is DONE — sent, may have been delivered, or never
 * sendable — from the letters' own records, read for this run's holders. ⛔ Null when a read was CUT SHORT (round 4, L1)
 * or failed: a letter is then known done only by its holder's own read (`letterOwed`), never by a list that may lack it.
 */
async function letterRecords(weekId: string, notice: "result" | "refund", userIds: readonly string[]): Promise<Map<string, LetterRecord[]> | null> {
  try {
    await auditFlush();
    const targets = userIds.map((u) => letterTarget(weekId, u));
    const byTarget = new Map<string, LetterRecord[]>();
    for (let i = 0; i < targets.length; i += LETTER_READ_HOLDERS) {
      const rows = await RECORDS.read({
        targetType: LETTER_TARGET, targetIds: targets.slice(i, i + LETTER_READ_HOLDERS), actions: [LETTER_ACTION], sinceIso: EPOCH, limit: letterReadLimit(),
      });
      if (rows.truncated) return null;
      for (const e of rows.entries) if (typeof e.targetId === "string") byTarget.set(e.targetId, [...(byTarget.get(e.targetId) ?? []), e]);
    }
    return byTarget;
  } catch (err) {
    console.error(`[maswali-notify] ALARM: the ${notice} letters' records for ${weekId} could not be read:`, (err as Error)?.message ?? err);
    return null;
  }
}

/** ⚠️ FOR THE SUITES: the letters' records of one week's holders, as a run reads them — null when a read was cut short. */
export async function millioneaLettersDone(weekId: string, notice: "result" | "refund", userIds: readonly string[]): Promise<number | null> {
  const read = await letterRecords(weekId, notice, userIds);
  return read === null ? null : [...read.values()].filter((entries) => doneIn(entries, notice)).length;
}

/** One holder's own letter records (newest first): from the run's read, or read now when that read was cut short (round
 *  4, L1); null when they cannot be read (an ALARM: nothing is sent to that holder now, and the run stays owed — round 17). */
async function holderLetters(read: Map<string, LetterRecord[]> | null, weekId: string, userId: string, notice: "result" | "refund"): Promise<LetterRecord[] | null> {
  const target = letterTarget(weekId, userId);
  if (read !== null) return read.get(target) ?? [];
  try {
    // ⭐ Round 8 (L2) · read whole: a cut read could miss the record that decides (an "absent", an attempt).
    for (let limit = 50; ; limit *= 4) {
      const rows = await RECORDS.read({ targetType: LETTER_TARGET, targetIds: [target], actions: [LETTER_ACTION], sinceIso: EPOCH, limit });
      if (!rows.truncated) return rows.entries;
      if (limit >= 3_200) throw new Error("a holder's letter records could not be read whole");
    }
  } catch (err) {
    console.error(`[maswali-notify] ALARM: a holder's ${notice} letter record for ${weekId} could not be read; nothing is sent to them now and the run stays owed:`, (err as Error)?.message ?? err);
    return null;
  }
}

/** One holder's money-notice letter as a run sends it: its provider tag, whether it is a money letter (a win's or a
 *  refund's), and its one send — handed the provider metadata that names this letter (round 8, M1; a digest, round 14). */
type LetterJob = { tag: string; money: boolean; send: (metadata: { letter: string }) => Promise<SendResult> };

/** The peppered hash of a letter's address, as its attempt records it (round 9, L3) — never the address itself. */
function addressHash(address: string): string {
  return pepperedLetters("maswali-letter-address", address.trim().toLowerCase());
}

/** ⭐ Round 13 · which pepper made a hash: a keyed tag of a constant, the same until the pepper rotates — it tells one
 *  pepper from another and says nothing of either. */
function pepperVersion(): string {
  return pepperedLetters("maswali-letter-pepper-version", "v1", 8);
}

/** ⚠️ FOR THE SUITES: the target one holder's letter records sit on. */
export function millioneaLetterTarget(weekId: string, userId: string): string {
  return letterTarget(weekId, userId);
}

/** How old a money letter's attempt must be before the provider's search is asked about it (round 8, M2): younger, the
 *  provider's own request may still be in flight, or not yet searchable. */
export const LETTER_SEARCH_MARGIN_MS = 15 * 60_000;
/** The margin — a suite may lower it through `__50PICK_MLN_LETTER_SEARCH_MARGIN_MS`; production never honours that. */
const letterSearchMargin = (): number => {
  const planted = (globalThis as { __50PICK_MLN_LETTER_SEARCH_MARGIN_MS?: unknown }).__50PICK_MLN_LETTER_SEARCH_MARGIN_MS;
  if (process.env.NODE_ENV === "production") return LETTER_SEARCH_MARGIN_MS;
  return typeof planted === "number" && Number.isSafeInteger(planted) && planted >= 0 ? planted : LETTER_SEARCH_MARGIN_MS;
};

/**
 * ⭐ ONE HOLDER'S LETTER, AFTER ITS BELL (rounds 3 to 7) — owed with a bell there whose letter's own records are not done (a
 * run stopped between the two, or the provider definitely refused it): sent at most once (`sendLetter`). A money letter
 * already done whose newest record says the provider MAY have taken it is resolved by the provider's own search
 * (`resolveLetter`). ⛔ A bell that could not be written owes no letter (the bell is the record, MB-93; the reconcile writes
 * it, then the letter). ⛔ Round 17 (B2) · records that cannot be read send nothing now — a letter is sent only after a read
 * that says it is owed, so it can never go twice — and the holder is counted `unread`, which leaves the run not complete:
 * the reconcile reads them again, and the letter goes once they read. ⭐ M-2 · a letter the provider definitely refused
 * `LETTER_REFUSALS_CAP` times is sent by no run: counted `capped`, listed on the card, closed by the officer's check.
 */
async function letterStep(r: NoticeRun, bell: "wrote" | "seen" | "failed", read: Map<string, LetterRecord[]> | null, weekId: string, userId: string, job: LetterJob): Promise<void> {
  if (bell === "failed") return;
  const notice = r.notice as "result" | "refund";
  const records = await holderLetters(read, weekId, userId, notice);
  if (records === null) { r.letters.unread = (r.letters.unread ?? 0) + 1; return; }
  if (!doneIn(records, notice)) {
    // ⭐ M-2 · refused as often as the cap allows: no attempt, no send — listed for an officer, and the run stays complete.
    if (refusalsIn(records, notice) >= LETTER_REFUSALS_CAP) { r.letters.capped = (r.letters.capped ?? 0) + 1; return; }
    // ⭐ S6-NOTICES (L-3) · a resend still owed after an "absent" that does not go now is counted: the card says so.
    const resend = openKindOf(records, notice) === "resendOwed";
    // ⭐ M-2 · a letter held back while the email provider is down is counted `deferred` alone, never also a resend owed.
    const went = await sendLetter(r, userId, job);
    if (went === "unrecorded" && resend) r.letters.resendOwed = (r.letters.resendOwed ?? 0) + 1;
    return;
  }
  if (job.money) await resolveLetter(r, userId, records, job);
}

/**
 * ⭐ A MONEY LETTER THE PROVIDER MAY HAVE TAKEN, RESOLVED (round 7, M2 — the lead's decision): before it is called gone, the
 * provider's own outbound search is asked, by the address `sendEmailToUser` sends to (`letterAddressOf`), the letter's
 * tag and its attempt's instant. Found → recorded "confirmed" (done). Absent → recorded "absent" and sent ONCE more
 * through `sendLetter` — never again after an "absent". A search that cannot be read, or a second "absent", leaves it
 * unresolved: the run is not complete, and the console lists it for an officer; a later run asks again (a search that
 * reads "absent" then sends it once more, if no "absent" came before). ⭐ Round 17 (M5) · once an officer records the
 * check, its newest record is "cleared": it is never searched for, nor sent, again.
 */
async function resolveLetter(r: NoticeRun, userId: string, records: readonly LetterRecord[], job: LetterJob): Promise<void> {
  const mine = records.filter((e) => e.payload?.notice === r.notice);
  const newest = mine[0]?.payload?.outcome;
  // ⭐ Round 8 (M3) · an attempt with no outcome after it (the outcome's row never landed, or the run stopped mid-send)
  // may have gone: it is resolved as an ambiguous one is.
  if (newest !== "ambiguous" && newest !== LETTER_ATTEMPT) return;
  const attempt = mine.find((e) => e.payload?.outcome === LETTER_ATTEMPT);
  const attemptAt = Date.parse(attempt?.createdAt ?? mine[0]?.createdAt ?? "");
  const target = letterTarget(r.weekId, userId);
  const to = await letterAddressOf(userId, { confirmedOnly: true });
  // ⭐ Round 9 (L3) · the search asks by today's address: when that is not the address the attempt went to (its record
  // keeps a peppered hash of it, never the address), the letter stays unresolved — never searched, never resent.
  // ⭐ Round 13 (the lead's ruling) · the hash is compared only under the pepper that made it: an attempt whose pepper
  // version is not today's (a rotation since, or none recorded) cannot be compared, so it stays listed for an officer.
  // ⭐ S6-NOTICES (L-3) · counted apart as well (`unmatched`), whatever the attempt's age — the card's list reads the same
  // rule (`millioneaOpenLetters`), and says this letter's search is never asked.
  if (!attemptMatches(attempt, to)) {
    r.letters.unresolved = (r.letters.unresolved ?? 0) + 1;
    r.letters.unmatched = (r.letters.unmatched ?? 0) + 1;
    return;
  }
  // ⭐ Round 8 (M2) · never asked while the provider's own request may still be in flight or not yet searchable: younger
  // than the margin, it stays unresolved this run.
  if (!Number.isFinite(attemptAt) || Date.now() - attemptAt < letterSearchMargin()) {
    r.letters.unresolved = (r.letters.unresolved ?? 0) + 1;
    return;
  }
  const absentBefore = mine.some((e) => e.payload?.outcome === LETTER_ABSENT);
  const found = to === null ? null : await SEARCH.find({ to, tag: job.tag, sinceIso: new Date(attemptAt).toISOString(), letter: letterMetadata(target) }).catch(() => null);
  if (found === "found") {
    const kept = await audit({
      category: "SYSTEM", action: LETTER_ACTION, actorId: SYSTEM, targetType: LETTER_TARGET, targetId: target,
      payload: { notice: r.notice, outcome: LETTER_CONFIRMED },
    });
    if (kept.recorded) { r.letters.confirmed = (r.letters.confirmed ?? 0) + 1; return; }
  } else if (found === "absent" && !absentBefore) {
    const kept = await audit({
      category: "SYSTEM", action: LETTER_ACTION, actorId: SYSTEM, targetType: LETTER_TARGET, targetId: target,
      payload: { notice: r.notice, outcome: LETTER_ABSENT },
    });
    if (kept.recorded) {
      // ⭐ S6-NOTICES (L-3) · its one resend did not go now: owed, and the card says so.
      if ((await sendLetter(r, userId, job)) !== "attempted") r.letters.resendOwed = (r.letters.resendOwed ?? 0) + 1;
      return;
    }
  }
  r.letters.unresolved = (r.letters.unresolved ?? 0) + 1;
}

/**
 * ⭐ Round 9 (L3), round 13 · whether the address a letter would go to today is the one its attempt went to — compared by the
 * attempt's peppered hash, and only under the pepper that made it. An attempt that recorded no address (none on file then)
 * is compared with nothing. One rule for the run's search (`resolveLetter`) and the card's list (`millioneaOpenLetters`).
 */
function attemptMatches(attempt: LetterRecord | undefined, to: string | null): boolean {
  const sentTo = attempt?.payload?.addr;
  if (typeof sentTo !== "string") return true;
  return to !== null && attempt?.payload?.pv === pepperVersion() && addressHash(to) === sentTo;
}

/**
 * ⭐ A MONEY LETTER, SENT AT MOST ONCE (round 5, LOW 12): its attempt is recorded on the holder's own target BEFORE the send,
 * and its outcome after — so a run that dies between the two finds the attempt and never sends it again. An attempt that
 * could not be recorded is no send now: the letter is counted failed (an ALARM) and the reconcile sends it later.
 * ⭐ M-2 · while the email rail is DOWN, a letter that would reach the provider and is not this run's one probe is DEFERRED
 * before its attempt is written: no attempt, no refusal used, and the run stays owed (`railAllowsLetter`).
 * Answers whether the letter was attempted (S6-NOTICES, L-3: a resend still owed is counted by its caller).
 */
async function sendLetter(r: NoticeRun, userId: string, job: LetterJob): Promise<"attempted" | "unrecorded" | "deferred"> {
  const target = letterTarget(r.weekId, userId);
  const to = await letterAddressOf(userId, { confirmedOnly: true });
  if (reachesProvider(to) && !railAllowsLetter(r)) { r.letters.deferred = (r.letters.deferred ?? 0) + 1; return "deferred"; }
  const attempt = await audit({
    category: "SYSTEM", action: LETTER_ACTION, actorId: SYSTEM, targetType: LETTER_TARGET, targetId: target,
    payload: { notice: r.notice, outcome: LETTER_ATTEMPT, ...(to ? { addr: addressHash(to), pv: pepperVersion() } : {}) },
  });
  if (!attempt.recorded) {
    console.error(`[maswali-notify] ALARM: a ${r.notice} letter's attempt for ${r.weekId} could not be recorded; it is not sent now.`);
    r.letters.failed = (r.letters.failed ?? 0) + 1;
    return "unrecorded";
  }
  const res = await job.send({ letter: letterMetadata(target) });
  const outcome = letterOutcome(res, job.money);
  r.letters[outcome] = (r.letters[outcome] ?? 0) + 1;
  const kept = await audit({
    category: "SYSTEM", action: LETTER_ACTION, actorId: SYSTEM, targetType: LETTER_TARGET, targetId: target,
    payload: { notice: r.notice, outcome },
  });
  // ⭐ Rounds 7 and 8 (M2, M3) · a win's or a refund's letter the provider may have taken — or whose outcome's own record
  // did not land — is not yet known to be gone.
  if (job.money && (outcome === "ambiguous" || !kept.recorded)) r.letters.unresolved = (r.letters.unresolved ?? 0) + 1;
  return "attempted";
}

/** ⚠️ FOR THE SUITES: the winners' SMS of these outcomes, tallied as a run tallies them, and whether that leaves the SMS done. */
export function millioneaSmsTally(outcomes: readonly WinnerSmsOutcome[]): { tally: WinnerSmsTally; done: boolean } {
  const t: WinnerSmsTally = { sent: 0, already: 0, notResent: 0, held: {}, permanent: {}, none: 0 };
  for (const o of outcomes) tally(t, o);
  return { tally: t, done: Object.keys(t.held).length === 0 };
}

/** Count one winner's SMS outcome into the run's tally: a refusal that can never clear is counted apart (`PERMANENT_SMS`). */
function tally(t: WinnerSmsTally, o: WinnerSmsOutcome): void {
  if (o.kind === "none") { t.none++; return; }
  if (o.kind === "held") {
    if (PERMANENT_SMS.has(o.reason)) t.permanent[o.reason] = (t.permanent[o.reason] ?? 0) + o.winners;
    else t.held[o.reason] = (t.held[o.reason] ?? 0) + o.winners;
    return;
  }
  t.sent += o.accepted;
  t.already += o.alreadySent;
  t.notResent += o.notResent;
  for (const [code, n] of Object.entries(o.codes)) {
    if (!n) continue;
    if (PERMANENT_SMS.has(code)) t.permanent[code] = (t.permanent[code] ?? 0) + n;
    // ⭐ M-1 · any other failure of this batch is the message's one attempt: not resent, the desk calls.
    else t.notResent += n;
  }
}

/** The week's holders: each account's tickets in sale order, read from the week's own rows (OD-25: nobody else). */
function byHolder(tickets: readonly StoredTicket[]): Map<string, StoredTicket[]> {
  const m = new Map<string, StoredTicket[]>();
  for (const t of [...tickets].sort((a, b) => a.serial.localeCompare(b.serial))) m.set(t.userId, [...(m.get(t.userId) ?? []), t]);
  return m;
}

/** One ticket's frozen price (MR-8) — every stake, cancel and refund of the week is this figure — or null. */
function priceOf(week: StoredWeek): number | null {
  const r = readMaswaliRulesSnapshot(week.rulesSnapshot);
  return r.ok ? r.rules.ticketPriceTzs : null;
}

/** The withdrawal fee's live rate (RULES §2.7, `/admin/config`), or its documented fallback when the config is unread. */
async function withdrawalFeeRateNow(): Promise<number> {
  try {
    const { getGlobalConfig } = await import("./market-config");
    const rate = (await getGlobalConfig()).withdrawalFeeRate;
    return Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_WITHDRAWAL_FEE_RATE;
  } catch {
    return DEFAULT_WITHDRAWAL_FEE_RATE;
  }
}

/** R8-C's one break, read as every letter reads it (`isLockedOut` → `breakStateOf`), failing open: it gates a line only. */
async function readerOnBreak(userId: string): Promise<boolean> {
  try {
    const { isLockedOut } = await import("./responsible-gambling");
    return breakStateOf(await isLockedOut(userId)) !== null;
  } catch {
    return false;
  }
}

/**
 * The account as a notice needs it — its status, phone and language. `missing` when no such account exists: a holder no
 * run can ever tell, counted with that reason and never retried. A read that FAILS is neither: the holder is told as
 * before, with what the account would have added left out.
 */
async function accountOf(userId: string): Promise<{ user: StoredUser | null; missing: boolean }> {
  try {
    const user = await db.user.findById(userId);
    return { user, missing: user === null };
  } catch {
    return { user: null, missing: false };
  }
}

/** A holder no run can ever tell: counted apart, so the run stays complete. */
function never(r: NoticeRun, why: string): void {
  r.permanent[why] = (r.permanent[why] ?? 0) + 1;
}

/**
 * The week a week's carry flows into — the S5 rule (`maswali-player.ts` `nextWeekOf`, its round 3): the earliest week of the
 * same line after it IN THE CALENDAR (`calendarStartMs`, MR-3, never the drafting order) that has opened and not voided.
 */
async function nextWeekOf(week: StoredWeek): Promise<StoredWeek | null> {
  const at = calendarStartMs(week);
  const later = (await weekStore.list({ visibility: week.visibility }))
    .filter((w) => w.state !== "DRAFT" && w.state !== "VOIDED" && calendarStartMs(w) > at);
  return later.sort((a, b) => calendarStartMs(a) - calendarStartMs(b))[0] ?? null;
}

/**
 * Every holder of the run told, no write failed, no letter definitely refused, and (a result) no winner's SMS held in a way
 * a later run may clear: nothing left to send. A winner's SMS that did not go is final (M-1: not resent; the desk calls).
 * A permanent refusal leaves it complete, with its reason counted — and a letter that may have been delivered is done
 * (round 4, M6). A holder whose letter records could not be read leaves it NOT complete (round 17, B2), so the reconcile
 * comes back to that letter. ⭐ M-2 · a letter refused as often as the cap allows leaves it complete (`capped`: no run sends
 * it again, the card lists it); a letter deferred while the email rail was DOWN leaves it NOT complete, so the reconcile
 * sends it once the rail answers.
 */
function complete(r: NoticeRun): boolean {
  const smsDone = r.sms === null || Object.keys(r.sms.held).length === 0;
  return r.failed === 0 && (r.letters.failed ?? 0) === 0 && (r.letters.unresolved ?? 0) === 0 && (r.letters.unread ?? 0) === 0
    && (r.letters.deferred ?? 0) === 0 && r.sent + r.alreadySent === r.recipients && smsDone;
}

/** ⚠️ FOR THE SUITES: whether a run left nothing to send, as its record says it (`complete`). */
export function millioneaRunComplete(r: NoticeRun): boolean {
  return complete(r);
}

/**
 * The one record a week's notice run leaves: counts only, never a player (the digest's rule — one row for the run). Only a
 * money notice's record says whether every part went (`complete`, the reconcile's only read); the at-most-once notices
 * carry no such word (round 3: nothing ever read it).
 */
function recordRun(week: StoredWeek, r: NoticeRun): void {
  audit({
    category: "SYSTEM", action: RUN_ACTION, actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
    payload: {
      code: week.code, notice: r.notice, recipients: r.recipients, sent: r.sent, alreadySent: r.alreadySent, failed: r.failed,
      permanent: r.permanent, letters: r.letters, sms: r.sms, ...(isMoney(r) ? { complete: complete(r) } : {}),
    },
  });
}

/** The newest record of this week's `notice` runs (its payload), or null when there is none or it cannot be read. */
async function lastRunRecord(weekId: string, notice: "result" | "refund"): Promise<Record<string, unknown> | null> {
  try {
    await auditFlush();
    const rows = await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [weekId], actions: [RUN_ACTION], sinceIso: EPOCH, limit: 50 });
    return rows.entries.find((e) => e.payload?.notice === notice)?.payload ?? null;
  } catch {
    return null;
  }
}

/**
 * The letters a run leaves STANDING — those the integrity card lists, by cause (`maswali-console.ts` `unresolvedLetters`):
 * as a key, so two runs' standing letters compare. A count a run makes of what it did this time (a letter sent, refused) is
 * not here: a re-run that does nothing makes none of those.
 */
function standingLetters(letters: unknown): string {
  const l = (letters ?? {}) as Record<string, unknown>;
  // ⭐ M-2 · and the letters capped or deferred: the card counts both.
  return (["unresolved", "unmatched", "resendOwed", "unread", "capped", "deferred"] as const).map((k) => (typeof l[k] === "number" ? l[k] : 0)).join(",");
}

/**
 * ⭐ A MONEY NOTICE'S RECORD, WRITTEN ONLY WHEN THE RUN CHANGED SOMETHING (round 3, A12): a first run, a bell, a letter or
 * an SMS that went, or a different answer to "complete" — ⭐ S6-NOTICES (L-3) · or different letters left standing, which
 * the integrity card reads from the newest record (a letter whose address changed since, a resend still owed) — so a hold
 * that cannot clear yet leaves no record an hour for fourteen days. A last record that cannot be read is no reason to stay
 * silent: the run records.
 */
async function recordMoneyRun(week: StoredWeek, r: NoticeRun): Promise<void> {
  const last = await lastRunRecord(week.id, r.notice as "result" | "refund");
  const went = r.sent > 0 || (r.letters.sent ?? 0) + (r.letters.stub ?? 0) + (r.letters.ambiguous ?? 0) + (r.letters.confirmed ?? 0) > 0 || (r.sms?.sent ?? 0) > 0;
  if (last && !went && last.complete === complete(r) && standingLetters(last.letters) === standingLetters(r.letters)) return;
  recordRun(week, r);
}

// ── AN OFFICER'S CHECK CLOSES THE LETTERS IT LISTS (round 17, M5 — the lead's ruling) ───────────────────────────────

/** The holders a week's money notice writes letters to: a result's winners, a refund's every holder (OD-25: nobody else). */
async function moneyLetterHolders(week: StoredWeek, notice: "result" | "refund"): Promise<string[]> {
  const tickets = await ticketStore.listForWeek(week.id, { status: notice === "result" ? "SETTLED" : "REFUNDED" });
  return [...byHolder(tickets)].filter(([, mine]) => notice === "refund" || mine.some((t) => t.won === true)).map(([userId]) => userId);
}

/**
 * ⭐ A MONEY LETTER STILL OPEN, as its holder's own records say it (newest first) — what the integrity card lists and what an
 * officer's check closes, one rule for both: `attempted`, the provider may have taken it (its newest record an ambiguous
 * outcome or a bare attempt); `resendOwed`, its search found no such message and its one resend has not gone; ⭐ M-2 ·
 * `capped`, the provider definitely refused it `LETTER_REFUSALS_CAP` times and no run sends it again. Null for every other
 * letter: done, never sent, or definitely refused fewer times (the reconcile sends that one again).
 */
function openKindOf(records: readonly LetterRecord[], notice: "result" | "refund"): "attempted" | "resendOwed" | "capped" | null {
  const newest = records.find((e) => e.payload?.notice === notice)?.payload?.outcome;
  if (newest === LETTER_ABSENT) return "resendOwed";
  if (newest === "failed") return refusalsIn(records, notice) >= LETTER_REFUSALS_CAP ? "capped" : null;
  return newest === "ambiguous" || newest === LETTER_ATTEMPT ? "attempted" : null;
}

/**
 * Why a listed letter is open (S6-NOTICES, L-3), one sentence each on the card: `uncertain`, the provider may have taken it and
 * its search has not said so; `unmatched`, the same, but the account's address or the pepper changed since its attempt, so
 * its search is never asked; `resendOwed`, its search found no such message and its one resend is still owed; ⭐ M-2 ·
 * `capped`, the provider refused it as often as the cap allows, so no run sends it again.
 */
export type OpenLetterCause = "uncertain" | "unmatched" | "resendOwed" | "capped";

/** One open money letter as the card lists it for Compliance: its holder, why it is open, the tag the provider knows it by
 *  (`letterMetadata`, a one-way digest: no account id leaves) and its attempts' instants, newest first. */
export type OpenLetter = { userId: string; cause: OpenLetterCause; tag: string; attempts: string[] };

/**
 * ⭐ S6-NOTICES (L-3) · THE OPEN LETTERS OF ONE WEEK'S MONEY NOTICE, from their holders' own records — exactly the letters an
 * officer's check would close now, each with the tag and the attempt instants the provider's activity is searched by. Null
 * when the records were not read whole (one read cut short, or failed): the card then says so, and no page load reads a
 * week's holders one by one.
 */
export async function millioneaOpenLetters(weekId: string, notice: "result" | "refund"): Promise<OpenLetter[] | null> {
  const week = await weekStore.get(weekId);
  if (!week || week.state !== (notice === "result" ? "SETTLED" : "VOIDED")) return [];
  const holders = await moneyLetterHolders(week, notice);
  const read = await letterRecords(week.id, notice, holders);
  if (read === null) return null;
  const out: OpenLetter[] = [];
  for (const userId of holders) {
    const target = letterTarget(week.id, userId);
    const mine = (read.get(target) ?? []).filter((e) => e.payload?.notice === notice);
    const kind = openKindOf(mine, notice);
    if (kind === null) continue;
    const attempts = mine.filter((e) => e.payload?.outcome === LETTER_ATTEMPT);
    const cause: OpenLetterCause = kind === "resendOwed" || kind === "capped" ? kind
      : attemptMatches(attempts[0], await letterAddressOf(userId, { confirmedOnly: true })) ? "uncertain" : "unmatched";
    out.push({ userId, cause, tag: letterMetadata(target), attempts: attempts.map((e) => e.createdAt) });
  }
  return out;
}

/** What an officer's check of one week's notice did: the letters it closed, or why it did nothing. */
export type LettersCheck = { ok: true; closed: number } | { ok: false; error: string };

/** The refusal of a check while the week's letters are being sent, or checked, in this process or another. */
export const LETTERS_BUSY = "This week's letters are being sent or checked right now, so nothing was closed. Try again in a few minutes.";

/**
 * ⭐ AN OFFICER'S CHECK CLOSES THE LETTERS IT LISTS (round 17, M5). Listing a letter the provider may have taken is not the
 * end of it: a later run asks the provider's search again, and an "absent" then sends it once more — after an officer
 * may have written to the holder by hand. So the check closes each such letter on its holder's own record: one COMPLIANCE
 * record, by the officer, whose outcome "cleared" every later run reads as done — never searched for, never sent again.
 *   · It never runs beside the week's notice: refused while a run of it, or another check, is going in this process, or
 *     while another process holds the week's lease (read and written strictly, as a run takes it); and while it works it
 *     holds both, so a launch meanwhile tells nobody and the next tick runs it again (`launchOnce`).
 *   · It closes the money letters only — a result's to its winners, a refund's to every holder — whose newest record says
 *     the provider may have taken them ("ambiguous", a bare attempt) or that their one resend is still owed ("absent").
 *   · Every holder's records are read before anything is written: one that cannot be read refuses the check, and nothing
 *     is closed. A closing record that does not land refuses it too (those closed stay closed; a repeat closes the rest).
 *   · `record` writes the officer's own check while the week is still held, so no run can list a new letter between the
 *     closing records and that check — which would take the new letter's row off the card unchecked.
 */
export async function closeUnresolvedLetters(
  weekId: string, notice: "result" | "refund", officerId: string, record: (closed: number) => Promise<boolean>,
): Promise<LettersCheck> {
  const key = `${notice}:${weekId}`;
  if (running().has(key) || checks().has(key)) return { ok: false, error: LETTERS_BUSY };
  checks().add(key);
  const task = noticeLeaseTask(notice, weekId);
  const lease = { leaseMs: NOTICE_LEASE_MS, strictWrite: true, strictRead: true };
  let held = false;
  try {
    held = await acquireLeadership(task, lease);
    if (!held) return { ok: false, error: LETTERS_BUSY };
    let renewedAt = Date.now();
    const keep = async (): Promise<boolean> => {
      if (Date.now() - renewedAt < NOTICE_LEASE_MS / 3) return true;
      renewedAt = Date.now();
      return acquireLeadership(task, lease);
    };
    const lost: LettersCheck = { ok: false, error: "The week's hold was lost part-way, so the check was not recorded. Try again." };
    const week = await weekStore.get(weekId);
    if (!week || week.state !== (notice === "result" ? "SETTLED" : "VOIDED")) return { ok: false, error: "This week has no such notice to check." };
    const holders = await moneyLetterHolders(week, notice);
    const read = await letterRecords(week.id, notice, holders);
    const open: string[] = [];
    for (const userId of holders) {
      const records = await holderLetters(read, week.id, userId, notice);
      if (records === null) return { ok: false, error: "A holder's letter records could not be read, so nothing was closed. Try again." };
      if (openKindOf(records, notice) !== null) open.push(userId);
    }
    for (const userId of open) {
      if (!(await keep())) return lost;
      const closed = await audit({
        category: "COMPLIANCE", action: LETTER_ACTION, actorId: officerId, targetType: LETTER_TARGET, targetId: letterTarget(week.id, userId),
        payload: { notice, outcome: LETTER_CLEARED },
      });
      if (!closed.recorded) return { ok: false, error: "A letter could not be closed, so the check was not recorded. Try again." };
    }
    if (!(await keep())) return lost;
    if (!(await record(open.length))) return { ok: false, error: "The check could not be recorded, so the row stays. Try again." };
    return { ok: true, closed: open.length };
  } catch (err) {
    console.error(`[maswali-notify] an officer's check of the ${notice} letters for ${weekId} stopped:`, (err as Error)?.message ?? err);
    return { ok: false, error: "The letters could not be checked. Try again." };
  } finally {
    if (held) await releaseLeadership(task);
    checks().delete(key);
  }
}

// ── A QUESTION'S OWN SEAL RECORDS (round 3, A6) ───────────────────────────────────────────────────────────

/** One of a question's seal records: its seal, a correction or a confirmation, with the instant of the record it is about. */
type SealStep = { action: string; outcome: MaswaliOutcome | null; sealedAt: string | null };

const outcomeOf = (v: unknown): MaswaliOutcome | null => (v === "YES" || v === "NO" || v === "VOID" ? v : null);

/**
 * A question's own seal records, oldest first — its seal, each correction, each confirmation — this process's own writes
 * flushed first (the trigger ran here). Null when they cannot be read: an ALARM, and the caller falls back.
 */
async function sealSteps(questionId: string): Promise<SealStep[] | null> {
  try {
    await auditFlush();
    const rows = await getAuditForTargetsDurable({
      targetType: "MaswaliQuestion", targetIds: [questionId], actions: [SEALED_ACTION, CORRECTED_ACTION, CONFIRMED_ACTION], sinceIso: EPOCH, limit: 500,
    });
    return [...rows.entries].reverse().map((e) => {
      const at = e.payload?.sealedAt;
      return { action: e.action, outcome: outcomeOf(e.action === CORRECTED_ACTION ? e.payload?.to : e.payload?.outcome), sealedAt: typeof at === "string" ? at : null };
    });
  } catch (err) {
    console.error("[maswali-notify] ALARM: a question's seal records could not be read:", (err as Error)?.message ?? err);
    return null;
  }
}

/**
 * The outcome holders last had as FINAL before the question's current record — the seal or correction that became final,
 * at once or on its second officer's confirmation. Null when no earlier record was ever final: a correction made before a
 * confirmation corrects nothing a holder was told (round 3, A6).
 */
function lastFinalBefore(steps: readonly SealStep[], q: StoredQuestion): MaswaliOutcome | null {
  const twoOfficer = q.twoOfficerAtStage1 === true;
  const finals: Array<{ outcome: MaswaliOutcome | null; sealedAt: string | null }> = [];
  let current: { outcome: MaswaliOutcome | null; sealedAt: string | null } = { outcome: null, sealedAt: null };
  for (const s of steps) {
    if (s.action === CONFIRMED_ACTION) { finals.push({ outcome: current.outcome, sealedAt: s.sealedAt ?? current.sealedAt }); continue; }
    current = { outcome: s.outcome, sealedAt: s.sealedAt };
    if (!twoOfficer) finals.push(current);
  }
  const earlier = finals.filter((f) => f.sealedAt !== q.sealedAt);
  return earlier.length > 0 ? earlier[earlier.length - 1].outcome : null;
}

/**
 * The instant the question's outcome BECAME VOID: the record that made it VOID. ⛔ A later VOID→VOID correction (a new ground
 * or new evidence) keeps it, so that change is told NOT AT ALL — the void stands, and the ticket page shows its ground
 * (round 3, A6). When the records cannot say (unread, or the newest not yet among them), the question's own seal instant.
 */
function becameVoidAt(steps: readonly SealStep[] | null, q: StoredQuestion): string | null {
  if (!steps) return q.sealedAt;
  let since: string | null = null;
  let current: MaswaliOutcome | null = null;
  for (const s of steps) {
    if (s.action === CONFIRMED_ACTION) continue;
    if (s.outcome === "VOID" && current !== "VOID") since = s.sealedAt;
    if (s.outcome !== "VOID") since = null;
    current = s.outcome;
  }
  return current === "VOID" && since ? since : q.sealedAt;
}

// ── THE TRIGGERS ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * A purchase's receipt, to its buyer — after `purchaseMaswaliTickets`' purchase committed and never for a replay (which
 * moved nothing). One notice for the whole purchase; its free-cancel end is the slip's own (`millioneaCancelUntil`).
 */
export function noticeTicketsBought(userId: string, bought: { weekId: string; tickets: readonly { positionId: string; serial: string }[] }, placedAt: string): Promise<NoticeRun> {
  return launch("receipt", bought.weekId, async (r) => {
    const first = bought.tickets[0];
    const week = await weekStore.get(bought.weekId);
    const price = week ? priceOf(week) : null;
    if (!first || !week || price === null) return;
    const until = await millioneaCancelUntil(week.id, placedAt).catch(() => null);
    const serials = bought.tickets.map((t) => t.serial);
    await once(r, userId, { notice: "receipt", serial: first.serial, positionId: first.positionId }, () => notifyMillioneaTicketsCut(userId, {
      weekCode: week.code, serials, firstPositionId: first.positionId, totalTzs: price * serials.length, freeCancelUntil: until,
    }));
  });
}

/** A free cancel, to its buyer — after the cancel's one transaction committed (`cancelMaswaliTicket`). */
export function noticeTicketCancelled(userId: string, ticketId: string, at?: NoticeCallSite): Promise<NoticeRun> {
  return launch("cancel", ticketId, async (r) => {
    const ticket = await ticketStore.get(ticketId);
    if (!ticket || ticket.userId !== userId || ticket.status !== "CANCELLED") return;
    r.weekId = ticket.cycleId;
    const week = await weekStore.get(ticket.cycleId);
    const price = week ? priceOf(week) : null;
    if (!week || price === null) return;
    await once(r, userId, { notice: "cancel", serial: ticket.serial }, () => notifyMillioneaTicketCancelled(userId, {
      weekCode: week.code, serial: ticket.serial, refundedTzs: price,
    }));
  }, at);
}

/** The sales close, to every holder of a live ticket — after the close's commitment committed (`closeWeek`). */
export function noticeSalesClosed(weekId: string, at?: NoticeCallSite): Promise<NoticeRun> {
  return launch("closed", weekId, async (r) => {
    const week = await weekStore.get(weekId);
    const closedAt = week?.closedAt ?? null;
    if (!week || !closedAt) return;
    for (const [userId, mine] of byHolder(await ticketStore.listForWeek(week.id, { status: "LIVE" }))) {
      await once(r, userId, { notice: "closed", weekCode: week.code }, () => notifyMillioneaSalesClosed(userId, {
        weekCode: week.code, tickets: mine.length, closedAt,
      }));
    }
    recordRun(week, r);
  }, at);
}

/**
 * The week's moves of its close, from ONE read of their own records (round 4, L4): how many there are — the n-th move is
 * its own notice (round 3, A7: keyed by its instant, B→A→B never told the second B) — and the close the newest one set, so
 * the count and the close a notice tells can never come from two reads a later move fell between. Null when the records
 * cannot be read, or hold no move (an ALARM).
 */
async function closeMoves(weekId: string): Promise<{ move: number; closesAt: string } | null> {
  try {
    await auditFlush();
    const rows = await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [weekId], actions: [CLOSE_MOVED_ACTION], sinceIso: EPOCH, limit: 1_000 });
    const to = rows.entries[0]?.payload?.to;
    if (rows.entries.length > 0 && typeof to === "string") return { move: rows.entries.length, closesAt: to };
    console.error(`[maswali-notify] ALARM: week ${weekId}'s close moved, and no record of a move can be read.`);
    return null;
  } catch (err) {
    console.error(`[maswali-notify] ALARM: week ${weekId}'s moves could not be read:`, (err as Error)?.message ?? err);
    return null;
  }
}

/**
 * The sales close MOVED (MB-28), to every holder of a live ticket — after `moveClose`'s lock returned. Each move is its own
 * notice, keyed by its place among the week's moves, so a close moved B→A→B is told three times, each once; a notice that
 * runs after a later move has landed tells the newest close a record names. ⛔ A stored close the records do not reach — a
 * move whose record was kept only in memory — raises an ALARM and tells nobody (rounds 4 and 5, L4): its notice could not be
 * keyed apart, and no holder is told a close that is not the stored one.
 */
export function noticeCloseMoved(weekId: string): Promise<NoticeRun> {
  return launch("closeMoved", weekId, async (r) => {
    const week = await weekStore.get(weekId);
    if (!week || week.state !== "OPEN") return;
    const moves = await closeMoves(week.id);
    if (moves === null) return;
    if (moves.closesAt !== week.closesAt) {
      console.error(`[maswali-notify] ALARM: week ${week.code}'s close is not the one its newest move's record set — a move's record was kept only in memory; nobody is told.`);
      return;
    }
    for (const [userId, mine] of byHolder(await ticketStore.listForWeek(week.id, { status: "LIVE" }))) {
      await once(r, userId, { notice: "closeMoved", weekCode: week.code, move: moves.move }, () => notifyMillioneaCloseMoved(userId, {
        weekCode: week.code, tickets: mine.length, closesAt: moves.closesAt, move: moves.move,
      }));
    }
    recordRun(week, r);
  });
}

/** A week whose questions may still be told: on sale, closed or being graded. */
const gradingWeek = (w: StoredWeek | null): w is StoredWeek =>
  !!w && (w.state === "OPEN" || w.state === "CLOSED" || w.state === "RESOLVING");

/**
 * ONE FINAL void, to every holder of a live ticket — keyed by the instant the question BECAME void (a later change of its
 * ground is not told again: `becameVoidAt`). ⛔ Never while the week's void is certain (MR-18): no reserve can take the
 * place the notice promises, and the week void's own notice, with its refund, tells the end. A void muted then is told by
 * the catch-up once a correction makes the week gradable again.
 */
async function tellVoid(r: NoticeRun, week: StoredWeek, questions: readonly StoredQuestion[], q: StoredQuestion): Promise<void> {
  const graded = gradable([...questions]);
  const at = questions.indexOf(q);
  const ground = q.voidReason ?? null;
  if (at < 0 || graded[at]?.outcome !== "VOID" || !isMaswaliVoidReason(ground) || !q.sealedAt) return;
  if (weekVoidCertain(graded)) return;
  const voidedAt = becameVoidAt(await sealSteps(q.id), q);
  if (!voidedAt) return;
  for (const [userId] of byHolder(await ticketStore.listForWeek(week.id, { status: "LIVE" }))) {
    await once(r, userId, { notice: "void", weekCode: week.code, slot: q.slot, sealedAt: voidedAt }, () => notifyMillioneaQuestionVoided(userId, {
      weekCode: week.code, role: q.role, ordinal: q.ordinal, slot: q.slot, ground, sealedAt: voidedAt,
    }));
  }
}

/**
 * A question voided, to every holder of a live ticket — once the void is FINAL: after its seal committed (a correction to
 * VOID is told by `noticeQuestionCorrected`, a two-officer void once its second officer confirmed). A week already settled
 * or voided says nothing more: its own notice tells the end.
 */
export function noticeQuestionVoided(weekId: string, slot: number): Promise<NoticeRun> {
  return launch("void", weekId, async (r) => {
    const week = await weekStore.get(weekId);
    if (!gradingWeek(week)) return;
    const questions = await questionStore.listForWeek(week.id);
    const q = questions.find((x) => x.slot === slot);
    if (q) await tellVoid(r, week, questions, q);
  });
}

/**
 * ⭐ A SEALED QUESTION CORRECTED (OD-09, MB-24), to every holder of a live ticket — once the corrected record is final:
 * after the correction committed, or, while two officers are required, after the second officer's confirmation (the
 * caller then passes no `from`, and the question's own records say what the holders last had as final — `lastFinalBefore`;
 * none means nothing they were told is corrected). A correction TO a void is told as that void; a void corrected to a
 * result is told as reinstated; YES↔NO is told as corrected. Then the CATCH-UP: every final void of the week not yet told
 * — one muted while the week's void was certain — is told once the week can grade again.
 */
export function noticeQuestionCorrected(weekId: string, slot: number, from?: MaswaliOutcome | null, at?: NoticeCallSite): Promise<NoticeRun> {
  return launch("correction", weekId, async (r) => {
    const week = await weekStore.get(weekId);
    if (!gradingWeek(week)) return;
    const questions = await questionStore.listForWeek(week.id);
    const graded = gradable(questions);
    const i = questions.findIndex((x) => x.slot === slot);
    const q = i >= 0 ? questions[i] : null;
    if (!q) return;
    const final = graded[i]?.outcome ?? null;
    let before: MaswaliOutcome | null | undefined = from;
    if (before === undefined) {
      const steps = await sealSteps(q.id);
      before = steps === null ? undefined : lastFinalBefore(steps, q);
    }
    if (final !== null && final !== "VOID" && before !== undefined && before !== null && before !== final && q.sealedAt) {
      const sealedAt = q.sealedAt;
      for (const [userId] of byHolder(await ticketStore.listForWeek(week.id, { status: "LIVE" }))) {
        await once(r, userId, { notice: "correction", weekCode: week.code, slot: q.slot, sealedAt }, () => notifyMillioneaQuestionCorrected(userId, {
          weekCode: week.code, role: q.role, ordinal: q.ordinal, slot: q.slot, sealedAt, reinstated: before === "VOID",
        }));
      }
    }
    // The catch-up, this question's own void among them (a correction TO a void is told here, keyed by when it became void).
    for (const v of questions) if (gradable([v])[0]?.outcome === "VOID") await tellVoid(r, week, questions, v);
  }, at);
}

/**
 * ⭐ THE WEEK'S RESULT, to every holder — after the settlement committed (`settleMaswaliWeek`, which first compares the float
 * with the paid total, MB-11). WINNERS FIRST: each winner's bell (the win, or a held win as a VERDICT), the letter that
 * bell carries, and right after it the winner's one service SMS on its own key (OD-25). Then every other holder: the loss,
 * or in a week no ticket won the rollover — its carried figure left out for a reader on a break (R8-D) or an account that
 * cannot sign in (MB-44). A run already going for this week in this process is shared, never doubled.
 */
export function noticeWeekSettled(weekId: string, opts: { first?: () => Promise<void> } = {}): Promise<NoticeRun> {
  return launchOnce("result", weekId, async (r, keep) => {
    // ⭐ Round 5 (L2 with M5) · what must come first (the reconcile's float check) runs once the week's lease is held — once
    // a lease, never once a tick while another process holds it.
    await opts.first?.().catch(() => {});
    const week = await weekStore.get(weekId);
    const price = week ? priceOf(week) : null;
    if (!week || week.state !== "SETTLED" || price === null) return;
    const tickets = await ticketStore.listForWeek(week.id, { status: "SETTLED" });
    const winning = tickets.filter((t) => t.won === true);
    const k = winning.length;
    const score = winning.reduce((s, t) => Math.max(s, t.score ?? 0), 0);
    const carried = k === 0 ? (week.rolloverIn ?? 0) + (week.carryOut ?? 0) : null;
    const next = k === 0 ? await nextWeekOf(week) : null;
    const feeRate = await withdrawalFeeRateNow();
    const n = eatWeekNumberOf(week.code);
    const holders = [...byHolder(tickets)];
    const read = await letterRecords(week.id, "result", holders.map(([userId]) => userId));
    const winners = holders.filter(([, mine]) => mine.some((t) => t.won === true));
    const losers = holders.filter(([, mine]) => !mine.some((t) => t.won === true));
    const sms: WinnerSmsTally = { sent: 0, already: 0, notResent: 0, held: {}, permanent: {}, none: 0 };
    r.sms = sms;
    for (const [userId, mine] of winners) {
      if (!(await keep())) return;
      const { user, missing } = await accountOf(userId);
      if (missing) { never(r, "no_account"); continue; }
      const cannotSignIn = CANNOT_SIGN_IN.has(String(user?.status ?? ""));
      const won = mine.filter((t) => t.won === true);
      const paid = won.filter((t) => t.frozenReason == null);
      const lead = paid[0] ?? won[0];
      // S6-INT 14 · R's rule (a missing figure is said, never printed as 0): a paid share whose record lacks its amount, or a
      // share the week cannot state, sends no money notice that would say TZS 0 — the winner stays on the desk's list
      // (`unreachedWinners`, "Not on record") and the run counts why.
      const share = lead.payout ?? week.sharePerTicket ?? null;
      if (share === null || paid.some((t) => t.payout === null)) { never(r, "share_unread"); continue; }
      const paidTzs = paid.reduce((s, t) => s + Math.round(t.payout ?? 0), 0);
      const shares: MillioneaWinShares = {
        weekCode: week.code, winningSerial: lead.serial, paidTickets: paid.length, paidTzs, heldTickets: won.length - paid.length,
        shareTzs: Math.round(share), score, maxPerWithdrawalTzs: WITHDRAW_MAX_TZS,
        withdrawalFeeRate: feeRate, cannotSignIn,
      };
      const bell = await once(r, userId, { notice: "result", weekCode: week.code, winningSerial: lead.serial },
        () => (paid.length > 0 ? notifyMillioneaWon(userId, shares) : notifyMillioneaWonHeld(userId, shares)));
      const winArgs = {
        weekNumber: n, serials: won.map((t) => t.serial), paidTickets: shares.paidTickets, heldTickets: shares.heldTickets,
        shareTzs: shares.shareTzs, paidTzs, score, maxPerWithdrawalTzs: WITHDRAW_MAX_TZS, withdrawalFeeRate: feeRate, cannotSignIn,
        ticketHref: millioneaTicketHref(lead.serial),
      };
      const winSubject = paid.length > 0 ? `Millionea Week ${n} · You won ${formatTzs(paidTzs)}` : `Millionea Week ${n} · Your ticket won`;
      await letterStep(r, bell, read, week.id, userId, {
        tag: "millionea-win", money: true,
        send: (metadata) => LETTERS.send(userId, (email) => ({ to: email, subject: winSubject, html: millioneaWinHtml(winArgs), tag: "millionea-win", metadata }), { confirmedOnly: true }),
      });
      // ⭐ The SMS on its OWN key, whatever the bell did (a bell already written, or one whose write failed, never stops it).
      const line: WinnerSmsLine = {
        userId, weekId: week.id, weekCode: week.code, tickets: won.length, paidTzs, held: paid.length === 0, cannotSignIn,
        phone: user?.phoneE164 ?? null, locale: user?.locale ?? "EN",
      };
      tally(sms, await sendMillioneaWinnerSms([line]));
    }
    for (const [userId, mine] of losers) {
      if (!(await keep())) return;
      const { user, missing } = await accountOf(userId);
      if (missing) { never(r, "no_account"); continue; }
      const cannotSignIn = CANNOT_SIGN_IN.has(String(user?.status ?? ""));
      const spentTzs = mine.length * price;
      const winningScore = k > 0 ? score : null;
      // ⛔ MB-44 · the carried figure is a lure to an account that cannot come back (closed, excluded, suspended) or is
      // on a break (R8-D): the line is left out for both, never reworded.
      const locked = cannotSignIn || (await readerOnBreak(userId));
      const carry = carried !== null && !locked ? { amountTzs: carried, intoWeekCode: next?.code ?? null } : null;
      const bell = await once(r, userId, { notice: "result", weekCode: week.code, winningSerial: null }, () => notifyMillioneaNotWon(userId, {
        weekCode: week.code, tickets: mine.length, spentTzs, winningTickets: k, winningScore, carried: carry,
      }));
      const lostArgs = (readerBreak: boolean) => ({
        weekNumber: n, tickets: mine.length, spentTzs, winningTickets: k, winningScore,
        carried: carried !== null && !readerBreak && !cannotSignIn ? { amountTzs: carried, intoWeekNumber: next ? eatWeekNumberOf(next.code) : null } : null,
      });
      const subject = mine.length === 1 ? `Millionea Week ${n} · Your ticket did not win` : `Millionea Week ${n} · Your ${mine.length} tickets did not win`;
      await letterStep(r, bell, read, week.id, userId, {
        tag: "millionea-result", money: false,
        send: (metadata) => LETTERS.send(userId, (email, reader) => ({ to: email, subject, html: millioneaNotWonHtml(lostArgs(reader.onBreak)), tag: "millionea-result", metadata }), { confirmedOnly: true, breakAware: true }),
      });
    }
    await recordMoneyRun(week, r);
  });
}

/**
 * The week void's refund, to every holder — after the bulk refund's one transaction committed (`refundVoidedWeek`). A week
 * whose refunds have not landed has nothing to tell yet, and records nothing: the refund's own commit sends it.
 */
export function noticeWeekRefunded(weekId: string): Promise<NoticeRun> {
  return launchOnce("refund", weekId, async (r, keep) => {
    const week = await weekStore.get(weekId);
    const price = week ? priceOf(week) : null;
    if (!week || week.state !== "VOIDED" || price === null) return;
    const refunded = await ticketStore.listForWeek(week.id, { status: "REFUNDED" });
    if (refunded.length === 0) return;
    const n = eatWeekNumberOf(week.code);
    const holders = [...byHolder(refunded)];
    const read = await letterRecords(week.id, "refund", holders.map(([userId]) => userId));
    for (const [userId, mine] of holders) {
      if (!(await keep())) return;
      if ((await accountOf(userId)).missing) { never(r, "no_account"); continue; }
      const refundedTzs = mine.length * price;
      const bell = await once(r, userId, { notice: "refund", weekCode: week.code }, () => notifyMillioneaWeekRefunded(userId, {
        weekCode: week.code, tickets: mine.length, refundedTzs,
      }));
      const refundArgs = { weekNumber: n, serials: mine.map((t) => t.serial), refundedTzs };
      const subject = `Millionea Week ${n} voided · ${formatTzs(refundedTzs)} refunded`;
      await letterStep(r, bell, read, week.id, userId, {
        tag: "millionea-refund", money: true,
        send: (metadata) => LETTERS.send(userId, (email) => ({ to: email, subject, html: millioneaWeekRefundedHtml(refundArgs), tag: "millionea-refund", metadata }), { confirmedOnly: true }),
      });
    }
    await recordMoneyRun(week, r);
  });
}

// ── THE RECONCILE (MB-93: nothing a stopped run left unsent stays unsent) ─────────────────────────────────

/** How far back the reconcile looks: a week settled or refunded inside this window whose last record is not complete. */
export const NOTICE_RECONCILE_DAYS = 14;
/** A week is re-run at most this often per process, so a hold that cannot clear yet is asked again an hour on, not a tick. */
export const NOTICE_RECONCILE_EVERY_MS = 60 * 60_000;

/** What one reconcile pass did: the weeks it read, the runs it made, and those another process's lease kept from telling. */
export type NoticeReconcileReport = { considered: number; reran: number; skipped: number };

/**
 * ⭐ RE-RUN WHAT A STOPPED RUN LEFT (MB-93) — a deploy mid-run, a bell write that failed, a letter that failed, a winner's SMS
 * held for the credit. Every week settled or refunded in the last `NOTICE_RECONCILE_DAYS` whose newest record is not
 * complete is run again: each part is keyed, so only what is missing goes (no bell twice, no SMS twice, a letter only where
 * its own record says it is owed). ⭐ A result week with NO run record yet has its float compared FIRST, as the
 * settlement's own run does (MB-11, round 3 A9; round 4, L2: once — a week whose run recorded was compared then; round 5:
 * by the process that holds the week's lease, once that lease is held). ⭐ A run
 * another process's lease kept from telling the week is NOT counted as reconciled: the next tick tries it again, so a
 * deploy's overlap delays nothing by an hour (round 4, M5). The tick launches it after its own work
 * (`maswali-scheduler.ts`), so the lifecycle's five-minute heal runs it too, and the heal CLI runs it at once. Concurrent
 * callers share one pass; never rejects.
 */
export function reconcileMillioneaNotices(
  now: Date = new Date(),
  opts: { force?: boolean; readFloat?: () => Promise<{ balance: number } | null> } = {},
): Promise<NoticeReconcileReport> {
  const going = globalThis.__50PICK_MLN_RECONCILING;
  if (going) return going;
  const run = (async (): Promise<NoticeReconcileReport> => {
    const out: NoticeReconcileReport = { considered: 0, reran: 0, skipped: 0 };
    const since = now.getTime() - NOTICE_RECONCILE_DAYS * DAY_MS;
    const marks = (globalThis.__50PICK_MLN_RECONCILED ??= new Map<string, number>());
    let due: Array<{ week: StoredWeek; notice: "result" | "refund" }>;
    try {
      due = [
        ...(await weekStore.list({ states: ["SETTLED"] })).filter((w) => !!w.settledAt && Date.parse(w.settledAt) >= since).map((week) => ({ week, notice: "result" as const })),
        ...(await weekStore.list({ states: ["VOIDED"] })).filter((w) => Date.parse(w.updatedAt) >= since).map((week) => ({ week, notice: "refund" as const })),
      ];
    } catch (err) {
      console.error("[maswali-notify] the reconcile could not list the weeks:", (err as Error)?.message ?? err);
      return out;
    }
    for (const { week, notice } of due) {
      out.considered++;
      const key = `${notice}:${week.id}`;
      if (!opts.force && now.getTime() - (marks.get(key) ?? Number.NEGATIVE_INFINITY) < NOTICE_RECONCILE_EVERY_MS) continue;
      const last = await lastRunRecord(week.id, notice);
      if (last?.complete === true) continue;
      marks.set(key, now.getTime());
      let ran: NoticeRun;
      if (notice === "result") {
        const floatFirst = () => import("./maswali-settlement")
          .then((m) => m.floatCheck({ weekId: week.id, code: week.code, paid: week.paidTotal ?? 0 }, opts.readFloat));
        ran = await noticeWeekSettled(week.id, last === null ? { first: floatFirst } : {});
      } else {
        ran = await noticeWeekRefunded(week.id);
      }
      if (ran.skipped !== null) {
        marks.delete(key);
        out.skipped++;
        continue;
      }
      out.reran++;
    }
    return out;
  })().catch((err): NoticeReconcileReport => {
    console.error("[maswali-notify] the reconcile stopped:", (err as Error)?.message ?? err);
    return { considered: 0, reran: 0, skipped: 0 };
  }).finally(() => { if (globalThis.__50PICK_MLN_RECONCILING === run) globalThis.__50PICK_MLN_RECONCILING = undefined; });
  globalThis.__50PICK_MLN_RECONCILING = run;
  return run;
}
