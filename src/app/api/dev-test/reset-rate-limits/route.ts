/**
 * /api/dev-test/reset-rate-limits — dev-only reset of every rate-limit
 * bucket. Used by the regulator-audit / break-it test suites between
 * sections so the per-IP throttle (which is real and correct in
 * production) doesn't accumulate across an entire test run.
 *
 * Returns 404 in production — never reachable on a live deployment.
 */
import { NextResponse } from "next/server";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_RL_RESET_HOOK: (() => number) | undefined;
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const cleared = (globalThis.__50PICK_RL_RESET_HOOK ?? (() => 0))();
  return NextResponse.json({ ok: true, cleared });
}

export async function GET() {
  return POST();
}
