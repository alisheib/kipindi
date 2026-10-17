/**
 * MASWALI MILLIONEA — THE POOL FIGURE, LIVE (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 6, MR-28, MB-31, MB-56, MB-97).
 *
 * When a week's pool figure moves — a sale, a free cancel, the open, the close, or an earlier week settling, voiding or
 * forfeiting a share (the carry it waits on becomes known), or the guarantee changing (whether the floor may be shown) —
 * the caller NOTES it here, and the figure is re-derived on the server from the week's frozen rules and the ledger
 * (`maswali-player.ts → maswaliPoolFigure`) and published on the bus as `maswali:pool`.
 * ⛔ NEVER STORED: a frame carries the derivation of its moment, and the hub's next render derives the figure again.
 * ⭐ COALESCED PER WEEK (MB-31's Friday rush): the first change of a burst arms one timer for its week, every change inside
 *    the window rides it, and the frame is derived when the timer fires — so a thousand sales a minute are a frame every
 *    few seconds, and each frame reads the state committed by then (a note made inside a lock fires long after it commits).
 * ⛔ PUBLIC FIGURES ONLY: no ticket, pick, holder or count of who is still in (OD-24). A frame names its week's line, and
 *    `/api/events` forwards it only to its audience (`millionea-preview.ts → forwardMillioneaPool`): a PUBLIC week's to a
 *    viewer the rollout admits, a DRIVE week's to stored staff at STAFF_PREVIEW — never the public (S5 review M1).
 * ⛔ NEVER LOAD-BEARING: a note is synchronous and total, and a frame that fails is a missed live update — the page still
 *    renders the truth. Nothing here takes a lock or writes anything.
 */
import { emit } from "./event-bus";

/** How long a burst of changes to one week rides one frame. A platform cadence, not a rule a player reads. */
const COALESCE_MS = 2_000;

/** The key of a note that names no week: every unsettled week's figure is derived again. */
const EVERY_WEEK = "*";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MLN_POOL_FEED: Map<string, ReturnType<typeof setTimeout>> | undefined;
}
const pending = (globalThis.__50PICK_MLN_POOL_FEED ??= new Map<string, ReturnType<typeof setTimeout>>());

/**
 * ⭐ NOTE THAT A WEEK'S POOL FIGURE MAY HAVE MOVED — `weekId`, or every unsettled week when none is named (a settlement,
 * a week void, a forfeit or a guarantee movement changes what the NEXT week counts). Synchronous; never throws.
 */
export function noteMaswaliPoolChanged(weekId?: string | null): void {
  try {
    const key = weekId || EVERY_WEEK;
    if (pending.has(key)) return;
    const timer = setTimeout(() => {
      pending.delete(key);
      void publish(key === EVERY_WEEK ? null : key);
    }, COALESCE_MS);
    // A pending frame never keeps a finished process (a script, a suite) alive.
    timer.unref?.();
    pending.set(key, timer);
  } catch { /* a live update is never load-bearing */ }
}

/** Derive and publish. The read model is imported when a frame fires, so this module costs its callers nothing at load. */
async function publish(weekId: string | null): Promise<void> {
  try {
    const { maswaliPoolFigure, unsettledMaswaliWeekIds } = await import("./maswali-player");
    const ids = weekId ? [weekId] : await unsettledMaswaliWeekIds();
    for (const id of ids) {
      const figure = await maswaliPoolFigure(id).catch(() => null);
      if (figure) emit("maswali:pool", figure);
    }
  } catch { /* a missed frame; the next render derives the figure again */ }
}

/** ⚠️ TEST SEAM ONLY: the weeks with a frame armed, and a way to fire them now instead of after the window. */
export function __pendingPoolFrames(): string[] {
  return [...pending.keys()];
}
export async function __flushPoolFramesForTests(): Promise<void> {
  const keys = [...pending.keys()];
  for (const key of keys) {
    const t = pending.get(key);
    if (t) clearTimeout(t);
    pending.delete(key);
  }
  for (const key of keys) await publish(key === EVERY_WEEK ? null : key);
}
