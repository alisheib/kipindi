import { AdminCard } from "@/components/admin/admin-shell";
import { ObjectionStatusBadge } from "@/components/admin/status-badge";
import { ControlLocked } from "@/components/admin/control-locked";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { millioneaObjectionQueue, type MillioneaQueueWeek } from "@/lib/server/maswali-objections";
import { secondOfficerChecksOn } from "@/lib/server/second-officer-policy";
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
 *    objection window stands and what is still to rule.
 * ⛔ The page asks the service's own questions before it offers a ruling: the role (`ruleMaswaliObjection`, compliance;
 *    the Owner bypasses), and for this officer on this question — the objector, a ticket holder in the week, and, while the
 *    Owner's "Second-officer checks" are ON (FEE-TAX R1, read fresh here as the service reads it), the seal's officers and
 *    the officer whose upheld ruling set the present result — the refusal in words, never a button that bounces.
 * ⛔ The filer is shown as the console shows a player (`displayLabel`), never a phone number, and nothing of any ticket.
 */
/** An instant as the console prints it (`fmtEat`), kept on one line: a date is never split across two. */
const When = ({ iso }: { iso: string | null }) => <span className="whitespace-nowrap">{fmtEat(iso)}</span>;

function WindowLine({ w }: { w: MillioneaQueueWeek }) {
  const restart = w.restartSpent ? " It has restarted once; a further change does not restart it." : "";
  switch (w.window.state) {
    case "OPEN": return <>Objection window open until <When iso={w.window.closesAt} />.{restart}</>;
    case "CLOSED": return <>Objection window closed <When iso={w.window.closesAt} />: the week settles once every objection here is ruled.{restart}</>;
    case "NOT_YET": return <>The objection window opens again once the graded set is final.{restart}</>;
    case "FINAL": return <>The week's results are final.</>;
  }
}

export async function MillioneaObjectionQueue({ viewerId, viewerIsOwner, canRule }: { viewerId: string | null; viewerIsOwner: boolean; canRule: boolean }) {
  const [queue, secondOfficer] = await Promise.all([millioneaObjectionQueue(viewerId).catch(() => null), secondOfficerChecksOn()]);
  const fallback = viewerIsOwner ? "" : " — the Owner, if no other compliance officer can";
  return (
    <AdminCard title="Objections" sw="Pingamizi" padding="p-0">
      <StandingAuditWarning slot="integrity:objections" />
      {queue === null ? <p className="p-4 text-body-sm text-danger-fg">The objections could not be read.</p>
        : queue.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState fill kind="admin" title="No objection to rule"
              body={`A ticket holder may object to one question while its week's objection window is open. Each objection waits here, and holds its week's settlement, until ${secondOfficer ? "an officer other than the question's sealer" : "an officer"} rules on it.`} />
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
                  <p className="text-body-sm text-text-secondary"><WindowLine w={w} /></p>
                </div>
                {w.questions.map((q) => (
                  <div key={q.slot} className="space-y-2">
                    <p className="text-body-sm"><span className="font-semibold tabular">{q.label}</span> · {q.textEn}</p>
                    {q.author ? (
                      // The present result is a ruling's: say whose, and keep the seal's officer beside it (MR-16's two bars).
                      <p className="text-body-sm text-text-secondary">
                        Now <span className="font-semibold text-text">{outcomeLabel(q.outcome)}</span>
                        {q.outcome === "VOID" && isMaswaliVoidReason(q.voidReason) ? ` (${MASWALI_VOID_REASON_LABEL[q.voidReason]})` : ""}
                        {`, on an objection upheld by ${q.author} on `}<When iso={q.authoredAt} />{`. Sealed by ${q.sealer}`}{q.confirmer ? `, confirmed by ${q.confirmer}` : ""}.
                      </p>
                    ) : (
                      <p className="text-body-sm text-text-secondary">
                        Sealed <span className="font-semibold text-text">{outcomeLabel(q.outcome)}</span>
                        {q.outcome === "VOID" && isMaswaliVoidReason(q.voidReason) ? ` (${MASWALI_VOID_REASON_LABEL[q.voidReason]})` : ""}
                        {` by ${q.sealer} on `}<When iso={q.sealedAt} />{q.confirmer ? `, confirmed by ${q.confirmer}` : ""}.
                      </p>
                    )}
                    {q.evidence && <p className="text-body-sm text-text-tertiary break-words">{q.evidence}</p>}
                    <ul className="space-y-2">
                      {q.objections.map((o) => {
                        // The service's own refusals, in its order (`decideMillioneaObjection`), said before any button — the seal's
                        // officers and the result's author only while the Owner's second-officer checks are ON (FEE-TAX R1).
                        const blocked = o.userId === viewerId ? "This is your own objection: another officer rules on it."
                          : secondOfficer && viewerId && (q.sealedBy === viewerId || q.stage2By === viewerId)
                            ? `You ${q.sealedBy === viewerId ? "sealed" : "confirmed the seal of"} ${q.label}, so another officer rules on its objections${fallback}.`
                            : secondOfficer && viewerId && q.authorId === viewerId
                              ? `You set ${q.label}'s present result on an earlier objection, so another officer rules on its objections${fallback}.`
                              : w.viewerHoldsTicket ? `You hold a ticket in ${w.code}, so another officer rules on its objections${fallback}.` : null;
                        return (
                          <li key={o.id} id={`objection-${o.id}`} className="rounded-md border border-border-subtle p-3 space-y-2 scroll-mt-11">
                            <div><ObjectionStatusBadge status={o.status} /></div>
                            {/* One run of words, so a narrow line wraps between them — never a separator left at a line's start. */}
                            <p className="text-body-sm">
                              <span className="font-semibold">{o.filer}</span>
                              <span className="text-text-secondary">{` · ${REASON_LABEL[o.reason] ?? o.reason} · filed `}<When iso={o.createdAt} /></span>
                            </p>
                            {/* The filer's own words, set off as theirs. */}
                            <blockquote className="border-l-2 border-border pl-3 text-body-sm text-text-secondary whitespace-pre-wrap break-words">{o.detail}</blockquote>
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
                                  {` by ${o.reviewer ?? "—"} on `}<When iso={o.reviewedAt} />{o.reviewNote ? `: ${o.reviewNote}` : "."}
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
