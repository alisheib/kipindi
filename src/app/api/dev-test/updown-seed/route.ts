/**
 * /api/dev-test/updown-seed — stand up a running Up & Down chain in one call.
 *
 * For visual/E2E runs that need a REAL board with REAL rounds. It goes through the
 * same `createAsset` / `setAssetEnabled` / `createChain` / `setChainState` service
 * functions the admin UI calls — including the trusted-source gate — so a seed that
 * succeeds here proves the same path the operator uses. (The admin UI flow itself is
 * covered separately by scripts/updown-admin-e2e-shots.mjs.)
 *
 * ⚠️ 404 in production, and double-gated at the edge by proxy.ts.
 */
import { NextResponse } from "next/server";
import { seedDefaultSources, addSource, listSources } from "@/lib/server/source-registry";
import {
  createAsset, setAssetEnabled, createChain, setChainState,
  listAssets, listChains, setUpDownConfig,
} from "@/lib/server/updown-config";
import { FEED_PROVIDERS } from "@/lib/updown-providers";

const ACTOR = "dev_test_seed";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const durations: number[] = Array.isArray(body?.durations) ? body.durations : [5, 15];

  // Optional feed-provider override, so a driver that needs DECISIVE local settles can
  // ask for `mock-bars` (dated — a different price per boundary) instead of the default
  // `mock`, whose constant per-symbol price makes every round a no-move VOID. Validated
  // against the shared registry and applied through the same `setUpDownConfig` the admin
  // action calls, so a value the console would refuse is refused here too. Dev-only —
  // both simulated providers refuse outright in production by construction.
  if (typeof body?.feedProvider === "string") {
    if (!FEED_PROVIDERS.some((p) => p.id === body.feedProvider)) {
      return NextResponse.json({ ok: false, error: `unknown feedProvider "${body.feedProvider}"` }, { status: 400 });
    }
    const c = await setUpDownConfig({ feedProvider: body.feedProvider as import("@/lib/updown-providers").FeedProviderId }, ACTOR);
    if (!c.ok) return NextResponse.json({ ok: false, error: c.error }, { status: 400 });
  }

  await seedDefaultSources();
  // bot.go.tz ships as a trusted `macro` source; kitco is added so the seed matches
  // what a real metals asset would use.
  const existing = await listSources({ enabledOnly: true });
  if (!existing.some((s) => s.domain === "kitco.com")) {
    await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "Spot metals — dev seed", addedBy: ACTOR });
  }
  // `isSourceTrusted` matches on (domain, category) — the crypto asset needs its own row.
  if (!(await listSources({ enabledOnly: true })).some((s) => s.domain === "kitco.com" && s.category === "crypto")) {
    await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "Crypto — dev seed", addedBy: ACTOR });
  }

  const notes: string[] = [];
  // ⚠️ BTC leads: the E-110 movement gate now refuses SHORT metal rounds (gold's feed
  // noise is about the size of a 5-minute move), so a metals-only seed with the default
  // [5, 15] durations quietly produced half a board. Bitcoin's headroom passes at every
  // length the platform offers, which is what a visual/E2E seed needs.
  const want = [
    { key: "BTC", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币", iconKey: "crypto", url: "https://www.kitco.com/price/crypto", category: "crypto" as const },
    { key: "XAU", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", nameZh: "黄金", iconKey: "gold", url: "https://www.kitco.com/price/precious-metals", category: "macro" as const },
    { key: "XAG", symbol: "XAG/USD", nameEn: "Silver", nameSw: "Fedha", nameZh: "白银", iconKey: "silver", url: "https://www.kitco.com/price/precious-metals/silver", category: "macro" as const },
  ];

  for (const w of want) {
    const assets = await listAssets();
    let asset = assets.find((a) => a.key === w.key);
    if (!asset) {
      const r = await createAsset({
        key: w.key, symbol: w.symbol, nameEn: w.nameEn, nameSw: w.nameSw, nameZh: w.nameZh,
        // ⚠️ minMoveTicks 2, not 1 — the config refuses a band the same size as the rounding
        // error (MIN_MOVE_TICKS_FLOOR). This seed shipped `1` and silently created NOTHING.
        iconKey: w.iconKey, priceSourceUrl: w.url, category: w.category, decimals: 2, minMoveTicks: 2,
      }, ACTOR);
      if (!r.ok) { notes.push(`${w.key}: ${r.error}`); continue; }
      asset = r.data;
    }
    if (!asset.enabled) {
      const e = await setAssetEnabled(asset.id, true, ACTOR);
      if (!e.ok) { notes.push(`${w.key} enable: ${e.error}`); continue; }
    }
    for (const d of durations) {
      const chains = await listChains({ assetId: asset.id });
      let chain = chains.find((c) => c.durationMinutes === d);
      if (!chain) {
        const c = await createChain({ assetId: asset.id, durationMinutes: d as never }, ACTOR);
        if (!c.ok) { notes.push(`${w.key}/${d}m: ${c.error}`); continue; }
        chain = c.data;
      }
      if (chain.state !== "RUNNING") {
        const s = await setChainState(chain.id, "RUNNING", ACTOR);
        if (!s.ok) notes.push(`${w.key}/${d}m start: ${s.error}`);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    assets: (await listAssets()).map((a) => ({ key: a.key, enabled: a.enabled })),
    chains: (await listChains()).map((c) => ({ assetId: c.assetId, durationMinutes: c.durationMinutes, state: c.state })),
    notes,
  });
}
