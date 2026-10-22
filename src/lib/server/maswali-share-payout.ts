/**
 * MASWALI MILLIONEA — A SHARE PAID TO A WINNER WHOSE ACCOUNT CANNOT SIGN IN (OD-13; MASWALI-PLAN §9 OD-13, §8 MB-44;
 * MASWALI-BUILD S6-MONEY, the lead's ruling (k) of 2026-10-22).
 *
 * A winning share is credited to its holder's wallet at settlement (MR-27). A holder whose account cannot sign in —
 * self-excluded, closed or suspended (`CANNOT_SIGN_IN`, email.ts) — can neither see it nor withdraw it, and a
 * self-exclusion freezes the wallet (`responsible-gambling.ts`). A suspended or closed winner's share is held at the
 * settlement (MB-43); once Compliance releases it, it sits in a wallet nobody can withdraw from. OD-13 (accepted with
 * every remaining recommendation on 2026-10-16): "a Compliance officer pays to the registered number at the holder's
 * request. Identity and email rules are unchanged. No marketing goes with the notice."
 *
 * ⭐ THE ACT (`payLockedWinnerShare`, Compliance's, on `/admin/maswali/integrity`): ONE payment of the share, through the
 *    platform's own `withdraw()` — to the number registered on the account, at the live withdrawal fee, behind the
 *    identity gate (approved at least once) and the confirmed-email gate, the per-withdrawal maximum, the rail's minimum,
 *    the network's kill switch and the payout rail's state, exactly as a player's own withdrawal. A share above the
 *    maximum is paid by acting again, in equal parts (`nextPayment`); the parts sum to the share to the shilling.
 *    ⚠️ A consequence of "unchanged": a holder who never verified their identity, or has no confirmed email address,
 *    cannot be paid until they do (the lead's as-built note for OD-13; Ali sees it on the launch list).
 * ⭐ THROUGH THE SELF-EXCLUSION, NEVER AROUND ANOTHER HOLD. The money leaves a wallet the self-exclusion froze, or a
 *    closed one, for this payment only; the freeze is not lifted. An officer's hold, an identity refusal or a held
 *    Millionea share still stops it (`withdraw`'s `lockedWinnerShare`), and a held or forfeited share is not paid.
 * ⭐ EXACTLY ONCE. Each payment is a withdrawal keyed by the ticket and its attempt (`paymentKey`): a second press after
 *    the share is paid pays nothing; two officers at once take the same key, and `withdraw`'s in-lock re-check lets one
 *    through (the other is answered `replayed`). A payment the rail refused gives its money back (FAILED) and the next
 *    act pays under the next key. One payment is in flight at a time.
 * ⭐ RACE-SAFE IN THE PLATFORM'S ORDER. The payment's money hold runs under `maswali:chain` and then `wallet:<id>`, and
 *    re-reads the share there (`recheck`): still a paid winning share, unheld, its holder still locked out, the
 *    remainder still owed and no payment in flight — so no hold, release, forfeit or settlement of the same share can
 *    land between the check and the money. The network call stays outside every lock (`withdraw`'s own rule).
 * ⭐ RECORDED AND READ BACK. Each payment the act starts writes one COMPLIANCE row (`maswali.share.paid_locked`), AWAITED;
 *    the act answers whether it landed (`recorded`) and the console raises a standing warning when it did not.
 * ⛔ The holder is told by the withdrawal's own service notice; no marketing, no carried figure, goes with it (OD-13).
 */
import { audit } from "./audit";
import { db, type StoredTxn, type StoredUser } from "./store";
import { ticketStore, weekStore, type StoredTicket, type StoredWeek } from "./maswali-dal";
import { MASWALI_CHAIN_LOCK } from "./maswali-service";
import { withdraw } from "./wallet-service";
import { CANNOT_SIGN_IN } from "./email";
import { getPayoutStatus, payoutsAcceptingRequests, type PayoutStatus } from "./payout-status";
import { assertIdentityForPayout } from "./kyc-gate";
import { getEffectiveConfig } from "./market-config";
import { WITHDRAW_MAX_TZS } from "./validators";
import { computeWithdrawalFee, PROVIDER_MIN_PAYOUT_TZS } from "@/lib/payout";
import { normalizeTzLocalDigits } from "@/lib/phone-normalize";
import { currentFreezeReasons, FREEZE_REASON_LABEL } from "@/lib/wallet-freeze-reasons";
import { isReturnProvider, RETURN_PROVIDER_LABEL, type ReturnProvider } from "@/lib/refused-funds-outcomes";
import { formatTzs } from "@/lib/utils";

type Refused = { ok: false; error: string };
const refuse = (error: string): Refused => ({ ok: false, error });

/** The typed word that confirms the act. Restated in the console's control (a client file imports no server module). */
export const PAY_SHARE_WORD = "PAY SHARE";
/** The act's own COMPLIANCE record — one per payment it starts. */
export const SHARE_PAID_LOCKED_ACTION = "maswali.share.paid_locked";
/** The account standings this act serves: the accounts that cannot sign in (`CANNOT_SIGN_IN`). */
export type LockedStanding = "SELF_EXCLUDED" | "CLOSED" | "SUSPENDED";
const STANDING_LABEL: Record<LockedStanding, string> = { SELF_EXCLUDED: "Self-excluded", CLOSED: "Closed", SUSPENDED: "Suspended" };
/** A payment's withdrawal key: the ticket and the attempt — one key per attempt, so a retry never replays a failure. */
export const paymentKey = (ticketId: string, attempt: number): string => `mlnpay:${ticketId}:${attempt}`;
/** The most attempts one share's payments are read for: far past any share's parts and retries; past it, nothing is paid. */
const MAX_ATTEMPTS = 500;
/** A withdrawal that has left, or is leaving: its money is taken from the share. FAILED, REVERSED and CANCELLED gave it back. */
const LEAVING = new Set<StoredTxn["status"]>(["PENDING", "PROCESSING", "AML_REVIEW", "CONFIRMED"]);
const IN_FLIGHT = new Set<StoredTxn["status"]>(["PENDING", "PROCESSING", "AML_REVIEW"]);

/** One share's payments so far, in attempt order, read until the first key with no withdrawal. Null: a key names a
 *  transaction that is not this holder's withdrawal (never written by this act) — nothing is paid on that share. */
async function attemptsOf(ticketId: string, userId: string, tx?: Parameters<typeof db.txn.findByIdempotencyKey>[1]): Promise<StoredTxn[] | null> {
  const out: StoredTxn[] = [];
  for (let n = 0; n < MAX_ATTEMPTS; n++) {
    const t = await db.txn.findByIdempotencyKey(paymentKey(ticketId, n), tx);
    if (!t) return out;
    if (t.userId !== userId || t.type !== "WITHDRAWAL") return null;
    out.push(t);
  }
  return null;
}
/** ⚠️ A store read that may answer synchronously (the memory store) or fail: awaited inside a try — never `.catch` on the
 *  call itself, which a synchronous answer does not have. Null when it failed. */
async function readOrNull<T>(read: () => T | Promise<T>): Promise<T | null> {
  try { return await read(); } catch { return null; }
}
/** What the share's payments have taken from it, and the one still in flight (if any). */
function paidOf(attempts: readonly StoredTxn[]): { taken: number; inFlight: StoredTxn | null } {
  return {
    taken: attempts.filter((t) => LEAVING.has(t.status)).reduce((s, t) => s + Math.abs(t.amount), 0),
    inFlight: attempts.find((t) => IN_FLIGHT.has(t.status)) ?? null,
  };
}

/**
 * ⭐ THE NEXT PAYMENT of what is left of a share: all of it when it fits the per-withdrawal maximum, else an equal part —
 * the fewest payments that fit, split as evenly as the shilling allows — so no payment is ever a tail too small for the
 * rail. The parts sum to what was left, to the shilling. Pure.
 */
export function nextPayment(left: number): number {
  if (!Number.isSafeInteger(left) || left <= 0) return 0;
  if (left <= WITHDRAW_MAX_TZS) return left;
  return Math.ceil(left / Math.ceil(left / WITHDRAW_MAX_TZS));
}

/** A settled, paid winning ticket and its week — or why it is not one. */
async function paidWinningShare(ticketId: string): Promise<{ ok: true; ticket: StoredTicket; week: StoredWeek; share: number } | Refused> {
  const ticket = await ticketStore.get(ticketId);
  if (!ticket) return refuse("No such ticket.");
  const share = Math.round(ticket.payout ?? 0);
  if (ticket.status !== "SETTLED" || ticket.won !== true || !(share > 0)) return refuse(`Ticket ${ticket.serial} is not a paid winning share.`);
  const week = await weekStore.get(ticket.cycleId);
  if (!week) return refuse("The ticket's week is missing.");
  return { ok: true, ticket, week, share };
}

/** The share's own refusals — held, forfeited, the holder able to sign in — in the officer's words; null when payable. */
function shareRefusal(ticket: StoredTicket, user: StoredUser | null): string | null {
  if (ticket.frozenReason) {
    return ticket.frozenReason.startsWith("forfeited · ")
      ? `The share on ${ticket.serial} was forfeited to the jackpot; there is nothing to pay.`
      : `The share on ${ticket.serial} is held for Compliance's decision; decide it first (release or forfeit). Nothing was paid.`;
  }
  if (!user) return "The holder's account cannot be read. Nothing was paid.";
  if (!CANNOT_SIGN_IN.has(String(user.status))) {
    return "The holder's account can sign in, so they withdraw the share themselves. This act is for an account that cannot sign in. Nothing was paid.";
  }
  return null;
}

// ── THE READ: every share owed to a winner who cannot sign in ─────────────────────────────────────────────────────

export type LockedShareRow = {
  ticketId: string; serial: string; weekCode: string; weekSeq: number; userId: string; holder: string;
  standing: LockedStanding; standingLabel: string;
  share: number; paid: number; left: number;
  /** What the next act would pay, its fee at today's rate and what arrives — 0 when nothing can be paid now. */
  next: number; fee: number; net: number;
  /** The last four digits of the number registered on the account — where the money goes. */
  last4: string;
  /** The network of the holder's most recent confirmed mobile-money deposit: the form's default. */
  network: ReturnProvider | null;
  /** Why the act would be refused now, in the officer's words; null when it can pay. */
  blocked: string | null;
};

/**
 * ⭐ THE CONSOLE'S LIST (MB-44, OD-13): every paid, unheld winning share whose holder's account cannot sign in and that is
 * not yet paid in full, or has a payment in flight — each with what the next act would pay and, when it cannot, why
 * (so the console offers no act the server would refuse: the E-18 lesson). Read in full, never capped; the page pages it.
 * `deps.payoutStatus` reads the payout rail's state (a suite hands its own).
 */
export async function lockedWinnerShares(deps: { payoutStatus?: () => Promise<PayoutStatus> } = {}): Promise<LockedShareRow[]> {
  const weeks = await weekStore.list({ states: ["SETTLED"] });
  const won: Array<{ ticket: StoredTicket; week: StoredWeek }> = [];
  for (const w of weeks) {
    for (const ticket of await ticketStore.listForWeek(w.id, { status: "SETTLED", won: true })) {
      if (!ticket.frozenReason && (ticket.payout ?? 0) > 0) won.push({ ticket, week: w });
    }
  }
  if (won.length === 0) return [];
  const ids = [...new Set(won.map((x) => x.ticket.userId))];
  const users = new Map<string, StoredUser>();
  for (let i = 0; i < ids.length; i += 5_000) for (const u of await db.user.findByIds(ids.slice(i, i + 5_000))) users.set(u.id, u);
  const locked = won.filter((x) => CANNOT_SIGN_IN.has(String(users.get(x.ticket.userId)?.status ?? "")));
  if (locked.length === 0) return [];
  const rate = (await getEffectiveConfig()).withdrawalFeeRate;
  const rail = await (deps.payoutStatus ?? (async () => (await getPayoutStatus()).status))().catch((): PayoutStatus => "unavailable");
  const out: LockedShareRow[] = [];
  for (const { ticket, week } of locked) {
    const user = users.get(ticket.userId)!;
    const share = Math.round(ticket.payout ?? 0);
    const attempts = await attemptsOf(ticket.id, user.id);
    const { taken, inFlight } = attempts ? paidOf(attempts) : { taken: 0, inFlight: null };
    const left = Math.max(0, share - taken);
    if (attempts && left === 0 && !inFlight) continue;
    const wallet = await db.wallet.findByUserId(user.id);
    const otherHolds = wallet ? currentFreezeReasons(wallet).filter((r) => r !== "SELF_EXCLUSION") : [];
    const identity = await assertIdentityForPayout(user.id).catch(() => null);
    const next = nextPayment(left);
    const fee = next > 0 ? computeWithdrawalFee(next, rate) : 0;
    const blocked =
      !attempts ? "This share's earlier payments cannot be read in full, so nothing can be paid on it; an administrator reviews them."
      : inFlight ? `A payment of ${formatTzs(Math.abs(inFlight.amount))} is in flight (${inFlight.status.toLowerCase().replace("_", " ")}). Wait for it to settle.`
      : !wallet ? "This holder has no wallet."
      : otherHolds.length > 0 ? `The wallet is also held for: ${otherHolds.map((r) => FREEZE_REASON_LABEL[r]).join(", ")}. Nothing can be paid until that hold is decided on its own control.`
      : !identity ? "The holder's identity record cannot be read."
      : !identity.eligible ? "The holder's identity has never been verified. The withdrawal rules are unchanged: they verify it before this share can be paid."
      : !user.emailVerifiedAt ? "The holder has no confirmed email address. The withdrawal rules are unchanged: they confirm one before this share can be paid."
      : !payoutsAcceptingRequests(rail) ? "The payout rail is not accepting requests right now, so nothing can be sent."
      : next - fee < PROVIDER_MIN_PAYOUT_TZS ? `${formatTzs(next)} is below the smallest amount the payout rail can send after its fee.`
      : wallet.balance < next ? `The wallet holds ${formatTzs(wallet.balance)}, less than this payment of ${formatTzs(next)}.`
      : null;
    const deposits = ((await readOrNull(() => db.txn.findByUserTypes(user.id, ["DEPOSIT"], 200))) ?? [])
      .filter((t) => t.status === "CONFIRMED" && isReturnProvider(t.provider)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const standing = user.status as LockedStanding;
    out.push({
      ticketId: ticket.id, serial: ticket.serial, weekCode: week.code, weekSeq: week.seq, userId: user.id,
      holder: user.displayName?.trim() || `…${user.phoneE164.slice(-4)}`, standing, standingLabel: STANDING_LABEL[standing],
      share, paid: taken, left, next: blocked ? 0 : next, fee: blocked ? 0 : fee, net: blocked ? 0 : next - fee,
      last4: user.phoneE164.slice(-4), network: (deposits[0]?.provider as ReturnProvider | undefined) ?? null, blocked,
    });
  }
  return out.sort((a, b) => b.weekSeq - a.weekSeq || a.serial.localeCompare(b.serial));
}

// ── THE ACT ───────────────────────────────────────────────────────────────────────────────────────────────────────

export type LockedSharePayment =
  | { ok: true; already: true; note: string }
  | { ok: true; already?: false; txnId: string; status: StoredTxn["status"]; amount: number; fee: number; net: number; left: number;
      replayed: boolean; recorded: boolean | null; note: string }
  | Refused;

/** Where a suite stops the act part-way: after its first read, before the payment's locks (a hold, a forfeit or a second
 *  officer landing in between). Empty outside the suites. */
type PayoutSeams = { beforePayment?: () => Promise<void> };
let seams: PayoutSeams = {};
/** ⚠️ TEST SEAM ONLY — never call this from application code. `null` clears it. */
export function __setSharePayoutSeamsForTests(s: PayoutSeams | null): void {
  if (process.env.NODE_ENV === "production") throw new Error("__setSharePayoutSeamsForTests is a test seam and refuses to run in production.");
  seams = s ?? {};
}

/**
 * ⭐ OD-13 · PAY ONE PAYMENT OF A LOCKED WINNER'S SHARE, at the holder's request (`request`: how and when they asked — the
 * record's reason). `typed` must be `PAY SHARE`; `provider` is the network of the registered number (the officer chooses
 * it: there is no number-prefix table to infer it from). Refuses before anything moves when the share is not a paid,
 * unheld winning share, its holder can sign in, a payment of it is in flight, or the payout rail is closed; `withdraw()`
 * then asks every withdrawal rule, and the share again inside the chain and wallet locks. The caller's action has checked
 * the role (`requireStaff(CONTROL_DOMAIN.payLockedWinnerShare, …)`).
 */
export async function payLockedWinnerShare(input: {
  ticketId: string; officerId: string; typed: string; request: string; provider: string;
  /** Tests only: the payout rail's state. */
  payoutStatus?: () => Promise<PayoutStatus>;
}): Promise<LockedSharePayment> {
  if (input.typed.trim() !== PAY_SHARE_WORD) return refuse(`Type ${PAY_SHARE_WORD} to pay the share.`);
  const request = input.request.trim();
  if (request.length < 5 || request.length > 300) return refuse("Write how and when the holder asked to be paid (5–300 characters).");
  if (!isReturnProvider(input.provider)) return refuse("Choose the mobile-money network of the holder's registered number.");
  const provider = input.provider;
  const first = await paidWinningShare(input.ticketId);
  if (!first.ok) return first;
  const { ticket, week, share } = first;
  const user = await db.user.findById(ticket.userId);
  const why = shareRefusal(ticket, user);
  if (why) return refuse(why);
  if (user!.id === input.officerId) {
    audit({ category: "SECURITY", action: "maswali.share.paid_locked_self_blocked", actorId: input.officerId, targetType: "MaswaliTicket", targetId: ticket.id });
    return refuse("You cannot pay a share of your own.");
  }
  const holder = user!;
  // Another hold on the wallet is decided on its own control first — said here in the officer's words; `withdraw`'s own
  // gate refuses the money whatever this read says (it re-reads the wallet inside the locks).
  const wallet = await db.wallet.findByUserId(holder.id);
  const otherHolds = wallet ? currentFreezeReasons(wallet).filter((r) => r !== "SELF_EXCLUSION") : [];
  if (!wallet) return refuse("This holder has no wallet. Nothing was paid.");
  if (otherHolds.length > 0) {
    return refuse(`The wallet is also held for: ${otherHolds.map((r) => FREEZE_REASON_LABEL[r]).join(", ")}. That hold is decided on its own control first; nothing was paid.`);
  }
  const rail = await (input.payoutStatus ?? (async () => (await getPayoutStatus()).status))().catch((): PayoutStatus => "unavailable");
  if (!payoutsAcceptingRequests(rail)) return refuse("The payout rail is not accepting requests right now, so nothing was paid.");
  const attempts = await attemptsOf(ticket.id, holder.id);
  if (!attempts) return refuse("This share's earlier payments cannot be read in full, so nothing was paid; an administrator reviews them.");
  const before = paidOf(attempts);
  if (before.inFlight) return refuse(`A payment of ${formatTzs(Math.abs(before.inFlight.amount))} of this share is in flight; wait for it to settle. Nothing was paid.`);
  const left = share - before.taken;
  if (left <= 0) return { ok: true, already: true, note: `The share on ${ticket.serial} is already paid in full; nothing was paid again.` };
  const amount = nextPayment(left);
  const attempt = attempts.length;
  const key = paymentKey(ticket.id, attempt);
  await seams.beforePayment?.();

  /**
   * ⭐ ASKED AGAIN INSIDE `maswali:chain` AND THEN `wallet:<id>` (withdraw's hold phase), before any money moves: no hold,
   * release, forfeit or settlement of this share can land between this read and the money (each takes the chain lock).
   */
  const recheck = async (tx: Parameters<typeof db.txn.findByIdempotencyKey>[1]): Promise<string | null> => {
    const now = await paidWinningShare(ticket.id);
    if (!now.ok) return `${now.error} Nothing was paid.`;
    if (now.ticket.userId !== holder.id || now.share !== share) return "The share changed since it was read. Read it again; nothing was paid.";
    const again = shareRefusal(now.ticket, await db.user.findById(holder.id));
    if (again) return again;
    const seen = await attemptsOf(ticket.id, holder.id, tx);
    if (!seen) return "This share's earlier payments cannot be read in full, so nothing was paid; an administrator reviews them.";
    const p = paidOf(seen);
    if (seen.length !== attempt || p.inFlight || share - p.taken < amount) {
      return "Another payment of this share was made meanwhile. Read the share again; nothing was paid.";
    }
    return null;
  };
  let r: Awaited<ReturnType<typeof withdraw>>;
  try {
    r = await withdraw(holder.id, { provider, amount, msisdn: normalizeTzLocalDigits(holder.phoneE164) }, key, input.officerId,
      { lockedWinnerShare: { ticketId: ticket.id, outerLock: MASWALI_CHAIN_LOCK, recheck } });
  } catch (err) {
    r = { ok: false, error: `The payment could not be completed: ${(err as Error)?.message ?? String(err)}`.slice(0, 300) };
  }
  const network = RETURN_PROVIDER_LABEL[provider];
  const last4 = holder.phoneE164.slice(-4);
  if (r.ok && r.data?.replayed) {
    return { ok: true, txnId: r.data.txnId, status: r.data.status, amount, fee: r.data.fee, net: r.data.net, left: Math.max(0, left - amount),
      replayed: true, recorded: null, note: `This payment was already started by another officer or an earlier press (${r.data.txnId}); nothing was paid again.` };
  }
  // ⭐ WHAT THIS ACT STARTED is the withdrawal under its own key, whatever `withdraw` answered: a refusal before the hold
  //    left none (nothing moved), and a dispatch the rail refused (FAILED: its money is back) or whose answer is still
  //    being checked (held) left one — which is recorded like any payment this act started.
  const mine = r.ok ? null : await readOrNull(() => db.txn.findByIdempotencyKey(key));
  if (!r.ok && !(mine && mine.userId === holder.id && mine.type === "WITHDRAWAL")) return refuse(r.error);
  const d = r.ok
    ? r.data!
    : { txnId: mine!.id, status: mine!.status, fee: mine!.fee ?? 0, net: Math.abs(mine!.amount) - (mine!.fee ?? 0) };
  // ⭐ THE RECORD, AWAITED AND READ BACK — the payment exists, so the act is recorded, whatever the rail answered. It names
  //    the payment by its transaction (which carries the number it went to), never the number itself: the record travels in
  //    the week's evidence pack (`EVIDENCE_SHARE_ACTIONS`), which carries accounts by id only.
  const leftAfter = LEAVING.has(d.status) ? left - amount : left;
  const rec = await audit({
    category: "COMPLIANCE", action: SHARE_PAID_LOCKED_ACTION, actorId: input.officerId, targetType: "MaswaliTicket", targetId: ticket.id,
    payload: {
      code: week.code, serial: ticket.serial, share, paidBefore: before.taken, amount, attempt, txnId: d.txnId, status: d.status,
      fee: d.fee, net: d.net, left: leftAfter, provider, standing: holder.status, request, railAnswer: r.ok ? null : r.error,
      instruction: "Owner decision accepted 2026-10-16 · a Compliance officer pays a winner whose account cannot sign in to the registered number, at the holder's request; identity and email rules are unchanged",
    },
  }).then((x) => x.recorded, () => false);
  const sent = `${formatTzs(amount)} to the number ending ${last4} on ${network}: ${formatTzs(d.net)} arrives after the ${formatTzs(d.fee)} withdrawal fee`;
  const rest = leftAfter > 0 ? ` ${formatTzs(leftAfter)} of the share is still owed: act again for the next payment.` : " The share is paid in full.";
  const note = d.status === "CONFIRMED" ? `Paid ${sent}.${rest}`
    : !LEAVING.has(d.status) ? `The rail refused the payment of ${formatTzs(amount)}; its money is back in the wallet. Act again to retry (payment ${d.txnId}).`
    : `Sent ${sent}; the payment is in flight and settles on the provider's answer (payment ${d.txnId}).${rest}`;
  return { ok: true, txnId: d.txnId, status: d.status, amount, fee: d.fee, net: d.net, left: leftAfter, replayed: false, recorded: rec, note };
}
