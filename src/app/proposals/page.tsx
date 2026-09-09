import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { listAllProposals, type ProposalView } from "@/lib/server/proposals-service";
import { getProposalsConfig, isProposalsActive } from "@/lib/server/proposals-config";
import { Chip } from "@/components/ui/chip";
import { FilterPill } from "@/components/ui/filter-pill";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ProposePromo } from "@/components/ui/propose-promo";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { ProposalsStateBanner, ProposalsUnavailable } from "@/components/proposals/proposals-state-views";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { VoteControl } from "@/components/proposals/vote-control";
import { StatusBadge } from "@/components/proposals/status-badge";
import { CategoryIcon, categoryLabel } from "@/components/proposals/category-icon";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";
import { formatTzs, formatNumber } from "@/lib/utils";
import { PageContainer } from "@/components/layout/page-container";
import { SearchBox } from "@/components/ui/search-box";
import { parseQuery, matchesQuery, fieldNames, BOARD_PROPOSAL_SEARCH } from "@/lib/search";
import { ProposalsBar, type BoardCounts } from "./proposals-bar";
import {
  boardCounts,
  boardEmptyCause,
  boardExits,
  buildBoardHref,
  filterBoard,
  needsSession,
  parseBoardParams,
  sortBoard,
  type BoardRow,
  type BoardState,
} from "@/lib/proposals/board";

export async function generateMetadata() {
  const { t } = await getServerT();
  const title = t.proposals.title;
  const og = `/api/og/page?title=${encodeURIComponent(title)}`;
  return {
    title,
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}
export const dynamic = "force-dynamic";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t, locale } = await getServerT();

  // Feature gate (read once, up front). DISABLED hides the whole board and shows
  // an honest, guided "not available" state — deep links to /proposals/* are
  // redirected here, so this must be a real 200 with a way forward, not a 404.
  const cfg = getProposalsConfig();
  const state = cfg.state;
  const active = isProposalsActive(cfg);
  if (state === "DISABLED") {
    return (
      <div className="mx-auto max-w-[1080px] px-3 lg:px-6 py-12">
        <h1 className="sr-only">{t.proposals.title}</h1>
        <ProposalsUnavailable
          title={t.proposals.unavailableTitle}
          body={t.proposals.unavailableBody}
          browseHref="/markets"
          browseLabel={t.proposals.browseMarkets}
        />
      </div>
    );
  }

  function ageStr(iso: string): string {
    const ms = Date.now() - Date.parse(iso);
    const d = Math.floor(ms / 86_400_000);
    if (d > 0) return `${d} ${t.proposals.dAgo}`;
    const h = Math.floor(ms / 3_600_000);
    if (h > 0) return `${h} ${t.proposals.hAgo}`;
    const m = Math.max(1, Math.floor(ms / 60_000));
    return `${m} ${t.proposals.mAgo}`;
  }

  const sp = (await searchParams) ?? {};
  const qs = parseBoardParams(sp);
  const session = await currentSession();
  /**
   * B-14 — round-trip the FILTER too: the player asked for their own proposals, so landing them
   * back on the default board after login silently lost their intent.
   *
   * ⚠️ THE ROUND-TRIP NOW CARRIES THE WHOLE QUERY, not just the one pill. `?mine=mine&lens=changes`
   * is a real destination — "the proposals of mine that are waiting on ME" — and returning a
   * player to `?f=mine` after login would drop the half that made the link worth following.
   */
  if (needsSession(qs) && !session) {
    redirect(`/auth/login?next=${encodeURIComponent(buildBoardHref(qs))}`);
  }

  const pageNum = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const { views, totalProposals, totalVotes } = await listAllProposals(session?.userId ?? null)
    .catch(() => ({ views: [] as ProposalView[], totalProposals: 0, totalVotes: 0 }));

  /**
   * The rows the contract reasons about. ⚠️ `resolutionAtMs` is `null` rather than 0 when the date
   * will not parse — see `boardKey`: a 0 would sort such a proposal as "closing in 1970", i.e.
   * first, at the top of the board.
   */
  const nowMs = Date.now();
  const rows: BoardRow[] = views.map((v) => ({
    id: v.id,
    status: v.status,
    category: v.category,
    score: v.score,
    isHot: v.isHot,
    isMine: v.isMine,
    createdAtMs: Date.parse(v.createdAt) || 0,
    resolutionAtMs: Number.isFinite(Date.parse(v.resolutionDate)) ? Date.parse(v.resolutionDate) : null,
    titleEn: v.titleEn,
    titleSw: v.titleSw ?? "",
    titleZh: v.titleZh ?? "",
    description: v.description ?? "",
    criterion: v.resolutionCriterion ?? "",
    proposerMasked: v.proposerMasked,
  }));

  // ⛔ Through the shared grammar — `test:search-adoption` refuses a hand-rolled `.includes()`,
  //    and BOARD_PROPOSAL_SEARCH is the PLAYER schema (see its header for why not PROPOSAL_SEARCH).
  const parsed = parseQuery(qs.q, { fields: fieldNames(BOARD_PROPOSAL_SEARCH) });
  const matchesRow = (row: BoardRow) =>
    matchesQuery(parsed, row as unknown as Record<string, string | null | undefined>, BOARD_PROPOSAL_SEARCH);

  const counts = boardCounts(rows, qs, nowMs, matchesRow) as BoardCounts;
  const matched = sortBoard(filterBoard(rows, qs, nowMs, matchesRow), qs);

  const matchedCount = matched.length;
  const totalPages = Math.max(1, Math.ceil(matchedCount / PLAYER_PER_PAGE));
  const page = Math.min(pageNum, totalPages);
  const byId = new Map(views.map((v) => [v.id, v] as const));
  const proposals = matched
    .slice((page - 1) * PLAYER_PER_PAGE, page * PLAYER_PER_PAGE)
    .map((r) => byId.get(r.id)!)
    .filter(Boolean);
  const proposalsBaseHref = buildBoardHref(qs);

  /**
   * ⭐ FIVE CAUSES, FIVE SENTENCES — the page had TWO, and one of them was wrong more often than
   * it was right. `noProposalsInFilter` covered every non-empty-board case, so a player whose
   * SEARCH missed and a player who chose an empty lens read the identical "try another filter".
   */
  const cause = boardEmptyCause(qs, nowMs, matchesRow, matchedCount, rows.length);
  const exits = cause && cause !== "no-rows" ? boardExits(rows, qs, nowMs, matchesRow) : [];
  const EXIT_LABEL: Record<string, string> = {
    cat: t.market.catAll,
    when: t.common.rangeAll,
    mine: t.common.all,
    q: t.common.clearSearch,
    lens: t.common.all,
  };

  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* 🔴 DG-P-03 — THE `sr-only` h1 IS DELETED, BECAUSE THIS PAGE SHIPPED TWO OF THEM.
          `PageHeader` renders an `<h1>` of its own, unconditionally (`page-header.tsx:45`, 25
          call sites), so the hidden heading three lines above it was a SECOND h1 on one
          document: invalid, and two competing answers to "what is this page" for anyone
          navigating by heading. Measured 2026-08-29 across all 54 files that render an h1
          (literal or via a component), this is the ONLY page that ships two.
          ⚠️ `app/updown/page.tsx` has two `<PageHeader>` call sites and is NOT a second case —
          they are mutually exclusive branches, so only one ever renders. Checked, not assumed.
          ⭐ The h1 is now `t.proposals.voteForMarkets` ("Vote for markets"), which is the
          better heading anyway: `t.proposals.title` survives as PageHeader's own eyebrow
          directly above it, so nothing is lost to a screen reader.
          ⛔ DO NOT re-add a hidden h1 here. And note this deletion also removed the DG-P-04
          ghost — the wrapper that had been added to keep an out-of-flow `sr-only` h1 out of
          the `space-y-6` rhythm is gone with it, because there is no longer a ghost to fence.
          The DISABLED branch at the top of this file keeps ITS `sr-only` h1 — but ⚠️ THAT WAS
          NOT TRUE WHEN THIS COMMENT WAS FIRST WRITTEN, and the correction is the useful part.
          That branch renders no `PageHeader`, so the h1 looked unpaired; it renders
          `ProposalsUnavailable`, which had an `<h1>` of its own
          (`components/proposals/proposals-state-views.tsx:159`). So the page shipped two h1s on
          BOTH branches, and the census that found the first missed the second because it only
          looked WITHIN a file. That h1 is a `<p>` now, matching `ui/empty-state.tsx:53`, and
          the sentence above is true. ⛔ A page's h1 count is the page PLUS everything it
          renders. */}
      <PageHero glow="gold" contentClassName="relative z-10 p-5 lg:p-6 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col items-start gap-2">
          <PageHeader tone="gold" icon={<I.trophy s={18} />} eyebrow={t.proposals.title} title={t.proposals.voteForMarkets} />
          {/* Gilt "coming soon" here, amber "maintenance" here, nothing when active. */}
          <ProposalsStateBadge state={state} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} />
        </div>
        {active && (
          <Link href={"/proposals/new" as never} className="shrink-0">
            <Button variant="gold" size="md" leading={<I.plus s={15} />}>{t.proposals.create}</Button>
          </Link>
        )}
      </PageHero>

      {/* Reward promo — shown only when the feature is live (the state banner
          carries the message otherwise, so this gold CTA isn't redundant). */}
      {active && <ProposePromo href="/proposals/new" />}

      {/* Guided state banner — gilt (coming soon) / amber (maintenance). */}
      <ProposalsStateBanner
        state={state}
        title={state === "MAINTENANCE" ? t.proposals.maintenanceTitle : t.proposals.comingSoonTitle}
        body={state === "MAINTENANCE" ? t.proposals.maintenanceBody : t.proposals.comingSoonBody}
      />

      {/* The board's own totals — the whole table, never the filtered view. ⛔ These two numbers
          answer "how big is this board", which is a different question from "how many match", and
          the bar's `data-result-count` answers the second one. Two questions, two numbers. */}
      {/* ⚠️ `text-body-sm`, NOT `text-[12px]`. This line is a SENTENCE a player reads — "30
          proposals · 12 votes" — so §T4's 12.5px reading floor applies, and `text-label` (12) and
          `text-caption` (11) sit BELOW it and do not count as a fix. It is also the last of the
          sub-floor sentences this campaign wrote: the same rule was applied to its siblings in
          `adc3718f` and this one was missed, which is why `test:type-scale` §3 measured 750
          against a ratchet that commit had just lowered to 749. */}
      <p className="font-mono text-body-sm text-text-muted">{totalProposals.toLocaleString()} {t.proposals.proposalsCount} · {totalVotes.toLocaleString()} {t.proposals.votesCount}</p>

      {/* ⛔ THE CONTROLS ARE WITHHELD ON AN EMPTY BOARD, and only then — §A5: seven pills all
          reading 0 above "no proposals yet" are seven controls that cannot act. Every other empty
          state keeps the bar, because there the bar is the way OUT of it. */}
      {rows.length > 0 && (
        <>
          {/* ⛔ NOT STICKY — see `/results/page.tsx`'s note. `QUERY_BAR_CLASS` already sticks at
              `top-[56px]`, so a second sticky band at the same offset overlaps it by 91px. */}
          <div className="py-2.5">
            <Suspense>
              <SearchBox
                placeholder={t.proposals.searchProposals}
                ariaLabel={t.proposals.searchProposals}
                helpFields={fieldNames(BOARD_PROPOSAL_SEARCH)}
              />
            </Suspense>
          </div>
          {/* ⭐ THE BAR REPLACES A RAIL THAT ASKED THREE QUESTIONS AT ONCE — see `proposals-bar.tsx`.
              ⚠️ The old rail's one genuine improvement is KEPT, not lost in the swap: it had been a
              bare `<div>` with no `aria-label` and no per-control state, and it became a labelled
              `<nav>` whose pills state `aria-current`. `QueryStrip` renders exactly that. */}
          <ProposalsBar state={qs} counts={counts} resultCount={matchedCount} t={t} />
        </>
      )}

      {/* Per-cause exit, carrying a REAL count — every count is cross-filtered, so no exit
          offered here can lead to another empty page. */}
      {matchedCount === 0 && exits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {exits.map((e) => (
            <FilterPill
              key={e.id}
              scroll={false}
              href={buildBoardHref(qs, e.patch)}
              label={EXIT_LABEL[e.id] ?? e.id}
              count={e.count}
              on={false}
              glyph={e.id === "cat" ? <I.layoutGrid s={14} className="shrink-0 opacity-70" /> : undefined}
            />
          ))}
        </div>
      )}

      {/* List / empty */}
      {proposals.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {proposals.map((p) => (
              <ProposalCard key={p.id} p={p} disabled={!active} t={t} locale={locale} ageStr={ageStr} />
            ))}
          </div>
          {matchedCount > PLAYER_PER_PAGE && (
            <div className="rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
              <Pagination total={matchedCount} page={page} perPage={PLAYER_PER_PAGE} baseHref={proposalsBaseHref} ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} firstLabel={t.common.firstPage} lastLabel={t.common.lastPage} />
            </div>
          )}
        </>
      ) : !active ? (
        /* Not ACTIVE: the state banner above is the message. Showing a "be the
           first to propose" empty state here would invite an action that is
           blocked (and, for the reward, advertise a gated inducement). */
        null
      ) : cause === "no-rows" ? (
        <EmptyState
          kind="proposals"
          title={t.proposals.noProposalsYet}
          body={`${t.proposals.noProposalsBody} ${t.proposals.noProposalsReward} ${formatTzs(cfg.prizeTzs)}.`}
          action={
            <Link href={"/proposals/new" as never}><Button variant="gold" size="sm" leading={<I.plus s={12} />}>{t.proposals.create}</Button></Link>
          }
        />
      ) : (
        /* ⭐ THE CAUSE DECIDES THE SENTENCE. A missed SEARCH is not "try another filter" — the
           player typed words, and the honest answer names them. A chosen lens that is empty is
           not a failure at all on a young board: nothing declined is a GOOD board. */
        <EmptyState
          kind="proposals"
          title={
            cause === "search-miss" ? `${t.results.noResultsMatch} "${qs.q}"`
            : cause === "lens-empty" ? t.proposals.noProposalsInFilter
            : t.market.filterMissTitle
          }
          body={
            cause === "search-miss" ? t.results.tryDifferentKeywords
            : cause === "lens-empty" ? t.proposals.noProposalsInFilterBody
            : t.market.filterMissBody
          }
          action={
            <Link href={"/proposals/new" as never}><Button variant="gold" size="sm" leading={<I.plus s={12} />}>{t.proposals.create}</Button></Link>
          }
        />
      )}
    </PageContainer>
  );
}

function ProposalCard({ p, disabled, t, locale, ageStr }: { p: ProposalView; disabled?: boolean; t: import("@/lib/i18n-server").Dict; locale: import("@/lib/i18n-server").Locale; ageStr: (iso: string) => string }) {
  return (
    /* ⛔ `data-row-id` — the third leg of the instrumentation contract, and this card needed it
       added rather than inherited: unlike `/watchlist`, `/results` and `/positions`, a proposal
       row is markup local to this file, not a shared card that already emits one. Without it
       `qa:count-truth` and `qa:player-filters` would read ZERO rows here and report that as the
       answer. ⚠️ It goes on the OUTER wrapper, not the inner `<Link>`: the vote control is
       outside the link, and a row identity that excluded half the row would be a smaller claim
       than the driver makes. */
    <div data-row-id={p.id} className="group flex items-start gap-3 rounded-xl glass-panel p-3.5 transition-all hover:-translate-y-[3px] hover:border-[var(--brand-500)] hover:shadow-[var(--shadow-4)]">
      <VoteControl proposalId={p.id} up={p.up} down={p.down} myVote={p.myVote} disabled={disabled} />
      <Link href={`/proposals/${p.id}` as never} className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} isHot={p.isHot} />
          <Chip variant="neutral"><CategoryIcon category={p.category} />{categoryLabel(t, p.category)}</Chip>
          <span className="ml-auto font-mono text-[10.5px] text-text-subtle">{ageStr(p.createdAt)}</span>
        </div>
        <p className="font-display text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-text">{pickLocalized(locale, p.titleEn, p.titleSw, p.titleZh)}</p>
        {p.description && <p className="mt-1.5 text-body-sm leading-relaxed text-text-muted line-clamp-2">{p.description}</p>}
        <div className="mt-2.5 flex items-center gap-3.5 font-mono text-[11px] text-text-subtle">
          <span>{t.proposals.byProposer} {p.proposerMasked}</span>
          {(p.status === "LISTED" || p.status === "RESOLVED") && <span className="flex items-center gap-1 text-royal-200">{t.proposals.viewMarket} <I.arrowRight s={12} /></span>}
          {p.isMine && p.bonusGrantedTzs > 0 && <span className="flex items-center gap-1 text-gold-300"><I.coins s={12} /> +{formatNumber(p.bonusGrantedTzs)} {t.proposals.earned}</span>}
          <I.chevronRight s={14} />
        </div>
      </Link>
    </div>
  );
}
