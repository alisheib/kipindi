"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { I } from "@/components/ui/glyphs";
import { ReceiptRow } from "@/components/ui/receipt-row";
import { GhostBar, GhostLine, GhostTextLine, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { GhostWords, type GhostRecipe } from "@/components/maswali/maswali-ghost-words";
import { useT } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-dict";
import {
  commitExplainer, commitFingerprint, ledgerCarriedOut, ledgerFee, ledgerFloor, ledgerMoneyIn, ledgerMoneyOut, ledgerSales,
} from "../register-words";

/**
 * /millionea/register/[week] loading skeleton — the week page's own bands (`page.tsx`), in its order, the first screens' in
 * the page's own type (a line of words is the kit's bar inside the very line box those words fill, `GhostTextLine` — the
 * hub's drawing's rule — so each band is the page's height): the back link's box; the head with its state chip and code
 * under the title (S5 VIS R4), its facts and its times (the critic's M1: data, as many lines as they take in the reader's
 * language, measured); the ledger's card at the receipt's measure (M4) as a rolled week draws it — the common weekly case —
 * in the ONE ledger's own rows (`MaswaliLedger`: the kit's `ReceiptRow` at one rhythm, the carry's link row, the totals'
 * hairlines), each label its own words and each figure a bar; the commitments' titled card (M12), each fingerprint its
 * same-width template and the closing sentence its own words; then the questions' heading and the first questions as the
 * page draws them — a ticket's clause on a card below 1024 (category, question, criterion, event and source, outcome), the
 * six-column table on its panel from 1024 (R1, L18). What the week holds (its kind, its rows, its figures) the drawing
 * cannot know.
 * ⭐ STATIC WORDS ARE SET, UNSEEN (the lead's ruling of 2026-10-23, S5-R3-FIX 8): the ledger's labels, the fingerprints and
 * the closing sentence come from `../register-words.ts` through the kit's `GhostWords`, so they break where the page's do in
 * any engine. The drawing names no word itself; a reader Millionea is hidden from is drawn plain bars where they stand
 * (`maswali-ghost-words.tsx` says why). Measured by `qa:maswali-register-shots`' register-ghosts hop.
 */

/** How many lines a paragraph's words take below 360, from 360 and from 768. */
type Tiers = readonly [below360: number, from360: number, from768: number];
/** The head's facts and times — DATA: the week's own outcome, figures and dates — in each language, as a rolled week's are
 *  measured in Chromium at 320, 360 and 768 on the runner with the phones' Chinese face (DESIGN_AUTHORITY §M4a rule 5).
 *  The facts ("No 10/10 · TZS 18,000 carried forward · Fee TZS 0") take a second line from 360 in English and below 360 in
 *  Chinese since the fee says its currency (S5-R2-REGISTER 28; the register-ghosts hop: the head 20px taller on one).
 *  WEBKIT draws every cell here in the same count (run 39953673548, S5-R3-FIX 8: ratios 2.625, 3 and 1, the runner's
 *  classic scrollbar removed); between the judged widths it takes the facts to 2 lines at en 375 and zh 340 (Chromium 1). */
const HEAD_LINES: Record<Locale, { facts: Tiers; times: Tiers }> = {
  en: { facts: [2, 2, 1], times: [2, 1, 1] },
  sw: { facts: [2, 2, 1], times: [2, 2, 1] },
  zh: { facts: [2, 1, 1], times: [2, 2, 1] },
};
/** The tickets' root's time line — DATA ("Fixed 13 Nov, 18:01 · 18 tickets" / "锁定于 2026年11月13日 18:01 · 18 张彩票"): the
 *  Chinese takes two lines below 360 (the register-ghosts hop: the commitments 19px taller at 320 on one). Measured as the
 *  head's lines are; WEBKIT draws every cell in the same count, at every width (run 39953673548). */
const ROOT_LINES: Record<Locale, Tiers> = { en: [1, 1, 1], sw: [1, 1, 1], zh: [2, 1, 1] };

/** A line in the numerals' mono face (§T5) — its line box stands a pixel taller than a body line: an empty run of that face
 *  gives the drawn line the same box. */
function MonoLine({ width }: { width: string }) {
  return <span className="block"><GhostLine className={width} /><span className="font-mono" /></span>;
}

/** A data paragraph's lines below 360, from 360 and from 768, each a body line or (`mono`) a line holding numerals. */
function Wrapped({ text, lines: [below360, from360, from768], last, mono = false }: { text: string; lines: Tiers; last: string; mono?: boolean }) {
  const lines = (n: number) => Array.from({ length: n }, (_, i) => {
    const width = i === n - 1 ? last : "w-full";
    return mono ? <MonoLine key={i} width={width} /> : <GhostTextLine key={i} width={width} />;
  });
  return (
    <span className={`block ${text}`}>
      <span className="block xs:hidden">{lines(below360)}</span>
      <span className="hidden xs:block md:hidden">{lines(from360)}</span>
      <span className="hidden md:block">{lines(from768)}</span>
    </span>
  );
}

/** One ledger row in the kit's own row (`ReceiptRow`, the sentence label), as `MaswaliLedger` draws it: its label's own words,
 *  set unseen; its figure — data — as a bar; no step of space above any row (the ledger keeps one rhythm, the lead's ruling
 *  of 2026-10-22). A link row (`link`, the carry's) holds its words and the chevron as the ledger's link does, the glyph
 *  drawn unseen so its box — its edge's pull included — is the page's own. `plain` is the label's bar without the words. */
function LedgerRow({ words, plain, emphasis, divider, note, link }: {
  words: GhostRecipe; plain: string; emphasis?: "total" | "muted"; divider?: boolean; note?: boolean; link?: boolean;
}) {
  const label = link
    ? (
      <span className="inline-flex items-center gap-1">
        <span><GhostWords words={words} plain={plain} /></span>
        <I.chevronRight s={14} edge="end" text="body-400" className="invisible shrink-0" />
      </span>
    )
    : <GhostWords words={words} plain={plain} />;
  return (
    <div>
      <ReceiptRow labelStyle="sentence" label={label} value={<GhostLine className="w-[88px]" />} emphasis={emphasis} divider={divider} alignEnd />
      {note && <span className="mt-0.5 block text-body-sm"><MonoLine width="w-[200px] max-w-full" /></span>}
    </div>
  );
}

/** One of the two commitments: its eyebrow, its fingerprint — 64 hex characters in the numerals' mono wrapped by character,
 *  set as their same-width template — and its time line (data: `time`, as many lines as it takes in the reader's language). */
function Commitment({ time = [1, 1, 1] }: { time?: Tiers }) {
  return (
    <div className="flex flex-col gap-1">
      <GhostTextLine text="font-mono text-micro uppercase eyebrow" width="w-[140px]" />
      <span className="font-mono text-body-sm break-all"><GhostWords words={commitFingerprint} /></span>
      <Wrapped text="text-body-sm" lines={time} last="w-[55%]" mono />
    </div>
  );
}

export function MillioneaRegisterWeekGhost() {
  const { t, locale } = useT();
  const H2 = <GhostTextLine text="font-display text-title-sm font-bold" width="w-[160px]" />;
  const lines = HEAD_LINES[locale];
  return (
    // Millionea's Chinese is set as the page sets it (`kp-mln-zh`: its eyebrows and micro labels at 12px), so the bands match.
    <PageContainer tier="reading" className="kp-mln-zh">
      {/* `data-ghost-page`: which page's drawing this is, for `qa:millionea-ghost-hops` (a hop shows only its own). */}
      <div className="flex flex-col gap-6" aria-busy="true" data-ghost-page="week">
        <BackLinkGhost />
        <div className="flex flex-col gap-2" aria-hidden data-ghost="head">
          <MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[132px]" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-block h-[23px] w-[96px] rounded-pill bg-bg-overlay" />
            <GhostTextLine text="font-mono text-micro uppercase eyebrow" width="w-[112px]" />
          </div>
          <Wrapped text="text-body" lines={lines.facts} last="w-[70%]" />
          <Wrapped text="text-body-sm" lines={lines.times} last="w-[60%]" mono />
        </div>
        <div className="flex flex-col gap-2" aria-hidden data-ghost="ledger">
          {H2}
          <div className="mat-flat flex max-w-receipt flex-col rounded-card p-3">
            {/* A rolled week's rows (`millioneaLedgerRows`), every one at the list's one gap: the sales over their note;
                Money in; the floor; the fee; the carry's link row (as tall as its line — its target reaches the tap floor
                out of flow, `.kp-mln-hit`); Money out. */}
            <div className="flex flex-col gap-1.5">
              <LedgerRow words={ledgerSales} plain="w-[96px]" note />
              <LedgerRow words={ledgerMoneyIn} plain="w-[88px]" emphasis="total" divider />
              <LedgerRow words={ledgerFloor} plain="w-[120px]" emphasis="muted" />
              <LedgerRow words={ledgerFee} plain="w-[48px]" />
              <LedgerRow words={ledgerCarriedOut} plain="w-[160px]" link />
              <LedgerRow words={ledgerMoneyOut} plain="w-[96px]" emphasis="total" divider />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2" aria-hidden data-ghost="commitments">
          {H2}
          <div className="mat-flat flex max-w-receipt flex-col gap-4 rounded-card p-3">
            <Commitment />
            <Commitment time={ROOT_LINES[locale]} />
            <p className="text-body-sm text-text-muted text-pretty"><GhostWords words={commitExplainer} /></p>
          </div>
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          {H2}
          <div className="flex max-w-receipt flex-col lg:hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2 border-t border-border px-1 py-3">
                <GhostBar className="h-4 w-4" />
                <div className="flex flex-col gap-1.5">
                  <GhostBar className="h-3 w-[72px]" />
                  <GhostBar className="h-4 w-full" />
                  <GhostBar className="h-3 w-[85%]" />
                  <GhostBar className="h-3 w-[60%]" />
                  <GhostBar className="h-5 w-[64px] rounded-pill" />
                </div>
              </div>
            ))}
          </div>
          <div className="glass-panel hidden flex-col lg:flex">
            <GhostBar className="h-[36px] w-full" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)_96px_120px_120px_140px] gap-x-8 border-b border-border px-5 py-3">
                <GhostBar className="h-4 w-4" />
                <div className="flex flex-col gap-1.5">
                  <GhostBar className="h-4 w-full" />
                  <GhostBar className="h-3 w-[80%]" />
                  <GhostBar className="h-3 w-[72px]" />
                </div>
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-5 w-[64px]" />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}
