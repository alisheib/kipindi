/**
 * /api/diagnostic/last-error — returns the last 20 server render errors
 * captured by instrumentation.ts. Shows the ACTUAL error message and stack
 * that Next.js hides in production. No auth required — these are server
 * errors, not user data.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const g = globalThis as unknown as { __50PICK_LAST_ERRORS?: unknown[] };
  const errors = g.__50PICK_LAST_ERRORS ?? [];
  return NextResponse.json({
    count: errors.length,
    errors,
    hint: errors.length === 0
      ? "No server render errors captured yet. Navigate to a broken page first, then reload this endpoint."
      : "These are the actual server-side errors. The 'error' field shows what Next.js hides behind the digest.",
  });
}
