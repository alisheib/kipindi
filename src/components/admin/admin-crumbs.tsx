"use client";

/**
 * AdminCrumbs — the breadcrumb trail, and it has to know the route from the CLIENT.
 *
 * 🔴 THE FOURTH INSTANCE OF `E-70`, FOUND BY ENUMERATING THE POPULATION FROM SOURCE RATHER THAN
 * FROM A LIST. `app/admin/layout.tsx` computed `crumbsFromPath(h.get("x-pathname"))` — in the
 * LAYOUT — and in the App Router a layout is NOT re-executed on a client-side soft navigation.
 * Every admin page shares that one layout and the whole sidebar is `<Link>`s, so clicking from
 * `/admin/players` to `/admin/markets` left the trail reading **Admin / Players** on the markets
 * page. It is the same defect Ali reported on the legal nav, on the one control an officer uses
 * to know where they are, across 47 admin pages.
 *
 * ⭐ AND THE FIX IS THE PATTERN THIS DIRECTORY ALREADY ESTABLISHED. `admin-sidebar-nav.tsx` has
 * done exactly this since it was written — `usePathname()` for the truth, the server's value as
 * `fallbackKey` for the first paint. So the sidebar highlight was already correct while the
 * breadcrumb beside it was frozen: two controls answering the same question, one from the client
 * and one from a stale header, and only the wrong one looked authoritative.
 *
 * ⚠️ `fallback` is the server-rendered trail. It is used only until hydration (and if
 * `usePathname()` ever returns null), so the first paint is never empty and never wrong for the
 * page that was actually requested — that render IS a hard load, where the header is correct.
 */

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { crumbsFromPath } from "./admin-nav-groups";

/**
 * ⭐ A RECORD PAGE'S OWN NAME FOR ITS LAST CRUMB (the U47b-2 review's NIT: the live campaign page's trail read the raw `cmp_…`
 * id). The trail is derived from the URL on the client (above), so the page cannot hand its name down through a layout; it
 * registers it here, keyed by the LAST URL SEGMENT (decoded — what the trail itself has), and the trail shows it in the id's
 * place. Until a page registers one — and for a campaign that is not there — the section's neutral word stands
 * (`ID_CRUMB`), never the raw id. The name is an officer's own typed text, and the trail marks it so (`data-operator-text`).
 */
const crumbNames = new Map<string, string>();
const crumbListeners = new Set<() => void>();
const emitCrumbNames = (): void => { for (const l of crumbListeners) l(); };
const subscribeCrumbNames = (l: () => void): (() => void) => { crumbListeners.add(l); return () => { crumbListeners.delete(l); }; };
const lastSegmentOf = (pathname: string): string => {
  const last = pathname.split("/").filter(Boolean).at(-1) ?? "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};

/** Renders nothing: a record page's name, for the trail, while the page is mounted. */
export function AdminCrumbLabel({ segment, label }: { segment: string; label: string }) {
  useEffect(() => {
    crumbNames.set(segment, label);
    emitCrumbNames();
    return () => {
      if (crumbNames.get(segment) === label) {
        crumbNames.delete(segment);
        emitCrumbNames();
      }
    };
  }, [segment, label]);
  return null;
}

export function AdminCrumbs({ fallback }: { fallback: string[] }) {
  const pathname = usePathname();
  // ⛔ The next line is `red:layout-staleness`'s anchor, VERBATIM (`the-crumbs-component-trusts-its-prop`): the pathname decides.
  const crumbs = pathname ? crumbsFromPath(pathname) : fallback;
  const named = useSyncExternalStore(subscribeCrumbNames, () => (pathname ? crumbNames.get(lastSegmentOf(pathname)) ?? null : null), () => null);
  const trail = named !== null && crumbs.length > 1 ? [...crumbs.slice(0, -1), named] : crumbs;
  return (
    /* ⚠️ CLIPPING — DO NOT SIMPLIFY THIS BOX MODEL. `nav` carries `min-w-0 overflow-hidden` and
       each crumb carries `truncate`, but the per-crumb WRAPPER in between must carry `min-w-0`
       too or `truncate` can never engage: measured at 768, "Admin / Up & Down / Proposals" ran
       34px past the nav in all three locales. `shrink-0` on the separator keeps "/" from being
       the thing that collapses. Preserved verbatim from `admin-shell.tsx`. */
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2 text-body-sm text-text-tertiary min-w-0 overflow-hidden">
      {trail.map((c, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={i} className="flex items-center gap-2 min-w-0">
            {i > 0 && <span className="text-text-tertiary opacity-50 shrink-0">/</span>}
            <span className={isLast ? "font-semibold text-text truncate" : "truncate"} data-operator-text={isLast && named !== null ? "label" : undefined}>{c}</span>
          </span>
        );
      })}
    </nav>
  );
}
