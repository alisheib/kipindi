import { AdminPageHead, AdminKpi, AdminCard, FeedRow } from "@/components/admin/admin-shell";
import { AdminAreaChart } from "@/components/admin/admin-charts";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { db } from "@/lib/server/store";
import { getAuditPage } from "@/lib/server/audit";
import { matches } from "@/lib/ui-stubs";
import { activePlayers, moneyFlowSeries, grossGamingRevenue } from "@/lib/server/analytics";
import { formatTzs, formatTzsCompact, formatTime } from "@/lib/utils";

type MatchStub = {
  id: string;
  status: string;
  league: string;
  home: { shortName: string };
  away: { shortName: string };
  homeScore: number;
  awayScore: number;
  minute: number;
  windows: { pool: number }[];
};

export const metadata = { title: "Admin · Live ops" };
export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  const liveMatches = (matches as MatchStub[]).filter((m) => m.status === "live");
  const ggr = await grossGamingRevenue("today").catch(() => 0);
  const active = await activePlayers("today").catch(() => 0);
  const flow = await moneyFlowSeries("today", 24).catch(() => []);

  // Recent BET events
  const betEvents = getAuditPage({ category: "BET", limit: 30 });
  const walletEvents = getAuditPage({ category: "WALLET", limit: 30 });

  return (
    <>
      <AdminPageHead
        title="Live ops"
        sw="Operesheni za moja kwa moja"
        period={false}
        actions={
          // Aqua = live-feed signal (admin gold-discipline: gold only on the resolved seal).
          <span
            className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border"
            style={{ borderColor: "var(--aqua-400)", background: "color-mix(in oklab, var(--aqua-400) 12%, transparent)", color: "var(--aqua-400)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: "var(--aqua-400)" }} />
            polling · 5s
          </span>
        }
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Active players · live" sw="Wachezaji hai"   value={active.toLocaleString()} pulse />
          <AdminKpi label="GGR · 24h"             sw="Mapato"           value={`TZS ${formatTzsCompact(ggr).replace("TZS ", "")}`} />
          <AdminKpi label="Live matches"           sw="Mechi za moja"    value={liveMatches.length} pulse={liveMatches.length > 0} />
        </div>

        {/* Active matches */}
        <AdminCard title="Live matches · in progress" sw="Mechi za moja kwa moja">
          {liveMatches.length === 0 ? (
            <p className="text-caption text-text-tertiary py-4 text-center">No live matches at the moment.</p>
          ) : (
            <ScrollX label="Live matches" className="-mx-4 px-4">
              <table className="admin-tbl min-w-[600px]">
                <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                  <tr>
                    <th className="text-left py-2 pr-3">League</th>
                    <th className="text-left py-2 pr-3">Match</th>
                    <th className="text-left py-2 pr-3">Score</th>
                    <th className="text-left py-2 pr-3">Minute</th>
                    <th className="text-right py-2 pr-3">Total pool</th>
                    <th className="text-right py-2 pl-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {liveMatches.map((m) => {
                    const totalPool = m.windows.reduce((s, w) => s + w.pool, 0);
                    return (
                      <tr key={m.id} className="border-b border-border-subtle/50 last:border-b-0">
                        <td className="py-2 pr-3"><Chip size="sm" variant="brand">{m.league}</Chip></td>
                        <td className="py-2 pr-3 font-medium text-text">
                          {m.home.shortName} <span className="text-text-tertiary">vs</span> {m.away.shortName}
                        </td>
                        <td className="py-2 pr-3 font-mono tabular">{m.homeScore} · {m.awayScore}</td>
                        <td className="py-2 pr-3">
                          {/* Live match minute → aqua (admin live-feed signal), not gold. */}
                          <span
                            className="inline-flex items-center rounded-pill font-bold uppercase border"
                            style={{ height: 20, padding: "0 7px", fontSize: 10, letterSpacing: "0.06em", lineHeight: 1, borderColor: "oklch(70% 0.12 195 / 0.5)", background: "oklch(70% 0.12 195 / 0.18)", color: "var(--aqua-400)" }}
                          >
                            ●&nbsp;{m.minute}&apos;
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-mono tabular text-right text-text">{formatTzs(totalPool)}</td>
                        <td className="py-2 pl-3 text-right">
                          <a href={`/markets/${m.id}`} className="font-mono text-micro tracking-[0.10em] uppercase text-royal-300 hover:underline">view →</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
          )}
        </AdminCard>

        {/* Live flow + bet feed */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
          <AdminCard title="24-hour money flow · TZS net per hour" sw="Mtiririko">
            <AdminAreaChart series={flow} xLabels={flow.map((p) => p.label)} height={240} fillVar="var(--royal)" strokeVar="var(--royal)" />
          </AdminCard>
          <AdminCard title="Live bet feed" sw="Madau ya moja kwa moja" action={<a href="/admin/audit?category=BET" className="font-mono text-micro tracking-[0.10em] uppercase text-royal-300">all →</a>}>
            <div className="max-h-[300px] overflow-y-auto">
              {betEvents.length === 0 ? (
                <p className="text-caption text-text-tertiary py-3 text-center">No bet activity.</p>
              ) : betEvents.slice(0, 10).map((e) => (
                <FeedRow
                  key={e.id}
                  ts={formatTime(e.createdAt)}
                  category="BET"
                  variant="neutral"
                  body={`${e.action} · ${e.targetType ?? ""} ${e.targetId?.slice(0, 12) ?? ""}`}
                />
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Wallet activity */}
        <AdminCard title="Wallet activity · last 30" sw="Shughuli za pochi" action={<a href="/admin/audit?category=WALLET" className="font-mono text-micro tracking-[0.10em] uppercase text-royal-300">all →</a>}>
          <div className="max-h-[300px] overflow-y-auto">
            {walletEvents.length === 0 ? (
              <p className="text-caption text-text-tertiary py-3 text-center">No wallet activity.</p>
            ) : walletEvents.map((e) => (
              <FeedRow
                key={e.id}
                ts={e.createdAt.split("T")[1]?.slice(0, 8) ?? ""}
                category="WALLET"
                variant="royal"
                body={`${e.action} · ${e.targetType ?? ""} ${e.targetId?.slice(0, 12) ?? ""}`}
              />
            ))}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
