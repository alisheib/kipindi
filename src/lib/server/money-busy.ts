/**
 * U43y · MONEY FIRST — the ONE busy signal a marketing send reads before it claims anyone (ENGINE-SPEC §4.11, E12).
 *
 * The campaign slice (U43b) WAITS while the platform does money work: bets queued at admission, or admission at its
 * ceiling; a lifecycle pass; the deposit/payout poll; a market fire; an Up & Down chain fire. This module answers that
 * one question, and nothing else — the send window and the OTP-failure wait are the slice's own checks.
 *
 * ⛔ WHY A globalThis SIGNAL AND NOT `lifecycleTickerHealth()`. The money chores keep their busy flags in module-scope
 * `let`s — `running` and `depositPolling` in `lifecycle.ts`, `firesInFlight` in `market-scheduler.ts`, `inFlight` in
 * `updown-scheduler.ts` — and Next.js hands instrumentation, route handlers and server actions DIFFERENT module
 * instances (the rbac lesson, `a986dd58`). The ticker runs in instrumentation's instance; a campaign step runs in a
 * server action's, where those flags read "idle" for ever (ENGINE-SPEC F3). So each flip is MIRRORED, one line beside
 * it, onto `globalThis.__50PICK_MONEY_CHORES` — the house's process-wide idiom (`__50PICK_ADMISSION`, `__50PICK_RBAC`,
 * the email outbox) — and this module reads that, plus `admissionSnapshot()`, which is pinned on globalThis already.
 *
 * ⛔ THREE WRITERS, AND THIS FILE IS NOT ONE OF THEM. `lifecycle.ts` (the lifecycle pass, the deposit/payout poll),
 * `market-scheduler.ts` (the market fire gate) and `updown-scheduler.ts` (the Up & Down chain gate) write the signal.
 * Each mirror is one `try … catch` statement that awaits nothing and cannot throw, so no mirror can stop a pass, leak a
 * slot or strand a waiter. The writers write globalThis directly and import nothing from here: a money path never
 * depends on the marketing side, and a fault in this file can never stop one loading. This file imports no writer and
 * never creates, writes, freezes or reorders the signal — it copies what it reads. `test:money-busy` pins all of it: a
 * further file naming the signal, a mirror removed, moved off its flip or out of its `finally`, a mirror that could
 * throw, or a reader that changes what it reads, each fails the suite.
 *
 * ⛔ THE SIGNAL'S TYPE LIVES IN `money-chores.d.ts`, NOT HERE (U43Y-MPS-1). The writers import nothing, so a TypeScript
 * program that loads a writer but not this file — `tsconfig.backup.json`'s reaches `market-scheduler.ts` through the
 * backup watchdog's imports — must still find the global declared. A declaration-only file with no import can join any
 * program alone; `test:money-busy` §Y6.5 holds every tsconfig at the repository root to seeing it.
 *
 * ⛔ A CHORE FLAG OLDER THAN TEN MINUTES IS IGNORED, and reported as `stale` — the spec's trade-off (§4.11 D2): a pass
 * that died outside its `finally`, or an await that never settles, must not hold marketing off for ever. ⚠️ STALE MEANS
 * "TOO OLD TO TRUST", NOT "CRASHED". A chore CAN legitimately run past ten minutes — the nightly trial balance or a
 * retention purge on a large book, a long Up & Down heal (it pays stakes out inside the pass), a resolve fire waiting
 * on its AI check — and from minute ten marketing goes on beside it. That is accepted, not prevented: the slice holds
 * at most one pooled connection at a time (E12), and a pass that long already raises `lifecycle.ticker_overrun`. A flag
 * dated more than ten minutes AHEAD is ignored the same way, so a clock step cannot hold marketing off either.
 *
 * ⛔ FIRES ARE LISTS OF STARTS — one per fire in flight, each judged on its own. `armMarket` also runs inside server
 * actions (resolution, objections, market create), so more than one module instance of the market scheduler fires,
 * each with its own `firesInFlight`; a copy of one instance's count would let another instance's release read "idle"
 * while the first still settles. So each acquire pushes its own start and its release removes THAT start — never the
 * oldest (U43Y-MPS-2), or a fire that never finishes would be re-dated by every fire after it and never go stale. A
 * list's length is the process-wide count; marketing waits while ANY start is fresh, and every start too old, too far
 * ahead or unreadable is ignored and listed in `stale`. The Up & Down chain gate keeps its own list the same way.
 *
 * ⚠️ UP & DOWN TODAY (E-67): every chain is STOPPED by design and an officer generates each round by hand. Those rounds
 * close and settle in `healStuckRounds`, INSIDE the lifecycle pass, so the lifecycle flag already covers them. The chain
 * gate's list covers the other road: a chain an officer sets RUNNING settles its rounds through that gate, exactly as
 * market fires settle through theirs (U43Y-SM-01).
 *
 * ⚠️ WHAT `busy: false` DOES NOT PROMISE — the slice must not read more into it than this:
 *   · it trusts the CALLER'S CLOCK (U43Y-SM-03). The flags are stamped by this process's `Date.now()`, and
 *     `moneyBusy(nowMs)` judges them against whatever `nowMs` it is handed. Call it with no argument, or with the plain
 *     `Date.now()`. An EAT-shifted time, seconds instead of milliseconds, a frozen test clock or NaN turns every live
 *     chore "stale" and the verdict "not busy" — only `stale` would show it.
 *   · bets in flight UNDER the ceiling are not busy (U43Y-SM-04). Busy means a bet is QUEUED, or every admission slot is
 *     taken — the spec's line ("in-flight ≥ its ceiling"). One bet short of the ceiling reads "not busy", where the
 *     house-bot engine's claim gate already stops at HALF the ceiling. A lead's decision, not a defect: a
 *     one-expression change in `decideMoneyBusy` if marketing should yield as early as the house bots do.
 *   · money moved outside the mirrored paths is not seen (U43Y-SM-05): an officer pressing Settle on the admin
 *     settlement page (it calls `settleMarket` directly, outside the fire gate), an officer voiding an Up & Down round
 *     (`voidRoundByOperator`, the same, outside any gate), the one-time boot refund repair (`repairOrphanedPositions`,
 *     started before the first pass), and the payment webhooks crediting deposits. E12 names the bets, the pass, the
 *     poll and the market fire; the Up & Down chain gate was added in U43y's review.
 *
 * Per PROCESS, by design: two containers each yield to their own chores, each with its own connection pool — the same
 * scope as the slice's single-flight (E10). Readers: U43b's slice (`waiting money_busy`); U44's pump when it comes
 * (OD20 — through this signal, never `lifecycleTickerHealth()`).
 */
import { admissionSnapshot, type AdmissionSnapshot } from "./admission";

/** A chore flag older than this — or dated further ahead — is ignored and reported `stale` (ENGINE-SPEC §4.11 D2). */
export const MONEY_CHORE_STALE_MS = 10 * 60_000;

export type MoneyChore = "lifecycle" | "deposits" | "market_fires" | "updown_fires";
/** Why marketing waits — reported in this order, bets first. */
export type MoneyBusyWhy = "bets_waiting" | "admission_full" | MoneyChore;
/** The answer. `stale` lists every chore with a flag or a start set but ignored for its age, whatever the verdict. */
export type MoneyBusy =
  | { busy: false; stale: MoneyChore[] }
  | { busy: true; why: MoneyBusyWhy; stale: MoneyChore[] };

/** A sanitised COPY of the signal: a missing or malformed value reads as "not running". */
export type MoneyChoresView = {
  lifecycleSince: number;
  depositsSince: number;
  marketFires: number[];
  updownFires: number[];
};

/** What the verdict needs from admission — the same three fields the house-bot engine's claim gate reads. */
export type AdmissionView = Pick<AdmissionSnapshot, "inFlight" | "queueDepth" | "limits">;

const stampOf = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
/** A list of starts, copied; anything but a list reads as no fire in flight, an unreadable start as 0. */
const startsOf = (v: unknown): number[] => (Array.isArray(v) ? v.map(stampOf) : []);

/** Read the signal into a copy. Reads only: it never creates, writes, freezes or reorders what the writers keep. */
export function readMoneyChores(): MoneyChoresView {
  const signal = globalThis.__50PICK_MONEY_CHORES;
  return {
    lifecycleSince: stampOf(signal?.lifecycleSince),
    depositsSince: stampOf(signal?.depositsSince),
    marketFires: startsOf(signal?.marketFires),
    updownFires: startsOf(signal?.updownFires),
  };
}

/**
 * THE VERDICT, pure — the seam the tests drive; the slice calls `moneyBusy`. Busy while a bet waits at admission or
 * admission is at its ceiling, or while a chore is fresh: its flag, or ANY ONE of its fire starts, within `staleMs` of
 * `nowMs` either way. The first reason in the fixed order is reported; every chore with a flag or a start ignored for
 * its age is listed whatever the verdict, so a stale flag never hides a live one. ⚠️ `staleMs` is a test knob only:
 * 0 would ignore every chore, Infinity would never let one go.
 */
export function decideMoneyBusy(
  admission: AdmissionView,
  chores: MoneyChoresView,
  nowMs: number,
  staleMs: number = MONEY_CHORE_STALE_MS,
): MoneyBusy {
  const stale: MoneyChore[] = [];
  const within = (at: number): boolean => Math.abs(nowMs - at) <= staleMs;
  /** One flag: 0 is idle; set and fresh is busy; set and too old, or too far ahead, is ignored and said. */
  const flag = (chore: MoneyChore, since: number): boolean => {
    if (since <= 0) return false;
    if (within(since)) return true;
    stale.push(chore);
    return false;
  };
  /** A list of starts: busy while ANY start is fresh. A start too old, too far ahead or unreadable (0) is ignored and
   *  said — a fire whose start cannot be read cannot be dated — and it never hides a fresh one beside it. */
  const fires = (chore: MoneyChore, starts: readonly number[]): boolean => {
    let live = false;
    let ignored = false;
    for (const at of starts) {
      if (at > 0 && within(at)) live = true;
      else ignored = true;
    }
    if (ignored) stale.push(chore);
    return live;
  };
  const lifecycle = flag("lifecycle", chores.lifecycleSince);
  const deposits = flag("deposits", chores.depositsSince);
  const marketFires = fires("market_fires", chores.marketFires);
  const updownFires = fires("updown_fires", chores.updownFires);

  let why: MoneyBusyWhy | null = null;
  if (admission.queueDepth > 0) why = "bets_waiting";
  else if (admission.inFlight >= admission.limits.maxInFlight) why = "admission_full";
  else if (lifecycle) why = "lifecycle";
  else if (deposits) why = "deposits";
  else if (marketFires) why = "market_fires";
  else if (updownFires) why = "updown_fires";
  return why === null ? { busy: false, stale } : { busy: true, why, stale };
}

/**
 * The question U43b's slice asks before it claims anyone: is this process doing the money work above right now?
 * Call it with NO argument — the flags are stamped by this process's clock, and any other time base reads every live
 * chore as stale (see the header).
 */
export function moneyBusy(nowMs: number = Date.now()): MoneyBusy {
  return decideMoneyBusy(admissionSnapshot(), readMoneyChores(), nowMs);
}
