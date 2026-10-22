import { AdminCard } from "@/components/admin/admin-shell";
import { ObjectionStatusBadge } from "@/components/admin/status-badge";
import { ControlLocked } from "@/components/admin/control-locked";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { millioneaObjectionQueue, type MillioneaQueueWeek } from "@/lib/server/maswali-objections";
import { isMaswaliVoidReason, MASWALI_VOID_REASON_LABEL } from "@/lib/maswali-void-reason";
import { fmtEat } from "@/lib/maswali-admin-format";
import { MillioneaRulingControl } from "./objection-controls";
import { outcomeLabel, REASON_LABEL, REMEDY_LABEL } from "./objection-words";
import { StandingAuditWarning } from "../audit-warning";

/**
 * /admin/maswali/integrity · THE MILLIONEA OBJECTION QUEUE (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23) — every
 * week whose results are being decided and that has an objection, by question: the seal under dispute, each filer's
 * reason and words, and Compliance's ruling.
 *
 * ⭐ An OPEN objection holds its week's settlement and its week void (OB.1–OB.5), so the queue says, per week, where the
 *    check window stands and what is still to rule.
 * ⛔ The page asks the service's own questions before it offers a ruling: the role (`ruleMaswaliObjection`, compliance;
 *    the Owner bypasses), and for this officer on this question — the seal's officers, the objector, a ticket holder in
 *    the week — the refusal in words, never a button that bounces.
 * ⛔ The filer is shown as the console shows a player (`displayLabel`), never a phone number, and nothing of any ticket.
 */
function windowLine(w: MillioneaQueueWeek): string {
  const restart = w.restartSpent ? " It has restarted once; a further change does not restart it." : "";
  switch (w.window.state) {
    case "OPEN": return `Check window open until ${fmtEat(w.window.closesAt)}.${restart}`;
    case "CLOSED": return `Check window closed ${fmtEat(w.window.closesAt)}: the week settles once every objection here is ruled.${restart}`;
    case "NOT_YET": return `The check window opens again once the graded set is final.${restart}`;
    case "FINAL": return "The week's results are final.";
  }
}

export async function MillioneaObjectionQueue({ viewerId, viewerIsOwner, canRule }: { viewerId: string | null; viewerIsOwner: boolean; canRule: boolean }) {
  const queue = await millioneaObjectionQueue(viewerId).catch(() => null);
  const fallback = viewerIsOwner ? "" : " — the Owner, if no other compliance officer can";
  return (
    <AdminCard title="Objections" sw="Pingamizi" padding="p-0">
      <StandingAuditWarning slot="integrity:objections" />
      {queue === null ? <p className="p-4 text-body-sm text-danger-fg">The objections could not be read.</p>
        : queue.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState fill kind="admin" title="No objection to rule"
              body="A ticket holder may object to one question while its week's check window is open. Each objection waits here, and holds its week's settlement, until an officer other than the question's sealer rules on it." />
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {queue.map((w) => (
              <section key={w.weekId} className="p-4 space-y-4" aria-label={`${w.code} objections`}>
                <div className="space-y-1">
                  <h3 className="font-semibold text-body tabular flex flex-wrap items-center gap-2">
                    <span>{w.code}</span>
                    {w.open > 0 ? <Chip variant="objection">{w.open === 1 ? "1 to rule" : `${w.open} to rule`}</Chip> : <Chip variant="neutral">All ruled</Chip>}
                  </h3>
                  <p className="text-body-sm text-text-secondary">{windowLine(w)}</p>
                </div>
                {w.questions.map((q) => (
                  <div key={q.slot} className="space-y-2">
                    <p className="text-body-sm"><span className="font-semibold tabular">{q.label}</span> · {q.textEn}</p>
                    <p className="text-body-sm text-text-secondary">
                      Sealed <span className="font-semibold text-text">{outcomeLabel(q.outcome)}</span>
                      {q.outcome === "VOID" && isMaswaliVoidReason(q.voidReason) ? ` (${MASWALI_VOID_REASON_LABEL[q.voidReason]})` : ""}
                      {` by ${q.sealer} on ${fmtEat(q.sealedAt)}`}{q.confirmer ? `, confirmed by ${q.confirmer}` : ""}.
                    </p>
                    {q.evidence && <p className="text-body-sm text-text-tertiary break-words">{q.evidence}</p>}
                    <ul className="space-y-2">
                      {q.objections.map((o) => {
                        const blocked = o.userId === viewerId ? "This is your own objection: another officer rules on it."
                          : viewerId && (q.sealedBy === viewerId || q.stage2By === viewerId)
                            ? `You ${q.sealedBy === viewerId ? "sealed" : "confirmed the seal of"} ${q.label}, so another officer rules on its objections${fallback}.`
                            : w.viewerHoldsTicket ? `You hold a ticket in ${w.code}, so another officer rules on its objections${fallback}.` : null;
                        return (
                          <li key={o.id} className="rounded-md border border-border-subtle p-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-body-sm">
                              <ObjectionStatusBadge status={o.status} />
                              <span className="font-semibold">{o.filer}</span>
                              <span className="text-text-secondary">· {REASON_LABEL[o.reason] ?? o.reason} · filed {fmtEat(o.createdAt)}</span>
                            </div>
                            <p className="text-body-sm text-text-secondary whitespace-pre-wrap break-words">{o.detail}</p>
                            {o.status === "OPEN"
                              ? (canRule
                                ? (q.outcome && q.sealedAt
                                  ? <MillioneaRulingControl objectionId={o.id} weekCode={w.code} slotLabel={q.label} outcome={q.outcome} sealedAtIso={q.sealedAt}
                                      restartSpent={w.restartSpent} blocked={blocked} />
                                  : <p className="text-body-sm text-text-secondary">{q.label} has no sealed result to rule on.</p>)
                                : <ControlLocked what="Rule on this objection" need={CONTROL_DOMAIN.ruleMaswaliObjection} />)
                              : (
                                <p className="text-body-sm text-text-secondary break-words">
                                  {o.status === "UPHELD" ? `Upheld · ${REMEDY_LABEL[o.remedy ?? ""] ?? "—"}` : "Rejected"}
                                  {` by ${o.reviewer ?? "—"} on ${fmtEat(o.reviewedAt)}`}{o.reviewNote ? `: ${o.reviewNote}` : "."}
                                </p>
                              )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
    </AdminCard>
  );
}
