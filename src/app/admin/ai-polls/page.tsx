import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import {
  listAIPolls,
  countAIPollsByState,
  aiPollSpend,
  type StoredAIPoll,
  type AIPollState,
} from "@/lib/server/ai-poll-generation";
import { getAIProvider } from "@/lib/server/ai-provider";
import {
  GenerateForm,
  QualityBadges,
  FilterReasonChips,
  ReviewActions,
  PublishActions,
  DeleteAction,
  SeedFixturesButton,
} from "./poll-actions";

export const metadata = { title: "Admin · AI poll generation" };
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
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return "—"; }
}

export default function AdminAIPollsPage() {
  const counts = countAIPollsByState();
  const spend = aiPollSpend();
  const pending = listAIPolls({ state: "PENDING_REVIEW" });
  const approved = listAIPolls({ state: "APPROVED" });
  const recent = listAIPolls().slice(0, 40);

  return (
    <>
      <AdminPageHead
        title="AI poll generation"
        sw="Uzalishaji wa kura · Claude AI"
        period={false}
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi
            label="Pending review"
            sw="Inasubiri ukaguzi"
            value={counts.PENDING_REVIEW.toLocaleString()}
            delta={`${counts.GENERATING} generating`}
            pulse={counts.PENDING_REVIEW > 0}
          />
          <AdminKpi
            label="Approved"
            sw="Yaliyoidhinishwa"
            value={counts.APPROVED.toLocaleString()}
            delta={`${counts.PUBLISHED} published`}
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
        </AdminCard>

        {/* Pending review queue */}
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
              {pending.map((p) => (
                <PollRow key={p.id} poll={p} mode="review" />
              ))}
            </div>
          </AdminCard>
        )}

        {/* Approved — ready to publish */}
        {approved.length > 0 && (
          <AdminCard padding="p-0">
            <div className="flex items-center justify-between px-4 lg:px-5 pt-4">
              <div>
                <p className="font-display font-semibold text-body-sm text-text">
                  Approved · ready to publish
                </p>
                <p className="text-caption italic text-text-tertiary">Yaliyoidhinishwa · tayari kuchapishwa</p>
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

        {/* Recent activity */}
        <AdminCard padding="p-0">
          <div className="flex items-center justify-between px-4 lg:px-5 pt-4 pb-2">
            <div>
              <p className="font-display font-semibold text-body-sm text-text">
                Recent activity
              </p>
              <p className="text-caption italic text-text-tertiary">
                Last 40 generations across every state. Use this to audit AI behaviour and quality patterns.
              </p>
            </div>
            <SeedFixturesButton />
          </div>
          {recent.length === 0 ? (
            <div className="px-4 lg:px-5 py-10 text-center text-caption text-text-tertiary">
              No polls generated yet. Use the form above or seed fixtures.
            </div>
          ) : (
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
                  {recent.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-b-0 hover:bg-bg-overlay/50">
                      <td className="p-3"><Chip size="sm" variant={STATE_VARIANT[p.state]}>{p.state}</Chip></td>
                      <td className="p-3 font-mono uppercase tracking-[0.12em] text-[10px]">{p.category || "—"}</td>
                      <td className="p-3 text-text max-w-[360px] truncate">{p.titleEn || <span className="italic text-text-subtle">empty</span>}</td>
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
                      <td className="p-3 text-right">
                        {(p.state === "FILTERED" || p.state === "VALIDATION_FAILED" || p.state === "REJECTED") && (
                          <DeleteAction pollId={p.id} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </>
  );
}

/* ─── Poll row (used in pending + approved cards) ─── */

function PollRow({ poll, mode }: { poll: StoredAIPoll; mode: "review" | "publish" }) {
  return (
    <div className="px-4 lg:px-5 py-4 flex items-start gap-4">
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

        {/* Title */}
        <p className="font-display text-[14px] font-semibold text-text leading-tight">
          {poll.titleEn || <span className="italic text-text-subtle">No title generated</span>}
        </p>
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
                {o.descriptionEn && <span className="ml-1 text-text-subtle">· {o.descriptionEn}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Meta line */}
        <p className="mt-1 font-mono text-[10.5px] text-text-subtle">
          {poll.resolutionAt ? `Resolves ${fmtDate(poll.resolutionAt)}` : "No resolution date"} ·{" "}
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

        {/* Filter reasons (if any) */}
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

        {/* Raw response (for debugging) */}
        {poll.rawResponse && (poll.state === "VALIDATION_FAILED" || poll.state === "FILTERED") && (
          <details className="mt-2 text-[11px]">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle hover:text-text-muted">
              Raw AI response
            </summary>
            <pre className="mt-1 text-text-muted leading-relaxed pl-2 border-l-2 border-border text-[10px] font-mono overflow-x-auto max-w-full whitespace-pre-wrap break-all">
              {poll.rawResponse.slice(0, 1000)}
              {poll.rawResponse.length > 1000 && "…"}
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

      {/* Action buttons */}
      <div className="shrink-0">
        {mode === "review" && <ReviewActions poll={poll} />}
        {mode === "publish" && <PublishActions poll={poll} />}
      </div>
    </div>
  );
}
