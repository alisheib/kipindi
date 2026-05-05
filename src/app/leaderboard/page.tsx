import { db } from "@/lib/server/store";
import { listPositionsForUser, seedDemoMarkets } from "@/lib/server/market-service";

export const metadata = { title: "Leaderboard · Bingwa" };
export const dynamic = "force-dynamic";

type Row = {
  userId: string;
  handle: string;
  resolved: number;
  staked: number;
  paidOut: number;
  roi: number;
  tier: "diamond" | "gold" | "silver" | "bronze";
  streak: number;
};

function tierFor(roi: number, resolved: number): Row["tier"] {
  if (resolved >= 20 && roi >= 30) return "diamond";
  if (resolved >= 10 && roi >= 15) return "gold";
  if (resolved >= 5  && roi >= 0)  return "silver";
  return "bronze";
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
    for (const p of positions) { if (p.status === "WIN") streak++; else break; }
    const handle = (u.displayName ?? `pred_${u.id.slice(-4)}`).split(" ")[0];
    out.push({ userId: u.id, handle, resolved, staked, paidOut, roi, tier: tierFor(roi, resolved), streak });
  }
  return out.sort((a, b) => b.roi - a.roi).slice(0, 50);
}

export default function LeaderboardPage() {
  seedDemoMarkets();
  const rows = buildLeaderboard();
  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Leaderboard · Bingwa</p>
        <h1 className="font-display text-[28px] font-bold text-text">Top predictors</h1>
        <p className="text-[15px] italic text-text-subtle">Watabiri bora</p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-elevated/40 p-10 text-center">
          <p className="text-[14px] text-text-muted">Leaderboard fills up as markets resolve.</p>
          <p className="mt-1 text-[13px] italic text-text-subtle">Bingwa watajaza orodha mara baada ya soko kukamilika.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg-elevated">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-bg-overlay">
              <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                <th className="text-left p-3 w-14">#</th>
                <th className="text-left p-3">Predictor</th>
                <th className="text-right p-3">ROI</th>
                <th className="text-right p-3 hidden md:table-cell">Streak</th>
                <th className="text-right p-3">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId} className="border-b border-border last:border-b-0 hover:bg-bg-overlay/50">
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
                  <td className={`p-3 text-right font-mono tabular-nums font-semibold ${r.roi >= 0 ? "text-gold-300" : "text-no-300"}`}>
                    {r.roi >= 0 ? "+" : ""}{r.roi.toFixed(1)}%
                  </td>
                  <td className="p-3 text-right hidden md:table-cell font-mono tabular-nums text-text-muted">
                    {r.streak > 0 ? `${r.streak} win${r.streak > 1 ? "s" : ""}` : "—"}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-text-muted">{r.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function TierBadge({ tier }: { tier: Row["tier"] }) {
  const cls = {
    diamond: "bg-gradient-to-br from-cyan-300 to-blue-400 text-slate-900",
    gold:    "bg-gold-500 text-gold-fg",
    silver:  "bg-slate-300 text-slate-900",
    bronze:  "bg-gold-700 text-gold-50",
  }[tier];
  const letter = { diamond: "D", gold: "G", silver: "S", bronze: "B" }[tier];
  return <span className={`inline-flex h-5 w-5 items-center justify-center rounded-pill font-mono text-[10px] font-bold ${cls}`} title={tier}>{letter}</span>;
}
