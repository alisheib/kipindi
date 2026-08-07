"use client";

/**
 * RefreshButton — re-fetch the current server-rendered admin grid without a full
 * page reload. Admin list pages are `dynamic = "force-dynamic"`, so a router
 * refresh re-runs their server data fetch and streams fresh rows in.
 *
 * Two shapes, one behaviour:
 *  - default (labelled): matches the `.btn btn-ghost btn-sm h-8` filter-row height
 *    so it sits flush beside Search/Clear.
 *  - `icon` : a square 40px control for tight page-head action rows.
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
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-bg-overlay text-text-muted transition-colors hover:border-border-strong hover:text-text disabled:opacity-60",
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
      className={cn("btn btn-ghost btn-sm h-8 inline-flex items-center gap-1.5", className)}
    >
      {pending ? <Spinner size={14} /> : <I.rotateCcw s={14} />}
      {label}
    </button>
  );
}
