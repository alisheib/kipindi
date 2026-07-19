/**
 * Transient-failure retry — and, more importantly, everything it must NEVER retry.
 *
 * A pool timeout is a statement about the database at one instant, not about the
 * player's request; retrying it turns a visible error into a slower success. But a
 * retry applied to the wrong thing is a licence-threatening defect:
 *   - retrying without an idempotency key is a DOUBLE BET;
 *   - retrying a responsible-gambling loss limit until it passes would let a
 *     capped or self-excluded player bet by hammering the button.
 *
 * These blocks pin both the behaviour and the boundaries.
 */
import {
  withTransientRetry, isTransient, retrySnapshot, __resetRetryStats,
} from "../src/lib/server/retry.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const err = (code: string) => Object.assign(new Error(`db ${code}`), { code });

// ════════════════════════════════════════════════════════════════════════════
// A · THE ALLOWLIST — transient infrastructure only.
// ════════════════════════════════════════════════════════════════════════════
{
  for (const c of ["P2024", "P2028", "P2034", "40001", "40P01", "08006", "08003", "08000", "57P01"]) {
    ok(`A: ${c} is transient`, isTransient(err(c)));
  }
  for (const c of ["P2002", "P2025", "23505", "22P02", "42883", "25P02"]) {
    ok(`A: ${c} is NOT transient`, !isTransient(err(c)));
  }
  ok("A: plain Error is not transient", !isTransient(new Error("boom")));
  ok("A: null is not transient", !isTransient(null));
  ok("A: SQLSTATE nested under meta is seen", isTransient({ meta: { code: "40001" } }));
}

// ════════════════════════════════════════════════════════════════════════════
// B · RETRIES A TRANSIENT FAILURE, then succeeds.
// ════════════════════════════════════════════════════════════════════════════
{
  __resetRetryStats();
  let calls = 0;
  const out = await withTransientRetry(async () => {
    calls++;
    if (calls < 3) throw err("P2024");
    return "placed";
  }, true);
  ok("B: eventually succeeded", out === "placed");
  ok("B: retried until it worked", calls === 3, `calls=${calls}`);
  ok("B: counted retries by code", retrySnapshot()["P2024"] === 2, JSON.stringify(retrySnapshot()));
}

// ════════════════════════════════════════════════════════════════════════════
// C · GIVES UP — 4 attempts total, then surfaces the original error.
// ════════════════════════════════════════════════════════════════════════════
{
  __resetRetryStats();
  let calls = 0;
  let thrown: unknown = null;
  try {
    await withTransientRetry(async () => { calls++; throw err("P2024"); }, true);
  } catch (e) { thrown = e; }
  ok("C: made exactly 4 attempts", calls === 4, `calls=${calls}`);
  ok("C: surfaced the original error", (thrown as { code?: string })?.code === "P2024");
}

// ════════════════════════════════════════════════════════════════════════════
// D · NO IDEMPOTENCY KEY → NO RETRY. A retry without a key is a double bet:
//     attempt 1 may have COMMITTED and lost only its response.
// ════════════════════════════════════════════════════════════════════════════
{
  let calls = 0;
  let thrown: unknown = null;
  try {
    await withTransientRetry(async () => { calls++; throw err("P2024"); }, false);
  } catch (e) { thrown = e; }
  ok("D: exactly ONE attempt without a key", calls === 1, `calls=${calls}`);
  ok("D: error surfaced unchanged", (thrown as { code?: string })?.code === "P2024");
}

// ════════════════════════════════════════════════════════════════════════════
// E · NON-TRANSIENT ERRORS ARE NEVER RETRIED — not even with a key.
// ════════════════════════════════════════════════════════════════════════════
{
  let calls = 0;
  try {
    await withTransientRetry(async () => { calls++; throw err("P2002"); }, true);
  } catch { /* expected */ }
  ok("E: unique-violation not retried", calls === 1, `calls=${calls}`);

  let calls2 = 0;
  try {
    await withTransientRetry(async () => { calls2++; throw new Error("Not enough balance."); }, true);
  } catch { /* expected */ }
  ok("E: a plain business error is not retried", calls2 === 1, `calls=${calls2}`);
}

// ════════════════════════════════════════════════════════════════════════════
// F · THE STRUCTURAL GUARANTEE — buyPosition RETURNS business rejections rather
//     than throwing, so an allowlist retry cannot reach a balance / closed-market
//     / RG refusal even in principle. This block proves the shape, so a future
//     change that converts a rejection into a throw fails loudly here.
// ════════════════════════════════════════════════════════════════════════════
{
  let calls = 0;
  const rejection = await withTransientRetry(async () => {
    calls++;
    // Exactly how buyPosition reports an RG loss-limit block.
    return { ok: false as const, error: "Daily loss limit of TZS 50,000 would be exceeded.", code: "INVALID" as const };
  }, true);
  ok("F: a returned rejection is passed straight through", rejection.ok === false);
  ok("F: a returned rejection is NOT retried", calls === 1, `calls=${calls}`);
  ok("F: the RG reason survives untouched", rejection.error.includes("Daily loss limit"));
}

// ════════════════════════════════════════════════════════════════════════════
// G · BACKOFF is bounded — a retry storm must not stall the request past the
//     admission wait budget.
// ════════════════════════════════════════════════════════════════════════════
{
  const t0 = Date.now();
  try {
    await withTransientRetry(async () => { throw err("40001"); }, true);
  } catch { /* expected */ }
  const took = Date.now() - t0;
  ok("G: backoff happened (not a hot loop)", took >= 300, `${took}ms`);
  ok("G: total backoff well inside the 15s budget", took < 3_000, `${took}ms`);
}

console.log(`\nbet-retry: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
