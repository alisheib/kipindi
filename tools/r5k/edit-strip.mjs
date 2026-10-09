import { edit } from "./edit-lib.mjs";
edit("src/components/positions/pnl-summary-strip.tsx", [
  [`import { formatTzsAbs, formatTzsSigned } from "@/lib/utils";
`, `import { formatTzsAbs, formatTzsSigned } from "@/lib/utils";

/**
 * THE STRIP'S CLASSES, IN ONE PLACE (round 5 of the visual pass, follow-up R5-K, 2026-10-09) — the strip below and its
 * loading ghost (\`app/positions/positions-ghost.tsx\`) read these strings, so the ghost's cells are the strip's cells: the
 * same auto-fit grid, the same label, figure and sub-line type, wrapping where the strip's do. The ghost drew a fixed
 * 2-then-4-column grid of 10px and 24px bars under a 12px header bar and no rule: on a phone the strip is ONE column of
 * four cells (158px minimum) and landed 251–265px taller than its ghost (S/r5k/m-positions.mts).
 * ⛔ Classes only: the inline styles (the rule's margin, the cells' left edge, the grid's columns) stay where they are.
 */
export const PNL_STRIP = {
  head: "flex items-center justify-between gap-3",
  live: "inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.08em] text-text-subtle",
  cell: "pl-3.5 pt-0.5",
  label: "m-0 font-mono text-micro font-semibold uppercase eyebrow text-text-subtle",
  value: "mt-[7px] font-mono text-[19px] font-bold tabular-nums leading-[1.1]",
  sub: "mt-1.5 font-mono text-[10.5px] tabular-nums text-text-muted",
  winRow: "mt-1.5 flex items-center gap-2.5",
  winValue: "m-0 font-mono text-[19px] font-bold tabular-nums leading-[1.1] text-text",
} as const;
`],
  [`      <div className="flex items-center justify-between gap-3">
        <span className="gilt-eyebrow">{t.yourStanding}</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.08em] text-text-subtle">
`, `      <div className={PNL_STRIP.head}>
        <span className="gilt-eyebrow">{t.yourStanding}</span>
        <span className={PNL_STRIP.live}>
`],
  [`        <div className="pl-3.5 pt-0.5" style={{ borderLeft: "1px solid color-mix(in oklab, var(--border) 60%, transparent)" }}>
          <p className="m-0 font-mono text-micro font-semibold uppercase eyebrow text-text-subtle">{t.winRate}</p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <NeedleDial rate={winRate} />
            <p className="m-0 font-mono text-[19px] font-bold tabular-nums leading-[1.1] text-text">{winRate}%</p>
          </div>
          <p className="mt-1.5 font-mono text-[10.5px] tabular-nums text-text-muted">{t.ofSettled}</p>
`, `        <div className={PNL_STRIP.cell} style={{ borderLeft: "1px solid color-mix(in oklab, var(--border) 60%, transparent)" }}>
          <p className={PNL_STRIP.label}>{t.winRate}</p>
          <div className={PNL_STRIP.winRow}>
            <NeedleDial rate={winRate} />
            <p className={PNL_STRIP.winValue}>{winRate}%</p>
          </div>
          <p className={PNL_STRIP.sub}>{t.ofSettled}</p>
`],
  [`    <div className="pl-3.5 pt-0.5" style={{ borderLeft: "1px solid color-mix(in oklab, var(--border) 60%, transparent)" }}>
      <p className="m-0 font-mono text-micro font-semibold uppercase eyebrow text-text-subtle">{label}</p>
      <p className={\`mt-[7px] font-mono text-[19px] font-bold tabular-nums leading-[1.1] \${valueClass}\`}>{value}</p>
      <p className="mt-1.5 font-mono text-[10.5px] tabular-nums text-text-muted">{sub}</p>
`, `    <div className={PNL_STRIP.cell} style={{ borderLeft: "1px solid color-mix(in oklab, var(--border) 60%, transparent)" }}>
      <p className={PNL_STRIP.label}>{label}</p>
      <p className={\`\${PNL_STRIP.value} \${valueClass}\`}>{value}</p>
      <p className={PNL_STRIP.sub}>{sub}</p>
`],
]);
