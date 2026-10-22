/**
 * SMS TARGETS WHOSE ONE MESSAGE IS RESERVED BY ITS OWN ROW (MASWALI-BUILD S6, review round 3 A5; MB-93, OD-25).
 *
 * The batch writes every message's `SmsMessage` row BEFORE its request (`sendBatch`: rows first, HTTP second). For a target
 * listed here that row is the message's RESERVATION: both store twins write it with a plain insert, under the unique
 * partial index on ("targetType", "targetId") that migration `20261018120000_maswali_winner_sms_once` adds for these types —
 * so a second process's batch for a target that already has its row FAILS its write and sends nothing. ⛔ Never written
 * with `skipDuplicates` (the Prisma twin's default for a batch): that would drop the second row silently, and its message
 * would still go.
 * Pure and shared: `store.ts` (the memory twin), `prisma-dal.ts` and `maswali-winner-sms.ts` read this one list.
 */

/** The winner's one service SMS per player and week (`maswali-winner-sms.ts`): its target id is `<weekId>:<userId>`. */
export const WINNER_SMS_TARGET = "MaswaliWinner";

/** Every target type whose one message is reserved by its row. */
export const EXCLUSIVE_SMS_TARGETS: ReadonlySet<string> = new Set([WINNER_SMS_TARGET]);

/** True when this row's target allows exactly one message. */
export function isExclusiveSmsTarget(targetType: string | null | undefined): boolean {
  return typeof targetType === "string" && EXCLUSIVE_SMS_TARGETS.has(targetType);
}

/** The refusal of a second row for an exclusive target, as the memory twin throws it — with Postgres's own code for the
 *  unique index's answer, so one test reads both twins. */
export class SmsTargetTakenError extends Error {
  readonly code = "P2002";
  constructor(targetType: string) {
    super(`[store] smsMessage: target ${targetType} already has its one message — a second is refused (unique partial index)`);
    this.name = "SmsTargetTakenError";
  }
}

/**
 * ⭐ True when a batch's write failed because an exclusive target already had its row (MASWALI-BUILD S6, round 4, L5): the
 * memory twin's refusal, or Postgres's unique-index answer (P2002). The batch's rows are one statement, so none of its own
 * was written: a row there now is another process's message.
 */
export function isSmsTargetTaken(err: unknown): boolean {
  return err instanceof SmsTargetTakenError || (err as { code?: unknown } | null)?.code === "P2002";
}
