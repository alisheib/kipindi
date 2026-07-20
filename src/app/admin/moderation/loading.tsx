import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkChip, SkKpiRow } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Comment moderation" sw="Usimamizi wa maoni" period={false} />
      <SkBody>
        {/* KPI band (being added to the page) */}
        <SkKpiRow count={3} cols="grid-cols-2 lg:grid-cols-3" />

        {/* Review queue card — composed by hand (SkCard takes no children):
            title bar, sort bar, then comment-row skeletons. */}
        <div className="rounded-lg glass-panel p-4 space-y-4">
          <SkBar className="h-3.5 w-40" />
          <SkBar className="h-8 w-full max-w-[320px]" />
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-3 border-b border-dashed border-border-subtle last:border-b-0"
              >
                <div className="h-8 w-8 rounded-pill bg-bg-overlay shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkBar className="h-3 w-1/3" />
                  <SkBar className="h-3 w-full" />
                </div>
                <SkChip className="h-7 w-16" />
                <SkChip className="h-7 w-16" />
              </div>
            ))}
          </div>
        </div>
      </SkBody>
    </>
  );
}
