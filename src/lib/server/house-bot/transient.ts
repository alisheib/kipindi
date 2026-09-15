/**
 * WHICH FAILURES ARE THE INFRASTRUCTURE'S, NOT THE ENGINE'S (04 A10, N1 §4.3 MON-10).
 *
 * ⛔ WHY A WIDER LIST THAN `retry.ts`. `isTransient` is the player bet path's retry allowlist and is kept narrow on
 * purpose. The engine needs a different question answered: "should this failure count toward POISON and the error
 * streak that switches house bots OFF?" A lock timeout, a cancelled statement, a failover or a dropped connection
 * says nothing about the intent — counting them would turn a database blip into ENGINE_ERRORS and a master OFF
 * (ENG-11). So `isEngineTransient` is `isTransient` plus the codes below, plus admission shedding.
 *
 * A transient failure requeues the row with backoff and `transientAttempts + 1`; it never counts toward `attempts`.
 */
import { isTransient } from "../retry";
import { AdmissionBusy } from "../admission";

/** 04 A10: the codes `retry.ts` does not retry but the engine must not blame on an intent. */
export const ENGINE_TRANSIENT_CODES = [
  // Postgres: lock_not_available (the house branch's lock_timeout), query_canceled, admin/crash shutdown.
  "55P03",
  "57014",
  "57P02",
  "57P03",
  // Prisma: can't reach the server, connection timed out, operation timed out, server closed the connection.
  "P1001",
  "P1002",
  "P1008",
  "P1017",
] as const;

export function isEngineTransient(err: unknown): boolean {
  if (err instanceof AdmissionBusy) return true;
  if (isTransient(err)) return true;
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; meta?: { code?: unknown } };
  const codes = [e.code, e.meta?.code].filter((c): c is string => typeof c === "string");
  return codes.some((c) => (ENGINE_TRANSIENT_CODES as readonly string[]).includes(c));
}

/** MON-10: the backoff for the n-th transient requeue (1 s, 5 s, 15 s, then 45 s for every later one). */
export function transientBackoffMs(transientAttempts: number, schedule: readonly number[]): number {
  const i = Math.min(Math.max(0, Math.floor(transientAttempts)), schedule.length - 1);
  return schedule[i] * 1000;
}
