import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkFormCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="New market" sw="Soko jipya" period={false} />
      {/* Page body is `px-4 lg:px-6 py-5` (no space-y-4) wrapping ONE card. */}
      <div className="px-4 lg:px-6 py-5 animate-pulse">
        <SkFormCard fields={6} titleW="w-40" />
      </div>
    </>
  );
}
