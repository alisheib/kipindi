"use client";

/**
 * RefreshButton — re-fetch the current server-rendered admin grid without a full
 * page reload. Admin list pages are `dynamic = "force-dynamic"`, so a router
 * refresh re-runs their server data fetch and streams fresh rows in.
 *
 * Two shapes, one behaviour:
 *  - default (labelled): `btn-xs` — the dense MOUSE-ONLY admin rung
 *    (`--h-control-xs`, 32px), the documented §A2 exception for admin filter rows,
 *    so it sits flush beside the `btn-xs` Search/Clear pair.
 *    ⚠️ This used to read "matches the `.btn btn-ghost btn-sm h-8` filter-row height".
 *    That was false twice over: `.btn-sm` wins on source order (`@tailwind utilities`
 *    is emitted at globals.css:19, `.btn-sm` comes after it), so the control shipped at
 *    `--h-control-sm`, and the `h-8` it named is 48px on this repo's scale, not 32px.
 *  - `icon` : a square 40px control for tight page-head action rows.
 *    ⛔ 40px is written as a LITERAL, never `h-10`/`h-7`: `theme.extend.spacing` is
 *    overridden (tailwind.config.ts:200-215), so `h-10` is 80px — which is what this
 *    variant actually shipped until 2026-08-21, while this comment claimed 40.
 * The glyph spins while the refresh transition is pending.
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function RefreshButton({
  variant = "label",
  label = "Refresh",
  sw = "Onyesha upya",
  className,
}: {
  variant?: "label" | "icon";
  label?: string;
  /** Swahili tooltip — kept for i18n parity with the rest of the admin. */
  sw?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const onClick = () => start(() => router.refresh());

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={label}
        title={`${label} · ${sw}`}
        className={cn(
          /* ⛔ LITERALS, NOT SCALE TOKENS. `theme.extend.spacing` is overridden
             (tailwind.config.ts:200-215): `h-10 w-10` is 80×80px, so this control
             shipped at double the 40px its own doc comment promised. 40px == --tap-min.
             Same reasoning as filter-pill.tsx's `min-h-[44px]`. */
          "inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-md border border-border bg-bg-overlay text-text-muted transition-colors hover:border-border-strong hover:text-text disabled:opacity-60",
          className,
        )}
      >
        {/* M5 — a glyph never wears bespoke motion; in-flight is the kit Spinner. */}
        {pending ? <Spinner size={15} /> : <I.rotateCcw s={15} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={`${label} · ${sw}`}
      /* `btn-xs` owns the height (--h-control-xs). ⛔ Never re-add a per-call `h-*`
         here: the old `btn-sm h-8` was inert (source order) AND `h-8` is 48px on this
         repo's overridden scale — globals.css:864-866 created btn-xs to end this idiom. */
      className={cn("btn btn-ghost btn-xs inline-flex items-center gap-1.5", className)}
    >
      {pending ? <Spinner size={14} /> : <I.rotateCcw s={14} />}
      {label}
    </button>
  );
}
