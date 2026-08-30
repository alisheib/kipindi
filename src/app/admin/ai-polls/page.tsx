import { Suspense } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort } from "@/components/admin/admin-sort";
import { CardSortControl } from "@/components/admin/card-sort-control";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { formatDateTimeSafe, formatUsd } from "@/lib/utils";
import { SELECTION } from "@/lib/admin-status-lexicon";
import { aiPollStateLabel } from "@/components/admin/status-badge";
import { ScoreBadge } from "@/components/admin/score-badge";
import {
  listAIPolls,
  countAIPollsByState,
  countAIPollsTotal,
  aiPollSpend,
  aiPollDailyProgress,
  type StoredAIPoll,
  type AIPollState,
} from "@/lib/server/ai-poll-generation";
import { getAIPollConfig } from "@/lib/server/ai-poll-config";
import { getAIProvider } from "@/lib/server/ai-provider";
import { getGeneratableCategories } from "@/lib/server/source-registry";
import {
  GenerateForm,
  BatchGenerateForm,
  ConfigPanel,
  QualityBadges,
  FilterReasonChips,
  ReviewActions,
  PublishActions,
  DeleteAction,
  SeedFixturesButton,
  DeleteAllButton,
} from "./poll-actions";
import { PollFilterToolbar } from "./poll-filters";
import { resolveRange } from "@/lib/server/date-range";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

export const metadata = { title: "Admin · AI poll generation" };
export const dynamic = "force-dynamic";

const STATE_VARIANT: Record<AIPollState, "success" | "warning" | "danger" | "neutral" | "info"> = {
  GENERATING: "info",
  VALIDATION_FAILED: "danger",
  FILTERED: "warning",
  PENDING_REVIEW: "warning",
  EDITING: "info",
  APPROVED: "success",
  REJECTED: "neutral",
  PUBLISHED: "success",
};

// ⛔ The local `STATE_LABEL` map that stood here is deleted. It was one of THREE
// copies (this page, /admin/ai-polls/[id], /admin/updown/proposals) and they had
// already drifted — two spelled "Didn't" with a typewriter apostrophe and one with
// a typographic one. `aiPollStateLabel` is now the single site, and it is
// product-aware: the Up & Down queue's `APPROVED` reads differently on purpose.

const fmtUsd = formatUsd;
function fmtDate(iso: string) {
  return formatDateTimeSafe(iso);
}

export default async function AdminAIPollsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    state?: string;
    category?: string;
    range?: string;
    from?: string;
    to?: string;
    page?: string;
    psort?: string;
    pdir?: string;
    ppage?: string;
    asort?: string;
    adir?: string;
    apage?: string;
  }>;
}) {
  const sp = await searchParams;
  const counts = await countAIPollsByState();
  const spend = await aiPollSpend();
  const progress = await aiPollDailyProgress();
  const config = getAIPollConfig();
  const totalAll = await countAIPollsTotal();
  // Categories the generator is allowed to produce — those with an enabled
  // trusted source (and not disabled). Drives the generate forms so an operator
  // can never kick off a generation that would be rejected for lack of a source.
  const generatableCategories = (await getGeneratableCategories()).map((g) => g.category);

  const pendingAll = await listAIPolls({ state: "PENDING_REVIEW" });
  const approvedAll = await listAIPolls({ state: "APPROVED" });

  // Pending review queue (prefix "p") — newest first by default; also title + quality.
  const p = parseSort(sp, ["date", "title", "quality"] as const, "date", "desc", "p");
  const pendingSorted = applySort(pendingAll, p.sort, p.dir, {
    date: (poll) => poll.createdAt,
    title: (poll) => poll.titleEn.toLowerCase(),
    quality: (poll) => poll.overallQuality,
  });
  const pPage = parsePage(sp.ppage, pendingSorted.length);
  const pending = pendingSorted.slice((pPage - 1) * PER_PAGE, pPage * PER_PAGE);
  const pBase = buildBaseHref("/admin/ai-polls", sp, "ppage");

  // Approved list (prefix "a") — newest first by default; also title + quality.
  const a = parseSort(sp, ["date", "title", "quality"] as const, "date", "desc", "a");
  const approvedSorted = applySort(approvedAll, a.sort, a.dir, {
    date: (poll) => poll.createdAt,
    title: (poll) => poll.titleEn.toLowerCase(),
    quality: (poll) => poll.overallQuality,
  });
  const aPage = parsePage(sp.apage, approvedSorted.length);
  const approved = approvedSorted.slice((aPage - 1) * PER_PAGE, aPage * PER_PAGE);
  const aBase = buildBaseHref("/admin/ai-polls", sp, "apage");

  // Build filter for the "all activity" table — created-date window via the platform
  // resolver (presets + custom date+hour+minute); only filters when a window is set.
  const hasDate = !!(sp.range && sp.range !== "all") || !!sp.from || !!sp.to;
  const win = hasDate ? resolveRange(sp) : null;
  const filtered = await listAIPolls({
    state: (sp.state as AIPollState) || undefined,
    category: sp.category || undefined,
    search: sp.q || undefined,
    dateFrom: win ? new Date(win.start).toISOString() : undefined,
    dateTo: win ? new Date(win.end).toISOString() : undefined,
  });

  const hasFilters = sp.q || sp.state || sp.category || hasDate;

  // Paginate
  const page = parsePage(sp.page, filtered.length);
  const start = (page - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  const baseHref = buildBaseHref("/admin/ai-polls", {
    q: sp.q,
    state: sp.state,
    category: sp.category,
    range: sp.range,
    from: sp.from,
    to: sp.to,
  });

  return (
    <>
      <AdminPageHead
        title="AI poll generation"
        sw="Uzalishaji wa kura · Claude AI"
      />
      <AdminBody>
        {/* KPI strip */}
        <KpiGrid>
          <AdminKpi
            label="Published today"
            sw="Zilizochapishwa leo"
            value={`${progress.publishedToday} / ${progress.target.toLocaleString()}`}
            delta={progress.remaining > 0 ? `${progress.remaining.toLocaleString()} to target` : "target met"}
            pulse={progress.remaining > 0}
          />
          <AdminKpi
            label="Pending review"
            sw="Inasubiri ukaguzi"
            value={counts.PENDING_REVIEW.toLocaleString()}
            delta={`${counts.GENERATING} generating`}
            pulse={counts.PENDING_REVIEW > 0}
          />
          <AdminKpi
            label="Filtered + rejected"
            sw="Yalikataliwa"
            value={(counts.FILTERED + counts.REJECTED + counts.VALIDATION_FAILED).toLocaleString()}
            delta={`${counts.VALIDATION_FAILED} validation failures`}
          />
          <AdminKpi
            label="Total spend"
            sw="Gharama jumla"
            value={fmtUsd(spend.totalUsd)}
            delta={`${spend.totalGenerations} generations · ${(spend.totalTokens / 1000).toFixed(1)}k tokens`}
          />
        </KpiGrid>

        {/* Info banner + generate form */}
        <AdminCard>
          <div className="flex items-start gap-3 mb-4">
            <I.bot s={18} className="text-royal-300 mt-0.5 shrink-0" />
            <div className="flex-1 text-caption text-text-secondary leading-relaxed">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-micro uppercase eyebrow font-bold">Provider:</span>
                <Chip size="sm" variant={getAIProvider().name.includes("mock") ? "warning" : "success"}>
                  {getAIProvider().name}
                </Chip>
                {getAIProvider().name.includes("mock") && (
                  <span className="text-warning-fg text-micro">Set ANTHROPIC_API_KEY in Railway to use real Claude</span>
                )}
              </div>
              Generate prediction-market polls using Claude AI. Polls passing the 4-layer
              validation pipeline land in <strong>Pending review</strong> for your sign-off.
              AI never publishes — the officer&apos;s approval is the only path to a live market.
            </div>
          </div>
          <GenerateForm generatable={generatableCategories} />
          <BatchGenerateForm maxBatch={config.maxBatchPerRun} remaining={progress.remaining} generatable={generatableCategories} />
        </AdminCard>

        {/* Controls */}
        <AdminCard>
          <div className="flex items-center gap-2 mb-3">
            <I.bot s={16} className="text-royal-300 shrink-0" />
            <div>
              <p className="font-display font-semibold text-body-sm text-text">Generation settings</p>
              <p className="text-caption italic text-text-tertiary">
                Controls volume, accuracy strictness, and cost. Saved live — no deploy needed.
              </p>
              <p className="text-caption text-text-tertiary mt-0.5">
                The AI model &amp; spend limits live in{" "}
                <Link href={"/admin/ai-usage" as Route} className="text-royal-300 underline-offset-2 hover:underline">AI usage &amp; credits →</Link>
              </p>
            </div>
          </div>
          <ConfigPanel config={config} />
        </AdminCard>

        {/* Pending review queue */}
        {pendingSorted.length > 0 && (
          <div id="ai-polls-pending" className="scroll-mt-24">
          <AdminCard padding="p-0">
            <div className="flex items-center justify-between px-4 lg:px-5 pt-4">
              <div>
                <p className="font-display font-semibold text-body-sm text-text">
                  Awaiting your review
                </p>
                <p className="text-caption italic text-text-tertiary">Inasubiri uamuzi wako</p>
              </div>
              <Chip size="sm" variant="warning">{pendingSorted.length} pending</Chip>
            </div>
            <CardSortControl
              basePath="/admin/ai-polls"
              railId="poll-sort-pending"
              prefix="p"
              current={p.sort}
              dir={p.dir}
              sp={sp}
              options={[
                { field: "date", label: "Date" },
                { field: "title", label: "Title" },
                { field: "quality", label: "Quality" },
              ]}
            />
            <div className="divide-y divide-border/60 mt-3">
              {pending.map((poll) => (
                <PollRow key={poll.id} poll={poll} mode="review" />
              ))}
            </div>
            <AdminPagination total={pendingSorted.length} page={pPage} baseHref={pBase} param="ppage" />
          </AdminCard>
          </div>
        )}

        {/* Approved */}
        {approvedSorted.length > 0 && (
          <AdminCard padding="p-0">
            <div className="flex items-center justify-between px-4 lg:px-5 pt-4">
              <div>
                <p className="font-display font-semibold text-body-sm text-text">
                  Approved · ready to publish
                </p>
                <p className="text-caption italic text-text-tertiary">Yaliyoidhinishwa · tayari kuchapishwa</p>
              </div>
              <Chip size="sm" variant="success">{approvedSorted.length} approved</Chip>
            </div>
            <CardSortControl
              basePath="/admin/ai-polls"
              railId="poll-sort-approved"
              prefix="a"
              current={a.sort}
              dir={a.dir}
              sp={sp}
              options={[
                { field: "date", label: "Date" },
                { field: "title", label: "Title" },
                { field: "quality", label: "Quality" },
              ]}
            />
            <div className="divide-y divide-border/60 mt-3">
              {approved.map((poll) => (
                <PollRow key={poll.id} poll={poll} mode="publish" />
              ))}
            </div>
            <AdminPagination total={approvedSorted.length} page={aPage} baseHref={aBase} param="apage" />
          </AdminCard>
        )}

        {/* All activity — filterable + paginated */}
        <AdminCard padding="p-0">
          <div className="px-4 lg:px-5 pt-4 pb-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold text-body-sm text-text">
                  All generations
                </p>
                <p className="text-caption italic text-text-tertiary">
                  Search, filter by state, category, or date. Click any row to view full details.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {process.env.NODE_ENV !== "production" && <SeedFixturesButton />}
                <DeleteAllButton totalCount={totalAll} />
              </div>
            </div>
            <Suspense fallback={<FilterToolbarSkeleton />}>
              <PollFilterToolbar totalFiltered={filtered.length} totalAll={totalAll} />
            </Suspense>
          </div>

          {pageItems.length === 0 ? (
            <div className="px-4 lg:px-5 py-12 flex flex-col items-center gap-3 text-center">
              {/* ⚠️ LITERALS, not `h-10 w-10` — spacing is overridden (tailwind.config.ts:200-215)
                  so `h-10` was an 80px disc round an 18px glyph. */}
              <div className="h-[40px] w-[40px] rounded-pill bg-bg-overlay flex items-center justify-center">
                {hasFilters
                  ? <I.search s={18} className="text-text-subtle" />
                  : <I.bot s={18} className="text-text-subtle" />}
              </div>
              <div>
                <p className="font-display text-[13px] font-semibold text-text-muted">
                  {hasFilters ? "No polls match the current filters." : "No polls generated yet."}
                </p>
                <p className="text-caption text-text-tertiary mt-1">
                  {hasFilters
                    ? "Try adjusting your search, changing the date range, or clearing filters."
                    : "Use the generate form above to create polls, or seed fixtures for testing."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <ScrollX label="AI polls">
                <table className="admin-tbl min-w-[760px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-subtle bg-bg-overlay border-b border-border">
                    <tr>
                      <th className="text-left p-3">State</th>
                      <th className="text-left p-3">Category</th>
                      <th className="text-left p-3">Title</th>
                      <th className="text-right p-3">Quality</th>
                      <th className="text-right p-3">Confidence</th>
                      <th className="text-right p-3">Sources</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-right p-3">Cost</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-muted">
                      {/* ⭐ DG-A-09 · §B8 — `hover:bg-bg-overlay/50` DELETED, AND IT NEVER PAINTED.
                          Read out of the served sheet, not reasoned: the canon
                          `.admin-tbl tbody tr:hover{background: color-mix(in oklab,
                          var(--bg-overlay) 50%, transparent)}` is specificity (0,2,2), the
                          utility `.hover\:bg-bg-overlay\/50:hover` is (0,2,0), this table
                          carries `.admin-tbl` (:340), and the compiled sheet has ZERO `@layer`
                          so precedence is specificity then source order. The canon won on every
                          hover — and the two colours are the SAME value, so the call site was a
                          second definition of a live thing that could not even diverge visibly.
                          ⛔ `group` and `scroll-mt-24` STAY: `group` is load-bearing for the
                          row action below, and deleting it would be a real change.
                          ⚠️ This is NOT the register's defect. That was "80 hover-classed cells
                          on /admin/markets" — which is four LINK hovers times `PER_PAGE=20`
                          rows, not one of them a background. */}
                    {pageItems.map((p) => (
                      <tr key={p.id} id={`poll-tr-${p.id}`} className="border-b border-border/60 last:border-b-0 group scroll-mt-24">
                        <td className="p-3"><Chip size="sm" variant={STATE_VARIANT[p.state]}>{aiPollStateLabel(p.state)}</Chip></td>
                        <td className="p-3 font-mono uppercase tracking-[0.12em] text-micro">{p.category || "\u2014"}</td>
                        <td className="p-3 text-text max-w-[360px]">
                          <Link
                            href={`/admin/ai-polls/${p.id}` as "/admin/ai-polls"}
                            className="hover:text-brand-300 hover:underline underline-offset-2 transition-colors block truncate"
                          >
                            {p.titleEn || <span className="italic text-text-subtle">empty</span>}
                          </Link>
                        </td>
                        <td className="p-3 font-mono tabular-nums text-right">
                          <ScoreBadge value={p.overallQuality} good={80} warn={50} muted suffix="%" />
                        </td>
                        <td className="p-3 font-mono tabular-nums text-right">
                          <ScoreBadge value={p.confidence} good={85} warn={50} muted />
                        </td>
                        <td className="p-3 font-mono tabular-nums text-right">{p.sources.length}</td>
                        <td className="p-3 font-mono text-[11px]">{fmtDate(p.createdAt)}</td>
                        <td className="p-3 font-mono tabular-nums text-right">{fmtUsd(p.costUsd)}</td>
                        <td className="p-3 text-right flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/ai-polls/${p.id}` as "/admin/ai-polls"}
                            className="btn btn-ghost btn-sm rounded-pill text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            View
                          </Link>
                          {p.state === "GENERATING" ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-text-subtle"
                              title="Generation in progress — cannot delete"
                            >
                              <I.lock s={10} />
                              in-flight
                            </span>
                          ) : (
                            <DeleteAction pollId={p.id} state={p.state} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
              <AdminPagination
                total={filtered.length}
                page={page}
                baseHref={baseHref}
              />
            </>
          )}
        </AdminCard>
      </AdminBody>
    </>
  );
}

/* ⛔ `CardSortControl` USED TO LIVE HERE, and a byte-identical twin lived in
   `admin/candidates/page.tsx` — fifty-two lines each, differing on the single line that named
   the route. Both are gone: it is `src/components/admin/card-sort-control.tsx` now, taking a
   `basePath`, converted once to the kit `FilterPill` (DG-A-06, 2026-08-30). ⚠️ Do not
   reintroduce a local copy to "avoid a prop" — the duplication is what hid a 24px chip on a
   console whose other rails are 32px, for as long as the review queue happened to be empty. */

/* ─── Filter toolbar skeleton (Suspense fallback) ─── */

function FilterToolbarSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        {/* ⚠️ LITERALS, not `h-9` (64px on the overridden scale — tailwind.config.ts:200-215).
            A skeleton must be the size of the thing it stands in for: the live admin filter
            rail is 32px (--h-control-xs). The widths beside them were already literals.
            ⛔ The second box was `w-[80px] rounded-pill` — a stand-in for a "Search" button
            this toolbar has not had since it adopted the debounced SearchBox, and which
            /admin/candidates only lost in S-06 (scan #1, 2026-08-28). What actually renders
            in that slot is the icon RefreshButton: 40px square, rounded-md, ml-auto. The
            skeleton was 8px short, the wrong shape, and on the wrong side of the row. */}
        <div className="h-[32px] flex-1 max-w-[420px] rounded-md bg-bg-overlay" />
        <div className="ml-auto h-[40px] w-[40px] rounded-md bg-bg-overlay" />
      </div>
      {/* ⚠️ `h-6` IS 32px ON THE OVERRIDDEN SCALE, and it is now the RIGHT number (S-07c). It
          was wrong before, but not for the reason it looks: the chips it stands in for rendered
          about 26px — under `--h-control-xs` (32px), the very floor exception they claimed — so
          the skeleton jumped 6px per row on load. The chips are now FilterPill at rank="dense",
          which IS 32px, so the stand-in and the thing finally agree.
          ⚠️ And the COUNTS are the real ones: 8 states, then 8 categories. They were 5/4/5,
          which is a different kind of lie in the same element — a skeleton must be the size AND
          the shape of the thing it stands in for. */}
      <div className="flex items-center gap-2">
        <div className="h-6 w-24 rounded-pill bg-bg-overlay" />
        <div className="w-px h-5 bg-border/60" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 w-16 rounded-pill bg-bg-overlay" />
        ))}
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 w-20 rounded-pill bg-bg-overlay" />
        ))}
      </div>
    </div>
  );
}

/* ─── Poll row (used in pending + approved cards) ─── */

function PollRow({ poll, mode }: { poll: StoredAIPoll; mode: "review" | "publish" }) {
  return (
    <div id={`poll-${poll.id}`} className="px-4 lg:px-5 py-4 flex flex-col sm:flex-row items-stretch sm:items-start gap-4 scroll-mt-24">
      <div className="flex-1 min-w-0">
        {/* Header badges */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Chip size="sm" variant={STATE_VARIANT[poll.state]}>{aiPollStateLabel(poll.state)}</Chip>
          <span className="font-mono text-micro uppercase tracking-[0.14em] text-text-subtle">{poll.category}</span>
          <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
            <I.shieldAlert s={10} className="inline -mt-0.5 mr-0.5" />
            confidence {poll.confidence}
          </span>
          <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
            <I.fileCheck s={10} className="inline -mt-0.5 mr-0.5" />
            {poll.sources.length} sources
          </span>
          <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
            <I.coins s={10} />
            {fmtUsd(poll.costUsd)}
          </span>
          {poll.regenerationCount > 0 && (
            <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
              <I.sparkle s={10} className="inline -mt-0.5 mr-0.5" />
              regen #{poll.regenerationCount}
            </span>
          )}
          {poll.latencyMs > 0 && (
            <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
              <I.clock s={10} />
              {(poll.latencyMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Title — clickable to detail */}
        <Link href={`/admin/ai-polls/${poll.id}` as "/admin/ai-polls"} className="block hover:text-brand-300 transition-colors">
          <p className="font-display text-[14px] font-semibold text-text leading-tight hover:underline underline-offset-2">
            {poll.titleEn || <span className="italic text-text-subtle">No title generated</span>}
          </p>
        </Link>
        {poll.titleSw && (
          <p className="text-body-sm italic text-text-tertiary leading-tight">{poll.titleSw}</p>
        )}
        {poll.titleZh && (
          <p className="text-body-sm italic text-text-tertiary leading-tight">{poll.titleZh}</p>
        )}

        {/* Resolution criterion */}
        <p className="mt-1 text-body-sm text-text-muted leading-snug line-clamp-2">
          {poll.resolutionCriterion || <span className="italic">No resolution criterion</span>}
        </p>

        {/* Options */}
        {poll.options.length > 0 && (
          <div className="mt-1.5 flex gap-2">
            {poll.options.map((o, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-mono border border-border bg-bg-overlay">
                {o.label}
                {o.descriptionEn && <span className="ml-1 text-text-subtle">{"·"} {o.descriptionEn}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Meta line */}
        <p className="mt-1 font-mono text-[10.5px] text-text-subtle">
          {poll.selectionClosedAt ? `${SELECTION.betsClose.en} ${fmtDate(poll.selectionClosedAt)} · ` : ""}{poll.resolutionAt ? `Resolves ${fmtDate(poll.resolutionAt)}` : "No resolution date"} {"·"}{" "}
          {poll.sources.slice(0, 2).map((s, i) => (
            <span key={i}>{s.publisher}{i < Math.min(poll.sources.length, 2) - 1 ? " + " : ""}</span>
          ))}
          {poll.sources.length > 2 ? ` +${poll.sources.length - 2} more` : null}
        </p>

        {/* Quality indicators */}
        {poll.qualityIndicators.length > 0 && (
          <div className="mt-2">
            <QualityBadges indicators={poll.qualityIndicators} overall={poll.overallQuality} />
          </div>
        )}

        {/* Filter reasons */}
        {poll.filterReasons.length > 0 && (
          <div className="mt-2 flex items-start gap-1.5">
            <I.warning s={12} />
            <FilterReasonChips reasons={poll.filterReasons} />
          </div>
        )}

        {/* AI reasoning */}
        {poll.reasoning && (
          <details className="mt-2 text-[11px]">
            <summary className="cursor-pointer font-mono text-micro uppercase eyebrow text-text-subtle hover:text-text-muted">
              AI reasoning
            </summary>
            <p className="mt-1 text-text-muted leading-relaxed pl-2 border-l-2 border-border">
              {poll.reasoning}
            </p>
          </details>
        )}

        {/* Raw response */}
        {poll.rawResponse && (poll.state === "VALIDATION_FAILED" || poll.state === "FILTERED") && (
          <details className="mt-2 text-[11px]">
            <summary className="cursor-pointer font-mono text-micro uppercase eyebrow text-text-subtle hover:text-text-muted">
              Raw AI response
            </summary>
            <pre className="mt-1 text-text-muted leading-relaxed pl-2 border-l-2 border-border text-[10px] font-mono overflow-x-auto max-w-full whitespace-pre-wrap break-all">
              {poll.rawResponse.slice(0, 1000)}
              {poll.rawResponse.length > 1000 && "\u2026"}
            </pre>
          </details>
        )}

        {/* Review info */}
        {poll.reviewedBy && (
          <p className="mt-2 font-mono text-[10px] text-text-subtle">
            Reviewed by {poll.reviewedBy.slice(-6)} at {fmtDate(poll.reviewedAt ?? "")}
            {poll.reviewNote && ` · "${poll.reviewNote}"`}
          </p>
        )}
      </div>

      {/* Action buttons — full-width under the content on phones, fixed column ≥sm */}
      <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
        {mode === "review" && <ReviewActions poll={poll} />}
        {mode === "publish" && <PublishActions poll={poll} />}
        <DeleteAction pollId={poll.id} state={poll.state} />
      </div>
    </div>
  );
}
