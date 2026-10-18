/**
 * /millionea — THE SMALL PARTS EVERY MILLIONEA PAGE SHARES (MASWALI-BUILD S5 composition).
 *
 * The routes' addresses (one spelling each), the staff preview's mark, and the two doors every reading page ends on.
 * Server-safe, no directive, no read: each page hands in its words.
 */
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import type { Dict } from "@/lib/i18n-dict";

/**
 * Every Millionea address, spelled once. ⚠️ Written as path literals on purpose: `test:journey-shell` §9's door census
 * reads the doors a page names from its own `.tsx` files, so a door spelled only inside a `lib` helper is invisible to it.
 * The ticket's address is `position-permalink.ts`'s rule (`millioneaTicketHref`), and `test:maswali-ui` holds the two to
 * the same answer.
 */
export const MILLIONEA_HREF = {
  hub: "/millionea",
  slip: "/millionea/slip",
  how: "/millionea/how",
  tickets: "/millionea/tickets",
  register: "/millionea/register",
} as const;

/** One week of the register, by its stamped code. */
export function registerWeekHref(code: string): string {
  return `/millionea/register/${encodeURIComponent(code)}`;
}

/** One ticket's own page, by its serial — `millioneaTicketHref`'s answer, as a door this file names. */
export function ticketPageHref(serial: string): string {
  return `/millionea/tickets/${encodeURIComponent(serial)}`;
}

/** The sign-in door that comes back to `next` once in (a deep link survives the detour, as `/positions/[id]` does). */
export function signInHref(next: string): string {
  return `/auth/login?next=${encodeURIComponent(next)}`;
}

/**
 * THE PREVIEW MARK (`millionea-rollout.ts`: STAFF_PREVIEW shows Millionea to staff "under a 'Preview' mark") — drawn only
 * when the gate says the request sees it as a preview; for every other reader it is not in the page at all.
 */
export function MillioneaPreviewMark({ t }: { t: Dict }) {
  return (
    <div data-testid="millionea-preview-mark">
      <Callout tone="info" glyph="eye" role="status">{t.millionea.previewMark}</Callout>
    </div>
  );
}

/**
 * The doors a reading page ends on (§10 §3.3 item 7): How to play and the week's register by default, and the hub where a
 * page is reached from it. Each page leaves out the door to itself.
 */
export function MillioneaReadingLinks({ t, how = true, register = true, hub = false }: { t: Dict; how?: boolean; register?: boolean; hub?: boolean }) {
  const link = "inline-flex items-center gap-1 text-body-sm text-text-link hover:text-text-linkHover";
  const doors: Array<{ href: string; label: string }> = [
    ...(hub ? [{ href: MILLIONEA_HREF.hub, label: t.millionea.productTitle }] : []),
    ...(how ? [{ href: MILLIONEA_HREF.how, label: t.millionea.howToPlay }] : []),
    ...(register ? [{ href: MILLIONEA_HREF.register, label: t.millionea.register }] : []),
  ];
  return (
    <nav aria-label={t.millionea.productTitle} className="flex flex-wrap gap-x-5 gap-y-1">
      {doors.map((d) => (
        <Link key={d.href} href={d.href as never} className={link} style={{ minHeight: "var(--h-control-md)" }}>
          {d.label}
          <I.chevronRight s={14} edge="end" />
        </Link>
      ))}
    </nav>
  );
}
