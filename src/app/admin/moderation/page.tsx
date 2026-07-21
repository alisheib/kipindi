import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { listForModeration } from "@/lib/server/comments-store";
import { ModerationQueue } from "./moderation-client";

export const metadata = { title: "Admin · Comment moderation" };
export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  // A-5: a failed queue read must NOT show "the queue is clear" / all-zero counts
  // — a false "nothing to moderate". Show an explicit "couldn't load" instead.
  let failed = false;
  const items = await listForModeration().catch(() => { failed = true; return []; });
  const reported = items.filter((i) => !i.hidden).length;
  const hidden = items.filter((i) => i.hidden).length;
  return (
    <>
      <AdminPageHead title="Comment moderation" sw="Usimamizi wa maoni" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPI band — the page was previously just one card with these counts
            buried in a subtitle; surface them so the queue has a hierarchy. */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminKpi label="In queue" sw="Kwenye foleni" value={failed ? "" : items.length} unavailable={failed} delta="awaiting review" deltaDir="flat" pulse={!failed && items.length > 0} />
          <AdminKpi label="Auto-hidden" sw="Zimefichwa" value={failed ? "" : hidden} unavailable={failed} delta="held by the filter" deltaDir="flat" />
          <AdminKpi label="Reported" sw="Zimeripotiwa" value={failed ? "" : reported} unavailable={failed} delta="visible · flagged" deltaDir="flat" />
        </div>
        <AdminCard title="Review queue" sw="Foleni ya ukaguzi">
          {failed ? <AdminLoadError what="the moderation queue" /> : <ModerationQueue items={items} />}
        </AdminCard>
      </div>
    </>
  );
}
