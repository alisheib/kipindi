/**
 * GET /api/admin/updown-timing — WHICH server phase makes `/admin/updown` slow.
 *
 * 🔴 WHY THIS EXISTS, and it is a measuring instrument rather than a feature.
 * `/admin/updown` measured **11,045 ms** against a 5,000 ms budget on production
 * 2026-08-29, while the other 37 admin routes ran 241–2,267 ms (`npm run qa:admin-load`).
 * The obvious cause — a `Promise.all(chains.map(...))` firing 46 concurrent queries — was
 * fixed, and the page **did not move** (11,448 ms after). That is the second diagnosis this
 * programme has written down from a plausible reading of the code and had disproved by the
 * next measurement, and the standing rule after the first one was: ⛔ **do not diagnose it a
 * third time — detect it.**
 *
 * A server-rendered page cannot be profiled from outside: `loadEventEnd` is one number for
 * the whole render, and this deployment's logs are not reachable from the machine driving
 * the gate. So the page's phases are timed HERE, through the same functions the page calls,
 * and reported as integers.
 *
 * ⛔ IT RETURNS NO DATA — only how long each read took, and how many rows it produced. Row
 * counts are here because a phase that is fast BECAUSE it returned nothing is not a fast
 * phase, it is a broken one, and the two are indistinguishable from a duration alone.
 *
 * ⚠️ It re-runs the reads rather than observing the real render, so it measures the same
 * work on the same server, not that request. Treat a phase's share as the finding, never the
 * absolute page total.
 *
 * Gated exactly as `/admin/updown` is: a signed-in operator with `trading` view rights, or
 * ADMIN. Read-only, no writes, no money.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { checkAdminTotp } from "@/lib/server/admin-guard";
import { db } from "@/lib/server/store";
import { listAssets, listChains, getUpDownConfig } from "@/lib/server/updown-config";
import { feedAdviceLookup, feedHistoryByAssetKey, movementByAssetKey } from "@/lib/server/updown-feed-history";
import { playbookLookup } from "@/lib/server/updown-playbook-store";
import { roundStore, observationStore } from "@/lib/server/updown-dal";
import { marketStore } from "@/lib/server/market-dal";
import { moneyByGame } from "@/lib/server/report-money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Time one phase and report what it produced, so "fast" cannot mean "returned nothing". */
async function phase<T>(name: string, run: () => Promise<T>, size: (v: T) => number) {
  const t0 = Date.now();
  try {
    const v = await run();
    return { name, ms: Date.now() - t0, rows: size(v), ok: true as const };
  } catch (e) {
    return { name, ms: Date.now() - t0, rows: 0, ok: false as const, error: String(e).slice(0, 120) };
  }
}

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  const me = await db.user.findById(session.userId);
  if (!me || !(me.role === "ADMIN" || (await canView(me.role, "trading")))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  // checkAdminTotp, NOT requireAdminTotp — the latter throws NEXT_REDIRECT and corrupts JSON.
  if ((await checkAdminTotp(session.userId, session.sessionId)) !== "ok") {
    return NextResponse.json({ ok: false, error: "2FA required" }, { status: 403 });
  }

  const t0 = Date.now();
  // ⛔ SEQUENTIAL ON PURPOSE. The page runs several of these together; running them together
  // here would blend them back into one number, which is the thing this endpoint exists to
  // take apart. The total below is therefore a SUM, not the page's wall clock.
  const assets = await phase("listAssets", () => listAssets(), (v) => v.length);
  const chains = await phase("listChains", () => listChains(), (v) => v.length);
  const cfg = await phase("getUpDownConfig", () => getUpDownConfig(), () => 1);
  const feed = await phase("feedAdviceLookup (memoised)", () => feedAdviceLookup(), (v) => (v ? 1 : 0));
  // ⛔ THE TWO HALVES BEHIND IT, CALLED DIRECTLY AND UNCACHED. `feedAdviceLookup` is memoised
  // now (it was 93.5% of this page), and a memo that also blinds the instrument measuring it
  // is how a slow query survives being "fixed" — the row above will read ~0 ms on a warm
  // container and say nothing about the underlying cost. These two do not go through the memo.
  const hist = await phase("  └ feedHistoryByAssetKey (uncached)", () => feedHistoryByAssetKey(), (v) => v.size);
  const move = await phase("  └ movementByAssetKey (uncached)", () => movementByAssetKey(), (v) => v.size);
  const play = await phase("playbookLookup", () => playbookLookup(), (v) => v.measured.length);

  const chainList = await listChains().catch(() => []);
  const live = chainList.filter((c) => c.state !== "ARCHIVED");
  const statsFrom = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const rounds = await phase(
    "roundStore.list(chainIds, 7d)",
    () => roundStore.list({ chainIds: live.map((c) => c.id), boundaryFrom: statsFrom, limit: 600 * Math.max(1, live.length) }),
    (v) => v.length,
  );
  const roundRows = await roundStore
    .list({ chainIds: live.map((c) => c.id), boundaryFrom: statsFrom, limit: 600 * Math.max(1, live.length) })
    .catch(() => []);
  const pools = await phase(
    "marketStore.poolsByIds(all rounds)",
    () => marketStore.poolsByIds(roundRows.slice(0, 2000).map((r) => r.marketId)),
    (v) => v.size,
  );
  const assetList = await listAssets().catch(() => []);
  const obs = await phase(
    "observationStore.list x enabled assets",
    () => Promise.all(assetList.filter((a) => a.enabled).map((a) => observationStore.list({ assetId: a.id, limit: 1 }))),
    (v) => v.length,
  );
  const money = await phase("moneyByGame(30d)", () => moneyByGame(Date.now() - 30 * 86_400_000, Date.now()), () => 1);

  const phases = [assets, chains, cfg, feed, hist, move, play, rounds, pools, obs, money];
  const sum = phases.reduce((s, p) => s + p.ms, 0);
  return NextResponse.json({
    ok: true,
    note: "sequential re-runs of /admin/updown's own reads; the SHARE is the finding, not the total",
    totalMs: Date.now() - t0,
    sumOfPhasesMs: sum,
    phases: phases
      .map((p) => ({ ...p, pct: sum > 0 ? Math.round((p.ms / sum) * 1000) / 10 : 0 }))
      .sort((a, b) => b.ms - a.ms),
  });
}
