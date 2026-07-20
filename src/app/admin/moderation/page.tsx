import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { listForModeration } from "@/lib/server/comments-store";
import { ModerationQueue } from "./moderation-client";

export const metadata = { title: "Admin · Comment moderation" };
export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const items = await listForModeration().catch(() => []);
  const reported = items.filter((i) => !i.hidden).length;
  const hidden = items.filter((i) => i.hidden).length;
  return (
    <>
      <AdminPageHead title="Comment moderation" sw="Usimamizi wa maoni" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPI band — the page was previously just one card with these counts
            buried in a subtitle; surface them so the queue has a hierarchy. */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminKpi label="In queue" sw="Kwenye foleni" value={items.length} delta="awaiting review" deltaDir="flat" pulse={items.length > 0} />
          <AdminKpi label="Auto-hidden" sw="Zimefichwa" value={hidden} delta="held by the filter" deltaDir="flat" />
          <AdminKpi label="Reported" sw="Zimeripotiwa" value={reported} delta="visible · flagged" deltaDir="flat" />
        </div>
        <AdminCard title="Review queue" sw="Foleni ya ukaguzi">
          <ModerationQueue items={items} />
        </AdminCard>
      </div>
    </>
  );
}
