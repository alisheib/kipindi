import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Sparkline } from "@/components/charts/sparkline";
import { Delta } from "@/components/ui/delta";
import { LivePill } from "@/components/betting/live-pill";
import { TeamBadge } from "@/components/betting/team-badge";
import { matches } from "@/lib/mock-data";
import { formatTzsCompact, hexToRgba } from "@/lib/utils";

/** Mixed African + European fixtures grid (uses our Tanzania mock matches for now). */
export function FixturesGrid() {
  const live = matches.filter((m) => m.status === "live");
  const soon = matches.filter((m) => m.status === "scheduled");
  const finished = matches.filter((m) => m.status === "finished").slice(0, 1);
  const all = [...live, ...soon, ...finished];

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Today · Leo</p>
          <h2 className="font-display font-bold text-title-md lg:text-title-lg text-text mt-1.5">Fixtures &amp; pools</h2>
        </div>
        <Link href="/dashboard" className="text-caption uppercase tracking-[0.14em] font-bold text-royal hover:text-royal-hover transition-colors">
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-fr">
        {all.map((m) => {
          const totalPool = m.windows.reduce((s, w) => s + w.pool, 0);
          const isLive = m.status === "live";
          const isFinished = m.status === "finished";
          const backGlow = `radial-gradient(120% 120% at 0% 50%, ${hexToRgba(m.home.color, 0.12)} 0%, transparent 55%), radial-gradient(120% 120% at 100% 50%, ${hexToRgba(m.away.color, 0.12)} 0%, transparent 55%)`;
          return (
            <Link key={m.id} href={`/match/${m.id}`} className="block h-full">
              <Card interactive className={`relative overflow-hidden border h-full flex flex-col ${isLive ? "border-gold-subtleHover/30" : "border-border-subtle"}`}>
                <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: backGlow }} />
                <CardBody className="relative space-y-2.5 z-10 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-micro text-text-tertiary uppercase tracking-[0.18em] font-bold truncate">{m.league}</span>
                    {isLive && <LivePill minute={m.minute} size="sm" />}
                    {isFinished && <Chip variant="neutral" size="sm">FT</Chip>}
                    {!isLive && !isFinished && (
                      <span className="text-caption text-text-secondary tabular font-mono">
                        {new Date(m.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamBadge team={m.home} size="sm" glow={isLive} />
                      <span className="text-body font-bold text-text truncate">{m.home.shortName}</span>
                    </div>
                    <div className="font-display font-bold text-title-sm tabular leading-none">
                      {m.homeScore}<span className="text-text-tertiary mx-1.5">·</span>{m.awayScore}
                    </div>
                    <div className="flex items-center gap-2 justify-end min-w-0">
                      <span className="text-body font-bold text-text truncate">{m.away.shortName}</span>
                      <TeamBadge team={m.away} size="sm" glow={isLive} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between pt-1.5 border-t border-border-divider/60 mt-auto">
                    <div className="flex flex-wrap gap-1 min-h-[36px] content-end">
                      {m.windows.map((w) => {
                        const closed = w.status === "closed" || w.status === "settled";
                        const wlive = w.status === "live";
                        return (
                          <span key={w.kind}
                            className={`h-4 px-1 inline-flex items-center justify-center rounded-sm text-micro font-bold tabular border ${
                              closed ? "border-border-subtle text-text-disabled line-through" :
                              wlive ? "border-gold/50 bg-gold-subtle/40 text-gold" :
                              "border-border-subtle text-text-secondary"}`}
                          >{w.label}</span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkline data={m.poolHistory.slice(-24)} color="var(--gold)" width={48} height={18} showDot={false} />
                      <div className="text-right">
                        <div className="text-micro uppercase tracking-wide text-text-tertiary leading-none font-bold">Pool</div>
                        <div className="flex items-center gap-1 leading-tight">
                          <span className="text-label font-bold tabular text-gold">{formatTzsCompact(totalPool)}</span>
                          {m.growth1h !== undefined && m.growth1h > 0 && <Delta value={m.growth1h} size="xs" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
