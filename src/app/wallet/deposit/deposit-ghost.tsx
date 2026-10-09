"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { PageHero } from "@/components/ui/page-hero";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/**
 * B-29 / V-2 — the skeleton mirrors the FORM the page actually renders
 * (amount field → provider grid → phone field → confirm), instead of the
 * old centered spinner panel that repainted into a completely different shape.
 * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` (this folder) renders it,
 * and the journey's root loading state (`components/journey/route-ghost.tsx`) draws it on a move to /wallet/deposit.
 * ⭐ CLIENT CODE THAT READS ITS OWN WORDS (round 5's follow-up, R5-H · G-2): so the loading file hands it nothing and a
 * refresh carries its reference, not this tree — `components/ui/page-loader.tsx` has the convention.
 */
export function DepositGhost() {
  const { t } = useT();
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
          BackLink ghost, `PageHero` and `PageHeader` (plain since 2026-10-07, §M3a D1) — so the shape and
          the words are the page's, not a second copy of them. The h1 recipe was also
          `font-display text-[28px] font-bold text-text`, missing the `leading-tight
          tracking-[-0.02em]` `PageHeader` carries, so the heading changed line-height too. */}
      {/* The back link: the BackLink's own 44px box (`BackLinkGhost`, R5-H · G-2b) — a 20px bar stood here, 24px short. */}
      <BackLinkGhost />

      <PageHero>
        <PageHeader
          icon={<I.arrowDownToLine s={14} className="text-text-subtle" />}
          eyebrow={t.common.addFunds}
          title={t.common.deposit}
          subtitle={t.wallet.mobileMoney}
        />
      </PageHero>

      <div className="space-y-5" aria-hidden>
        {/* Amount field */}
        <div className="space-y-2">
          <div className="h-3 w-[80px] rounded bg-bg-overlay kp-shimmer-track" />
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
          <div className="h-3 w-[128px] rounded bg-bg-overlay kp-shimmer-track" />
          {/* ⚠️ TOKEN, not `h-11` (96px on the overridden scale) — same `<Input size="md">`. */}
          <div className="h-[var(--h-input)] w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
        </div>

        {/* The confirm CTA — brand, as the button it stands for (D1: a deposit commit is brand, never gold; R5-C, 2026-10-09). */}
        {/* ⚠️ TOKEN, not `h-12` (128px on the overridden scale) — the confirm is a
            `btn-lg`, whose height is --h-control-lg (48px). */}
        <div className="h-[var(--h-control-lg)] w-full rounded-md bg-brand-500/25 kp-shimmer-track" />
      </div>
    </PageContainer>
  );
}
