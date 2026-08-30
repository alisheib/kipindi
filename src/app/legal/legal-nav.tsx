"use client";

/**
 * LegalNav — the four-link legal sidebar, and the ONE thing about it that has to be a client
 * component: which link is CURRENT.
 *
 * 🔴 ALI, 2026-08-27: *"In the Legal and Responsible Gambling page, there is a Terms grid. No
 * matter where we click, the highlighted tab is always Responsible Gambling."*
 *
 * ⛔ THE REPORT'S WORDING IS NOT QUITE THE BUG, AND THE DIFFERENCE IS THE DIAGNOSIS. It is not
 * "always Responsible Gambling" — it is **always whatever page you arrived on**. `legal/layout.tsx`
 * read the active route from the `x-pathname` REQUEST HEADER (set by `proxy.ts`), and in the App
 * Router a layout is **NOT re-executed on a client-side soft navigation**: it is preserved across
 * route changes. All four links in this nav live under `/legal`, so clicking one is a soft
 * navigation *inside* the very layout that computed the highlight — only the page segment
 * re-renders, and `pathname` still holds the route of the last HARD load. Ali reaches this
 * section through the responsible-gambling link, so for him the stuck tab was always that one.
 * Confirmed by landing directly on `/legal/terms`, where the stuck tab becomes Terms.
 *
 * ⭐ THIS IS `E-70`'S SHAPE FOR THE THIRD TIME. `admin-shell.tsx` and `avatar-menu.tsx` both carry
 * the same note, INCLUDING the warning that two sessions failed to reproduce it because they used
 * `page.goto()` — a HARD load, which re-renders the layout correctly. **A probe must click a real
 * `<Link>`.**
 *
 * ⛔ AND THE FIX IS NOT `force-dynamic`. A layout is not re-executed on a soft navigation *at
 * all*, so making it dynamic changes nothing and costs every legal page its static render. The
 * fix is to ask the CLIENT where it is, because on a soft navigation the client is the only party
 * that knows. `usePathname()` is re-read on every route change by construction.
 *
 * ⚠️ The labels are still resolved on the SERVER and passed in. Nothing about locale belongs in
 * the client here — only the current route does, and this component is deliberately the smallest
 * thing that can know it.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

export type LegalNavItem = { href: string; label: string };

export function LegalNav({ items, ariaLabel }: { items: LegalNavItem[]; ariaLabel: string }) {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label={ariaLabel} className="rounded-xl glass-panel overflow-hidden">
      {items.map((n, i) => {
        // Same predicate the layout used, so the only thing that changed is WHERE the
        // pathname comes from. `startsWith` keeps a future `/legal/terms/#section` current.
        const active = pathname.startsWith(n.href);
        /* ⛔ THE TWO NOTES BELOW SIT ABOVE THE `return`, NOT BETWEEN THE JSX ATTRIBUTES, AND
           THAT IS NOT A STYLE CHOICE. `scripts/tap-target.test.mts` lexes a JSX open tag with
           its own local `decomment` (:83) and a quote-stack reader (:96). A block comment
           between attributes survives that stripper here, and the DOUBLE QUOTES inside the
           first note then pushed a string onto the lexer's stack — so this `<Link>` never
           closed, the gate counted a RUNAWAY and reported itself BLIND on the tag (§3.1),
           which on a tap-floor gate means the floor was unproven on 16 rendered instances.
           `tsc` is perfectly happy with it, which is why nothing else caught it.
           ⛔ And they may not sit between `return (` and the element either — that does not
           parse. Above the `return` is the only place both readers accept. */
        /* ⭐ DG-P-11 · §B9 / §0a — THE THIRD HOME FOR THE ACTIVE FILL, IN A THIRD SPELLING.
           This was `bg-brand-500/10`: `--brand-500` is `oklch(63% 0.180 262)`, so the fill
           rendered `oklch(63% 0.180 262 / 0.10)` against `--pill-active`'s
           `oklch(40% 0.12 262 / 0.35)` — whose own line in `globals.css` reads "one active
           filter/tab fill everywhere". A different lightness, a different chroma and 3.5x
           the alpha, for the one job that token owns.
           ⛔ DG-A-18 deleted the other two homes on 2026-08-29 — `admin-sidebar-nav.tsx`
           (`oklch(40% 0.12 268 / 0.5)`) and `admin-mobile-nav.tsx` (`bg-bg-inset
           text-royal-300`) — and BOTH tombstones record why no guard caught them:
           `ui-consistency`'s `hardcoded-pill-active` rule matches the token's LITERAL TEXT.
           A Tailwind alpha utility is simply a third evasion of the same rule. Same fix,
           same token, inline exactly as those two fixes are.
           ⛔ THE LEFT RULE STAYS, AND THAT IS THE WHOLE POINT. "Adopt the top bar's
           vocabulary" does NOT mean copy it wholesale: the bar's non-colour signal is a
           500→600 weight step (`.kp-navlink`) and the rail's is the pip's shape, and this
           sidebar has NEITHER — its label is `font-semibold` in both states. `border-l-2`
           is this vertical rail's only non-colour signal, and §A4 says colour is never the
           only one. A sidebar is not a horizontal rail; it gets the shared FILL and keeps
           its own edge. Deleting the left rule to "match the bar" would turn a compliant
           surface into an §A4 violation.
           ⚠️ The fill will not animate under `transition-colors` (an inline `background`
           shorthand is not `background-color`), the same mechanism noted at DG-P-01. It is
           acceptable here for the same reason it is in the two admin navs: every link in
           this nav is a route change that re-renders the item, so there is nothing to
           animate between. */
        /* ⭐ DG-P-07 · §A2 — `py-2.5` WAS 36.25px, AND `2.5` IS NOT ON THIS REPO'S SCALE.
           Re-derived: `tailwind.config.ts:204-219` sits under `theme.extend` (`:47-48`), so
           it REPLACES only the keys it lists — 0.5/1/1.5/2/3/4/5/6/7/8/9/10/11/12. `2.5`
           and `3.5` are NOT listed and keep Tailwind's stock 10px and 14px, which is why
           `py-2.5` (10px) was SMALLER than `py-2` (12px) here. With `text-[13px]` ×
           `leading-tight` 1.25 = 16.25px, item 1 measured 10 + 16.25 + 10 = 36.25px and
           items 2–4 added the 1px `border-t` for 37.25px. §A2's floor is 40 (`--tap-min`),
           44 preferred on a phone — and at 390 this aside is NOT hidden: `layout.tsx:28` is
           `grid-cols-1 lg:grid-cols-[240px_1fr]`, so it stacks full-width above the
           article. 4 items × 4 legal routes = 16 rendered instances.
           ⭐ `py-3` = 16px on the OVERRIDDEN scale ⇒ 16 + 16.25 + 16 = 48.25px (49.25px with
           the border), which lands on the `--h-control-lg` rung (globals.css:295). Chosen
           over the minimal `py-2` (40.25/41.25px) because 41 is a number nobody decided —
           `scripts/tap-target.test.mts:31-33` writes that down as law — and over
           `min-h-[44px]` because this element is `display: block`, so a min-height would
           leave the label at the top with 17.75px of dead space beneath it. The padding IS
           the height here, and it now reads off the real scale.
           ⚠️ §A5: a Swahili label ~35–40% longer wraps to two lines at 240px, giving
           16 + 32.5 + 16 = 64.5px — over the floor, not under it. Growth only.
           ⚠️ `px-3.5` (14px) is the SAME off-scale key on the horizontal axis and is left
           alone deliberately: this row is the tap floor, and a width change is a different
           decision with a different blast radius. Reported, not smuggled. */
        return (
          <Link
            key={n.href}
            href={n.href as never}
            aria-current={active ? "page" : undefined}
            style={active ? { background: "var(--pill-active)" } : undefined}
            className={`block px-3.5 py-3 transition-colors ${i > 0 ? "border-t border-border" : ""} ${
              active ? "border-l-2 border-l-brand-500" : "hover:bg-bg-overlay"
            }`}
          >
            {/* ⭐ DG-P-11 — THE ACTIVE INK WAS `--brand-300`, WHICH NAVIGATION ALREADY SPENT ON
                A DIFFERENT MEANING. `.kp-navlink[data-accent]` paints the PRODUCT LINE (Up &
                Down) with exactly that token, per `top-app-bar.tsx`'s note that "shape now has
                exactly one meaning… its distinction moves to a 5px gilt dot plus `--brand-300`
                ink". One ink, two meanings, on two navs a player can see on one screen (§0a).
                Every sibling states "current" with `--text`: `.kp-navlink[aria-current="page"]`,
                `admin-sidebar-nav.tsx`, `admin-mobile-nav.tsx`, `nav-more.tsx`.
                ⛔ The INACTIVE ink is deliberately left at `--text` and not dimmed to
                `--text-subtle` to match those siblings: that is taste with no law behind it and
                it is a DARKENING at 13px, which §A1 will not take without re-running the gate.
                Active and inactive already differ by a fill plus a 2px bar, so §A4 holds.
                ⚠️ `--text` is `oklch(98%)` against `--brand-300`'s `oklch(82%)`, so this RAISES
                contrast — but §A1 measures on the ACTUAL surface, so `npm run test:contrast`
                and `npm run qa:contrast-rendered` still owe an answer for `--text` on
                `--pill-active` over `.glass-panel`. */}
            <p className="font-display text-[13px] font-semibold leading-tight text-text">{n.label}</p>
          </Link>
        );
      })}
    </nav>
  );
}
