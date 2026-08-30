import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkChip } from "@/components/admin/admin-skeletons";

/**
 * /admin/ai-polls/[id] loader.
 *
 * ⭐ This file was the PATTERN the skeleton kit was extracted from, and it was the one
 * admin loader of 47 that never adopted it: it hand-rolled `<AdminBody className=
 * "animate-pulse">` and its own `rounded bg-bg-overlay` divs, where `<SkBody>` IS that
 * composition and `<SkBar>` IS that div. §K5 — extend the kit, never fork it. It also
 * carried twelve inverted spacing keys, more than any other loader in the population.
 *
 * ⚠️ Every card on this page is an UNTITLED `<AdminCard>` whose heading is a
 * `font-mono text-micro uppercase eyebrow ... mb-2` `<p>` INSIDE the body — 10px on a
 * 14px line box, not the 32px `AdminCard title/sw` block — so these are composed by hand
 * rather than through `SkCard`, which would draw the wrong header.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Poll detail"
        sw="Maelezo ya kura"
        /* ⛔ The page passes an action and this passed none, so a "Back to polls" pill
           materialised out of nothing on every load. It is a `btn btn-ghost btn-sm
           rounded-pill` — 40px, `--h-control-sm`. */
        actions={<SkChip className="h-[40px] w-[128px]" />}
      />
      <SkBody>
        {/* Header card — chip row, question, meta line, and the 40×120 action pill. */}
        <div className="glass-panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <SkBar className="h-[21px] w-[100px] rounded-pill" />
                <SkBar className="h-3 w-[64px]" />
                <SkBar className="h-3 w-[80px]" />
              </div>
              <SkBar className="h-5 w-3/4" />
              <SkBar className="h-[14px] w-1/2" />
            </div>
            {/* ⚠️ HEIGHT IS A LITERAL, not `h-9` — spacing is overridden
                (tailwind.config.ts:200-215) so `h-9` drew 64px for a 40px pill. */}
            <SkBar className="h-[40px] w-[120px] rounded-pill" />
          </div>
        </div>

        {/* Resolution criterion + options — the page's own `lg:grid-cols-2 gap-4`. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-panel p-4">
            <SkBar className="h-[14px] w-[112px] mb-2" />
            <div className="space-y-2">
              <SkBar className="h-3 w-full" />
              <SkBar className="h-3 w-4/5" />
            </div>
            <div className="mt-3 pt-3 border-t border-border/60">
              <SkBar className="h-3 w-[96px] mb-2" />
              <SkBar className="h-[14px] w-36" />
            </div>
          </div>
          <div className="glass-panel p-4">
            <SkBar className="h-[14px] w-[96px] mb-2" />
            <div className="space-y-2">
              {/* ⚠️ LITERALS, not `h-10` (80px on the overridden scale) — option field bars. */}
              <SkBar className="h-[44px] w-full rounded-md" />
              <SkBar className="h-[44px] w-full rounded-md" />
            </div>
          </div>
        </div>

        {/* Quality assessment. */}
        <div className="glass-panel p-4">
          <SkBar className="h-[14px] w-[112px] mb-2" />
          <SkBar className="h-4 w-48 mb-2" />
          <SkBar className="h-1.5 w-full rounded-pill" />
        </div>

        {/* ⚠️ "Filter reasons" is CONDITIONAL on `poll.filterReasons.length > 0` and
            "Raw AI response" on a VALIDATION_FAILED/FILTERED state — neither is ghosted,
            on the same rule the other loaders follow. */}

        {/* Sources — an UNTITLED card that had NO ghost at all. */}
        <div className="glass-panel p-4">
          <SkBar className="h-[14px] w-[64px] mb-2" />
          <div className="space-y-2">
            <SkBar className="h-3 w-full" />
            <SkBar className="h-3 w-full" />
            <SkBar className="h-3 w-2/3" />
          </div>
        </div>

        {/* AI reasoning — likewise unghosted until now. */}
        <div className="glass-panel p-4">
          <SkBar className="h-[14px] w-[96px] mb-2" />
          <div className="space-y-2">
            <SkBar className="h-3 w-full" />
            <SkBar className="h-3 w-5/6" />
          </div>
        </div>

        {/* Metadata — an 8-item `grid-cols-2 lg:grid-cols-4` of label/value pairs. */}
        <div className="glass-panel p-4">
          <SkBar className="h-[14px] w-[80px] mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <SkBar className="h-[10px] w-[64px] mb-1.5" />
                <SkBar className="h-3 w-[96px]" />
              </div>
            ))}
          </div>
        </div>
      </SkBody>
    </>
  );
}
