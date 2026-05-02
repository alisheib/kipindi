import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { Pattern } from "@/components/ui/pattern";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TeamBadge } from "@/components/betting/team-badge";
import { MomentumBar } from "@/components/betting/momentum-bar";
import { BetSlip } from "@/components/betting/bet-slip";
import { LivePill } from "@/components/betting/live-pill";
import { BetsFeed } from "@/components/betting/bets-feed";
import { AreaChart } from "@/components/charts/area-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { StakeDistribution } from "@/components/charts/stake-distribution";
import { matches, wallet as mockWallet, recentBetsFor } from "@/lib/mock-data";
import { formatTzsCompact, hexToRgba } from "@/lib/utils";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";

export default async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = matches.find((m) => m.id === id);
  if (!match) notFound();

  const session = await currentSession();
  const realWallet = session ? db.wallet.findByUserId(session.userId) : null;
  const balance = realWallet?.balance ?? mockWallet.balance;
  const isAuthed = !!session;
  const totalPool = match.windows.reduce((s, w) => s + w.pool, 0);
  const totalHome = match.windows.reduce((s, w) => s + w.homeStake, 0);
  const totalDraw = match.windows.reduce((s, w) => s + w.drawStake, 0);
  const totalAway = match.windows.reduce((s, w) => s + w.awayStake, 0);
  const isLive = match.status === "live";
  const recentBets = recentBetsFor(id);

  const heroTint = `radial-gradient(60% 80% at 0% 50%, ${hexToRgba(match.home.color, 0.32)} 0%, transparent 65%), radial-gradient(60% 80% at 100% 50%, ${hexToRgba(match.away.color, 0.32)} 0%, transparent 65%)`;

  return (
    <div className="mx-auto max-w-[1280px] px-3 lg:px-6 py-4 lg:py-5 space-y-4 lg:space-y-5">
      <Breadcrumbs items={[
        { label: "Matches", href: "/" },
        { label: `${match.home.shortName} vs ${match.away.shortName}` },
      ]} />
      <h1 className="sr-only">{match.home.name} vs {match.away.name} — {match.league}</h1>
      {/* HERO — compact, dense */}
      <section className="relative rounded-xl overflow-hidden border border-royal/40">
        <div className="absolute inset-0 bg-g-brand" aria-hidden />
        <div className="absolute inset-0" aria-hidden style={{ backgroundImage: heroTint }} />
        <Pattern kind="mfumo" opacity={0.06} color="#FFFFFF" />
        <div className="relative z-10 p-4 lg:p-6 text-white space-y-3">
          <div className="flex items-center justify-between">
            <Chip variant="gold" size="sm">{match.league}</Chip>
            {isLive ? <LivePill minute={match.minute} size="md" /> : <Chip size="sm">FT · Imekwisha</Chip>}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <TeamBadge team={match.home} size="xl" glow={isLive} />
              <span className="font-display text-title-sm lg:text-title-md text-onBrand">{match.home.shortName}</span>
              <span className="text-caption opacity-70">{match.home.name}</span>
            </div>
            <div className="flex items-center gap-2 lg:gap-3 font-display font-bold text-display-3 lg:text-display-1 tabular leading-none">
              <span>{match.homeScore}</span>
              <span className="text-onBrand/40 text-display-3">·</span>
              <span>{match.awayScore}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <TeamBadge team={match.away} size="xl" glow={isLive} />
              <span className="font-display text-title-sm lg:text-title-md text-onBrand">{match.away.shortName}</span>
              <span className="text-caption opacity-70">{match.away.name}</span>
            </div>
          </div>
          <div className="max-w-md mx-auto">
            <MomentumBar momentum={match.momentum} />
            <p className="text-caption opacity-70 text-center mt-1.5 tabular">
              Last 5 min · {match.home.shortName} {(50 - match.momentum / 2).toFixed(0)}% · {match.away.shortName} {(50 + match.momentum / 2).toFixed(0)}%
            </p>
          </div>
        </div>
      </section>

      {/* TRADING-SCREEN GRID: pool + chart + windows + slip + feed */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_400px] gap-4">
        <div className="space-y-4">
          {/* Pool with chart */}
          <Card className="relative overflow-hidden">
            <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gold" />
            <CardBody className="space-y-3">
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-bold">Pool · Bwawa</p>
                  <p className="font-display font-bold text-display-2 lg:text-display-1 tabular leading-none mt-0.5">
                    <span className="text-gold drop-shadow-[0_0_24px_rgba(222,188,84,0.45)]">TZS {totalPool.toLocaleString()}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {match.growth1h !== undefined && <Delta value={match.growth1h} size="sm" />}
                    <span className="text-caption text-text-tertiary">last 60 min · across {Math.floor(totalPool/250).toLocaleString()} stakes</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-bold">Avg pay rate</p>
                  <p className="font-display font-bold text-title-md tabular text-text leading-none mt-0.5">
                    ×{(match.windows.reduce((s,w) => s + w.payRate, 0) / match.windows.length).toFixed(2)}
                  </p>
                  <p className="text-caption text-text-tertiary mt-1.5">across all windows</p>
                </div>
              </div>
              <AreaChart data={match.poolHistory} height={120} color="var(--gold)" highlight={match.poolHistory.length - 1} />
              <div className="flex items-center justify-between text-micro text-text-tertiary tabular font-medium">
                <span>−60 min</span>
                <span>−45</span>
                <span>−30</span>
                <span>−15</span>
                <span className="text-gold">now</span>
              </div>
            </CardBody>
          </Card>

          {/* Stake distribution + windows table */}
          <Card>
            <CardBody className="space-y-3">
              <StakeDistribution
                home={totalHome}
                draw={totalDraw}
                away={totalAway}
                homeLabel={match.home.shortName}
                awayLabel={match.away.shortName}
              />
              <div className="border-t border-border-divider pt-3">
                <p className="font-display text-label uppercase tracking-wider font-bold text-text-tertiary mb-2">By window · Kwa kipindi</p>
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-2 items-center text-label">
                  <span className="text-micro text-text-tertiary uppercase tracking-wide font-bold col-start-3">Pay rate</span>
                  <span className="text-micro text-text-tertiary uppercase tracking-wide font-bold text-right">Pool</span>
                  {match.windows.map((w) => {
                    const closed = w.status === "closed" || w.status === "settled";
                    const live = w.status === "live";
                    return (
                      <div key={w.kind} className="contents">
                        <div className={`flex items-center gap-1.5 ${closed ? "opacity-60" : ""}`}>
                          <span className="font-display font-bold text-body text-text tabular">{w.label}</span>
                          {live && <Chip variant="gold" size="sm"><span aria-hidden className="h-1 w-1 rounded-pill bg-gold" /> Live</Chip>}
                          {closed && <Chip size="sm">Settled</Chip>}
                        </div>
                        <Sparkline data={match.poolHistory.slice(-20).map((v) => v * (0.04 + (w.pool / totalPool) * 0.5))} color="var(--gold)" width={120} height={22} filled showDot={false} />
                        <span className="text-label font-bold tabular text-text-secondary">×{w.payRate.toFixed(2)}</span>
                        <span className="text-label font-bold tabular text-gold text-right">{formatTzsCompact(w.pool)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* How pool pays */}
          <Card>
            <CardBody className="space-y-2">
              <p className="font-display text-title-sm text-text">How the pool pays · Bwawa hulipa vipi</p>
              <ul className="space-y-1.5 text-body-sm text-text-secondary">
                <li>· Stakes from all players join the window&apos;s pool · Madau yote huingia katika bwawa la kipindi.</li>
                <li>· When the window closes, winners share the pool — the bigger your stake, the bigger your share · Bwawa linagawanywa kati ya washindi.</li>
                <li>· Cash out before the window closes · Toa mapema kabla kipindi hakijafungwa.</li>
                <li>· Detailed payout rules are in the <a href="/legal/terms" className="text-royal hover:underline">Terms of Service</a> · Sheria za malipo zimo katika Masharti.</li>
              </ul>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-12 self-start">
          <BetSlip match={match} balance={balance} isAuthed={isAuthed} />
          <BetsFeed bets={recentBets.slice(0, 8)} title="Live bets · Madau" />
        </aside>
      </div>
    </div>
  );
}

