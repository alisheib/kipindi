import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard, SkKpiRow, SkFormCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Market predictors"
        sw="Watabiri wa soko"
        period={false}
        actions={<SkChip className="h-8 w-24" />}
      />
      <SkBody>
        {/* Market summary + probability bar */}
        <SkCard lines={5} titleW="w-2/3" />
        <SkKpiRow count={4} />
        {/* Filters */}
        <SkFormCard fields={3} />
        {/* Positions */}
        <SkTableCard cols={8} rows={10} minWidth={800} />
      </SkBody>
    </>
  );
}
