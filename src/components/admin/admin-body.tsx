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
export type KpiCols = "4" | "3" | "md3-lg4" | "lg3-xl6";

/* ⛔ Every entry here has at least one live caller (`4` is the default and is
 * implicit on 33 of the 38 bands). A ladder nobody uses is a ladder that will be
 * wrong when someone finally does — so do not add one speculatively. */
const KPI_COLS: Record<KpiCols, string> = {
  "4":        "grid-cols-2 lg:grid-cols-4",                // the console default — 33 bands
  "3":        "grid-cols-2 lg:grid-cols-3",                // config · moderation · objections
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
