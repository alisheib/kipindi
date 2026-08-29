import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { I } from "@/components/ui/glyphs";

/**
 * B-29 / V-2 — the skeleton mirrors the FORM the page actually renders
 * (amount field → provider grid → phone field → gold confirm), instead of the
 * old centered spinner panel that repainted into a completely different shape.
 */
export default async function DepositLoading() {
  const { t } = await getServerT();
  /* ⭐ DG-P-04 · §S1 — THE RHYTHM IS DECLARED ON THE CONTAINER, NOT SPRINKLED PER ELEMENT.
     This read `<PageContainer tier="form">` + `<header className="mb-6">`, i.e. a 32px gap
     typed onto one child, while the page it stands in for (`page.tsx`, same directory)
     declares `space-y-5` = 24px. So the deposit form MOVED 8px the instant the skeleton was
     replaced, on a money surface. Measured, not guessed: `form` is the most unanimous tier in
     the product — 10 of 10 containers that declare a rhythm declare `space-y-5`. */
  return (
    <PageContainer tier="form" className="space-y-5">
      {/* 🔴 DG-P-03 · §L1 · §K — THIS SKELETON NAMED THE PAGE TWO DIFFERENT THINGS, ON A MONEY
          FORM. It drew the eyebrow "Deposit" over an h1 reading **"Loading"**, while
          `page.tsx:88` renders eyebrow "Add funds" over the h1 "Deposit" — so BOTH strings
          changed the instant the data landed, and for the moment before it the page's own
          heading was the word `Loading`. §L1: one name per destination. `positions/loading.tsx`
          states this rule in its own header; this file was the counter-example.
          ⭐ It now renders the SAME three components the page does, with the same props —
          BackLink ghost, `PageHero glow="gold"`, `PageHeader tone="gold"` — so the shape and
          the words are the page's, not a second copy of them. The h1 recipe was also
          `font-display text-[28px] font-bold text-text`, missing the `leading-tight
          tracking-[-0.02em]` `PageHeader` carries, so the heading changed line-height too. */}
      {/* WIDTH IS A LITERAL, not `w-16` — the Tailwind spacing scale is OVERRIDDEN and
          INVERTS at the keys it does not cover: `w-16` is stock 64px while `w-12` is an
          overridden 128px, so the bigger number paints the smaller box. `test:spacing-scale`
          derives that forbidden set from the two scales and ratchets it. Same 64px, on a key
          that cannot invert. */}
      <div className="h-4 w-[64px] rounded bg-bg-overlay kp-shimmer-track" aria-hidden />

      <PageHero glow="gold">
        <PageHeader
          tone="gold"
          icon={<I.arrowDownToLine s={14} className="text-gold-300" />}
          eyebrow={t.common.addFunds}
          title={t.common.deposit}
          subtitle={t.wallet.mobileMoney}
        />
      </PageHero>

      <div className="space-y-5" aria-hidden>
        {/* Amount field */}
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-bg-overlay kp-shimmer-track" />
          {/* ⚠️ TOKEN, not `h-11` — spacing is overridden (tailwind.config.ts:200-215) so `h-11`
              drew 96px. This ghost stands in for `<Input size="md">`, which reads its height
              from --h-input (44px) — so consume the SAME token and the two can never drift.
              PLAYER MONEY SURFACE: a mismatch here is a jump on the deposit form. */}
          <div className="h-[var(--h-input)] w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
          <div className="h-2.5 w-48 rounded bg-bg-overlay/60 kp-shimmer-track" />
        </div>

        {/* Provider tile grid (2 cols mobile / 3 cols sm — the real radio grid) */}
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-bg-overlay kp-shimmer-track" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[86px] rounded-md border border-border kp-shimmer-track" style={{ background: "var(--bg-inset)" }} />
            ))}
          </div>
        </div>

        {/* Destination phone field */}
        <div className="space-y-2">
          <div className="h-3 w-32 rounded bg-bg-overlay kp-shimmer-track" />
          {/* ⚠️ TOKEN, not `h-11` (96px on the overridden scale) — same `<Input size="md">`. */}
          <div className="h-[var(--h-input)] w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
        </div>

        {/* Gold confirm CTA */}
        {/* ⚠️ TOKEN, not `h-12` (128px on the overridden scale) — the gold confirm is a
            `btn-lg`, whose height is --h-control-lg (48px). */}
        <div className="h-[var(--h-control-lg)] w-full rounded-md bg-gold-500/25 kp-shimmer-track" />
      </div>
    </PageContainer>
  );
}
