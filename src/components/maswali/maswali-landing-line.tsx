import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { MILLIONEA_HREF } from "@/app/millionea/millionea-parts";
import type { Dict, Locale } from "@/lib/i18n-dict";

/**
 * MILLIONEA'S LINE ON THE CLASSIC LANDING (Ali, 2026-10-22: "a small line … 'Be this week's winner?' with a clickable link to
 * Millionea, the same colour as … the Millionea tab"; DESIGN_AUTHORITY §M8a item 21, MASWALI-BUILD S5 landing door). The
 * second door of the hero's door row (`HeroDoors`, landing-hero.tsx; the landing's ruling R19), after Live: ONE link to the
 * hub, drawn as the hero's own quiet link (`kp-mine__limits`: the link ink of §B4c, its dim underline, the 44px reach) — the
 * question, then the product's name exactly as every nav draws it (`t.millionea.productLabel` in `.kp-millionea-ink`, the one
 * class the tab, the desktop link and the More row wear — its gradient, its halo, its one-tint lift on the link's hover,
 * its forced-colours fallback; it never moves), then the family's chevron.
 * ⛔ DRAWN ONLY WHEN OFFERED (`millioneaLandingOffered`, millionea-doors.ts: the card's own answer and the hub's week on
 *    sale to this reader) — the page decides on the server and draws nothing otherwise: no slot, no link, no word.
 * ⛔ NO FIGURE: a jackpot here would go stale between renders and owe the headline's facts; the hub states it.
 * ⭐ The question and the name are ONE run of text (the first of the link's two parts; the chevron is the second, as in every
 *    quiet link of the hero), so the words are spaced as text is: one space in Swahili and English, and none in Chinese,
 *    whose full-width "？" carries its own (the zh rule: a space only where a Latin letter or a digit meets Han).
 */
export function MaswaliLandingLine({ t, locale }: { t: Dict; locale: Locale }) {
  return (
    <Link href={MILLIONEA_HREF.hub as never} className="kp-mine__limits" data-testid="millionea-landing-line">
      <span>
        {t.millionea.landingInvite}
        {locale === "zh" ? null : " "}
        <span className="kp-millionea-ink">{t.millionea.productLabel}</span>
      </span>
      <I.chevronRight s={14} edge="end" text="body-600" />
    </Link>
  );
}
