import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { eatWeekStartMs } from "@/lib/eat-day";
import { draftSuggestions } from "@/lib/server/maswali-console";
import { WeekBuilder } from "./week-builder";

export const metadata = { title: "Admin · Millionea · Draft a week" };
export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 86_400_000;

/**
 * /admin/maswali/new — draft a week (MASWALI-BUILD S4). The draft opens nothing: the week page shows the open's
 * checklist, the second reader attests the three languages agree (MB-79), and only then can it open.
 */
export default async function AdminMaswaliNewPage() {
  return <AdminPageGate title="Draft a week"><Content /></AdminPageGate>;
}

async function Content() {
  const session = await currentSession();
  const canDraft = await canUseControl(session?.role, "createMaswaliWeek");
  // The next Monday 00:00 EAT — the earliest week that can still sell a full week.
  const next = eatWeekStartMs(Date.now()) + WEEK_MS;
  const monday = new Date(next + 3 * 3_600_000).toISOString().slice(0, 10);
  // The window a week's events fall in: from its Friday close to the Tuesday after (the results week's start). Two
  // weeks of it, so a week drafted further ahead still sees its fixtures.
  const suggestions = canDraft ? await draftSuggestions(next + 4 * 86_400_000, next + 3 * WEEK_MS).catch(() => []) : [];
  return (
    <>
      <AdminPageHead title="Draft a week" sw="Andaa wiki" />
      <AdminBody>
        {canDraft ? <WeekBuilder defaultMonday={monday} suggestions={suggestions} /> : <ControlLocked what="Draft a week" need={CONTROL_DOMAIN.createMaswaliWeek} block />}
      </AdminBody>
    </>
  );
}
