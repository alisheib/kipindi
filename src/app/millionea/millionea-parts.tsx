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

/** Every Millionea address, spelled once (`position-permalink.ts` keeps the ticket's own, `millioneaTicketHref`). */
export const MILLIONEA_HREF = {
  hub: "/millionea",
  slip: "/millionea/slip",
  how: "/millionea/how",
  tickets: "/millionea/tickets",
  register: "/millionea/register",
} as const;

/** One week of the register, by its stamped code. */
export function registerWeekHref(code: string): string {
  return `${MILLIONEA_HREF.register}/${encodeURIComponent(code)}`;
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

/** The two doors a reading page ends on: How to play and the week's register (§10 §3.3 item 7). */
export function MillioneaReadingLinks({ t, register = MILLIONEA_HREF.register, how = true }: { t: Dict; register?: string; how?: boolean }) {
  const link = "inline-flex items-center gap-1 text-body-sm text-text-link hover:text-text-linkHover";
  return (
    <nav aria-label={t.millionea.productTitle} className="flex flex-wrap gap-x-5 gap-y-1">
      {how && (
        <Link href={MILLIONEA_HREF.how as never} className={link} style={{ minHeight: "var(--h-control-md)" }}>
          {t.millionea.howToPlay}
          <I.chevronRight s={14} edge="end" />
        </Link>
      )}
      <Link href={register as never} className={link} style={{ minHeight: "var(--h-control-md)" }}>
        {t.millionea.register}
        <I.chevronRight s={14} edge="end" />
      </Link>
    </nav>
  );
}
