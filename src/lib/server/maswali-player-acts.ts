/**
 * MASWALI MILLIONEA — THE PLAYER'S ACTS, AS A PAGE'S REQUEST MAKES THEM (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 items 2
 * and 7).
 *
 * The whole of each `/millionea` action after its session check (`src/app/millionea/actions.ts`), kept here so both
 * stores' suites drive the very path the slip's confirm and the ticket's cancel take, and each action stays one call —
 * `cashOutPositionFromForm`'s pattern (market-service).
 *
 * ⭐ THE PLATFORM'S FAILURE SHAPE, ALWAYS (`ServiceResult`): every refusal carries a registered `reason`
 *    (`failure-reasons.ts`), so a screen renders that reason's copy in the reader's language and never the English
 *    sentence beside it (FAILURE-INVENTORY §1.6). No reason is new: each is the money path's own, or a generic one.
 * ⛔ THE GATE FIRST: an act on a product the rollout hides from this viewer is refused before anything else is read
 *    (`millionea_not_available`) — the route 404s, and its action does not answer either (`millionea-gate.ts`).
 * ⛔ THE MONEY IS NOT HERE. A purchase is `purchaseMaswaliTickets` → the one bet path (every responsible-gambling gate,
 *    the cap in the wallet lock, the close on the database clock); a cancel is `cashOutPosition` → the free cancel
 *    (`cancelMaswaliTicket`). This file reads the form, refuses what is malformed, and maps the answer.
 */
import { frozenRules, purchaseMaswaliTickets } from "./maswali-service";
import { cashOutPosition } from "./market-service";
import { isMaswaliNotice, noticeStore, ticketStore, weekStore } from "./maswali-dal";
import { resolveMillioneaFor, type MillioneaViewerDeps } from "./millionea-preview";
import { millioneaCancelUntil, normalizeMillioneaSerial } from "./maswali-player";
import { emit } from "./event-bus";
import { db } from "./store";
import type { ServiceResult } from "./auth-service";
import { isHouseIntentKey } from "@/lib/house-bot/constants";
import { SLOT_COUNT, type MaswaliPick } from "@/lib/maswali-score";

/** What an action hands over: a `FormData`, or anything that answers `get` the same way (the suites). */
export type MillioneaForm = { get(name: string): unknown };

type Refusal = Extract<ServiceResult, { ok: false }>;

const NOT_AVAILABLE: Refusal = { ok: false, error: "Millionea is not available yet.", code: "INVALID", reason: "millionea_not_available" };
const NOT_OPEN: Refusal = { ok: false, error: "This Millionea week is not open for tickets.", code: "INVALID", reason: "millionea_week_not_open" };
const PICKS_INCOMPLETE: Refusal = {
  ok: false, error: `Answer all ${SLOT_COUNT} questions before you buy the ticket.`, code: "INVALID", reason: "millionea_picks_incomplete",
};
/** ⛔ One answer for "no such ticket" and "not yours" (MB-95): two answers would be an existence oracle. */
const NO_SUCH_TICKET: Refusal = { ok: false, error: "We couldn't find that ticket.", code: "NOT_FOUND", reason: "not_found" };

/** A request id as the confirm sheet mints it (one per confirmed slip, MB-51). ⛔ Never a `#`: the money path keys each
 *  ticket `<key>#i`, so a key carrying one could collide with another purchase's ticket. */
const KEY_RE = /^[A-Za-z0-9._:-]{8,128}$/;
/** A bound on the slips field before it is parsed: a request-size guard, not a rule a player reads. */
const SLIPS_MAX_CHARS = 20_000;

/** The slips as the confirm sheet posts them — one JSON field, an array of fifteen-answer arrays — or null. ⛔ Never
 *  coerced: anything that is not exactly that shape is refused as an incomplete slip (MR-9). */
function readSlips(raw: unknown): MaswaliPick[][] | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > SLIPS_MAX_CHARS) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const out: MaswaliPick[][] = [];
  for (const slip of parsed) {
    if (!Array.isArray(slip) || slip.length !== SLOT_COUNT || !slip.every((p) => p === "YES" || p === "NO")) return null;
    out.push(slip as MaswaliPick[]);
  }
  return out;
}

/** What a landed purchase answers the confirm sheet with — the stamp's serials, never a figure a ticket might win. */
export type MillioneaReceipt = {
  weekId: string;
  weekCode: string;
  tickets: Array<{ serial: string; positionId: string }>;
  /** The main balance after the purchase, read once it has committed. */
  balance: number;
  placedAt: string;
  /** The same request id answered again: nothing was charged twice (L2). */
  replayed: boolean;
  /** The free cancel's end for these tickets ("Ghairi hadi 14:07"), or null when they have none (RULES §2.6). */
  cancelUntil: string | null;
};

/**
 * ⭐ BUY THE SLIP'S TICKETS. The form carries `expectedOwnerId` (the account the page showed), `weekId` (the week on sale),
 * `idempotencyKey` (one per confirmed slip) and `slips` (JSON: one array of fifteen "YES"/"NO" per ticket).
 *   · ⛔ an account that changed since the page rendered is refused — a page drawn for A never debits B;
 *   · the gate, then the week: one of the line the rollout sells to this viewer, never a week id from another line;
 *   · the key and the slips, checked here; the week's state, the cap, the price and everything with money, by the
 *     purchase itself.
 */
export async function buyMillioneaFromForm(
  userId: string,
  form: MillioneaForm,
  opts: { playStartedAt?: number; deps?: MillioneaViewerDeps; now?: Date } = {},
): Promise<ServiceResult<MillioneaReceipt>> {
  if (form.get("expectedOwnerId") !== userId) {
    return { ok: false, error: "The account changed. Reload before continuing.", code: "CONFLICT", reason: "signin_required" };
  }
  const deps = opts.deps ?? {};
  const access = await resolveMillioneaFor({ sessionUserId: userId }, deps);
  if (!access.visible) return NOT_AVAILABLE;
  // A week of the line this rollout sells to this viewer: the public line at ACTIVE, the private drive at STAFF_PREVIEW
  // (OD-21) — never a drive week to the public, whatever id a request names. Its STATE is the purchase's to judge: a week
  // past its close refuses a new purchase, and still answers a same-key retry with the purchase that landed (MB-31, L2).
  const weekId = form.get("weekId");
  const week = typeof weekId === "string" && weekId.length > 0 ? await weekStore.get(weekId) : null;
  if (!week) return NOT_OPEN;
  if (week.visibility === "DRIVE" ? access.state !== "STAFF_PREVIEW" : access.state !== "ACTIVE") {
    return week.visibility === "DRIVE" ? NOT_OPEN : NOT_AVAILABLE;
  }
  const rules = frozenRules(week);
  if (!rules) return NOT_OPEN;

  const key = form.get("idempotencyKey");
  if (typeof key === "string" && isHouseIntentKey(key)) {
    return { ok: false, error: "This request id is reserved.", code: "INVALID", reason: "idempotency_key_conflict" };
  }
  if (typeof key !== "string" || !KEY_RE.test(key)) {
    return { ok: false, error: "The purchase carried no request id, so nothing was charged. Reload and try again.", code: "INVALID", reason: "unknown_failure" };
  }
  const slips = readSlips(form.get("slips"));
  if (!slips) return PICKS_INCOMPLETE;
  if (slips.length > rules.ticketCapPerWeek) {
    return { ok: false, error: `You can hold at most ${rules.ticketCapPerWeek} tickets a week.`, code: "INVALID", reason: "millionea_cap_reached", detail: { ticketCap: rules.ticketCapPerWeek } };
  }

  const r = await purchaseMaswaliTickets({
    userId, weekId: week.id, slips, idempotencyKey: key, playStartedAt: opts.playStartedAt, stateNow: deps.stateNow,
  });
  if (!r.ok) return r;
  const bought = r.data?.maswali;
  if (!r.data || !bought) return { ok: false, error: "We could not confirm this purchase. Open your tickets before trying again.", code: "INVALID", reason: "system_error" };
  // R4 (a) · the money path's receipt balance is read beside its own transaction; this one is read after it committed.
  let balance = r.data.balance;
  try { balance = (await db.wallet.findByUserId(userId))?.balance ?? balance; } catch { /* the receipt's own figure stands */ }
  return {
    ok: true,
    data: {
      weekId: week.id, weekCode: week.code,
      tickets: bought.tickets.map((t) => ({ serial: t.serial, positionId: t.positionId })),
      balance, placedAt: r.data.placedAt, replayed: r.data.replayed === true,
      cancelUntil: await millioneaCancelUntil(week.id, r.data.placedAt, opts.now).catch(() => null),
    },
  };
}

/**
 * ⭐ CANCEL ONE TICKET INSIDE ITS FREE WINDOW. The form carries `serial`. ⛔ A serial that is not the viewer's answers as
 * one that does not exist. The money is the platform's free cancel, behind the cash-out door's own rate limit.
 */
export async function cancelMillioneaFromForm(
  userId: string,
  form: MillioneaForm,
  opts: { deps?: MillioneaViewerDeps } = {},
): Promise<ServiceResult<{ serial: string; refunded: number; balance: number }>> {
  const access = await resolveMillioneaFor({ sessionUserId: userId }, opts.deps ?? {});
  if (!access.visible) return NOT_AVAILABLE;
  const serial = normalizeMillioneaSerial(form.get("serial"));
  const ticket = serial ? await ticketStore.getBySerial(serial) : null;
  if (!ticket || ticket.userId !== userId) return NO_SUCH_TICKET;
  const r = await cashOutPosition(userId, ticket.positionId);
  if (!r.ok) return r;
  if (!r.data) return { ok: false, error: "We could not confirm this cancel. Open the ticket before trying again.", code: "INVALID", reason: "system_error" };
  // The pill hears the refund at once (the free cancel itself publishes nothing).
  emit("wallet:balance", { userId, balance: r.data.balance });
  return { ok: true, data: { serial: ticket.serial, refunded: r.data.value, balance: r.data.balance } };
}

/**
 * §7b item 7 · the owner has SEEN their ticket: its facts so far rest from now on. Moves forward only — an older stamp
 * never replaces a newer one. False when nothing was recorded (hidden product, not theirs, already seen since).
 */
export async function markMillioneaTicketSeenFor(
  userId: string,
  serial: unknown,
  opts: { at?: Date; deps?: MillioneaViewerDeps } = {},
): Promise<boolean> {
  const access = await resolveMillioneaFor({ sessionUserId: userId }, opts.deps ?? {});
  if (!access.visible) return false;
  const s = normalizeMillioneaSerial(serial);
  const t = s ? await ticketStore.getBySerial(s) : null;
  if (!t || t.userId !== userId) return false;
  const at = opts.at ?? new Date();
  if (t.lastViewedAt && Date.parse(t.lastViewedAt) >= at.getTime()) return false;
  await ticketStore.patch(t.id, { lastViewedAt: at.toISOString() });
  return true;
}

/** §7b item 7 · the player has SEEN a week's hub notice (ROLLOVER, WEEK_VOID, RESULT): it never performs again for them. */
export async function markMillioneaNoticeSeenFor(
  userId: string,
  weekId: unknown,
  notice: unknown,
  opts: { at?: Date; deps?: MillioneaViewerDeps } = {},
): Promise<boolean> {
  const access = await resolveMillioneaFor({ sessionUserId: userId }, opts.deps ?? {});
  if (!access.visible || !isMaswaliNotice(notice) || typeof weekId !== "string" || weekId.length === 0) return false;
  const week = await weekStore.get(weekId);
  if (!week) return false;
  return noticeStore.markSeen(userId, week.id, notice, (opts.at ?? new Date()).toISOString());
}
