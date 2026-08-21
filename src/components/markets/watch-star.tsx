"use client";

/**
 * WatchStar (F3) — the ⭐ follow toggle on a market.
 *
 * Optimistic (mirrors VoteControl): flip immediately, reconcile with the server,
 * roll back + toast on failure. Signed-out users are sent to login rather than
 * silently failing. Used inside clickable cards, so it stops propagation.
 */
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
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
  const pathname = usePathname();
  const { toast } = useToast();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  // B-24 — one market can render several stars on one page (card + detail
  // header). They each held private state, so toggling one left its twins
  // stale until a full refresh. A window event keeps every star for the same
  // market in agreement the moment the server confirms.
  useEffect(() => {
    const sync = (e: Event) => {
      const d = (e as CustomEvent<{ marketId: string; watching: boolean }>).detail;
      if (d?.marketId === marketId) setOn(d.watching);
    };
    window.addEventListener("50pick:watch", sync);
    return () => window.removeEventListener("50pick:watch", sync);
  }, [marketId]);

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
    // No haptic. Watching a market is a preference, not a physical event — the kit's
    // haptic rule is contact / passing true / coming to rest, NEVER encouragement or
    // attention-pulling. The star's own state change is the feedback.
    start(async () => {
      // B-12 — a flaky network mid-toggle must roll back, not crash the page.
      let r: Awaited<ReturnType<typeof toggleWatchAction>>;
      try {
        r = await toggleWatchAction(marketId);
      } catch {
        r = { ok: false, watching: prev, error: "network" };
      }
      if (!r.ok) {
        setOn(prev); // roll back
        // B-24 — the session lapsed mid-visit: `signedIn` was true at render,
        // but the server says otherwise. "Couldn't update" would be a lie the
        // player can't act on; the login redirect (with the way back) is.
        if (r.error === "auth") {
          router.push(`/auth/login?next=${encodeURIComponent(pathname || `/markets/${marketId}`)}` as never);
          return;
        }
        // FEEDBACK LAW (DESIGN_AUTHORITY §F) — warning severity, not error. The player
        // can fix this (tap again) and no money moved, so it takes the FACTUAL register:
        // `danger` paints red, announces `role="alert"` and fires the heavy `error`
        // haptic — an alarm for a star that did not save. The body carries the next step,
        // which "Couldn't update your watchlist." never did.
        toast({ title: t.watchlist.toggleFailed, description: t.watchlist.toggleFailedBody, variant: "factual" });
        return;
      }
      setOn(r.watching);
      window.dispatchEvent(new CustomEvent("50pick:watch", { detail: { marketId, watching: r.watching } }));
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
        // 40px tap target (--tap-min, DA §A2) even though the glyph is small.
        // ⚠️ ARBITRARY LITERAL: the spacing scale is OVERRIDDEN
        // (tailwind.config.ts:200-215), so `h-10 w-10` — what this line used to
        // say — is 80×80px, not 40. ⛔ Never a scale token here.
        "inline-flex h-[40px] w-[40px] items-center justify-center rounded-md transition-colors",
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
