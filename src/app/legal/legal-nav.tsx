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
        return (
          <Link
            key={n.href}
            href={n.href as never}
            aria-current={active ? "page" : undefined}
            className={`block px-3.5 py-2.5 transition-colors ${i > 0 ? "border-t border-border" : ""} ${
              active
                ? "bg-brand-500/10 border-l-2 border-l-brand-500"
                : "hover:bg-bg-overlay"
            }`}
          >
            <p className={`font-display text-[13px] font-semibold leading-tight ${active ? "text-brand-300" : "text-text"}`}>{n.label}</p>
          </Link>
        );
      })}
    </nav>
  );
}
