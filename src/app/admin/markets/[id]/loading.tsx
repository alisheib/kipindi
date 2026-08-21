import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard, SkKpiRow, SkFormCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Market predictors"
        sw="Watabiri wa soko"
        /* ⚠️ LITERAL, not `h-8` (48px on the overridden scale) — the admin header action is
           40px, so an `h-8` ghost cost an 8px shift on every load. */
        actions={<SkChip className="h-[40px] w-24" />}
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
