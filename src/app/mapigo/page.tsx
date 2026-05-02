"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Chip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { queueWinToast } from "@/components/betting/cross-page-win-toast";
import { TeamBadge } from "@/components/betting/team-badge";
import { LivePill } from "@/components/betting/live-pill";
import { MapigoWaveform } from "@/components/mapigo/waveform";
import { PredictionTray } from "@/components/mapigo/prediction-tray";
import { RoundBanner } from "@/components/mapigo/round-banner";
import { MapigoStakeInput } from "@/components/mapigo/stake-input";
import { RoundsFeed } from "@/components/mapigo/rounds-feed";
import { MapigoLeaderboardMini } from "@/components/mapigo/leaderboard-mini";
import { MapigoWordmark } from "@/components/mapigo/mapigo-mark";
import { OutcomePill } from "@/components/mapigo/outcome-pill";
import { matches } from "@/lib/mock-data";
import { genWaveform, currentRound, recentRounds, sessionStats, type MapigoCall } from "@/lib/mapigo-data";
import { formatTzs, formatTzsCompact } from "@/lib/utils";
import { placeMapigoBetAction, settleCurrentRoundAction } from "./actions";

export default function MapigoPage() {
  const liveMatch = matches.find((m) => m.status === "live")!;
  const waveData = genWaveform(120, 1);
  const [selectedCall, setSelectedCall] = useState<MapigoCall | null>(null);
  const [stake, setStake] = useState(1_000);
  const [placedCall, setPlacedCall] = useState<MapigoCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [winFlash, setWinFlash] = useState<{ payout: number; result: MapigoCall } | null>(null);
  const [tick, setTick] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  // Round countdown ticker — re-render every second
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 60), 1000);
    return () => clearInterval(id);
  }, []);

  const place = async () => {
    if (!selectedCall) return;
    setError(null);
    setIsPending(true);
    const fd = new FormData();
    fd.set("call", selectedCall);
    fd.set("stake", String(stake));
    try {
      const result = await placeMapigoBetAction(fd);
      if (result?.ok) {
        setPlacedCall(selectedCall);
        toast({
          title: "Mapigo call placed · Imewekwa",
          description: `${selectedCall} · ${formatTzs(stake)}`,
          variant: "success",
        });
        router.refresh();
      } else {
        const msg = result?.error ?? "Could not place bet.";
        setError(msg);
        toast({ title: "Call rejected", description: msg, variant: "danger" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error.";
      setError(msg);
      toast({ title: "Network error", description: msg, variant: "danger" });
    } finally {
      setIsPending(false);
    }
  };

  const settle = async (forced?: "SPIKE" | "DRIFT" | "CALM") => {
    setIsPending(true);
    const fd = new FormData();
    if (forced) fd.set("result", forced);
    try {
      const result = await settleCurrentRoundAction(fd);
      const won = result?.ok && result.data?.result === placedCall;
      const settledResult = result?.ok ? result.data!.result : null;
      if (won && placedCall) {
        const payout = Math.round(stake * currentRound.payRate[placedCall]);
        setWinFlash({ payout, result: placedCall });
        toast({
          title: "You won · Umeshinda",
          description: `+${formatTzs(payout)} · ${placedCall} call`,
          variant: "gold",
          durationMs: 6_000,
        });
        // Buffer a cross-page toast in case the user navigates immediately
        queueWinToast({
          title: "Mapigo payout · Malipo",
          amount: payout,
          label: `${placedCall} call`,
        });
        setTimeout(() => setWinFlash(null), 4500);
      } else if (settledResult) {
        setError(`The pool grew · ${settledResult} won. Try the next round.`);
        toast({
          title: `Round settled · ${settledResult} won`,
          description: "The pool grew — try the next round.",
          variant: "warning",
        });
        setTimeout(() => setError(null), 3500);
      }
      setPlacedCall(null);
      setSelectedCall(null);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  const payRate = currentRound.payRate[selectedCall ?? "DRIFT"];

  return (
    <div className="relative min-h-[calc(100vh-44px)] overflow-hidden bg-[#060F24]">
      {/* Atmospheric backdrop — always dark, regardless of theme (this is a stage) */}
      <div aria-hidden className="absolute inset-0 bg-g-brand pointer-events-none" />
      <Pattern kind="sokoni" opacity={0.06} color="#DEBC54" className="!fixed inset-0" />
      <div
        aria-hidden
        className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(222,188,84,0.18) 0%, rgba(222,188,84,0) 60%)" }}
      />

      <div className="relative mx-auto max-w-[1400px] px-3 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-5">
        {/* HEADER */}
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <MapigoWordmark className="text-text text-title-md lg:text-title-lg" />
            <span className="text-caption uppercase tracking-[0.18em] text-text-tertiary font-bold border-l border-border-divider pl-3">Feel the match · Hisi mechi</span>
          </div>
          <div className="flex items-center gap-2">
            <LivePill minute={liveMatch.minute} size="md" />
            <button
              type="button"
              className="h-7 px-3 rounded-sm border border-border-subtle bg-surface/60 backdrop-blur-sm text-caption font-bold uppercase tracking-[0.14em] text-text-secondary hover:text-text hover:border-border-strong transition-colors duration-micro"
            >
              How it works
            </button>
          </div>
        </header>

        {/* MATCH STRIP */}
        <Card className="overflow-hidden border-border">
          <CardBody className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Chip variant="brand" size="sm">{liveMatch.league}</Chip>
              <div className="flex items-center gap-2">
                <TeamBadge team={liveMatch.home} size="sm" glow />
                <span className="text-body font-bold text-text">{liveMatch.home.shortName}</span>
                <span className="font-display font-bold text-title-sm tabular text-text mx-1.5">
                  {liveMatch.homeScore}<span className="text-text-tertiary mx-1">·</span>{liveMatch.awayScore}
                </span>
                <span className="text-body font-bold text-text">{liveMatch.away.shortName}</span>
                <TeamBadge team={liveMatch.away} size="sm" glow />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="text-caption text-text-tertiary uppercase tracking-[0.14em] font-bold hover:text-text transition-colors duration-micro">
                Switch match · Badilisha
              </button>
            </div>
          </CardBody>
        </Card>

        {/* ROUND BANNER — elapsed advances each second via the tick interval */}
        <RoundBanner
          number={currentRound.number}
          elapsedSec={(currentRound.startedAtMs + tick) % 60}
          totalSec={60}
          pool={currentRound.pool + (placedCall ? stake : 0)}
          participants={currentRound.participants + (placedCall ? 1 : 0)}
        />

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-4">
            {/* WAVEFORM CANVAS */}
            <Card className="relative overflow-hidden border-gold-subtleHover/30 bg-[#060F24] text-onBrand">
              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
              <div className="relative">
                <MapigoWaveform data={waveData} height={260} roundProgress={currentRound.startedAtMs / 60} anchors={placedCall ? [{ position: 100, call: placedCall, status: "active" }] : []} />
              </div>
              <div className="relative px-4 py-2.5 border-t border-border-divider/60 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-micro text-text-tertiary uppercase tracking-[0.14em] font-bold">Pulse · Mapigo</span>
                  <span className="text-caption text-text font-bold tabular">{sessionStats.ambient} BPM</span>
                  <Delta value={+12.4} size="xs" />
                </div>
                <div className="flex items-center gap-3 text-caption text-text-tertiary tabular">
                  <span><span className="font-mono">{currentRound.startedAtMs}</span>s elapsed</span>
                  <span aria-hidden>·</span>
                  <span><span className="font-mono">{60 - currentRound.startedAtMs}</span>s left</span>
                </div>
              </div>
            </Card>

            {/* PREDICTION TRAY */}
            <div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <h2 className="font-display text-title-sm text-text">Place your call · Chagua</h2>
                  <p className="text-caption text-text-tertiary uppercase tracking-[0.14em] font-bold">3 outcomes · 60 seconds</p>
                </div>
                {placedCall && (
                  <span className="inline-flex items-center gap-2 text-caption">
                    <span className="text-text-tertiary uppercase tracking-wider">Locked in:</span>
                    <OutcomePill call={placedCall} size="sm" />
                  </span>
                )}
              </div>
              <PredictionTray
                selected={selectedCall}
                onSelect={setSelectedCall}
                poolByCall={currentRound.poolByCall}
                payRate={currentRound.payRate}
                disabled={!!placedCall}
              />
            </div>

            {/* STAKE INPUT */}
            <MapigoStakeInput
              value={stake}
              onChange={setStake}
              payRate={payRate}
              selectedCall={selectedCall}
              disabled={!!placedCall || isPending}
              onPlace={place}
            />

            {error && (
              <div className="px-3 py-2 rounded-md bg-danger-bg/30 border border-danger/30 text-caption text-danger">
                {error}
              </div>
            )}

            {placedCall && (
              <div className="rounded-md border border-gold-subtleHover/30 bg-gold-subtle/15 p-3 space-y-2">
                <p className="text-caption font-bold uppercase tracking-[0.14em] text-gold">Demo controls · settle the round</p>
                <p className="text-caption text-text-secondary">For the manager walkthrough — settle this round with a chosen result and watch the wallet update.</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button size="md" variant="secondary" onClick={() => settle("SPIKE")} disabled={isPending}>SPIKE wins</Button>
                  <Button size="md" variant="secondary" onClick={() => settle("DRIFT")} disabled={isPending}>DRIFT wins</Button>
                  <Button size="md" variant="secondary" onClick={() => settle("CALM")} disabled={isPending}>CALM wins</Button>
                </div>
                <Link href="/bets" className="block text-caption font-bold text-royal hover:text-royal-hover transition-colors text-center">
                  → View my bets
                </Link>
              </div>
            )}

            {/* SESSION STATS STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <SessionStat label="This session" value={String(sessionStats.totalRounds)} sub="rounds" />
              <SessionStat label="Your wins" value={String(sessionStats.yourWins)} sub={`${sessionStats.yourWinRate}% rate`} />
              <SessionStat label="Your ROI" value={`+${sessionStats.yourROI}%`} sub="net session" tint="gold" />
              <SessionStat label="Streak" value={`×${sessionStats.yourStreak}`} sub="3 in a row" tint="gold" />
            </div>
          </div>

          {/* RIGHT RAIL */}
          <aside className="space-y-4 lg:sticky lg:top-12 self-start">
            <MapigoLeaderboardMini />
            <RoundsFeed rounds={recentRounds} />
          </aside>
        </div>

        {/* WIN CELEBRATION OVERLAY */}
        {winFlash && (
          <div className="fixed inset-0 z-celebration grid place-items-center bg-bg-overlay backdrop-blur-md p-3 kp-pop-in">
            <div className="relative max-w-md w-full rounded-2xl border-2 border-gold/50 overflow-hidden text-center" style={{ background: "var(--g-jackpot)", boxShadow: "var(--glow-jackpot)" }}>
              <div className="relative z-10 p-7 text-onBrand space-y-3">
                <p className="font-mono text-caption uppercase tracking-[0.22em] opacity-80">Round paid · Imelipa</p>
                <p className="font-display font-bold text-display-2 tabular leading-none text-gold drop-shadow-[0_0_24px_rgba(222,188,84,0.55)]">
                  +TZS {winFlash.payout.toLocaleString()}
                </p>
                <p className="text-body-lg opacity-90">You called <span className="font-mono font-bold text-gold">{winFlash.result}</span> · Umeshinda</p>
                <Button onClick={() => setWinFlash(null)} variant="gold" size="lg" fullWidth>Continue · Endelea</Button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER COMPLIANCE */}
        <footer className="pt-5 mt-5 border-t border-border-divider text-center">
          <p className="text-caption text-text-tertiary">
            Licensed by the Gaming Board of Tanzania · License No. <span className="font-mono">TZ-GBT-2026-XXXX</span> · 18+ · Mapigo follows responsible-play limits set in your profile.
          </p>
        </footer>
      </div>
    </div>
  );
}

function SessionStat({ label, value, sub, tint }: { label: string; value: string; sub: string; tint?: "gold" }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface/60 backdrop-blur-sm px-3 py-2.5">
      <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-bold">{label}</p>
      <p className={`font-display font-bold text-title-sm tabular leading-none mt-1 ${tint === "gold" ? "text-gold" : "text-text"}`}>{value}</p>
      <p className="text-micro text-text-tertiary mt-1">{sub}</p>
    </div>
  );
}
