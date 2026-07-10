/**
 * ScrollX — the one horizontal-scroll container primitive.
 *
 * Wraps wide content (tables, step-chains, chart rows) that scrolls sideways
 * on narrow viewports. Per WCAG 2.1.1 + the axe `scrollable-region-focusable`
 * rule, a region a sighted user can scroll must also be reachable by keyboard:
 * so the wrapper is `tabIndex=0` with a visible focus ring, and — per the
 * WAI-ARIA scrollable-region pattern — a named `role="region"` so screen-reader
 * users can find and enter it.
 *
 * This replaces the copy-pasted
 *   `overflow-x-auto focus-visible:outline … tabIndex role aria-label`
 * blocks that were scattered across finance/reports/etc. — one source now.
 *
 * Server component (a plain div) so it drops into server-rendered pages.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function ScrollX({
  label,
  className,
  children,
  ...rest
}: {
  /** Accessible name for the scrollable region (screen-reader + focus target). */
  label: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "aria-label" | "tabIndex">) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "overflow-x-auto rounded-md",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--brand-400)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
