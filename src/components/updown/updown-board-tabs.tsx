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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
      {/* ── Asset tabs (primary) ─────────────────────────────────────────── */}
      <nav aria-label={assetsLabel} className="mt-4 flex flex-wrap gap-2">
        {assetTabs.map((tab) => {
          const on = assetOn(tab);
          return (
            <Link key={tab.key} href={tab.href as never} onClick={go(tab.href)}
                  aria-current={on ? "page" : undefined}
                  className="inline-flex h-9 items-center rounded-md px-4 text-[13.5px] font-semibold transition-colors"
                  style={{
                    border: `1px solid ${on ? "var(--brand-500)" : "var(--border)"}`,
                    background: on ? "var(--pill-active)" : "color-mix(in oklab, var(--bg-elevated) 60%, transparent)",
                    color: on ? "var(--text)" : "var(--text-muted)",
                    textDecoration: "none",
                  }}>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Duration tabs (secondary — deliberately quieter) ─────────────── */}
      {durationTabs.length > 0 && (
        <nav aria-label={durationsLabel} className="mt-2 flex flex-wrap gap-1.5">
          {durationTabs.map((tItem) => {
            const on = durationOn(tItem);
            return (
              <Link key={tItem.d} href={tItem.href as never} onClick={go(tItem.href)}
                    aria-current={on ? "page" : undefined}
                    className="inline-flex h-7 items-center rounded-md px-3 font-mono text-[11.5px] transition-colors"
                    style={{
                      border: `1px solid ${on ? "var(--border-strong)" : "transparent"}`,
                      background: on ? "var(--bg-inset)" : "transparent",
                      color: on ? "var(--text)" : "var(--text-subtle)",
                      textDecoration: "none",
                    }}>
                {tItem.d} {minLabel}
              </Link>
            );
          })}
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
