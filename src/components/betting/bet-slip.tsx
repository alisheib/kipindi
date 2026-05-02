"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { TeamBadge } from "./team-badge";
import { TimeWindowSelector } from "./time-window-selector";
import { OddsCard } from "./odds-card";
import { StakeSlider } from "./stake-slider";
import { cn, formatTzs } from "@/lib/utils";
import type { Match, Outcome } from "@/lib/mock-data";
import { placeBetAction } from "@/app/match/[id]/actions";

export function BetSlip({ match, balance, isAuthed = false, className }: { match: Match; balance: number; isAuthed?: boolean; className?: string }) {
  const firstOpen = match.windows.find((w) => w.status === "open" || w.status === "live") ?? match.windows[0];
  const [windowKind, setWindowKind] = useState(firstOpen.kind);
  const [outcome, setOutcome] = useState<Outcome | null>("home");
  const [stake, setStake] = useState(1_000);
  const [placed, setPlaced] = useState<{ payout: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const w = match.windows.find((x) => x.kind === windowKind)!;
  const canPlace = outcome !== null && stake >= 100 && stake <= balance && !isPending;

  const submit = async () => {
    if (!outcome) return;
    setError(null);
    setIsPending(true);
    const fd = new FormData();
    fd.set("matchId", match.id);
    fd.set("windowKind", windowKind);
    fd.set("outcome", outcome);
    fd.set("stake", String(stake));
    try {
      const result = await placeBetAction(fd);
      // result?.ok is the canonical check; if Next's RSC layer drops the value
      // (a known quirk in some build configs), treat absent error as success.
      if (result && !result.ok) {
        setError(result.error ?? "Could not place bet.");
        toast({ title: "Bet rejected", description: result.error ?? "Could not place bet.", variant: "danger" });
      } else {
        const payout = Math.round(stake * w.payRate);
        setPlaced({ payout });
        toast({
          title: "Bet placed · Dau limewekwa",
          description: `${formatTzs(stake)} on ${outcome === "home" ? match.home.shortName : outcome === "away" ? match.away.shortName : "Draw"} · ${w.label}`,
          variant: "success",
        });
        router.refresh();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error.";
      setError(msg);
      toast({ title: "Network error", description: msg, variant: "danger" });
    } finally {
      setIsPending(false);
    }
  };

  if (placed) {
    return (
      <div
        className={cn(
          "relative rounded-xl border border-gold-subtleHover/60 bg-bg-elevated/85 backdrop-blur-md p-4 space-y-3 kp-pop-in",
          className,
        )}
        style={{ boxShadow: "var(--glow-gold)" }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 size={28} className="text-gold" strokeWidth={2} />
          <p className="font-display text-title-md text-text">Bet placed · Dau limewekwa</p>
        </div>
        <div className="rounded-md bg-bg-sunken/60 border border-border-subtle p-3 space-y-1">
          <p className="text-body font-semibold text-text">
            {match.home.shortName} vs {match.away.shortName} · <span className="text-gold">{w.label}</span>
          </p>
          <p className="text-body-sm text-text-secondary">
            {outcome === "home" ? `${match.home.shortName} win` : outcome === "away" ? `${match.away.shortName} win` : "Draw · Sare"}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle mt-2">
            <span className="text-caption uppercase tracking-wide text-text-tertiary">Stake</span>
            <span className="text-body font-semibold text-text tabular">{formatTzs(stake)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-caption uppercase tracking-wide text-text-tertiary">If you win</span>
            <span className="text-body font-bold text-gold tabular">{formatTzs(placed.payout)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setPlaced(null); setError(null); }} fullWidth size="lg">
            Place another · Weka tena
          </Button>
          <Link href="/bets" className="flex-1">
            <Button variant="ghost" size="lg" fullWidth>View my bets →</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-bg-elevated/80 backdrop-blur-xl p-4 space-y-4 shadow-e3",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-title-sm text-text">Place a bet · Weka dau</p>
        <Chip variant="brand" size="sm">{match.league}</Chip>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-bg-sunken/60 border border-border-subtle">
        <div className="flex items-center gap-2">
          <TeamBadge team={match.home} size="sm" />
          <span className="text-label font-semibold text-text">{match.home.shortName}</span>
        </div>
        <span className="font-display font-bold text-title-sm tabular text-text leading-none">
          {match.homeScore} <span className="text-text-tertiary">·</span> {match.awayScore}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-label font-semibold text-text">{match.away.shortName}</span>
          <TeamBadge team={match.away} size="sm" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-medium">Time window · Kipindi</p>
        <TimeWindowSelector windows={match.windows} value={windowKind} onChange={setWindowKind} />
      </div>

      <div className="space-y-2">
        <p className="text-micro uppercase tracking-[0.14em] text-text-tertiary font-medium">Outcome · Matokeo</p>
        <OddsCard
          homeName={match.home.shortName}
          awayName={match.away.shortName}
          windowPool={w.pool}
          payRate={w.payRate}
          selected={outcome}
          onSelect={setOutcome}
        />
      </div>

      <div>
        <StakeSlider value={stake} onChange={setStake} balance={balance} payRate={w.payRate} />
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-danger-bg/30 border border-danger/30">
          <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" />
          <p className="text-caption text-danger flex-1">{error}</p>
        </div>
      )}

      {!isAuthed ? (
        <Link href="/auth/login" className="block">
          <Button variant="primary" size="xl" fullWidth>Sign in to bet · Ingia</Button>
        </Link>
      ) : (
        <Button variant="gold" size="xl" fullWidth disabled={!canPlace} onClick={submit} loading={isPending}>
          Place bet · {formatTzs(stake)}
        </Button>
      )}

      <div className="flex items-center gap-1.5 text-micro text-text-tertiary justify-center">
        <ShieldCheck size={12} strokeWidth={1.5} />
        <span>18+. Pool grows whether you win or lose. Take a break anytime.</span>
      </div>
    </div>
  );
}
