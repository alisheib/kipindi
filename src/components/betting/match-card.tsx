import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { Sparkline } from "@/components/charts/sparkline";
import { TeamBadge } from "./team-badge";
import { MomentumBar } from "./momentum-bar";
import { LivePill } from "./live-pill";
import { cn, formatTzsCompact, hexToRgba } from "@/lib/utils";
import type { Match } from "@/lib/mock-data";

export function MatchCard({ match }: { match: Match }) {
  const totalPool = match.windows.reduce((s, w) => s + w.pool, 0);
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  const backGlow = `radial-gradient(120% 120% at 0% 50%, ${hexToRgba(match.home.color, 0.15)} 0%, transparent 55%), radial-gradient(120% 120% at 100% 50%, ${hexToRgba(match.away.color, 0.15)} 0%, transparent 55%)`;

  return (
    <Link href={`/match/${match.id}`} className="block h-full">
      <Card
        interactive
        className={cn(
          "relative overflow-hidden border transition-all duration-medium group h-full flex flex-col",
          isLive && "border-royal/40 shadow-glow-blue",
          isFinished && "opacity-80",
        )}
      >
        <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: backGlow }} />
        <CardBody className="relative space-y-2.5 z-10 flex-1 flex flex-col">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-caption text-text-tertiary uppercase tracking-[0.14em] font-bold truncate">{match.league}</span>
              {match.hot && (
                <span className="inline-flex items-center px-1 h-4 rounded-sm bg-gold-subtle/40 text-gold border border-gold-subtleHover/30 text-micro font-bold uppercase tracking-[0.14em]">
                  Surge
                </span>
              )}
            </div>
            {isLive && <LivePill minute={match.minute} size="sm" />}
            {isFinished && <Chip variant="neutral" size="sm">FT · Imekwisha</Chip>}
            {!isLive && !isFinished && (
              <span className="text-caption text-text-secondary tabular font-semibold">
                {new Date(match.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {/* Teams + score */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <TeamBadge team={match.home} size="md" glow={isLive} />
              <span className="text-body font-bold text-text truncate">{match.home.shortName}</span>
            </div>
            <div className="flex items-center gap-2 font-display font-bold text-title-lg tabular leading-none">
              <span className="text-text">{match.homeScore}</span>
              <span className="text-text-tertiary text-title-md">·</span>
              <span className="text-text">{match.awayScore}</span>
            </div>
            <div className="flex items-center gap-2 justify-end min-w-0">
              <span className="text-body font-bold text-text truncate">{match.away.shortName}</span>
              <TeamBadge team={match.away} size="md" glow={isLive} />
            </div>
          </div>

          {/* Momentum */}
          <MomentumBar momentum={match.momentum} />

          {/* Pool row with sparkline */}
          <div className="flex items-end justify-between pt-1 border-t border-border-divider/60 mt-auto">
            <div className="flex flex-wrap gap-1 min-h-[40px] content-end">
              {match.windows.map((w) => {
                const closed = w.status === "closed" || w.status === "settled";
                const live = w.status === "live";
                return (
                  <span
                    key={w.kind}
                    className={cn(
                      "h-5 px-1 inline-flex items-center justify-center rounded-sm text-micro font-bold tabular border",
                      closed && "border-border-subtle text-text-disabled line-through",
                      live && "border-gold/50 bg-gold-subtle/40 text-gold",
                      !closed && !live && "border-border-subtle text-text-secondary",
                    )}
                  >
                    {w.label}
                  </span>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Sparkline data={match.poolHistory.slice(-30)} color="var(--gold)" width={56} height={20} />
              <div className="text-right">
                <div className="text-micro uppercase tracking-wide text-text-tertiary leading-none font-bold">Pool</div>
                <div className="flex items-center gap-1 leading-tight">
                  <span className="text-label font-bold tabular text-gold">{formatTzsCompact(totalPool)}</span>
                  {match.growth1h !== undefined && match.growth1h > 0 && (
                    <Delta value={match.growth1h} size="xs" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
