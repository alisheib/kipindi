import { cn } from "@/lib/utils";

/**
 * PageContainer — the ONE way a page states its width.   DESIGN_AUTHORITY B7
 *
 * Before this existed, width was a hand-typed string (`mx-auto max-w-[1280px]
 * px-3 lg:px-6 py-6`) repeated ~60 times. It had drifted into eight page tiers
 * where three were documented, 41 of 88 route files carried no cap at all, and a
 * page and its own `loading.tsx` could disagree (the Up & Down round was 1232 vs
 * 1080 — a 152px jump on every load, invisible to every test we had).
 *
 * Three properties make that class of bug unrepeatable:
 *
 *   1. `tier` is a UNION TYPE, so an invented width is a compile error. There is
 *      no `width={1240}` escape hatch on purpose — a number here is how the drift
 *      started, and a prop that takes one always eventually takes a wrong one.
 *   2. It emits `data-measure`, so `scripts/responsive-audit.mjs` can find the
 *      content column at runtime and assert an UPPER bound on it. The audit used
 *      to check only `scrollWidth <= clientWidth` — a lower bound — which is
 *      exactly why a 2,400px-wide admin form passed QA with a green tick.
 *   3. It owns the page padding and never `space-y-*`. Pages keep their own
 *      vertical rhythm via `className`, so migrating a call site is a pure
 *      rename with no visual delta.
 *   4. It CANNOT render a `<main>`. The shell owns that landmark (see `as` below).
 *      Added 2026-08-22, when the DOM — not the source — showed that six of eight
 *      production routes were rendering two `<main>` elements, one nested in the
 *      other, because this component defaulted to `as="main"` and 44 files under
 *      `src/app` hand-wrote one besides.
 *
 * Server-component safe (no "use client") — it renders a plain element, and the
 * overwhelming majority of route files that need it are server components.
 *
 * The numbers live in globals.css, not here. See B7.
 */

/** The five general page tiers, plus the one named exception. */
export type MeasureTier =
  /** Admin console content column. The 216px sidebar sits OUTSIDE this. */
  | "console"
  /** Card grids / boards. Matches the top-bar + footer chrome exactly. */
  | "board"
  /** Detail, content and profile pages. */
  | "reading"
  /** Forms. */
  | "form"
  /** Receipts and single-outcome confirmations. */
  | "receipt"
  /**
   * The auth split-pane ONLY — not a general tier. Named rather than folded into
   * `board` because widening the shell to 1280 would stretch the brand side-rail
   * to 640px, which is a design change to the first screen a new player sees, not
   * width hygiene. Naming it means it can never be re-typed as a bare `max-w-6xl`.
   */
  | "auth";

const TIER_CLASS: Record<MeasureTier, string> = {
  console: "max-w-console",
  board:   "max-w-board",
  reading: "max-w-reading",
  form:    "max-w-form",
  receipt: "max-w-receipt",
  auth:    "max-w-auth",
};

type Props = {
  tier: MeasureTier;
  /**
   * ⛔ `"main"` IS NOT IN THIS UNION, AND ITS ABSENCE IS THE GUARD.
   *
   * `AppShell` renders `<main id="main-content">` in the ROOT layout, so EVERY
   * route already sits inside a `<main>` — admin, auth and legal included. A page
   * that adds its own produces nested `main`: invalid HTML, two "main content"
   * landmarks for a screen reader to choose between, and a skip-link that resolves
   * to the outer one while the content begins inside the inner one.
   *
   * This used to default to `"main"`, which is how six of eight production routes
   * came to render two (measured 2026-08-22). The fix is a COMPILE ERROR rather
   * than a changed default, for the same reason `tier` is a union and not a
   * number: the shell owns the landmark, so a page asking for one is *always*
   * wrong, and a default can be overridden back by anyone who thinks they are the
   * exception. Nobody is the exception. Need a landmark? Fix the shell.
   */
  as?: "div" | "section" | "article";
  /**
   * `page` (default) = the house padding `px-3 lg:px-6 py-6`.
   * `none` = the container centres and caps but adds no padding — for full-bleed
   * compositions (the home hero) that need the measure without the gutters.
   */
  pad?: "page" | "none";
  /** Vertical rhythm and anything else. Must NOT contain width or padding — the
   *  measure guard fails the build if it does. */
  className?: string;
  id?: string;
  children: React.ReactNode;
};

export function PageContainer({ tier, as = "div", pad = "page", className, id, children }: Props) {
  const Tag = as;
  return (
    <Tag
      id={id}
      data-measure={tier}
      className={cn(
        "mx-auto w-full",
        TIER_CLASS[tier],
        pad === "page" && "px-3 lg:px-6 py-6",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
