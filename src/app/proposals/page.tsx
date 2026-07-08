import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { listBoard, type BoardFilter, type ProposalView } from "@/lib/server/proposals-service";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ProposePromo } from "@/components/ui/propose-promo";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { VoteControl } from "@/components/proposals/vote-control";
import { StatusBadge } from "@/components/proposals/status-badge";
import { CategoryIcon, categoryLabel } from "@/components/proposals/category-icon";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.proposals.title };
}
export const dynamic = "force-dynamic";

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ f?: string; page?: string }> }) {
  const { t, locale } = await getServerT();

  const FILTERS: Array<{ id: BoardFilter; label: string }> = [
    { id: "hot", label: t.proposals.filterHot },
    { id: "new", label: t.proposals.filterNew },
    { id: "listed", label: t.proposals.filterListed },
    { id: "mine", label: t.proposals.filterMine },
  ];

  function ageStr(iso: string): string {
    const ms = Date.now() - Date.parse(iso);
    const d = Math.floor(ms / 86_400_000);
    if (d > 0) return `${d} ${t.proposals.dAgo}`;
    const h = Math.floor(ms / 3_600_000);
    if (h > 0) return `${h} ${t.proposals.hAgo}`;
    const m = Math.max(1, Math.floor(ms / 60_000));
    return `${m} ${t.proposals.mAgo}`;
  }

  const sp = await searchParams;
  const filter: BoardFilter = (["hot", "new", "listed", "mine"] as const).includes(sp.f as BoardFilter) ? (sp.f as BoardFilter) : "hot";
  const session = await currentSession();
  if (filter === "mine" && !session) redirect("/auth/login?next=/proposals");

  const cfg = getProposalsConfig();
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { proposals, matchedCount, totalProposals, totalVotes, enabled, page } = await listBoard(session?.userId ?? null, filter, pageNum, PLAYER_PER_PAGE).catch(() => ({ proposals: [] as ProposalView[], matchedCount: 0, totalProposals: 0, totalVotes: 0, enabled: false, page: 1 }));
  const proposalsBaseHref = `/proposals?f=${filter}`;

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <h1 className="sr-only">{t.proposals.title}</h1>

      <PageHero glow="gold" contentClassName="relative z-10 p-5 lg:p-6 flex items-start justify-between gap-4">
        <PageHeader tone="gold" icon={<I.trophy s={18} />} eyebrow={t.proposals.title} title={t.proposals.voteForMarkets} />
        {enabled && (
          <Link href={"/proposals/new" as never} className="shrink-0">
            <Button variant="gold" size="md" leading={<I.plus s={15} />}>{t.proposals.create}</Button>
          </Link>
        )}
      </PageHero>

      {/* Reward promo — shared gold "propose & get paid" card (→ create). */}
      <ProposePromo href="/proposals/new" />

      {!enabled && (
        <div className="flex gap-2.5 rounded-xl border p-3" style={{ background: "color-mix(in oklab, var(--warning-500) 12%, transparent)", borderColor: "color-mix(in oklab, var(--warning-500) 30%, transparent)" }}>
          <span className="shrink-0" style={{ color: "oklch(84% 0.15 80)" }}><I.info s={16} /></span>
          <p className="text-[12px] leading-relaxed text-text-muted">{t.proposals.proposalsPaused}</p>
        </div>
      )}

      {/* Stats + filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="font-mono text-[12px] text-text-muted">{totalProposals.toLocaleString()} {t.proposals.proposalsCount} · {totalVotes.toLocaleString()} {t.proposals.votesCount}</p>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = f.id === filter;
            return (
              <Link
                key={f.id}
                href={`/proposals?f=${f.id}` as never}
                className={
                  "inline-flex h-8 items-center rounded-md border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-all " +
                  (active
                    ? "border-brand-500 text-text"
                    : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
                }
                style={active ? { background: "var(--pill-active)" } : undefined}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* List / empty */}
      {proposals.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {proposals.map((p) => (
              <ProposalCard key={p.id} p={p} disabled={!enabled} t={t} locale={locale} ageStr={ageStr} />
            ))}
          </div>
          {matchedCount > PLAYER_PER_PAGE && (
            <div className="rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
              <Pagination total={matchedCount} page={page} perPage={PLAYER_PER_PAGE} baseHref={proposalsBaseHref} ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} />
            </div>
          )}
        </>
      ) : totalProposals === 0 ? (
        <EmptyState
          kind="markets"
          title={t.proposals.noProposalsYet}
          body={`${t.proposals.noProposalsBody} ${t.proposals.noProposalsReward} TZS ${cfg.prizeTzs.toLocaleString()}.`}
          action={enabled ? (
            <Link href={"/proposals/new" as never}><Button variant="gold" size="sm" leading={<I.plus s={12} />}>{t.proposals.create}</Button></Link>
          ) : undefined}
        />
      ) : (
        <EmptyState
          kind="markets"
          title={t.proposals.noProposalsInFilter}
          body={t.proposals.noProposalsInFilterBody}
          action={enabled ? (
            <Link href={"/proposals/new" as never}><Button variant="gold" size="sm" leading={<I.plus s={12} />}>{t.proposals.create}</Button></Link>
          ) : undefined}
        />
      )}
    </main>
  );
}

function ProposalCard({ p, disabled, t, locale, ageStr }: { p: ProposalView; disabled?: boolean; t: import("@/lib/i18n-server").Dict; locale: import("@/lib/i18n-server").Locale; ageStr: (iso: string) => string }) {
  return (
    <div className="group flex items-start gap-3 rounded-xl glass-panel p-3.5 transition-all hover:-translate-y-[3px] hover:border-[var(--brand-500)] hover:shadow-[var(--shadow-4)]">
      <VoteControl proposalId={p.id} up={p.up} down={p.down} myVote={p.myVote} disabled={disabled} />
      <Link href={`/proposals/${p.id}` as never} className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} isHot={p.isHot} />
          <Chip variant="neutral"><CategoryIcon category={p.category} />{categoryLabel(t, p.category)}</Chip>
          <span className="ml-auto font-mono text-[10.5px] text-text-subtle">{ageStr(p.createdAt)}</span>
        </div>
        <p className="font-display text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-text">{pickLocalized(locale, p.titleEn, p.titleSw, p.titleZh)}</p>
        {p.description && <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-muted line-clamp-2">{p.description}</p>}
        <div className="mt-2.5 flex items-center gap-3.5 font-mono text-[11px] text-text-subtle">
          <span>{t.proposals.byProposer} {p.proposerMasked}</span>
          {(p.status === "LISTED" || p.status === "RESOLVED") && <span className="flex items-center gap-1 text-royal-200">{t.proposals.viewMarket} <I.arrowRight s={12} /></span>}
          {p.isMine && p.bonusGrantedTzs > 0 && <span className="flex items-center gap-1 text-gold-300"><I.coins s={12} /> +{p.bonusGrantedTzs.toLocaleString()} {t.proposals.earned}</span>}
          <I.chevronRight s={14} />
        </div>
      </Link>
    </div>
  );
}
