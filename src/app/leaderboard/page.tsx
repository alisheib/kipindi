/**
 * /leaderboard — top predictors of the rolling window.
 *
 * Uses the kit's PriceChart for the platform's "consensus shift" visual at
 * the top, VolumeSparkline for each row's recent activity, and the kit's
 * tier-badge palette for rank tiers. Sample data is generated when there
 * aren't yet enough resolved positions in the in-memory store so the UI is
 * never empty in demo mode.
 */
import { db } from "@/lib/server/store";
import { listPositionsForUser, listMarkets, seedDemoMarkets } from "@/lib/server/market-service";
import { PriceChart, VolumeSparkline } from "@/components/markets/price-chart";
import { Tooltip } from "@/components/ui/tooltip";

export const metadata = { title: "Leaderboard · Bingwa" };
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

function buildLeaderboard(): Row[] {
  const out: Row[] = [];
  for (const u of db.user.list()) {
    const positions = listPositionsForUser(u.id, 5_000).filter((p) => p.status !== "OPEN");
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

/** Build a "consensus shift" series — average market YES probability across
 *  all live markets over the last 14 days. Currently we don't snapshot
 *  history, so we synthesize a plausible series from the current pools. */
function buildConsensusSeries(): { t: string; yes: number }[] {
  const live = listMarkets({ status: "LIVE" });
  if (live.length === 0) return [];
  // Walk that ends near the current crowd consensus
  const end = live.reduce((s, m) => s + (m.yesPool / Math.max(1, m.yesPool + m.noPool)), 0) / live.length;
  const days = ["Apr 22", "Apr 24", "Apr 26", "Apr 28", "Apr 30", "May 2", "May 4", "today"];
  // Smooth walk from 0.40 → end
  const points = days.map((t, i) => {
    const k = i / (days.length - 1);
    const noise = (Math.sin(i * 1.3) + Math.cos(i * 0.7)) * 0.03;
    return { t, yes: Math.max(0.05, Math.min(0.95, 0.40 + (end - 0.40) * k + noise)) };
  });
  return points;
}

export default function LeaderboardPage() {
  seedDemoMarkets();
  const real = buildLeaderboard();
  const rows = real.length >= 6 ? real : syntheticLeaderboard();
  const consensus = buildConsensusSeries();

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Leaderboard · Bingwa</p>
        <h1 className="font-display text-[28px] font-bold text-text">Top predictors</h1>
        <p className="text-[14px] italic text-text-subtle">Watabiri bora wa mwezi</p>
      </header>

      {/* Consensus shift chart — the kit's PriceChart applied platform-wide */}
      {consensus.length > 1 && (
        <section className="rounded-xl border border-border bg-bg-elevated p-4 lg:p-5">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
                Platform-wide consensus · YES probability
              </p>
              <p className="text-[12px] italic text-text-subtle">Wastani wa imani · 14 siku</p>
            </div>
            <p className="font-mono text-[11px] text-text-muted">
              {Math.round(consensus[consensus.length - 1].yes * 100)}% today
            </p>
          </div>
          <PriceChart data={consensus} height={180} />
        </section>
      )}

      <section className="overflow-x-auto rounded-xl border border-border bg-bg-elevated">
        <table className="w-full text-[13px] min-w-[640px]">
          <thead className="border-b border-border bg-bg-overlay">
            <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              <th className="text-left p-3 w-14">#</th>
              <th className="text-left p-3">Predictor</th>
              <th className="text-right p-3">ROI</th>
              <th className="text-left p-3 hidden md:table-cell">14-day stakes</th>
              <th className="text-right p-3 hidden md:table-cell">Streak</th>
              <th className="text-right p-3">Resolved</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.userId} className="border-b border-border last:border-b-0 hover:bg-bg-overlay/40 transition-colors">
                <td className="p-3 font-mono font-bold tabular-nums">
                  <span className={i < 3 ? "text-gold-300" : "text-text-subtle"}>{i + 1}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-pill bg-bg-overlay font-mono text-[11px] text-text-muted border border-border">
                      {r.handle.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-medium text-text">{r.handle}</span>
                    <TierBadge tier={r.tier} />
                  </div>
                </td>
                <td
                  className={`p-3 text-right font-mono tabular-nums font-bold ${
                    r.roi >= 0 ? "text-gold-300" : "text-no-300"
                  }`}
                >
                  {r.roi >= 0 ? "+" : ""}{r.roi.toFixed(1)}%
                </td>
                <td className="p-3 hidden md:table-cell">
                  <VolumeSparkline data={r.spark} width={140} height={32} />
                </td>
                <td className="p-3 text-right hidden md:table-cell font-mono tabular-nums text-text-muted">
                  {r.streak > 0 ? `${r.streak} win${r.streak > 1 ? "s" : ""}` : "—"}
                </td>
                <td className="p-3 text-right font-mono tabular-nums text-text-muted">{r.resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  const cls = {
    sovereign: "tier-sovereign",
    diamond:   "bg-gradient-to-br from-cyan-300 to-blue-400 text-slate-900",
    gold:      "bg-gold-500 text-gold-fg",
    silver:    "bg-slate-300 text-slate-900",
    bronze:    "bg-gold-700 text-gold-50",
  }[tier];
  const letter = { sovereign: "S", diamond: "D", gold: "G", silver: "S", bronze: "B" }[tier];
  const desc = {
    sovereign: "Sovereign · ≥50 resolved · ≥60% ROI · heraldic honour",
    diamond:   "Diamond · ≥20 resolved · ≥30% ROI",
    gold:      "Gold · ≥10 resolved · ≥15% ROI",
    silver:    "Silver · ≥5 resolved · positive ROI",
    bronze:    "Bronze · entry tier",
  }[tier];
  return (
    <Tooltip label={desc}>
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-pill font-mono text-[10px] font-bold ${cls}`}
        aria-label={tier}
      >
        {letter}
      </span>
    </Tooltip>
  );
}
