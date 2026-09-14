/**
 * S1 — WHAT HAPPENS TO THE BALANCE OF A PLAYER WE HAVE FINALLY REFUSED.
 *
 * ⭐ THE HOLE THIS CLOSES (docs/COMPLIANCE-DECISIONS.md 2026-09-13). From 2026-09-13 a player deposits
 * and plays BEFORE anyone checks who they are. So a refusal at identity review can land on an account
 * holding real money — and before this module the platform had no answer at all: no refund path, no
 * forfeiture path, no ledger action, no published rule. A 16-year-old who typed a false date of birth,
 * deposited, won and was refused `UNDERAGE` at cash-out would have left a balance in the wallet forever.
 *
 * ⭐ ALI'S RULING: an officer decides each case, with a recorded reason. No fixed rule. What makes that a
 * POLICY rather than a gap is the shape built here:
 *   1. a CLOSED set of four outcomes (`refused-funds-outcomes.ts`), each writing its OWN audit action;
 *   2. a mandatory typed justification, and the deciding officer is never the player;
 *   3. REAL money actions — a return goes through the ordinary payout rail (`withdraw()` with the
 *      narrowly-typed `refusedFundsReturn` option: the same exactly-once transaction, the same
 *      reconcile sweep, the same per-withdrawal cap, registered number only, no fee). ⛔ A return is
 *      NOT held for a two-officer AML review any more: that hold was switched off for every
 *      withdrawal, returns included, by the owner ruling of 2026-09-13 (`WITHDRAWAL_AML_HOLD` in
 *      payments.ts);
 *      a forfeiture is a confirmed debit posted atomically with its ledger group;
 *   4. the player is told the decision and the refusal reason (Terms §3a promises exactly that);
 *   5. ONE report an inspector can be handed (`refusedFundsReport`).
 *
 * ⛔ WHO IT APPLIES TO: an account whose verification stands REJECTED on a FINAL code (`UNDERAGE`,
 * `SANCTIONED`, `DUPLICATE_IDENTITY`). The refusal itself froze the wallet (`kyc-service.ts`). A
 * recoverable refusal is not decided here — the player can simply submit again. An account once
 * approved and later finally refused IS decided here too: its wallet is frozen like any other, and
 * nobody else can decide what happens to the money in it.
 *
 * ⛔ WHAT IT MUST NEVER DO: decide while money is in flight (a hold), return below the rail minimum,
 * return while the payout rail is not accepting requests, or move money before every precondition that
 * can be checked has been checked. The order inside a decision is fixed and commented where it happens.
 */
import { db, type StoredTxn } from "./store";
import { audit, getAuditByActionsDurable, type AuditEntry } from "./audit";
import { withdraw, forfeitRefusedBalance } from "./wallet-service";
import { getPayoutStatus, payoutsAcceptingRequests } from "./payout-status";
import { isPaymentPaused } from "./payment-ops";
import { addWalletFreeze } from "./wallet-freeze";
import { randomId } from "./crypto";
import { notifyRefusedFundsDecision, notifyRefusedFundsReturnFailed } from "./notification-service";
import { sendEmailToUser, refusedFundsDecisionHtml, refusedFundsReturnFailedHtml } from "./email";
import { WITHDRAW_MAX_TZS } from "./validators";
import { isFinalRefusal } from "@/lib/kyc-refusal";
import { currentFreezeReasons, FREEZE_REASON_LABEL } from "@/lib/wallet-freeze-reasons";
import { PROVIDER_MIN_PAYOUT_TZS } from "@/lib/payout";
import { normalizeTzLocalDigits } from "@/lib/phone-normalize";
import {
  REFUSED_FUNDS_ACTION,
  REFUSED_FUNDS_OUTCOMES,
  RETURNS_MONEY,
  REFUSED_FUNDS_JUSTIFICATION_MIN,
  REFUSED_FUNDS_JUSTIFICATION_MAX,
  REFUSED_FUNDS_FORFEIT_DESCRIPTION,
  isRefusedFundsOutcome,
  isReturnProvider,
  type RefusedFundsOutcome,
  type ReturnProvider,
} from "@/lib/refused-funds-outcomes";

/** The player-safe sentence for each final code — the reason the player is WRITTEN (never the officer's note). */
const PLAYER_REASON: Record<string, string> = {
  UNDERAGE: "You must be 18 or older to use 50pick.",
  SANCTIONED: "We're unable to verify this identity.",
  DUPLICATE_IDENTITY: "This identity is already registered to another account.",
};
/** ⭐ The same reason in Swahili — the letter's Swahili half used to say only "we could not verify you" (audit session 95). */
const PLAYER_REASON_SW: Record<string, string> = {
  UNDERAGE: "Lazima uwe na umri wa miaka 18 au zaidi kutumia 50pick.",
  SANCTIONED: "Hatuwezi kuthibitisha utambulisho huu.",
  DUPLICATE_IDENTITY: "Utambulisho huu tayari umesajiliwa kwenye akaunti nyingine.",
};

type Availability = { allowed: boolean; why: string | null; returnTzs: number; forfeitTzs: number };

export type RefusedFundsPosition = {
  userId: string;
  /** May an officer take a decision on this account at all? */
  eligible: boolean;
  /** Officer-facing reason when not eligible. */
  whyNot: string | null;
  kycId: string | null;
  kycStatus: string | null;
  rejectReason: string | null;
  walletStatus: "ACTIVE" | "FROZEN" | "CLOSED" | null;
  walletHolds: string[];
  balance: number;
  hold: number;
  bonusBalance: number;
  /** Σ confirmed deposits, gross. */
  confirmedDeposits: number;
  /** Σ withdrawals that have left or are leaving (CONFIRMED / PROCESSING / AML_REVIEW). */
  paidOut: number;
  /** min(balance, max(0, deposits − paid out)) — what "return the deposits" would send. */
  returnableDeposits: number;
  /** Network of the most recent confirmed mobile-money deposit — the form's default for a return. */
  lastDepositProvider: ReturnProvider | null;
  payoutsOpen: boolean;
  minPayout: number;
  /** Σ earlier refused-funds forfeits on this account — they count against "what the player paid in". */
  forfeitedBefore: number;
  /** Freeze reasons OTHER than IDENTITY_REFUSED. While any stands, every money outcome is unavailable. */
  blockingHolds: string[];
  /** Open bets still settling into this wallet — null while the store has no per-user reader. */
  openPositions: { count: number; stakedTzs: number } | null;
  outcomes: Record<RefusedFundsOutcome, Availability>;
};

function moneyFacts(txns: StoredTxn[]) {
  const confirmedDeposits = txns
    .filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const paidOut = txns
    .filter((t) => t.type === "WITHDRAWAL" && (t.status === "CONFIRMED" || t.status === "PROCESSING" || t.status === "AML_REVIEW"))
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const lastMobileMoney = txns
    .filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED" && isReturnProvider(t.provider))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    confirmedDeposits,
    paidOut,
    lastDepositProvider: lastMobileMoney && isReturnProvider(lastMobileMoney.provider) ? lastMobileMoney.provider : null,
  };
}

const NONE: Availability = { allowed: false, why: null, returnTzs: 0, forfeitTzs: 0 };

/**
 * Everything an officer needs to decide, read fresh, with each outcome's availability AND the reason
 * when it is not available — so the case page offers no choice the server would refuse.
 */
export async function refusedFundsPosition(userId: string): Promise<RefusedFundsPosition> {
  const [k, w, txns, payouts] = await Promise.all([
    db.kyc.findByUserId(userId),
    db.wallet.findByUserId(userId),
    db.txn.listForUser(userId),
    getPayoutStatus(),
  ]);
  const facts = moneyFacts(txns);
  const balance = w?.balance ?? 0;
  const hold = w?.hold ?? 0;
  const payoutsOpen = payoutsAcceptingRequests(payouts.status);
  // ⛔ EARLIER FORFEITS COUNT AGAINST "WHAT THE PLAYER PAID IN" (audit session 95, 2026-09-13). An open bet that settles
  // into the frozen wallet after a FORFEIT re-opens the case; without this, "return the deposits" offered the
  // winnings as deposits that had already been forfeited.
  const forfeitedBefore = txns
    .filter((t) => t.type === "ADJUSTMENT_DEBIT" && t.status === "CONFIRMED" && t.description === REFUSED_FUNDS_FORFEIT_DESCRIPTION)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const returnableDeposits = Math.min(balance, Math.max(0, facts.confirmedDeposits - facts.paidOut - forfeitedBefore));
  // ⛔ ANY OTHER HOLD BLOCKS EVERY MONEY OUTCOME (audit session 95). The refused-funds exception pays out of a wallet the
  // IDENTITY refusal froze — never through an officer's own hold ("do not pay") or a self-exclusion. The officer lifts
  // that hold first, on its own control, where it is recorded.
  const blockingHolds = w ? currentFreezeReasons(w).filter((r) => r !== "IDENTITY_REFUSED") : [];

  const base = {
    userId,
    kycId: k?.id ?? null,
    kycStatus: k?.status ?? null,
    rejectReason: k?.rejectReason ?? null,
    walletStatus: w?.status ?? null,
    walletHolds: w ? currentFreezeReasons(w) : [],
    balance,
    hold,
    bonusBalance: w?.bonusBalance ?? 0,
    confirmedDeposits: facts.confirmedDeposits,
    paidOut: facts.paidOut,
    returnableDeposits,
    lastDepositProvider: facts.lastDepositProvider,
    payoutsOpen,
    minPayout: PROVIDER_MIN_PAYOUT_TZS,
    forfeitedBefore,
    blockingHolds,
    // ⚠️ Not read yet: the store has no per-user open-position reader. Stays null (the case page renders it only when
    // known) until one exists — recorded in LIVE-QA §6b session 95 rather than guessed from bet transactions.
    openPositions: null,
  };
  const closedOutcomes = { RETURN_DEPOSITS: NONE, RETURN_BALANCE: NONE, HOLD_PENDING_APPEAL: NONE, FORFEIT: NONE };

  if (!k || k.status !== "REJECTED" || !isFinalRefusal(k.rejectReason)) {
    return {
      ...base, eligible: false, outcomes: closedOutcomes,
      whyNot: "Only a verification refused on a FINAL code (under 18, sanctions, duplicate identity) has a balance to decide here. A recoverable refusal is resubmitted by the player.",
    };
  }
  if (!w) return { ...base, eligible: false, outcomes: closedOutcomes, whyNot: "This player has no wallet." };
  if (w.status === "CLOSED") return { ...base, eligible: false, outcomes: closedOutcomes, whyNot: "The wallet is closed." };

  // The preconditions every money outcome shares.
  const moneyBlock =
    blockingHolds.length > 0 ? `This wallet is also held for: ${blockingHolds.map((r) => FREEZE_REASON_LABEL[r]).join(", ")}. No money can move on this case until that hold is lifted on its own control.`
    : hold > 0 ? `A payout of ${hold.toLocaleString("en")} TZS is already in flight. Wait for it to settle, then decide.`
    : balance <= 0 ? "There is no withdrawable balance to decide."
    : null;
  // ⛔ A RETURN ABOVE THE PER-WITHDRAWAL CAP IS REFUSED HERE, BEFORE THE FORFEIT (audit session 95, 2026-09-13).
  // `withdraw()` enforces `WITHDRAW_MAX_TZS` only AFTER step 3's forfeit has committed, so RETURN_DEPOSITS on 6,000,000
  // forfeited the remainder and then failed — money moved on a decision that could never be carried out.
  const overCap = (n: number) => `TZS ${n.toLocaleString("en")} is above the per-withdrawal maximum of TZS ${WITHDRAW_MAX_TZS.toLocaleString("en")}. A return is one withdrawal, and no split return has been ruled — hold the balance and escalate.`;
  const railBlock = payoutsOpen ? null : "The payout rail is not accepting requests right now, so nothing can be sent.";
  const belowMin = (n: number) => `TZS ${n.toLocaleString("en")} is below the smallest amount the payout rail can send (TZS ${PROVIDER_MIN_PAYOUT_TZS.toLocaleString("en")}).`;

  const returnDeposits: Availability = (() => {
    if (moneyBlock) return { allowed: false, why: moneyBlock, returnTzs: 0, forfeitTzs: 0 };
    if (returnableDeposits <= 0) return { allowed: false, why: "Nothing the player paid in is left to return — every deposit is accounted for by earlier payouts or forfeits.", returnTzs: 0, forfeitTzs: 0 };
    if (railBlock) return { allowed: false, why: railBlock, returnTzs: returnableDeposits, forfeitTzs: balance - returnableDeposits };
    if (returnableDeposits < PROVIDER_MIN_PAYOUT_TZS) return { allowed: false, why: belowMin(returnableDeposits), returnTzs: returnableDeposits, forfeitTzs: balance - returnableDeposits };
    if (returnableDeposits > WITHDRAW_MAX_TZS) return { allowed: false, why: overCap(returnableDeposits), returnTzs: returnableDeposits, forfeitTzs: balance - returnableDeposits };
    return { allowed: true, why: null, returnTzs: returnableDeposits, forfeitTzs: balance - returnableDeposits };
  })();
  const returnBalance: Availability = (() => {
    if (moneyBlock) return { allowed: false, why: moneyBlock, returnTzs: 0, forfeitTzs: 0 };
    if (railBlock) return { allowed: false, why: railBlock, returnTzs: balance, forfeitTzs: 0 };
    if (balance < PROVIDER_MIN_PAYOUT_TZS) return { allowed: false, why: belowMin(balance), returnTzs: balance, forfeitTzs: 0 };
    if (balance > WITHDRAW_MAX_TZS) return { allowed: false, why: overCap(balance), returnTzs: balance, forfeitTzs: 0 };
    return { allowed: true, why: null, returnTzs: balance, forfeitTzs: 0 };
  })();
  const forfeit: Availability = moneyBlock
    ? { allowed: false, why: moneyBlock, returnTzs: 0, forfeitTzs: 0 }
    : { allowed: true, why: null, returnTzs: 0, forfeitTzs: balance };
  const holdOutcome: Availability = { allowed: true, why: null, returnTzs: 0, forfeitTzs: 0 };

  return {
    ...base,
    eligible: true,
    whyNot: null,
    outcomes: { RETURN_DEPOSITS: returnDeposits, RETURN_BALANCE: returnBalance, HOLD_PENDING_APPEAL: holdOutcome, FORFEIT: forfeit },
  };
}

export type RefusedFundsDecision =
  | {
      ok: true;
      decisionId: string;
      outcome: RefusedFundsOutcome;
      returnedTzs: number;
      forfeitedTzs: number;
      payoutTxnId: string | null;
      payoutStatus: string | null;
      /** Set when a return's payout did not start. The decision and any forfeiture stand; the rest of
       *  the balance stays frozen for the officer to decide again. */
      payoutError: string | null;
    }
  | { ok: false; error: string };

/**
 * Carry out an officer's decision about a finally-refused player's balance.
 *
 * ⛔ THE ORDER IS THE CONTRACT:
 *   1. every precondition that can be checked is checked, on a fresh read, before any money moves;
 *   2. the identity-refusal hold is confirmed on the wallet (a refusal written before 2026-09-13 has none);
 *   3. a forfeiture (FORFEIT, or the remainder of RETURN_DEPOSITS) commits atomically FIRST — if it
 *      fails, nothing has moved and the decision is refused;
 *   4. then the return payout is dispatched through `withdraw()`;
 *   5. then the decision is written, AWAITED, under its own audit action, whatever step 4 returned;
 *   6. then — only if everything was carried out — the player is told.
 *
 * 🔴 DELIBERATELY NOT WRAPPED IN A LOCK — and the first draft was, which would have been a money defect.
 * `withLock` JOINS a nested lock onto the OUTER transaction (`locks.ts`): wrapping this function in
 * `withLock("refused-funds:…")` would have made `forfeitRefusedBalance`'s money transaction and
 * `withdraw()`'s hold and PROCESSING row commit only when THIS function returned — with the gateway
 * dispatch in between, inside one open database transaction against a 30-second timeout. A throw after
 * the dispatch would have rolled back the record of a payout that had already left. That is the
 * stranded-money shape `withdraw()`'s own header documents, reintroduced by a "safety" lock.
 * ⭐ Two officers deciding at once are made safe by the WALLET's own atomic guards instead: the
 * forfeiture is a COMPARE-AND-SWAP under the wallet lock — it refuses unless the balance still equals
 * the `pos.balance` this decision was computed on (an overdraw guard alone let the same case forfeit
 * twice) — and the return is `withdraw()` with `requireBalanceGte` and a per-decision idempotency key.
 * The loser of such a race is refused, or records a payout that did not start — never a second movement
 * of the same shillings.
 */
export async function decideRefusedFunds(input: {
  officerId: string;
  userId: string;
  outcome: string;
  justification: string;
  provider?: string | null;
}): Promise<RefusedFundsDecision> {
  const { officerId, userId } = input;
  if (!userId) return { ok: false, error: "Missing player." };
  if (officerId === userId) {
    audit({ category: "SECURITY", action: "kyc.refused_funds.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: "You cannot decide about your own balance." };
  }
  if (!isRefusedFundsOutcome(input.outcome)) return { ok: false, error: `Choose one of: ${REFUSED_FUNDS_OUTCOMES.join(", ")}.` };
  const outcome = input.outcome;
  const justification = (input.justification ?? "").trim().slice(0, REFUSED_FUNDS_JUSTIFICATION_MAX);
  if (justification.length < REFUSED_FUNDS_JUSTIFICATION_MIN) {
    return { ok: false, error: `A written justification of at least ${REFUSED_FUNDS_JUSTIFICATION_MIN} characters is required.` };
  }
  const provider = RETURNS_MONEY.has(outcome) ? input.provider : null;
  if (RETURNS_MONEY.has(outcome) && !isReturnProvider(provider)) {
    return { ok: false, error: "Choose the mobile-money network the money should be returned on." };
  }
  // ⛔ A PAUSED NETWORK IS REFUSED BEFORE ANYTHING MOVES (found in review, 2026-09-13). `withdraw()` checks the
  // per-network kill-switch only AFTER step 3's forfeit has committed, so a return on a paused network forfeited
  // the remainder and then failed — money moved on a decision that could not be carried out.
  if (RETURNS_MONEY.has(outcome) && (await isPaymentPaused(provider as string, "withdrawals"))) {
    return { ok: false, error: "Withdrawals on that network are paused right now, so nothing was decided. Choose another network, or decide once it is back." };
  }

  {
    // ── 1 · fresh preconditions ───────────────────────────────────────────────
    const pos = await refusedFundsPosition(userId);
    if (!pos.eligible) return { ok: false, error: pos.whyNot ?? "This account has no balance decision to take." };
    const avail = pos.outcomes[outcome];
    if (!avail.allowed) return { ok: false, error: avail.why ?? "That outcome is not available for this account." };
    const user = await db.user.findById(userId);
    if (!user) return { ok: false, error: "Player not found." };

    // ── 2 · the freeze must be standing ─────────────────────────────────────────
    if (!pos.walletHolds.includes("IDENTITY_REFUSED")) {
      const f = await addWalletFreeze(userId, "IDENTITY_REFUSED", { actorId: officerId, note: `identity refused · ${pos.rejectReason}`, ref: { kycId: pos.kycId, via: "refused-funds" } });
      if (!f.ok) return { ok: false, error: `The wallet could not be frozen, so nothing was decided: ${f.error}` };
    }

    const decisionId = `rfd_${randomId(10)}`;
    let forfeitedTzs = 0;
    let forfeitTxnId: string | null = null;

    // ── 3 · forfeiture first, atomically ────────────────────────────────────────
    if (avail.forfeitTzs > 0) {
      // expectBalanceTzs: the forfeit refuses if the balance moved since `pos` was read — the only thing
      // that stops two officers deciding the same case at once from forfeiting it twice.
      const f = await forfeitRefusedBalance({ userId, officerId, amountTzs: avail.forfeitTzs, decisionRef: decisionId, note: justification, expectBalanceTzs: pos.balance });
      if (!f.ok) return { ok: false, error: f.error };
      forfeitedTzs = avail.forfeitTzs;
      forfeitTxnId = f.txnId;
    }

    // ── 4 · the return payout ───────────────────────────────────────────────────
    let payoutTxnId: string | null = null;
    let payoutStatus: string | null = null;
    let payoutError: string | null = null;
    let returnedTzs = 0;
    if (RETURNS_MONEY.has(outcome) && avail.returnTzs > 0) {
      // ⛔ A THROW HERE MUST NOT ESCAPE. The forfeit above has already COMMITTED; an exception that
      // skipped step 5 would leave money forfeited with no decision row, invisible to the report.
      try {
        const r = await withdraw(
          userId,
          { provider: provider as ReturnProvider, amount: avail.returnTzs, msisdn: normalizeTzLocalDigits(user.phoneE164) },
          `rfd:${decisionId}`,
          officerId,
          { refusedFundsReturn: { decisionId } },
        );
        if (r.ok && r.data) {
          payoutTxnId = r.data.txnId;
          payoutStatus = r.data.status;
          returnedTzs = avail.returnTzs;
        } else {
          payoutError = r.ok ? "The payout returned no transaction." : r.error;
        }
      } catch (err) {
        payoutError = `The payout failed: ${err instanceof Error ? err.message : String(err)}`.slice(0, 300);
      }
    }

    // ── 5 · the decision, under its own action, whatever happened above ─────────
    await audit({
      category: "COMPLIANCE",
      action: REFUSED_FUNDS_ACTION[outcome],
      actorId: officerId,
      targetType: "User",
      targetId: userId,
      payload: {
        decisionId,
        outcome,
        justification,
        kycId: pos.kycId,
        rejectCode: pos.rejectReason,
        balanceBefore: pos.balance,
        confirmedDeposits: pos.confirmedDeposits,
        paidOutBefore: pos.paidOut,
        returnableDeposits: pos.returnableDeposits,
        intendedReturnTzs: RETURNS_MONEY.has(outcome) ? avail.returnTzs : 0,
        returnedTzs,
        forfeitedTzs,
        forfeitTxnId,
        payoutTxnId,
        payoutStatus,
        payoutError,
        provider: provider ?? null,
        // The holds standing when this was decided — so the record itself shows no other hold was paid through.
        walletHolds: pos.walletHolds,
        instruction: "Owner ruling 2026-09-13 · an officer decides a finally-refused player's balance case by case, with a recorded reason",
      },
    });

    // ── 6 · the player is told ──────────────────────────────────────────────────────
    if (!payoutError) {
      const facts = { outcome, returnedTzs, forfeitedTzs, balanceTzs: pos.balance };
      notifyRefusedFundsDecision(userId, facts).catch(() => {});
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: outcome === "HOLD_PENDING_APPEAL" ? "Your balance is held · Salio lako limeshikiliwa" : "Decision on your balance · Uamuzi kuhusu salio lako",
        html: refusedFundsDecisionHtml({
          ...facts,
          reason: PLAYER_REASON[pos.rejectReason ?? ""] ?? "We're unable to verify this identity.",
          // ⭐ The Swahili half of the letter carries the reason too — Terms §3a promises it in every language (audit session 95).
          reasonSw: PLAYER_REASON_SW[pos.rejectReason ?? ""] ?? PLAYER_REASON_SW.SANCTIONED,
          reference: decisionId,
        }),
        tag: "kyc-refused-funds",
      })).catch(() => {});
    } else if (forfeitedTzs > 0) {
      // ⛔ MONEY MOVED, SO THE PLAYER IS WRITTEN TO (audit session 95, 2026-09-13). The forfeit committed and the return did
      // not start; this path used to send nothing at all, while Terms §3a promises the player a written decision. They are
      // told what was kept and that the return did not go through — and the officer's next decision writes again.
      Promise.resolve(notifyRefusedFundsReturnFailed(userId, { amountTzs: avail.returnTzs, forfeitedTzs })).catch(() => {});
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: "Your return did not go through · Kurudisha pesa hakukufanikiwa",
        html: refusedFundsReturnFailedHtml({ amountTzs: avail.returnTzs, forfeitedTzs, reference: decisionId }),
        tag: "kyc-refused-funds",
      })).catch(() => {});
    }

    return { ok: true, decisionId, outcome, returnedTzs, forfeitedTzs, payoutTxnId, payoutStatus, payoutError };
  }
}

// ── THE REPORT AN INSPECTOR CAN BE HANDED ───────────────────────────────────────

export type RefusedFundsDecisionRow = {
  at: string;
  decisionId: string | null;
  outcome: RefusedFundsOutcome | null;
  officerId: string | null;
  userId: string | null;
  justification: string;
  rejectCode: string | null;
  balanceBefore: number | null;
  returnedTzs: number;
  forfeitedTzs: number;
  payoutTxnId: string | null;
  /** The payout's status AT DECISION TIME, as recorded in the audit row. Never the truth about where the money is now. */
  payoutStatus: string | null;
  payoutError: string | null;
  /**
   * ⭐ The payout transaction's status NOW (audit session 95, 2026-09-13). A return used to count as "returned" the moment
   * it was dispatched — PROCESSING — and a later FAILED verdict put the money back in the frozen wallet while the report
   * kept adding it to "Returned to players". null when there was no payout or it could not be read.
   */
  payoutTxnStatusNow: string | null;
  /** `returnedTzs` only once the payout CONFIRMED. */
  returnSettledTzs: number;
  /** `returnedTzs` while the payout is still in flight. */
  returnInFlightTzs: number;
  entryHash: string | null;
};

/** Where a finally-refused account's money stands — what the officer must do next. */
export type RefusedCaseState = "undecided" | "on_hold" | "return_in_flight" | "return_failed" | "settled";

export type RefusedAccountRow = {
  userId: string;
  kycId: string;
  rejectCode: string;
  /** null when the report was read WITHOUT money rights (`refusedFundsReport({ money: false })`) — no wallet was read. */
  balance: number | null;
  hold: number | null;
  walletStatus: "ACTIVE" | "FROZEN" | "CLOSED" | null;
  lastDecision: RefusedFundsDecisionRow | null;
  /** A withdrawable balance is still in the wallet — no decision taken yet, a hold, or a return whose payout failed. null without money rights. */
  open: boolean | null;
  /** null without money rights. */
  state: RefusedCaseState | null;
};

const OUTCOME_BY_ACTION = new Map(Object.entries(REFUSED_FUNDS_ACTION).map(([o, a]) => [a, o as RefusedFundsOutcome]));

function num(x: unknown): number { return typeof x === "number" && Number.isFinite(x) ? x : 0; }
function str(x: unknown): string | null { return typeof x === "string" ? x : null; }

export function toDecisionRow(e: AuditEntry): RefusedFundsDecisionRow {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  return {
    at: e.createdAt,
    decisionId: str(p.decisionId),
    outcome: OUTCOME_BY_ACTION.get(e.action) ?? null,
    officerId: e.actorId ?? null,
    userId: e.targetId ?? null,
    justification: str(p.justification) ?? "",
    rejectCode: str(p.rejectCode),
    balanceBefore: typeof p.balanceBefore === "number" ? p.balanceBefore : null,
    returnedTzs: num(p.returnedTzs),
    forfeitedTzs: num(p.forfeitedTzs),
    payoutTxnId: str(p.payoutTxnId),
    payoutStatus: str(p.payoutStatus),
    payoutError: str(p.payoutError),
    // Filled by `withPayoutNow` from the payout transaction itself — an audit row cannot know how its payout ended.
    payoutTxnStatusNow: null,
    returnSettledTzs: 0,
    returnInFlightTzs: 0,
    entryHash: e.entryHash ?? null,
  };
}

/**
 * ⭐ WHERE EACH RETURN ENDED, read from the payout transaction NOW (audit session 95, 2026-09-13). The decision row is
 * immutable and records the status at dispatch; only the transaction knows whether the money arrived, is still in
 * flight, or came back. A read that fails leaves the row "unknown" (null) — never "returned".
 */
export async function withPayoutNow(rows: RefusedFundsDecisionRow[]): Promise<RefusedFundsDecisionRow[]> {
  const statusById = new Map<string, string | null>();
  for (const id of new Set(rows.map((r) => r.payoutTxnId).filter((x): x is string => !!x))) {
    try { statusById.set(id, (await db.txn.findById(id))?.status ?? null); } catch { statusById.set(id, null); }
  }
  return rows.map((r) => {
    const now = r.payoutTxnId ? statusById.get(r.payoutTxnId) ?? null : null;
    const inFlight = now === "PROCESSING" || now === "PENDING" || now === "AML_REVIEW";
    return { ...r, payoutTxnStatusNow: now, returnSettledTzs: now === "CONFIRMED" ? r.returnedTzs : 0, returnInFlightTzs: inFlight ? r.returnedTzs : 0 };
  });
}

/** Where a finally-refused account's money stands, from the wallet and the last decision. */
function caseState(balance: number, hold: number, last: RefusedFundsDecisionRow | null): RefusedCaseState {
  if (hold > 0) return "return_in_flight";
  if (balance <= 0) return "settled";
  if (!last) return "undecided";
  if (last.outcome === "HOLD_PENDING_APPEAL") return "on_hold";
  if (last.payoutError || last.payoutTxnStatusNow === "FAILED") return "return_failed";
  // Money back in the wallet after a FORFEIT or a completed return (a bet that settled afterwards) is a new question.
  return "undecided";
}

/**
 * ⭐ ONE PREDICATE for "this case waits on an officer" — the sidebar badge, the /admin/kyc KPI and the report all ask it
 * (P1 review, 2026-09-14): three hand-typed copies agreed only by coincidence. A failed return waits too — its money is
 * back in the frozen wallet and nothing will move it without a new decision.
 */
export function awaitsOfficer(a: Pick<RefusedAccountRow, "state">): boolean {
  return a.state === "undecided" || a.state === "return_failed";
}

/**
 * Every balance decision ever taken, beside every finally-refused account and where its money stands.
 *
 * ⛔ DURABLE, NEVER THE RING — a report that claims completeness must come from the table
 * (`getAuditByActionsDurable`). ⚠️ `decisionsTruncated` and `accountsFailed` are returned so the page
 * can say so: a list that quietly stops, or a failed read shown as "no refused accounts", is a false
 * compliance all-clear.
 */
export async function refusedFundsReport(opts: { money?: boolean } = {}): Promise<{
  decisions: RefusedFundsDecisionRow[];
  decisionsTotal: number;
  decisionsTruncated: boolean;
  accounts: RefusedAccountRow[];
  accountsFailed: boolean;
}> {
  // ⛔ WITHOUT MONEY RIGHTS, NO WALLET IS READ (audit session 95, 2026-09-13). The report page, the /admin/kyc KPI and the
  // sidebar badge used to read every wallet for any viewer who reached a compliance route; a role granted compliance
  // without accounting then saw every refused player's balance. The caller passes `canView(role, "accounting")`.
  const money = opts.money !== false;
  const durable = await getAuditByActionsDurable(Object.values(REFUSED_FUNDS_ACTION), { category: "COMPLIANCE", limit: 2000 });
  const decisions = await withPayoutNow(durable.entries.map(toDecisionRow));
  const lastByUser = new Map<string, RefusedFundsDecisionRow>();
  for (const d of decisions) if (d.userId && !lastByUser.has(d.userId)) lastByUser.set(d.userId, d); // newest first

  let accounts: RefusedAccountRow[] = [];
  let accountsFailed = false;
  try {
    const facts = await db.kyc.listStageFacts();
    const wallets = money ? await db.wallet.listAll() : [];
    const walletByUser = new Map(wallets.map((w) => [w.userId, w]));
    accounts = facts
      .filter((f) => f.status === "REJECTED" && isFinalRefusal(f.rejectReason))
      .map((f): RefusedAccountRow => {
        const last = lastByUser.get(f.userId) ?? null;
        if (!money) {
          return { userId: f.userId, kycId: f.id, rejectCode: f.rejectReason ?? "", balance: null, hold: null, walletStatus: null, lastDecision: last, open: null, state: null };
        }
        const w = walletByUser.get(f.userId);
        const balance = w?.balance ?? 0;
        const hold = w?.hold ?? 0;
        return {
          userId: f.userId,
          kycId: f.id,
          rejectCode: f.rejectReason ?? "",
          balance,
          hold,
          walletStatus: w?.status ?? null,
          lastDecision: last,
          // ⛔ OPEN IS WHERE THE MONEY IS, NOT WHAT THE LAST DECISION WAS CALLED (found in review, 2026-09-13).
          // It used to close a case once any non-hold decision was recorded — so a return whose payout failed
          // AFTER its forfeit committed read "closed" while the money sat in the frozen wallet, and dropped off
          // the badge and the KPI. A withdrawable balance still in the wallet is an undecided case, whatever
          // was recorded; money in flight (`hold`) is on its way out and is not.
          open: balance > 0,
          state: caseState(balance, hold, last),
        };
      })
      .sort((a, b) => money
        ? Number(b.open) - Number(a.open) || ((b.balance ?? 0) + (b.hold ?? 0)) - ((a.balance ?? 0) + (a.hold ?? 0))
        : Number(!b.lastDecision) - Number(!a.lastDecision));
  } catch {
    accountsFailed = true;
  }
  return { decisions, decisionsTotal: durable.total, decisionsTruncated: durable.truncated, accounts, accountsFailed };
}
