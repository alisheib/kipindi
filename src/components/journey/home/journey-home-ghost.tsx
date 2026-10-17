/**
 * THE JOURNEY HOME'S GHOST — what a journey reader sees while `/` loads (the Vodacom plan S7: VODACOM-PLAN §3.2's "its
 * own journey skeleton"; `S7-PLAN.md` WP7 step 3, amendments A5(c), A17 and A24 item 2; the S4 board s4-3-home-skeleton).
 *
 * ⭐ ONE DRAWING, TWO PLACES, EACH THE PAGE'S OWN GEOMETRY. It is the fallback of the Suspense boundary in `app/page.tsx`'s
 * journey arm (shown while the home's list is still on its way, A17 item 2), and the root loading state's picture of `/`
 * for a journey reader (`journey/route-ghost.tsx`'s "/" entry, re-pointed from the classic landing's ghost by WP7, A24
 * item 2) — so the page lands where its ghost stood, whichever of the two the reader met. It draws the home's frame with
 * the home's OWN classes rather than a copy of their numbers: the same PageContainer (the board tier, the house padding,
 * A5(c)), the same column and its gaps (`.kp-jhome`), the same head (the How-to card's own box, `.kp-jhowto`, over the
 * headline below 1024 and beside it from 1024 — A16), the headline itself (`HomeHeadline`, the page's own drawing, set
 * but not shown), the chips rail's own strip, the journey card grid and the card's own box and rows (`.kp-jgrid`,
 * `.kp-jcard*` on the `--jcard-*` tokens). What it adds is paint (`.kp-jhome-ghost*` in globals.css): bars where words
 * and controls will be.
 * ⭐ WHAT IS READ AND WHAT IS NOT: the How-to card's title is drawn in words, as `positions/loading.tsx`'s ghost draws its
 * page's name; every other shape is `aria-hidden`.
 * ⭐ ITS PARTS ARE MARKED for the ghost drive (A17 item 3): the root `data-testid="journey-home-ghost"`, and
 * `data-ghost-part` on the How-to card, the headline, the chips and the first card box.
 * ⛔ NO DIRECTIVE, NO SERVER READ: a server page renders it (the Suspense fallback) and a client module draws it
 * (`route-ghost.tsx`, in the journey's own chunk), so it imports nothing a browser cannot load and takes its words as `t`.
 * `test:journey-home` §6 holds it: its id and its parts, and its two importers — `app/page.tsx` and `route-ghost.tsx` — so
 * no other loading file can draw it (a hop to a question page never shows the home's ghost, A19).
 */
import { PageContainer } from "@/components/layout/page-container";
import type { Dict } from "@/lib/i18n-dict";
import { HomeHeadline } from "./home-headline";

/** The chips' bars, at widths near the first four labels' (a row of identical boxes reads as a loading bar, not a rail) —
 *  each a width the stylesheet already carries, so the ghost adds no utility to any page's CSS. */
const CHIP_WIDTHS = ["w-[64px]", "w-[96px]", "w-[112px]", "w-[88px]"];
/** The first row of cards: one fills a phone's screen, three are the grid's first row from 1024. */
const CARDS = [0, 1, 2];

/**
 * `millionea` — MASWALI-BUILD S5: the route says the Millionea card will be offered (`app/page.tsx`, from the doors' one
 * answer), so its slot is held between the head and the chips where the card lands (O-7). The root loading's picture of
 * `/` cannot ask, and draws none (`route-ghost.tsx`). The slot is the card's own box: a raised card, the 48px plate, three
 * lines — no word, no figure.
 */
export function JourneyHomeGhost({ t, millionea = false }: { t: Dict; millionea?: boolean }) {
  return (
    <PageContainer tier="board">
      <div className="kp-jhome kp-jhome-ghost" data-testid="journey-home-ghost">
        <div className="kp-jhome__head">
          <div className="kp-jhowto" data-ghost-part="howto">
            <span aria-hidden className="kp-jhome-ghost__plate kp-shimmer-track" />
            <span className="kp-jhowto__text">
              <span className="font-display font-semibold text-body-lg">{t.journey.howToCardTitle}</span>
              <span aria-hidden className="kp-jhome-ghost__meta" />
            </span>
          </div>
          <HomeHeadline t={t} ghost />
        </div>
        {millionea && (
          <div aria-hidden className="mat-raised flex items-start gap-2 rounded-card p-3" data-ghost-part="millionea">
            <span className="block h-12 w-12 shrink-0 rounded-card bg-bg-overlay kp-shimmer-track" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
              <span className="kp-jhome-ghost__bar kp-jhome-ghost__bar--where" />
              <span className="kp-jhome-ghost__line" />
              <span className="kp-jhome-ghost__bar kp-jhome-ghost__bar--when" />
            </span>
          </div>
        )}
        <div aria-hidden className="kp-strip-fade kp-jhome__chips" data-ghost-part="chips">
          {CHIP_WIDTHS.map((w) => <span key={w} className={`kp-jhome-ghost__chip kp-shimmer-track ${w}`} />)}
        </div>
        <ul aria-hidden className="kp-jgrid">
          {CARDS.map((i) => (
            <li key={i}>
              <div className="kp-jcard kp-shimmer-track" data-ghost-part={i === 0 ? "card" : undefined}>
                <div className="kp-jcard__meta">
                  <span className="kp-jhome-ghost__bar kp-jhome-ghost__bar--where" />
                  <span className="kp-jhome-ghost__bar kp-jhome-ghost__bar--when" />
                </div>
                <div className="kp-jcard__title">
                  <span className="kp-jhome-ghost__line" />
                  <span className="kp-jhome-ghost__line" />
                </div>
                <div className="kp-jcard__act">
                  <div className="kp-jcard__picks">
                    <span className="kp-jhome-ghost__pick" />
                    <span className="kp-jhome-ghost__pick" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PageContainer>
  );
}
