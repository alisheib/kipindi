"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { useT } from "@/lib/i18n";
import type { ProposalsState } from "@/lib/server/proposals-config";

/**
 * NavMore — the overflow menu, in two places.
 *
 * `variant="bar"` (default) is the top-bar menu: at `lg` (1024–1279px) the primary nav shows the
 * core links inline and folds the rest behind this "More ▾", so no primary destination is hidden
 * on tablets/small laptops (IA review R1). At `xl` those items render inline and this is hidden.
 *
 * `variant="rail"` is the bottom rail's FIFTH SLOT (batch 3, kit §2). It shares this component
 * rather than growing a second one, so `More` behaves identically in both places — the same
 * outside-click, the same Escape, the same close-on-navigate. What differs is only geometry and
 * which way the panel opens: the rail is pinned to the bottom edge, so its panel opens UPWARD.
 */
export function NavMore({
  items,
  label,
  variant = "bar",
  active,
}: {
  items: readonly { href: string; label: string; proposalsBadge?: ProposalsState }[];
  label: string;
  variant?: "bar" | "rail";
  /** Rail only: `More` reads as current when the page behind it is one of its own. */
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { t } = useT();

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  const isRail = variant === "rail";
  const anyActive = active ?? items.some((it) => pathname.startsWith(it.href));

  if (isRail) {
    return (
      <div ref={ref} className="relative flex flex-1">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="kp-rail__item"
          data-on={anyActive ? "1" : undefined}
        >
          <span className="kp-rail__pip">
            <I.menu s={20} />
          </span>
          <span className="kp-rail__label">{label}</span>
          {/* ⭐ DG-P-11 (2026-08-30) — THE ONLY CURRENT-LOCATION SIGNAL FOR ~10 ROUTES, AND IT WAS
              SILENT. This trigger paints `data-on` when any destination behind it is the current
              page, and that paint had NO ARIA VOICE — the two "More" triggers were the last 2 of
              the tree's 10 live active-paint hooks with none. ⛔ `aria-current="page"` is
              forbidden here IN WRITING, twice (globals.css's `.kp-navlink` block and the note
              below): the trigger is a menu button, not a page, so claiming it would be a lie to a
              screen reader. A translated `sr-only` statement says the true thing instead — the
              shipped precedent is `notifications-panel.tsx`. It sits BEFORE the chevron on the bar
              twin so the accessible name never interleaves with a decorative glyph. */}
          {anyActive && <span className="sr-only">{t.nav.currentSection}</span>}
        </button>
        {open && (
          <div
            role="menu"
            /* Opens UPWARD — the rail is pinned to the bottom edge, so a downward panel would
               render off-screen entirely. `right-2` keeps it inside the viewport at 360. */
            className="absolute bottom-[calc(100%+8px)] right-2 z-[50] min-w-[190px] rounded-modal border border-border-strong bg-bg-elevated p-1 shadow-overlay"
          >
            {items.map((it) => {
              const a = pathname.startsWith(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href as never}
                  role="menuitem"
                  aria-current={a ? "page" : undefined}
                  /* 44px rows — this is the phone, where the floor is not negotiable. */
                  className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-[13.5px] transition-colors hover:bg-bg-overlay"
                  style={{
                    color: a ? "var(--text)" : "var(--text-subtle)",
                    fontWeight: a ? 600 : 500,
                    background: a ? "var(--pill-active)" : "transparent",
                  }}
                >
                  {it.label}
                  {/* DG-P-11 — the rail branch accepted `proposalsBadge` in its props and threw
                      it away, so the same destination read "Propose & earn · Coming soon" on a
                      laptop and a bare "Propose" on a phone. Same flag, both variants. */}
                  {it.proposalsBadge && (
                    <ProposalsStateBadge state={it.proposalsBadge} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" className="ml-auto" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        // ⛔ DG-P-01 — this trigger sat beside the nav links, looked like them, and was hover-dead
        // for the same reason: its colour and background were inline, which no `:hover` can beat.
        // `.kp-navlink` now owns that paint (globals.css) and `data-active` states the "one of my
        // items is the current page" fact that `aria-current="page"` cannot honestly carry on a
        // menu button. `--pill-active` remains the ONE active treatment across header, rail and
        // this menu — it is just declared in CSS now instead of here.
        data-active={anyActive ? "" : undefined}
        className="kp-navlink inline-flex items-center gap-1 whitespace-nowrap"
        style={{
          // 44px — the tap floor, matching every other destination in the bar. This was 7px of
          // vertical padding on a 13.5px line, i.e. ~33px, on the primary nav of a money product.
          minHeight: 44,
          padding: "0 var(--sp-3)",
          borderRadius: "var(--r-sm)",
          fontSize: 13.5,
          fontWeight: anyActive ? 600 : 500,
        }}
      >
        <span className="capitalize">{label}</span>
        {anyActive && <span className="sr-only">{t.nav.currentSection}</span>}
        <I.chevronDown s={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-[50] min-w-[190px] rounded-modal border border-border-strong bg-bg-elevated/95 p-1 backdrop-blur-xl shadow-overlay"
        >
          {items.map((it) => {
            const active = pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href as never}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors hover:bg-bg-overlay"
                style={{ color: active ? "var(--text)" : "var(--text-subtle)", fontWeight: active ? 600 : 500 }}
              >
                {it.label}
                {it.proposalsBadge && (
                  <ProposalsStateBadge state={it.proposalsBadge} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" className="ml-auto" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
