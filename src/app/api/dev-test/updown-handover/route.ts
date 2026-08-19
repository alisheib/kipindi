/**
 * /api/dev-test/updown-handover — drive a REAL settle-and-succeed in two calls.
 *
 * ⭐ WHY THIS EXISTS, AND WHY `updown-advance` COULD NOT DO IT. E-166's whole subject is the
 * instant round N settles and round N+1 takes the screen. On production those two happen inside
 * ONE `advanceChain` call, and the successor's `opensAt` is already ~91 seconds in the PAST
 * (measured: median −91.5s over 1,203 settles). A driver that cannot reproduce that shape can
 * only test the 1.3% case.
 *
 * `updown-advance` forces `nextBoundaryAt = now − 1s`, so the round it opens closes a whole SPAN
 * in the future — four minutes for the shortest chain the platform offers. Worse, the round's
 * `boundaryAt` then never equals the chain's next GRID boundary, so `advanceChain`'s close arm
 * (`current.boundaryAt === boundaryIso`) never matches and that round can only ever be voided by
 * the healer. Useful for standing a board up; useless for watching one hand over.
 *
 * ⛔ AND THE ROUND'S INSTANTS ARE NOT PATCHABLE, BY DESIGN. `ROUND_PATCHABLE` deliberately omits
 * `opensAt` / `closesAt` / `boundaryAt` because *"a later write could move a live round's
 * boundaries"* — a money guard. This endpoint does NOT widen it. It moves the CHAIN's next
 * boundary (which `updown-advance` already does) and injects `advanceChain`'s own `now`, which
 * that function accepts precisely so a suite can drive a calendar it cannot wait for. Every
 * round here is created and settled by the production service functions, unmodified.
 *
 *   POST { phase: "arm", leadSeconds? }  → open a round almost all of whose window is already
 *                               spent, so it closes `leadSeconds` from now (default 80).
 *   POST { phase: "settle" }  → settle it AND open its successor, in one advanceChain call.
 *                               The successor's `opensAt` IS the predecessor's close, which by
 *                               then is in the past — the exact production shape.
 *
 * ⛔ WHY `leadSeconds` EXISTS AND WHY IT IS NOT ZERO. The first version of this endpoint opened
 * a round whose window was ALREADY OVER, so the whole cycle needed no waiting at all — and
 * `createMarket` rightly threw *"Cannot create a market with a past or invalid resolution
 * date."* That guard is correct and is not weakened here: a round IS a market, and a market
 * whose resolution is already behind it is not a thing this platform may create. So the round
 * is opened with its close a short way ahead, the driver waits out those seconds, and the E2E
 * gets the REAL sequence — open · locked · closed · settled · handed over — rather than a
 * shortcut past the guard.
 *
 * ⚠️ 404 in production, and double-gated at the edge by `proxy.ts`.
 */
import { NextResponse } from "next/server";
import { chainStore, roundStore } from "@/lib/server/updown-dal";
import { advanceChain } from "@/lib/server/updown-service";
import { setChainState } from "@/lib/server/updown-config";
import { roundSpanMinutes } from "@/lib/updown-durations";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const phase: string =
    body?.phase === "settle" ? "settle"
    : body?.phase === "stop" ? "stop"
    : body?.phase === "start" ? "start"
    : "arm";

  // ⭐ `stop` / `start` exist so the visual sweep can photograph the HONEST NO-NEXT-MATCH state
  // — the one five of nineteen live chains are in right now. It goes through `setChainState`,
  // the same service function the admin console calls, so a state this produces is a state an
  // operator can produce. ⚠️ `chainStore.list()` here, not `running()`, because a stopped chain
  // is by definition not in the running set and `start` must be able to find it again.
  if (phase === "stop" || phase === "start") {
    const all = await chainStore.list().catch(() => []);
    const done: Array<Record<string, unknown>> = [];
    for (const c of all) {
      const r = await setChainState(c.id, phase === "stop" ? "STOPPED" : "RUNNING", "dev_test_handover");
      done.push({ chainId: c.id, durationMinutes: c.durationMinutes, ok: r.ok, error: r.ok ? undefined : r.error });
    }
    return NextResponse.json({ ok: true, phase, chains: all.length, out: done });
  }

  const running = await chainStore.running().catch(() => []);
  const out: Array<Record<string, unknown>> = [];

  for (const c of running) {
    if (phase === "arm") {
      // Open a round almost all of whose window is already spent, so it reaches its close in
      // `leadSeconds` rather than in a whole span. The driver waits those seconds out, which is
      // what makes the run a real lifecycle instead of a shortcut past `createMarket`'s guard.
      const leadSeconds = Number.isFinite(body?.leadSeconds) ? Math.max(5, Number(body.leadSeconds)) : 80;
      const spanMs = roundSpanMinutes(c.durationMinutes) * 60_000;
      const openAt = new Date(Date.now() - spanMs + leadSeconds * 1_000).toISOString();
      await chainStore.patch(c.id, { nextBoundaryAt: openAt });
      const r = await advanceChain(c.id, { now: Date.now() });
      const latest = await roundStore.latestForChain(c.id);
      out.push({
        chainId: c.id, durationMinutes: c.durationMinutes, phase, result: r,
        round: latest && { id: latest.id, opensAt: latest.opensAt, closesAt: latest.closesAt, boundaryAt: latest.boundaryAt, outcome: latest.outcome },
      });
      continue;
    }

    // SETTLE. Point the chain at the round's OWN boundary so `advanceChain`'s close arm matches
    // — that equality is the production condition, not a shortcut around it — and let the one
    // call both close this round and open the round that starts where it ended.
    const latest = await roundStore.latestForChain(c.id);
    if (!latest || latest.resolvedAt) { out.push({ chainId: c.id, phase, skipped: "no unresolved round" }); continue; }
    await chainStore.patch(c.id, { nextBoundaryAt: latest.boundaryAt });
    const r = await advanceChain(c.id, { now: Date.now() });
    // ⛔ REPORT THE TWO ROUNDS THIS CALL ACTUALLY ACTED ON, BY ID — never "the newest few, work
    // it out". A driver that re-derives them from a list is guessing, and it guessed wrong the
    // first time: `roundStore.list` sorts by `boundaryAt` DESC, and on a store carrying rounds
    // from earlier runs the newest BOUNDARY belongs to an older run's successor. The endpoint
    // knows which round it closed and which it opened, so it says so.
    const closed = await roundStore.get(latest.id);
    const openedRow = await roundStore.latestForChain(c.id);
    const opened = openedRow && openedRow.id !== latest.id ? openedRow : null;
    out.push({
      chainId: c.id, durationMinutes: c.durationMinutes, phase, result: r,
      closed: closed && {
        id: closed.id, roundNumber: closed.roundNumber, opensAt: closed.opensAt,
        closesAt: closed.closesAt, outcome: closed.outcome, resolvedAt: closed.resolvedAt,
      },
      opened: opened && {
        id: opened.id, roundNumber: opened.roundNumber, opensAt: opened.opensAt,
        closesAt: opened.closesAt, resolvedAt: opened.resolvedAt,
      },
    });
  }

  return NextResponse.json({ ok: true, phase, chains: running.length, out });
}
