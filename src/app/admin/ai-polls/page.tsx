import { Suspense } from "react";
import Link from "next/link";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { formatDateTimeSafe } from "@/lib/utils";
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
} from "./poll-actions";
import { PollFilterToolbar } from "./poll-filters";
import { datePresetToRange } from "./date-utils";

export const metadata = { title: "Admin \u00b7 AI poll generation" };
export const dynamic = "force-dynamic";

const STATE_VARIANT: Record<AIPollState, "success" | "warning" | "danger" | "neutral" | "info"> = {
  GENERATING: "info",
  VALIDATION_FAILED: "danger",
  FILTERED: "neutral",
  PENDING_REVIEW: "warning",
  EDITING: "info",
  APPROVED: "success",
  REJECTED: "neutral",
  PUBLISHED: "success",
};

function fmtUsd(n: number) { return `$${n.toFixed(2)}`; }
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
    date?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const counts = await countAIPollsByState();
  const spend = await aiPollSpend();
  const progress = await aiPollDailyProgress();
  const config = getAIPollConfig();
  const totalAll = await countAIPollsTotal();

  const pending = await listAIPolls({ state: "PENDING_REVIEW" });
  const approved = await listAIPolls({ state: "APPROVED" });

  // Build filter for the "all activity" table
  const dateRange = datePresetToRange(sp.date ?? "");
  const filtered = await listAIPolls({
    state: (sp.state as AIPollState) || undefined,
    category: sp.category || undefined,
    search: sp.q || undefined,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  const hasFilters = sp.q || sp.state || sp.category || sp.date;

  // Paginate
  const page = parsePage(sp.page, filtered.length);
  const start = (page - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  const baseHref = buildBaseHref("/admin/ai-polls", {
    q: sp.q,
    state: sp.state,
    category: sp.category,
    date: sp.date,
  });

  return (
    <>
      <AdminPageHead
        title="AI poll generation"
        sw="Uzalishaji wa kura \u00b7 Claude AI"
        period={false}
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            delta={`${spend.totalGenerations} generations \u00b7 ${(spend.totalTokens / 1000).toFixed(1)}k tokens`}
          />
        </div>

        {/* Info banner + generate form */}
        <AdminCard>
          <div className="flex items-start gap-3 mb-4">
            <I.bot size={18} className="text-royal mt-0.5 shrink-0" />
            <div className="flex-1 text-caption text-text-secondary leading-relaxed">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-micro uppercase tracking-wide font-bold">Provider:</span>
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
          <GenerateForm />
          <BatchGenerateForm maxBatch={config.maxBatchPerRun} remaining={progress.remaining} />
        </AdminCard>

        {/* Controls */}
        <AdminCard>
          <div className="flex items-center gap-2 mb-3">
            <I.bot size={16} className="text-royal shrink-0" />
            <div>
              <p className="font-display font-semibold text-body-sm text-text">Generation settings</p>
              <p className="text-caption italic text-text-tertiary">
                Controls volume, accuracy strictness, and cost. Saved live — no deploy needed.
              </p>
            </div>
          </div>
          <ConfigPanel config={config} />
        </AdminCard>

        {/* Pending review queue */}
        {pending.length > 0 && (
          <div id="ai-polls-pending" className="scroll-mt-24">
          <AdminCard padding="p-0">
            <div className="flex items-center justify-between px-4 lg:px-5 pt-4">
              <div>
                <p className="font-display font-semibold text-body-sm text-text">
                  Awaiting your review
                </p>
                <p className="text-caption italic text-text-tertiary">Inasubiri uamuzi wako</p>
              </div>
              <Chip size="sm" variant="warning">{pending.length} pending</Chip>
            </div>
            <div className="divide-y divide-border/60 mt-3">
              {pending.map((p) => (
                <PollRow key={p.id} poll={p} mode="review" />
              ))}
            </div>
          </AdminCard>
          </div>
        )}

        {/* Approved */}
        {approved.length > 0 && (
          <AdminCard padding="p-0">
            <div className="flex items-center justify-between px-4 lg:px-5 pt-4">
              <div>
                <p className="font-display font-semibold text-body-sm text-text">
                  Approved \u00b7 ready to publish
                </p>
                <p className="text-caption italic text-text-tertiary">Yaliyoidhinishwa \u00b7 tayari kuchapishwa</p>
              </div>
              <Chip size="sm" variant="success">{approved.length} approved</Chip>
            </div>
            <div className="divide-y divide-border/60 mt-3">
              {approved.map((p) => (
                <PollRow key={p.id} poll={p} mode="publish" />
              ))}
            </div>
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
              <SeedFixturesButton />
            </div>
            <Suspense fallback={<FilterToolbarSkeleton />}>
              <PollFilterToolbar totalFiltered={filtered.length} totalAll={totalAll} />
            </Suspense>
          </div>

          {pageItems.length === 0 ? (
            <div className="px-4 lg:px-5 py-12 flex flex-col items-center gap-3 text-center">
              <div className="h-10 w-10 rounded-pill bg-bg-overlay flex items-center justify-center">
                {hasFilters
                  ? <I.search size={18} className="text-text-subtle" />
                  : <I.bot size={18} className="text-text-subtle" />}
              </div>
              <div>
                <p className="font-display text-[13px] font-semibold text-text-muted">
                  {hasFilters ? "No polls match your filters" : "No polls generated yet"}
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
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle bg-bg-overlay border-b border-border">
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
                    {pageItems.map((p) => (
                      <tr key={p.id} id={`poll-tr-${p.id}`} className="border-b border-border/60 last:border-b-0 hover:bg-bg-overlay/50 group scroll-mt-24">
                        <td className="p-3"><Chip size="sm" variant={STATE_VARIANT[p.state]}>{p.state}</Chip></td>
                        <td className="p-3 font-mono uppercase tracking-[0.12em] text-[10px]">{p.category || "\u2014"}</td>
                        <td className="p-3 text-text max-w-[360px]">
                          <Link
                            href={`/admin/ai-polls/${p.id}` as "/admin/ai-polls"}
                            className="hover:text-brand-300 hover:underline underline-offset-2 transition-colors block truncate"
                          >
                            {p.titleEn || <span className="italic text-text-subtle">empty</span>}
                          </Link>
                        </td>
                        <td className="p-3 font-mono tabular-nums text-right">
                          <span style={{
                            color: p.overallQuality >= 80 ? "var(--yes-300)"
                              : p.overallQuality >= 50 ? "oklch(82% 0.16 80)"
                              : "var(--text-tertiary)",
                          }}>
                            {p.overallQuality}%
                          </span>
                        </td>
                        <td className="p-3 font-mono tabular-nums text-right">
                          <span style={{
                            color: p.confidence >= 85 ? "var(--yes-300)"
                              : p.confidence >= 50 ? "oklch(82% 0.16 80)"
                              : "var(--text-tertiary)",
                          }}>
                            {p.confidence}
                          </span>
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
                          {(p.state === "FILTERED" || p.state === "VALIDATION_FAILED" || p.state === "REJECTED") && (
                            <DeleteAction pollId={p.id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminPagination
                total={filtered.length}
                page={page}
                baseHref={baseHref}
              />
            </>
          )}
        </AdminCard>
      </div>
    </>
  );
}

/* ─── Filter toolbar skeleton (Suspense fallback) ─── */

function FilterToolbarSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 flex-1 max-w-[420px] rounded-md bg-bg-overlay" />
        <div className="h-9 w-[80px] rounded-pill bg-bg-overlay" />
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 w-16 rounded-pill bg-bg-overlay" />
        ))}
        <div className="w-px h-5 bg-border/60" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 w-16 rounded-pill bg-bg-overlay" />
        ))}
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 w-20 rounded-pill bg-bg-overlay" />
        ))}
      </div>
    </div>
  );
}

/* ─── Poll row (used in pending + approved cards) ─── */

function PollRow({ poll, mode }: { poll: StoredAIPoll; mode: "review" | "publish" }) {
  return (
    <div id={`poll-${poll.id}`} className="px-4 lg:px-5 py-4 flex items-start gap-4 scroll-mt-24">
      <div className="flex-1 min-w-0">
        {/* Header badges */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Chip size="sm" variant={STATE_VARIANT[poll.state]}>{poll.state}</Chip>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{poll.category}</span>
          <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
            <I.shieldAlert size={10} className="inline -mt-0.5 mr-0.5" />
            confidence {poll.confidence}
          </span>
          <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
            <I.fileCheck size={10} className="inline -mt-0.5 mr-0.5" />
            {poll.sources.length} sources
          </span>
          <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
            <I.coins s={10} />
            {fmtUsd(poll.costUsd)}
          </span>
          {poll.regenerationCount > 0 && (
            <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
              <I.sparkle size={10} className="inline -mt-0.5 mr-0.5" />
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
          <p className="text-[12px] italic text-text-tertiary leading-tight">{poll.titleSw}</p>
        )}

        {/* Resolution criterion */}
        <p className="mt-1 text-[12px] text-text-muted leading-snug line-clamp-2">
          {poll.resolutionCriterion || <span className="italic">No resolution criterion</span>}
        </p>

        {/* Options */}
        {poll.options.length > 0 && (
          <div className="mt-1.5 flex gap-2">
            {poll.options.map((o, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-mono border border-border bg-bg-overlay">
                {o.label}
                {o.descriptionEn && <span className="ml-1 text-text-subtle">{"\u00b7"} {o.descriptionEn}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Meta line */}
        <p className="mt-1 font-mono text-[10.5px] text-text-subtle">
          {poll.resolutionAt ? `Resolves ${fmtDate(poll.resolutionAt)}` : "No resolution date"} {"\u00b7"}{" "}
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
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle hover:text-text-muted">
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
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle hover:text-text-muted">
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
            {poll.reviewNote && ` {"\u00b7"} "${poll.reviewNote}"`}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="shrink-0">
        {mode === "review" && <ReviewActions poll={poll} />}
        {mode === "publish" && <PublishActions poll={poll} />}
      </div>
    </div>
  );
}
