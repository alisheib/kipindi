import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { db } from "@/lib/server/store";
import { matches } from "@/lib/mock-data";
import { formatTzs, formatTzsCompact } from "@/lib/utils";

export const metadata = { title: "Admin · Match betting" };
export const dynamic = "force-dynamic";

type BetSummary = {
  matchId: string;
  matchLabel: string;
  league: string;
  bets: number;
  totalStakes: number;
  totalPayouts: number;
  ngr: number;
  voids: number;
  cashedOut: number;
};

function summarizeMatchBetting(): BetSummary[] {
  const map = new Map<string, BetSummary>();
  for (const u of db.user.list()) {
    for (const b of db.bet.findByUser(u.id, 5_000)) {
      const e = map.get(b.matchId) ?? {
        matchId: b.matchId,
        matchLabel: b.matchLabel,
        league: b.league,
        bets: 0,
        totalStakes: 0,
        totalPayouts: 0,
        ngr: 0,
        voids: 0,
        cashedOut: 0,
      };
      e.bets++;
      e.totalStakes += b.stake;
      if (b.status === "WON" && b.returnAmount) e.totalPayouts += b.returnAmount;
      if (b.status === "VOIDED") e.voids++;
      if (b.status === "CASHED_OUT") e.cashedOut++;
      e.ngr = e.totalStakes - e.totalPayouts;
      map.set(b.matchId, e);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalStakes - a.totalStakes);
}

export default function AdminMatchBettingPage() {
  const summary = summarizeMatchBetting();
  const totalBets = summary.reduce((s, m) => s + m.bets, 0);
  const totalStakes = summary.reduce((s, m) => s + m.totalStakes, 0);
  const totalPayouts = summary.reduce((s, m) => s + m.totalPayouts, 0);
  const totalCashedOut = summary.reduce((s, m) => s + m.cashedOut, 0);
  const totalVoids = summary.reduce((s, m) => s + m.voids, 0);
  const cashOutRate = totalBets === 0 ? 0 : (totalCashedOut / totalBets) * 100;
  const margin = totalStakes === 0 ? 0 : ((totalStakes - totalPayouts) / totalStakes) * 100;

  return (
    <>
      <AdminPageHead title="Match betting" sw="Beti za mechi" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Bets placed"     sw="Madau"        value={totalBets.toLocaleString()} />
          <AdminKpi label="Stakes (GGR)"    sw="Mapato"       value={`TZS ${formatTzsCompact(totalStakes).replace("TZS ", "")}`} gold />
          <AdminKpi label="NGR"             sw="Mapato halisi" value={`TZS ${formatTzsCompact(totalStakes - totalPayouts).replace("TZS ", "")}`} gold delta={`${margin.toFixed(1)}% margin`} />
          <AdminKpi label="Cash-out rate"   sw="Kutoa mapema"  value={`${cashOutRate.toFixed(1)}%`}         delta={`${totalCashedOut} cashed`} />
        </div>

        {/* Match-by-match table */}
        <AdminCard
          title="Per-match performance"
          sw="Utendaji wa kila mechi"
          action={<span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">{summary.length} matches with bets</span>}
        >
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-caption min-w-[760px]">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                <tr>
                  <th className="text-left py-2 pr-3">League</th>
                  <th className="text-left py-2 pr-3">Match</th>
                  <th className="text-right py-2 pr-3">Bets</th>
                  <th className="text-right py-2 pr-3">Stakes</th>
                  <th className="text-right py-2 pr-3">Payouts</th>
                  <th className="text-right py-2 pr-3">NGR</th>
                  <th className="text-right py-2 pr-3">Cashed</th>
                  <th className="text-right py-2 pl-3">Voids</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((m) => (
                  <tr key={m.matchId} className="border-b border-border-subtle/50 last:border-b-0">
                    <td className="py-2 pr-3"><Chip size="sm" variant="brand">{m.league}</Chip></td>
                    <td className="py-2 pr-3 font-medium text-text whitespace-nowrap">{m.matchLabel}</td>
                    <td className="py-2 pr-3 font-mono tabular text-right">{m.bets.toLocaleString()}</td>
                    <td className="py-2 pr-3 font-mono tabular text-right">{formatTzs(m.totalStakes)}</td>
                    <td className="py-2 pr-3 font-mono tabular text-right text-text-tertiary">{formatTzs(m.totalPayouts)}</td>
                    <td className={["py-2 pr-3 font-mono tabular text-right font-semibold", m.ngr >= 0 ? "text-gold" : "text-text-tertiary"].join(" ")}>{formatTzsCompact(m.ngr)}</td>
                    <td className="py-2 pr-3 font-mono tabular text-right">{m.cashedOut}</td>
                    <td className="py-2 pl-3 font-mono tabular text-right text-text-tertiary">{m.voids}</td>
                  </tr>
                ))}
                {summary.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-text-tertiary">No match-bet activity yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>

        {/* Live match status quick view */}
        <AdminCard title="Currently live · pool snapshot" sw="Hali ya sasa">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matches.filter((m) => m.status === "live").map((m) => {
              const totalPool = m.windows.reduce((s, w) => s + w.pool, 0);
              return (
                <div key={m.id} className="rounded-md border border-border bg-bg-sunken/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Chip size="sm" variant="brand">{m.league}</Chip>
                    <Chip size="sm" variant="gold">●&nbsp;{m.minute}&apos;</Chip>
                  </div>
                  <p className="font-display font-semibold text-text">
                    {m.home.shortName} <span className="font-mono tabular mx-1">{m.homeScore} · {m.awayScore}</span> {m.away.shortName}
                  </p>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle">
                    <div>
                      <p className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary">Total pool</p>
                      <p className="font-mono tabular font-bold text-gold">{formatTzs(totalPool)}</p>
                    </div>
                    <a href={`/match/${m.id}`} className="font-mono text-micro tracking-[0.10em] uppercase text-royal hover:underline">view →</a>
                  </div>
                </div>
              );
            })}
            {matches.filter((m) => m.status === "live").length === 0 && (
              <p className="text-caption text-text-tertiary col-span-full text-center py-4">No matches live right now.</p>
            )}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
