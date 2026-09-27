import { PageContainer } from "@/components/layout/page-container";
import { getServerT } from "@/lib/i18n-server";

/**
 * The LOADING state — one of U8's six, and the one people see on the connection this page is
 * actually reached over.
 *
 * ⭐ IT DESCRIBES THE PAGE THAT IS COMING, AND NOTHING ELSE: the eyebrow and heading, the labelled
 * number, the one sentence and then the ONE action button (`optout-client` renders exactly one).
 * A skeleton that promises a shape the page does not render is a layout that jumps the moment the
 * data lands, and this page's whole job is a button somebody taps once — a button that moves under
 * a thumb is a tap that lands somewhere else.
 *
 * ⛔ The heights are the rendered ones, read off the type scale rather than approximated: eyebrow
 * `text-caption` (15px line) + `mb-1`; heading `text-title-lg` under `leading-tight` (35px); the number's
 * `text-body-sm` label (18px) + `mt-1` + `text-title-sm` value (24px); two 21px lines of `text-body-sm
 * leading-relaxed` (the sentence wraps to two at 1280, three at 360); the `lg` button's own `--h-control-lg`.
 * 🔴 Corrected 2026-09-25 (marketing S6, caught by `test:ui-consistency`): this bar was a size-11
 * spacing utility, which this repo's OVERRIDDEN spacing scale renders at 96px — twice the 48px
 * button — so the page jumped by 48px the moment it landed, the one thing this file says it prevents.
 * 🔴 Corrected 2026-09-26 (D6): it had no eyebrow row, one bar for a two-line sentence and a comment
 * promising "two buttons" — measured jumps of ~15px at 1280 and ~30px at 360.
 *
 * ⭐ The loading words are real text for a screen reader (`optout.loading`, which had no reader before):
 * a skeleton alone is silence.
 */
export default async function OptOutLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="receipt">
      <div className="space-y-5" aria-busy="true" role="status">
        <p className="sr-only">{t.optout.loading}</p>
        <div aria-hidden>
          <div className="mb-1 h-[15px] w-16 rounded bg-bg-overlay/40" />
          <div className="h-[35px] w-56 rounded bg-bg-overlay/60" />
        </div>
        <div aria-hidden>
          <div className="h-[18px] w-[48px] rounded bg-bg-overlay/40" />
          <div className="mt-1 h-[24px] w-40 rounded bg-bg-overlay/60" />
        </div>
        <div className="space-y-3" aria-hidden>
          <div>
            <div className="h-[21px] w-full rounded bg-clip-content py-[3px] bg-bg-overlay/40" />
            <div className="h-[21px] w-full rounded bg-clip-content py-[3px] bg-bg-overlay/40 sm:w-3/4" />
            {/* the third line exists only where the sentence takes three (a phone) */}
            <div className="h-[21px] w-1/2 rounded bg-clip-content py-[3px] bg-bg-overlay/40 sm:hidden" />
          </div>
          {/* `data-skeleton` lets the U8 drive measure that the real button lands where this one is drawn. */}
          <div data-skeleton="action" className="h-[var(--h-control-lg)] w-full rounded-lg bg-bg-overlay/60" />
        </div>
      </div>
    </PageContainer>
  );
}
