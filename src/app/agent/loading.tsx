"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { useT } from "@/lib/i18n";

/**
 * The page that is COMING: a header WITH its subtitle, three stat tiles in a row (one column
 * on a phone), a CTA, then five panels and the centred terms link. Ghosted at the page's own
 * rung heights so nothing snaps when the data lands. ⛔ Never a ghost for a card the page
 * does not render — and never one card short either.
 *
 * 🔴 IT WAS TWO SHORT AND ONE LINE THIN. The header ghosted eyebrow + title while the page
 * renders a three-line `heroSub` beneath them, so everything below jumped down the moment the
 * read landed; and the panel count was four against the page's five (how it works · the seven
 * documents · the fee · how you are paid · the commission waterfall) with no ghost for the
 * terms link. ⭐ The subtitle is PRINTED since round 5's follow-up (R5-H · G-2b): `heroSub` wraps to a different number
 * of lines in each locale, and the page's own sentence in the page's own `PageHeader` wraps exactly as the page's does —
 * the two bars it replaced stood on the container's 32px rung instead of 4px under the title, and drew two lines where
 * a phone has four (the subtitle 28px low at 1280).
 *
 * ⚠️ The waterfall's ghost is TALLER than the others on purpose: it is an eight-row table,
 * so a one-panel-height ghost would under-reserve it by roughly 200px and reintroduce exactly
 * the jump this file exists to prevent.
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 */
export default function AgentLoading() {
  const { t } = useT();
  return (
    <PageContainer tier="reading" className="space-y-6" aria-busy="true">
      {/* ⭐ THE PAGE'S OWN HEADER, SAME PROPS (R5-H · G-2b): `subtitle={t.agent.heroSub}`, 4px under the title as the page
          draws it, so it wraps where the page's does in every language. */}
      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} subtitle={t.agent.heroSub} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((i) => <div key={i} className="h-[96px] rounded-xl border border-border bg-bg-overlay/40 kp-shimmer-track" />)}
      </div>
      <div className="h-[48px] w-48 rounded-pill bg-bg-overlay kp-shimmer-track" aria-hidden />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl glass-panel p-4 space-y-3" aria-hidden>
          <div className="h-4 w-40 rounded bg-bg-overlay/60" />
          <div className="h-3 w-full rounded bg-bg-overlay/40" />
          <div className="h-3 w-5/6 rounded bg-bg-overlay/40" />
        </div>
      ))}
      {/* The commission waterfall — a header row plus eight rows of two lines each. */}
      <div className="rounded-xl glass-panel p-4 space-y-3" aria-hidden>
        <div className="h-4 w-48 rounded bg-bg-overlay/60" />
        <div className="h-3 w-2/3 rounded bg-bg-overlay/40" />
        {/* ⚠️ `space-y-2`, not `2.5` — the overridden scale makes `2.5` (10px) smaller than
            `2` (12px). See `test:spacing-scale`. */}
        <div className="space-y-2 pt-1">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-start justify-between gap-6">
              <div className="h-3 flex-1 max-w-[28ch] rounded bg-bg-overlay/40" />
              {/* ⚠️ A LITERAL, not `w-20`. On the overridden scale `w-20` and `w-10` both
                  paint 80px, so the key says nothing true about the size; the amount column
                  ghost wants ~80px and now says so. */}
              <div className="h-3 w-[80px] shrink-0 rounded bg-bg-overlay/40" />
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto h-3 w-40 rounded bg-bg-overlay/40" aria-hidden />
    </PageContainer>
  );
}
