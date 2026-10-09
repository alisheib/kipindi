const { edit } = require('./ed1.cjs');
edit('src/components/layout/needle-drawer.tsx', [
  [`export function NeedleControlsDrawer({ variant = "menu-row" }: { variant?: "menu-row" | "hub-row" | "settings" }) {`,
   `export function NeedleControlsDrawer({ variant = "menu-row" }: { variant?: "menu-row" | "menu-item" | "hub-row" | "settings" }) {`],
  [`    ) : variant === "hub-row" ? (`, `    ) : variant === "menu-item" ? (
      /* ⭐ A ROW OF THE JOURNEY'S ACCOUNT MENU (round 4 of the visual pass, 2026-10-09, edges tiles 209 224 228 239 243
         247, E31). The classic menu draws the row above inside a \`px-2 py-2\` wrapper with its own \`px-2\`, so its mark
         stood 24px in where every row's glyph stands 16 (10–11px of ink further right), its label 11px right of theirs,
         and its chevron's ink 12px short of their right edge (INAKUJA's pill ends there). Here it wears the menu row's
         own geometry, \`Item\` in avatar-menu.tsx: \`px-3 py-2\` (16px · 12px), a 10px gap (\`gap-[10px]\`, the literal of
         the row's stock \`gap-2.5\`: the key is an inverted one on this scale, test:spacing-scale), the mark in the rows'
         15px glyph box, the label at body-sm 500. The 14px chevron's ink ends 4.6px inside its box (the path's x 15 of 24
         plus half its 2.2 stroke), so the box overhangs the edge by 4px (\`-mr-1\`) and the ink lands 0.6px from the
         rows' edge. A menu child, so it is a \`menuitem\` like every other row. The journey's menu alone (\`journey\`). */
      <button
        type="button"
        role="menuitem"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="w-full flex items-center gap-[10px] px-3 py-2 font-display text-body-sm font-medium text-text transition-colors hover:bg-bg-overlay text-left"
      >
        <span className={hidden ? "text-text-subtle" : "text-brand-300"}><NeedleMark size={15} /></span>
        <span className="flex-1">{t("The Needle", "Sindano", "指针玩具")}</span>
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-text-subtle">{shownLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="-mr-1 text-text-subtle"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    ) : variant === "hub-row" ? (`],
]);
