"use client";

/**
 * PageLoader — the one shared route-loading skeleton, so every player page shows
 * a consistent, professional loader (BrandSpinner + locale-aware label + shimmer
 * rows) instead of an empty container. Width matches the page's tier so the real
 * content swaps in with no layout jump. Used by each route's loading.tsx.
 *
 * Its words are the client dictionary's (`useT`), in the language the root layout hands the provider — the kp-locale
 * cookie, read on the server — so even skeletons render in the user's selected language (the convention below).
 *
 * ⛔ TWO THINGS CHANGED HERE ON 2026-08-22, AND BOTH WERE INVISIBLE TO EVERY
 * STATIC GUARD THIS REPO HAS.                             DESIGN_AUTHORITY B7
 *
 *   1. It rendered a `<main>`. `AppShell` already renders `<main id="main-content">`
 *      in the root layout, so all 16 loading.tsx files consuming this were showing
 *      a NESTED main for the whole of their load. `test:measure` greps `src/app`
 *      and this file is not in `src/app`, so no source guard could see it — which
 *      is the argument for the behavioural check in `scripts/responsive-audit.mjs`.
 *   2. It took `width={1080}` — a NUMBER. `PageContainer`'s own header says there
 *      is deliberately no `width={1240}` escape hatch because "a number here is how
 *      the drift started", and this component was that escape hatch, one import
 *      away. Worse, the ratchet in `test:measure` matches `max-w-[Npx]` CLASSES, so
 *      an inline `style={{ maxWidth: 1080 }}` was a hand-typed page width that the
 *      hand-typed-page-width guard could not count.
 *
 * It now states its measure the way every other page does: `<PageContainer tier>`.
 * The three widths in use (1080 / 640 / 1280) were already exactly `reading` /
 * `form` / `board`, so the migration was a zero-pixel change.
 *
 * ⭐ EVERY PLAYER LOADING DRAWING IS CLIENT CODE (2026-10-09, the visual pass round 5's follow-up, R5-H · G-2 — the
 * convention for every `loading.tsx` a player can reach, as R5-D's G1 made it for the root's). Next sends a segment's
 * loading element again with every payload that renders the segment: the document, each move into it, and every
 * `router.refresh()` — the RefreshPoller's beat on the polled pages (every 15–60 s; 5 s on a round awaiting its
 * result), each bet's refresh, a change of language. Drawn by a server component, every node of the drawing rode in
 * each of those (measured: up to 9.6 KB of Flight JSON per refresh, /wallet/receipts). Drawn by a client component,
 * the element is one reference and the few props only the server can answer; the drawing is code, fetched once with
 * the segment and kept. So:
 *   · the drawing is a "use client" component that reads its words with `useT()` — the client dictionary every page
 *     already carries, at the provider's language, which is the cookie the server reads — so the server's HTML is
 *     byte for byte what it was and the first paint is unchanged;
 *   · a loading file that needs no server answer IS that drawing (`"use client"` at its top); one that needs one (the
 *     journey answer, a feature state) stays a server file that asks it and hands the drawing only the answer, the
 *     drawing beside it (`./<name>-ghost.tsx`, imported relatively, so `test:measure` still pairs the tiers);
 *   · a JOURNEY picture is never a module a server file imports: a server file's client imports join its segment's
 *     first load for every reader (VODACOM-PLAN §0h points 20, 21), so a journey reader's loading file hands back the
 *     journey's route ghost pinned to its page (`LazyJourneyRouteGhost at=…`, R5-D's binding), whose code a journey
 *     reader's browser already holds and a classic reader's never fetches.
 * ⚠️ Only the transport changes: a plain client reference, which Flight starts fetching the moment a payload (or a
 * link's prefetch) names it — not `next/dynamic`, which waits for the render; that suits the root's journey-only set,
 * not a drawing every reader of the segment is shown. The chunks' sizes are a production build's to measure (a lock
 * turn's). `test:visual-pass-r5h` §1 holds every player loading file to this and renders each one's markup.
 *
 * ⭐ EVERY GHOST OPENS ON THE BAND ITS PAGE OPENS ON (2026-10-09, the visual pass round 5's follow-up, R5-L) — ONE rule for
 * every loading drawing and every in-page Suspense skeleton. This loader drew a 257px spinner box (80 + 64 + 16 + 15 + 80,
 * and its border) where its pages open on a 44px back link or a hero, so everything the page draws first landed somewhere
 * the ghost had not promised. So a ghost draws its page's OPENING bands with the page's own parts — the BackLink's 44px
 * box (`BackLinkGhost`) where the page opens on one, then the page's own header (`PageHeader` with the page's eyebrow,
 * title, subtitle, icon and tone, inside `PageHero` where the page wraps it in one; a hero's own sentence as words set and
 * not shown, `ghost-kit.tsx`) — in the page's own rhythm (`rhythm`, the class the page's container carries), and this
 * loader's spinner panel and rows stand where the page's first band of DATA begins. The header is printed: it is the
 * page's name and waits for nothing. A page whose first band IS its data (a proposal's own head card) keeps the spinner
 * first — the same rule, decided per route. Each route's loading file says which bands it draws and which case.
 */
import type { ReactNode } from "react";
import { BrandSpinner } from "@/components/brand";
import { PageContainer, type MeasureTier } from "@/components/layout/page-container";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PageLoader({
  tier = "reading",
  rows = 5,
  rowHeight = 64,
  lead,
  rhythm,
}: {
  /** ⛔ A TIER, never a number — B7 rule 2, and it must match the page's own. */
  tier?: MeasureTier;
  rows?: number;
  rowHeight?: number;
  /** The page's opening bands, drawn with the page's own parts (the rule above). */
  lead?: ReactNode;
  /** The page container's own rhythm, so the opening bands and the panel stand as far apart as the page's bands. */
  rhythm?: "space-y-5" | "space-y-6";
}) {
  const { t } = useT();
  return (
    <PageContainer tier={tier} className={cn("content-fade-in", rhythm)}>
      {lead}
      <div className="rounded-xl border border-border bg-bg-elevated p-10 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <BrandSpinner size={48} />
          <p className="font-mono text-caption uppercase tracking-[0.18em] text-text-muted">
            {t.common.loading}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3" aria-hidden>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-bg-elevated kp-shimmer-track"
            style={{ height: rowHeight }}
          />
        ))}
      </div>
    </PageContainer>
  );
}
