const { edit } = require('./ed1.cjs');
edit('src/components/ui/toast.tsx', [
  [`    <div
      role="region"
      aria-label={t.common.notifications}
      className="pointer-events-none fixed inset-x-0 top-0 z-[1800] flex flex-col items-center gap-2 px-3 pt-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end sm:pt-0"
    >`, `    <div
      role="region"
      aria-label={t.common.notifications}
      // ⭐ \`data-toaster\` is the journey's hook (round 4 of the visual pass, 2026-10-09, edges E34): in the journey the
      // stack hangs under the header instead of over its controls (globals.css, \`:root:has(#kp-journey-shell)
      // [data-toaster]\`). An attribute, not a class: the classic shell's fixed-overlay census (\`qa:classic-shell-parity\`)
      // names an overlay by its test id, role, label and classes, so a classic viewer's overlays read as they did.
      data-toaster=""
      className="pointer-events-none fixed inset-x-0 top-0 z-[1800] flex flex-col items-center gap-2 px-3 pt-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end sm:pt-0"
    >`],
]);
