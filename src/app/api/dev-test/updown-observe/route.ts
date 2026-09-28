/**
 * /api/dev-test/updown-observe — plant ONE confirmed price read for an Up & Down asset, inside the
 * round that asset is running now (landing v3, WP12 · the Match's local drive, spec updown-band-v2 §15.3).
 *
 * The landing's Up & Down band says who leads from the newest CONFIRMED read after the round's open.
 * The dev feeds cannot produce that on demand: `mock` quotes one constant price (every read is level)
 * and `mock-bars` hashes each instant to a price between 1,000 and 5,000 (a $2,000 move a minute). This
 * endpoint writes the read the drive asks for — the open plus a chosen move — so each band state (Up
 * leads, Down leads, level) is produced with a realistic figure and can be looked at.
 *
 * It goes through the SAME store calls the oracle uses (`observationStore.ensure` → `confirm`), dated
 * like a bar feed (the quoted time IS the boundary), so the band and the round page read it exactly as
 * they read a real one. `dryRun` returns the round's open and targets without writing anything.
 *
 * ⚠️ 404 in production, before anything else runs (`test:cert-devroutes`), and blocked at the edge by
 * proxy.ts. It moves no money: a read settles nothing until a round's own close boundary asks for it.
 */
import { NextResponse } from "next/server";
import { listAssets, listChains } from "@/lib/server/updown-config";
import { observationStore, roundStore } from "@/lib/server/updown-dal";
import { decideOutcomeByTargets } from "@/lib/server/updown-service";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const key = typeof body?.asset === "string" ? body.asset : "BTC";
  const asset = (await listAssets()).find((a) => a.key === key);
  if (!asset) return NextResponse.json({ ok: false, error: `no asset "${key}"` }, { status: 404 });

  // The round this asset is running now: opened, not yet at its deciding boundary, not resolved.
  const nowMs = Date.now();
  const chainIds = (await listChains({ assetId: asset.id })).map((c) => c.id);
  const rounds = chainIds.length ? await roundStore.list({ chainIds, limit: 20 }) : [];
  const round = typeof body?.roundId === "string"
    ? rounds.find((r) => r.id === body.roundId)
    : rounds
      .filter((r) => !r.resolvedAt && Date.parse(r.opensAt) <= nowMs && Date.parse(r.closesAt) > nowMs)
      .sort((a, b) => Date.parse(b.opensAt) - Date.parse(a.opensAt))[0];
  if (!round) return NextResponse.json({ ok: false, error: `no open round for ${key}` }, { status: 404 });
  const info = {
    roundId: round.id, opensAt: round.opensAt, closesAt: round.closesAt,
    openPrice: round.openPrice, upTarget: round.upTarget, downTarget: round.downTarget,
  };
  if (body?.dryRun) return NextResponse.json({ ok: true, round: info });
  if (round.openPrice == null) {
    return NextResponse.json({ ok: false, error: "the round's open is not confirmed yet", round: info }, { status: 409 });
  }

  // A read strictly after the open and not after now — the band's own window. Whole seconds, like a bar.
  const atMs = typeof body?.at === "string" ? Date.parse(body.at) : Math.floor((nowMs - 1000) / 1000) * 1000;
  if (!Number.isFinite(atMs) || atMs <= Date.parse(round.opensAt) || atMs > nowMs) {
    return NextResponse.json({ ok: false, error: "the read must fall after the open and not after now", round: info }, { status: 400 });
  }
  const price = typeof body?.price === "number"
    ? body.price
    : Number((round.openPrice + (typeof body?.delta === "number" ? body.delta : 0)).toFixed(asset.decimals));
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ ok: false, error: "no usable price", round: info }, { status: 400 });
  }

  const boundaryAt = new Date(atMs).toISOString();
  const obs = await observationStore.ensure(asset.id, boundaryAt);
  const confirmed = await observationStore.confirm(obs.id, {
    price,
    sourceUrl: asset.priceSourceUrl,
    sourceQuotedAt: boundaryAt,
    evidence: `DEV TEST READ (dev only) — ${JSON.stringify({ asset: key, at: boundaryAt, price })}`,
    confidence: 1,
    model: null,
    rawHash: null,
  });
  const decided = decideOutcomeByTargets(price, round.upTarget, round.downTarget);
  return NextResponse.json({
    ok: confirmed,
    ...(confirmed ? {} : { error: "that boundary already holds a read" }),
    read: { boundaryAt, price, outcome: decided.outcome },
    round: info,
  }, { status: confirmed ? 200 : 409 });
}
