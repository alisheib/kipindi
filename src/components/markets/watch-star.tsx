"use client";

/**
 * WatchStar (F3) — the ⭐ follow toggle on a market.
 *
 * Optimistic (mirrors VoteControl): flip immediately, reconcile with the server,
 * roll back + toast on failure. Signed-out users are sent to login rather than
 * silently failing. Used inside clickable cards, so it stops propagation.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toggleWatchAction } from "@/app/markets/actions";

export function WatchStar({
  marketId,
  initial,
  signedIn,
  size = 16,
  className,
}: {
  marketId: string;
  initial: boolean;
  signedIn: boolean;
  size?: number;
  className?: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  function click(e: React.MouseEvent) {
    // Cards navigate on click — never let the star trigger that.
    e.stopPropagation();
    e.preventDefault();
    if (!signedIn) {
      router.push(`/auth/login?next=/markets/${marketId}` as never);
      return;
    }
    const prev = on;
    setOn(!prev); // optimistic
    haptics.select();
    start(async () => {
      const r = await toggleWatchAction(marketId);
      if (!r.ok) {
        setOn(prev); // roll back
        toast({ title: t.watchlist.toggleFailed, variant: "danger" });
        return;
      }
      setOn(r.watching);
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      aria-pressed={on}
      aria-label={on ? t.watchlist.unfollow : t.watchlist.follow}
      title={on ? t.watchlist.unfollow : t.watchlist.follow}
      className={cn(
        // ≥40px tap target (WCAG) even though the glyph is small.
        "inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        // GOLD DISCIPLINE: gold is reserved for earned-money moments. Following a
        // market is not money — the active star is royal/brand, never gilt.
        on ? "text-brand-300 hover:text-brand-200" : "text-text-subtle hover:text-text",
        pending && "opacity-60",
        className,
      )}
    >
      <I.star s={size} className={on ? "fill-current" : undefined} />
    </button>
  );
}
