/**
 * AUDIT (READ-ONLY) — did any Up & Down asset's price source move underneath a round
 * that was already holding player money?
 *
 *   npx tsx scripts/audit-updown-source-drift.mts                  # local / disposable PG
 *   railway run npx tsx scripts/audit-updown-source-drift.mts      # against production
 *
 * ⚠️ RUN THIS BEFORE MERGING THE SOURCE-CAPTURE MIGRATION. It writes nothing, ever.
 *
 * ── WHY IT EXISTS ────────────────────────────────────────────────────────────
 * Until the capture columns landed, `UpDownRound` recorded no source at all: resolution
 * read `UpDownAsset.priceSourceUrl` LIVE at each boundary. So editing an asset's link
 * silently re-pointed every open round on it.
 *
 * The migration backfills each unsettled round from its asset's CURRENT link. That is
 * right for every round the link never moved under — and WRONG, in a way that then looks
 * authoritative, for any round it did. This audit finds those rounds first, by asking a
 * question that needs no capture column:
 *
 *     does the CONFIRMED observation bounding this round cite a host on the asset's
 *     CURRENT domain?
 *
 * The observation records what the model ACTUALLY read, at the time it read it. If a
 * round's own bounding reading came from a different host than the asset now names, the
 * link moved mid-flight and this round's history is genuinely ambiguous.
 *
 * ⛔ A round flagged DRIFTED is an OPERATOR-VOID CANDIDATE, NOT A BACKFILL CANDIDATE.
 * Backfilling it would assert a page we know it did not read. Void it and refund in
 * full — the same direction every other refusal in this subsystem takes.
 *
 * Exit code is 0 even when drift is found: this is a report an operator reads, not a
 * gate. A non-zero exit means the audit itself could not run.
 */
import { PrismaClient } from "@prisma/client";
import { normalizeDomain } from "../src/lib/server/source-registry.ts";

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("✗ DATABASE_URL is not set. Point it at a database (use `railway run` for production).");
  process.exit(1);
}
// Host only — never print credentials.
console.log(`target: ${(() => { try { return new URL(url).host; } catch { return "unparseable"; } })()}`);
console.log("mode:   READ-ONLY audit — nothing is written\n");

const prisma = new PrismaClient();

/** The host rule, matching the oracle's GATE 2: exact host, or a subdomain of it. */
function hostOnDomain(sourceUrl: string, domain: string): boolean {
  let host: string;
  try {
    host = normalizeDomain(new URL(sourceUrl).hostname);
  } catch {
    return false;
  }
  const approved = normalizeDomain(domain);
  return host === approved || host.endsWith(`.${approved}`);
}

type Verdict = "clean" | "drifted" | "unverifiable";

/**
 * The fleet's state, printed first. The drift verdict below is only meaningful next to
 * it: "no drift found" reads as reassurance, but if NOTHING has ever been read then
 * there was never anything that could drift — a very different sentence.
 */
async function reportState() {
  const all = await prisma.upDownRound.findMany({
    select: {
      settledAt: true, resolvedAt: true, outcome: true, voidReason: true,
      market: { select: { yesPool: true, noPool: true, predictorCount: true, status: true } },
    },
  });
  const staked = (r: (typeof all)[number]) => Number(r.market?.yesPool ?? 0) + Number(r.market?.noPool ?? 0);
  const uns = all.filter((r) => !r.settledAt);

  console.log("── Up & Down, current state ─────────────────────────────────────────────");
  console.log(`  rounds ever opened      ${String(all.length).padStart(6)}`);
  console.log(`  settled (money moved)   ${String(all.filter((r) => r.settledAt).length).padStart(6)}`);
  console.log(`  unsettled               ${String(uns.length).padStart(6)}`);
  console.log(`    · resolved, unsettled ${String(uns.filter((r) => r.resolvedAt).length).padStart(6)}  (verdict reached, money has NOT moved)`);
  console.log(`    · never resolved      ${String(uns.filter((r) => !r.resolvedAt).length).padStart(6)}`);
  console.log(`    · holding real money  ${String(uns.filter((r) => staked(r) > 0).length).padStart(6)}`);
  console.log(`  TZS staked, unsettled   ${uns.reduce((s, r) => s + staked(r), 0).toLocaleString().padStart(6)}`);
  console.log(`  positions, unsettled    ${String(uns.reduce((s, r) => s + Number(r.market?.predictorCount ?? 0), 0)).padStart(6)}`);

  const obs = await prisma.upDownObservation.groupBy({ by: ["state"], _count: { _all: true } });
  const byState = obs.map((o) => `${o.state}=${o._count._all}`).join(" · ") || "none at all";
  console.log(`  observations            ${byState}`);

  // The refusal reason is the actionable half: a boundary stuck PENDING with attempts>0
  // has been refused, and `failReason` says by which gate.
  const stuck = await prisma.upDownObservation.findMany({
    where: { state: { in: ["PENDING", "FAILED"] }, attempts: { gt: 0 } },
    take: 3, orderBy: { lastAttemptAt: "desc" },
    select: { state: true, boundaryAt: true, attempts: true, failReason: true },
  });
  for (const s of stuck) {
    console.log(`    · ${s.state} @ ${s.boundaryAt.toISOString()} after ${s.attempts} attempt(s): ${s.failReason ?? "(no reason recorded)"}`);
  }

  const chains = await prisma.upDownChain.findMany({
    include: { asset: { select: { key: true, sourceDomain: true, enabled: true, category: true } } },
  });
  for (const c of chains) {
    console.log(`  chain ${c.asset.key} ${c.durationMinutes}m · ${c.state} · asset ${c.asset.enabled ? "enabled" : "DISABLED"} · ${c.asset.sourceDomain} (${c.asset.category})`);
  }
  console.log("");
}

async function main() {
  await reportState();

  // Only rounds whose money has NOT finished moving — those are the ones the migration
  // touches and the only ones still recoverable.
  const rounds = await prisma.upDownRound.findMany({
    where: { settledAt: null },
    include: { chain: { include: { asset: true } } },
    orderBy: { boundaryAt: "asc" },
  });

  console.log(`unsettled rounds: ${rounds.length}\n`);
  if (rounds.length === 0) {
    console.log("Nothing in flight. The migration's backfill has no rows to touch — merge freely.");
    return;
  }

  // ── ONE query for every bounding observation, not one per round ─────────────
  // A round is bounded by TWO instants (`opensAt` and `boundaryAt`), and adjacent rounds
  // SHARE them, so the distinct set is far smaller than 2×rounds. Fetching per round
  // meant ~1,400 round-trips over the proxy and timed out; this is two queries total.
  const assetIds = [...new Set(rounds.map((r) => r.chain.assetId))];
  const boundaryMs = new Set<number>();
  for (const r of rounds) { boundaryMs.add(r.opensAt.getTime()); boundaryMs.add(r.boundaryAt.getTime()); }
  const boundaries = [...boundaryMs].map((ms) => new Date(ms));
  console.log(`distinct assets: ${assetIds.length} · distinct bounding instants: ${boundaries.length}`);

  const allObs = await prisma.upDownObservation.findMany({
    where: { assetId: { in: assetIds }, boundaryAt: { in: boundaries }, state: "CONFIRMED" },
    select: { assetId: true, boundaryAt: true, sourceUrl: true },
  });
  console.log(`confirmed readings on those instants: ${allObs.length}\n`);

  /** `assetId|epochMs` → the link that reading actually cited. */
  const citedAt = new Map<string, string>();
  for (const o of allObs) {
    if (o.sourceUrl) citedAt.set(`${o.assetId}|${o.boundaryAt.getTime()}`, o.sourceUrl);
  }

  const buckets: Record<Verdict, string[]> = { clean: [], drifted: [], unverifiable: [] };

  for (const r of rounds) {
    const asset = r.chain.asset;

    // Both bounding instants. Either reading citing a foreign host means the link moved
    // under this round.
    const cited: Array<{ boundaryAt: Date; sourceUrl: string }> = [];
    for (const b of [r.opensAt, r.boundaryAt]) {
      const u = citedAt.get(`${asset.id}|${b.getTime()}`);
      if (u) cited.push({ boundaryAt: b, sourceUrl: u });
    }

    const label = `${asset.key} · ${r.chain.durationMinutes}m · round #${r.roundNumber} (${r.id})`;

    if (cited.length === 0) {
      // No confirmed reading has cited anything yet. Nothing contradicts the asset's
      // current link, so the backfill's assumption stands — but say so plainly rather
      // than reporting it as verified.
      buckets.unverifiable.push(`${label} — no confirmed reading cites a source yet`);
      continue;
    }

    const foreign = cited.filter((o) => !hostOnDomain(o.sourceUrl, asset.sourceDomain));
    if (foreign.length > 0) {
      const detail = foreign
        .map((o) => `${o.boundaryAt.toISOString()} read ${(() => { try { return new URL(o.sourceUrl).hostname; } catch { return o.sourceUrl; } })()}`)
        .join("; ");
      buckets.drifted.push(`${label}\n      asset now names: ${asset.sourceDomain}\n      but ${detail}`);
    } else {
      buckets.clean.push(label);
    }
  }

  const line = "─".repeat(72);
  console.log(line);
  console.log(`  CLEAN         ${String(buckets.clean.length).padStart(4)}  every confirmed reading is on the asset's current domain`);
  console.log(`  UNVERIFIABLE  ${String(buckets.unverifiable.length).padStart(4)}  no confirmed reading cites a source yet`);
  console.log(`  DRIFTED       ${String(buckets.drifted.length).padStart(4)}  a reading came from a host the asset no longer names`);
  console.log(line);

  // Cap the listings: on a live platform the unverifiable bucket is thousands of rows
  // (every round whose boundary has not been read yet), and a wall of text buries the
  // one bucket an operator must act on.
  const SHOW = 15;
  const show = (rows: string[]) => {
    for (const s of rows.slice(0, SHOW)) console.log(`    · ${s}`);
    if (rows.length > SHOW) console.log(`    … and ${rows.length - SHOW} more`);
  };

  if (buckets.unverifiable.length > 0) {
    console.log("\nUNVERIFIABLE — the backfill will pin the asset's current link. Nothing contradicts it:");
    show(buckets.unverifiable);
  }

  if (buckets.drifted.length > 0) {
    console.log("\n⛔ DRIFTED — DO NOT let the backfill pin these. Void and refund in full instead:");
    show(buckets.drifted);
    console.log(
      "\n  Each of these rounds was bounded by a reading from a page the asset no longer\n" +
      "  names. Writing the current link onto them would assert a source they did not\n" +
      "  read. Void them from /admin/updown and let every stake be refunded.",
    );
  } else {
    console.log("\n✓ No drift found. The migration's backfill is safe on every unsettled round.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
