import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * Skeleton shaped like the real page — 4 KPIs, the propose form, the queue table — so the
 * layout does not jump when the data lands. The table is wide (8 columns) and the mobile
 * width scrolls, which the skeleton has to mirror or the first paint reflows.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="Up & Down · AI proposals" sw="Mapendekezo ya AI" />
      <SkBody>
        <SkKpiRow count={4} />
        <SkFormCard fields={3} titleW="w-40" />
        <SkTableCard cols={8} rows={5} minWidth={980} />
      </SkBody>
    </>
  );
}
