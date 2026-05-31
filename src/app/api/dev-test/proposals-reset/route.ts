/**
 * /api/dev-test/proposals-reset — dev-only: clears all proposals + votes so a
 * walkthrough's fresh proposals aren't buried under accumulated test data in
 * the score-sorted admin queue. Returns 404 in production.
 */
import { NextResponse } from "next/server";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const store = (globalThis as { __50PICK_STORE?: { proposals?: Map<string, unknown>; proposalVotes?: Map<string, unknown> } }).__50PICK_STORE;
  const cleared = store?.proposals?.size ?? 0;
  store?.proposals?.clear();
  store?.proposalVotes?.clear();
  return NextResponse.json({ ok: true, cleared });
}
