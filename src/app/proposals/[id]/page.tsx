import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { getProposalDetail, timelineStep } from "@/lib/server/proposals-service";
import { getProposalsConfig, isProposalsActive } from "@/lib/server/proposals-config";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { VoteControl } from "@/components/proposals/vote-control";
import { StatusBadge } from "@/components/proposals/status-badge";
import { StatusTimeline } from "@/components/proposals/status-timeline";
import { CategoryIcon, categoryLabel } from "@/components/proposals/category-icon";
import { RewardBurst } from "@/components/brand/reward-burst";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";
import { keepFigures } from "@/components/ui/keep-words";
import { formatNumber, formatTzsSigned } from "@/lib/utils";
import { PageContainer } from "@/components/layout/page-container";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";

export const dynamic = "force-dynamic";

// Shared-proposal links carried the generic "50pick" title before this — now the
// browser-tab/OG title is the proposal's own title (matches markets/[id]).
// ⭐ 2026-10-09 (the visual pass's round 4, E47): a proposal that does not exist is titled as the not-found it renders —
// the not-found page's own metadata, in the page's language, with `noindex` — never the English "Proposal". Only when
// the read SUCCEEDED and found nothing; a failed read keeps the neutral default, as the page sends it to error.tsx.
// ⭐ THE NEUTRAL DEFAULT IS THE BOARD'S TITLE, IN THE READER'S LANGUAGE (round 5, review F1 — one rule for every record
// page's metadata, `markets/[id]/page.tsx` has it): `t.proposals.title`, the key `/proposals` is titled by, where it was
// the English "Proposal" in every language. Nothing here throws, so a failed read never decides the page.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { t, locale } = await getServerT();
  let p: Awaited<ReturnType<typeof getProposalDetail>> = null;
  try {
    p = await getProposalDetail(id, null);
  } catch { return { title: t.proposals.title }; }
  // DISABLED: the page redirects to the board, so this address names no proposal page either way.
  if (!p) return getProposalsConfig().state === "DISABLED" ? { title: t.proposals.title } : notFoundMetadata();
  return { title: pickLocalized(locale, p.titleEn, p.titleSw, p.titleZh) };
}

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getServerT();
  const { id } = await params;
  // DISABLED hides every proposals surface — send a direct link to the board,
  // which renders the honest "not available" state.
  const cfg = getProposalsConfig();
  if (cfg.state === "DISABLED") redirect("/proposals");
  const active = isProposalsActive(cfg);
  const session = await currentSession();
  // B-1 — no swallow: a FAILED read must throw to proposals/error.tsx, never
  // render 404. notFound() fires only when the query succeeded and found nothing.
  const p = await getProposalDetail(id, session?.userId ?? null);
  if (!p) notFound();

  const open = p.status === "REVIEW" || p.status === "CHANGES_REQUESTED";
  const showBonus = (p.status === "APPROVED" || p.status === "LISTED" || p.status === "RESOLVED") && p.bonusGrantedTzs > 0 && p.isMine;

  return (
    <PageContainer tier="form" className="space-y-5">
      {/* Head card */}
      <section className="rounded-xl glass-panel p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} isHot={p.isHot} />
          <Chip variant="neutral"><CategoryIcon category={p.category} />{categoryLabel(t, p.category)}</Chip>
          <span className="ml-auto font-mono text-[10.5px] text-text-subtle">{t.common.resolves} {p.resolutionDate}</span>
        </div>
        {/* A question, set as every market title is (round 5, R5-E — F1 F4, review 3 H1): balanced, its figures whole. */}
        <h1 className="font-display text-title-lg font-bold leading-tight tracking-[-0.02em] text-balance">{keepFigures(pickLocalized(locale, p.titleEn, p.titleSw, p.titleZh))}</h1>
        {p.description && <p className="mt-2 text-[13px] leading-relaxed text-text-muted">{p.description}</p>}
        <div className="mt-3.5 flex items-center gap-3">
          <VoteControl proposalId={p.id} up={p.up} down={p.down} myVote={p.myVote} horizontal disabled={!active || !open} />
          <span className="font-mono text-[11.5px] text-text-subtle">{t.proposals.byProposer} {p.proposerMasked} · {formatNumber(p.up + p.down)} {t.proposals.votesCount}</span>
        </div>
      </section>

      {/* Resolution criterion + source */}
      <section className="rounded-xl glass-panel p-4">
        <p className="mb-2 font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.common.resolutionCriterion}</p>
        <p className="text-[13px] leading-relaxed text-text-muted">{p.resolutionCriterion}</p>
        {p.selectionCloseDate && (
          <p className="mt-2 font-mono text-[11px] text-text-subtle">{t.common.selectionCloseDate}: {p.selectionCloseDate}</p>
        )}
        {p.sourceUrl && (
          <p className="mt-3 flex items-center gap-1.5 text-body-sm">
            <I.link s={13} className="shrink-0 text-text-subtle" />
            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-royal-200 hover:underline">{t.proposals.viewSource}</a>
          </p>
        )}
      </section>

      {/* Declined / changes-requested notice */}
      {p.status === "DECLINED" && (
        <section className="rounded-xl border p-4" style={{ borderColor: "color-mix(in oklab, var(--claret-500) 30%, var(--border))", background: "color-mix(in oklab, var(--claret-500) 7%, var(--bg-elevated))" }}>
          <div className="mb-1.5 flex items-center gap-2 text-claret-300"><I.void s={16} /><p className="text-[13px] font-bold">{t.common.declined}</p></div>
          {/* B-7 — the stored reason is the admin console's English enum; render
              the player's localized equivalent (unknown/legacy values fall through
              verbatim rather than disappearing). The free-text note stays as
              written — it is the officer's own message. */}
          <p className="text-body-sm leading-relaxed text-text-muted">{`${t.proposals.reason}: `}{({
            "Politics": t.proposals.declinePolitics,
            "Ambiguous outcome": t.proposals.declineAmbiguous,
            "No official source": t.proposals.declineNoSource,
            "Duplicate": t.proposals.declineDuplicate,
            "Past resolution": t.proposals.declinePastResolution,
            "Outside jurisdiction": t.proposals.declineJurisdiction,
            "Officer decision": t.proposals.declineOfficer,
          } as Record<string, string>)[p.declineReason ?? ""] ?? p.declineReason}.{p.declineNote ? ` ${p.declineNote}` : ""}</p>
        </section>
      )}
      {p.status === "CHANGES_REQUESTED" && p.changeNote && (
        <section className="rounded-xl border p-4" style={{ borderColor: "color-mix(in oklab, var(--royal-500) 30%, var(--border))", background: "color-mix(in oklab, var(--royal-500) 8%, var(--bg-elevated))" }}>
          <div className="mb-1.5 flex items-center gap-2 text-royal-200"><I.edit s={16} /><p className="text-[13px] font-bold">{t.common.changesRequested}</p></div>
          <p className="text-body-sm leading-relaxed text-text-muted">{p.changeNote}</p>
        </section>
      )}

      {/* Approval bonus crest for the proposer — an earned-money peak (remade 2026-08-08: medallion + struck amount, no rays — M3) */}
      {showBonus && (
        <section className="relative overflow-hidden rounded-xl border p-5 text-center" style={{ borderColor: "var(--gold-700)", background: "linear-gradient(160deg, var(--bg-elevated), var(--royal-950))" }}>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, color-mix(in oklab, var(--gold-700) 16%, transparent))" }} />
          <div className="relative flex flex-col items-center">
            <p className="mb-3 font-mono text-micro uppercase tracking-[0.16em] font-bold text-gold-300">{t.common.yourProposalApproved}</p>
            <RewardBurst
              glyph="trophy"
              amount={formatTzsSigned(p.bonusGrantedTzs)}
              caption={t.common.earnedAPrize}
            />
            {/*
              🔴 THE CAPTION MUST NAME THE WALLET THE MONEY IS ACTUALLY IN.
              This said "Credited to your bonus wallet" (and the sw/zh equivalents) on every
              approved proposal. With the bonus wallet withdrawn, `approveProposal` pays through
              `creditInternal`, so the prize is real, withdrawable cash — and the player was told
              it was locked play-through money. ⛔ Wrong in the SAFER direction and no less wrong:
              somebody who believes their reward is locked never tries to withdraw it.
              ⭐ `rewardPaidAsCash` is the DTO's copy of the one rule in `proposals-service.ts` —
              not a `bonusIsLiveFor()` call here. A grant minted before the withdrawal must keep
              reading as a grant for ever; this states where THIS money went, not what we offer today.
            */}
            <p className="mt-2 text-body-sm text-text-muted">
              {p.rewardPaidAsCash ? t.common.creditedToBalance : t.common.creditedToBonusWallet}
            </p>
          </div>
        </section>
      )}

      {/* Timeline / market link */}
      {p.status !== "DECLINED" && (
        <section className="rounded-xl glass-panel p-4">
          <p className="mb-3 font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.common.statusLabel}</p>
          <StatusTimeline current={timelineStep(p)} />
          {open && <p className="mt-1 text-body-sm text-text-subtle">{t.common.officerReviewsNext}</p>}
          {/* One way to the market in both states (R5-C, the second gold audit, 2026-10-09): it turned GOLD once the market
              resolved — but a link to a market is a control, not the market's resolved seal (that is the chip on its page,
              §M3), and the proposer's money is the crest above (Q5). */}
          {p.publishedMarketId && (
            <Link href={`/markets/${p.publishedMarketId}` as never}>
              <Button variant="ghost" size="md" fullWidth className="mt-3" trailing={<I.arrowRight s={15} />}>
                {p.status === "RESOLVED" ? t.common.viewResolvedMarket : t.common.viewLiveMarket}
              </Button>
            </Link>
          )}
        </section>
      )}

      <Link href={"/proposals" as never} className="block text-center text-[12px] text-text-subtle hover:text-text-muted">{`\u2190 ${t.common.backToProposals}`}</Link>
    </PageContainer>
  );
}
