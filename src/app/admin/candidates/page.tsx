import { Suspense } from "react";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, type SortDir } from "@/components/admin/admin-sort";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { formatDateTimeSafe, formatUsd } from "@/lib/utils";
import {
  listCandidates,
  countByState,
  countCandidatesTotal,
  recordSpend,
  type Candidate,
  type CandidateState,
} from "@/lib/server/market-candidate";
import { CandidateActions } from "./candidate-actions";
import { CandidateFilterToolbar } from "./candidate-filters";
import { datePresetToRange } from "./date-utils";

export const metadata = { title: "Admin \u00b7 Market candidates" };
export const dynamic = "force-dynamic";

const STATE_VARIANT: Record<Candidate["state"], "success" | "warning" | "danger" | "neutral" | "info"> = {
  EXTRACTED: "info",
  FILTERED_OUT: "neutral",
  VERIFYING: "info",
  SCORED: "warning",
  PENDING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "neutral",
  PUBLISHED: "success",
};

const fmtUsd = formatUsd;
function fmtDate(iso: string) {
  return formatDateTimeSafe(iso);
}

export default async function AdminCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    state?: string;
    category?: string;
    date?: string;
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
  // Guard the loads so a transient store/AI-spend error degrades to zeros/empty
  // lists instead of 500ing the whole candidates console (matches sibling pages).
  const ZERO_COUNTS: Record<CandidateState, number> = {
    EXTRACTED: 0, FILTERED_OUT: 0, VERIFYING: 0, SCORED: 0,
    PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0, PUBLISHED: 0,
  };
  const counts = await countByState().catch(() => ZERO_COUNTS);
  const spend = await recordSpend().catch(() => ({ dailyTokens: 0, dailyUsd: 0, runCount: 0 }));
  const totalAll = await countCandidatesTotal().catch(() => 0);

  const pendingAll = await listCandidates({ state: "PENDING_REVIEW" }).catch(() => []);
  const approvedAll = await listCandidates({ state: "APPROVED" }).catch(() => []);

  // Pending queue (prefix "p") — newest first by default; also sort by title.
  const p = parseSort(sp, ["date", "title", "confidence"] as const, "date", "desc", "p");
  const pendingSorted = applySort(pendingAll, p.sort, p.dir, {
    date: (c) => c.createdAt,
    title: (c) => c.proposedTitleEn.toLowerCase(),
    confidence: (c) => c.confidence,
  });
  const pPage = parsePage(sp.ppage, pendingSorted.length);
  const pending = pendingSorted.slice((pPage - 1) * PER_PAGE, pPage * PER_PAGE);
  const pBase = buildBaseHref("/admin/candidates", sp, "ppage");

  // Approved list (prefix "a") — newest first by default; also sort by title.
  const a = parseSort(sp, ["date", "title", "confidence"] as const, "date", "desc", "a");
  const approvedSorted = applySort(approvedAll, a.sort, a.dir, {
    date: (c) => c.createdAt,
    title: (c) => c.proposedTitleEn.toLowerCase(),
    confidence: (c) => c.confidence,
  });
  const aPage = parsePage(sp.apage, approvedSorted.length);
  const approved = approvedSorted.slice((aPage - 1) * PER_PAGE, aPage * PER_PAGE);
  const aBase = buildBaseHref("/admin/candidates", sp, "apage");

  // Build filter for "all activity" table
  const dateRange = datePresetToRange(sp.date ?? "");
  const filtered = await listCandidates({
    state: (sp.state as CandidateState) || undefined,
    category: sp.category || undefined,
    search: sp.q || undefined,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  }).catch(() => []);

  const hasFilters = sp.q || sp.state || sp.category || sp.date;

  // Paginate
  const page = parsePage(sp.page, filtered.length);
  const start = (page - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  const baseHref = buildBaseHref("/admin/candidates", {
    q: sp.q,
    state: sp.state,
    category: sp.category,
    date: sp.date,
  });

  return (
    <>
      <AdminPageHead
        title="Market candidates"
        sw="Mapendekezo ya soko \u00b7 AI-validated"
        period={false}
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi
            label="Pending review"
            sw="Inasubiri ukaguzi"
            value={counts.PENDING_REVIEW.toLocaleString()}
            delta={`${counts.SCORED + counts.VERIFYING} earlier in pipeline`}
            pulse={counts.PENDING_REVIEW > 0}
          />
          <AdminKpi
            label="Approved \u00b7 awaiting publish"
            sw="Yaliyoidhinishwa"
            value={counts.APPROVED.toLocaleString()}
            delta={`${counts.PUBLISHED} published \u00b7 lifetime`}
          />
          <AdminKpi
            label="Filtered \u00b7 rejected"
            sw="Yalikataliwa"
            value={(counts.FILTERED_OUT + counts.REJECTED).toLocaleString()}
            delta="90% rejection target per spec"
          />
          <AdminKpi
            label="Spend \u00b7 24h"
            sw="Gharama \u00b7 saa 24"
            value={fmtUsd(spend.dailyUsd)}
            delta={`${spend.runCount} runs \u00b7 ${(spend.dailyTokens / 1000).toFixed(1)}k tokens`}
          />
        </div>

        <AdminCard>
          <div className="flex items-start gap-3">
            <I.brain size={18} className="text-royal-300 mt-0.5 shrink-0" />
            <div className="flex-1 text-caption text-text-secondary leading-relaxed">
              The pipeline runs in four layers — extract, filter, cross-verify,
              score. Candidates scoring {"\u2265"}&nbsp;75 land here in <strong>Pending
              review</strong> for a human officer to sign off. AI never
              publishes; the officer&apos;s approval is the only path to a live
              market. Rejections short-circuit at any layer.
            </div>
          </div>
        </AdminCard>

        {pendingSorted.length > 0 && (
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
              prefix="p"
              current={p.sort}
              dir={p.dir}
              sp={sp}
              options={[
                { field: "date", label: "Date" },
                { field: "title", label: "Title" },
                { field: "confidence", label: "Confidence" },
              ]}
            />
            <div className="divide-y divide-border/60 mt-3">
              {pending.map((c) => (
                <CandidateRow key={c.id} c={c} actionable />
              ))}
            </div>
            <AdminPagination total={pendingSorted.length} page={pPage} baseHref={pBase} param="ppage" />
          </AdminCard>
        )}

        {approvedSorted.length > 0 && (
          <AdminCard padding="p-0">
            <div className="flex items-center justify-between px-4 lg:px-5 pt-4">
              <div>
                <p className="font-display font-semibold text-body-sm text-text">
                  Approved \u00b7 ready to publish
                </p>
                <p className="text-caption italic text-text-tertiary">Yaliyoidhinishwa \u00b7 tayari kuchapishwa</p>
              </div>
              <Chip size="sm" variant="success">{approvedSorted.length} approved</Chip>
            </div>
            <CardSortControl
              prefix="a"
              current={a.sort}
              dir={a.dir}
              sp={sp}
              options={[
                { field: "date", label: "Date" },
                { field: "title", label: "Title" },
                { field: "confidence", label: "Confidence" },
              ]}
            />
            <div className="divide-y divide-border/60 mt-3">
              {approved.map((c) => (
                <CandidateRow key={c.id} c={c} publishable />
              ))}
            </div>
            <AdminPagination total={approvedSorted.length} page={aPage} baseHref={aBase} param="apage" />
          </AdminCard>
        )}

        {/* All activity — filterable + paginated */}
        <AdminCard padding="p-0">
          <div className="px-4 lg:px-5 pt-4 pb-2 space-y-3">
            <div>
              <p className="font-display font-semibold text-body-sm text-text">
                All candidates
              </p>
              <p className="text-caption italic text-text-tertiary">
                Search, filter by state, category, or date. Use this to audit AI behaviour and reject patterns.
              </p>
            </div>
            <Suspense fallback={<FilterToolbarSkeleton />}>
              <CandidateFilterToolbar totalFiltered={filtered.length} totalAll={totalAll} />
            </Suspense>
          </div>
          {pageItems.length === 0 ? (
            <div className="px-4 lg:px-5 py-12 flex flex-col items-center gap-3 text-center">
              <div className="h-10 w-10 rounded-pill bg-bg-overlay flex items-center justify-center">
                {hasFilters
                  ? <I.search size={18} className="text-text-subtle" />
                  : <I.brain size={18} className="text-text-subtle" />}
              </div>
              <div>
                <p className="font-display text-[13px] font-semibold text-text-muted">
                  {hasFilters ? "No candidates match the current filters." : "No candidates ingested yet."}
                </p>
                <p className="text-caption text-text-tertiary mt-1">
                  {hasFilters
                    ? "Try adjusting your search, changing the date range, or clearing filters."
                    : "Run the AI pipeline to generate candidates, or seed fixtures for testing."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="admin-tbl">
                  <thead className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle bg-bg-overlay border-b border-border">
                    <tr>
                      <th className="text-left p-3">State</th>
                      <th className="text-left p-3">Category</th>
                      <th className="text-left p-3">Title</th>
                      <th className="text-right p-3">Confidence</th>
                      <th className="text-right p-3">Sources</th>
                      <th className="text-left p-3">Resolves</th>
                      <th className="text-right p-3">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-muted">
                    {pageItems.map((c) => (
                      <tr key={c.id} className="border-b border-border/60 last:border-b-0 hover:bg-bg-overlay/50">
                        <td className="p-3"><Chip size="sm" variant={STATE_VARIANT[c.state]}>{c.state}</Chip></td>
                        <td className="p-3 font-mono uppercase tracking-[0.12em] text-[10px]">{c.category}</td>
                        <td className="p-3 text-text max-w-[420px] truncate">{c.proposedTitleEn}</td>
                        <td className="p-3 font-mono tabular-nums text-right">
                          <span
                            style={{
                              color: c.confidence >= 85 ? "var(--yes-300)"
                                : c.confidence >= 75 ? "var(--warning-fg)"
                                : "var(--text-tertiary)",
                            }}
                          >
                            {c.confidence}
                          </span>
                        </td>
                        <td className="p-3 font-mono tabular-nums text-right">{c.sources.length}</td>
                        <td className="p-3 font-mono text-[11px]">{fmtDate(c.resolutionAt)}</td>
                        <td className="p-3 font-mono tabular-nums text-right">{fmtUsd(c.costUsd)}</td>
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

/* ─── Card sort control — pill row above a card grid (mirrors SortTh, link-driven) ─── */

function CardSortControl({
  prefix,
  current,
  dir,
  sp,
  options,
}: {
  prefix: string;
  current: string;
  dir: SortDir;
  sp: Record<string, string | undefined>;
  options: { field: string; label: string }[];
}) {
  const sortKey = `${prefix}sort`;
  const dirKey = `${prefix}dir`;
  const pageKey = `${prefix}page`;
  const buildHref = (field: string) => {
    const isActive = current === field;
    const nextDir: SortDir = isActive && dir === "desc" ? "asc" : "desc";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== sortKey && k !== dirKey && k !== pageKey) params.set(k, v);
    }
    params.set(sortKey, field);
    params.set(dirKey, nextDir);
    return `/admin/candidates?${params.toString()}`;
  };
  return (
    <div className="flex items-center gap-1 flex-wrap px-4 lg:px-5 pt-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mr-1">
        Sort <span className="italic text-text-tertiary">· Panga</span>
      </span>
      {options.map((o) => {
        const isActive = current === o.field;
        return (
          <a
            key={o.field}
            href={buildHref(o.field)}
            className={`px-2.5 py-1 rounded-pill text-[10.5px] font-mono uppercase tracking-[0.08em] border transition-colors ${
              isActive
                ? "border-brand-500 bg-brand-500/10 text-brand-300 font-bold"
                : "border-border bg-bg-overlay text-text-muted hover:border-text-subtle"
            }`}
          >
            {o.label}
            {isActive && <span className="ml-1 text-brand-300" aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>}
          </a>
        );
      })}
    </div>
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
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 w-20 rounded-pill bg-bg-overlay" />
        ))}
      </div>
    </div>
  );
}

function CandidateRow({
  c,
  actionable,
  publishable,
}: {
  c: Candidate;
  actionable?: boolean;
  publishable?: boolean;
}) {
  return (
    <div className="px-4 lg:px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Chip size="sm" variant={STATE_VARIANT[c.state]}>{c.state}</Chip>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{c.category}</span>
          <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
            <I.shieldAlert size={10} className="inline -mt-0.5 mr-0.5" />
            confidence {c.confidence}
          </span>
          <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
            <I.fileCheck size={10} className="inline -mt-0.5 mr-0.5" />
            {c.sources.length} sources
          </span>
          <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
            <I.coins s={10} />
            ${c.costUsd.toFixed(2)}
          </span>
        </div>
        <p className="font-display text-[14px] font-semibold text-text leading-tight">
          {c.proposedTitleEn}
        </p>
        {c.proposedTitleSw && (
          <p className="text-[12px] italic text-text-tertiary leading-tight">{c.proposedTitleSw}</p>
        )}
        {c.proposedTitleZh && (
          <p className="text-[12px] italic text-text-tertiary leading-tight">{c.proposedTitleZh}</p>
        )}
        <p className="mt-1 text-[12px] text-text-muted leading-snug line-clamp-2">
          {c.resolutionCriterion}
        </p>
        <p className="mt-1 font-mono text-[10.5px] text-text-subtle">
          Resolves {fmtDate(c.resolutionAt)} {"\u00b7"}{" "}
          {c.sources.slice(0, 2).map((s, i) => (
            <span key={i}>{s.publisher}{i < Math.min(c.sources.length, 2) - 1 ? " + " : ""}</span>
          ))}
          {c.sources.length > 2 ? ` +${c.sources.length - 2} more` : null}
        </p>
      </div>
      <div className="shrink-0">
        <CandidateActions id={c.id} mode={actionable ? "review" : publishable ? "publish" : "view"} />
      </div>
    </div>
  );
}
