import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkBar, SkCard, SkRowCard } from "@/components/admin/admin-skeletons";

/**
 * /admin/roles loader. The matrix is SIX editable roles (STAFF_ROLES minus the
 * Owner, which bypasses the table) × SEVEN domains, so the skeleton draws six
 * row-cards of seven rows with two toggles each — the real geometry, not a
 * stack of thin lines that would collapse ~240px per card on swap.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="Role permissions" sw="Ruhusa za wajibu" />
      <SkBody>
        {/* "What this is" note */}
        <SkCard lines={3} titleW="w-28" />
        {/* Matrix intro + Reset to defaults */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="max-w-2xl flex-1 space-y-1.5">
            <SkBar className="h-2.5 w-full" />
            <SkBar className="h-2.5 w-full" />
            <SkBar className="h-2.5 w-3/4" />
          </div>
          {/* 40px == --h-control-sm (btn-sm), not `h-8`. */}
          <SkBar className="h-[40px] w-36 rounded-md" />
        </div>
        {/* One card per editable role — 7 domains, See + Do per domain */}
        {Array.from({ length: 6 }).map((_, i) => (
          <SkRowCard key={i} rows={7} rowH={50} controls={2} titleW="w-28" />
        ))}
      </SkBody>
    </>
  );
}
