"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { ReceiptRow } from "@/components/ui/receipt-row";
import { GhostBar, GhostLine, GhostTextLine, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-dict";

/**
 * /millionea/register/[week] loading skeleton — the week page's own bands (`page.tsx`), in its order, the first screens' in
 * the page's own type (a line of words is the kit's bar inside the very line box those words fill, `GhostTextLine` — the
 * hub's drawing's rule — so each band is the page's height): the back link's box; the head with its state chip and code
 * under the title (S5 VIS R4), its facts and its times (the critic's M1) as many lines as they take in the reader's language;
 * the ledger's card at the receipt's measure (M4) as a rolled week draws it — the common weekly case — in the ONE ledger's
 * own rows (`MaswaliLedger`: the kit's `ReceiptRow` at one rhythm, the carry's link row, the totals' hairlines); the
 * commitments' titled card (M12); then the questions' heading and the first questions as the page draws
 * them — a ticket's clause on a card below 1024 (category, question, criterion, event and source, outcome), the six-column
 * table on its panel from 1024 (R1, L18). What the week holds (its kind, its rows) the drawing cannot know. Wordless but
 * for the screen reader's "loading" (`maswali-ghost.tsx`). Measured by `qa:maswali-register-shots`' register-ghosts hop.
 */

/** How many lines a paragraph's words take below 360, from 360 and from 768. */
type Tiers = readonly [below360: number, from360: number, from768: number];
/** The head's facts and times, and the commitments' closing sentence, in each language, as a rolled week's are measured.
 *  The facts ("No 10/10 · TZS 18,000 carried forward · Fee TZS 0") take a second line from 360 in English and below 360 in
 *  Chinese since the fee says its currency (S5-R2-REGISTER 28; the register-ghosts hop: the head 20px taller on one). */
const HEAD_LINES: Record<Locale, { facts: Tiers; times: Tiers; explainer: Tiers }> = {
  en: { facts: [2, 2, 1], times: [2, 1, 1], explainer: [3, 3, 2] },
  sw: { facts: [2, 2, 1], times: [2, 2, 1], explainer: [3, 3, 2] },
  zh: { facts: [2, 1, 1], times: [2, 2, 1], explainer: [3, 3, 1] },
};
/** The ledger's floor label at the receipt's measure ("Guaranteed floor" / "Kiwango cha chini kilichohakikishwa" / "保底金额"):
 *  the Swahili takes two lines below 768 (the register-ghosts hop: the card 16.5px taller at 320 and 360 on one line). */
const FLOOR_LINES: Record<Locale, Tiers> = { en: [1, 1, 1], sw: [2, 2, 1], zh: [1, 1, 1] };
/** The carry's link row's label with its chevron ("Carried forward to Week 48 ›" / "Imehamishiwa Wiki 48 ›" / "滚存至第48周 ›"),
 *  beside its figure: the English takes two lines below 360 (the r2e tiles: "Carried forward to / Week 48" at 320). */
const CARRY_LINES: Record<Locale, Tiers> = { en: [2, 1, 1], sw: [1, 1, 1], zh: [1, 1, 1] };

/** A line in the numerals' mono face (§T5) — its line box stands a pixel taller than a body line: an empty run of that face
 *  gives the drawn line the same box. */
function MonoLine({ width }: { width: string }) {
  return <span className="block"><GhostLine className={width} /><span className="font-mono" /></span>;
}

/** A paragraph's lines below 360, from 360 and from 768, each a body line or (`mono`) a line holding numerals. */
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

/** One ledger row in the kit's own row (`ReceiptRow`, the sentence label), its words and figure as bars — no step of space
 *  above any row: the ledger keeps one rhythm (the lead's ruling of 2026-10-22). A label that wraps in the reader's language
 *  draws its lines (`lines`), the last as wide as `label`. */
function LedgerRow({ label, lines, emphasis, divider, note }: { label: string; lines?: Tiers; emphasis?: "total" | "muted"; divider?: boolean; note?: boolean }) {
  return (
    <div>
      <ReceiptRow labelStyle="sentence" label={lines ? <Wrapped text="" lines={lines} last={label} /> : <GhostLine className={label} />} value={<GhostLine className="w-[88px]" />} emphasis={emphasis} divider={divider} />
      {note && <span className="mt-0.5 block text-body-sm"><MonoLine width="w-[200px] max-w-full" /></span>}
    </div>
  );
}

/** One of the two commitments: its eyebrow, its fingerprint (two lines on a phone's card, one from 768), its time line — as
 *  many lines as it takes in the reader's language (`time`). */
function Commitment({ time = [1, 1, 1] }: { time?: Tiers }) {
  return (
    <div className="flex flex-col gap-1">
      <GhostTextLine text="font-mono text-micro uppercase eyebrow" width="w-[140px]" />
      <span className="block font-mono text-body-sm">
        <span className="block md:hidden"><GhostTextLine width="w-full" /><GhostTextLine width="w-[70%]" /></span>
        <span className="hidden md:block"><GhostTextLine width="w-full" /></span>
      </span>
      <Wrapped text="text-body-sm" lines={time} last="w-[55%]" mono />
    </div>
  );
}
/** The tickets' root's time line ("Fixed 13 Nov, 18:01 · 18 tickets" / "锁定于 2026年11月13日 18:01 · 18 张彩票"): the Chinese
 *  takes two lines below 360 (the register-ghosts hop: the commitments 19px taller at 320 on one). */
const ROOT_LINES: Record<Locale, Tiers> = { en: [1, 1, 1], sw: [1, 1, 1], zh: [2, 1, 1] };

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
              <LedgerRow label="w-[96px]" note />
              <LedgerRow label="w-[88px]" emphasis="total" divider />
              <LedgerRow label="w-[120px]" lines={FLOOR_LINES[locale]} emphasis="muted" />
              <LedgerRow label="w-[48px]" />
              <LedgerRow label="w-[160px]" lines={CARRY_LINES[locale]} />
              <LedgerRow label="w-[96px]" emphasis="total" divider />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2" aria-hidden data-ghost="commitments">
          {H2}
          <div className="mat-flat flex max-w-receipt flex-col gap-4 rounded-card p-3">
            <Commitment />
            <Commitment time={ROOT_LINES[locale]} />
            <Wrapped text="text-body-sm" lines={lines.explainer} last="w-[60%]" />
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
