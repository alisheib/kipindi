import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

/**
 * ⛔ SEVEN CATEGORY CARDS, NOT THREE. `sources/page.tsx:73` is
 * `grouped.map(...)` over `grouped = CATEGORIES.map(...)`, and `CATEGORIES`
 * (sources/page.tsx:15) is `["sports","macro","weather","crypto","culture","tech","other"]`
 * — SEVEN, rendered UNCONDITIONALLY: a category with zero sources still renders its card
 * and an empty-state row. Three ghosts for seven cards was ~1,000px, the largest single
 * shortfall in the console.
 * ⚠️ The 7 is hard-written because `CATEGORIES` is a module-local const in a server page;
 * importing it here would pull `seedDefaultSources` and the source registry into the
 * loader's bundle. sources/page.tsx:15 IS the source of truth — change both together.
 */
const CATEGORY_CARDS = 7;

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Sources & categories"
        sw="Vyanzo na aina"
        /* ⚠️ LITERAL, not `h-8` (48px on the overridden scale) — source-controls.tsx's live
           pill is a `btn btn-primary btn-sm`, 40px (`--h-control-sm`). `w-[112px]`, not
           `w-28`: 28 is not in the spacing override, so it keeps stock 112 while `w-12`
           paints 128 — the inversion `test:spacing-scale` ratchets. Same px, no hit. */
        actions={<SkChip className="h-[40px] w-[112px]" />}
      />
      <SkBody>
        <SkKpiRow count={4} />
        {/* Categories · global toggle — a titled padded card (page:51). */}
        <SkCard lines={2} titleW="w-48" />
        {/* Per-category source tables — titled `padding="p-0"` cards (page:76). */}
        {Array.from({ length: CATEGORY_CARDS }).map((_, i) => (
          <SkTableCard key={i} cols={5} rows={3} minWidth={560} headW="w-[112px]" />
        ))}
        {/* "Why source-gating matters" — page:149, an UNTITLED info card that had no
            ghost at all: ~140px appeared out of nothing on every load. */}
        <SkCard lines={4} title={false} />
      </SkBody>
    </>
  );
}
