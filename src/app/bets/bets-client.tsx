"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/ui/toast";
import { formatTzs } from "@/lib/utils";
import { ArrowDownToLine } from "lucide-react";
import { cashOutBetAction } from "./actions";
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
  cashOutOffers = {},
}: {
  bets: MockBet[];
  mapigoBets: MapigoBetView[];
  isDemo: boolean;
  cashOutOffers?: Record<string, number>;
}) {
  const [tab, setTab] = useState<"active" | "settled" | "all">("active");
  const [pendingCashOutId, setPendingCashOutId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleCashOut = (betId: string, offer: number) => {
    setPendingCashOutId(betId);
    const fd = new FormData();
    fd.set("betId", betId);
    startTransition(async () => {
      const result = await cashOutBetAction(fd);
      if (result?.ok) {
        toast({
          title: `Cashed out · ${formatTzs(offer)}`,
          description: "Funds back in your wallet · Pesa imerejea",
          variant: "gold",
        });
        router.refresh();
      } else {
        toast({
          title: "Cash-out failed",
          description: result?.error ?? "Try again.",
          variant: "danger",
        });
      }
      setPendingCashOutId(null);
    });
  };
  const counts = {
    active: bets.filter((b) => b.status === "placed").length + mapigoBets.filter((b) => b.status === "PLACED").length,
    settled: bets.filter((b) => b.status !== "placed").length + mapigoBets.filter((b) => b.status !== "PLACED").length,
    all: bets.length + mapigoBets.length,
  };
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  // Reset to page 1 when tab changes
  const setTabAndReset = (v: typeof tab) => { setTab(v); setPage(1); };

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
  const totalCount = filteredMatch.length + filteredMapigo.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  // Page slicing: combine the two lists in their existing order, slice
  const combined: Array<{ kind: "match"; data: MockBet } | { kind: "mapigo"; data: MapigoBetView }> = [
    ...filteredMatch.map((b) => ({ kind: "match" as const, data: b })),
    ...filteredMapigo.map((b) => ({ kind: "mapigo" as const, data: b })),
  ];
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedItems = combined.slice(pageStart, pageEnd);
  const pagedMatch = pagedItems.filter((x) => x.kind === "match").map((x) => x.data as MockBet);
  const pagedMapigo = pagedItems.filter((x) => x.kind === "mapigo").map((x) => x.data as MapigoBetView);

  return (
    <div className="mx-auto max-w-[960px] px-3 lg:px-6 py-4 lg:py-6 space-y-4 overflow-x-hidden">
      <Breadcrumbs items={[{ label: "My bets", labelSw: "Madau yangu" }]} />
      <header>
        <h1 className="font-display text-title-lg text-text">My bets · Madau yangu</h1>
        {isDemo && <p className="text-caption text-text-tertiary mt-0.5">Demo mode · all stakes are virtual.</p>}
      </header>

      <Tabs
        variant="segmented"
        value={tab}
        onChange={(v) => setTabAndReset(v as typeof tab)}
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
          {pagedMatch.map((b) => {
            const isWin = b.status === "won";
            return (
              <Card key={b.id} interactive className={isWin ? "border-gold-subtleHover/40" : undefined}>
                <CardBody className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Chip variant="neutral" size="sm">{b.match.league}</Chip>
                    <ResultChip status={b.status} />
                  </div>
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <TeamBadge team={b.match.home} size="sm" />
                      <span className="text-body font-semibold text-text truncate">{b.match.home.shortName}</span>
                      <span className="text-text-tertiary px-0.5 shrink-0">vs</span>
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
                  {b.status === "placed" && cashOutOffers[b.id] !== undefined && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-divider">
                      <div>
                        <p className="text-caption uppercase tracking-wide text-text-tertiary leading-tight">Cash-out · Toa sasa</p>
                        <p className="text-body font-bold text-gold tabular leading-tight mt-0.5">{formatTzs(cashOutOffers[b.id])}</p>
                      </div>
                      <Button
                        variant="gold"
                        size="md"
                        leading={<ArrowDownToLine size={14} />}
                        onClick={() => handleCashOut(b.id, cashOutOffers[b.id])}
                        loading={pendingCashOutId === b.id}
                      >
                        Cash out
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}

          {pagedMapigo.map((b) => (
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

          {totalCount > PAGE_SIZE && (
            <nav aria-label="Bet history pagination" className="flex items-center justify-between gap-2 pt-3">
              <p className="text-caption text-text-secondary tabular">
                Showing {pageStart + 1}–{Math.min(pageEnd, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  ← Prev
                </Button>
                <span className="text-caption font-mono text-text-secondary px-2 tabular">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  Next →
                </Button>
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
