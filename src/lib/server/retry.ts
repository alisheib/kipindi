/**
 * Transient-failure retry for the bet path.
 *
 * A pool timeout or a serialization failure is a statement about the DATABASE at
 * one instant, not about the player's request. Retrying it turns a visible error
 * into a slightly slower success. Retrying anything ELSE would be a serious bug,
 * so this module is deliberately narrow.
 *
 * ── WHERE IT SITS (both placements are load-bearing) ──────────────────────────
 *  • INSIDE admission — a retry must not go to the back of the queue it already
 *    paid to get through. It holds its slot across attempts.
 *  • OUTSIDE withLock — each attempt needs a FRESH transaction. Retrying inside a
 *    transaction that already failed is `25P02` (current transaction is aborted,
 *    commands ignored) on every subsequent statement.
 *
 * ── NO IDEMPOTENCY KEY → NO RETRY ────────────────────────────────────────────
 * A retry without a key is a DOUBLE BET: attempt 1 may have committed and lost
 * only its response, and attempt 2 has no way to recognise that. With a key,
 * buyPosition's `findByIdempotencyKey` probe returns the existing position and the
 * retry is a no-op. Without one we make exactly one attempt and surface the error.
 * We NEVER synthesise a key server-side — a server-minted key is unique per
 * attempt, so it would defeat the very check it appears to satisfy.
 *
 * ── WHY BUSINESS REJECTIONS CANNOT BE RETRIED ────────────────────────────────
 * buyPosition RETURNS its business rejections ({ ok: false, code }) and only
 * THROWS on infrastructure failure. Since this wrapper retries on thrown errors
 * matched against an allowlist, an insufficient-balance, market-closed, or
 * responsible-gambling refusal structurally cannot reach it — it is a return
 * value, not an exception.
 *
 * KEEP IT THAT WAY. Retrying a responsible-gambling loss limit until it happens
 * to pass is a licence-threatening defect: it would let a self-excluded or
 * capped player bet by hammering the button. If a future change ever converts an
 * RG or balance rejection into a throw, it MUST NOT be added to this allowlist.
 */

/**
 * Transient infrastructure failures only.
 *   P2024 — Prisma: timed out fetching a connection from the pool
 *   P2028 — Prisma: transaction API error (expired / could not start)
 *   P2034 — Prisma: write conflict or deadlock, "please retry"
 *   40001 — Postgres: serialization_failure
 *   40P01 — Postgres: deadlock_detected
 *   08006 / 08003 / 08000 — connection failure / does-not-exist / exception
 *   57P01 — admin_shutdown (Postgres restarted or failed over under us)
 */
const RETRYABLE = new Set([
  "P2024", "P2028", "P2034",
  "40001", "40P01",
  "08006", "08003", "08000",
  "57P01",
]);

const DELAYS_MS = [50, 150, 400];      // 4 attempts total
const JITTER = 0.3;                     // ±30%, so a burst doesn't retry in lockstep

export function isTransient(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; meta?: { code?: unknown } };
  const code = typeof e.code === "string" ? e.code : undefined;
  if (code && RETRYABLE.has(code)) return true;
  // Postgres SQLSTATE sometimes arrives nested under meta rather than at top level.
  const metaCode = typeof e.meta?.code === "string" ? e.meta.code : undefined;
  return !!metaCode && RETRYABLE.has(metaCode);
}

function jittered(ms: number): number {
  const delta = ms * JITTER;
  return Math.max(0, Math.round(ms - delta + Math.random() * delta * 2));
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type RetryStats = { attempts: number; retriedCodes: string[] };

/** Counts retries by error code, for the operator card. */
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_RETRY_STATS: Map<string, number> | undefined;
}
const retryCounts: Map<string, number> = globalThis.__50PICK_RETRY_STATS ?? (globalThis.__50PICK_RETRY_STATS = new Map());

export function retrySnapshot(): Record<string, number> {
  return Object.fromEntries(retryCounts);
}
export function __resetRetryStats(): void { retryCounts.clear(); }

/**
 * Run `fn`, retrying ONLY transient infrastructure errors.
 *
 * @param retryable pass FALSE when the caller has no idempotency key. One attempt
 *   is then made and any error surfaces unchanged. This is not an optimisation —
 *   it is what stops a retry from becoming a double bet.
 */
export async function withTransientRetry<T>(fn: () => Promise<T>, retryable: boolean): Promise<T> {
  if (!retryable) return fn();

  let lastErr: unknown;
  for (let attempt = 0; attempt <= DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === DELAYS_MS.length) throw err;
      const code = String((err as { code?: unknown }).code ?? "unknown");
      retryCounts.set(code, (retryCounts.get(code) ?? 0) + 1);
      await sleep(jittered(DELAYS_MS[attempt]));
    }
  }
  throw lastErr;
}
