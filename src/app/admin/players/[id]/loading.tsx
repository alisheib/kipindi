import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkCard, SkKpiRow } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Player profile"
        sw="Wasifu wa mchezaji"
        actions={
          <>
            {/* ⚠️ LITERALS, not `h-8` (48px on the overridden scale). These ghost
                export-player-button.tsx and reset-password-button.tsx, both 40px live. */}
            <SkChip className="h-[40px] w-20" />
            <SkChip className="h-[40px] w-24" />
          </>
        }
      />
      <SkBody>
        <SkCard lines={3} titleW="w-48" />
        <SkKpiRow count={4} />
        {/* ⭐ THE SECTION RAIL'S GHOST (DG-S-07, 2026-08-31) — §B7 rule 3, and it was MISSING
            entirely, not merely wrong. The rail is the kit `<Tabs variant="line">` now, whose
            options are `h-[44px]` (§A2 · §K rule 7c) plus the rail's own 1px bottom border =
            45px, the same literal `roles/loading.tsx:26` already carries. Before this the tab
            card ghosted as a plain `SkCard`, so every load of this page dropped the panel
            below by the rail's full height once the real rail painted.
            ⚠️ A LITERAL, not `h-11` — `theme.extend.spacing` is overridden, so a scale class
            here is roughly double what it reads as. */}
        <div className="glass-panel p-0">
          <div className="h-[45px] border-b border-border" />
        </div>
        <SkCard lines={6} titleW="w-56" />
        <SkCard lines={3} titleW="w-40" />
      </SkBody>
    </>
  );
}
