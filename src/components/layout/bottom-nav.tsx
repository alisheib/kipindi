"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { NavMore } from "@/components/layout/nav-more";
import type { ProposalsState } from "@/lib/server/proposals-config";

/**
 * THE BOTTOM RAIL — round-2 kit §2 / COMPONENTS §14, rebuilt in batch 3.
 *
 * FIVE SLOTS: Markets · Up & Down · Live · Results · More.
 *
 * ── 🔴 WHAT WAS WRONG, AND ALL THREE WERE STRUCTURAL ─────────────────────────────────────────
 * 1. **`Results` and `Top` were unreachable on a phone.** The guest rail carried four items and
 *    the authed rail five, and neither included Results — not in an overflow, simply absent. A
 *    whole nav destination existed only on desktop.
 * 2. **`Sign in` sat in the rail as a destination.** Auth is an ACTION, and it now lives in the
 *    header at every width, which is what frees the fifth slot. The rail is destinations only.
 * 3. **The rail said "current" with `--aqua-300`** — `oklch(72% 0.11 195 / 0.18)` and a matching
 *    glow, both hand-typed. The desktop bar said it with `--pill-active`. Two active languages for
 *    one idea, and one of them a literal. **Active is now `--pill-active` on the pip plus a
 *    `--text` label, the same sentence the desktop bar speaks.** Aqua is gone from navigation.
 *
 * ── AND THE SURFACE ITSELF ────────────────────────────────────────────────────────────────────
 * It was a floating inset capsule on a 78% `--bg-elevated` mix with a 16px backdrop blur — the
 * same see-through problem as the header, on the highest chrome on a phone. The kit specifies
 * `--panel`, a 1px `--border` top, `--shadow-overlay-up` and safe-area padding: an opaque bar
 * anchored to the bottom edge. `app-shell`'s `<main>` already reserves
 * `pb-[calc(88px+env(safe-area-inset-bottom))]` for it.
 *
 * ⭐ AND IT NO LONGER COLLIDES WITH THE NEEDLE. The fidget's badge overlapped the rail's FIRST
 * SLOT at 360 in the batch-2 baseline frames, and its `#hit` area is `pointer-events: auto` — so a
 * tap meant for Markets could grab the toy instead. The physics is vendored and do-not-edit; its
 * RESTING POSITION is not. See `needle-rest.css`, loaded beside this component's own layer.
 */
export function BottomNav({ isAuthed = false, proposalsState }: { isAuthed?: boolean; proposalsState: ProposalsState }) {
  const pathname = usePathname();
  const { t } = useT();

  /** The five destinations — identical for guest and player, because a destination does not
   *  depend on having an account. What changes is what `More` carries. */
  const items = [
    { href: "/markets", glyph: "markets" as const,    label: t.common.markets },
    { href: "/updown",  glyph: "trendingUp" as const, label: t.market.udTitle, accent: true },
    { href: "/live",    glyph: "bolt" as const,       label: t.nav.live },
    { href: "/results", glyph: "resolved" as const,   label: t.common.results },
  ];

  /** `More` carries the rest. Positions / Wallet / Top / Invite / Propose for a player; the
   *  public destinations for a visitor, who has no positions or wallet to reach. */
  /* ⭐ DG-P-11 — TWO DEFECTS, ONE LIST, AND BOTH ONLY VISIBLE WHEN THIS LIST IS READ BESIDE
     THE BAR'S (§0a: "which destinations live behind More" was answered in two places that
     disagreed).
     1. THE AUTHED BRANCH OMITTED /proposals, WHICH THE AUTHED TOP BAR CARRIES. `moreActive`
        below is the ONLY thing that can mark an overflow destination under 1024, and the four
        rail slots are Markets / Up & Down / Live / Results — so a signed-in player on a phone
        at /proposals, /proposals/[id] or /proposals/new had NOTHING marked anywhere on the
        page, while the same player on a laptop had the bar's `More` marked. Signing in also
        REMOVED a destination a guest could reach here, which is not a decision anyone made.
     2. THE GUEST BRANCH SHOWED /proposals UNCONDITIONALLY. `proposals-config.ts` states
        DISABLED as "every entry point is hidden; direct nav to /proposals* is redirected" —
        and every other entry point already obeys it (the top bar's `MORE_ITEMS`, the avatar
        menu, `public-footer.tsx`). This rail was the one that did not, so a visitor could be
        shown a door the operator had closed and be redirected on arrival.
     ⛔ NOT fixed by deleting /proposals from the top bar to make the two agree: that hides a
     live destination to buy a symmetry.
     ⛔ NOT fixed by a fifth rail SLOT either — the rail is five by design and the grid below
     is `repeat(5, 1fr)`. It goes behind `More`, where its three siblings already live. */
  const proposalsRow: { href: string; label: string; proposalsBadge?: ProposalsState }[] =
    proposalsState !== "DISABLED"
      ? [{ href: "/proposals", label: t.common.propose, proposalsBadge: proposalsState }]
      : [];
  const moreItems: { href: string; label: string; proposalsBadge?: ProposalsState }[] = isAuthed
    ? [
        { href: "/positions",      label: t.common.positions },
        { href: "/wallet",         label: t.nav.wallet },
        { href: "/leaderboard",    label: t.nav.leaderboard },
        { href: "/profile/invite", label: t.common.invite },
        ...proposalsRow,
      ]
    : [
        { href: "/leaderboard", label: t.nav.leaderboard },
        { href: "/fairness",    label: t.footer.resolutionAttestation },
        ...proposalsRow,
      ];

  const isActive = (href: string) => {
    if (href === "/markets") return pathname === "/" || pathname.startsWith("/markets");
    if (href === "/updown") return pathname.startsWith("/updown");
    if (href === "/results") return pathname.startsWith("/results");
    return pathname === href;
  };
  /** `More` reads as current when the page behind it is one of its own. */
  const moreActive = moreItems.some((m) => pathname.startsWith(m.href));

  return (
    <nav
      aria-label={t.nav.primary}
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 kp-rail"
      /* ⭐ THE NEEDLE COLLISION, FIXED AT THE MECHANISM THAT ALREADY EXISTED FOR IT.
         The fidget's badge overlapped this rail's FIRST SLOT at 360 in the batch-2 baseline
         frames, and its `#hit` area is `pointer-events: auto` — so a tap meant for Markets could
         grab the toy instead, on the primary navigation of a money product.
         `needle.tsx:200` already polls `[data-needle-keepout]` and feeds those rects to the
         engine as obstacles (the simulator supports interior/overlapping/enclosing ones and
         `test:needle` tortures them). It had ZERO consumers, so the feature existed and nothing
         used it. One attribute is the whole fix: no z-index change, and not one line of the
         vendored do-not-edit physics touched. */
      data-needle-keepout=""
    >
      <ul className="grid items-stretch" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {items.map((it) => {
          const on = isActive(it.href);
          const Ico = I[it.glyph];
          return (
            <li key={it.href} className="flex">
              <Link
                href={it.href as never}
                aria-label={it.label}
                aria-current={on ? "page" : undefined}
                className="kp-rail__item"
                data-on={on ? "1" : undefined}
              >
                {/* The 44×26 pip carries the active state — `--pill-active`, the same fill the
                    desktop bar uses behind a current destination. */}
                <span className="kp-rail__pip">
                  <Ico s={20} />
                  {/* The product-line dot, same 5px gilt mark as the desktop nav. */}
                  {it.accent && <span className="kp-rail__dot" aria-hidden />}
                </span>
                <span className="kp-rail__label">{it.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex">
          {/* `More` opens upward — it is the last slot on a bar pinned to the bottom edge. */}
          <NavMore
            items={moreItems}
            label={t.common.more}
            variant="rail"
            active={moreActive}
          />
        </li>
      </ul>
    </nav>
  );
}
