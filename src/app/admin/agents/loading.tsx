import { AdminPageHead } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * What is coming, in the console's own skeleton kit: the head, the section rail, the four-tile
 * KPI band, then the cards the Applications tab renders — a queue table and the refunds table.
 * The roster and settings tabs share the same head + KPI band; their first card is a table or a
 * form of the same height class, so one ghost serves all three without lying about the shape.
 */
export default function AdminAgentsLoading() {
  return (
    <>
      <AdminPageHead title="Agents" sw="Mawakala" />
      <AdminBody>
        <div className="h-[44px] w-80 rounded-md bg-bg-overlay kp-shimmer-track" aria-hidden />
        <SkKpiRow count={4} />
        <SkTableCard cols={6} rows={3} minWidth={720} />
        <SkTableCard cols={6} rows={2} minWidth={720} />
      </AdminBody>
    </>
  );
}
