"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { ButtonGhost, CHIP_GHOST, Words } from "@/components/ui/ghost-kit";
import { fill } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/**
 * /agent/apply — the form, as `apply-client.tsx` draws it: the back link, then the form's own column (24px apart) — the
 * title row with the persistent counter, the step rail (the four-step bar, the step's line, the four step buttons), ONE
 * step's panel, and the step navigation.
 *
 * 🔴 IT DREW A DIFFERENT FORM (R5-H's audit; round 5's follow-up, R5-L). The shared agent ghost drew no title row, a 4px
 * bar for the whole rail (the page's rail is the bar, 12px, the 14px step line, 12px and a row of 44px step buttons —
 * three lines tall where a Swahili label wraps), TWO generic panels where the page shows one, and no navigation: the
 * page's panel landed 98px lower than the ghost's first panel at 390 and its navigation where the ghost's second panel
 * stood. Every band below is the page's own box with the page's own words, set and not shown (`ghost-kit.tsx`), so the
 * step buttons wrap where the page's do in every language.
 * ⚠️ THE STEP DRAWN IS THE FIRST, "About you": the page opens on the first step with something missing, and an applicant
 * arrives here from /agent with nothing attached. Its panel is the title, the two document slots (their own dashed box —
 * the 40px glyph disc, the document's name, its "not attached" line), the photo hint and the identity note of an
 * applicant who applied (an officer's invitee reads the KYC note instead, of a similar length).
 * ⛔ No `<button>` and no `<input>`: a ghost promises a shape, never a control.
 */
export default function AgentApplyLoading() {
  const { t } = useT();
  const steps = [t.agent.stepAbout, t.agent.stepWhere, t.agent.stepReferees, t.agent.stepPayment];
  return (
    <PageContainer tier="form" className="space-y-5" aria-busy="true">
      {/* The back link — the BackLink's own 44px box. */}
      <BackLinkGhost />
      <div className="space-y-5">
        {/* Title row + the persistent counter — the title printed (the page's name); the counter the kit chip's box. */}
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-title-md font-bold leading-none">{t.agent.applyTitle}</p>
          <Chip variant="pending" style={CHIP_GHOST} aria-hidden>{fill(t.agent.attachedCount, { n: "0", total: "0" })}</Chip>
        </div>

        {/* The rail — `SteppedProgress`'s four 4px segments, the step line, the four step buttons with their words. */}
        <div className="text-transparent" aria-hidden>
          <div className="flex gap-1.5">
            {steps.map((_, i) => <div key={i} className="h-1 flex-1 rounded-pill bg-bg-overlay" />)}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-mono text-micro uppercase eyebrow font-bold"><Words>{`1 / 4 · ${steps[0]}`}</Words></p>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {steps.map((label, i) => (
              <span key={i} className={`min-h-[44px] rounded-md px-1 text-center text-body-sm font-semibold leading-tight ${i === 0 ? "bg-bg-overlay kp-shimmer-track" : ""}`}>
                <Words ink={i === 0 ? "title" : "line"}>{label}</Words>
              </span>
            ))}
          </div>
        </div>

        {/* STEP 1's panel — the title, the two slots (one column on a phone), the two notes. */}
        <section className="rounded-xl glass-panel p-4 space-y-3 text-transparent" aria-hidden>
          <p className="font-display text-title-sm font-bold leading-tight"><Words ink="title">{t.agent.stepAbout}</Words></p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[t.agent.docCv, t.agent.docRequest].map((label, i) => (
              <div key={i} className="relative">
                <div className="w-full min-h-[96px] overflow-hidden rounded-md border-2 border-dashed border-border bg-bg-overlay/40 p-3 text-center">
                  <span className="mx-auto mb-1.5 h-[40px] w-[40px] inline-flex items-center justify-center rounded-full bg-bg-overlay border border-border">
                    <I.idCard s={14} />
                  </span>
                  <span className="block font-display text-body-sm font-semibold"><Words ink="title">{label}</Words></span>
                  <span className="mt-0.5 block font-mono text-body-sm"><Words>{t.agent.slotEmpty}</Words></span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-body-sm leading-relaxed"><Words>{t.agent.docPhotoHint}</Words></p>
          <p className="text-body-sm leading-relaxed"><Words>{t.agent.docIdNote}</Words></p>
        </section>

        {/* Step navigation — the two 44px buttons, their words and glyphs' room. */}
        <div className="flex items-center justify-between" aria-hidden>
          <ButtonGhost size="md" leading={14}>{t.common.back}</ButtonGhost>
          <ButtonGhost size="md" trailing={14}>{t.common.next}</ButtonGhost>
        </div>
      </div>
    </PageContainer>
  );
}
