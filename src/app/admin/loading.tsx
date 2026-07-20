import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkBlock } from "@/components/admin/admin-skeletons";

export default function AdminLoading() {
  return (
    <>
      <AdminPageHead title="Overview" sw="Muhtasari" period={false} />
      <SkBody>
        {/* §A — KPI strip */}
        <SkKpiRow count={4} cols="grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />
        {/* §B — Money flow + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
          <SkBlock height={240} />
          <SkCard lines={7} />
        </div>
        {/* §C — Secondary tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SkCard lines={3} />
          <SkCard lines={3} />
          <SkCard lines={3} />
          <SkCard lines={3} />
        </div>
      </SkBody>
    </>
  );
}
