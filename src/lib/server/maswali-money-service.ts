/**
 * MASWALI MILLIONEA — THE MONEY PATH (MASWALI-BUILD S3; MASWALI-PLAN §3 MR-8…MR-12, MR-20…MR-27, §5b, §7b S3).
 *
 * Buying tickets, the free cancel, the settlement of a week, the guarantee ceremonies, the forfeit and the sunset.
 * Every shilling moves through the platform's own rows — `Position`, `Transaction`, `LedgerEntry`, the wallet — under
 * the platform's own locks, inside one `withMoneyTx` per movement, so a failure rolls the whole movement back.
 *
 * ⛔ THE FOUR TRANSACTION RULES BEFORE ANY MONEY EDIT (the bet-concurrency record): locks before the transaction, the lock
 *    order wallet → market (never the reverse), every refusal BEFORE the first write, and an abort that escapes the lock
 *    (a caught abort inside the lock would commit the writes it meant to discard).
 * ⛔ NO MILLIONEA NOTICE, EMAIL, PUSH, WAGERING ACCRUAL, RECRUIT ACCRUAL OR HOUSE TRIGGER fires from here: OD-20, OD-27
 *    and S6 (Millionea's own notices, in its own words) — the poll's notices never describe a ticket.
 *
 * The memory store keeps no ledger (`postLedgerEntries` no-ops without a database), so the two Millionea accounts — and
 * the POOL of every week, as far as Millionea's own groups move it — are mirrored in process memory there: both stores
 * can answer "what does the guarantee hold" and "what is in this week's pool", and the suites run the same money
 * questions on both.
 */
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { audit } from "./audit";
import { afterCommit, withLock } from "./locks";
import { prisma, hasDatabase } from "./prisma";
import {
  acct, maswaliGuaranteeFundEntries, maswaliGuaranteeReturnEntries, maswaliJackpotOf, postLedgerEntries, withMoneyTx, type LedgerLine,
} from "./ledger";
import { ticketStore, weekStore, type StoredWeek } from "./maswali-dal";
import { guaranteeRequirement } from "@/lib/maswali-money";
import { readMaswaliRulesSnapshot, type MaswaliRulesSnapshot } from "./maswali-config";
import { randomId } from "./crypto";
import { db } from "./store";
import { marketStore, positionStore } from "./market-dal";
import { checkLossLimit } from "./responsible-gambling";
import { houseBotStore } from "./house-bot-dal";
import { isStaffRole } from "./roles";
import { cashoutEntries, stakeEntries } from "./ledger";
import { snapshotOrLegacy } from "./market-config";
import { canonicalPicks, SLOT_COUNT, type MaswaliPick } from "@/lib/maswali-score";
import { leafHash, newSalt, picksKey } from "@/lib/maswali-commitment";
import { exitWindowFacts } from "@/lib/exit-window";
import { readSalesPauseFresh } from "./maswali-pause";
import { millioneaStateNow } from "./millionea-switch";
import { formatDateTime } from "@/lib/utils";
import type { StoredMarket, StoredPosition } from "./market-service";
import type { ServiceResult } from "./auth-service";

// The platform's own refusal (ServiceResult's `ok: false` arm), so buyPosition and cashOutPosition hand it back unchanged.
type Refused = Extract<ServiceResult, { ok: false }>;
const refuse = (error: string, extra: Omit<Refused, "ok" | "error"> = {}): Refused => ({ ok: false, error, ...extra });

/** The lock every guarantee movement and every settlement takes — the same line of weeks `maswali-service` orders. */
export const MASWALI_MONEY_LOCK = "maswali:chain";

// ── THE TWO ACCOUNTS, IN BOTH STORES ─────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MLN_LEDGER_MIRROR: Map<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MLN_LEDGER_GROUPS: Map<string, string> | undefined;
}
const mirror = (globalThis.__50PICK_MLN_LEDGER_MIRROR ??= new Map<string, number>());
/** The memory twin of `LedgerEntry.groupId` (R7): every Millionea group posted, with the instant it was first posted. */
const mirrorGroups = (globalThis.__50PICK_MLN_LEDGER_GROUPS ??= new Map<string, string>());
const MIRRORED = new Set<string>([acct.maswaliJackpot, acct.maswaliDriveJackpot, acct.maswaliGuarantee]);
const dbPresent = () => hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
/** ⚠️ A week's POOL is mirrored only through Millionea's own groups (buy, cancel, settle): a memory-store week VOIDED by
 *  `settleMarket` leaves its mirror at the sales, so nothing reads a voided week's pool from the mirror. */
const mirrored = (account: string) => MIRRORED.has(account) || account.startsWith("POOL:");

/**
 * Post a Millionea group: the platform's `postLedgerEntries` (inside the caller's transaction), and — on the memory
 * store only — the two Millionea accounts' mirror, so the memory store answers the same balance questions.
 */
export async function postMaswaliLines(groupId: string, lines: LedgerLine[], tx: Prisma.TransactionClient | null): Promise<void> {
  if (lines.length === 0) return;
  const sum = lines.reduce((s, l) => s + l.amount, 0);
  if (sum !== 0) throw new Error(`[maswali-money] group ${groupId} does not balance (${sum})`);
  await postLedgerEntries(groupId, lines, tx ?? undefined);
  if (!dbPresent()) {
    for (const l of lines) if (mirrored(l.account)) mirror.set(l.account, (mirror.get(l.account) ?? 0) + l.amount);
    if (!mirrorGroups.has(groupId)) mirrorGroups.set(groupId, new Date().toISOString());
  }
}

/**
 * R7 · when a Millionea group was first posted: `{ at: null }` when it never was, and null (never "absent") when the
 * store could not be asked. Read inside the caller's transaction, so a check under a lock sees what a posting under the
 * same lock wrote; the memory store answers from its mirror's register of groups.
 */
async function maswaliGroupRecordedAt(groupId: string, tx?: Prisma.TransactionClient | null): Promise<{ at: string | null } | null> {
  if (!dbPresent()) return { at: mirrorGroups.get(groupId) ?? null };
  try {
    const c = tx ?? prisma();
    if (!c) return null;
    const first = await c.ledgerEntry.findFirst({ where: { groupId }, orderBy: { createdAt: "asc" }, select: { createdAt: true } });
    return { at: first ? first.createdAt.toISOString() : null };
  } catch (err) {
    console.error(`[maswali-money] ledger group ${groupId} could not be read:`, (err as Error)?.message ?? err);
    return null;
  }
}

/**
 * ⭐ A MONEY DECISION'S READ of one account's balance — inside the caller's transaction when it has one, and `null`
 * (never 0) when the store could not be asked. Settlement and the guarantee checks refuse on null.
 */
export async function maswaliAccountBalance(account: string, tx?: Prisma.TransactionClient | null): Promise<number | null> {
  if (!dbPresent()) return mirrored(account) ? (mirror.get(account) ?? 0) : null;
  try {
    const c = tx ?? prisma();
    if (!c) return null;
    const rows = await c.$queryRawUnsafe<Array<{ sum: string | null }>>(`SELECT SUM(amount) AS sum FROM "LedgerEntry" WHERE account = $1`, account);
    const n = Number(rows[0]?.sum ?? 0);
    return Number.isFinite(n) ? Math.round(n) : null;
  } catch (err) {
    console.error(`[maswali-money] balance of ${account} could not be read:`, (err as Error)?.message ?? err);
    return null;
  }
}

/** The guarantee as the open reads it (`maswali-service.ts → openWeek`'s `GuaranteeReader`). */
export const guaranteeReader = { balance: () => maswaliAccountBalance(acct.maswaliGuarantee) };

/** The jackpot of a line of weeks as the carry claim reads it (`claimCarry`'s `readJackpot`): the drive's is its own (OD-21). */
export const readJackpotOf = (visibility: "PUBLIC" | "DRIVE") => () => maswaliAccountBalance(maswaliJackpotOf(visibility));

/** ⚠️ TEST SEAM ONLY: empty the memory mirror (the balances and the register of groups). */
export function __resetMaswaliLedgerMirror(): void { mirror.clear(); mirrorGroups.clear(); }

// ── THE OWNER'S GUARANTEE CEREMONIES (MB-03, OD-02) ──────────────────────────────────────────────────

export const GUARANTEE_FUND_WORD = "FUND GUARANTEE";
export const GUARANTEE_RETURN_WORD = "RETURN GUARANTEE";

/**
 * R7 · ONE REFERENCE BOOKS ONCE PER DIRECTION (a double submit, a retry). A movement's group id is derived from its
 * reference — trimmed, as the ceremony reads it — so the check asks for the very group the posting writes, on both
 * stores. Neither store refuses a repeated group id by itself (`LedgerEntry.groupId` is an index, not a key, and the
 * memory store keeps no ledger), so the check is explicit, under the chain lock and before the write: a second submit
 * of one reference waits for the first to commit, then reads its lines.
 */
const guaranteeGroupId = (direction: "fund" | "return", reference: string): string =>
  `maswali_guarantee_${direction}_${createHash("sha256").update(reference).digest("hex").slice(0, 32)}`;

/** The refusal for a reference this direction has already booked, naming when; null when it is new. Unreadable refuses. */
async function bookedReferenceRefusal(groupId: string, reference: string, what: "funding" | "return", tx: Prisma.TransactionClient | null): Promise<Refused | null> {
  const seen = await maswaliGroupRecordedAt(groupId, tx);
  if (seen === null) return refuse("The guarantee's records could not be read, so nothing was booked.");
  if (seen.at === null) return null;
  return refuse(`Reference ${reference} was already recorded for a guarantee ${what} on ${formatDateTime(seen.at)}; nothing was booked twice. A new ${what} needs its own reference.`);
}

/**
 * The Owner pays capital in to back the floor. ⛔ The caller is the Owner's ceremony (S4, `requireOwner`); this checks
 * the typed words, the amount and the rail reference — booked once (R7) — and books owner capital → guarantee in one
 * balanced group. The answer and the COMPLIANCE row carry the guarantee AFTER the funding (R4b), recorded once it commits.
 */
export async function fundMaswaliGuarantee(input: { amount: number; reference: string; typed: string; ownerId: string }): Promise<{ ok: true; balance: number } | Refused> {
  if (input.typed.trim() !== GUARANTEE_FUND_WORD) return refuse(`Type ${GUARANTEE_FUND_WORD} to fund the guarantee.`);
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) return refuse("The amount is a whole number of shillings above 0.");
  const reference = input.reference.trim();
  if (reference.length < 5 || reference.length > 120) return refuse("Give the bank or rail reference the money came in under (5–120 characters).");
  return withLock(MASWALI_MONEY_LOCK, async (lockTx) => {
    const groupId = guaranteeGroupId("fund", reference);
    const booked = await bookedReferenceRefusal(groupId, reference, "funding", lockTx);
    if (booked) return booked;
    // R4b · read in the lock's transaction, before the write: a read after the movement but outside its transaction sees
    // the guarantee as it was BEFORE this funding on Postgres (the memory store has no transaction to hide it).
    const held = await maswaliAccountBalance(acct.maswaliGuarantee, lockTx);
    if (held === null) return refuse("The guarantee balance could not be read, so nothing was funded.");
    await withMoneyTx(async (tx) => postMaswaliLines(groupId, maswaliGuaranteeFundEntries({ amount: input.amount, reference, actorId: input.ownerId }), tx));
    const balance = held + input.amount;
    afterCommit(lockTx, () => {
      audit({ category: "COMPLIANCE", action: "maswali.guarantee.funded", actorId: input.ownerId, targetType: "MaswaliGuarantee", targetId: "guarantee",
        payload: { amount: input.amount, reference, groupId, balanceAfter: balance } });
    });
    return { ok: true as const, balance };
  });
}

/**
 * The Owner takes back guarantee no unsettled week could still need: never below OD-02's requirement over every
 * unsettled week. Read inside the chain lock and its transaction, so no week can open or settle between the check and
 * the movement, and the answer is the guarantee after it (R4b). One reference books once (R7).
 */
export async function returnMaswaliGuarantee(input: { amount: number; reference: string; typed: string; ownerId: string }): Promise<{ ok: true; balance: number } | Refused> {
  if (input.typed.trim() !== GUARANTEE_RETURN_WORD) return refuse(`Type ${GUARANTEE_RETURN_WORD} to return guarantee money.`);
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) return refuse("The amount is a whole number of shillings above 0.");
  const reference = input.reference.trim();
  if (reference.length < 5 || reference.length > 120) return refuse("Give the reference the money goes out under (5–120 characters).");
  return withLock(MASWALI_MONEY_LOCK, async (lockTx) => {
    const groupId = guaranteeGroupId("return", reference);
    const booked = await bookedReferenceRefusal(groupId, reference, "return", lockTx);
    if (booked) return booked;
    const held = await maswaliAccountBalance(acct.maswaliGuarantee, lockTx);
    if (held === null) return refuse("The guarantee balance could not be read, so nothing was returned.");
    const unsettled = await weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING"] });
    const need = guaranteeRequirement(unsettled.map((w) => {
      const r = readMaswaliRulesSnapshot(w.rulesSnapshot);
      return { floor: r.ok ? r.rules.floorTzs : 0, confirmedCarryIn: w.rolloverIn };
    }));
    if (held - input.amount < need) {
      return refuse(`The guarantee holds TZS ${held.toLocaleString("en")} and the open weeks need TZS ${need.toLocaleString("en")}; at most TZS ${Math.max(0, held - need).toLocaleString("en")} can be returned.`);
    }
    await withMoneyTx(async (tx) => postMaswaliLines(groupId, maswaliGuaranteeReturnEntries({ amount: input.amount, reference, actorId: input.ownerId }), tx));
    const balance = held - input.amount;
    afterCommit(lockTx, () => {
      audit({ category: "COMPLIANCE", action: "maswali.guarantee.returned", actorId: input.ownerId, targetType: "MaswaliGuarantee", targetId: "guarantee",
        payload: { amount: input.amount, reference, groupId, balanceAfter: balance, requirement: need } });
    });
    return { ok: true as const, balance };
  });
}

// ── THE DATABASE CLOCK ───────────────────────────────────────────────────────────────────────────────

/**
 * The instant the DATABASE says it is, inside the caller's transaction (MB-31: the close is enforced on the database
 * clock, so a container whose clock runs slow can never sell after the close). The memory store answers the app clock.
 */
export async function dbNowMs(tx: Prisma.TransactionClient | null): Promise<number> {
  if (!dbPresent()) return Date.now();
  const c = tx ?? prisma();
  if (!c) return Date.now();
  const rows = await c.$queryRawUnsafe<Array<{ nowMs: number }>>(`SELECT (extract(epoch FROM clock_timestamp()) * 1000)::float8 AS "nowMs"`);
  const n = Number(rows[0]?.nowMs);
  if (!Number.isFinite(n)) throw new Error("[maswali-money] the database clock could not be read");
  return n;
}

// ── BUYING TICKETS (MR-8…MR-12, MB-31) ───────────────────────────────────────────────────────────────

/** A purchase: one or more slips of fifteen answers, for one week. */
export type MaswaliBuy = { weekId: string; slips: ReadonlyArray<ReadonlyArray<MaswaliPick>> };

export type MaswaliTicketReceipt = { ticketId: string; positionId: string; serial: string; selectionsHash: string };

export type MaswaliBuyResult =
  | { ok: true; data: { positionId: string; balance: number; payoutIfWin: number; placedAt: string; bonusStakeTzs: number; replayed?: true;
      maswali: { weekId: string; tickets: MaswaliTicketReceipt[] } } }
  | Refused;

/** The frozen rules of a week, or null. */
function rulesOf(week: StoredWeek): MaswaliRulesSnapshot | null {
  const r = readMaswaliRulesSnapshot(week.rulesSnapshot);
  return r.ok ? r.rules : null;
}

/** The one ticket price of the week on this market, from its frozen rules (MR-8) — or null before the week has rules. */
export async function maswaliTicketPrice(marketId: string): Promise<number | null> {
  const week = await weekStore.getByMarketId(marketId);
  const rules = week ? rulesOf(week) : null;
  return rules ? rules.ticketPriceTzs : null;
}

/** A ticket's serial: the week's code and its sale number — globally unique, as the column is. */
const serialOf = (week: StoredWeek, n: number) => `${week.code}-${String(n).padStart(6, "0")}`;

/** A purchase's idempotency key, per ticket: `<key>#0` … `<key>#(n-1)` — one key on the request, one per position row. */
const ticketKey = (key: string, i: number) => `${key}#${i}`;

type Landed =
  | { kind: "none" }
  | { kind: "conflict" }
  | { kind: "landed"; first: StoredPosition; weekId: string; receipts: MaswaliTicketReceipt[] };

/**
 * What a purchase key already placed: nothing, the very purchase asked for again (every slip, in order, and no more), or a
 * conflict. ⛔ The same key with other picks, another market, another player's or a house row, or a different number of
 * tickets is NOT a retry of that purchase (sanctioned change (b)'s rule). Read in the wallet lock by the purchase itself,
 * and outside any lock by L2's pre-gate answer (`landedMaswaliAnswer`).
 */
async function readLandedPurchase(userId: string, marketId: string, key: string, slips: ReadonlyArray<ReadonlyArray<MaswaliPick>>,
  tx?: Prisma.TransactionClient | null): Promise<Landed> {
  const first = await positionStore.findByIdempotencyKey(ticketKey(key, 0), tx ?? undefined);
  if (!first) return { kind: "none" };
  if (first.userId !== userId || first.houseBotId != null || first.marketId !== marketId) return { kind: "conflict" };
  const receipts: MaswaliTicketReceipt[] = [];
  let weekId = "";
  for (let i = 0; i < slips.length; i++) {
    const p = i === 0 ? first : await positionStore.findByIdempotencyKey(ticketKey(key, i), tx ?? undefined);
    const t = p && p.userId === userId && p.marketId === marketId ? await ticketStore.getByPositionId(p.id) : null;
    if (!p || !t || t.picksKey !== picksKey(slips[i])) return { kind: "conflict" };
    weekId = t.cycleId;
    receipts.push({ ticketId: t.id, positionId: p.id, serial: t.serial, selectionsHash: t.selectionsHash });
  }
  // The purchase asked for again is the WHOLE purchase: a retry naming fewer slips than were bought is another request.
  if (await positionStore.findByIdempotencyKey(ticketKey(key, slips.length), tx ?? undefined)) return { kind: "conflict" };
  return { kind: "landed", first, weekId, receipts };
}

/** An abort that must escape the locks so the transaction rolls back (the platform's BetAbort rule). */
class MaswaliAbort extends Error { constructor(readonly why: "NO_FUNDS" | "NOT_CANCELLABLE") { super(why); } }

/**
 * ⭐ BUY N TICKETS — called by `buyPositionInner` ONLY, after every shared gate has run (the rate limit, maintenance,
 * self-exclusion and cooling-off, the session limit, the account's status), so a Millionea purchase meets the platform's
 * responsible-gambling gates through the one bet path, never a copy of them.
 *
 * Then, here: the insider refusals; the rollout again (R10a); the week OPEN and this market its own; the slips; the desk
 * check, failing closed (R10b); then inside `wallet:` — the replay,
 * the wallet, the CAP (counted in the lock, MR-11), the loss limit for the whole purchase, real balance only (bonus is
 * refused before any split, MR-10) — and inside `market:` the close on the DATABASE clock, and ONE money transaction for
 * all N tickets: one debit, N positions and transactions, N ticket rows with their salted leaves, one ledger group.
 * ⛔ No receipt, notice, email, push, wagering accrual, recruit accrual or house trigger (OD-20, OD-27; S6 adds its own).
 */
export async function buyMaswaliTickets(input: {
  userId: string;
  user: { role: string };
  isHouse: boolean;
  market: StoredMarket;
  buy: MaswaliBuy;
  stake: number;
  idempotencyKey?: string;
  reach?: { reached: boolean };
}): Promise<MaswaliBuyResult> {
  const { userId, market, buy } = input;
  // ── Who may buy (MR-10). ⛔ The non-staff refusal is neutral on purpose (D19): it never says why.
  if (input.isHouse) return refuse("This account cannot buy Millionea tickets.", { code: "INVALID", reason: "millionea_account_ineligible" });
  if (isStaffRole(input.user.role)) return refuse("Staff accounts cannot buy Millionea tickets.", { code: "INVALID", reason: "millionea_staff_barred" });

  const week = await weekStore.getByMarketId(market.id);
  if (!week || week.id !== buy.weekId) return refuse("This Millionea week is not open for tickets.", { code: "INVALID", reason: "millionea_week_not_open" });
  // ── The rollout, asked HERE too (R10a, defence in depth): `purchaseMaswaliTickets` asks first, and a caller that reaches
  //    the ticket arm any other way meets the same rule, read fresh, failing closed, with the same answer. `rolloutSells`
  //    is imported when asked: `maswali-service` reaches this file through `market-service`, so a static import is a cycle.
  const rollout = await millioneaStateNow().catch(() => "WITHDRAWN" as const);
  const { rolloutSells } = await import("./maswali-service");
  if (!rolloutSells(rollout, week.visibility)) {
    return refuse("Millionea is not available yet.", { code: "INVALID", reason: "millionea_not_available" });
  }
  if (week.state !== "OPEN") {
    return week.state === "CLOSED" || week.state === "RESOLVING" || week.state === "SETTLED"
      ? refuse("Sales for this Millionea week have closed.", { code: "SELECTION_CLOSED", reason: "millionea_sales_closed" })
      : refuse("This Millionea week is not open for tickets.", { code: "INVALID", reason: "millionea_week_not_open" });
  }
  const rules = rulesOf(week);
  if (!rules) return refuse("This Millionea week is not open for tickets.", { code: "INVALID", reason: "millionea_week_not_open" });

  // ── The slips (MR-9): every slip answers all fifteen.
  const n = buy.slips.length;
  if (n < 1) return refuse(`Answer all ${SLOT_COUNT} questions before you buy the ticket.`, { code: "INVALID", reason: "millionea_picks_incomplete" });
  let slips: MaswaliPick[][];
  try { slips = buy.slips.map((s) => [...canonicalPicks(s)]); } catch {
    return refuse(`Answer all ${SLOT_COUNT} questions before you buy the ticket.`, { code: "INVALID", reason: "millionea_picks_incomplete" });
  }
  const price = rules.ticketPriceTzs;
  const total = price * n;
  if (input.stake !== total) return refuse("The ticket price changed; refresh and try again.", { code: "INVALID", reason: "market_not_live" });
  if (n > rules.ticketCapPerWeek) {
    return refuse(`You can hold at most ${rules.ticketCapPerWeek} tickets a week.`, { code: "INVALID", reason: "millionea_cap_reached", detail: { ticketCap: rules.ticketCapPerWeek } });
  }
  // MB-62 · the sales pause, read FRESH (fail closed). It stops sales only — never a cancel, a settlement or a refund.
  if ((await readSalesPauseFresh()).paused) {
    return refuse("Millionea is paused for now.", { code: "INVALID", reason: "millionea_paused" });
  }
  // ⛔ A live desk designation, read before the wallet lock: a desk account never reaches the money. ⛔ A lookup that
  //    fails REFUSES (R10b, fail closed, as the house gate H1 does): nothing has moved, so the player is told exactly that
  //    and may retry the same key.
  let desk: Awaited<ReturnType<typeof houseBotStore.findLiveByUserId>>;
  try {
    desk = await houseBotStore.findLiveByUserId(userId);
  } catch (err) {
    console.error("[maswali-money] the desk check could not be read, so the purchase is refused:", (err as Error)?.message ?? err);
    return refuse("We're busy right now — your stake hasn't moved. Try again in a moment.", { code: "BUSY", reason: "system_busy", retryAfterSec: 1 });
  }
  if (desk) {
    return refuse("This account cannot buy Millionea tickets.", { code: "INVALID", reason: "millionea_account_ineligible" });
  }

  const keyOf = (i: number) => (input.idempotencyKey ? ticketKey(input.idempotencyKey, i) : null);
  type Done = { tickets: MaswaliTicketReceipt[]; balance: number; placedAt: string; replayed: boolean };
  let done: Done | Refused;
  try {
    done = await withLock(`wallet:${userId}`, async (lockTx): Promise<Done | Refused> => {
      // ── The replay (L2's in-lock half): the same key is the same purchase — answered with its receipt, never twice.
      if (input.idempotencyKey) {
        if (input.reach) input.reach.reached = true;
        const landed = await readLandedPurchase(userId, market.id, input.idempotencyKey, slips, lockTx);
        if (landed.kind === "conflict") {
          return refuse("This request id belongs to another bet.", { code: "INVALID", reason: "idempotency_key_conflict" });
        }
        if (landed.kind === "landed") {
          const w = await db.wallet.findByUserId(userId, lockTx);
          if (!w || !Number.isSafeInteger(w.balance) || w.balance < 0) throw new Error("The current balance could not be read.");
          return { tickets: landed.receipts, balance: w.balance, placedAt: landed.first.placedAt, replayed: true };
        }
      }
      const wallet = await db.wallet.findByUserId(userId, lockTx);
      if (!wallet || wallet.status !== "ACTIVE") {
        return refuse("Wallet unavailable.", { code: "NOT_FOUND", reason: wallet ? "wallet_frozen" : "wallet_missing" });
      }
      // ── The cap, counted in THIS lock (MR-11): one account's concurrent purchases are ordered here.
      const held = await ticketStore.countLiveForUser(week.id, userId, lockTx ?? undefined);
      if (held + n > rules.ticketCapPerWeek) {
        return refuse(`You already hold ${held} of ${rules.ticketCapPerWeek} tickets this week.`, {
          code: "INVALID", reason: "millionea_cap_reached", detail: { ticketCap: rules.ticketCapPerWeek },
        });
      }
      // ── The loss limit for the whole purchase (RG / GLI-19), read in the lock (audit C4).
      const loss = await checkLossLimit(userId, total, lockTx);
      if (!loss.allowed) {
        audit({ category: "COMPLIANCE", action: "bet.loss_limit_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { stake: total, reason: loss.reason, product: "MASWALI" } });
        return refuse(loss.reason ?? "Daily loss limit reached.", { code: "INVALID", reason: "loss_limit_daily" });
      }
      // ── Real balance only (MR-10): refused BEFORE any real/bonus split.
      if (wallet.balance < total) {
        return wallet.balance + (wallet.bonusBalance ?? 0) >= total
          ? refuse("Millionea is paid from the main balance only.", { code: "INVALID", reason: "millionea_bonus_refused", detail: { balance: wallet.balance } })
          : refuse("Not enough balance.", { code: "INVALID", reason: "balance_insufficient", detail: { balance: wallet.balance, needed: total } });
      }

      return withLock(`market:${market.id}`, async (mTx): Promise<Done | Refused> => {
        // ── The close, on the DATABASE clock, inside the lock (MB-31), before any money moves.
        const fresh = await weekStore.get(week.id);
        const nowMs = await dbNowMs(mTx);
        if (!fresh || fresh.state !== "OPEN" || nowMs >= Date.parse(fresh.closesAt)) {
          return refuse("Sales for this Millionea week have closed.", { code: "SELECTION_CLOSED", reason: "millionea_sales_closed" });
        }
        const placedAt = new Date(nowMs).toISOString();
        const receipts: MaswaliTicketReceipt[] = [];
        // R4a · the receipt's balance is the debit's own answer, read in this purchase's transaction: a read after it but
        // outside it sees the wallet BEFORE this purchase on Postgres (the memory store has no transaction to hide it).
        const balance = await withMoneyTx(async (tx) => {
          const debited = await db.wallet.adjust(wallet.id, { balance: -total }, { requireBalanceGte: total }, tx);
          if (!debited) throw new MaswaliAbort("NO_FUNDS");
          const firstForThisPlayer = (await positionStore.listForUserAndMarket(userId, market.id, tx)).length === 0 ? 1 : 0;
          await marketStore.addToPool(market.id, { yesPool: total, predictorCount: firstForThisPlayer }, tx);
          const soldBefore = await ticketStore.countAllForWeek(week.id, tx ?? undefined);
          const lines: LedgerLine[] = [];
          let balanceAfter = debited.balance + total;
          for (let i = 0; i < n; i++) {
            const positionId = `pos_${randomId(10)}`;
            const txnId = `txn_${randomId(12)}`;
            const ticketId = `mlt_${randomId(10)}`;
            const serial = serialOf(week, soldBefore + i + 1);
            const salt = newSalt();
            const leaf = leafHash({ weekId: week.id, ticketId, salt, picks: slips[i] });
            balanceAfter -= price;
            const position: StoredPosition = {
              id: positionId, userId, marketId: market.id, side: "YES", stake: price, bonusStakeTzs: 0, potentialPayout: 0,
              status: "OPEN", finalPayout: null, placedAt, settledAt: null, idempotencyKey: keyOf(i),
            };
            await positionStore.set(position, tx);
            await db.txn.create({
              id: txnId, walletId: wallet.id, userId, type: "BET_PLACED", status: "CONFIRMED", amount: -price, fee: 0, taxWithheld: 0,
              balanceAfter, currency: "TZS", provider: "INTERNAL", providerRef: null, msisdn: null,
              description: `Millionea ticket · ${week.code} · ${serial}`, positionId: position.id, amlReason: null,
              // SEAM:markerMaswaliBuy — a desk account never reaches here (refused above), kept so Ruling 232 has no exception.
              ...(position.houseBotId ? { houseBotId: position.houseBotId } : {}),
              createdAt: placedAt, updatedAt: placedAt, completedAt: placedAt,
            }, tx);
            await ticketStore.create({
              id: ticketId, positionId, cycleId: week.id, userId, serial, selections: slips[i], salt, selectionsHash: leaf,
              picksKey: picksKey(slips[i]), status: "LIVE", cancelledAt: null, closeAtPurchase: fresh.closesAt,
              rulesVersion: `${week.code}@${rules.frozenAt}`, score: null, won: null, payout: null, frozenReason: null,
              lastViewedAt: null, createdAt: placedAt,
            }, tx ?? undefined);
            lines.push(...stakeEntries({ txnId, userId, marketId: market.id, realPart: price, bonusPart: 0 }));
            receipts.push({ ticketId, positionId, serial, selectionsHash: leaf });
          }
          await weekStore.bumpTicketCount(week.id, n, tx ?? undefined);
          // ONE group for the whole purchase (MB-31), in the transaction: a ledger failure rolls the purchase back.
          await postMaswaliLines(`maswali_buy_${receipts[0].positionId}`, lines, tx);
          return debited.balance;
        });
        return { tickets: receipts, balance, placedAt, replayed: false };
      });
    });
  } catch (err) {
    if (err instanceof MaswaliAbort) return refuse("Not enough balance.", { code: "INVALID", reason: "balance_insufficient" });
    throw err;
  }
  if ("ok" in done) return done;
  if (!done.replayed) {
    audit({ category: "BET", action: "maswali.tickets.bought", actorId: userId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, marketId: market.id, count: done.tickets.length, total, serials: done.tickets.map((t) => t.serial) } });
  }
  return {
    ok: true,
    data: {
      positionId: done.tickets[0].positionId, balance: done.balance, payoutIfWin: 0, placedAt: done.placedAt, bonusStakeTzs: 0,
      ...(done.replayed ? { replayed: true as const } : {}),
      maswali: { weekId: week.id, tickets: done.tickets },
    },
  };
}

/**
 * ⭐ L2 FOR A PURCHASE · the tickets a player's key already bought, as their replay — or null, and the gate's refusal stands.
 * `buyPosition` asks this after a refusal made BEFORE the in-lock replay (maintenance came up, a break began, the session
 * limit): a purchase that landed and only lost its answer is answered with its receipt, never refused and never re-bought.
 * The same rules as `landedKeyAnswer`: only this player's own purchase of the very slips asked for again; a failed read
 * after an earlier attempt reached the wallet lock throws a neutral unknown outcome (the caller keeps its key); the
 * refusal is recorded beside the replay (`market.position.replayed`).
 */
export async function landedMaswaliAnswer(userId: string, req: { marketId: string; stake: number; idempotencyKey: string; buy: MaswaliBuy },
  refused: Refused, uncertain: boolean): Promise<MaswaliBuyResult | null> {
  let slips: MaswaliPick[][];
  try { slips = req.buy.slips.map((s) => [...canonicalPicks(s)]); } catch { return null; }
  if (slips.length < 1) return null;
  let landed = false;
  try {
    const found = await readLandedPurchase(userId, req.marketId, req.idempotencyKey, slips);
    if (found.kind !== "landed" || found.weekId !== req.buy.weekId) return null;
    if (found.receipts.length * found.first.stake !== req.stake) return null;
    landed = true;
    const w = await db.wallet.findByUserId(userId);
    if (!w || !Number.isSafeInteger(w.balance) || w.balance < 0) throw new Error("The current balance could not be read.");
    audit({ category: "BET", action: "market.position.replayed", actorId: userId, targetType: "Position", targetId: found.first.id,
      payload: { marketId: req.marketId, product: "MASWALI", tickets: found.receipts.length, stake: req.stake,
        refused: { code: refused.code ?? null, reason: refused.reason ?? null } } });
    return {
      ok: true,
      data: {
        positionId: found.first.id, balance: w.balance, payoutIfWin: 0, placedAt: found.first.placedAt, bonusStakeTzs: 0, replayed: true,
        maswali: { weekId: found.weekId, tickets: found.receipts },
      },
    };
  } catch {
    if (uncertain || landed) throw new Error("We could not confirm this bet's outcome.");
    return null;
  }
}

// ── THE FREE CANCEL (MR-12, RULES §2.6) ──────────────────────────────────────────────────────────────

/**
 * ⭐ CANCEL A TICKET INSIDE ITS FREE WINDOW — the platform's free exit, as ONE transaction that fails loudly: the wallet
 * credit, the CASHOUT transaction (fee 0), the position CASHED_OUT at its full stake, the pool, the ticket CANCELLED, the
 * week's count, and the ledger group. ⛔ Not `cashOutPosition`'s self-committing writes and fire-and-forget ledger.
 * The window is §2.6's, frozen in the week's `feeSnapshot`: it needs the runway (the ticket was bought with at least the
 * grace still ahead of the close) and it ends at or before the close. There is no paid exit (MB-50).
 */
export async function cancelMaswaliTicket(input: { userId: string; positionId: string }): Promise<
  { ok: true; data: { value: number; fee: number; balance: number } } | Refused> {
  const { userId } = input;
  try {
    const out = await withLock(`wallet:${userId}`, async (): Promise<{ value: number; balance: number } | Refused> => {
      const p = await positionStore.get(input.positionId);
      if (!p || p.userId !== userId) return refuse("That ticket can't be cancelled.", { code: "INVALID", reason: "not_your_position" });
      if (p.status !== "OPEN") return refuse("This ticket is no longer open.", { code: "INVALID", reason: "position_not_open" });
      const ticket = await ticketStore.getByPositionId(p.id);
      if (!ticket || ticket.status !== "LIVE") return refuse("This ticket is no longer open.", { code: "INVALID", reason: "position_not_open" });
      const week = await weekStore.get(ticket.cycleId);
      const market = await marketStore.get(p.marketId);
      if (!week || !market || week.state !== "OPEN") return refuse("The free cancel has ended.", { code: "INVALID", reason: "exit_window_closed" });
      const rates = snapshotOrLegacy(market.feeSnapshot);
      const facts = exitWindowFacts({ placedAtMs: Date.parse(p.placedAt), closesAtMs: Date.parse(ticket.closeAtPurchase), freeExitGraceMinutes: rates.freeExitGraceMinutes, paidExitWindowMinutes: 0 });
      return withLock(`market:${market.id}`, async (mTx): Promise<{ value: number; balance: number } | Refused> => {
        const nowMs = await dbNowMs(mTx);
        const freshWeek = await weekStore.get(week.id);
        if (!facts.hadRunway || nowMs >= facts.exitCloseAtMs || !freshWeek || freshWeek.state !== "OPEN" || nowMs >= Date.parse(freshWeek.closesAt)) {
          return refuse("The free cancel has ended.", { code: "INVALID", reason: "exit_window_closed" });
        }
        const wallet = await db.wallet.findByUserId(userId, mTx);
        if (!wallet || wallet.status !== "ACTIVE") return refuse("Wallet unavailable.", { code: "NOT_FOUND", reason: wallet ? "wallet_frozen" : "wallet_missing" });
        const value = p.stake;
        const at = new Date(nowMs).toISOString();
        const txnId = `txn_${randomId(12)}`;
        let balance = wallet.balance;
        await withMoneyTx(async (tx) => {
          const cancelled = await ticketStore.cancelTicket(ticket.id, at, tx ?? undefined);
          if (!cancelled) throw new MaswaliAbort("NOT_CANCELLABLE");
          const credited = await db.wallet.adjust(wallet.id, { balance: value }, undefined, tx);
          if (!credited) throw new Error("[maswali-money] the cancel's credit did not land");
          balance = credited.balance;
          await marketStore.addToPool(market.id, { yesPool: -value }, tx);
          await positionStore.set({ ...p, status: "CASHED_OUT", finalPayout: value, settledAt: at }, tx);
          await db.txn.create({
            id: txnId, walletId: wallet.id, userId, type: "CASHOUT", status: "CONFIRMED", amount: value, fee: 0, taxWithheld: 0,
            balanceAfter: balance, currency: "TZS", provider: "INTERNAL", providerRef: null, msisdn: null,
            description: `Millionea ticket cancelled · ${week.code} · ${ticket.serial} · free window, refunded in full`,
            positionId: p.id, amlReason: null, createdAt: at, updatedAt: at, completedAt: at,
            // SEAM:markerMaswaliCancel — a desk account never holds a ticket, kept so Ruling 232 has no exception.
            ...(p.houseBotId ? { houseBotId: p.houseBotId } : {}),
          }, tx);
          await weekStore.bumpTicketCount(week.id, -1, tx ?? undefined);
          await postMaswaliLines(`maswali_cancel_${txnId}`, cashoutEntries({ txnId, userId, marketId: market.id, value, fee: 0,
            rates: { traTaxOnCommissionRate: rates.traTaxOnCommissionRate, gbtLevyOnCommissionRate: rates.gbtLevyOnCommissionRate } }), tx);
        });
        audit({ category: "BET", action: "maswali.ticket.cancelled", actorId: userId, targetType: "MaswaliTicket", targetId: ticket.id,
          payload: { week: week.code, serial: ticket.serial, positionId: p.id, refunded: value } });
        return { value, balance };
      });
    });
    if ("ok" in out) return out;
    return { ok: true, data: { value: out.value, fee: 0, balance: out.balance } };
  } catch (err) {
    if (err instanceof MaswaliAbort) return refuse("This ticket is no longer open.", { code: "INVALID", reason: "position_not_open" });
    throw err;
  }
}
