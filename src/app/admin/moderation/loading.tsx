import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkChip, SkKpiRow } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Comment moderation" sw="Usimamizi wa maoni" />
      <SkBody>
        {/* KPI band (being added to the page) */}
        <SkKpiRow count={3} cols="grid-cols-2 lg:grid-cols-3" />

        {/* Review queue card — composed by hand (SkCard takes no children):
            title bar, sort bar, then comment-row skeletons. */}
        <div className="rounded-lg glass-panel p-4 space-y-4">
          <SkBar className="h-3.5 w-40" />
          {/* ⚠️ LITERAL, not `h-8` — spacing is overridden (tailwind.config.ts:200-215) so
              `h-8` drew 48px for an admin search input that is now 32px (--h-control-xs). */}
          <SkBar className="h-[32px] w-full max-w-[320px]" />
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-3 border-b border-dashed border-border-subtle last:border-b-0"
              >
                {/* ⚠️ LITERALS, not `h-8 w-8` (48px on the overridden scale) — an avatar disc
                    on a comment row. */}
                <div className="h-[32px] w-[32px] rounded-pill bg-bg-overlay shrink-0" />
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
