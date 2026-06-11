import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { formatDateTimeSafe } from "@/lib/utils";
import {
  getAIPoll,
  type AIPollState,
} from "@/lib/server/ai-poll-generation";
import {
  QualityBadges,
  FilterReasonChips,
  ReviewActions,
  PublishActions,
  DeleteAction,
} from "../poll-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poll = await getAIPoll(id);
  return { title: poll ? `AI Poll · ${poll.titleEn || poll.id.slice(0, 8)}` : "Poll not found" };
}

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

export default async function PollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poll = await getAIPoll(id);
  if (!poll) notFound();

  const canReview = poll.state === "PENDING_REVIEW";
  const canPublish = poll.state === "APPROVED";
  const canDelete = poll.state === "FILTERED" || poll.state === "VALIDATION_FAILED" || poll.state === "REJECTED";

  return (
    <>
      <AdminPageHead
        title="Poll detail"
        sw="Maelezo ya kura"
        period={false}
        actions={
          <Link
            href="/admin/ai-polls"
            className="btn btn-ghost btn-sm rounded-pill inline-flex items-center gap-1.5"
          >
            <I.chevronLeft s={14} />
            Back to polls
          </Link>
        }
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Header card */}
        <AdminCard>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* State + badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Chip size="md" variant={STATE_VARIANT[poll.state]}>{poll.state}</Chip>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{poll.category}</span>
                <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
                  <I.shieldAlert size={10} className="inline -mt-0.5 mr-0.5" />
                  confidence {poll.confidence}
                </span>
                <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
                  <I.fileCheck size={10} className="inline -mt-0.5 mr-0.5" />
                  {poll.sources.length} sources
                </span>
                {poll.regenerationCount > 0 && (
                  <span className="font-mono text-[10.5px] tabular-nums text-text-muted">
                    <I.sparkle size={10} className="inline -mt-0.5 mr-0.5" />
                    regen #{poll.regenerationCount}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="font-display text-[18px] font-bold text-text leading-snug">
                {poll.titleEn || <span className="italic text-text-subtle">No title generated</span>}
              </h2>
              {poll.titleSw && (
                <p className="text-[13px] italic text-text-tertiary leading-tight mt-0.5">{poll.titleSw}</p>
              )}
            </div>

            {/* Actions */}
            <div className="shrink-0">
              {canReview && <ReviewActions poll={poll} />}
              {canPublish && <PublishActions poll={poll} />}
              {canDelete && <DeleteAction pollId={poll.id} />}
            </div>
          </div>
        </AdminCard>

        {/* Resolution + options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AdminCard>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-2">Resolution criterion</p>
            <p className="text-[13px] text-text leading-relaxed">
              {poll.resolutionCriterion || <span className="italic text-text-subtle">No criterion set</span>}
            </p>
            <div className="mt-3 pt-3 border-t border-border/60">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">Resolution date</p>
              <p className="font-mono text-[13px] text-text tabular-nums">
                {poll.resolutionAt ? fmtDate(poll.resolutionAt) : "\u2014"}
              </p>
            </div>
          </AdminCard>

          <AdminCard>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-2">Betting options</p>
            {poll.options.length > 0 ? (
              <div className="space-y-2">
                {poll.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-bg-overlay">
                    <span className="font-mono text-[12px] font-bold text-text">{o.label}</span>
                    {o.descriptionEn && <span className="text-[11px] text-text-muted">{o.descriptionEn}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] italic text-text-subtle">No options defined</p>
            )}
          </AdminCard>
        </div>

        {/* Quality */}
        <AdminCard>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-2">Quality assessment</p>
          {poll.qualityIndicators.length > 0 ? (
            <QualityBadges indicators={poll.qualityIndicators} overall={poll.overallQuality} />
          ) : (
            <div className="flex items-center gap-2 py-3">
              <div className="h-8 w-8 rounded-pill bg-bg-overlay flex items-center justify-center">
                <I.shieldAlert size={14} className="text-text-subtle" />
              </div>
              <div>
                <p className="text-[12px] text-text-muted">No quality data</p>
                <p className="text-[11px] text-text-subtle">
                  {poll.state === "VALIDATION_FAILED" || poll.state === "FILTERED"
                    ? "This poll failed validation before quality scoring."
                    : "Quality indicators have not been computed."}
                </p>
              </div>
            </div>
          )}
        </AdminCard>

        {/* Filter reasons */}
        {poll.filterReasons.length > 0 && (
          <AdminCard>
            <div className="flex items-center gap-2 mb-2">
              <I.warning s={14} />
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Filter reasons</p>
            </div>
            <FilterReasonChips reasons={poll.filterReasons} />
          </AdminCard>
        )}

        {/* Sources */}
        <AdminCard>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-2">Sources</p>
          {poll.sources.length > 0 ? (
            <div className="space-y-1.5">
              {poll.sources.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="font-mono font-bold text-text">{s.publisher}</span>
                  <span className="text-text-subtle truncate max-w-[400px]">{s.url}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-3">
              <div className="h-8 w-8 rounded-pill bg-bg-overlay flex items-center justify-center">
                <I.fileCheck size={14} className="text-text-subtle" />
              </div>
              <p className="text-[12px] text-text-muted">
                {poll.state === "VALIDATION_FAILED" || poll.state === "FILTERED"
                  ? "No sources were returned by the AI provider."
                  : "No sources attached to this poll."}
              </p>
            </div>
          )}
        </AdminCard>

        {/* AI reasoning */}
        <AdminCard>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-2">AI reasoning</p>
          {poll.reasoning ? (
            <p className="text-[12px] text-text-muted leading-relaxed pl-3 border-l-2 border-border">
              {poll.reasoning}
            </p>
          ) : (
            <p className="text-[12px] italic text-text-subtle py-2">No reasoning provided by the AI.</p>
          )}
        </AdminCard>

        {/* Raw response (for failed/filtered) */}
        {poll.rawResponse && (poll.state === "VALIDATION_FAILED" || poll.state === "FILTERED") && (
          <AdminCard>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-2">Raw AI response</p>
            <pre className="text-[10px] font-mono text-text-muted leading-relaxed pl-3 border-l-2 border-border overflow-x-auto whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto">
              {poll.rawResponse.slice(0, 2000)}
              {poll.rawResponse.length > 2000 && "\u2026"}
            </pre>
          </AdminCard>
        )}

        {/* Meta card */}
        <AdminCard>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-3">Metadata</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetaField label="Poll ID" value={poll.id} mono />
            <MetaField label="Created" value={fmtDate(poll.createdAt)} />
            <MetaField label="Updated" value={fmtDate(poll.updatedAt)} />
            <MetaField label="Cost" value={fmtUsd(poll.costUsd)} />
            <MetaField label="Tokens" value={poll.tokensUsed.toLocaleString()} />
            <MetaField label="Latency" value={poll.latencyMs > 0 ? `${(poll.latencyMs / 1000).toFixed(1)}s` : "\u2014"} />
            <MetaField label="Request category" value={poll.requestCategory} />
            <MetaField label="Request prompt" value={poll.requestPrompt || "\u2014"} />
          </div>
          {poll.reviewedBy && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <p className="font-mono text-[10.5px] text-text-subtle">
                Reviewed by {poll.reviewedBy.slice(-6)} at {fmtDate(poll.reviewedAt ?? "")}
                {poll.reviewNote && ` \u00b7 "${poll.reviewNote}"`}
              </p>
            </div>
          )}
          {poll.publishedMarketId && (
            <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2">
              <Chip size="sm" variant="success">PUBLISHED</Chip>
              <Link
                href={`/admin/markets`}
                className="font-mono text-[11px] text-brand-300 hover:underline"
              >
                Market {poll.publishedMarketId.slice(0, 8)}...
              </Link>
            </div>
          )}
        </AdminCard>
      </div>
    </>
  );
}

function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle mb-0.5">{label}</p>
      <p className={`text-[12px] text-text leading-tight ${mono ? "font-mono break-all" : ""}`}>{value}</p>
    </div>
  );
}
