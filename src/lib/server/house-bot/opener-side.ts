/**
 * THE OPENER SIDE — drawn once per market, shared by Enter now and the automated OPENER (04 N1 §4.1, MON-16).
 *
 * An empty poll has no thin side, so the house enters it on a side drawn at random. The draw is a durable
 * `OPENER_SIDE_DRAWN` event: a preview shows it, and every later look at that market — a new preview, a cancel,
 * another bot, another day, the planner — reads the same side back. Re-rolling would let staff reopen a preview
 * until the side they wanted came up.
 *
 * ⛔ ITS OWN AUTOCOMMIT STATEMENT. The draw refuses to run inside a lock or a lock's transaction (`locks.ts`): a
 * rollback there could undo a side someone has already been shown.
 *
 * ⛔ NEVER RE-ROLLED. The partial unique index `hbe_opener_draw_uq` keeps the first row; a later call inserts
 * nothing and reads that row back (`houseBotEventStore.drawOpenerSide`).
 *
 * Callers read the blackout first and draw only when both raw pools are 0 and the market is not blacked out.
 */
import { randomInt as cryptoRandomInt } from "node:crypto";
import { currentLockTx, inLock } from "../locks";
import { houseBotEventStore, type OpenerDrawnFor } from "../house-bot-dal";

export type OpenerSide = "YES" | "NO";

export type OpenerDraw = {
  side: OpenerSide;
  /** Who the FIRST draw was for — kept from that row, never the current caller. */
  drawnFor: OpenerDrawnFor;
  /** When the first draw was written. */
  drawnAt: string;
  eventId: string;
  /** True only for the call that wrote the row. */
  drawn: boolean;
};

/** `randomInt(2)` → 0 or 1, as `crypto.randomInt`; a test injects a fixed answer. */
export type DrawRandomInt = (maxExclusive: number) => number;

export async function openerSide(
  marketId: string,
  opts: { houseBotId: string | null; actorId: string | null; drawnFor: OpenerDrawnFor },
  deps: { randomInt?: DrawRandomInt } = {},
): Promise<OpenerDraw> {
  if (inLock() || currentLockTx()) {
    throw new Error("openerSide: the opener draw is its own autocommit statement and never runs inside a lock");
  }
  const pick = (deps.randomInt ?? cryptoRandomInt)(2);
  if (pick !== 0 && pick !== 1) throw new Error(`openerSide: randomInt(2) answered ${String(pick)}`);
  const res = await houseBotEventStore.drawOpenerSide({
    marketId, houseBotId: opts.houseBotId, side: pick === 0 ? "YES" : "NO", actorId: opts.actorId, drawnFor: opts.drawnFor,
  });
  const row = await houseBotEventStore.findOpenerDraw(marketId);
  if (!row || row.id !== res.eventId) throw new Error("openerSide: the opener draw could not be read back");
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const side = payload.side;
  if ((side !== "YES" && side !== "NO") || side !== res.side) throw new Error("openerSide: the stored opener draw has no valid side");
  return { side, drawnFor: payload.drawnFor as OpenerDrawnFor, drawnAt: row.createdAt, eventId: row.id, drawn: res.drawn };
}
