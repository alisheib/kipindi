/**
 * Dev/test-only endpoint that settles every OPEN Mapigo round so the demo user
 * can place a fresh bet. Gated by `isDemoModeAllowed()` — returns 403 in prod.
 *
 * Used by `scripts/mapigo-stress.mjs` to reset round state between tests.
 */
import { NextResponse } from "next/server";
import { isDemoModeAllowed } from "@/lib/server/demo-mode";
import { db } from "@/lib/server/store";
import { settleRound } from "@/lib/server/mapigo-service";

export async function POST() { return run(); }
export async function GET()  { return run(); }

async function run() {
  if (!isDemoModeAllowed()) {
    return NextResponse.json({ ok: false, error: "Demo disabled" }, { status: 403 });
  }
  const open = db.mapigoRound.listOpen();
  let settled = 0;
  for (const round of open) {
    const r = await settleRound(round.id, "SPIKE");
    if (r.ok) settled++;
  }
  return NextResponse.json({ ok: true, settled });
}
