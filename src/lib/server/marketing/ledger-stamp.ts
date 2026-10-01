import { randomBytes } from "crypto";

/**
 * THE CONSENT LEDGER'S CLOCK — the `id` and `createdAt` of every `MessagingConsent` row.
 *
 * 🔴 WHY THIS EXISTS (S10, 2026-10-01). Both twins answer `latestFor` by `createdAt desc, id desc`,
 * and the id used to be `randomUUID()`. `createdAt` is millisecond-precise, so two appends in one
 * millisecond tied on it and the tie went to whichever random id sorted higher. Measured on the
 * shipped tree (S8, 2026-09-28): 396 of 400 back-to-back appends shared a millisecond, and 46% of
 * those answered GIVEN when the person's latest word was WITHDRAWN — in both twins, which agreed
 * with each other and were wrong together, so `test:dal-parity` could not see it. For a player the
 * send gate is held up by two records ahead of the ledger; for a non-player (the contact book, U18)
 * the ledger is the ONLY record, so a coin flip there texts somebody who said stop.
 *
 * ⭐ THE FIX IS AN ORDER THAT CANNOT TIE. Every stamp is strictly later than the one before it in
 * this process: `createdAt` never steps backwards (a clock that does is held at the last value), and
 * within one millisecond the id carries a counter. The id is FIXED-WIDTH LOWERCASE HEX — the clock in
 * 12 digits, the counter in 6, then 14 random — so byte order, `localeCompare` and Postgres' `en_US`
 * collation all sort it the same way (no separator a collation could skip), and `createdAt desc, id
 * desc` is exactly the order the rows were written.
 *
 * ⛔ PINNED ON `globalThis`, because Next can bundle one server module into more than one chunk and
 * the two writers (`consent-ledger.ts`, `optout-service.ts`) must share one clock, not one each.
 * ⚠️ The order is per PROCESS: two instances writing the same person in the same millisecond are a
 * real race with no "latest" to find. Production runs one instance.
 * ⛔ Every `db.messagingConsent.create(` takes its id and createdAt from here — `test:dal-parity` §20.
 */
type LedgerClock = { ms: number; seq: number };

declare global {
  var __50PICK_LEDGER_CLOCK: LedgerClock | undefined;
}

const clock: LedgerClock = globalThis.__50PICK_LEDGER_CLOCK ?? (globalThis.__50PICK_LEDGER_CLOCK = { ms: 0, seq: 0 });

/** 2^24 stamps fit in one millisecond; the 2^24+1-th borrows the next one rather than wrapping. */
const SEQ_MAX = 0xffffff;

/** `now` is injectable so the suite can step the clock backwards; the writers never pass it. */
export function ledgerStamp(now: number = Date.now()): { id: string; createdAt: string } {
  if (now > clock.ms) {
    clock.ms = now;
    clock.seq = 0;
  } else if (clock.seq < SEQ_MAX) {
    clock.seq += 1;
  } else {
    clock.ms += 1;
    clock.seq = 0;
  }
  const id = clock.ms.toString(16).padStart(12, "0") + clock.seq.toString(16).padStart(6, "0") + randomBytes(7).toString("hex");
  return { id, createdAt: new Date(clock.ms).toISOString() };
}
