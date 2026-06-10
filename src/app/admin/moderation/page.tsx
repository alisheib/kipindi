import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { listForModeration } from "@/lib/server/comments-store";
import { ModerationQueue } from "./moderation-client";

export const metadata = { title: "Admin · Comment moderation" };
export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const items = await listForModeration();
  const reported = items.filter((i) => !i.hidden).length;
  const hidden = items.filter((i) => i.hidden).length;
  return (
    <>
      <AdminPageHead title="Comment moderation" sw="Usimamizi wa maoni" period={false} />
      <AdminCard
        title="Review queue"
        sw={`${items.length} item${items.length === 1 ? "" : "s"} · ${hidden} auto-hidden · ${reported} reported`}
      >
        <ModerationQueue items={items} />
      </AdminCard>
    </>
  );
}
