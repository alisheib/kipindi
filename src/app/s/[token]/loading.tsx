import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { getServerT } from "@/lib/i18n-server";
import { SENDER_IDENTITY } from "@/lib/marketing/footer";
import { NUMBER_LABEL, NUMBER_VALUE, ACT_GROUP, ACT_SENTENCE, TITLE_TEXT } from "./optout-classes";

/**
 * The LOADING state — one of U8's six, and the one people see on the connection this page is
 * actually reached over.
 *
 * ⭐ IT IS THE PAGE THAT IS COMING, DRAWN WITH ITS OWN PARTS. The same `PageHeader`, the same labelled
 * number, the same sentence and ONE action (`optout-client` renders exactly one), with the same
 * classes (`optout-classes.ts`) and the same dictionary strings. Only the text that depends on the
 * data is made transparent and shown as a bar, so each line wraps exactly where the real one will,
 * in every locale and at every width. A button that moves under a thumb is a tap that lands
 * somewhere else.
 * 🔴 Corrected 2026-09-27: the heights used to be typed by hand, and the read-aloud line sat FIRST in
 * the spaced stack, so the stack's gap pushed everything below it down: the stop button was drawn 24px
 * lower than it landed at 360. The read-aloud line is now last, and nothing is typed by hand.
 * 🔴 And the bars were `bg-overlay` at 40-60% on the page ground, about 1.01:1 — a blank page for the
 * whole load. They now take the shared loader's visible surface (`page-loader.tsx`).
 *
 * ⭐ What does not depend on the data is real text: the sender eyebrow and the number's label. The
 * action placeholder says `optout.loading` on screen, and the same words are read aloud from the
 * `sr-only` line, because the drawing is hidden from a screen reader: a skeleton alone is silence.
 */

/** A line of text as a placeholder bar. `box-decoration-clone` gives every wrapped line its own
 *  rounded bar; background and an inset ring change nothing about where the text breaks. */
const BAR = "text-transparent bg-bg-elevated rounded-sm ring-1 ring-inset ring-border box-decoration-clone";

/** The masked number's shape (`+255••••NN`): fixed width in a monospaced face, so any digits do. */
const MASK_SHAPE = "+255••••00";

export default async function OptOutLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="receipt">
      <div role="status" aria-busy="true" className="space-y-5">
        <div aria-hidden>
          {/* The title's own span class too (zh keeps its words whole), so the bar wraps where the title will. */}
          <PageHeader eyebrow={SENDER_IDENTITY} title={<span className={`${TITLE_TEXT} ${BAR}`}>{t.optout.title}</span>} />
        </div>
        <dl aria-hidden>
          <dt className={NUMBER_LABEL}>{t.auth.phone}</dt>
          <dd className={NUMBER_VALUE}><span className={BAR}>{MASK_SHAPE}</span></dd>
        </dl>
        <div className={ACT_GROUP} aria-hidden>
          <p className={ACT_SENTENCE}><span className={BAR}>{t.optout.body}</span></p>
          {/* `data-skeleton` lets the U8 drive measure that the real button lands where this one is drawn. */}
          <div data-skeleton="action" className="flex h-[var(--h-control-lg)] w-full items-center justify-center rounded-control border border-border bg-bg-elevated kp-shimmer-track text-body font-semibold text-text-muted">
            {t.optout.loading}
          </div>
        </div>
        {/* ⛔ LAST, never first: the stack's gap goes on every child after the first, even a hidden one. */}
        <p className="sr-only">{t.optout.loading}</p>
      </div>
    </PageContainer>
  );
}
