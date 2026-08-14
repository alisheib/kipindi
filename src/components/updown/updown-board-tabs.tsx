"use client";

/**
 * UD-13 · the board's asset/duration tabs — a FILTER, not a page reload.
 *
 * 🔴 WHAT THIS REPLACES. The tabs were plain `<Link>`s, so every filter click was a
 * full route navigation: the live board — tape, heartbeat, three cards, a countdown
 * mid-tick — fell to `loading.tsx`'s shimmer skeleton and re-entered from scratch,
 * with the countdown restarting its `--:--` pre-hydration tick. A tab that blanks
 * the screen it filters reads as a reload, not a tab.
 *
 * The navigation now runs inside `startTransition`, so Next keeps the CURRENT board
 * visible while the new one streams in; this shell dims it (`data-pending` +
 * `aria-busy`, the kit's disabled-opacity token — no new CSS) and the active chip
 * moves instantly off the pending href. `loading.tsx` still covers cold entries.
 *
 * ⚠️ Real `<Link>`s are kept underneath: modifier/middle clicks and new-tab
 * behaviour fall through to the browser (the same cases NavProgress ignores —
 * UD-10); only a plain left-click becomes a transition.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FilterPill } from "@/components/ui/filter-pill";

export type BoardTab = { key: string; href: string; label: string };

export function UpDownBoardTabs({
  assetTabs,
  durationTabs,
  activeAssetKey,
  activeDuration,
  assetsLabel,
  durationsLabel,
  minLabel,
  children,
}: {
  assetTabs: BoardTab[];
  durationTabs: { d: number; href: string }[];
  activeAssetKey: string | null;
  activeDuration: number | null;
  assetsLabel: string;
  durationsLabel: string;
  minLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const go = (hrefTarget: string) => (e: React.MouseEvent) => {
    // Let the browser own anything that is not a plain left-click (new tab etc.).
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setPendingHref(hrefTarget);
    startTransition(() => router.push(hrefTarget));
  };

  // Optimistic `aria-current`: the chip moves the moment the tap lands, off the
  // pending href — the board follows when the data does.
  const assetOn = (tab: BoardTab) =>
    pendingHref != null ? pendingHref.includes(`asset=${tab.key}`) : tab.key === activeAssetKey;
  const durationOn = (t: { d: number; href: string }) =>
    pendingHref != null ? pendingHref === t.href : t.d === activeDuration;

  return (
    <>
      {/* ── Asset tabs (primary) ─────────────────────────────────────────────────────────
          🔴 THESE WERE THE WORST DIVERGENCE IN THE PRODUCT — measured on production
          2026-08-14, not argued: `h-9` reads like 36px and renders **64px** on this repo's
          overridden spacing scale, every one of the five was OUTLINED, and all four paint
          values were written inline at the call site. They are the pill now, like every other
          filter rail. ⛔ No count: `BoardAsset` carries none and the board reads rounds for the
          ACTIVE chain only, so a number here would be invented — A-5 forbids that, and
          `durations.length` is a count of chains wearing the costume of a count of games. */}
      <nav aria-label={assetsLabel} data-filter-rail className="mt-4 flex flex-wrap gap-2">
        {assetTabs.map((tab) => (
          <FilterPill
            key={tab.key}
            href={tab.href}
            label={tab.label}
            on={assetOn(tab)}
            semantics="tab"
            /* ⚠️ `go()` needs the RAW MouseEvent — it reads `e.button` and the four modifier
               keys to hand new-tab clicks back to the browser. The primitive passes it through
               untouched for exactly this. */
            onClick={go(tab.href)}
          />
        ))}
      </nav>

      {/* ── Duration tabs (secondary — deliberately quieter) ──────────────────────────────
          ⭐ The hierarchy is REAL and it survives: the asset is the subject, the duration
          refines it. It is now expressed as `rank="secondary"` — a decision made once, inside
          the primitive — rather than as four inline style values per control. Consistency
          means one control language, not one volume.
          These were the only genuinely sub-floor controls in the product at **40px** (`h-7`);
          they are 44px now, so this is a hit-area fix as well as a shape one. */}
      {durationTabs.length > 0 && (
        <nav aria-label={durationsLabel} data-filter-rail className="mt-2 flex flex-wrap gap-1.5">
          {durationTabs.map((tItem) => (
            <FilterPill
              key={tItem.d}
              href={tItem.href}
              label={`${tItem.d} ${minLabel}`}
              on={durationOn(tItem)}
              semantics="tab"
              rank="secondary"
              onClick={go(tItem.href)}
            />
          ))}
        </nav>
      )}

      {/* The board itself — kept on screen, dimmed while the filtered one streams in. */}
      <div
        data-pending={isPending || undefined}
        aria-busy={isPending || undefined}
        style={{
          opacity: isPending ? "var(--state-disabled-opacity)" : undefined,
          transition: "opacity var(--t-base) var(--m-glide)",
        }}
      >
        {children}
      </div>
    </>
  );
}
