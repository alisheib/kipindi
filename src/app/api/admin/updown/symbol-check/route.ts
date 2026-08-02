/**
 * PRE-FLIGHT: can this symbol actually settle a round, right now?
 *
 * ── WHY (finding E-45) ───────────────────────────────────────────────────────
 * `SOL` was armed on production correctly configured in every visible way — enabled,
 * market `open`, approved source, scheduled margin — and voided **100% of its rounds**,
 * because Twelve Data refreshes SOL/USD roughly every two minutes and the staleness
 * window is 90 seconds. Nothing in the console could show that. The only tool that could
 * answer it was a CLI script, which an operator will never run.
 *
 * So the Add-asset form asks this endpoint the moment a symbol is picked, and refuses to
 * pretend. It reports the SAME two functions the money path uses — `quoteAsset` and
 * `judgeFeedStaleness` — so what it says is what the engine will do, not an approximation.
 *
 * ⛔ READ-ONLY. It writes no observation, no asset and no usage row. It costs one provider
 * credit per call (the live plan allows 800/day), and it is rate-limited by being an
 * operator action behind `trading`.
 */
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/rbac-guard";
import { getUpDownConfig } from "@/lib/server/updown-config";
import { findSymbol, tradingHoursNote, QUOTE_ENDPOINT, QUOTE_DOMAIN } from "@/lib/server/updown-symbols";
import { marketSessionAt, nextOpenAfter } from "@/lib/server/market-calendar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Same domain as every other Up & Down write. An unauthenticated probe would let anyone
  // burn the provider quota.
  await requireStaff("trading");

  const symbol = new URL(req.url).searchParams.get("symbol")?.trim() ?? "";
  const spec = findSymbol(symbol);
  if (!spec) {
    return NextResponse.json({ ok: false, error: `"${symbol}" is not in the symbol catalogue.` }, { status: 400 });
  }
  if (spec.unsupported) {
    return NextResponse.json({ ok: true, symbol: spec.symbol, supported: false, reason: spec.unsupported });
  }

  const cfg = await getUpDownConfig();
  const nowIso = new Date().toISOString();
  const session = marketSessionAt(spec.category, nowIso);

  // The calendar first: a shut market's quote is not evidence of anything, and probing it
  // would report "stale" for a reason that has nothing to do with the feed.
  const base = {
    ok: true as const,
    symbol: spec.symbol,
    supported: true,
    category: spec.category,
    hours: tradingHoursNote(spec),
    marketOpen: session.open,
    opensAt: session.open ? null : nextOpenAfter(spec.category, nowIso),
    closureDetail: session.open ? null : session.detail,
    maxStalenessSeconds: cfg.maxStalenessSeconds,
    endpoint: QUOTE_ENDPOINT,
  };
  if (!session.open) {
    return NextResponse.json({ ...base, verdict: "market-closed" });
  }

  try {
    // The SAME two functions the money path calls, driven the same way the ops probe
    // drives them — so this reports what the engine would do, not an approximation.
    const { feedFromId, quoteAsset, judgeFeedStaleness, describeFeedRefusal } =
      await import("@/lib/server/updown-feed");
    const feed = feedFromId(cfg.feedProvider);
    const t0 = Date.now();
    const q = await quoteAsset(feed, {
      symbol: spec.symbol,
      decimals: spec.decimals,
      endpoint: QUOTE_ENDPOINT,
      approvedDomain: QUOTE_DOMAIN,
    });
    const took = Date.now() - t0;
    if (!q.ok) {
      return NextResponse.json({ ...base, verdict: "unreadable", tookMs: took,
        detail: describeFeedRefusal(q.reason, q.detail) });
    }
    // Judge against NOW as the boundary — the next real boundary is at most a few minutes
    // away, and a quote that is already too old for this instant is too old for that one.
    const judged = judgeFeedStaleness(q.quotedAt, new Date().toISOString(), cfg.maxStalenessSeconds);
    return NextResponse.json({
      ...base,
      verdict: judged.ok ? "would-confirm" : "stale",
      price: q.price,
      quotedAt: q.quotedAt,
      skewSec: judged.skewSeconds,
      tookMs: took,
    });
  } catch (err) {
    return NextResponse.json({ ...base, verdict: "error",
      detail: String((err as Error)?.message ?? err).slice(0, 200) });
  }
}
