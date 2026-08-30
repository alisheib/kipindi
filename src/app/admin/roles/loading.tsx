import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkBar, SkCard, SkRowCard } from "@/components/admin/admin-skeletons";

/**
 * /admin/roles loader. The matrix is SIX editable roles (`EDITABLE_ROLES` =
 * `STAFF_ROLES` minus the Owner, src/lib/server/roles.ts:85) × SEVEN domains
 * (`ADMIN_DOMAINS`, roles.ts:62-70), so the skeleton draws six row-cards of seven rows
 * with two toggles each — the real geometry, not a stack of thin lines that would
 * collapse ~240px per card on swap.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="Role permissions" sw="Ruhusa za wajibu" />
      <SkBody>
        {/* "What this is" — an UNTITLED info card: its heading is a `<p>` INSIDE the
            body, not the AdminCard's own `title`. */}
        <SkCard lines={4} title={false} />
        {/* The Access / Reads tab rail — `<AdminCard padding="p-0">` around a `<nav>`
            whose links are `py-2.5 text-body-sm border-b-2`: 10 + 18 + 10 + 2, plus the
            nav's own 1px bottom border = 41px. It had NO ghost, so the whole matrix
            below it jumped up by 41 + the body's 20px rhythm on every load. */}
        <div className="glass-panel p-0">
          <div className="h-[41px] border-b border-border-subtle" />
        </div>
        {/* Matrix intro + "Reset to defaults" (roles-matrix.tsx:72-83). */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="max-w-2xl flex-1 space-y-1.5">
            <SkBar className="h-[10px] w-full" />
            <SkBar className="h-[10px] w-full" />
            <SkBar className="h-[10px] w-3/4" />
          </div>
          {/* 40px == --h-control-sm (btn-sm), not `h-8`. */}
          <SkBar className="h-[40px] w-36 rounded-md" />
        </div>
        {/* One card per editable role — 7 domains, See + Do per domain.
            ⛔ `rowH` is 58, not 50, and it is MEASURED: the real row is
            `rounded-md border px-3 py-2` (roles-matrix.tsx:93) = 12px of padding a side
            around a `text-body-sm` line (18) over a `text-micro` line (14), plus the
            1px border top and bottom — 12 + 32 + 12 + 2. Eight pixels × 7 rows × 6 cards
            is 336px of jump, and the kit's own doc at admin-skeletons.tsx says
            "measure it, don't guess". The call site had guessed.
            ⛔ `sw={false}`: this card's heading is a bare `<p className="font-display
            font-semibold text-body-sm mb-3">` with NO Swahili gloss — it is not an
            `AdminCard title/sw` header. */}
        {Array.from({ length: 6 }).map((_, i) => (
          <SkRowCard key={i} rows={7} rowH={58} controls={2} titleW="w-[112px]" sw={false} />
        ))}
      </SkBody>
    </>
  );
}
