import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import {
  listCandidates,
  countByState,
  countCandidatesTotal,
  recordSpend,
  type Candidate,
  type CandidateState,
} from "@/lib/server/market-candidate";
import { CandidateActions } from "./candidate-actions";
import { CandidateFilterToolbar, datePresetToRange } from "./candidate-filters";

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

function fmtUsd(n: number) { return `$${n.toFixed(2)}`; }
function fmtDate(iso: string) {
  if (!iso) return "\u2014";
  try { return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return "\u2014"; }
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
  }>;
}) {
  const sp = await searchParams;
  const counts = countByState();
  const spend = recordSpend();
  const totalAll = countCandidatesTotal();

  const pending = listCandidates({ state: "PENDING_REVIEW" });
  const approved = listCandidates({ state: "APPROVED" });

  // Build filter for "all activity" table
  const dateRange = datePresetToRange(sp.date ?? "");
  const filtered = listCandidates({
    state: (sp.state as CandidateState) || undefined,
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
            <I.brain size={18} className="text-royal mt-0.5 shrink-0" />
            <div className="flex-1 text-caption text-text-secondary leading-relaxed">
              The pipeline runs in four layers — extract, filter, cross-verify,
              score. Candidates scoring {"\u2265"}&nbsp;75 land here in <strong>Pending
              review</strong> for a human officer to sign off. AI never
              publishes; the officer&apos;s approval is the only path to a live
              market. Rejections short-circuit at any layer.
            </div>
          </div>
        </AdminCard>

        {pending.length > 0 && (
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
              {pending.map((c) => (
                <CandidateRow key={c.id} c={c} actionable />
              ))}
            </div>
          </AdminCard>
        )}

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
              {approved.map((c) => (
                <CandidateRow key={c.id} c={c} publishable />
              ))}
            </div>
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
            <CandidateFilterToolbar totalFiltered={filtered.length} totalAll={totalAll} />
          </div>
          {pageItems.length === 0 ? (
            <div className="px-4 lg:px-5 py-10 text-center text-caption text-text-tertiary">
              {hasFilters
                ? "No candidates match your filters. Try adjusting your search or clearing filters."
                : "No candidates ingested yet. Run the AI pipeline or load a fixture."}
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
                                : c.confidence >= 75 ? "oklch(82% 0.16 80)"
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
