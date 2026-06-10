import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Poll detail" sw="Maelezo ya kura" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4 animate-pulse">
        {/* Header card skeleton */}
        <AdminCard>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-[21px] w-[100px] rounded-pill bg-bg-overlay" />
                <div className="h-3 w-16 rounded bg-bg-overlay" />
                <div className="h-3 w-20 rounded bg-bg-overlay" />
              </div>
              <div className="h-5 w-3/4 rounded bg-bg-overlay" />
              <div className="h-3.5 w-1/2 rounded bg-bg-overlay" />
            </div>
            <div className="h-9 w-[120px] rounded-pill bg-bg-overlay" />
          </div>
        </AdminCard>

        {/* Resolution + options skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AdminCard>
            <div className="h-3 w-28 rounded bg-bg-overlay mb-3" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-bg-overlay" />
              <div className="h-3 w-4/5 rounded bg-bg-overlay" />
            </div>
            <div className="mt-3 pt-3 border-t border-border/60">
              <div className="h-3 w-24 rounded bg-bg-overlay mb-2" />
              <div className="h-3.5 w-36 rounded bg-bg-overlay" />
            </div>
          </AdminCard>
          <AdminCard>
            <div className="h-3 w-24 rounded bg-bg-overlay mb-3" />
            <div className="space-y-2">
              <div className="h-10 w-full rounded-md bg-bg-overlay" />
              <div className="h-10 w-full rounded-md bg-bg-overlay" />
            </div>
          </AdminCard>
        </div>

        {/* Quality skeleton */}
        <AdminCard>
          <div className="h-3 w-28 rounded bg-bg-overlay mb-3" />
          <div className="h-4 w-48 rounded bg-bg-overlay mb-2" />
          <div className="h-1.5 w-full rounded-pill bg-bg-overlay" />
        </AdminCard>

        {/* Metadata skeleton */}
        <AdminCard>
          <div className="h-3 w-20 rounded bg-bg-overlay mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="h-2.5 w-16 rounded bg-bg-overlay mb-1.5" />
                <div className="h-3 w-24 rounded bg-bg-overlay" />
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
