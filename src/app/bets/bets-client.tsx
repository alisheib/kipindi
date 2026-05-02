"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { NoBetsYet } from "@/components/ui/illustrations";
import { ResultChip } from "@/components/betting/result-chip";
import { OutcomePill } from "@/components/mapigo/outcome-pill";
import { TeamBadge } from "@/components/betting/team-badge";
import { formatTzs } from "@/lib/utils";
import type { Bet as MockBet } from "@/lib/mock-data";

export type MapigoBetView = {
  id: string;
  call: "SPIKE" | "DRIFT" | "CALM";
  stake: number;
  potentialReturn: number;
  status: "PLACED" | "WON" | "LOST";
  returnAmount: number | null;
  placedAt: string;
};

export function BetsClient({
  bets,
  mapigoBets,
  isDemo,
}: {
  bets: MockBet[];
  mapigoBets: MapigoBetView[];
  isDemo: boolean;
}) {
  const [tab, setTab] = useState<"active" | "settled" | "all">("active");
  const counts = {
    active: bets.filter((b) => b.status === "placed").length + mapigoBets.filter((b) => b.status === "PLACED").length,
    settled: bets.filter((b) => b.status !== "placed").length + mapigoBets.filter((b) => b.status !== "PLACED").length,
    all: bets.length + mapigoBets.length,
  };
  const filteredMatch = bets.filter((b) => {
    if (tab === "active") return b.status === "placed";
    if (tab === "settled") return b.status === "won" || b.status === "lost" || b.status === "voided" || b.status === "cashedout";
    return true;
  });
  const filteredMapigo = mapigoBets.filter((b) => {
    if (tab === "active") return b.status === "PLACED";
    if (tab === "settled") return b.status !== "PLACED";
    return true;
  });

  return (
    <div className="mx-auto max-w-[960px] px-3 lg:px-6 py-4 lg:py-6 space-y-4">
      <Breadcrumbs items={[{ label: "My bets", labelSw: "Madau yangu" }]} />
      <header>
        <h1 className="font-display text-title-lg text-text">My bets · Madau yangu</h1>
        {isDemo && <p className="text-caption text-text-tertiary mt-0.5">Demo mode · all stakes are virtual.</p>}
      </header>

      <Tabs
        variant="segmented"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        tabs={[
          { value: "active",  labelEn: `Active · ${counts.active}` },
          { value: "settled", labelEn: `Settled · ${counts.settled}` },
          { value: "all",     labelEn: `All · ${counts.all}` },
        ]}
      />

      {filteredMatch.length === 0 && filteredMapigo.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              illustration={<NoBetsYet />}
              title="No bets here yet · Hakuna dau"
              description="Pick a match to begin · Chagua mechi kuanza."
              action={
                <div className="flex gap-2 justify-center">
                  <Link href="/live"><Button variant="primary" size="lg">Browse matches</Button></Link>
                  <Link href="/mapigo"><Button variant="secondary" size="lg">Play Mapigo</Button></Link>
                </div>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMatch.map((b) => {
            const isWin = b.status === "won";
            return (
              <Card key={b.id} interactive className={isWin ? "border-gold-subtleHover/40" : undefined}>
                <CardBody className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Chip variant="neutral" size="sm">{b.match.league}</Chip>
                    <ResultChip status={b.status} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamBadge team={b.match.home} size="sm" />
                      <span className="text-body font-semibold text-text truncate">{b.match.home.shortName}</span>
                      <span className="text-text-tertiary px-0.5">vs</span>
                      <span className="text-body font-semibold text-text truncate">{b.match.away.shortName}</span>
                      <TeamBadge team={b.match.away} size="sm" />
                    </div>
                    <Chip variant="brand" size="md">{b.windowLabel}</Chip>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border-divider">
                    <div>
                      <p className="text-caption uppercase text-text-tertiary tracking-wide leading-tight">Outcome</p>
                      <p className="text-body-sm font-semibold text-text leading-tight mt-0.5">
                        {b.outcome === "home" ? `${b.match.home.shortName} win` : b.outcome === "away" ? `${b.match.away.shortName} win` : "Draw · Sare"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-caption uppercase text-text-tertiary tracking-wide leading-tight">Stake → return</p>
                      <p className="text-body-sm font-bold tabular leading-tight mt-0.5">
                        <span className="text-text">{formatTzs(b.stake)}</span>
                        <span className="text-text-tertiary mx-1">→</span>
                        <span className={isWin ? "text-gold" : "text-text-secondary"}>
                          {isWin && b.returnAmount ? formatTzs(b.returnAmount) : formatTzs(b.potentialReturn)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="text-micro text-text-tertiary tabular">
                    Ref <span className="font-mono">{b.id}</span> · placed {new Date(b.placedAt).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </CardBody>
              </Card>
            );
          })}

          {filteredMapigo.map((b) => (
            <Card key={b.id} interactive className={b.status === "WON" ? "border-gold-subtleHover/40" : undefined}>
              <CardBody className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Chip variant="gold" size="sm">Mapigo</Chip>
                  <span>
                    {b.status === "WON" && <Chip variant="gold">Won · Imeshinda</Chip>}
                    {b.status === "LOST" && <Chip variant="neutral">Pool grew · Bwawa limeongezeka</Chip>}
                    {b.status === "PLACED" && <Chip variant="brand">Placed · Limewekwa</Chip>}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <OutcomePill call={b.call} size="md" />
                  <div className="text-right">
                    <p className="text-caption uppercase text-text-tertiary tracking-wide">Stake → return</p>
                    <p className="text-body-sm font-bold tabular leading-tight">
                      <span className="text-text">{formatTzs(b.stake)}</span>
                      <span className="text-text-tertiary mx-1">→</span>
                      <span className={b.status === "WON" ? "text-gold" : "text-text-secondary"}>
                        {b.status === "WON" && b.returnAmount ? formatTzs(b.returnAmount) : formatTzs(b.potentialReturn)}
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-micro text-text-tertiary tabular">
                  Ref <span className="font-mono">{b.id}</span> · placed {new Date(b.placedAt).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
