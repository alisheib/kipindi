import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard, SkKpiRow } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Cohorts" sw="Vikundi" period={false} />
      <SkBody>
        <SkKpiRow count={4} />
        <SkCard lines={3} titleW="w-40" />
        <SkCard lines={4} titleW="w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <SkCard lines={4} />
          <SkCard lines={4} />
          <SkCard lines={4} />
        </div>
        <SkCard lines={2} titleW="w-52" />
      </SkBody>
    </>
  );
}
