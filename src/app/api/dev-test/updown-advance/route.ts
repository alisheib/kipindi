/**
 * /api/dev-test/updown-advance — drive every RUNNING Up & Down chain across one
 * boundary, without waiting for a timer.
 *
 * Exists so a visual/E2E run can produce a REAL open round in seconds instead of
 * sitting for five minutes. It calls the same `runDueChainTransitions` the scheduler
 * calls, so it exercises the production path rather than a fixture.
 *
 * ⚠️ Returns 404 in production, and is double-gated at the edge (proxy.ts blocks the
 * whole /api/dev-test/* tree). It moves no money by itself — a boundary with no
 * confirmed price simply leaves the round pending, exactly as in production.
 */
import { NextResponse } from "next/server";
import { runDueChainTransitions, getUpDownSchedulerHealth } from "@/lib/server/updown-scheduler";
import { chainStore, roundStore } from "@/lib/server/updown-dal";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }

  // Force every running chain to be due, so one call reliably advances the grid even
  // when the next real boundary is minutes away.
  const running = await chainStore.running().catch(() => []);
  for (const c of running) {
    await chainStore.patch(c.id, { nextBoundaryAt: new Date(Date.now() - 1000).toISOString() });
  }

  const r = await runDueChainTransitions();
  const rounds = await Promise.all(
    running.map(async (c) => ({
      chainId: c.id,
      durationMinutes: c.durationMinutes,
      rounds: (await roundStore.list({ chainId: c.id, limit: 3 })).map((x) => ({
        id: x.id, roundNumber: x.roundNumber, opensAt: x.opensAt, closesAt: x.closesAt,
        openPrice: x.openPrice, closePrice: x.closePrice, outcome: x.outcome,
      })),
    })),
  );

  return NextResponse.json({ ok: true, advanced: r.advanced, chains: running.length, rounds, scheduler: getUpDownSchedulerHealth() });
}
