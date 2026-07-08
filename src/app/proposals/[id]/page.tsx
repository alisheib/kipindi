import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { getProposalDetail, timelineStep } from "@/lib/server/proposals-service";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { VoteControl } from "@/components/proposals/vote-control";
import { StatusBadge } from "@/components/proposals/status-badge";
import { StatusTimeline } from "@/components/proposals/status-timeline";
import { CategoryIcon, categoryLabel } from "@/components/proposals/category-icon";
import { RewardBurst } from "@/components/brand/reward-burst";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";

export const dynamic = "force-dynamic";

// Shared-proposal links carried the generic "50pick" title before this — now the
// browser-tab/OG title is the proposal's own title (matches markets/[id]).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { locale } = await getServerT();
  try {
    const p = await getProposalDetail(id, null);
    if (p) return { title: pickLocalized(locale, p.titleEn, p.titleSw, p.titleZh) };
  } catch { /* graceful — fall through to default */ }
  return { title: "Proposal" };
}

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getServerT();
  const { id } = await params;
  const session = await currentSession();
  let p: Awaited<ReturnType<typeof getProposalDetail>> | null = null;
  try { p = await getProposalDetail(id, session?.userId ?? null); } catch { /* graceful */ }
  if (!p) notFound();

  const cfg = getProposalsConfig();
  const open = p.status === "REVIEW" || p.status === "CHANGES_REQUESTED";
  const showBonus = (p.status === "APPROVED" || p.status === "LISTED" || p.status === "RESOLVED") && p.bonusGrantedTzs > 0 && p.isMine;

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      {/* Head card */}
      <section className="rounded-xl glass-panel p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} isHot={p.isHot} />
          <Chip variant="neutral"><CategoryIcon category={p.category} />{categoryLabel(t, p.category)}</Chip>
          <span className="ml-auto font-mono text-[10.5px] text-text-subtle">{t.common.resolves} {p.resolutionDate}</span>
        </div>
        <h1 className="font-display text-[19px] font-bold leading-snug tracking-[-0.01em]">{pickLocalized(locale, p.titleEn, p.titleSw, p.titleZh)}</h1>
        {p.description && <p className="mt-2 text-[13px] leading-relaxed text-text-muted">{p.description}</p>}
        <div className="mt-3.5 flex items-center gap-3">
          <VoteControl proposalId={p.id} up={p.up} down={p.down} myVote={p.myVote} horizontal disabled={!cfg.enabled || !open} />
          <span className="font-mono text-[11.5px] text-text-subtle">{t.proposals.byProposer} {p.proposerMasked} · {p.up + p.down} {t.proposals.votesCount}</span>
        </div>
      </section>

      {/* Resolution criterion + source */}
      <section className="rounded-xl glass-panel p-4">
        <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.12em] font-bold text-text-subtle">{t.common.resolutionCriterion}</p>
        <p className="text-[13px] leading-relaxed text-text-muted">{p.resolutionCriterion}</p>
        {p.selectionCloseDate && (
          <p className="mt-2 font-mono text-[11px] text-text-subtle">{t.common.selectionCloseDate}: {p.selectionCloseDate}</p>
        )}
        {p.sourceUrl && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px]">
            <I.link s={13} className="shrink-0 text-text-subtle" />
            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-royal-200 hover:underline">{t.proposals.viewSource}</a>
          </p>
        )}
      </section>

      {/* Declined / changes-requested notice */}
      {p.status === "DECLINED" && (
        <section className="rounded-xl border p-4" style={{ borderColor: "color-mix(in oklab, var(--claret-500) 30%, var(--border))", background: "color-mix(in oklab, var(--claret-500) 7%, var(--bg-elevated))" }}>
          <div className="mb-1.5 flex items-center gap-2 text-claret-300"><I.void s={16} /><p className="text-[13px] font-bold">{t.common.declined}</p></div>
          <p className="text-[12.5px] leading-relaxed text-text-muted">{`${t.proposals.reason}: `}{p.declineReason}.{p.declineNote ? ` ${p.declineNote}` : ""}</p>
        </section>
      )}
      {p.status === "CHANGES_REQUESTED" && p.changeNote && (
        <section className="rounded-xl border p-4" style={{ borderColor: "color-mix(in oklab, var(--royal-500) 30%, var(--border))", background: "color-mix(in oklab, var(--royal-500) 8%, var(--bg-elevated))" }}>
          <div className="mb-1.5 flex items-center gap-2 text-royal-200"><I.edit s={16} /><p className="text-[13px] font-bold">{t.common.changesRequested}</p></div>
          <p className="text-[12.5px] leading-relaxed text-text-muted">{p.changeNote}</p>
        </section>
      )}

      {/* Approval bonus celebration for the proposer — A5 reward-burst end-frame */}
      {showBonus && (
        <section className="relative overflow-hidden rounded-xl border p-5 text-center" style={{ borderColor: "var(--gold-700)", background: "linear-gradient(160deg, var(--bg-elevated), var(--royal-950))" }}>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, color-mix(in oklab, var(--gold-700) 16%, transparent))" }} />
          <div className="relative flex flex-col items-center">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">{t.common.yourProposalApproved}</p>
            <RewardBurst
              glyph="trophy"
              amount={`+TZS ${p.bonusGrantedTzs.toLocaleString()}`}
              caption={t.common.earnedAPrize}
            />
            <p className="mt-2 text-[12.5px] text-text-muted">{t.common.creditedToBonusWallet}</p>
          </div>
        </section>
      )}

      {/* Timeline / market link */}
      {p.status !== "DECLINED" && (
        <section className="rounded-xl glass-panel p-4">
          <p className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.12em] font-bold text-text-subtle">{t.common.statusLabel}</p>
          <StatusTimeline current={timelineStep(p)} />
          {open && <p className="mt-1 text-[12px] text-text-subtle">{t.common.officerReviewsNext}</p>}
          {p.publishedMarketId && (
            <Link href={`/markets/${p.publishedMarketId}` as never}>
              <Button variant={p.status === "RESOLVED" ? "gold" : "ghost"} size="md" fullWidth className="mt-3" trailing={<I.arrowRight s={15} />}>
                {p.status === "RESOLVED" ? t.common.viewResolvedMarket : t.common.viewLiveMarket}
              </Button>
            </Link>
          )}
        </section>
      )}

      <Link href={"/proposals" as never} className="block text-center text-[12px] text-text-subtle hover:text-text-muted">{`\u2190 ${t.common.backToProposals}`}</Link>
    </main>
  );
}
