import { notFound } from "next/navigation";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { AdminCrumbLabel } from "@/components/admin/admin-crumbs";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { questionStore, weekStore } from "@/lib/server/maswali-dal";
import { draftRowVersion } from "@/lib/server/maswali-service";
import { utcToZonedLocal } from "@/lib/maswali-time";
import { WeekBuilder, type BuilderRow } from "../../new/week-builder";

export const metadata = { title: "Admin · Millionea · Edit a draft" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ weekId: string }> };

/** /admin/maswali/[weekId]/edit — the builder on an existing DRAFT (MASWALI-BUILD S4). Past DRAFT the questions are frozen (MR-13). */
export default async function AdminMaswaliEditPage(props: Props) {
  return <AdminPageGate title="Edit a draft"><Content {...props} /></AdminPageGate>;
}

async function Content({ params }: Props) {
  const { weekId } = await params;
  const week = await weekStore.get(weekId).catch(() => null);
  if (!week) notFound();
  const session = await currentSession();
  const canEdit = await canUseControl(session?.role, "editMaswaliQuestion");
  const questions = await questionStore.listForWeek(week.id);
  const rows: BuilderRow[] = questions.map((q) => {
    const local = utcToZonedLocal(Date.parse(q.eventStartsAt), q.eventZone);
    return {
      role: q.role, ordinal: q.ordinal, category: q.category, eventKind: q.eventKind,
      textEn: q.textEn, textSw: q.textSw, textZh: q.textZh, criterionEn: q.criterionEn, criterionSw: q.criterionSw, criterionZh: q.criterionZh,
      sourceUrl: q.sourceUrl, fallbackSourceUrl: q.fallbackSourceUrl ?? "", readingTolerance: q.readingTolerance ?? "",
      eventDate: local.slice(0, 10), eventTime: local.slice(11, 16), eventZone: q.eventZone,
      probabilityPct: q.probabilityEstimate == null ? "" : String(Math.round(q.probabilityEstimate * 100)), probabilitySource: q.probabilitySource ?? "",
    };
  });
  return (
    <>
      <AdminCrumbLabel segment={week.id} label={week.code} />
      <AdminPageHead title={`Edit ${week.code}`} sw="Hariri rasimu" />
      <AdminBody>
        {week.state !== "DRAFT"
          ? <p className="text-body-sm text-text-secondary">Week {week.code} is {week.state.toLowerCase()}: its questions froze at the open (MR-13).</p>
          : canEdit ? <WeekBuilder defaultMonday="" edit={{ weekId: week.id, rows, versions: questions.map(draftRowVersion) }} />
          : <ControlLocked what="Edit the draft" need={CONTROL_DOMAIN.editMaswaliQuestion} block />}
      </AdminBody>
    </>
  );
}
