import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkChip, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Up & Down · Rounds" sw="Raundi za Juu na Chini" />
      <SkBody>
        <SkKpiRow count={4} />
        {/* ⚠️ The "Rounds past their deadline" card above the rail is CONDITIONAL on
            `stuckAll.length > 0` — an alarm, normally absent, so no ghost for it. */}
        {/* Filter rail (page:194-226) — it had NO ghost, and it is the tallest thing on
            this page after the table: `Chip size="lg"` inside a `min-h-[44px]` Link, once
            for "All assets", once per enabled asset, once for "Any outcome" and once per
            `OUTCOMES` member (page:31 — UP · DOWN · VOID · PENDING), then an `ml-auto`
            count. Six links are structural; the THREE asset chips are the only guessed
            number on this surface, because the asset list is data — see the same guess
            at updown/loading.tsx's assets table, and correct both together. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkChip key={i} className="h-[44px] w-[88px]" />
          ))}
          <SkBar className="h-[14px] w-[96px] ml-auto" />
        </div>
        {/* Rounds — a titled `p-0` card. EIGHT columns and `min-w-[1020px]`, re-counted
            at page:250-257; the ghost said seven at 880. `rows={20}` = `PER_PAGE`, and
            `pager` because rounds accumulate one per chain per interval — the page's own
            KPI reads "of {total}" and its comment cites 1,402 of them. */}
        <SkTableCard cols={8} rows={20} minWidth={1020} pager />
        {/* Trailing footnote — a bare `<p className="text-body-sm leading-[1.55]">`
            (page:341), not a card: 13px × 1.55 ≈ 20px a line, three lines. */}
        {/* ⛔ NO `max-w-[720px]` / `max-w-[680px]` HERE, AND THE RATCHET WAS RIGHT TO REFUSE
            THEM. `test:measure` forbids a hand-typed page width ≥500px (§B7 — every page states
            its width ONCE, from the measure tokens), and these two tripped it. ⭐ But the
            interesting half is that they were also WRONG AS A GHOST: the paragraph they stand in
            for (`page.tsx`, the trailing footnote) declares no `max-w` at all, so it fills the
            console and wraps — meaning a 720px cap drew the skeleton NARROWER than the thing it
            replaces, on a 1480 board. That is this row's own defect class, introduced while
            fixing this row. Two full-width lines and a short last one is both the honest shape
            and the one that needs no hand-typed width; 420 stays because a ragged final line is
            the point of the ghost, and it is under the ratchet's floor. */}
        <div className="space-y-1">
          <SkBar className="h-[20px] w-full" />
          <SkBar className="h-[20px] w-full" />
          <SkBar className="h-[20px] w-full max-w-[420px]" />
        </div>
      </SkBody>
    </>
  );
}
