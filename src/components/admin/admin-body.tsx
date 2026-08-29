import * as React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * AdminBody + KpiGrid — the two wrappers every admin console page opens with.
 *
 * ⭐ CONSOLIDATION NOTE (stage 9b, 2026-08-21). `px-4 lg:px-6 py-5 space-y-4` was
 * typed out 45 times (44 page files plus <SkBody>'s own copy), and the KPI
 * band's grid 38 times across 34 files. Neither is a decision a page gets to
 * make: the console's gutter has to agree with <AdminPageHead>'s (`px-4 lg:px-6`,
 * admin-shell.tsx) or the heading and the content it heads sit on two different
 * left edges. Forty-five copies of one number is forty-five chances for that to
 * stop being true, and nothing in the build would have said so.
 *
 * ⛔ THIS IS PURE DRY — the rendered output is IDENTICAL, class for class. No
 * padding, gap or breakpoint changed here. A page whose wrapper genuinely
 * differs from the common string keeps its own <div>; it is not force-fitted
 * with an override, because an override is the copy coming back wearing a prop.
 *
 * ⛔ `gap-3` and the gutters are LITERAL and must stay literal. This project
 * overrides Tailwind's spacing scale (tailwind.config.ts:200-215) — `py-5` and
 * `gap-3` are read from that table, not from stock Tailwind, so "tidying" them
 * into what look like equivalent tokens silently doubles them. Same trap the
 * pager's `h-[44px]` note describes.
 */

/** The page body under <AdminPageHead>. Gutters match the head's exactly. */
export function AdminBody({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div className={cn("px-4 lg:px-6 py-5 space-y-4", className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * The KPI band. `cols` names a RESPONSIVE LADDER, not a column count, because
 * that is what the call sites actually vary: a four-tile band and a six-tile
 * band step differently, and two pages step at `md`/`sm` rather than `lg`.
 * Every entry below is a string that already ships — nothing new is introduced.
 */
export type KpiCols = "4" | "3" | "2" | "sm3" | "md3-lg4" | "lg3-xl6";

/* ⛔ Every entry here has at least one live caller (`4` is the default and is
 * implicit on 33 of the 38 bands). A ladder nobody uses is a ladder that will be
 * wrong when someone finally does — so do not add one speculatively.
 *
 * ⭐ `2` and `sm3` were ADDED 2026-08-29 (DG-A-10 part 2) and they are the opposite of
 * speculative: they are the two shapes that were BYPASSING this component. `/admin/audit`
 * hand-wrote `grid grid-cols-1 sm:grid-cols-3 gap-3` under a comment claiming it was "the
 * kit AdminKpi grid, consistent with every other admin screen", and `/admin/compliance`
 * hand-wrote `grid grid-cols-2 gap-2` for a 2×2 inside a card.
 * ⛔ NEITHER WAS A DEFECT TO SWEEP AWAY. A 3-tile band that stacks at 390 and a 2×2 that
 * never steps are deliberate, and forcing them onto `4`/`3` would have restyled two live
 * pages under cover of a consistency fix — 3 tiles becoming 2-up-plus-an-orphan at 390, and
 * a 2×2 in a card spreading to 4-across at `lg`. The ladder was missing the rungs, not the
 * pages missing the ladder. Adopting them is pixel-identical, verified by the emitted class
 * list (`twMerge` lets a call site's `gap-2` override the default `gap-3`). */
const KPI_COLS: Record<KpiCols, string> = {
  "4":        "grid-cols-2 lg:grid-cols-4",                // the console default — 33 bands
  "3":        "grid-cols-2 lg:grid-cols-3",                // config · moderation · objections
  "2":        "grid-cols-2",                               // compliance — a 2×2 INSIDE a card, no step
  "sm3":      "grid-cols-1 sm:grid-cols-3",                // audit — 3 tiles, stacked at 390
  "md3-lg4":  "grid-cols-2 md:grid-cols-3 lg:grid-cols-4", // /admin overview
  "lg3-xl6":  "grid-cols-2 lg:grid-cols-3 xl:grid-cols-6", // reports
};

export function KpiGrid({
  cols = "4",
  children,
  className,
  ...rest
}: {
  cols?: KpiCols;
  children: ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div className={cn("grid", KPI_COLS[cols], "gap-3", className)} {...rest}>
      {children}
    </div>
  );
}
