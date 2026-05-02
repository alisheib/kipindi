import { AdminPageHead, AdminCard, AdminKpi, AdminStackedBar } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { db } from "@/lib/server/store";
import { formatTzs, formatTzsCompact } from "@/lib/utils";

export const metadata = { title: "Admin · Mapigo analytics" };
export const dynamic = "force-dynamic";

const CALL_COLOR: Record<string, string> = {
  SPIKE: "var(--danger)",
  DRIFT: "var(--gold)",
  CALM:  "var(--royal)",
};

export default function AdminMapigoPage() {
  const rounds = db.mapigoRound.list(50);
  const settled = rounds.filter((r) => r.status === "SETTLED");
  const open = rounds.filter((r) => r.status === "OPEN");

  // Aggregate
  let totalBets = 0;
  let totalStakes = 0;
  let totalPayouts = 0;
  const callCounts = { SPIKE: 0, DRIFT: 0, CALM: 0 } as Record<string, number>;
  const callStakes = { SPIKE: 0, DRIFT: 0, CALM: 0 } as Record<string, number>;
  const resultCounts = { SPIKE: 0, DRIFT: 0, CALM: 0 } as Record<string, number>;
  for (const u of db.user.list()) {
    for (const b of db.mapigoBet.findByUser(u.id, 5_000)) {
      totalBets++;
      totalStakes += b.stake;
      if (b.status === "WON" && b.returnAmount) totalPayouts += b.returnAmount;
      callCounts[b.call]++;
      callStakes[b.call] += b.stake;
    }
  }
  for (const r of settled) {
    if (r.result) resultCounts[r.result]++;
  }
  const ngr = totalStakes - totalPayouts;
  const margin = totalStakes === 0 ? 0 : ((totalStakes - totalPayouts) / totalStakes) * 100;
  const totalCalls = (callCounts.SPIKE + callCounts.DRIFT + callCounts.CALM) || 1;
  const totalResults = (resultCounts.SPIKE + resultCounts.DRIFT + resultCounts.CALM) || 1;

  return (
    <>
      <AdminPageHead title="Mapigo analytics" sw="Takwimu za Mapigo" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Rounds played" sw="Raundi"     value={settled.length.toLocaleString()} delta={`${open.length} open`} pulse={open.length > 0} />
          <AdminKpi label="Calls placed"  sw="Madau"      value={totalBets.toLocaleString()} />
          <AdminKpi label="Stakes"        sw="Madau · jumla" value={formatTzs(totalStakes)} gold />
          <AdminKpi label="Margin"        sw="Faida"     value={`${margin.toFixed(1)}%`} gold delta={`NGR ${formatTzsCompact(ngr)}`} />
        </div>

        {/* Call distribution + Result distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard title="Call distribution" sw="Madau · SPIKE / DRIFT / CALM">
            <p className="text-caption text-text-tertiary mb-2">What players are picking — confidence vs reality.</p>
            <AdminStackedBar
              height={28}
              segments={[
                { flex: Math.max(2, callCounts.SPIKE), color: CALL_COLOR.SPIKE, label: `${Math.round((callCounts.SPIKE / totalCalls) * 100)}% SPIKE` },
                { flex: Math.max(2, callCounts.DRIFT), color: CALL_COLOR.DRIFT, label: `${Math.round((callCounts.DRIFT / totalCalls) * 100)}% DRIFT` },
                { flex: Math.max(2, callCounts.CALM),  color: CALL_COLOR.CALM,  label: `${Math.round((callCounts.CALM / totalCalls) * 100)}% CALM` },
              ]}
            />
            <div className="grid grid-cols-3 gap-2 pt-3">
              <CallStat label="SPIKE" count={callCounts.SPIKE} stake={callStakes.SPIKE} tone={CALL_COLOR.SPIKE} />
              <CallStat label="DRIFT" count={callCounts.DRIFT} stake={callStakes.DRIFT} tone={CALL_COLOR.DRIFT} />
              <CallStat label="CALM"  count={callCounts.CALM}  stake={callStakes.CALM}  tone={CALL_COLOR.CALM} />
            </div>
          </AdminCard>

          <AdminCard title="Outcome distribution" sw="Matokeo halisi">
            <p className="text-caption text-text-tertiary mb-2">What actually happened in settled rounds.</p>
            <AdminStackedBar
              height={28}
              segments={[
                { flex: Math.max(2, resultCounts.SPIKE), color: CALL_COLOR.SPIKE, label: `${Math.round((resultCounts.SPIKE / totalResults) * 100)}% SPIKE` },
                { flex: Math.max(2, resultCounts.DRIFT), color: CALL_COLOR.DRIFT, label: `${Math.round((resultCounts.DRIFT / totalResults) * 100)}% DRIFT` },
                { flex: Math.max(2, resultCounts.CALM),  color: CALL_COLOR.CALM,  label: `${Math.round((resultCounts.CALM / totalResults) * 100)}% CALM` },
              ]}
            />
            <p className="text-caption text-text-tertiary pt-3">
              Reference distribution from the deterministic algorithm: 45% SPIKE · 35% DRIFT · 20% CALM.
              Production swap to NIST SP 800-90A HRNG keeps these expected proportions but with true entropy.
            </p>
          </AdminCard>
        </div>

        {/* Recent rounds */}
        <AdminCard
          title="Recent rounds"
          sw="Raundi za hivi karibuni"
          action={<span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">{settled.length} settled</span>}
        >
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-caption min-w-[620px]">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                <tr>
                  <th className="text-left py-2 pr-3">Round</th>
                  <th className="text-left py-2 pr-3">Started</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2 pr-3">Result</th>
                  <th className="text-right py-2 pr-3">Pool</th>
                  <th className="text-right py-2 pl-3">Players</th>
                </tr>
              </thead>
              <tbody>
                {rounds.slice(0, 25).map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle/50 last:border-b-0">
                    <td className="py-2 pr-3 font-mono">#{r.number}</td>
                    <td className="py-2 pr-3 font-mono whitespace-nowrap text-text-tertiary">{r.startedAt.replace("T", " ").slice(0, 19)}</td>
                    <td className="py-2 pr-3">
                      <Chip size="sm" variant={r.status === "OPEN" ? "gold" : "neutral"}>
                        {r.status === "OPEN" ? "● OPEN" : "SETTLED"}
                      </Chip>
                    </td>
                    <td className="py-2 pr-3">{r.result ? <span style={{ color: CALL_COLOR[r.result] }}>{r.result}</span> : "—"}</td>
                    <td className="py-2 pr-3 font-mono tabular text-right text-gold">{formatTzs(r.pool)}</td>
                    <td className="py-2 pl-3 font-mono tabular text-right">{r.participants}</td>
                  </tr>
                ))}
                {rounds.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-text-tertiary">No Mapigo rounds yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </>
  );
}

function CallStat({ label, count, stake, tone }: { label: string; count: number; stake: number; tone: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-sunken/40 p-2.5 space-y-1">
      <p className="font-mono text-micro tracking-[0.14em] uppercase" style={{ color: tone }}>{label}</p>
      <p className="font-mono font-bold tabular text-text">{count.toLocaleString()}</p>
      <p className="font-mono text-micro tabular text-text-tertiary">{formatTzsCompact(stake)} staked</p>
    </div>
  );
}
