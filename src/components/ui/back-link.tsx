"use client";

import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";

/**
 * BackLink — uses router.back() when the user navigated in-app,
 * falls back to `fallbackHref` on direct visits (no history).
 */
export function BackLink({
  fallbackHref,
  label,
}: {
  fallbackHref: string;
  label: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        // If there's real navigation history, go back.
        // window.history.length > 1 is true even on direct nav in some
        // browsers, so also check the referrer as a heuristic.
        if (window.history.length > 1 && document.referrer) {
          router.back();
        } else {
          router.push(fallbackHref as never);
        }
      }}
      className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.16em] text-text-subtle hover:text-text transition-all hover:-translate-x-0.5 group"
    >
      <I.chevronLeft s={11} />
      {label}
    </button>
  );
}
