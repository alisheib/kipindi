/**
 * READ-ONLY · what the resolver queue's new verdict says about EVERY row on production.
 *
 *   npx tsx scripts/ops-verdict-census.mts
 *
 * ⛔ WHY THIS EXISTS RATHER THAN A LOCAL SERVER POINTED AT THE LIVE DATABASE. Booting the
 * app against production arms the market scheduler, the Up & Down chain scheduler AND the
 * lifecycle ticker — a SECOND actor against live money, on a platform whose own notes say
 * several invariants hold "only because one container runs". So the verdict is exercised
 * the way it is actually used — the real `bulkVerdictFor`, the real `decideAutoResolve`, the
 * real trusted-source registry rule — against the real rows, and nothing is written.
 *
 * ⭐ IT IS THE PRE-PUSH PROOF THAT THE HEADLINE REASON IS RIGHT ON LIVE DATA. Every row on
 * production carries `sentinelDetermined = NULL` (the column is additive with no backfill),
 * so if `determined-not-recorded` outranked the citation reasons, every single market would
 * chip a migration artifact instead of *"the AI read espn.com, this market approves
 * premierleague.com"* — the exact sentence the whole change exists to put on the screen.
 * This is where that is measured rather than assumed.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.qa.local"), "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
process.env.DATABASE_URL = process.env.PROD_DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL ?? "";
if (!process.env.DATABASE_URL) { console.error("no DATABASE_URL"); process.exit(2); }

const { bulkVerdictFor } = await import("../src/lib/server/bulk-resolve-eligibility.ts");
const { sentinelSourceVerdict } = await import("../src/lib/server/market-sentinel.ts");
const { listSources, sourceMatchesAny } = await import("../src/lib/server/source-registry.ts");
const { resolvePublishCategory } = await import("../src/lib/server/market-service.ts");
const { getEffectiveConfig, getEffectiveResolutionMode } = await import("../src/lib/server/market-config.ts");
const { getRequireTwoOfficerResolution } = await import("../src/lib/server/resolution-policy.ts");
const { prisma: prismaFn } = await import("../src/lib/server/prisma.ts");
const prisma = prismaFn();
if (!prisma) { console.error("no prisma client"); process.exit(2); }

const rows = await prisma.predictionMarket.findMany({
  where: { status: { in: ["CLOSED", "LIVE"] }, productLine: "MARKET" },
  orderBy: { resolutionAt: "asc" },
});
const [requireTwoOfficer, sources] = await Promise.all([
  getRequireTwoOfficerResolution(),
  listSources({ enabledOnly: true }),
]);

const tally = new Map<string, number>();
let eligible = 0, closed = 0;
console.log(`${rows.length} rows (CLOSED + LIVE polls) · requireTwoOfficer=${requireTwoOfficer}\n`);

for (const r of rows) {
  if (r.status === "CLOSED") closed++;
  const cfg = await getEffectiveConfig(r.id);
  const mode = await getEffectiveResolutionMode(r.resolutionMode as "human" | "auto" | null);
  const sv = sentinelSourceVerdict(r.sentinelSourceUrl, r.sourceUrl);
  const sourceMatches =
    sv === "match" ||
    (sv === "no-approved-source" && !!r.sentinelSourceUrl &&
      sourceMatchesAny(sources, r.sentinelSourceUrl, resolvePublishCategory(r.category)));
  const v = bulkVerdictFor({
    market: {
      id: r.id, status: r.status as never, sourceUrl: r.sourceUrl,
      resolutionStage1By: r.resolutionStage1By, resolveClaimedAt: r.resolveClaimedAt?.toISOString() ?? null,
      sentinelOutcome: r.sentinelOutcome as "YES" | "NO" | null,
      sentinelConfidence: r.sentinelConfidence,
      sentinelEvidence: r.sentinelEvidence,
      sentinelSourceUrl: r.sentinelSourceUrl,
      sentinelDetermined: r.sentinelDetermined,
      resolvedOutcome: r.resolvedOutcome as never,
    },
    mode, threshold: cfg.resolveConfidenceThreshold, sourceMatches, requireTwoOfficer,
    officerId: null,
  });
  const key = v.eligible ? "ELIGIBLE" : (v.reason ?? "?");
  tally.set(key, (tally.get(key) ?? 0) + 1);
  if (v.eligible) eligible++;
  if (r.status === "CLOSED") {
    const pool = Number(r.yesPool) + Number(r.noPool);
    console.log(
      `${r.id}  ${String(r.status).padEnd(7)} pool=${String(pool).padStart(8)} ` +
      `conf=${String(r.sentinelConfidence ?? "-").padStart(3)} det=${String(r.sentinelDetermined)} ` +
      `→ ${key}${v.citedHost ? `  (cited ${v.citedHost} · approved ${v.approvedHost})` : ""}` +
      `${v.all.length > 1 ? `  [also: ${v.all.slice(1).join(", ")}]` : ""}`,
    );
  }
}

console.log(`\n── VERDICT TALLY (${rows.length} rows, ${closed} CLOSED) ──`);
for (const [k, n] of [...tally].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log(`\neligible for a one-click bulk seal: ${eligible}`);
await prisma.$disconnect();
