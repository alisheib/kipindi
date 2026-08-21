import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Poll detail" sw="Maelezo ya kura" />
      <AdminBody className="animate-pulse">
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
            {/* ⚠️ HEIGHT IS A LITERAL, not `h-9` — spacing is overridden
                (tailwind.config.ts:200-215) so `h-9` drew 64px for a 40px pill. The WIDTH
                beside it was already an arbitrary literal; only the height was trapped. */}
            <div className="h-[40px] w-[120px] rounded-pill bg-bg-overlay" />
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
              {/* ⚠️ LITERALS, not `h-10` (80px on the overridden scale) — option field bars. */}
              <div className="h-[44px] w-full rounded-md bg-bg-overlay" />
              <div className="h-[44px] w-full rounded-md bg-bg-overlay" />
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
      </AdminBody>
    </>
  );
}
