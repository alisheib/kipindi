/**
 * Public attestation feed for resolved markets.
 * Each item carries the market id, the outcome, the source URL, and the
 * two-officer signatures. Anyone can scrape this and verify against the source.
 *
 * Also acts as the heartbeat that drives the client-side NotifyPoller's
 * real-time win celebration. The poller hits this every 2 s for any
 * user with a watched market. Before listing resolved markets we run
 * `autoResolveExpiredDemoMarkets()` so a demo market that just ticked
 * past its `resolutionAt` settles HERE, on the polling path — instead
 * of waiting for the next full page render to trigger the sweep.
 *
 * Without this call, a player on /markets/[id] would watch the
 * countdown hit 0 but never see the win-celebration popup until they
 * refreshed — the exact behaviour the user reported. The fix shifts
 * the demo-resolve trigger off the page-render path and onto the same
 * 2 s cadence the celebration listener already runs on.
 */
import { NextResponse } from "next/server";
import { autoResolveExpiredDemoMarkets, listMarkets } from "@/lib/server/market-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // Run the auto-resolver synchronously before we list — keeps the
  // response self-consistent: if a market expired ≤2 s ago, this same
  // call settles it and includes it in the response. The function is
  // idempotent (guards on `m.status !== "LIVE"`) so concurrent polls
  // from multiple browsers can't double-resolve a market.
  await autoResolveExpiredDemoMarkets().catch(() => {});
  // listMarkets() sorts ASC by resolutionAt — for the "recent" feed we
  // want NEWEST first so the NotifyPoller (polling this every 2 s) can
  // see a just-resolved market. Sort DESC by stage2At (the actual
  // settlement timestamp) before slicing to 50. Without this, on a
  // long-lived instance the resolved-market backlog pushes newly-
  // settled markets past the 50-row cutoff and players miss their
  // win-celebration popup — same root cause as the original
  // refresh-required bug, just from the other side of the window.
  // Include VOIDED as well as RESOLVED: a voided/cancelled market is a terminal
  // resolution the player is watching, and the NotifyPoller needs to see it to
  // fire the "market resolved · VOID" toast, refund-aware, and prune it from the
  // watch list. Without this, a watched market that gets voided would be polled
  // forever and the player would never get the in-page resolution signal.
  const resolved = [
    ...(await listMarkets({ status: "RESOLVED" }).catch(() => [])),
    ...(await listMarkets({ status: "VOIDED" }).catch(() => [])),
  ]
    .sort((a, b) => (b.resolutionStage2At ?? "").localeCompare(a.resolutionStage2At ?? ""))
    .slice(0, 50);
  return NextResponse.json({
    attestations: resolved.map((m) => ({
      marketId: m.id,
      titleEn: m.titleEn,
      titleSw: m.titleSw,
      category: m.category,
      sourceUrl: m.sourceUrl,
      resolvedOutcome: m.resolvedOutcome,
      stage1By: m.resolutionStage1By,
      stage1At: m.resolutionStage1At,
      stage2By: m.resolutionStage2By,
      stage2At: m.resolutionStage2At,
      objectionsClosedAt: m.objectionsClosedAt,
      yesPool: m.yesPool,
      noPool: m.noPool,
    })),
  });
}
