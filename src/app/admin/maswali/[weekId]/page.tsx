import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { AdminCrumbLabel } from "@/components/admin/admin-crumbs";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { consoleWeekDetail } from "@/lib/server/maswali-console";
import { draftSetVersion } from "@/lib/server/maswali-service";
import { MAIN_COUNT, slotLabel } from "@/lib/maswali-score";
import { MASWALI_VOID_REASONS } from "@/lib/maswali-void-reason";
import { fmtEat, fmtEatClock, fmtEatDay, fmtInZone, weekStateChip } from "@/lib/maswali-admin-format";
import { AttestOpenControls, DiscardDraftControl, MoveCloseForm, SealConsole, type SealRowView } from "./week-controls";
import { StandingAuditWarning } from "../audit-warning";
import { FROZEN_RULES_GROUPS, GUARANTEE_POLICY_LABEL, frozenRulesFormValues } from "../rules-form";
import { RulesRead, RULE_CANNOT_BE_READ } from "../rules-read";
import { GUARANTEE_RESERVE_POLICIES } from "@/lib/server/maswali-config";

export const metadata = { title: "Admin · Millionea · Week" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ weekId: string }> };

/**
 * /admin/maswali/[weekId] — one week, for its TRADING officer (MASWALI-BUILD S4; MASWALI-PLAN §7b S4 item 1).
 *
 *   DRAFT     → the questions, the open's checklist in words, the second reader's attestation, the open;
 *   OPEN      → moving the close within its bounds (MB-28);
 *   CLOSED / RESOLVING → the SEAL CONSOLE: one officer seals YES/NO in bulk with the evidence, a VOID on its own with its
 *               ground, a correction while the window is open; and the gate checklist — never a dead button.
 * ⛔ THE SEAL CONSOLE SHOWS NO TICKET DATA (MR-14, MB-34): not the picks, not who holds what, not what a result would
 *    cost. The officer seals what the source says, and only that.
 */
export default async function AdminMaswaliWeekPage(props: Props) {
  return <AdminPageGate title="Week"><Content {...props} /></AdminPageGate>;
}

async function Content({ params }: Props) {
  const { weekId } = await params;
  const d = await consoleWeekDetail(weekId).catch(() => null);
  if (!d) notFound();
  const { week, row, questions, problems, warnings, proposedVoids } = d;
  const session = await currentSession();
  const [canAttest, canOpen, canMove, canSeal, canVoid, canCorrect, canConfirm, canDraft] = await Promise.all([
    canUseControl(session?.role, "attestMaswaliParity"), canUseControl(session?.role, "openMaswaliWeek"),
    canUseControl(session?.role, "moveMaswaliClose"), canUseControl(session?.role, "sealMaswaliQuestion"),
    canUseControl(session?.role, "voidMaswaliQuestion"), canUseControl(session?.role, "correctMaswaliSeal"),
    canUseControl(session?.role, "confirmMaswaliSeal"),
    // S6-ADMIN · G5 · the discard sits behind the draft's own control: whoever may draft a week may take a draft back.
    canUseControl(session?.role, "createMaswaliWeek"),
  ]);
  const chip = weekStateChip(week.state);
  const sealable = week.state === "CLOSED" || week.state === "RESOLVING";
  const windowOpen = !!week.objectionsCloseAt && Date.parse(week.objectionsCloseAt) > Date.now();
  const sealRows: SealRowView[] = questions.map((q) => ({
    slot: q.slot, label: slotLabel(q.slot), textEn: q.textEn, criterionEn: q.criterionEn, sourceUrl: q.sourceUrl,
    eventEat: fmtEat(q.eventStartsAt), voidDeadlineEat: fmtEat(q.voidDeadlineAt),
    outcome: q.outcome, voidReason: q.voidReason, sealedBy: q.sealedBy, sealedAt: q.sealedAt ? fmtEat(q.sealedAt) : null,
    sealedAtIso: q.sealedAt,
    awaitingSecond: q.twoOfficerAtStage1 === true && !q.stage2By && q.outcome !== null, proposedVoid: proposedVoids.includes(q.slot),
    aiSuggestion: typeof q.aiSuggestion === "object" && q.aiSuggestion ? JSON.stringify(q.aiSuggestion).slice(0, 160) : null,
  }));
  const mainsSealed = questions.filter((q) => q.slot <= MAIN_COUNT && q.outcome !== null).length;
  const policies = GUARANTEE_RESERVE_POLICIES.map((p) => ({ value: p, label: GUARANTEE_POLICY_LABEL[p] ?? p }));
  // S6-ADMIN · the latest close the week's frozen rules allow (MB-28: the first event less the rules' minutes before it), in
  // EAT: the move's form states its bound as a time. Null when the rules or the events cannot be read.
  const firstEventMs = Math.min(...questions.map((q) => Date.parse(q.eventStartsAt)));
  const latestClose = d.rules && Number.isFinite(firstEventMs)
    ? { eat: fmtEat(new Date(firstEventMs - d.rules.minLockBufferMinutes * 60_000).toISOString()), minutes: d.rules.minLockBufferMinutes }
    : null;

  return (
    <>
      <AdminCrumbLabel segment={week.id} label={week.code} />
      <AdminPageHead title={week.code} sw={`${week.visibility === "DRIVE" ? "Drive" : "Public"} week · ${chip.label}${week.isFinal ? " · final week" : ""}`}
        actions={<Chip variant={chip.variant}>{chip.label}</Chip>} />
      <AdminBody>
        <KpiGrid cols="1-sm2-xl4">
          <AdminKpi label="Sales open" sw="Mauzo yanafunguliwa" value={fmtEatDay(week.opensAt)} note={`${fmtEatClock(week.opensAt)} EAT`} />
          <AdminKpi label="Sales close" sw="Mauzo yanafungwa" value={fmtEatDay(week.closesAt)}
            note={week.closedAt ? `${fmtEatClock(week.closesAt)} EAT · closed ${fmtEat(week.closedAt)}` : `${fmtEatClock(week.closesAt)} EAT`} />
          <AdminKpi label="Tickets" sw="Tiketi" value={week.ticketCount.toLocaleString("en")} note="Live count" />
          <AdminKpi label="Results" sw="Matokeo" value={week.state === "DRAFT" || week.state === "OPEN" ? "—" : row.voidCertain ? "Voids whole" : row.needs.length ? `${row.sealed} of 15` : "Final"}
            note={sealable ? (row.needs.length ? `${mainsSealed} of ${MAIN_COUNT} mains sealed · needs ${row.needs.map(slotLabel).join(", ")}` : week.objectionsCloseAt ? `Objection window to ${fmtEat(week.objectionsCloseAt)}` : undefined) : undefined}
            {...(row.voidCertain ? { tone: "danger" as const } : {})} />
        </KpiGrid>
        {/* S5-FIX-SRV · the open's controls leave with the DRAFT state as it lands: its audit warning stands here instead. */}
        <StandingAuditWarning slot={`week:${week.id}`} />

        {week.state === "DRAFT" && (
          <AdminCard title="Before it can open" sw="Kabla ya kufunguliwa">
            {problems && problems.length > 0 ? (
              <ul className="space-y-1.5 text-body-sm">
                {problems.map((p, i) => <li key={i} className="flex gap-2"><span aria-hidden className="text-warning">•</span><span>{p}</span></li>)}
              </ul>
            ) : <p className="text-body-sm text-success">Every check passes: the week can open.</p>}
            {/* S7 · the holiday review (MB-85): a warning to act on, never a refusal — the week opens either way. */}
            {(warnings ?? []).map((w, i) => <p key={i} className="mt-3 text-body-sm text-warning">{w}</p>)}
            <p className="mt-3 text-body-sm"><Link href={`/admin/maswali/${week.id}/edit` as Route} className="link inline-flex min-h-[44px] items-center">Edit the questions</Link> <span className="text-text-tertiary">· an edit clears the attestation</span></p>
            <div className="mt-3">
              <AttestOpenControls weekId={week.id} weekCode={week.code} attestedBy={week.parityAttestedBy} canAttest={canAttest} canOpen={canOpen} openReady={!!problems && problems.length === 0}
                readVersion={draftSetVersion(questions)} attestNeed={CONTROL_DOMAIN.attestMaswaliParity} openNeed={CONTROL_DOMAIN.openMaswaliWeek} />
            </div>
            {/* S6-ADMIN · G5 · a draft made for the wrong Monday or line is taken back here; the announced final week never is. */}
            <div className="mt-4 border-t border-border-subtle pt-3">
              {week.isFinal ? <p className="text-body-sm text-text-secondary">The announced final week cannot be discarded.</p>
                : canDraft ? <DiscardDraftControl weekId={week.id} weekCode={week.code} />
                : <ControlLocked what="Discard draft" need={CONTROL_DOMAIN.createMaswaliWeek} />}
            </div>
          </AdminCard>
        )}

        {week.state === "OPEN" && (
          <AdminCard title="Move the sales close" sw="Badilisha muda wa kufunga" >
            {/* S7-F2 · the holiday review (MB-85) stays while the close can still move: bringing it forward is done here. */}
            {(warnings ?? []).map((w, i) => <p key={i} className="mb-3 text-body-sm text-warning">{w}</p>)}
            {canMove ? <MoveCloseForm weekId={week.id} weekCode={week.code} currentEat={fmtEat(week.closesAt)} closesAt={week.closesAt} latest={latestClose} />
              : <ControlLocked what="Move the close" need={CONTROL_DOMAIN.moveMaswaliClose} block />}
          </AdminCard>
        )}

        {sealable ? (
          <AdminCard title="Seal the results" sw="Muhuri wa matokeo" padding="p-0">
            <SealConsole weekId={week.id} weekCode={week.code} rows={sealRows} voidReasons={[...MASWALI_VOID_REASONS]} windowOpen={windowOpen}
              can={{ seal: canSeal, void: canVoid, correct: canCorrect, confirm: canConfirm }}
              need={{ seal: CONTROL_DOMAIN.sealMaswaliQuestion, void: CONTROL_DOMAIN.voidMaswaliQuestion, correct: CONTROL_DOMAIN.correctMaswaliSeal, confirm: CONTROL_DOMAIN.confirmMaswaliSeal }} />
          </AdminCard>
        ) : (
          <AdminCard title="Questions" sw="Maswali" padding="p-0">
            <ScrollX label="Millionea week questions">
              <table className="admin-tbl min-w-[900px]">
                <thead>
                  <tr><th className="text-left">Slot</th><th className="text-left">Question (English)</th><th className="text-left">Starts (source)</th><th className="text-left">Starts (EAT)</th><th className="text-left">Source</th><th className="text-right">Chance</th><th className="text-left">Result</th></tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id}>
                      <td className="text-left tabular">{slotLabel(q.slot)}</td>
                      <td className="text-left max-w-[340px]">{q.textEn}</td>
                      <td className="text-left tabular">{fmtInZone(q.eventStartsAt, q.eventZone)}</td>
                      <td className="text-left tabular">{fmtEat(q.eventStartsAt)}</td>
                      <td className="text-left">{q.sourceDomain}</td>
                      <td className="text-right tabular">{q.probabilityEstimate == null ? "—" : `${Math.round(q.probabilityEstimate * 100)}%`}</td>
                      <td className="text-left">{q.outcome ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          </AdminCard>
        )}

        {/* S6-ADMIN · G2 · the rules this week runs on, read-only, in the Owner's form's own words: an officer asked "what fee
            does this running week take?" answers it here. A DRAFT shows what its open would freeze now. */}
        <AdminCard title={week.state === "DRAFT" ? "Rules if it opened now" : "Rules this week froze"} sw={week.state === "DRAFT" ? "Kanuni ikifunguliwa sasa" : "Kanuni za wiki hii"}>
          {d.rules ? (<>
            <p className="mb-3 text-body-sm text-text-secondary">{week.state === "DRAFT"
              ? "The rules for the next week, as the open would freeze them now. A change the Owner saves before the open applies to this week; once it opens, it keeps what it froze."
              : `Frozen when the week opened, ${fmtEat(d.rules.frozenAt)} (EAT). They never change; a change the Owner saves applies from the next week to open.`}</p>
            <RulesRead values={frozenRulesFormValues(d.rules, d.feeRate)} policies={policies} groups={FROZEN_RULES_GROUPS} />
            <p className="mt-3 text-body-sm text-text-secondary">A Millionea ticket has no paid early exit.</p>
          </>) : <p className="text-body-sm text-danger-fg">{week.state === "DRAFT" ? "The rules for the next week do not validate, so there is nothing the open would freeze." : `This week's frozen rules: ${RULE_CANNOT_BE_READ}.`}</p>}
        </AdminCard>
      </AdminBody>
    </>
  );
}
