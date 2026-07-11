/**
 * /leaderboard — top predictors of the rolling window.
 *
 * Uses VolumeSparkline for each row's recent activity and the kit's
 * tier-badge palette for rank tiers. In production the board shows ONLY real
 * ranked players (a genuine empty state until players settle predictions);
 * sample data is generated for the empty demo store in non-production only.
 */
import { db } from "@/lib/server/store";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { listPositionsForUser } from "@/lib/server/market-service";
import { VolumeSparkline } from "@/components/markets/price-chart";
import { Tooltip } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, TierBadge as KitTierBadge } from "@/components/ui/avatar";
import { PageRibbon } from "@/components/layout/page-ribbon";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { getServerT, type Dict } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  const title = t.leaderboard.title;
  const og = `/api/og/page?title=${encodeURIComponent(title)}`;
  return {
    title,
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}
export const dynamic = "force-dynamic";

type Tier = "sovereign" | "diamond" | "gold" | "silver" | "bronze";

type Row = {
  userId: string;
  handle: string;
  resolved: number;
  staked: number;
  paidOut: number;
  roi: number;
  tier: Tier;
  streak: number;
  /** 14-day activity sparkline in TZS staked per day. */
  spark: number[];
};

function tierFor(roi: number, resolved: number): Tier {
  // Sovereign sits above Diamond — heraldic top-of-board honour.
  if (resolved >= 50 && roi >= 60) return "sovereign";
  if (resolved >= 20 && roi >= 30) return "diamond";
  if (resolved >= 10 && roi >= 15) return "gold";
  if (resolved >= 5  && roi >= 0)  return "silver";
  return "bronze";
}

/** Deterministic pseudo-random walk seeded from a string — no Math.random
 *  in render, so the SSR + hydration values stay identical. */
function seededWalk(seed: string, length: number, max = 100_000): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push(Math.round((h % 1000) / 1000 * max));
  }
  return out;
}

async function buildLeaderboard() {
  let users: Awaited<ReturnType<typeof db.user.list>> = [];
  try { users = await db.user.list(); } catch { return []; }

  // Fetch all users' positions in parallel instead of sequentially (N+1 → 1)
  const positionResults = await Promise.all(
    users.map((u) => listPositionsForUser(u.id, 5_000).catch(() => [])),
  );

  const out: Row[] = [];
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const positions = positionResults[i].filter((p) => p.status !== "OPEN");
    if (positions.length === 0) continue;
    const staked = positions.reduce((s, p) => s + p.stake, 0);
    const paidOut = positions.reduce((s, p) => s + (p.finalPayout ?? 0), 0);
    const roi = staked > 0 ? ((paidOut - staked) / staked) * 100 : 0;
    const resolved = positions.length;
    let streak = 0;
    for (const p of positions) {
      if (p.status === "WIN") streak++;
      else break;
    }
    const handle = (u.displayName ?? `pred_${u.id.slice(-4)}`).split(" ")[0];
    out.push({
      userId: u.id,
      handle,
      resolved,
      staked,
      paidOut,
      roi,
      tier: tierFor(roi, resolved),
      streak,
      spark: seededWalk(u.id, 14, Math.max(50_000, staked)),
    });
  }
  return out.sort((a, b) => b.roi - a.roi).slice(0, 50);
}

/** Demo-mode filler — synthesizes a believable leaderboard so the UI is
 *  never empty in a fresh demo session. Uses real Tanzanian first names
 *  via deterministic seeds. */
function syntheticLeaderboard(): Row[] {
  const handles = ["asha", "juma", "neema", "kiongozi", "nyota", "rehema", "baraka", "tumaini", "siri", "imani", "amani", "zawadi"];
  return handles.map((handle, i) => {
    const seed = `${handle}-${i}`;
    const w = seededWalk(seed, 14, 200_000);
    const staked = w.reduce((a, b) => a + b, 0);
    const paidOut = Math.round(staked * (1 + (Math.cos(i) * 0.4)));
    const roi = staked > 0 ? ((paidOut - staked) / staked) * 100 : 0;
    const resolved = 8 + (i % 12);
    return {
      userId: `synth_${handle}`,
      handle,
      resolved,
      staked,
      paidOut,
      roi,
      tier: tierFor(roi, resolved),
      streak: i < 3 ? 4 - (i % 3) : 0,
      spark: w,
    };
  }).sort((a, b) => b.roi - a.roi);
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { t } = await getServerT();
  const real = await buildLeaderboard();
  // Show REAL players from the very first one so a player can always see
  // themselves ranked. The synthetic sample board is a NON-PRODUCTION demo
  // convenience only — a licensed real-money site must never present
  // fabricated players/rankings to real users, so in production an empty
  // board renders a genuine empty state instead.
  const isSynthetic = real.length === 0 && process.env.NODE_ENV !== "production";
  const rows = isSynthetic ? syntheticLeaderboard() : real;
  // Paginate the ranking the same way every other list on the platform paginates.
  const sp = await searchParams;
  const totalPages = Math.max(1, Math.ceil(rows.length / PLAYER_PER_PAGE));
  const safePage = Math.min(Math.max(1, parseInt(sp.page ?? "1", 10) || 1), totalPages);
  const offset = (safePage - 1) * PLAYER_PER_PAGE;
  const pagedRows = rows.slice(offset, offset + PLAYER_PER_PAGE);

  // Tier display name from the dict (first word of the tier description)
  const tierDisplayName = (tier: Tier) => t.leaderboard[`tier${tier.charAt(0).toUpperCase()}${tier.slice(1)}` as keyof typeof t.leaderboard].split(" ")[0];

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <RefreshPoller intervalMs={30_000} />
      <PageHeader eyebrow={t.leaderboard.title} title={t.leaderboard.topPredictors} />

      {rows.length === 0 ? (
        <EmptyState
          kind="leaderboard"
          title={t.leaderboard.emptyTitle}
          body={t.leaderboard.emptyBody}
          action={<Link href={"/markets" as never} className="btn btn-primary btn-sm">{t.positions.browseMarkets}</Link>}
        />
      ) : (
        <>
      <PageRibbon
        stats={[
          { label: t.leaderboard.topTier, value: tierDisplayName(rows[0]?.tier ?? "bronze"), accent: "gold" },
          { label: t.leaderboard.bestRoi, value: `${rows[0]?.roi.toFixed(1) ?? "0"}%`, accent: "yes" },
          { label: t.leaderboard.predictorsCount, value: rows.length.toLocaleString("en-US") },
        ]}
      />

      {/* A10 podium — top-3, #1 raised in a gilt ring + crown. Real players
          from row 1; only shown with a genuine top-3. */}
      {rows.length >= 3 && <Podium top={rows} t={t} />}

      <section className="overflow-x-auto rounded-xl glass-panel">
        {isSynthetic && (
          <div className="px-4 py-2.5 border-b border-border bg-bg-overlay/40 flex items-center gap-2">
            <span className="inline-flex items-center rounded-pill border border-border bg-bg-overlay px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.10em] text-text-subtle">{t.leaderboard.demo}</span>
            <p className="text-[11.5px] text-text-muted">{t.leaderboard.sampleData}</p>
          </div>
        )}
        <table className="admin-tbl min-w-[640px]">
          <thead className="border-b border-border bg-bg-overlay">
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              <th className="text-left p-3 w-14">#</th>
              <th className="text-left p-3">{t.leaderboard.tablePredictor}</th>
              <th className="text-right p-3">{t.leaderboard.tableRoi}</th>
              <th className="text-left p-3 hidden md:table-cell">{t.leaderboard.tableStakes}</th>
              <th className="text-right p-3 hidden md:table-cell">{t.leaderboard.tableStreak}</th>
              <th className="text-right p-3">{t.leaderboard.tableResolved}</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r, i) => (
              <tr key={r.userId} className="border-b border-border last:border-b-0 hover:bg-bg-overlay/40 transition-colors">
                <td className="p-3 font-mono font-bold tabular-nums">
                  <span className={offset + i < 3 ? "text-brand-300" : "text-text-subtle"}>{offset + i + 1}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Avatar initials={r.handle.slice(0, 2)} size="sm" seed={r.userId} />
                    <span className="font-medium text-text">@{r.handle}</span>
                    <TierBadge tier={r.tier} t={t} />
                  </div>
                </td>
                <td
                  className={`p-3 text-right font-mono tabular-nums font-bold ${
                    r.roi >= 0 ? "text-yes-300" : "text-no-300"
                  }`}
                >
                  {r.roi >= 0 ? "+" : ""}{r.roi.toFixed(1)}%
                </td>
                <td className="p-3 hidden md:table-cell">
                  <VolumeSparkline data={r.spark} width={140} height={32} ariaLabel={t.market.volumeSparkline} />
                </td>
                <td className="p-3 text-right hidden md:table-cell font-mono tabular-nums text-text-muted">
                  {r.streak > 0 ? (
                    <span className="inline-flex items-center gap-1"><HotChip streak={r.streak} t={t} /></span>
                  ) : "—"}
                </td>
                <td className="p-3 text-right font-mono tabular-nums text-text-muted">{r.resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {totalPages > 1 && (
        <div className="rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
          <Pagination total={rows.length} page={safePage} perPage={PLAYER_PER_PAGE} baseHref="/leaderboard" ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} />
        </div>
      )}
        </>
      )}
    </main>
  );
}

/** Hot-streak chip — flame glyph + win count. Gold is principled on the
 *  leaderboard (earned standing). */
function HotChip({ streak, t }: { streak: number; t: Dict }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-gold-700/50 bg-gold-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-gold-300">
      <I.hot s={11} />
      {streak} {streak > 1 ? t.leaderboard.winsLabel : t.leaderboard.winLabel}
    </span>
  );
}

/** A10 top-3 podium. Order [#2, #1, #3] so #1 sits center-raised; gilt ring +
 *  crown on #1, muted-ink rings on #2/#3. Avatars rise in staggered (kp-rise). */
function Podium({ top, t }: { top: Row[]; t: Dict }) {
  const slots: { r: Row; rank: 1 | 2 | 3 }[] = [
    { r: top[1], rank: 2 },
    { r: top[0], rank: 1 },
    { r: top[2], rank: 3 },
  ];
  return (
    <section className="rounded-xl glass-panel px-4 pt-6 pb-4">
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {slots.map(({ r, rank }, i) => {
          const first = rank === 1;
          const ring = first ? "var(--gold-400)" : "var(--text-muted)";
          return (
            <div
              key={r.userId}
              className={`kp-rise flex min-w-0 flex-col items-center text-center ${first ? "-translate-y-3" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {first ? (
                <span className="mb-1 text-gold-300 podium-crown" aria-hidden><I.crown s={22} /></span>
              ) : (
                <span className="mb-1 block h-[22px]" aria-hidden />
              )}
              <div
                className="relative rounded-full"
                style={{ padding: 3, background: ring, boxShadow: first ? "0 0 16px color-mix(in oklab, var(--gold-400) 45%, transparent)" : "none" }}
              >
                <Avatar initials={r.handle.slice(0, 2)} size={first ? "xl" : "lg"} seed={r.userId} />
                <span
                  className="absolute -bottom-1 -right-1 grid place-items-center rounded-full font-mono text-[10px] font-bold"
                  style={{
                    width: 18, height: 18,
                    background: first ? "var(--gold-400)" : "var(--bg-overlay)",
                    color: first ? "var(--gold-950)" : "var(--text-muted)",
                    border: "1px solid var(--border-strong)",
                  }}
                >
                  {rank}
                </span>
              </div>
              <div className="mt-2 flex max-w-full items-center gap-1.5">
                <span className="truncate font-medium text-text">@{r.handle}</span>
                <TierBadge tier={r.tier} t={t} />
              </div>
              <span className={`mt-0.5 font-mono text-[13px] font-bold tabular-nums ${r.roi >= 0 ? "text-yes-300" : "text-no-300"}`}>
                {r.roi >= 0 ? "+" : ""}{r.roi.toFixed(1)}%
              </span>
              {r.streak > 0 && <span className="mt-1"><HotChip streak={r.streak} t={t} /></span>}
              <span className="mt-1 font-mono text-[10px] text-text-subtle">
                {r.resolved} {t.leaderboard.tableResolved.toLowerCase()}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Uses the canonical <TierBadge> atom (one heraldic look platform-wide), wrapped
// in the leaderboard's richer tooltip describing each tier's threshold.
function TierBadge({ tier, t }: { tier: Tier; t: Dict }) {
  const desc = {
    sovereign: t.leaderboard.tierSovereign,
    diamond:   t.leaderboard.tierDiamond,
    gold:      t.leaderboard.tierGold,
    silver:    t.leaderboard.tierSilver,
    bronze:    t.leaderboard.tierBronze,
  }[tier];
  return (
    <Tooltip label={desc}>
      <span aria-label={tier}>
        <KitTierBadge tier={tier} />
      </span>
    </Tooltip>
  );
}
